const express = require('express');
const router = express.Router();
const {
    register,
    verifyEmailOtp,
    resendEmailOtp,
    login,
    googleSignIn,
    googleCallback,
    createPassword,
    createAdmin,
    createSuperAdmin
} = require('../controllers/authController');
const { authenticate, authorize } = require('../middlewares/auth');

// Public routes
router.post('/register', register);
router.post('/verify-email-otp', verifyEmailOtp);
router.post('/resend-email-otp', resendEmailOtp);
router.post('/login', login);
router.post('/google-signin', googleSignIn);
router.post('/google/callback', googleCallback);
router.post('/create-password', authenticate, createPassword);

// Super Admin only
router.post('/create-admin', authenticate, authorize('SuperAdmin'), createAdmin);
router.post('/create-super-admin', authenticate, authorize('SuperAdmin'), createSuperAdmin);

module.exports = router;
