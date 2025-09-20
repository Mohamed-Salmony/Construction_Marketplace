import mongoose from 'mongoose';

const rentalMessageTechnicianSchema = new mongoose.Schema({
  rentalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental', required: true },
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  toEmail: { type: String },
  name: { type: String },
  phone: { type: String },
  message: { type: String, required: true },
}, { timestamps: true });

export const RentalMessageTechnician = mongoose.models.RentalMessageTechnician || mongoose.model('RentalMessageTechnician', rentalMessageTechnicianSchema);
