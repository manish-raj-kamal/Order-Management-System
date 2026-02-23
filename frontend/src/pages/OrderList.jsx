import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getOrders, deleteOrder } from '../api';
import { useAuth } from '../hooks/useAuth';

const OrderList = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const { hasRole } = useAuth();

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [page, setPage] = useState(1);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: 10, sortBy, sortOrder };
            if (search) params.search = search;
            if (statusFilter) params.status = statusFilter;
            if (priorityFilter) params.priority = priorityFilter;

            const { data } = await getOrders(params);
            setOrders(data.orders);
            setPagination(data.pagination);
        } catch (err) {
            console.error('Error fetching orders:', err);
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter, priorityFilter, sortBy, sortOrder]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this order?')) return;
        try {
            await deleteOrder(id);
            fetchOrders();
        } catch (err) {
            alert(err.response?.data?.error || 'Delete failed');
        }
    };

    const handleSearch = (e) => {
        setSearch(e.target.value);
        setPage(1);
    };

    const toggleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
        setPage(1);
    };

    const sortIcon = (field) => {
        if (sortBy !== field) return '';
        return sortOrder === 'asc' ? ' ↑' : ' ↓';
    };

    return (
        <div className="page">
            <div className="section-header">
                <h1>Purchase Orders</h1>
                {hasRole('User', 'Admin') && (
                    <Link to="/orders/new" className="btn btn-primary">+ New Order</Link>
                )}
            </div>

            <div className="filter-bar">
                <input
                    type="text"
                    placeholder="Search orders..."
                    value={search}
                    onChange={handleSearch}
                    style={{ flex: '1 1 180px', minWidth: '150px' }}
                />
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                    <option value="">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Completed">Completed</option>
                </select>
                <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}>
                    <option value="">All Priority</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                </select>
                {(search || statusFilter || priorityFilter) && (
                    <button className="btn btn-sm" onClick={() => { setSearch(''); setStatusFilter(''); setPriorityFilter(''); setPage(1); }}>
                        Clear
                    </button>
                )}
            </div>

            {loading ? (
                <div className="loading">Loading orders...</div>
            ) : orders.length === 0 ? (
                <p className="empty-msg">No orders found.</p>
            ) : (
                <>
                    <table className="table">
                        <thead>
                            <tr>
                                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('orderNumber')}>Order #{sortIcon('orderNumber')}</th>
                                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('vendorName')}>Vendor{sortIcon('vendorName')}</th>
                                <th>Items</th>
                                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('totalAmount')}>Amount{sortIcon('totalAmount')}</th>
                                <th>Status</th>
                                <th>Priority</th>
                                <th>Created By</th>
                                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('createdAt')}>Date{sortIcon('createdAt')}</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order._id}>
                                    <td><Link to={`/orders/${order._id}`}>{order.orderNumber}</Link></td>
                                    <td>{order.vendorName}</td>
                                    <td>{order.items.length}</td>
                                    <td>₹{order.totalAmount.toLocaleString()}</td>
                                    <td><span className={`status status-${order.status.toLowerCase()}`}>{order.status}</span></td>
                                    <td><span className={`priority priority-${(order.priority || 'medium').toLowerCase()}`}>{order.priority || 'Medium'}</span></td>
                                    <td>{order.createdBy?.name || 'N/A'}</td>
                                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <Link to={`/orders/${order._id}`} className="btn btn-sm">View</Link>
                                        {hasRole('Admin', 'SuperAdmin') && (
                                            <>
                                                <Link to={`/orders/${order._id}/edit`} className="btn btn-sm btn-edit">Edit</Link>
                                                <button onClick={() => handleDelete(order._id)} className="btn btn-sm btn-danger">Delete</button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {pagination.pages > 1 && (
                        <div className="pagination">
                            <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</button>
                            {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => {
                                let pageNum;
                                if (pagination.pages <= 7) {
                                    pageNum = i + 1;
                                } else if (page <= 4) {
                                    pageNum = i + 1;
                                } else if (page >= pagination.pages - 3) {
                                    pageNum = pagination.pages - 6 + i;
                                } else {
                                    pageNum = page - 3 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        className={`btn btn-sm ${page === pageNum ? 'active' : ''}`}
                                        onClick={() => setPage(pageNum)}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button className="btn btn-sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>→</button>
                            <span className="pagination-info">({pagination.total} total)</span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default OrderList;
