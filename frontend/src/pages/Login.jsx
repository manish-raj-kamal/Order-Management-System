import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../api';
import { useAuth } from '../hooks/useAuth';
import GoogleAuthSection from '../components/GoogleAuthSection';

const Login = () => {
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data } = await loginUser(form);
            login(data.user, data.token);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const googleToken = params.get('token');
        const googleUser = params.get('user');
        const googleError = params.get('google_error');

        if (googleError) {
            setError(decodeURIComponent(googleError));
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }

        if (googleToken && googleUser) {
            try {
                const parsedUser = JSON.parse(decodeURIComponent(googleUser));
                login(parsedUser, googleToken);
                window.history.replaceState({}, document.title, window.location.pathname);
                navigate('/');
                return;
            } catch (err) {
                setError('Google sign-in callback parsing failed');
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }, [login, navigate]);

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Login</h2>
                <p className="auth-subtitle">Purchase Order Management System</p>
                {error && <div className="error-msg">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" name="email" value={form.email}
                            onChange={handleChange} required placeholder="Enter your email" />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input type="password" name="password" value={form.password}
                            onChange={handleChange} required placeholder="Enter your password" />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
                <GoogleAuthSection mode="signin" />
                <p className="auth-link">Don't have an account? <Link to="/register">Register</Link></p>
            </div>
        </div>
    );
};

export default Login;
