import { useState, useEffect } from 'react';
import { getSettings, updateSettings, applyPermissionsToAll } from '../api';

const Settings = () => {
    const [form, setForm] = useState({
        companyName: '',
        currency: 'INR',
        orderPrefix: 'PO',
        maxOrderAmount: 1000000,
        autoApproveBelow: 0,
        taxPercentage: 18,
        approvalRequired: true,
        maintenanceMode: false,
        emailNotifications: true,
        adminPermissions: {
            canViewAuditLogs: false,
            canViewReports: false,
            canDeleteUsers: false
        }
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [applying, setApplying] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await getSettings();
                setForm({
                    companyName: data.companyName || '',
                    currency: data.currency || 'INR',
                    orderPrefix: data.orderPrefix || 'PO',
                    maxOrderAmount: data.maxOrderAmount || 1000000,
                    autoApproveBelow: data.autoApproveBelow || 0,
                    taxPercentage: data.taxPercentage ?? 18,
                    approvalRequired: data.approvalRequired ?? true,
                    maintenanceMode: data.maintenanceMode ?? false,
                    emailNotifications: data.emailNotifications ?? true,
                    adminPermissions: {
                        canViewAuditLogs: data.adminPermissions?.canViewAuditLogs ?? false,
                        canViewReports: data.adminPermissions?.canViewReports ?? false,
                        canDeleteUsers: data.adminPermissions?.canDeleteUsers ?? false
                    }
                });
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load settings');
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
    };

    const handlePermissionChange = (e) => {
        const { name, checked } = e.target;
        setForm(prev => ({
            ...prev,
            adminPermissions: { ...prev.adminPermissions, [name]: checked }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        setError('');
        try {
            await updateSettings({
                ...form,
                maxOrderAmount: Number(form.maxOrderAmount),
                autoApproveBelow: Number(form.autoApproveBelow),
                taxPercentage: Number(form.taxPercentage)
            });
            setMessage('Settings updated successfully!');
        } catch (err) {
            setError(err.response?.data?.error || 'Update failed');
        } finally {
            setSaving(false);
        }
    };

    const handleApplyToAll = async () => {
        if (!window.confirm('This will overwrite individual permissions of ALL Admin users with the global settings above. Continue?')) return;
        setApplying(true);
        setMessage('');
        setError('');
        try {
            const { data } = await applyPermissionsToAll();
            setMessage(data.message);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to apply permissions');
        } finally {
            setApplying(false);
        }
    };

    if (loading) return <div className="loading">Loading settings...</div>;

    return (
        <div className="page">
            <h1>System Settings</h1>

            {message && <div className="success-msg">{message}</div>}
            {error && <div className="error-msg">{error}</div>}

            <form onSubmit={handleSubmit} className="form-card">
                <div className="form-group">
                    <label>Company Name</label>
                    <input type="text" name="companyName" value={form.companyName} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label>Currency</label>
                    <select name="currency" value={form.currency} onChange={handleChange}>
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Order Prefix</label>
                    <input type="text" name="orderPrefix" value={form.orderPrefix} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label>Max Order Amount</label>
                    <input type="number" name="maxOrderAmount" value={form.maxOrderAmount} onChange={handleChange} min="0" />
                </div>
                <div className="form-group">
                    <label>Auto-Approve Orders Below Amount</label>
                    <input type="number" name="autoApproveBelow" value={form.autoApproveBelow} onChange={handleChange} min="0" />
                </div>
                <div className="form-group">
                    <label>Tax Percentage (%)</label>
                    <input type="number" name="taxPercentage" value={form.taxPercentage} onChange={handleChange} min="0" max="100" step="0.1" />
                </div>

                <h3 style={{ margin: '1.5rem 0 1rem' }}>Feature Toggles</h3>
                <div className="form-group checkbox-group">
                    <label>
                        <input type="checkbox" name="approvalRequired" checked={form.approvalRequired} onChange={handleChange} />
                        Require Approval for Orders
                    </label>
                </div>
                <div className="form-group checkbox-group">
                    <label>
                        <input type="checkbox" name="maintenanceMode" checked={form.maintenanceMode} onChange={handleChange} />
                        Maintenance Mode
                    </label>
                    <small>When enabled, only SuperAdmin can access the system</small>
                </div>
                <div className="form-group checkbox-group">
                    <label>
                        <input type="checkbox" name="emailNotifications" checked={form.emailNotifications} onChange={handleChange} />
                        Email Notifications
                    </label>
                </div>

                <h3 style={{ margin: '1.5rem 0 1rem' }}>Default Admin Permissions</h3>
                <small style={{ display: 'block', marginBottom: '1rem', color: '#888' }}>
                    Set global defaults, then use "Apply to all Admins" to push them. You can also edit each user's permissions individually from the Users page.
                </small>
                <div className="form-group checkbox-group">
                    <label>
                        <input type="checkbox" name="canViewAuditLogs" checked={form.adminPermissions.canViewAuditLogs} onChange={handlePermissionChange} />
                        Allow Admins to view Audit Logs
                    </label>
                </div>
                <div className="form-group checkbox-group">
                    <label>
                        <input type="checkbox" name="canViewReports" checked={form.adminPermissions.canViewReports} onChange={handlePermissionChange} />
                        Allow Admins to view Reports
                    </label>
                </div>
                <div className="form-group checkbox-group">
                    <label>
                        <input type="checkbox" name="canDeleteUsers" checked={form.adminPermissions.canDeleteUsers} onChange={handlePermissionChange} />
                        Allow Admins to delete Users
                    </label>
                    <small>Admins can only delete normal Users, not other Admins or SuperAdmins</small>
                </div>

                <div className="form-actions" style={{ gap: '1rem', display: 'flex', flexWrap: 'wrap' }}>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                    <button type="button" className="btn btn-sm" disabled={applying} onClick={handleApplyToAll} style={{ marginTop: 0 }}>
                        {applying ? 'Applying...' : '📋 Apply to all Admins'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Settings;
