import { useEffect, useRef } from 'react';

const GoogleAuthSection = ({ mode = 'signin' }) => {
    const googleButtonRef = useRef(null);
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const googleRedirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'http://localhost:4000/auth/google/callback';

    useEffect(() => {
        if (!googleClientId || !googleButtonRef.current) return undefined;
        const scriptId = 'google-identity-script';

        const initGoogleButton = () => {
            if (!window.google?.accounts?.id || !googleButtonRef.current) return;

            googleButtonRef.current.innerHTML = '';
            window.google.accounts.id.initialize({
                client_id: googleClientId,
                ux_mode: 'redirect',
                login_uri: googleRedirectUri
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
    }, [googleClientId, googleRedirectUri, mode]);

    return (
        <>
            <div className="auth-link">or</div>
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
