const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditController');
const { authenticate, checkPermission } = require('../middlewares/auth');

router.use(authenticate);

// SuperAdmin always; Admin only if canViewAuditLogs is enabled
router.get('/', checkPermission('canViewAuditLogs'), getAuditLogs);

module.exports = router;
