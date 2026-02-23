import axios from 'axios';

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

// Attach token to every request
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth
export const registerUser = (data) => API.post('/auth/register', data);
export const verifyEmailOtp = (data) => API.post('/auth/verify-email-otp', data);
export const resendEmailOtp = (data) => API.post('/auth/resend-email-otp', data);
export const loginUser = (data) => API.post('/auth/login', data);
export const googleSignIn = (data) => API.post('/auth/google-signin', data);
export const createPassword = (data) => API.post('/auth/create-password', data);
export const createAdmin = (data) => API.post('/auth/create-admin', data);
export const createSuperAdmin = (data) => API.post('/auth/create-super-admin', data);

// Users
export const getUsers = () => API.get('/users');
export const getUserById = (id) => API.get(`/users/${id}`);
export const updateUser = (id, data) => API.put(`/users/${id}`, data);
export const toggleUserStatus = (id) => API.patch(`/users/${id}/status`);
export const updateUserPermissions = (id, data) => API.patch(`/users/${id}/permissions`, data);
export const deleteUser = (id) => API.delete(`/users/${id}`);

// Purchase Orders (with pagination/filter support)
export const createOrder = (data) => API.post('/purchase', data);
export const getOrders = (params = {}) => API.get('/purchase', { params });
export const getOrderById = (id) => API.get(`/purchase/${id}`);
export const updateOrder = (id, data) => API.put(`/purchase/${id}`, data);
export const deleteOrder = (id) => API.delete(`/purchase/${id}`);

// Approval Workflow
export const approveOrder = (id, data) => API.patch(`/purchase/${id}/approve`, data);
export const rejectOrder = (id, data) => API.patch(`/purchase/${id}/reject`, data);
export const completeOrder = (id, data) => API.patch(`/purchase/${id}/complete`, data);

// Reports
export const getReports = (params = {}) => API.get('/reports', { params });
export const exportCSV = (params = {}) => API.get('/reports/export-csv', { params, responseType: 'blob' });

// Settings
export const getSettings = () => API.get('/settings');
export const updateSettings = (data) => API.put('/settings', data);
export const applyPermissionsToAll = () => API.post('/settings/apply-permissions');

// Notifications
export const getNotifications = (params = {}) => API.get('/notifications', { params });
export const getUnreadCount = () => API.get('/notifications/unread-count');
export const markNotificationRead = (id) => API.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => API.patch('/notifications/read-all');

// Audit Logs
export const getAuditLogs = (params = {}) => API.get('/audit-logs', { params });

export default API;
