const AuditLog = require('../models/AuditLog');

// GET /api/audit-logs – Admin / SuperAdmin, with pagination & filters
const getAuditLogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            action,
            entity,
            userId,
            startDate,
            endDate,
            search
        } = req.query;

        let query = {};
        if (action) query.action = action;
        if (entity) query.entity = entity;
        if (userId) query.performedBy = userId;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
        }
        if (search) {
            query.$or = [
                { ipAddress: { $regex: search, $options: 'i' } },
                { userAgent: { $regex: search, $options: 'i' } }
            ];
        }

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        let [logs, total] = await Promise.all([
            AuditLog.find(query)
                .populate('performedBy', 'name email role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            AuditLog.countDocuments(query)
        ]);

        // If search term provided, also filter by populated user name/email
        if (search) {
            const term = search.toLowerCase();
            const filtered = logs.filter(log => {
                const name = log.performedBy?.name?.toLowerCase() || '';
                const email = log.performedBy?.email?.toLowerCase() || '';
                const ip = (log.ipAddress || '').toLowerCase();
                return name.includes(term) || email.includes(term) || ip.includes(term);
            });
            // If IP/userAgent matches brought results but user fields didn't, keep all; otherwise use filtered
            if (filtered.length > 0 || logs.length === 0) {
                logs = filtered;
            }
        }

        res.status(200).json({
            logs,
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getAuditLogs };
