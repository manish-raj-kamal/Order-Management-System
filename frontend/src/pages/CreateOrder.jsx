import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrder } from '../api';

const CreateOrder = () => {
    const [vendorName, setVendorName] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [items, setItems] = useState([{ name: '', quantity: 1, unitPrice: 0 }]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const addItem = () => {
        setItems([...items, { name: '', quantity: 1, unitPrice: 0 }]);
    };

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
        setLoading(true);
        try {
            await createOrder({ vendorName, items, priority });
            navigate('/orders');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            <h1>Create Purchase Order</h1>
            {error && <div className="error-msg">{error}</div>}

            <form onSubmit={handleSubmit} className="form-card">
                <div className="form-group">
                    <label>Vendor Name</label>
                    <input type="text" value={vendorName} onChange={(e) => setVendorName(e.target.value)}
                        required placeholder="Enter vendor / supplier name" />
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
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Creating...' : 'Create Order'}
                    </button>
                    <button type="button" onClick={() => navigate('/orders')} className="btn">Cancel</button>
                </div>
            </form>
        </div>
    );
};

export default CreateOrder;
