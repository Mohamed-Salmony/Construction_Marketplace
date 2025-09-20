import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  role: { type: String, enum: ['customer', 'vendor', 'technician', 'admin'], index: true },
  type: { type: String, required: true }, // e.g., offer.accepted, offer.rejected, message.new
  title: { type: String },
  message: { type: String },
  data: { type: Object },
  read: { type: Boolean, default: false, index: true },
}, { timestamps: true });

export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
