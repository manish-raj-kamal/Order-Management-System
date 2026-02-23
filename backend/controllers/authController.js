const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { sendEmailOtp } = require('../utils/email');
const { generateNumericOtp, generateRandomSecret } = require('../utils/otp');
const { logAudit } = require('../utils/auditLogger');

const OTP_EXPIRY_MINUTES = Number(process.env.EMAIL_OTP_EXPIRY_MINUTES || 10);
const OTP_RESEND_COOLDOWN_SECONDS = Number(process.env.EMAIL_OTP_RESEND_COOLDOWN_SECONDS || 45);
const OTP_MAX_ATTEMPTS = Number(process.env.EMAIL_OTP_MAX_ATTEMPTS || 5);
const PENDING_REGISTRATION_TTL_MS = OTP_EXPIRY_MINUTES * 60 * 1000;

const pendingRegistrations = new Map();

const googleClient = process.env.GOOGLE_CLIENT_ID
    ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
    : null;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

const normalizeEmail = (email = '') => email.toLowerCase().trim();

const getRequestMeta = (req) => ({
    ip: req.ip,
    userAgent: req.get('user-agent') || ''
});

const hasGoogleProvider = (user) => {
    return Array.isArray(user.authProviders) && user.authProviders.some((provider) => provider.provider === 'google');
};

const hasUsableLocalPassword = (user) => user.hasCustomPassword !== false;

const upsertGoogleUserFromPayload = async (payload, req) => {
    const email = normalizeEmail(payload?.email);
    if (!email || !payload?.email_verified) {
        return { error: 'Google account email is not verified', status: 401 };
    }

    let user = await User.findOne({ email, deletedAt: null });

    if (!user) {
        user = new User({
            name: payload?.name || email.split('@')[0],
            email,
            password: generateRandomSecret(),
            hasCustomPassword: false,
            role: 'User',
            isEmailVerified: true,
            emailVerifiedAt: new Date(),
            profile: {
                avatarUrl: payload?.picture || '',
                timezone: 'UTC',
                locale: 'en-IN'
            },
            authProviders: [
                { provider: 'google', providerId: payload?.sub || '' }
            ]
        });
    } else {
        if (!user.isActive) {
            return { error: 'Account is deactivated', status: 403 };
        }

        if (!Array.isArray(user.authProviders)) {
            user.authProviders = [];
        }

        const existingGoogleProvider = user.authProviders.find((provider) => provider.provider === 'google');
        if (existingGoogleProvider) {
            existingGoogleProvider.providerId = payload?.sub || existingGoogleProvider.providerId;
        } else {
            user.authProviders.push({ provider: 'google', providerId: payload?.sub || '' });
        }

        if (!user.name && payload?.name) {
            user.name = payload.name;
        }

        if (!user.profile) {
            user.profile = {};
        }

        if (!user.profile.avatarUrl && payload?.picture) {
            user.profile.avatarUrl = payload.picture;
        }

        if (!user.isEmailVerified) {
            user.isEmailVerified = true;
            user.emailVerifiedAt = new Date();
        }
    }

    user.recordSuccessfulLogin(getRequestMeta(req));
    await user.save();
    return { user };
};

const clearExpiredPendingRegistration = (email) => {
    const pending = pendingRegistrations.get(email);
    if (!pending) {
        return null;
    }

    if (new Date(pending.expiresAt) < new Date()) {
        pendingRegistrations.delete(email);
        return null;
    }

    return pending;
};

const setEmailOtp = async (target) => {
    const otp = generateNumericOtp(6);
    const otpHash = await bcrypt.hash(otp, 10);
    const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const requestedAt = new Date();

    if (target && target.mode === 'pending') {
        pendingRegistrations.set(target.email, {
            mode: target.pendingType || 'register',
            userId: target.userId || null,
            name: target.name,
            email: target.email,
            password: target.password,
            otpHash,
            otpExpiresAt: expiry,
            otpRequestedAt: requestedAt,
            otpAttempts: 0,
            expiresAt: new Date(Date.now() + PENDING_REGISTRATION_TTL_MS)
        });
        return otp;
    }

    const user = target;
    if (!user.security) {
        user.security = {};
    }

    user.security.emailVerification = {
        otpHash,
        otpExpiresAt: expiry,
        otpRequestedAt: requestedAt,
        otpAttempts: 0,
        verifiedAt: null
    };

    return otp;
};

const sanitizeEmailVerificationState = (user) => {
    if (!user.security) {
        user.security = {};
    }

    user.security.emailVerification = {
        otpHash: '',
        otpExpiresAt: null,
        otpRequestedAt: null,
        otpAttempts: 0,
        verifiedAt: new Date()
    };
};

// POST /api/auth/register – Public
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const normalizedEmail = normalizeEmail(email);

        if (!name || !normalizedEmail || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        const existingVerifiedUser = await User.findOne({
            email: normalizedEmail,
            deletedAt: null,
            isEmailVerified: true
        });
        if (existingVerifiedUser) {
            if (hasGoogleProvider(existingVerifiedUser) && !hasUsableLocalPassword(existingVerifiedUser)) {
                const otp = await setEmailOtp({
                    mode: 'pending',
                    pendingType: 'attach_password',
                    userId: existingVerifiedUser._id.toString(),
                    name: existingVerifiedUser.name || name,
                    email: normalizedEmail,
                    password
                });

                await sendEmailOtp({
                    to: normalizedEmail,
                    name: existingVerifiedUser.name || name,
                    otp,
                    expiryMinutes: OTP_EXPIRY_MINUTES
                });

                return res.status(200).json({
                    message: 'Existing Google account found. Verify OTP to create your password and merge login methods.'
                });
            }

            return res.status(400).json({ error: 'Email already registered' });
        }

        const otp = await setEmailOtp({
            mode: 'pending',
            pendingType: 'register',
            name,
            email: normalizedEmail,
            password
        });

        await sendEmailOtp({
            to: normalizedEmail,
            name,
            otp,
            expiryMinutes: OTP_EXPIRY_MINUTES
        });

        res.status(200).json({
            message: 'Registration initiated. Verify your email using the OTP sent to your inbox.'
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// POST /api/auth/verify-email-otp – Public
const verifyEmailOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required' });
        }

        const pending = clearExpiredPendingRegistration(normalizedEmail);
        if (pending) {
            if (!pending.otpHash || !pending.otpExpiresAt) {
                return res.status(400).json({ error: 'No OTP found. Please request a new OTP.' });
            }

            if (pending.otpAttempts >= OTP_MAX_ATTEMPTS) {
                return res.status(429).json({ error: 'Too many invalid attempts. Please request a new OTP.' });
            }

            if (new Date(pending.otpExpiresAt) < new Date()) {
                pendingRegistrations.delete(normalizedEmail);
                return res.status(400).json({ error: 'OTP has expired. Please request a new OTP.' });
            }

            const isMatch = await bcrypt.compare(String(otp).trim(), pending.otpHash);
            if (!isMatch) {
                pending.otpAttempts = (pending.otpAttempts || 0) + 1;
                pendingRegistrations.set(normalizedEmail, pending);
                return res.status(400).json({ error: 'Invalid OTP' });
            }

            if (pending.mode === 'attach_password') {
                const user = await User.findOne({
                    _id: pending.userId,
                    email: normalizedEmail,
                    deletedAt: null
                }).select('+password');

                if (!user) {
                    pendingRegistrations.delete(normalizedEmail);
                    return res.status(404).json({ error: 'User not found. Please sign in with Google and try again.' });
                }

                if (!hasGoogleProvider(user)) {
                    pendingRegistrations.delete(normalizedEmail);
                    return res.status(400).json({ error: 'This account is not linked with Google' });
                }

                user.password = pending.password;
                user.hasCustomPassword = true;
                user.updatedBy = user._id;
                user.recordSuccessfulLogin(getRequestMeta(req));
                await user.save();
                pendingRegistrations.delete(normalizedEmail);

                const token = generateToken(user);
                return res.status(200).json({
                    message: 'Password created successfully. You can now login with email/password as well.',
                    token,
                    user
                });
            }

            const user = new User({
                name: pending.name,
                email: pending.email,
                password: pending.password,
                hasCustomPassword: true,
                role: 'User',
                isEmailVerified: true,
                emailVerifiedAt: new Date()
            });
            sanitizeEmailVerificationState(user);
            user.recordSuccessfulLogin(getRequestMeta(req));
            await user.save();
            pendingRegistrations.delete(normalizedEmail);

            await logAudit({
                action: 'REGISTER',
                entity: 'Auth',
                entityId: user._id,
                description: `New user registered: ${user.name} (${user.email})`,
                performedBy: user._id,
                req
            });

            const token = generateToken(user);
            return res.status(200).json({
                message: 'Email verified successfully',
                token,
                user
            });
        }

        const existingVerifiedUser = await User.findOne({
            email: normalizedEmail,
            deletedAt: null,
            isEmailVerified: true
        });
        if (existingVerifiedUser) {
            return res.status(400).json({ error: 'Email is already verified' });
        }

        // Backward compatibility for users created by the old flow before this change.
        const user = await User.findOne({ email: normalizedEmail, deletedAt: null }).select('+security.emailVerification.otpHash');
        if (!user) {
            return res.status(404).json({ error: 'No pending registration found. Please register again.' });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ error: 'Email is already verified' });
        }

        const verification = user.security?.emailVerification || {};
        if (!verification.otpHash || !verification.otpExpiresAt) {
            return res.status(400).json({ error: 'No OTP found. Please request a new OTP.' });
        }

        if (verification.otpAttempts >= OTP_MAX_ATTEMPTS) {
            return res.status(429).json({ error: 'Too many invalid attempts. Please request a new OTP.' });
        }

        if (new Date(verification.otpExpiresAt) < new Date()) {
            return res.status(400).json({ error: 'OTP has expired. Please request a new OTP.' });
        }

        const isLegacyMatch = await bcrypt.compare(String(otp).trim(), verification.otpHash);
        if (!isLegacyMatch) {
            user.security.emailVerification.otpAttempts = (verification.otpAttempts || 0) + 1;
            await user.save();
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        user.isEmailVerified = true;
        user.emailVerifiedAt = new Date();
        sanitizeEmailVerificationState(user);
        user.recordSuccessfulLogin(getRequestMeta(req));
        await user.save();

        const token = generateToken(user);
        return res.status(200).json({
            message: 'Email verified successfully',
            token,
            user
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// POST /api/auth/resend-email-otp – Public
const resendEmailOtp = async (req, res) => {
    try {
        const { email } = req.body;
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const pending = clearExpiredPendingRegistration(normalizedEmail);
        if (pending) {
            const secondsSinceLastRequest = Math.floor((Date.now() - new Date(pending.otpRequestedAt).getTime()) / 1000);
            if (secondsSinceLastRequest < OTP_RESEND_COOLDOWN_SECONDS) {
                return res.status(429).json({
                    error: `Please wait ${OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastRequest}s before requesting another OTP`
                });
            }

            const otp = await setEmailOtp({
                mode: 'pending',
                pendingType: pending.mode || 'register',
                userId: pending.userId || null,
                name: pending.name,
                email: pending.email,
                password: pending.password
            });

            await sendEmailOtp({
                to: pending.email,
                name: pending.name,
                otp,
                expiryMinutes: OTP_EXPIRY_MINUTES
            });

            return res.status(200).json({ message: 'A new OTP has been sent to your email' });
        }

        const existingVerifiedUser = await User.findOne({
            email: normalizedEmail,
            deletedAt: null,
            isEmailVerified: true
        });
        if (existingVerifiedUser) {
            return res.status(400).json({ error: 'Email is already verified' });
        }

        // Backward compatibility for users created by the old flow before this change.
        const user = await User.findOne({ email: normalizedEmail, deletedAt: null }).select('+security.emailVerification.otpHash');
        if (!user) {
            return res.status(404).json({ error: 'No pending registration found. Please register again.' });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ error: 'Email is already verified' });
        }

        const lastRequestedAt = user.security?.emailVerification?.otpRequestedAt;
        if (lastRequestedAt) {
            const secondsSinceLastRequest = Math.floor((Date.now() - new Date(lastRequestedAt).getTime()) / 1000);
            if (secondsSinceLastRequest < OTP_RESEND_COOLDOWN_SECONDS) {
                return res.status(429).json({
                    error: `Please wait ${OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastRequest}s before requesting another OTP`
                });
            }
        }

        const otp = await setEmailOtp(user);
        await user.save();

        await sendEmailOtp({
            to: user.email,
            name: user.name,
            otp,
            expiryMinutes: OTP_EXPIRY_MINUTES
        });

        return res.status(200).json({ message: 'A new OTP has been sent to your email' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// POST /api/auth/login – Public
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = normalizeEmail(email);

        const user = await User.findOne({ email: normalizedEmail, deletedAt: null }).select('+password');
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!user.isActive) {
            return res.status(403).json({ error: 'Account is deactivated' });
        }

        // Legacy users without the field should still be able to login.
        if (user.isEmailVerified === false && !hasGoogleProvider(user)) {
            return res.status(403).json({ error: 'Please verify your email before logging in' });
        }

        if (!hasUsableLocalPassword(user) && hasGoogleProvider(user)) {
            return res.status(403).json({ error: 'Please login with Google first, then create a password from your profile.' });
        }

        if (user.isLocked()) {
            return res.status(423).json({ error: 'Account temporarily locked due to multiple failed login attempts' });
        }

        const requestMeta = getRequestMeta(req);
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            user.recordFailedLogin(requestMeta);
            await user.save();
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        user.recordSuccessfulLogin(requestMeta);
        await user.save();

        await logAudit({
            action: 'LOGIN',
            entity: 'Auth',
            entityId: user._id,
            description: `User logged in: ${user.name} (${user.email})`,
            performedBy: user._id,
            req
        });

        const token = generateToken(user);
        res.status(200).json({ message: 'Login successful', token, user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// POST /api/auth/google-signin – Public
const googleSignIn = async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({ error: 'Google ID token is required' });
        }

        if (!googleClient || !process.env.GOOGLE_CLIENT_ID) {
            return res.status(500).json({ error: 'Google sign-in is not configured' });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const result = await upsertGoogleUserFromPayload(payload, req);
        if (result.error) {
            return res.status(result.status).json({ error: result.error });
        }
        const { user } = result;

        await logAudit({
            action: 'LOGIN',
            entity: 'Auth',
            entityId: user._id,
            description: `Google sign-in: ${user.name} (${user.email})`,
            performedBy: user._id,
            req
        });

        const token = generateToken(user);
        return res.status(200).json({ message: 'Google sign-in successful', token, user });
    } catch (error) {
        return res.status(401).json({ error: 'Google sign-in failed' });
    }
};

// POST /auth/google/callback – Public redirect callback
const googleCallback = async (req, res) => {
    try {
        const credential = req.body?.credential;
        if (!credential) {
            return res.redirect(`${FRONTEND_URL}/login?google_error=Missing%20Google%20credential`);
        }

        if (!googleClient || !process.env.GOOGLE_CLIENT_ID) {
            return res.redirect(`${FRONTEND_URL}/login?google_error=Google%20sign-in%20is%20not%20configured`);
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const result = await upsertGoogleUserFromPayload(payload, req);
        if (result.error) {
            return res.redirect(`${FRONTEND_URL}/login?google_error=${encodeURIComponent(result.error)}`);
        }

        const { user } = result;
        const token = generateToken(user);
        const encodedUser = encodeURIComponent(JSON.stringify(user.toJSON()));

        return res.redirect(`${FRONTEND_URL}/login?google_success=1&token=${encodeURIComponent(token)}&user=${encodedUser}`);
    } catch (error) {
        console.error('Google callback error:', error);
        return res.redirect(`${FRONTEND_URL}/login?google_error=${encodeURIComponent(error.message || 'Google sign-in failed')}`);
    }
};

// POST /api/auth/create-password – Authenticated Google users
const createPassword = async (req, res) => {
    try {
        const { password } = req.body;
        if (!password || String(password).trim().length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        const user = await User.findOne({ _id: req.user._id, deletedAt: null }).select('+password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!hasGoogleProvider(user)) {
            return res.status(400).json({ error: 'This option is only available for Google-linked accounts' });
        }

        user.password = password;
        user.hasCustomPassword = true;
        user.updatedBy = user._id;
        await user.save();

        return res.status(200).json({
            message: 'Password saved successfully',
            token: generateToken(user),
            user
        });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};

// POST /api/auth/create-admin – Super Admin only
const createAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const normalizedEmail = normalizeEmail(email);
        const existingUser = await User.findOne({ email: normalizedEmail, deletedAt: null });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const admin = new User({
            name,
            email: normalizedEmail,
            password,
            role: 'Admin',
            isEmailVerified: true,
            emailVerifiedAt: new Date(),
            createdBy: req.user._id,
            updatedBy: req.user._id
        });
        await admin.save();

        res.status(201).json({ message: 'Admin created successfully', user: admin });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// POST /api/auth/create-super-admin – Super Admin only
const createSuperAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const normalizedEmail = normalizeEmail(email);
        const existingUser = await User.findOne({ email: normalizedEmail, deletedAt: null });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const superAdmin = new User({
            name,
            email: normalizedEmail,
            password,
            role: 'SuperAdmin',
            isEmailVerified: true,
            emailVerifiedAt: new Date(),
            createdBy: req.user._id,
            updatedBy: req.user._id
        });
        await superAdmin.save();

        res.status(201).json({ message: 'Super Admin created successfully', user: superAdmin });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    register,
    verifyEmailOtp,
    resendEmailOtp,
    login,
    googleSignIn,
    googleCallback,
    createPassword,
    createAdmin,
    createSuperAdmin
};
