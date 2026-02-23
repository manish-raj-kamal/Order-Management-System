const Notification = require('../models/Notification');

// GET /api/notifications – Authenticated user's own notifications
const getNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20, unreadOnly } = req.query;

        const query = { recipient: req.user._id };
        if (unreadOnly === 'true') query.isRead = false;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Notification.countDocuments(query),
            Notification.countDocuments({ recipient: req.user._id, isRead: false })
        ]);

        res.status(200).json({
            notifications,
            unreadCount,
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// PATCH /api/notifications/:id/read – Mark single notification as read
const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOne({ _id: req.params.id, recipient: req.user._id });
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        notification.isRead = true;
        notification.readAt = new Date();
        await notification.save();
        res.status(200).json({ message: 'Marked as read', notification });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// PATCH /api/notifications/read-all – Mark all as read
const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, isRead: false },
            { $set: { isRead: true, readAt: new Date() } }
        );
        res.status(200).json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /api/notifications/unread-count – Quick count
const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
        res.status(200).json({ count });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getNotifications, markAsRead, markAllAsRead, getUnreadCount };
