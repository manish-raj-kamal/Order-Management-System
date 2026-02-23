const mongoose = require('mongoose');

const fixCorruptedPermissions = async () => {
    try {
        const db = mongoose.connection.db;
        const result = await db.collection('users').updateMany(
            { permissions: { $type: 'array' } },
            { $set: { permissions: { canViewAuditLogs: false, canViewReports: false, canDeleteUsers: false } } }
        );
        if (result.modifiedCount > 0) {
            console.log(`Fixed ${result.modifiedCount} user(s) with corrupted permissions field`);
        }
    } catch (err) {
        console.error('Error fixing corrupted permissions:', err.message);
    }
};

const connectDB = async () => {
    try {
        const dbName = process.env.MONGODB_DB_NAME || 'order_management';
        await mongoose.connect(process.env.MONGODB_URI, { dbName });
        console.log(`Connected to MongoDB database: "${dbName}"`);
        await fixCorruptedPermissions();
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    }
};

module.exports = connectDB;
