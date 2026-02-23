const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: [
            'ORDER_CREATED', 'ORDER_APPROVED', 'ORDER_REJECTED',
            'ORDER_COMPLETED', 'ORDER_UPDATED',
            'USER_CREATED', 'USER_DEACTIVATED',
            'SETTINGS_UPDATED', 'SYSTEM'
        ],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    link: {
        type: String  // e.g. '/orders/6789abc'
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    readAt: {
        type: Date
    }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
