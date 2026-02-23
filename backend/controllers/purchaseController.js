const PurchaseOrder = require('../models/PurchaseOrder');
const { logAudit } = require('../utils/auditLogger');
const { notifyUser, notifyByRole } = require('../utils/notifier');

// POST /api/purchase – User / Admin
const createOrder = async (req, res) => {
    try {
        const { vendorName, items, priority } = req.body;
        const order = new PurchaseOrder({
            vendorName,
            items,
            priority: priority || 'Medium',
            createdBy: req.user._id
        });
        await order.save();

        await logAudit({
            action: 'CREATE_ORDER', entity: 'PurchaseOrder', entityId: order._id,
            description: `Order ${order.orderNumber} created by ${req.user.name}`,
            changes: { after: { vendorName, items, totalAmount: order.totalAmount } },
            performedBy: req.user._id, req
        });

        await notifyByRole({
            roles: ['Admin', 'SuperAdmin'],
            type: 'ORDER_CREATED',
            title: 'New Purchase Order',
            message: `${req.user.name} created order ${order.orderNumber} (₹${order.totalAmount.toLocaleString()})`,
            link: `/orders/${order._id}`
        });

        res.status(201).json({ message: 'Purchase order created', order });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// GET /api/purchase – Role based, with search/filter/pagination/sorting
const getOrders = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            priority,
            vendor,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            startDate,
            endDate
        } = req.query;

        let query = {};

        // Users can only see their own orders
        if (req.user.role === 'User') {
            query.createdBy = req.user._id;
        }

        // Filters
        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (vendor) query.vendorName = { $regex: vendor, $options: 'i' };
        if (search) {
            query.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { vendorName: { $regex: search, $options: 'i' } }
            ];
        }
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
        }

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        const sortObj = {};
        sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const [orders, total] = await Promise.all([
            PurchaseOrder.find(query)
                .populate('createdBy', 'name email role')
                .sort(sortObj)
                .skip(skip)
                .limit(limitNum),
            PurchaseOrder.countDocuments(query)
        ]);

        res.status(200).json({
            orders,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /api/purchase/:id – Authorized roles
const getOrderById = async (req, res) => {
    try {
        const order = await PurchaseOrder.findById(req.params.id)
            .populate('createdBy', 'name email role')
            .populate('updatedBy', 'name email role')
            .populate('approvalHistory.performedBy', 'name email role')
            .populate('updateHistory.performedBy', 'name email role')
            .populate('attachments.uploadedBy', 'name email');

        if (!order) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        // Users can only access their own orders
        if (req.user.role === 'User' && order.createdBy._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// PUT /api/purchase/:id – Admin only
const updateOrder = async (req, res) => {
    try {
        const { vendorName, items, status, priority } = req.body;
        const order = await PurchaseOrder.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        const before = { vendorName: order.vendorName, status: order.status, priority: order.priority, totalAmount: order.totalAmount, itemCount: order.items.length };

        // Build a human-readable change summary
        const diffs = [];
        if (vendorName && vendorName !== order.vendorName) diffs.push(`vendor: ${order.vendorName} → ${vendorName}`);
        if (status && status !== order.status) diffs.push(`status: ${order.status} → ${status}`);
        if (priority && priority !== order.priority) diffs.push(`priority: ${order.priority} → ${priority}`);

        if (vendorName) order.vendorName = vendorName;
        if (items) order.items = items;
        if (status) order.status = status;
        if (priority) order.priority = priority;
        order.updatedBy = req.user._id;

        // Detect item changes
        if (items && items.length !== before.itemCount) diffs.push(`items: ${before.itemCount} → ${items.length}`);
        if (order.totalAmount !== before.totalAmount) diffs.push(`amount: ₹${before.totalAmount} → ₹${order.totalAmount}`);

        // Push to updateHistory
        order.updateHistory.push({
            summary: diffs.length ? diffs.join(', ') : 'Minor update',
            changes: { before, after: { vendorName: order.vendorName, status: order.status, priority: order.priority, totalAmount: order.totalAmount, itemCount: order.items.length } },
            performedBy: req.user._id
        });

        await order.save();

        await logAudit({
            action: 'UPDATE_ORDER', entity: 'PurchaseOrder', entityId: order._id,
            description: `Order ${order.orderNumber} updated by ${req.user.name}`,
            changes: { before, after: { vendorName: order.vendorName, status: order.status, totalAmount: order.totalAmount } },
            performedBy: req.user._id, req
        });

        res.status(200).json({ message: 'Purchase order updated', order });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// PATCH /api/purchase/:id/approve – Admin / SuperAdmin
const approveOrder = async (req, res) => {
    try {
        const { remarks } = req.body;
        const order = await PurchaseOrder.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        if (order.status !== 'Pending') {
            return res.status(400).json({ error: `Cannot approve an order with status "${order.status}"` });
        }

        order.status = 'Approved';
        order.approvalRemarks = remarks || '';
        order.approvalHistory.push({
            action: 'Approved',
            remarks: remarks || '',
            performedBy: req.user._id
        });
        order.updatedBy = req.user._id;
        await order.save();

        await logAudit({
            action: 'APPROVE_ORDER', entity: 'PurchaseOrder', entityId: order._id,
            description: `Order ${order.orderNumber} approved by ${req.user.name}`,
            changes: { after: { status: 'Approved', remarks } },
            performedBy: req.user._id, req
        });

        await notifyUser({
            recipientId: order.createdBy,
            type: 'ORDER_APPROVED',
            title: 'Order Approved',
            message: `Your order ${order.orderNumber} has been approved${remarks ? ': ' + remarks : ''}`,
            link: `/orders/${order._id}`
        });

        res.status(200).json({ message: 'Order approved', order });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// PATCH /api/purchase/:id/reject – Admin / SuperAdmin
const rejectOrder = async (req, res) => {
    try {
        const { remarks } = req.body;
        if (!remarks || !remarks.trim()) {
            return res.status(400).json({ error: 'Rejection remarks are required' });
        }

        const order = await PurchaseOrder.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        if (order.status !== 'Pending') {
            return res.status(400).json({ error: `Cannot reject an order with status "${order.status}"` });
        }

        order.status = 'Rejected';
        order.approvalRemarks = remarks;
        order.approvalHistory.push({
            action: 'Rejected',
            remarks,
            performedBy: req.user._id
        });
        order.updatedBy = req.user._id;
        await order.save();

        await logAudit({
            action: 'REJECT_ORDER', entity: 'PurchaseOrder', entityId: order._id,
            description: `Order ${order.orderNumber} rejected by ${req.user.name}`,
            changes: { after: { status: 'Rejected', remarks } },
            performedBy: req.user._id, req
        });

        await notifyUser({
            recipientId: order.createdBy,
            type: 'ORDER_REJECTED',
            title: 'Order Rejected',
            message: `Your order ${order.orderNumber} was rejected: ${remarks}`,
            link: `/orders/${order._id}`
        });

        res.status(200).json({ message: 'Order rejected', order });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// PATCH /api/purchase/:id/complete – Admin / SuperAdmin
const completeOrder = async (req, res) => {
    try {
        const order = await PurchaseOrder.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        if (order.status !== 'Approved') {
            return res.status(400).json({ error: 'Only approved orders can be marked as completed' });
        }

        order.status = 'Completed';
        order.approvalHistory.push({
            action: 'Completed',
            remarks: req.body.remarks || 'Order completed',
            performedBy: req.user._id
        });
        order.updatedBy = req.user._id;
        await order.save();

        await logAudit({
            action: 'COMPLETE_ORDER', entity: 'PurchaseOrder', entityId: order._id,
            description: `Order ${order.orderNumber} completed by ${req.user.name}`,
            performedBy: req.user._id, req
        });

        await notifyUser({
            recipientId: order.createdBy,
            type: 'ORDER_COMPLETED',
            title: 'Order Completed',
            message: `Your order ${order.orderNumber} has been marked as completed`,
            link: `/orders/${order._id}`
        });

        res.status(200).json({ message: 'Order marked as completed', order });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// DELETE /api/purchase/:id – Admin only (soft delete)
const deleteOrder = async (req, res) => {
    try {
        const order = await PurchaseOrder.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        order.isDeleted = true;
        order.deletedAt = new Date();
        order.deletedBy = req.user._id;
        await order.save();

        await logAudit({
            action: 'DELETE_ORDER', entity: 'PurchaseOrder', entityId: order._id,
            description: `Order ${order.orderNumber} soft-deleted by ${req.user.name}`,
            performedBy: req.user._id, req
        });

        res.status(200).json({ message: 'Purchase order deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { createOrder, getOrders, getOrderById, updateOrder, approveOrder, rejectOrder, completeOrder, deleteOrder };
