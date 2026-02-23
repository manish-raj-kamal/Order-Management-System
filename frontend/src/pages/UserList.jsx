import { useState, useEffect, Fragment } from 'react';
import { getUsers, toggleUserStatus, deleteUser, createAdmin, updateUserPermissions } from '../api';
import { useAuth } from '../hooks/useAuth';

const PERMISSION_LABELS = {
    canViewAuditLogs: 'View Audit Logs',
    canViewReports: 'View Reports',
    canDeleteUsers: 'Delete Users',
};

const UserList = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [formError, setFormError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({ role: '', permissions: {} });
    const [saving, setSaving] = useState(false);
    const { user: currentUser, hasRole, hasPermission, refreshUser } = useAuth();

    const canManageUsers = hasRole('SuperAdmin') || hasPermission('canDeleteUsers');
    const isSuperAdmin = hasRole('SuperAdmin');

    const fetchUsers = async () => {
        try {
            const { data } = await getUsers();
            setUsers(data);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleToggleStatus = async (id) => {
        try {
            await toggleUserStatus(id);
            fetchUsers();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to toggle status');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this user permanently?')) return;
        try {
            await deleteUser(id);
            setUsers(users.filter(u => u._id !== id));
        } catch (err) {
            alert(err.response?.data?.error || 'Delete failed');
        }
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        setFormError('');
        try {
            await createAdmin(form);
            setShowForm(false);
            setForm({ name: '', email: '', password: '' });
            fetchUsers();
        } catch (err) {
            setFormError(err.response?.data?.error || 'Failed to create admin');
        }
    };

    const startEditing = (user) => {
        setEditingId(user._id);
        setEditData({
            role: user.role,
            permissions: {
                canViewAuditLogs: user.permissions?.canViewAuditLogs || false,
                canViewReports: user.permissions?.canViewReports || false,
                canDeleteUsers: user.permissions?.canDeleteUsers || false,
            },
        });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditData({ role: '', permissions: {} });
    };

    const handlePermToggle = (key) => {
        setEditData(prev => ({
            ...prev,
            permissions: { ...prev.permissions, [key]: !prev.permissions[key] },
        }));
    };

    const handleRoleChange = (role) => {
        setEditData(prev => ({ ...prev, role }));
    };

    const handleSavePermissions = async (id) => {
        setSaving(true);
        try {
            await updateUserPermissions(id, editData);
            setEditingId(null);
            fetchUsers();
            // If SuperAdmin edited their own permissions, refresh context
            if (id === currentUser?._id) refreshUser();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to update permissions');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading">Loading users...</div>;

    return (
        <div className="page">
            <div className="section-header">
                <h1>Users</h1>
                {isSuperAdmin && (
                    <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
                        {showForm ? 'Cancel' : '+ Create Admin'}
                    </button>
                )}
            </div>

            {showForm && (
                <form onSubmit={handleCreateAdmin} className="form-card inline-form">
                    {formError && <div className="error-msg">{formError}</div>}
                    <input type="text" placeholder="Name" value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    <input type="email" placeholder="Email" value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                    <input type="password" placeholder="Password" value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
                    <button type="submit" className="btn btn-primary">Create</button>
                </form>
            )}

            <table className="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Joined</th>
                        {canManageUsers && <th>Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <Fragment key={user._id}>
                            <tr>
                                <td>{user.name}</td>
                                <td>{user.email}</td>
                                <td><span className="role-badge">{user.role}</span></td>
                                <td>
                                    <span className={`status ${user.isActive ? 'status-approved' : 'status-pending'}`}>
                                        {user.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                {canManageUsers && (
                                    <td>
                                        {isSuperAdmin && (
                                            <button
                                                onClick={() => editingId === user._id ? cancelEditing() : startEditing(user)}
                                                className="btn btn-sm btn-edit"
                                            >
                                                {editingId === user._id ? 'Cancel' : '✏️ Edit'}
                                            </button>
                                        )}
                                        {isSuperAdmin && (
                                            <button onClick={() => handleToggleStatus(user._id)} className="btn btn-sm btn-edit">
                                                {user.isActive ? 'Deactivate' : 'Activate'}
                                            </button>
                                        )}
                                        {(isSuperAdmin || (hasPermission('canDeleteUsers') && user.role === 'User')) && (
                                            <button onClick={() => handleDelete(user._id)} className="btn btn-sm btn-danger">Delete</button>
                                        )}
                                    </td>
                                )}
                            </tr>
                            {/* Expanded permission editor row */}
                            {editingId === user._id && (
                                <tr className="perm-edit-row">
                                    <td colSpan={canManageUsers ? 6 : 5}>
                                        <div className="perm-edit-panel">
                                            <div className="perm-edit-section">
                                                <label className="perm-label">Role</label>
                                                <select
                                                    value={editData.role}
                                                    onChange={(e) => handleRoleChange(e.target.value)}
                                                    className="perm-select"
                                                >
                                                    <option value="User">User</option>
                                                    <option value="Admin">Admin</option>
                                                    <option value="SuperAdmin">SuperAdmin</option>
                                                </select>
                                            </div>

                                            <div className="perm-edit-section">
                                                <label className="perm-label">Permissions</label>
                                                <div className="perm-checkboxes">
                                                    {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                                                        <label key={key} className="perm-checkbox-label">
                                                            <input
                                                                type="checkbox"
                                                                checked={editData.role === 'SuperAdmin' ? true : editData.permissions[key]}
                                                                disabled={editData.role === 'SuperAdmin'}
                                                                onChange={() => handlePermToggle(key)}
                                                            />
                                                            {label}
                                                        </label>
                                                    ))}
                                                </div>
                                                {editData.role === 'SuperAdmin' && (
                                                    <small className="perm-hint">SuperAdmin has all permissions by default.</small>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => handleSavePermissions(user._id)}
                                                className="btn btn-primary btn-sm"
                                                disabled={saving}
                                            >
                                                {saving ? 'Saving...' : '💾 Save'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default UserList;
