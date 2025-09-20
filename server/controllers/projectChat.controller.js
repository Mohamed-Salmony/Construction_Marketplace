import mongoose from 'mongoose';
import { ProjectConversation } from '../models/ProjectConversation.js';
import { ProjectMessage } from '../models/ProjectMessage.js';

export async function createConversation(req, res) {
  const { projectId, merchantId } = req.body || {};
  if (!mongoose.isValidObjectId(projectId) || !mongoose.isValidObjectId(merchantId)) {
    return res.status(400).json({ success: false, message: 'Invalid projectId or merchantId' });
  }
  const customerId = req.user._id;
  let c = await ProjectConversation.findOne({ projectId, merchantId, customerId });
  if (!c) c = await ProjectConversation.create({ projectId, merchantId, customerId });
  res.status(201).json({ id: c._id });
}

export async function getConversation(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
  const c = await ProjectConversation.findById(id);
  if (!c) return res.status(404).json({ success: false, message: 'Conversation not found' });
  // Only participants can view
  const uid = String(req.user._id);
  const isParticipant = [String(c.customerId), String(c.merchantId)].includes(uid);
  if (!isParticipant) return res.status(403).json({ success: false, message: 'Forbidden' });
  res.json({ id: c._id, projectId: String(c.projectId), customerId: String(c.customerId), merchantId: String(c.merchantId) });
}

export async function getConversationByKeys(req, res) {
  const { projectId, merchantId } = req.query || {};
  if (!mongoose.isValidObjectId(projectId) || !mongoose.isValidObjectId(merchantId)) {
    return res.status(400).json({ success: false, message: 'Invalid projectId or merchantId' });
  }
  // Include customerId so we fetch the correct conversation between this customer and merchant for the project
  const customerId = req.user?._id;
  const query = customerId ? { projectId, merchantId, customerId } : { projectId, merchantId };
  const c = await ProjectConversation.findOne(query);
  if (!c) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ id: c._id });
}

export async function listMessages(req, res) {

  const messages = await ProjectMessage.find({ conversationId: req.params.conversationId }).sort({ createdAt: 1 });

  res.json(messages.map(m => ({ id: m._id, from: String(m.fromUserId), text: m.text, createdAt: m.createdAt })));
}

export async function sendMessage(req, res) {
  const { text } = req.body || {};
  const msg = await ProjectMessage.create({ conversationId: req.params.conversationId, fromUserId: req.user._id, text });

  res.status(201).json({ id: msg._id });
}

export async function vendorMessageCount(req, res) {
  // Basic count of last messages addressed to vendor
  const count = await ProjectMessage.countDocuments({});
  res.json({ count });
}

export async function vendorRecentMessages(req, res) {
  const msgs = await ProjectMessage.find({}).sort({ createdAt: -1 }).limit(10);
  res.json(msgs.map(m => ({ conversationId: String(m.conversationId), projectId: null, message: m.text, at: m.createdAt, from: String(m.fromUserId || '') })));
}

export async function customerMessageCount(req, res) {
  const count = await ProjectMessage.countDocuments({ fromUserId: req.user._id });
  res.json({ count });
}

export async function customerRecentMessages(req, res) {
  const msgs = await ProjectMessage.find({ fromUserId: req.user._id }).sort({ createdAt: -1 }).limit(10);
  res.json(msgs.map(m => ({ conversationId: String(m.conversationId), projectId: null, message: m.text, at: m.createdAt, from: String(m.fromUserId || '') })));
}
