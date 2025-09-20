import mongoose from 'mongoose';

// Stores messages for service conversations (vendor ↔ technician)
const messageServiceSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatConversation', required: true },
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: { type: String, required: true },
}, { timestamps: true });

export const MessageService = mongoose.models.MessageService || mongoose.model('MessageService', messageServiceSchema);
