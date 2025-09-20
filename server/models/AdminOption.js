import mongoose from 'mongoose';

const adminOptionSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: { type: String, default: '' },
}, { timestamps: true });

export const AdminOption = mongoose.models.AdminOption || mongoose.model('AdminOption', adminOptionSchema);
