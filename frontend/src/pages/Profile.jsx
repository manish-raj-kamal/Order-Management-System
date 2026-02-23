import { useMemo, useState } from 'react';
import { createPassword } from '../api';
import { useAuth } from '../hooks/useAuth';

const Profile = () => {
    const { user, token, login } = useAuth();
    const [form, setForm] = useState({ password: '', confirmPassword: '' });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const isGoogleLinked = useMemo(() => {
        return Array.isArray(user?.authProviders) && user.authProviders.some((provider) => provider.provider === 'google');
    }, [user]);

    const canCreatePassword = isGoogleLinked;

    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleCreatePassword = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (form.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setSaving(true);
        try {
            const { data } = await createPassword({ password: form.password });
            login(data.user, data.token || token);
            setForm({ password: '', confirmPassword: '' });
            setMessage(data.message || 'Password created successfully');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create password');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="page">
            <h1>Profile</h1>
            <p className="auth-subtitle">Manage your account access options</p>

            <div className="detail-card">
                <div className="detail-grid">
                    <div><strong>Name:</strong> {user?.name}</div>
                    <div><strong>Email:</strong> {user?.email}</div>
                    <div><strong>Role:</strong> {user?.role}</div>
                    <div>
                        <strong>Providers:</strong>{' '}
                        {Array.isArray(user?.authProviders) && user.authProviders.length > 0
                            ? user.authProviders.map((provider) => provider.provider).join(', ')
                            : 'local'}
                    </div>
                </div>
            </div>

            {message && <div className="success-msg">{message}</div>}
            {error && <div className="error-msg">{error}</div>}

            {canCreatePassword ? (
                <form onSubmit={handleCreatePassword} className="form-card">
                    <h3>{user?.hasCustomPassword === false ? 'Create Password' : 'Update Password'}</h3>
                    <p className="auth-subtitle">
                        Save a password to login with email/password in addition to Google sign-in.
                    </p>
                    <div className="form-group">
                        <label>New Password</label>
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            minLength={6}
                            required
                            placeholder="Min 6 characters"
                        />
                    </div>
                    <div className="form-group">
                        <label>Confirm Password</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            minLength={6}
                            required
                            placeholder="Re-enter password"
                        />
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : (user?.hasCustomPassword === false ? 'Create Password' : 'Update Password')}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="form-card">
                    <h3>Password Status</h3>
                    <p className="empty-msg">
                        This account is not Google-linked. Password is managed from regular login.
                    </p>
                </div>
            )}
        </div>
    );
};

export default Profile;
