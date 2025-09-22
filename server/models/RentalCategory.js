import mongoose from 'mongoose';

const rentalCategorySchema = new mongoose.Schema({
  nameAr: { type: String, required: true },
  nameEn: { type: String, required: true },
  descriptionAr: { type: String },
  descriptionEn: { type: String },
  imageUrl: { type: String },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  parentCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'RentalCategory', default: null },
}, { timestamps: true });

export const RentalCategory = mongoose.models.RentalCategory || mongoose.model('RentalCategory', rentalCategorySchema);
