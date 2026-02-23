import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser, verifyEmailOtp, resendEmailOtp } from '../api';
import { useAuth } from '../context/AuthContext';
import GoogleAuthSection from '../components/GoogleAuthSection';

const Register = () => {
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [otp, setOtp] = useState('');
    const [pendingEmail, setPendingEmail] = useState('');
    const [step, setStep] = useState('register');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);
        try {
            const { data } = await registerUser(form);
            setPendingEmail(form.email);
            setStep('verify');
            setMessage(data.message || 'OTP sent to your email');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);
        try {
            const { data } = await verifyEmailOtp({ email: pendingEmail, otp });
            login(data.user, data.token);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'OTP verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setError('');
        setMessage('');
        setResending(true);
        try {
            const { data } = await resendEmailOtp({ email: pendingEmail });
            setMessage(data.message || 'A new OTP has been sent');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to resend OTP');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>{step === 'register' ? 'Register' : 'Verify Email'}</h2>
                <p className="auth-subtitle">
                    {step === 'register' ? 'Create your account' : `Enter the OTP sent to ${pendingEmail}`}
                </p>
                {error && <div className="error-msg">{error}</div>}
                {message && <div className="success-msg">{message}</div>}

                {step === 'register' ? (
                    <>
                        <form onSubmit={handleRegister}>
                            <div className="form-group">
                                <label>Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="Enter your name"
                                />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                    placeholder="Enter your email"
                                />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    minLength={6}
                                    placeholder="Min 6 characters"
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Sending OTP...' : 'Register'}
                            </button>
                        </form>
                        <GoogleAuthSection mode="signup" />
                    </>
                ) : (
                    <form onSubmit={handleVerifyOtp}>
                        <div className="form-group">
                            <label>OTP</label>
                            <input
                                type="text"
                                name="otp"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                                minLength={6}
                                maxLength={6}
                                placeholder="Enter 6-digit OTP"
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify Email'}
                        </button>
                        <div className="form-actions">
                            <button type="button" className="btn" onClick={handleResendOtp} disabled={resending}>
                                {resending ? 'Resending...' : 'Resend OTP'}
                            </button>
                        </div>
                    </form>
                )}

                <p className="auth-link">
                    Already have an account? <Link to="/login">Login</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
