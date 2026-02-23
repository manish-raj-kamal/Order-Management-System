const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Send a notification to a specific user.
 */
const notifyUser = async ({ recipientId, type, title, message, link }) => {
    try {
        await Notification.create({ recipient: recipientId, type, title, message, link });
    } catch (err) {
        console.error('[Notification] Failed to create notification:', err.message);
    }
};

/**
 * Send a notification to all users with given roles.
 */
const notifyByRole = async ({ roles, type, title, message, link }) => {
    try {
        const users = await User.find({ role: { $in: roles }, isActive: true, deletedAt: null }).select('_id');
        const notifications = users.map(u => ({
            recipient: u._id, type, title, message, link
        }));
        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }
    } catch (err) {
        console.error('[Notification] Failed to send role notifications:', err.message);
    }
};

module.exports = { notifyUser, notifyByRole };
