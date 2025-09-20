import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  title: { type: String },
  description: { type: String },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  status: { type: String, default: 'Draft' }, // Draft | Published | InBidding | Awarded | InProgress | Completed | Cancelled
  views: { type: Number, default: 0 },
  archived: { type: Boolean, default: false },
}, { timestamps: true });

export const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);
