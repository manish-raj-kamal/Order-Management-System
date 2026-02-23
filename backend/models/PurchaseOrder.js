const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 }
});

const approvalHistorySchema = new mongoose.Schema({
    action: { type: String, enum: ['Approved', 'Rejected', 'Pending', 'Completed'], required: true },
    remarks: { type: String, trim: true, default: '' },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    performedAt: { type: Date, default: Date.now }
});

const updateHistorySchema = new mongoose.Schema({
    summary: { type: String, trim: true, default: '' },
    changes: { type: mongoose.Schema.Types.Mixed, default: {} },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    performedAt: { type: Date, default: Date.now }
});

const attachmentSchema = new mongoose.Schema({
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String },
    fileSize: { type: Number },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
});

const purchaseOrderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        unique: true
    },
    vendorName: {
        type: String,
        required: [true, 'Vendor name is required'],
        trim: true,
        index: true
    },
    items: {
        type: [itemSchema],
        validate: {
            validator: (v) => v.length > 0,
            message: 'At least one item is required'
        }
    },
    totalAmount: {
        type: Number,
        default: 0,
        index: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Completed'],
        default: 'Pending',
        index: true
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Urgent'],
        default: 'Medium'
    },
    approvalRemarks: {
        type: String,
        trim: true,
        default: ''
    },
    approvalHistory: [approvalHistorySchema],
    attachments: [attachmentSchema],
    updateHistory: [updateHistorySchema],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Soft delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Compound indexes for common queries
purchaseOrderSchema.index({ status: 1, createdBy: 1 });
purchaseOrderSchema.index({ createdAt: -1 });
purchaseOrderSchema.index({ vendorName: 'text' });

// Auto-generate order number & calculate total before saving
purchaseOrderSchema.pre('save', async function (next) {
    if (this.isNew) {
        const count = await mongoose.model('PurchaseOrder').countDocuments();
        this.orderNumber = `PO-${String(count + 1).padStart(5, '0')}`;
    }
    this.totalAmount = this.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    next();
});

// Default query: exclude soft-deleted
purchaseOrderSchema.pre(/^find/, function (next) {
    if (this.getFilter().isDeleted === undefined) {
        this.where({ isDeleted: { $ne: true } });
    }
    next();
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
