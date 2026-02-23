import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import OrderList from './pages/OrderList';
import CreateOrder from './pages/CreateOrder';
import OrderDetail from './pages/OrderDetail';
import EditOrder from './pages/EditOrder';
import UserList from './pages/UserList';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import AuditLogs from './pages/AuditLogs';

function App() {
    const location = useLocation();
    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

    return (
        <ThemeProvider>
            <AuthProvider>
                {!isAuthPage && <Navbar />}
                <div className={`container ${isAuthPage ? 'auth-layout' : 'app-shell'}`}>
                    <Routes>
                        {/* Public routes */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />

                        {/* Protected routes - all authenticated users */}
                        <Route path="/" element={
                            <ProtectedRoute><Dashboard /></ProtectedRoute>
                        } />
                        <Route path="/profile" element={
                            <ProtectedRoute><Profile /></ProtectedRoute>
                        } />

                        {/* Purchase Orders */}
                        <Route path="/orders" element={
                            <ProtectedRoute><OrderList /></ProtectedRoute>
                        } />
                        <Route path="/orders/new" element={
                            <ProtectedRoute roles={['User', 'Admin']}><CreateOrder /></ProtectedRoute>
                        } />
                        <Route path="/orders/:id" element={
                            <ProtectedRoute><OrderDetail /></ProtectedRoute>
                        } />
                        <Route path="/orders/:id/edit" element={
                            <ProtectedRoute roles={['Admin', 'SuperAdmin']}><EditOrder /></ProtectedRoute>
                        } />

                        {/* Admin / SuperAdmin */}
                        <Route path="/users" element={
                            <ProtectedRoute roles={['Admin', 'SuperAdmin']}><UserList /></ProtectedRoute>
                        } />
                        <Route path="/reports" element={
                            <ProtectedRoute permission="canViewReports"><Reports /></ProtectedRoute>
                        } />
                        <Route path="/audit-logs" element={
                            <ProtectedRoute permission="canViewAuditLogs"><AuditLogs /></ProtectedRoute>
                        } />

                        {/* SuperAdmin only */}
                        <Route path="/settings" element={
                            <ProtectedRoute roles={['SuperAdmin']}><Settings /></ProtectedRoute>
                        } />

                        {/* Catch all */}
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </div>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
