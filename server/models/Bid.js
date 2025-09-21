import mongoose from 'mongoose';

const bidSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number },
  price: { type: Number },
  days: { type: Number },
  message: { type: String },
  status: { type: String, default: 'pending' }, // pending | accepted | rejected
}, { timestamps: true });

// Ensure a vendor can only submit one bid per project
bidSchema.index({ projectId: 1, merchantId: 1 }, { unique: true });

export const Bid = mongoose.models.Bid || mongoose.model('Bid', bidSchema);
