import mongoose from 'mongoose';

const projectItemSchema = new mongoose.Schema({
  ptype: { type: String },
  psubtype: { type: String },
  type: { type: String },
  material: { type: String },
  color: { type: String },
  width: { type: Number },
  height: { type: Number },
  length: { type: Number },
  quantity: { type: Number },
  // days field removed - no longer needed
  pricePerMeter: { type: Number },
  selectedAcc: [{ type: String }],
  accessories: [{
    id: { type: String },
    ar: { type: String },
    en: { type: String },
    price: { type: Number },
  }],
  total: { type: Number },
  description: { type: String },
  // حقول خاصة بخيار "أخرى"
  isCustomProduct: { type: Boolean, default: false },
  otherProductName: { type: String },
  otherSubtype: { type: String },
  otherMaterial: { type: String },
  otherColor: { type: String },
  otherPricePerM2: { type: Number },
  otherCustomAccessories: [{
    name: { type: String },
    price: { type: Number }
  }],
}, { _id: false });

const projectSchema = new mongoose.Schema({
  title: { type: String },
  description: { type: String },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  // Status lifecycle
  status: { type: String, default: 'Draft' }, // Draft | Published | InBidding | Awarded | InProgress | Delivered | Completed | Cancelled
  views: { type: Number, default: 0 },
  archived: { type: Boolean, default: false },

  // Optional top-level fields (for convenience/search)
  ptype: { type: String },
  psubtype: { type: String },
  type: { type: String },
  material: { type: String },
  color: { type: String },
  width: { type: Number },
  height: { type: Number },
  length: { type: Number },
  quantity: { type: Number },
  // days field removed - no longer needed
  pricePerMeter: { type: Number },
  total: { type: Number },
  selectedAcc: [{ type: String }],
  accessories: [{
    id: { type: String },
    ar: { type: String },
    en: { type: String },
    price: { type: Number },
  }],
  
  // أنماط القياس والحقول الجديدة
  measurementMode: { 
    type: String, 
    enum: ['area_wh', 'area_wl', 'height_only', 'length_only', 'custom_wh', 'other_3d'],
    default: 'area_wh'
  },
  isCustomProduct: { type: Boolean, default: false },
  customProductDetails: {
    productName: { type: String },
    subtype: { type: String },
    material: { type: String },
    color: { type: String },
    pricePerM2: { type: Number },
    customAccessories: [{
      name: { type: String },
      price: { type: Number }
    }]
  },

  // Items (builder entries)
  items: [projectItemSchema],

  // Execution fields
  acceptedBidId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bid' },
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  agreedPrice: { type: Number },
  acceptedDays: { type: Number },
  startedAt: { type: Date },
  expectedEndAt: { type: Date },
  deliveredAt: { type: Date },
  completedAt: { type: Date },

  // Delivery details
  deliveryNote: { type: String },
  deliveryFiles: [{ type: String }],

  // Payout/commission
  platformCommissionPct: { type: Number, default: 0.1 }, // 10% default, adjustable per business config
  platformCommission: { type: Number },
  merchantEarnings: { type: Number },

  // Rating (stored per project after completion)
  rating: {
    value: { type: Number, min: 1, max: 5 },
    comment: { type: String },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date },
  },
}, { timestamps: true });

export const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);
