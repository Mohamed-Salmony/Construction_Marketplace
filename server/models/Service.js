import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  type: { type: String, required: true },
  dailyWage: { type: Number, required: true },
  days: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  description: { type: String },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isApproved: { type: Boolean, default: false },
  requiredSkills: { type: String },
  technicianType: { type: String },
  status: { type: String, default: 'Open' }, // Open | InProgress | Completed | Cancelled
  startDate: { type: Date },
  endDate: { type: Date },
}, { timestamps: true });

export const Service = mongoose.models.Service || mongoose.model('Service', serviceSchema);
