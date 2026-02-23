const express = require('express');
const router = express.Router();
const { getReports, exportCSV } = require('../controllers/reportController');
const { authenticate, checkPermission } = require('../middlewares/auth');

router.use(authenticate);

// SuperAdmin always; Admin only if canViewReports is enabled
router.get('/', checkPermission('canViewReports'), getReports);
router.get('/export-csv', checkPermission('canViewReports'), exportCSV);

module.exports = router;
