import mongoose from 'mongoose';

// Stores messages for project conversations (customer ↔ vendor)
const projectMessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectConversation', required: true },
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: { type: String, required: true },
}, { timestamps: true });

export const ProjectMessage = mongoose.models.ProjectMessage || mongoose.model('ProjectMessage', projectMessageSchema);
