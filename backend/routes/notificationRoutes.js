const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, markAllAsRead, getUnreadCount } = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

// Any authenticated user
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

module.exports = router;
