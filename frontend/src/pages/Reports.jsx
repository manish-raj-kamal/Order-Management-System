import { useState, useEffect, useRef } from 'react';
import { getReports, exportCSV } from '../api';

const Reports = () => {
    const [report, setReport] = useState(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    const isFirstLoad = useRef(true);

    const fetchReports = async (showRefresh = false, overrides = null) => {
        if (showRefresh) setRefreshing(true);
        setError('');
        try {
            const params = {};
            const sd = overrides?.startDate ?? startDate;
            const ed = overrides?.endDate ?? endDate;
            const mi = overrides?.minAmount ?? minAmount;
            const ma = overrides?.maxAmount ?? maxAmount;
            if (sd) params.startDate = sd;
            if (ed) params.endDate = ed;
            if (mi) params.minAmount = mi;
            if (ma) params.maxAmount = ma;
            const { data } = await getReports(params);
            setReport(data.report);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load reports');
        } finally {
            setInitialLoading(false);
            setRefreshing(false);
        }
    };

    // Initial load only
    useEffect(() => {
        if (isFirstLoad.current) {
            isFirstLoad.current = false;
            fetchReports();
        }
    }, []);

    const applyFilters = () => fetchReports(true);

    const clearFilters = () => {
        setStartDate(''); setEndDate(''); setMinAmount(''); setMaxAmount('');
        fetchReports(true, { startDate: '', endDate: '', minAmount: '', maxAmount: '' });
    };

    const handleExportCSV = async () => {
        setExporting(true);
        try {
            const params = {};
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            if (minAmount) params.minAmount = minAmount;
            if (maxAmount) params.maxAmount = maxAmount;
            const { data } = await exportCSV(params);
            const url = window.URL.createObjectURL(new Blob([data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `orders-${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError('CSV export failed');
        } finally {
            setExporting(false);
        }
    };

    if (initialLoading) return <div className="loading">Generating reports...</div>;
    if (error && !report) return <div className="error-msg">{error}</div>;

    return (
        <div className="page">
            <div className="section-header">
                <h1>Reports {refreshing && <span className="refreshing-badge">Refreshing…</span>}</h1>
                <button className="btn btn-primary" onClick={handleExportCSV} disabled={exporting}>
                    {exporting ? 'Exporting...' : '📥 Export CSV'}
                </button>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <div className="filter-bar">
                <div className="date-filter">
                    <label>From:</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="date-filter">
                    <label>To:</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="date-filter">
                    <label>Min ₹:</label>
                    <input type="number" placeholder="0" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} min="0" style={{ width: '100px' }} />
                </div>
                <div className="date-filter">
                    <label>Max ₹:</label>
                    <input type="number" placeholder="Any" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} min="0" style={{ width: '100px' }} />
                </div>
                <button className="btn btn-sm btn-primary" onClick={applyFilters} disabled={refreshing}>
                    {refreshing ? '...' : 'Apply'}
                </button>
                {(startDate || endDate || minAmount || maxAmount) && (
                    <button className="btn btn-sm" onClick={clearFilters}>Clear</button>
                )}
            </div>

            <div className="stats-backdrop">
                <div className="stats-blob stats-blob-1"></div>
                <div className="stats-blob stats-blob-2"></div>
                <div className="stats-blob stats-blob-3"></div>
                <div className="stats-blob stats-blob-4"></div>
                <div className="stats-blob stats-blob-5"></div>
                <div className="stats-blob stats-blob-6"></div>
                <div className="stats-grid stats-top-row">
                    <div className="stat-card stat-green">
                        <span className="stat-emoji">⛳</span>
                        <p>Total Orders</p>
                        <h3>{report.totalOrders}</h3>
                    </div>
                    <div className="stat-card stat-purple">
                        <span className="stat-emoji">💰</span>
                        <p>Total Value</p>
                        <h3>₹{report.totalAmount.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="stats-grid stats-bottom-row">
                    <div className="stat-card stat-amber">
                        <span className="stat-emoji">⏳</span>
                        <p>Pending</p>
                        <h3>{report.pendingOrders}</h3>
                    </div>
                    <div className="stat-card stat-emerald">
                        <span className="stat-emoji">✅</span>
                        <p>Approved</p>
                        <h3>{report.approvedOrders}</h3>
                    </div>
                    <div className="stat-card stat-rose">
                        <span className="stat-emoji">❌</span>
                        <p>Rejected</p>
                        <h3>{report.rejectedOrders || 0}</h3>
                    </div>
                    <div className="stat-card stat-blue">
                        <span className="stat-emoji">🏁</span>
                        <p>Completed</p>
                        <h3>{report.completedOrders}</h3>
                    </div>
                </div>
            </div>

            {report.monthlyTrend && report.monthlyTrend.length > 0 && (
                <div className="section">
                    <h2>Monthly Trend</h2>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Month</th>
                                <th>Orders</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.monthlyTrend.map((m, i) => (
                                <tr key={i}>
                                    <td>{typeof m._id === 'object' ? `${m._id.year}-${String(m._id.month).padStart(2, '0')}` : m._id}</td>
                                    <td>{m.count}</td>
                                    <td>₹{(m.amount ?? m.totalAmount ?? 0).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="section">
                <h2>Vendor Summary</h2>
                {!report.vendorSummary || report.vendorSummary.length === 0 ? (
                    <p className="empty-msg">No vendor data available.</p>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Vendor</th>
                                <th>Order Count</th>
                                <th>Total Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.vendorSummary.map((vendor, i) => (
                                <tr key={i}>
                                    <td>{vendor._id}</td>
                                    <td>{vendor.orderCount}</td>
                                    <td>₹{vendor.totalAmount.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default Reports;
