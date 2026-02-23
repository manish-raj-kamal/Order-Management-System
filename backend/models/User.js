const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const LOGIN_WINDOW_LIMIT = 20;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCK_MINUTES = 15;

const loginEventSchema = new mongoose.Schema(
    {
        at: {
            type: Date,
            default: Date.now
        },
        success: {
            type: Boolean,
            required: true
        },
        ip: {
            type: String,
            trim: true,
            default: ''
        },
        userAgent: {
            type: String,
            trim: true,
            default: ''
        },
        reason: {
            type: String,
            trim: true,
            default: ''
        }
    },
    { _id: false }
);

const refreshTokenSchema = new mongoose.Schema(
    {
        tokenHash: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        expiresAt: {
            type: Date,
            required: true
        },
        revokedAt: {
            type: Date,
            default: null
        },
        ip: {
            type: String,
            trim: true,
            default: ''
        },
        userAgent: {
            type: String,
            trim: true,
            default: ''
        }
    },
    { _id: false }
);

const authProviderSchema = new mongoose.Schema(
    {
        provider: {
            type: String,
            enum: ['local', 'google', 'github', 'microsoft'],
            default: 'local'
        },
        providerId: {
            type: String,
            trim: true,
            default: ''
        },
        linkedAt: {
            type: Date,
            default: Date.now
        }
    },
    { _id: false }
);

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            maxlength: 120
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            maxlength: 254
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: 6,
            select: false
        },
        hasCustomPassword: {
            type: Boolean,
            default: true
        },
        role: {
            type: String,
            enum: ['SuperAdmin', 'Admin', 'User'],
            default: 'User'
        },
        permissions: {
            canViewAuditLogs: { type: Boolean, default: false },
            canViewReports: { type: Boolean, default: false },
            canDeleteUsers: { type: Boolean, default: false }
        },
        isActive: {
            type: Boolean,
            default: true
        },
        isEmailVerified: {
            type: Boolean,
            default: false
        },
        emailVerifiedAt: {
            type: Date,
            default: null
        },
        profile: {
            avatarUrl: {
                type: String,
                trim: true,
                default: ''
            },
            phone: {
                type: String,
                trim: true,
                default: ''
            },
            department: {
                type: String,
                trim: true,
                default: ''
            },
            title: {
                type: String,
                trim: true,
                default: ''
            },
            timezone: {
                type: String,
                trim: true,
                default: 'UTC'
            },
            locale: {
                type: String,
                trim: true,
                default: 'en-IN'
            }
        },
        preferences: {
            dashboardLayout: {
                type: String,
                enum: ['default', 'compact', 'analytics'],
                default: 'default'
            },
            dateFormat: {
                type: String,
                default: 'DD/MM/YYYY'
            },
            currency: {
                type: String,
                default: 'INR'
            },
            notifications: {
                email: {
                    type: Boolean,
                    default: true
                },
                inApp: {
                    type: Boolean,
                    default: true
                }
            }
        },
        security: {
            failedLoginAttempts: {
                type: Number,
                default: 0
            },
            lockUntil: {
                type: Date,
                default: null
            },
            passwordChangedAt: {
                type: Date,
                default: Date.now
            },
            lastLoginAt: {
                type: Date,
                default: null
            },
            lastLoginIp: {
                type: String,
                trim: true,
                default: ''
            },
            lastLoginUserAgent: {
                type: String,
                trim: true,
                default: ''
            },
            loginHistory: {
                type: [loginEventSchema],
                default: []
            },
            emailVerification: {
                otpHash: {
                    type: String,
                    default: '',
                    select: false
                },
                otpExpiresAt: {
                    type: Date,
                    default: null
                },
                otpRequestedAt: {
                    type: Date,
                    default: null
                },
                otpAttempts: {
                    type: Number,
                    default: 0
                },
                verifiedAt: {
                    type: Date,
                    default: null
                }
            }
        },
        authProviders: {
            type: [authProviderSchema],
            default: [{ provider: 'local', providerId: '' }]
        },
        refreshTokens: {
            type: [refreshTokenSchema],
            default: []
        },
        metadata: {
            employeeId: {
                type: String,
                trim: true,
                default: ''
            },
            tags: {
                type: [String],
                default: []
            },
            notes: {
                type: String,
                default: '',
                maxlength: 1000
            }
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        deletedAt: {
            type: Date,
            default: null
        },
        deletedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    },
    {
        timestamps: true,
        minimize: false
    }
);

userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ 'security.lockUntil': 1 });
userSchema.index({ name: 'text', email: 'text' });

const trimLoginHistory = (history = []) => {
    if (history.length <= LOGIN_WINDOW_LIMIT) {
        return history;
    }
    return history.slice(-LOGIN_WINDOW_LIMIT);
};

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (this.isModified('email') && this.email) {
        this.email = this.email.toLowerCase().trim();
    }

    const shouldHaveLocalProvider = this.hasCustomPassword !== false;

    if (!Array.isArray(this.authProviders)) {
        this.authProviders = [];
    }

    if (shouldHaveLocalProvider) {
        const localProvider = this.authProviders.find((provider) => provider.provider === 'local');
        if (!localProvider) {
            this.authProviders.push({ provider: 'local', providerId: this.email || '' });
        } else {
            localProvider.providerId = this.email || localProvider.providerId || '';
        }
    } else {
        this.authProviders = this.authProviders.filter((provider) => provider.provider !== 'local');
    }

    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    this.security.passwordChangedAt = new Date();
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Account lock check
userSchema.methods.isLocked = function () {
    if (!this.security || !this.security.lockUntil) {
        return false;
    }
    return this.security.lockUntil > new Date();
};

// Record failed login attempts and lock account after threshold
userSchema.methods.recordFailedLogin = function ({ ip = '', userAgent = '' } = {}) {
    if (!this.security) {
        this.security = {};
    }

    if (this.security.lockUntil && this.security.lockUntil <= new Date()) {
        this.security.failedLoginAttempts = 0;
        this.security.lockUntil = null;
    }

    this.security.failedLoginAttempts = (this.security.failedLoginAttempts || 0) + 1;

    if (this.security.failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
        this.security.lockUntil = new Date(Date.now() + ACCOUNT_LOCK_MINUTES * 60 * 1000);
    }

    const history = this.security.loginHistory || [];
    history.push({
        success: false,
        ip,
        userAgent,
        reason: 'Invalid credentials'
    });
    this.security.loginHistory = trimLoginHistory(history);
};

// Record successful login metadata and reset lock counters
userSchema.methods.recordSuccessfulLogin = function ({ ip = '', userAgent = '' } = {}) {
    if (!this.security) {
        this.security = {};
    }

    this.security.failedLoginAttempts = 0;
    this.security.lockUntil = null;
    this.security.lastLoginAt = new Date();
    this.security.lastLoginIp = ip;
    this.security.lastLoginUserAgent = userAgent;

    const history = this.security.loginHistory || [];
    history.push({
        success: true,
        ip,
        userAgent
    });
    this.security.loginHistory = trimLoginHistory(history);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    if (user.security && user.security.emailVerification) {
        delete user.security.emailVerification.otpHash;
    }
    if (Array.isArray(user.refreshTokens)) {
        user.refreshTokens = user.refreshTokens.map((token) => ({
            createdAt: token.createdAt,
            expiresAt: token.expiresAt,
            revokedAt: token.revokedAt
        }));
    }
    return user;
};

module.exports = mongoose.model('User', userSchema);
