import mongoose from 'mongoose';

const rentalSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
  productName: { type: String },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  rentalDays: { type: Number, default: 0 },
  dailyRate: { type: Number, required: true },
  totalAmount: { type: Number, default: 0 },
  status: { type: String, default: 'pending' },
  currency: { type: String, default: 'SAR' },
  imageUrl: { type: String },
}, { timestamps: true });

export const Rental = mongoose.models.Rental || mongoose.model('Rental', rentalSchema);
