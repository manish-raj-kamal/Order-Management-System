import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { googleSignIn } from '../api';

const GoogleAuthSection = ({ mode = 'signin' }) => {
    const googleButtonRef = useRef(null);
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    useEffect(() => {
        if (!googleClientId || !googleButtonRef.current) return undefined;
        const scriptId = 'google-identity-script';

        const handleCredentialResponse = async (response) => {
            setError('');
            try {
                const { data } = await googleSignIn({ idToken: response.credential });
                if (data.user && data.token) {
                    login(data.user, data.token);
                    navigate('/');
                }
            } catch (err) {
                console.error('Google Sign-In error:', err);
                setError(err.response?.data?.error || 'Google sign-in failed. Please try again.');
            }
        };

        const initGoogleButton = () => {
            if (!window.google?.accounts?.id || !googleButtonRef.current) return;

            googleButtonRef.current.innerHTML = '';
            window.google.accounts.id.initialize({
                client_id: googleClientId,
                callback: handleCredentialResponse
            });
            window.google.accounts.id.renderButton(googleButtonRef.current, {
                theme: 'outline',
                size: 'large',
                text: mode === 'signup' ? 'signup_with' : 'signin_with',
                width: 320
            });
        };

        const existingScript = document.getElementById(scriptId);
        if (existingScript) {
            initGoogleButton();
        } else {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.id = scriptId;
            script.onload = initGoogleButton;
            document.body.appendChild(script);
        }

        return () => {
            // no-op
        };
    }, [googleClientId, mode, navigate, login]);

    return (
        <>
            <div className="auth-link">or</div>
            {error && <div className="error-msg" style={{ marginBottom: '1rem' }}>{error}</div>}
            <div className="google-depth-shell">
                {googleClientId ? (
                    <div ref={googleButtonRef} className="google-signin"></div>
                ) : (
                    <button type="button" className="google-fallback-btn" disabled>
                        Continue with Google
                    </button>
                )}
            </div>
            {!googleClientId && (
                <p className="auth-link">
                    Google button requires <code>VITE_GOOGLE_CLIENT_ID</code> in frontend env.
                </p>
            )}
        </>
    );
};

export default GoogleAuthSection;
