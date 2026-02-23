import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getOrderById, approveOrder, rejectOrder, completeOrder, deleteOrder } from '../api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const OrderDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasRole } = useAuth();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [remarks, setRemarks] = useState('');
    const [actionLoading, setActionLoading] = useState('');
    const [showUpdateLog, setShowUpdateLog] = useState(false);

    const fetchOrder = async () => {
        try {
            const { data } = await getOrderById(id);
            setOrder(data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load order');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrder(); }, [id]);

    const handleAction = async (action) => {
        setActionLoading(action);
        try {
            const payload = { remarks };
            if (action === 'approve') await approveOrder(id, payload);
            else if (action === 'reject') {
                if (!remarks.trim()) { toast.error('Remarks are required for rejection'); setActionLoading(''); return; }
                await rejectOrder(id, payload);
            } else if (action === 'complete') await completeOrder(id, payload);

            toast.success(`Order ${action}d successfully`);
            setRemarks('');
            await fetchOrder();
        } catch (err) {
            toast.error(err.response?.data?.error || `Failed to ${action} order`);
        } finally {
            setActionLoading('');
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this order?')) return;
        try {
            await deleteOrder(id);
            toast.success('Order deleted');
            navigate('/orders');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Delete failed');
        }
    };

    if (loading) return <div className="loading">Loading order...</div>;
    if (error) return <div className="error-msg">{error}</div>;
    if (!order) return <div className="error-msg">Order not found</div>;

    const isAdmin = hasRole(['Admin', 'SuperAdmin']);

    return (
        <div className="page">
            <div className="section-header">
                <h1>Order: {order.orderNumber}</h1>
                <div className="header-actions">
                    {isAdmin && (
                        <button className="btn btn-sm btn-danger" onClick={handleDelete}>🗑️ Delete</button>
                    )}
                    <Link to={`/orders/${id}/edit`} className="btn btn-sm">✏️ Edit</Link>
                    <Link to="/orders" className="btn btn-sm">← Back</Link>
                </div>
            </div>

            <div className="detail-card">
                <div className="detail-grid">
                    <div><strong>Vendor:</strong> {order.vendorName}</div>
                    <div><strong>Status:</strong> <span className={`status status-${order.status.toLowerCase()}`}>{order.status}</span></div>
                    <div><strong>Priority:</strong> <span className={`priority priority-${(order.priority || 'medium').toLowerCase()}`}>{order.priority || 'Medium'}</span></div>
                    <div><strong>Total Amount:</strong> ₹{order.totalAmount.toLocaleString()}</div>
                    <div><strong>Created By:</strong> {order.createdBy?.name} ({order.createdBy?.role})</div>
                    <div><strong>Created:</strong> {new Date(order.createdAt).toLocaleString()}</div>
                    <div><strong>Updated:</strong> {new Date(order.updatedAt).toLocaleString()}</div>
                    {order.updatedBy && (
                        <div>
                            <strong>Updated By: </strong>
                            <span
                                className="updated-by-link"
                                onClick={() => setShowUpdateLog(!showUpdateLog)}
                                title="Click to view update history"
                            >
                                {order.updatedBy?.name} ({order.updatedBy?.role}) {showUpdateLog ? '▲' : '▼'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Update History Log (shown on click) */}
                {showUpdateLog && order.updateHistory && order.updateHistory.length > 0 && (
                    <div className="update-log">
                        <h4>Update History ({order.updateHistory.length} updates)</h4>
                        <div className="approval-timeline">
                            {[...order.updateHistory].reverse().map((entry, i) => (
                                <div key={i} className="timeline-item">
                                    <div className="timeline-marker"></div>
                                    <div className="timeline-content">
                                        <strong>{entry.summary || 'Update'}</strong>
                                        <span className="timeline-user"> by {entry.performedBy?.name || 'Unknown'}</span>
                                        <span className="timeline-date">{new Date(entry.performedAt).toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {showUpdateLog && (!order.updateHistory || order.updateHistory.length === 0) && (
                    <div className="update-log"><p className="empty-msg">No update history available.</p></div>
                )}

                <h3>Items</h3>
                <table className="table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Item Name</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((item, index) => (
                            <tr key={index}>
                                <td>{index + 1}</td>
                                <td>{item.name}</td>
                                <td>{item.quantity}</td>
                                <td>₹{item.unitPrice.toLocaleString()}</td>
                                <td>₹{(item.quantity * item.unitPrice).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan="4"><strong>Total</strong></td>
                            <td><strong>₹{order.totalAmount.toLocaleString()}</strong></td>
                        </tr>
                    </tfoot>
                </table>

                {/* Approval Actions */}
                {isAdmin && (order.status === 'Pending' || order.status === 'Approved') && (
                    <div className="approval-section">
                        <h3>Actions</h3>
                        <textarea
                            placeholder={order.status === 'Pending' ? 'Add remarks (required for rejection)...' : 'Add remarks...'}
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            rows={3}
                        />
                        <div className="approval-actions">
                            {order.status === 'Pending' && (
                                <>
                                    <button className="btn btn-approve" onClick={() => handleAction('approve')}
                                        disabled={!!actionLoading}>
                                        {actionLoading === 'approve' ? 'Approving...' : '✅ Approve'}
                                    </button>
                                    <button className="btn btn-reject" onClick={() => handleAction('reject')}
                                        disabled={!!actionLoading}>
                                        {actionLoading === 'reject' ? 'Rejecting...' : '❌ Reject'}
                                    </button>
                                </>
                            )}
                            {order.status === 'Approved' && (
                                <button className="btn btn-complete" onClick={() => handleAction('complete')}
                                    disabled={!!actionLoading}>
                                    {actionLoading === 'complete' ? 'Completing...' : '✔️ Mark Complete'}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Approval History Timeline */}
                {order.approvalHistory && order.approvalHistory.length > 0 && (
                    <div className="approval-section">
                        <h3>Approval History</h3>
                        <div className="approval-timeline">
                            {order.approvalHistory.map((entry, i) => (
                                <div key={i} className={`timeline-item timeline-${entry.action?.toLowerCase()}`}>
                                    <div className="timeline-marker"></div>
                                    <div className="timeline-content">
                                        <strong>{entry.action}</strong>
                                        <span className="timeline-user"> by {entry.performedBy?.name || 'Unknown'}</span>
                                        <span className="timeline-date">{new Date(entry.performedAt).toLocaleString()}</span>
                                        {entry.remarks && <p className="timeline-remarks">{entry.remarks}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderDetail;
