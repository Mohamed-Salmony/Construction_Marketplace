import mongoose from 'mongoose';

const projectItemSchema = new mongoose.Schema({
  // IDs/keys
  ptype: { type: String },
  type: { type: String },
  psubtype: { type: String },
  material: { type: String },
  color: { type: String },
  // Localized labels (optional)
  ptypeAr: { type: String },
  ptypeEn: { type: String },
  psubtypeAr: { type: String },
  psubtypeEn: { type: String },
  materialAr: { type: String },
  materialEn: { type: String },
  colorAr: { type: String },
  colorEn: { type: String },
  width: { type: Number },
  height: { type: Number },
  length: { type: Number },
  quantity: { type: Number },
  days: { type: Number },
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
}, { _id: false });

const projectSchema = new mongoose.Schema({
  title: { type: String },
  description: { type: String },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  // Status lifecycle
  status: { type: String, default: 'Draft' }, // Draft | Published | InBidding | Awarded | InProgress | Completed | Cancelled
  views: { type: Number, default: 0 },
  archived: { type: Boolean, default: false },

  assignedMerchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  awardedBidId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bid' },
  executionStartedAt: { type: Date },
  executionDueAt: { type: Date },

  // Optional top-level fields (for convenience/search)
  // IDs/keys
  ptype: { type: String },
  type: { type: String },
  psubtype: { type: String },
  material: { type: String },
  color: { type: String },
  // Localized labels (optional)
  ptypeAr: { type: String },
  ptypeEn: { type: String },
  psubtypeAr: { type: String },
  psubtypeEn: { type: String },
  materialAr: { type: String },
  materialEn: { type: String },
  colorAr: { type: String },
  colorEn: { type: String },
  width: { type: Number },
  height: { type: Number },
  length: { type: Number },
  quantity: { type: Number },
  days: { type: Number },
  pricePerMeter: { type: Number },
  total: { type: Number },
  selectedAcc: [{ type: String }],
  accessories: [{
    id: { type: String },
    ar: { type: String },
    en: { type: String },
    price: { type: Number },
  }],

  // Items (builder entries)
  items: [projectItemSchema],
}, { timestamps: true });

export const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);
