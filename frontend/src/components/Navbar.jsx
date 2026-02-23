import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } from '../api';

const timeAgo = (date) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

const Navbar = () => {
    const { user, logout, hasRole, hasPermission } = useAuth();
    const { dark, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const [unread, setUnread] = useState(0);
    const [showNotif, setShowNotif] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!user) return;
        const fetchUnread = async () => {
            try {
                const { data } = await getUnreadCount();
                setUnread(data.count);
            } catch { /* ignore */ }
        };
        fetchUnread();
        const interval = setInterval(fetchUnread, 30000);
        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowNotif(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleNotifications = async () => {
        if (!showNotif) {
            try {
                const { data } = await getNotifications({ limit: 15 });
                setNotifications(data.notifications);
            } catch { /* ignore */ }
        }
        setShowNotif(!showNotif);
    };

    const handleNotifClick = async (notif) => {
        if (!notif.isRead) {
            try {
                await markNotificationRead(notif._id);
                setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
                setUnread(prev => Math.max(0, prev - 1));
            } catch { /* ignore */ }
        }
        if (notif.link) {
            navigate(notif.link);
            setShowNotif(false);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnread(0);
        } catch { /* ignore */ }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (!user) return null;

    const navLinkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <NavLink to="/" end>PO Management</NavLink>
            </div>
            <div className="navbar-main">
                <div className="navbar-links">
                    <NavLink to="/" end className={navLinkClass}>Dashboard</NavLink>
                    <NavLink to="/profile" className={navLinkClass}>Profile</NavLink>
                    <NavLink to="/orders" className={navLinkClass}>Orders</NavLink>
                    {hasRole('Admin', 'SuperAdmin') && <NavLink to="/users" className={navLinkClass}>Users</NavLink>}
                    {hasPermission('canViewReports') && <NavLink to="/reports" className={navLinkClass}>Reports</NavLink>}
                    {hasPermission('canViewAuditLogs') && <NavLink to="/audit-logs" className={navLinkClass}>Audit</NavLink>}
                    {hasRole('SuperAdmin') && <NavLink to="/settings" className={navLinkClass}>Settings</NavLink>}
                </div>
            </div>
            <div className="navbar-user">
                <button className="theme-toggle" onClick={toggleTheme} title={dark ? 'Light mode' : 'Dark mode'}>
                    {dark ? '☀️' : '🌙'}
                </button>
                <div ref={dropdownRef} style={{ position: 'relative' }}>
                    <button className="notification-bell" onClick={toggleNotifications} title="Notifications">
                        🔔
                        {unread > 0 && <span className="notification-badge">{unread > 99 ? '99+' : unread}</span>}
                    </button>
                    {showNotif && (
                        <div className="notification-dropdown">
                            <div className="notification-dropdown-header">
                                <h4>Notifications</h4>
                                {unread > 0 && (
                                    <button className="btn btn-sm" onClick={handleMarkAllRead}>Mark all read</button>
                                )}
                            </div>
                            {notifications.length === 0 ? (
                                <div className="notification-empty">No notifications yet</div>
                            ) : (
                                notifications.map(n => (
                                    <div
                                        key={n._id}
                                        className={`notification-item ${!n.isRead ? 'unread' : ''}`}
                                        onClick={() => handleNotifClick(n)}
                                    >
                                        <div className="notif-title">{n.title}</div>
                                        <div className="notif-message">{n.message}</div>
                                        <div className="notif-time">{timeAgo(n.createdAt)}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
                <span className="navbar-user-text">{user.name} ({user.role})</span>
                <button onClick={handleLogout} className="btn btn-logout">Logout</button>
            </div>
        </nav>
    );
};

export default Navbar;
