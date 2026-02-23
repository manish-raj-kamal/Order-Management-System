const PurchaseOrder = require('../models/PurchaseOrder');
const Report = require('../models/Report');

// GET /api/reports – Admin / Super Admin, with optional date range
const getReports = async (req, res) => {
    try {
        const { startDate, endDate, minAmount, maxAmount } = req.query;

        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.createdAt = {};
            if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
            if (endDate) dateFilter.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
        }
        if (minAmount || maxAmount) {
            dateFilter.totalAmount = {};
            if (minAmount) dateFilter.totalAmount.$gte = Number(minAmount);
            if (maxAmount) dateFilter.totalAmount.$lte = Number(maxAmount);
        }

        const [totalOrders, pendingOrders, approvedOrders, rejectedOrders, completedOrders] = await Promise.all([
            PurchaseOrder.countDocuments(dateFilter),
            PurchaseOrder.countDocuments({ ...dateFilter, status: 'Pending' }),
            PurchaseOrder.countDocuments({ ...dateFilter, status: 'Approved' }),
            PurchaseOrder.countDocuments({ ...dateFilter, status: 'Rejected' }),
            PurchaseOrder.countDocuments({ ...dateFilter, status: 'Completed' })
        ]);

        const totalAmountResult = await PurchaseOrder.aggregate([
            { $match: { isDeleted: { $ne: true }, ...dateFilter } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const totalAmount = totalAmountResult[0]?.total || 0;

        // Vendor-wise summary
        const vendorSummary = await PurchaseOrder.aggregate([
            { $match: { isDeleted: { $ne: true }, ...dateFilter } },
            {
                $group: {
                    _id: '$vendorName',
                    orderCount: { $sum: 1 },
                    totalAmount: { $sum: '$totalAmount' }
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        // Monthly trend (last 12 months)
        const monthlyTrend = await PurchaseOrder.aggregate([
            { $match: { isDeleted: { $ne: true } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 },
                    amount: { $sum: '$totalAmount' }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
        ]);

        // Status distribution with amounts
        const statusSummary = await PurchaseOrder.aggregate([
            { $match: { isDeleted: { $ne: true }, ...dateFilter } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$totalAmount' }
                }
            }
        ]);

        const report = {
            totalOrders,
            pendingOrders,
            approvedOrders,
            rejectedOrders,
            completedOrders,
            totalAmount,
            vendorSummary,
            monthlyTrend: monthlyTrend.reverse(),
            statusSummary
        };

        // Save report
        await Report.create({
            title: 'Purchase Order Summary Report',
            type: 'summary',
            data: report,
            generatedBy: req.user._id
        });

        res.status(200).json({ report });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /api/reports/export-csv – Export orders as CSV
const exportCSV = async (req, res) => {
    try {
        const { startDate, endDate, status } = req.query;
        const query = {};
        if (status) query.status = status;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
        }

        const orders = await PurchaseOrder.find(query)
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        // Build CSV
        const headers = ['Order Number', 'Vendor', 'Total Amount', 'Status', 'Priority', 'Created By', 'Created At'];
        const rows = orders.map(o => [
            o.orderNumber,
            `"${o.vendorName}"`,
            o.totalAmount,
            o.status,
            o.priority || 'Medium',
            o.createdBy?.name || 'N/A',
            new Date(o.createdAt).toISOString()
        ].join(','));

        const csv = [headers.join(','), ...rows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="orders_report_${Date.now()}.csv"`);
        res.status(200).send(csv);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getReports, exportCSV };
