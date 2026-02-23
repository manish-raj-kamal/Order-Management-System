const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    companyName: {
        type: String,
        default: 'My Company'
    },
    currency: {
        type: String,
        default: 'INR'
    },
    orderPrefix: {
        type: String,
        default: 'PO'
    },
    maxOrderAmount: {
        type: Number,
        default: 1000000
    },
    autoApproveBelow: {
        type: Number,
        default: 0
    },
    taxPercentage: {
        type: Number,
        default: 18,
        min: 0,
        max: 100
    },
    approvalRequired: {
        type: Boolean,
        default: true
    },
    maintenanceMode: {
        type: Boolean,
        default: false
    },
    emailNotifications: {
        type: Boolean,
        default: true
    },
    adminPermissions: {
        canViewAuditLogs: { type: Boolean, default: false },
        canViewReports: { type: Boolean, default: false },
        canDeleteUsers: { type: Boolean, default: false }
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
