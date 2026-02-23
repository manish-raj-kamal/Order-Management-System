const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Settings = require('../models/Settings');

// Verify JWT token
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ _id: decoded.id, deletedAt: null });

        if (!user) {
            return res.status(401).json({ error: 'Invalid token. User not found.' });
        }

        if (!user.isActive) {
            return res.status(403).json({ error: 'Account is deactivated.' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

// Role-based authorization
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }
        next();
    };
};

/**
 * Permission-based authorization.
 * SuperAdmin always has access. Other roles check user.permissions[key].
 * @param {string} permissionKey - key inside user.permissions (e.g. 'canViewAuditLogs')
 */
const checkPermission = (permissionKey) => {
    return async (req, res, next) => {
        // SuperAdmin always passes
        if (req.user.role === 'SuperAdmin') return next();

        // Check per-user permission
        if (req.user.permissions?.[permissionKey]) {
            return next();
        }

        return res.status(403).json({ error: 'Access denied. You do not have this permission.' });
    };
};

module.exports = { authenticate, authorize, checkPermission };
