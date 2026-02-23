import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrderById, updateOrder } from '../api';

const EditOrder = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [vendorName, setVendorName] = useState('');
    const [items, setItems] = useState([]);
    const [status, setStatus] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const { data } = await getOrderById(id);
                setVendorName(data.vendorName);
                setItems(data.items.map(i => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })));
                setStatus(data.status);
                setPriority(data.priority || 'Medium');
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load order');
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id]);

    const addItem = () => setItems([...items, { name: '', quantity: 1, unitPrice: 0 }]);

    const removeItem = (index) => {
        if (items.length === 1) return;
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index, field, value) => {
        const updated = [...items];
        updated[index][field] = field === 'name' ? value : Number(value);
        setItems(updated);
    };

    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            await updateOrder(id, { vendorName, items, status, priority });
            navigate(`/orders/${id}`);
        } catch (err) {
            setError(err.response?.data?.error || 'Update failed');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading">Loading order...</div>;

    return (
        <div className="page">
            <h1>Edit Purchase Order</h1>
            {error && <div className="error-msg">{error}</div>}

            <form onSubmit={handleSubmit} className="form-card">
                <div className="form-group">
                    <label>Vendor Name</label>
                    <input type="text" value={vendorName} onChange={(e) => setVendorName(e.target.value)} required />
                </div>

                <div className="form-group">
                    <label>Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Completed">Completed</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Priority</label>
                    <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                    </select>
                </div>

                <h3>Items</h3>
                {items.map((item, index) => (
                    <div key={index} className="item-row">
                        <input type="text" placeholder="Item name" value={item.name}
                            onChange={(e) => updateItem(index, 'name', e.target.value)} required />
                        <input type="number" placeholder="Qty" value={item.quantity} min="1"
                            onChange={(e) => updateItem(index, 'quantity', e.target.value)} required />
                        <input type="number" placeholder="Unit Price" value={item.unitPrice} min="0"
                            onChange={(e) => updateItem(index, 'unitPrice', e.target.value)} required />
                        <span className="item-total">₹{(item.quantity * item.unitPrice).toLocaleString()}</span>
                        {items.length > 1 && (
                            <button type="button" onClick={() => removeItem(index)} className="btn btn-sm btn-danger">✕</button>
                        )}
                    </div>
                ))}
                <button type="button" onClick={addItem} className="btn btn-sm">+ Add Item</button>

                <div className="total-section">
                    <strong>Total: ₹{totalAmount.toLocaleString()}</strong>
                </div>

                <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Saving...' : 'Update Order'}
                    </button>
                    <button type="button" onClick={() => navigate(`/orders/${id}`)} className="btn">Cancel</button>
                </div>
            </form>
        </div>
    );
};

export default EditOrder;
