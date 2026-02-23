import { createContext, useContext, useState, useEffect } from 'react';
import { getUserById } from '../api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser));
            setToken(storedToken);
        }
        setLoading(false);
    }, []);

    // Refresh user data (including permissions) from the server
    const refreshUser = async () => {
        if (!user?._id) return;
        try {
            const { data } = await getUserById(user._id);
            setUser(data);
            localStorage.setItem('user', JSON.stringify(data));
        } catch { /* ignore */ }
    };

    const login = (userData, tokenData) => {
        setUser(userData);
        setToken(tokenData);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', tokenData);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    };

    const hasRole = (...roles) => {
        return user && roles.includes(user.role);
    };

    /**
     * Check if the current user has a specific permission.
     * SuperAdmin always returns true. Others check user.permissions[key].
     */
    const hasPermission = (permissionKey) => {
        if (!user) return false;
        if (user.role === 'SuperAdmin') return true;
        return user.permissions?.[permissionKey] ?? false;
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, hasRole, hasPermission, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};
