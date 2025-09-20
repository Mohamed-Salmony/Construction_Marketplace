import mongoose from 'mongoose';

const productImageSchema = new mongoose.Schema({
  imageUrl: String,
  altText: String,
  isPrimary: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },
}, { _id: true, timestamps: false });

const productAttributeSchema = new mongoose.Schema({
  nameEn: String,
  nameAr: String,
  valueEn: String,
  valueAr: String,
}, { _id: true, timestamps: false });

const productSchema = new mongoose.Schema({
  nameEn: { type: String, required: true },
  nameAr: { type: String, required: true },
  slug: { type: String, index: true },
  descriptionEn: String,
  descriptionAr: String,
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  merchantName: String,
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  categoryName: String,
  price: { type: Number, required: true },
  discountPrice: { type: Number, default: null },
  currency: { type: String, default: 'SAR' },
  stockQuantity: { type: Number, default: 0 },
  allowCustomDimensions: { type: Boolean, default: false },
  isAvailableForRent: { type: Boolean, default: false },
  rentPricePerDay: { type: Number, default: null },
  isApproved: { type: Boolean, default: false },
  approvedAt: { type: Date },
  averageRating: { type: Number, default: null },
  reviewCount: { type: Number, default: 0 },
  images: [productImageSchema],
  attributes: [productAttributeSchema],
  // Persist vendor-defined addon installation option
  addonInstallation: {
    enabled: { type: Boolean, default: false },
    feePerUnit: { type: Number, default: 0 },
  },
  // Optional structured details
  specifications: { type: mongoose.Schema.Types.Mixed, default: {} },
  compatibility: { type: [String], default: [] },
}, { timestamps: true });

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

