import { useState, useEffect, useCallback } from 'react';
import { getAuditLogs } from '../api';

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [filters, setFilters] = useState({ action: '', entity: '', search: '', startDate: '', endDate: '', page: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page: filters.page, limit: 20 };
            if (filters.action) params.action = filters.action;
            if (filters.entity) params.entity = filters.entity;
            if (filters.search) params.search = filters.search;
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            const { data } = await getAuditLogs(params);
            setLogs(data.logs || []);
            setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const handleFilter = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value, page: 1 }));
    };

    const hasFilters = filters.action || filters.entity || filters.search || filters.startDate || filters.endDate;

    const actionLabels = {
        CREATE_ORDER: 'Create Order', UPDATE_ORDER: 'Update Order', DELETE_ORDER: 'Delete Order',
        APPROVE_ORDER: 'Approve Order', REJECT_ORDER: 'Reject Order', COMPLETE_ORDER: 'Complete Order',
        CREATE_USER: 'Create User', UPDATE_USER: 'Update User', DELETE_USER: 'Delete User',
        TOGGLE_USER_STATUS: 'Toggle User', UPDATE_SETTINGS: 'Update Settings',
        LOGIN: 'Login', LOGOUT: 'Logout', REGISTER: 'Register', UPLOAD_FILE: 'Upload File'
    };

    return (
        <div className="page">
            <h1>Audit Logs</h1>

            <div className="filter-bar">
                <input
                    type="text"
                    placeholder="Search name, email or IP…"
                    value={filters.search}
                    onChange={(e) => handleFilter('search', e.target.value)}
                    style={{ minWidth: '200px' }}
                />
                <select value={filters.action} onChange={(e) => handleFilter('action', e.target.value)}>
                    <option value="">All Actions</option>
                    {Object.entries(actionLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
                <select value={filters.entity} onChange={(e) => handleFilter('entity', e.target.value)}>
                    <option value="">All Entities</option>
                    <option value="PurchaseOrder">Purchase Order</option>
                    <option value="User">User</option>
                    <option value="Settings">Settings</option>
                    <option value="Auth">Auth</option>
                    <option value="File">File</option>
                </select>
                <div className="date-filter">
                    <label>From:</label>
                    <input type="date" value={filters.startDate} onChange={(e) => handleFilter('startDate', e.target.value)} />
                </div>
                <div className="date-filter">
                    <label>To:</label>
                    <input type="date" value={filters.endDate} onChange={(e) => handleFilter('endDate', e.target.value)} />
                </div>
                {hasFilters && (
                    <button className="btn btn-sm" onClick={() => setFilters({ action: '', entity: '', search: '', startDate: '', endDate: '', page: 1 })}>Clear</button>
                )}
            </div>

            {error && <div className="error-msg">{error}</div>}

            {loading ? (
                <div className="loading">Loading logs...</div>
            ) : logs.length === 0 ? (
                <p className="empty-msg">No audit logs found.</p>
            ) : (
                <>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Action</th>
                                <th>Entity</th>
                                <th>Description</th>
                                <th>User</th>
                                <th>Email</th>
                                <th>IP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log._id}>
                                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                                    <td><span className={`action-badge action-${log.action?.toLowerCase().replace(/_/g, '-')}`}>{actionLabels[log.action] || log.action}</span></td>
                                    <td>{log.entity}</td>
                                    <td>{log.description}</td>
                                    <td>{log.performedBy?.name || 'System'}</td>
                                    <td className="email-cell">{log.performedBy?.email || '—'}</td>
                                    <td className="ip-cell">{log.ipAddress || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {pagination.pages > 1 && (
                        <div className="pagination">
                            <button disabled={pagination.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>‹ Prev</button>
                            <span>Page {pagination.page} of {pagination.pages} ({pagination.total} logs)</span>
                            <button disabled={pagination.page >= pagination.pages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Next ›</button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AuditLogs;
