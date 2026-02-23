const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: [
            'CREATE_ORDER', 'UPDATE_ORDER', 'DELETE_ORDER',
            'APPROVE_ORDER', 'REJECT_ORDER', 'COMPLETE_ORDER',
            'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'TOGGLE_USER_STATUS',
            'UPDATE_SETTINGS',
            'LOGIN', 'LOGOUT', 'REGISTER',
            'UPLOAD_FILE'
        ],
        index: true
    },
    entity: {
        type: String,
        enum: ['PurchaseOrder', 'User', 'Settings', 'Auth', 'File'],
        index: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId
    },
    description: {
        type: String,
        required: true
    },
    changes: {
        before: { type: mongoose.Schema.Types.Mixed },
        after: { type: mongoose.Schema.Types.Mixed }
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    ipAddress: { type: String },
    userAgent: { type: String }
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
