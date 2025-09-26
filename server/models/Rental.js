import mongoose from 'mongoose';

const rentalSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
  productName: { type: String },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rentalCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'RentalCategory', required: false },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  rentalDays: { type: Number, default: 0 },
  dailyRate: { type: Number, required: true },
  totalAmount: { type: Number, default: 0 },
  status: { type: String, default: 'pending' },
  currency: { type: String, default: 'SAR' },
  imageUrl: { type: String },
  // Additional rental-specific fields
  securityDeposit: { type: Number, default: 0 },
  deliveryAddress: { type: String },
  requiresDelivery: { type: Boolean, default: false },
  deliveryFee: { type: Number, default: 0 },
  requiresPickup: { type: Boolean, default: false },
  pickupFee: { type: Number, default: 0 },
  specialInstructions: { type: String },
  usageNotes: { type: String },
}, { timestamps: true });

export const Rental = mongoose.models.Rental || mongoose.model('Rental', rentalSchema);
