const express = require('express');
const router = express.Router();
const { getUsers, getUserById, updateUser, toggleUserStatus, updateUserPermissions, deleteUser } = require('../controllers/userController');
const { authenticate, authorize, checkPermission } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

// Admin / Super Admin
router.get('/', authorize('Admin', 'SuperAdmin'), getUsers);
router.get('/:id', authorize('Admin', 'SuperAdmin'), getUserById);
router.put('/:id', authorize('Admin', 'SuperAdmin'), updateUser);

// Super Admin only
router.patch('/:id/status', authorize('SuperAdmin'), toggleUserStatus);
router.patch('/:id/permissions', authorize('SuperAdmin'), updateUserPermissions);

// SuperAdmin always; others only if canDeleteUsers permission
router.delete('/:id', checkPermission('canDeleteUsers'), deleteUser);

module.exports = router;
