import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  nameEn: { type: String, required: true },
  nameAr: { type: String, required: true },
  descriptionEn: { type: String },
  descriptionAr: { type: String },
  imageUrl: { type: String },
  parentCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
