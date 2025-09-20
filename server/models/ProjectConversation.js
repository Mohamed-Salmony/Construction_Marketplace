import mongoose from 'mongoose';

const projectConversationSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export const ProjectConversation = mongoose.models.ProjectConversation || mongoose.model('ProjectConversation', projectConversationSchema);
