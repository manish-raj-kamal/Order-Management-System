import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles, permission }) => {
    const { user, loading, hasPermission } = useAuth();

    if (loading) return <div className="loading">Loading...</div>;

    if (!user) return <Navigate to="/login" />;

    if (roles && !roles.includes(user.role)) {
        return <Navigate to="/" />;
    }

    // Permission-based check (SuperAdmin always passes, Admin depends on settings)
    if (permission && !hasPermission(permission)) {
        return <Navigate to="/" />;
    }

    return children;
};

export default ProtectedRoute;
