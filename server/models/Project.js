import mongoose from 'mongoose';

const projectItemSchema = new mongoose.Schema({
  ptype: { type: String },
  type: { type: String },
  material: { type: String },
  width: { type: Number },
  height: { type: Number },
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

  // Optional top-level fields (for convenience/search)
  ptype: { type: String },
  type: { type: String },
  material: { type: String },
  width: { type: Number },
  height: { type: Number },
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
