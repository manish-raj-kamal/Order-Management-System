import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getOrders } from '../api';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ total: 0, pending: 0, totalAmount: 0 });
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const { data } = await getOrders({ limit: 100, sortBy: 'createdAt', sortOrder: 'desc' });
                const orders = data.orders || data;
                setRecentOrders((Array.isArray(orders) ? orders : []).slice(0, 5));

                const all = Array.isArray(orders) ? orders : [];
                const pending = all.filter(o => o.status === 'Pending').length;
                const totalAmount = all.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                setStats({ total: data.pagination?.total || all.length, pending, totalAmount });
            } catch (err) {
                console.error('Dashboard error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    if (loading) return <div className="loading">Loading dashboard...</div>;

    return (
        <div className="dashboard">
            <h1>Welcome, {user.name}</h1>
            <p className="role-badge">{user.role}</p>

            <div className="stats-backdrop">
                <div className="stats-blob stats-blob-1"></div>
                <div className="stats-blob stats-blob-2"></div>
                <div className="stats-blob stats-blob-3"></div>
                <div className="stats-grid">
                    <div className="stat-card stat-green">
                        <span className="stat-emoji">⛳</span>
                        <p>Total Orders</p>
                        <h3>{stats.total}</h3>
                    </div>
                    <div className="stat-card stat-amber">
                        <span className="stat-emoji">⏳</span>
                        <p>Pending</p>
                        <h3>{stats.pending}</h3>
                    </div>
                    <div className="stat-card stat-blue">
                        <span className="stat-emoji">💰</span>
                        <p>Total Value</p>
                        <h3>₹{stats.totalAmount.toLocaleString()}</h3>
                    </div>
                </div>
            </div>

            <div className="section">
                <div className="section-header">
                    <h2>Recent Orders</h2>
                    <Link to="/orders" className="btn btn-sm">View All</Link>
                </div>
                {recentOrders.length === 0 ? (
                    <p className="empty-msg">No orders yet. <Link to="/orders/new">Create one</Link></p>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Order #</th>
                                <th>Vendor</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Priority</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.map(order => (
                                <tr key={order._id}>
                                    <td><Link to={`/orders/${order._id}`}>{order.orderNumber}</Link></td>
                                    <td>{order.vendorName}</td>
                                    <td>₹{order.totalAmount.toLocaleString()}</td>
                                    <td><span className={`status status-${order.status.toLowerCase()}`}>{order.status}</span></td>
                                    <td><span className={`priority priority-${(order.priority || 'medium').toLowerCase()}`}>{order.priority || 'Medium'}</span></td>
                                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
