import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
  technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: ['service', 'project'], required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  price: { type: Number, required: true },
  days: { type: Number, required: true },
  message: { type: String },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  archived: { type: Boolean, default: false },
}, { timestamps: true });

export const Offer = mongoose.models.Offer || mongoose.model('Offer', offerSchema);
