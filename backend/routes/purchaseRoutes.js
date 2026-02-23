const express = require('express');
const router = express.Router();
const {
    createOrder, getOrders, getOrderById, updateOrder,
    approveOrder, rejectOrder, completeOrder, deleteOrder
} = require('../controllers/purchaseController');
const { authenticate, authorize } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

// User / Admin can create
router.post('/', authorize('User', 'Admin'), createOrder);

// Role-based listing (Users see own, Admin/SuperAdmin see all)
router.get('/', authorize('User', 'Admin', 'SuperAdmin'), getOrders);

// Get single order (with ownership check in controller)
router.get('/:id', authorize('User', 'Admin', 'SuperAdmin'), getOrderById);

// Admin only – update
router.put('/:id', authorize('Admin', 'SuperAdmin'), updateOrder);

// Approval workflow – Admin / SuperAdmin
router.patch('/:id/approve', authorize('Admin', 'SuperAdmin'), approveOrder);
router.patch('/:id/reject', authorize('Admin', 'SuperAdmin'), rejectOrder);
router.patch('/:id/complete', authorize('Admin', 'SuperAdmin'), completeOrder);

// Soft delete – Admin / SuperAdmin
router.delete('/:id', authorize('Admin', 'SuperAdmin'), deleteOrder);

module.exports = router;
