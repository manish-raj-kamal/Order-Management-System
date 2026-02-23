const Settings = require('../models/Settings');
const User = require('../models/User');
const { logAudit } = require('../utils/auditLogger');

// PUT /api/settings – Super Admin only
const updateSettings = async (req, res) => {
    try {
        const {
            companyName, currency, orderPrefix, maxOrderAmount,
            autoApproveBelow, taxPercentage, approvalRequired,
            maintenanceMode, emailNotifications, adminPermissions
        } = req.body;

        let settings = await Settings.findOne();

        if (!settings) {
            settings = new Settings({});
        }

        const before = settings.toObject();

        if (companyName !== undefined) settings.companyName = companyName;
        if (currency !== undefined) settings.currency = currency;
        if (orderPrefix !== undefined) settings.orderPrefix = orderPrefix;
        if (maxOrderAmount !== undefined) settings.maxOrderAmount = maxOrderAmount;
        if (autoApproveBelow !== undefined) settings.autoApproveBelow = autoApproveBelow;
        if (taxPercentage !== undefined) settings.taxPercentage = taxPercentage;
        if (approvalRequired !== undefined) settings.approvalRequired = approvalRequired;
        if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;
        if (emailNotifications !== undefined) settings.emailNotifications = emailNotifications;
        if (adminPermissions !== undefined) {
            if (!settings.adminPermissions) settings.adminPermissions = {};
            if (adminPermissions.canViewAuditLogs !== undefined) settings.adminPermissions.canViewAuditLogs = adminPermissions.canViewAuditLogs;
            if (adminPermissions.canViewReports !== undefined) settings.adminPermissions.canViewReports = adminPermissions.canViewReports;
            if (adminPermissions.canDeleteUsers !== undefined) settings.adminPermissions.canDeleteUsers = adminPermissions.canDeleteUsers;
        }
        settings.updatedBy = req.user._id;

        await settings.save();

        await logAudit({
            action: 'UPDATE_SETTINGS', entity: 'Settings', entityId: settings._id,
            description: `Settings updated by ${req.user.name}`,
            changes: { before, after: settings.toObject() },
            performedBy: req.user._id, req
        });

        res.status(200).json({ message: 'Settings updated', settings });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// GET /api/settings – Any authenticated user
const getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne().populate('updatedBy', 'name email');
        if (!settings) {
            settings = await new Settings({}).save();
        }
        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// POST /api/settings/apply-permissions – Apply global admin permissions to all Admin users
const applyPermissionsToAll = async (req, res) => {
    try {
        const settings = await Settings.findOne();
        if (!settings) {
            return res.status(404).json({ error: 'Settings not found' });
        }

        const perms = settings.adminPermissions || {};
        const result = await User.updateMany(
            { role: 'Admin', deletedAt: null },
            {
                $set: {
                    'permissions.canViewAuditLogs': perms.canViewAuditLogs || false,
                    'permissions.canViewReports': perms.canViewReports || false,
                    'permissions.canDeleteUsers': perms.canDeleteUsers || false
                }
            }
        );

        await logAudit({
            action: 'UPDATE_SETTINGS', entity: 'Settings', entityId: settings._id,
            description: `Global admin permissions applied to ${result.modifiedCount} admin(s) by ${req.user.name}`,
            performedBy: req.user._id, req
        });

        res.status(200).json({
            message: `Permissions applied to ${result.modifiedCount} admin user(s)`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { updateSettings, getSettings, applyPermissionsToAll };
