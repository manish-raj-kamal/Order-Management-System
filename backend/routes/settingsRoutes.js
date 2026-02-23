const express = require('express');
const router = express.Router();
const { updateSettings, getSettings, applyPermissionsToAll } = require('../controllers/settingsController');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate);

// Any authenticated user can view settings
router.get('/', getSettings);

// Super Admin only
router.put('/', authorize('SuperAdmin'), updateSettings);
router.post('/apply-permissions', authorize('SuperAdmin'), applyPermissionsToAll);

module.exports = router;
