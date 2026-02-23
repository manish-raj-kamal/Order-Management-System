const User = require('../models/User');

const normalizeEmail = (email = '') => email.toLowerCase().trim();

// GET /api/users – Admin / Super Admin
const getUsers = async (req, res) => {
    try {
        const filter = { deletedAt: null };
        // Hide SuperAdmin accounts from non-SuperAdmin users
        if (req.user.role !== 'SuperAdmin') {
            filter.role = { $ne: 'SuperAdmin' };
        }
        const users = await User.find(filter).select('-password');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /api/users/:id – Admin / Super Admin
const getUserById = async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id, deletedAt: null }).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Hide SuperAdmin details from non-SuperAdmin users (allow fetching own profile)
        if (user.role === 'SuperAdmin' && req.user.role !== 'SuperAdmin' && req.user._id.toString() !== user._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// PUT /api/users/:id – Admin / Super Admin
const updateUser = async (req, res) => {
    try {
        const { name, email, role } = req.body;
        const user = await User.findOne({ _id: req.params.id, deletedAt: null });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Only SuperAdmin can change roles
        if (role && req.user.role !== 'SuperAdmin') {
            return res.status(403).json({ error: 'Only Super Admin can change roles' });
        }

        if (name) user.name = name;
        if (email) user.email = normalizeEmail(email);
        if (role) user.role = role;
        user.updatedBy = req.user._id;

        await user.save();
        res.status(200).json({ message: 'User updated', user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// PATCH /api/users/:id/status – Super Admin only
const toggleUserStatus = async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id, deletedAt: null });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Prevent SuperAdmin from deactivating their own account
        if (req.user._id.toString() === user._id.toString()) {
            return res.status(403).json({ error: 'You cannot deactivate your own account' });
        }

        user.isActive = !user.isActive;
        user.updatedBy = req.user._id;
        await user.save();

        res.status(200).json({
            message: `User ${user.isActive ? 'activated' : 'deactivated'}`,
            user
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// PATCH /api/users/:id/permissions – Super Admin only
const updateUserPermissions = async (req, res) => {
    try {
        const { permissions, role } = req.body;
        const user = await User.findOne({ _id: req.params.id, deletedAt: null });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update role if provided
        if (role !== undefined) {
            user.role = role;
        }

        // Update permissions
        if (permissions) {
            if (!user.permissions) user.permissions = {};
            if (permissions.canViewAuditLogs !== undefined) user.permissions.canViewAuditLogs = permissions.canViewAuditLogs;
            if (permissions.canViewReports !== undefined) user.permissions.canViewReports = permissions.canViewReports;
            if (permissions.canDeleteUsers !== undefined) user.permissions.canDeleteUsers = permissions.canDeleteUsers;
        }

        user.updatedBy = req.user._id;
        await user.save();

        res.status(200).json({ message: 'User permissions updated', user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// DELETE /api/users/:id – SuperAdmin or Admin (with permission, normal Users only)
const deleteUser = async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id, deletedAt: null });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Admin can only delete normal Users, not other Admins or SuperAdmins
        if (req.user.role === 'Admin' && user.role !== 'User') {
            return res.status(403).json({ error: 'Admin can only delete normal users' });
        }

        // Soft-delete keeps user history/audit references intact.
        user.isActive = false;
        user.deletedAt = new Date();
        user.deletedBy = req.user._id;
        user.updatedBy = req.user._id;
        await user.save();

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getUsers, getUserById, updateUser, toggleUserStatus, updateUserPermissions, deleteUser };
