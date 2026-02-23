const AuditLog = require('../models/AuditLog');

/**
 * Create an audit log entry.
 * Can be called from controllers after any significant action.
 */
const logAudit = async ({ action, entity, entityId, description, changes, performedBy, req }) => {
    try {
        const forwarded = req?.headers?.['x-forwarded-for'];
        let ip = forwarded ? forwarded.split(',')[0].trim() : (req?.ip || req?.connection?.remoteAddress || '');

        // Normalize IPv6 loopback and IPv4-mapped IPv6
        if (ip === '::1') ip = '127.0.0.1';
        if (ip.startsWith('::ffff:')) ip = ip.slice(7);

        await AuditLog.create({
            action,
            entity,
            entityId,
            description,
            changes,
            performedBy,
            ipAddress: ip,
            userAgent: req?.get?.('User-Agent') || ''
        });
    } catch (err) {
        // Audit failures should never break the main flow
        console.error('[AuditLog] Failed to write audit entry:', err.message);
    }
};

module.exports = { logAudit };
