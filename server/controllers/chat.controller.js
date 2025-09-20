import { ChatConversation } from '../models/ChatConversation.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { MessageService } from '../models/MessageService.js';
import { Service } from '../models/Service.js';
import { Notification } from '../models/Notification.js';

export async function createConversation(req, res) {
  const { serviceRequestId } = req.body || {};
  let { technicianId } = req.body || {};
  if (!serviceRequestId) return res.status(400).json({ success: false, message: 'serviceRequestId is required' });

  // Determine initiator role and resolve vendor/technician IDs accordingly
  const role = String(req.user?.role || '');
  let vendorId = null;

  if (/merchant/i.test(role)) {
    // Vendor starts: must supply technicianId
    vendorId = req.user._id;
    if (!technicianId) return res.status(400).json({ success: false, message: 'technicianId is required when vendor starts the conversation' });
  } else if (/technician|worker/i.test(role)) {
    // Technician starts: resolve vendorId from the service
    technicianId = req.user._id;
    const svc = await Service.findById(String(serviceRequestId)).lean();
    if (!svc) return res.status(404).json({ success: false, message: 'Service not found' });
    vendorId = svc.vendorId;
    if (!vendorId) return res.status(400).json({ success: false, message: 'Service has no vendor owner' });
  } else if (/admin/i.test(role)) {
    // Admin can create on behalf of either side; require both IDs
    if (!technicianId) return res.status(400).json({ success: false, message: 'technicianId is required' });
    const svc = await Service.findById(String(serviceRequestId)).lean();
    if (!svc) return res.status(404).json({ success: false, message: 'Service not found' });
    vendorId = svc.vendorId;
  } else {
    return res.status(403).json({ success: false, message: 'Not allowed to start conversations' });
  }

  // Find or create
  let c = await ChatConversation.findOne({ serviceRequestId: String(serviceRequestId), vendorId, technicianId });
  if (!c) c = await ChatConversation.create({ serviceRequestId: String(serviceRequestId), vendorId, technicianId });
  res.status(201).json({ id: c._id });
}

export async function getConversation(req, res) {
  const c = await ChatConversation.findById(req.params.id);
  if (!c) return res.status(404).json({ success: false, message: 'Conversation not found' });
  res.json({ id: c._id, serviceRequestId: c.serviceRequestId, vendorId: String(c.vendorId), technicianId: String(c.technicianId) });
}

export async function getConversationByKeys(req, res) {
  try {
    const { serviceRequestId, technicianId } = req.query || {};
    if (!serviceRequestId || !technicianId) return res.status(400).json({ success: false, message: 'serviceRequestId and technicianId are required' });
    const role = String(req.user?.role || '');
    const baseQuery = { serviceRequestId: String(serviceRequestId), technicianId };
    // If vendor is querying, also bind by vendorId to ensure ownership
    const query = /merchant/i.test(role) ? { ...baseQuery, vendorId: req.user._id } : baseQuery;
    const c = await ChatConversation.findOne(query);
    if (!c) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ id: c._id });
  } catch (e) {
    res.status(400).json({ success: false, message: 'Failed to resolve conversation', error: String(e?.message || e) });
  }
}

export async function listMessages(req, res) {
  const messages = await MessageService.find({ conversationId: req.params.id }).sort({ createdAt: 1 });
  res.json(messages.map(m => ({ id: m._id, from: String(m.fromUserId), text: m.text, createdAt: m.createdAt })));
}

export async function sendMessage(req, res) {
  const { text } = req.body || {};
  const conv = await ChatConversation.findById(req.params.id);
  if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
  // Allow either side to send first message now
  const msg = await MessageService.create({ conversationId: req.params.id, fromUserId: req.user._id, text });
  try { await ChatConversation.updateOne({ _id: conv._id }, { $set: { updatedAt: new Date() } }); } catch {}
  // Create a notification for the other participant
  try {
    const from = String(req.user?._id || '');
    const isFromVendor = String(conv.vendorId) === from;
    const recipientId = isFromVendor ? String(conv.technicianId) : String(conv.vendorId);
    const recipientRole = isFromVendor ? 'technician' : 'vendor';
    await Notification.create({
      userId: recipientId,
      role: recipientRole,
      type: 'chat.message',
      title: 'New chat message',
      message: String(text || ''),
      data: { conversationId: String(conv._id), serviceRequestId: String(conv.serviceRequestId) },
    });
  } catch {}
  res.status(201).json({ id: msg._id });
}

export async function listMine(req, res) {
  const convs = await ChatConversation.find({ $or: [{ vendorId: req.user._id }, { technicianId: req.user._id }] }).sort({ updatedAt: -1 });
  res.json(convs.map(c => ({ id: c._id, serviceRequestId: c.serviceRequestId, vendorId: String(c.vendorId), technicianId: String(c.technicianId), createdAt: c.createdAt })));
}

export async function getByService(req, res) {
  try {
    const serviceRequestId = String(req.params.serviceRequestId || '');
    if (!serviceRequestId) return res.status(400).json({ success: false, message: 'serviceRequestId required' });
    // Try to find an existing conversation bound to the current user (vendor or technician)
    const role = String(req.user?.role || '');
    let c = null;
    if (/merchant/i.test(role)) {
      c = await ChatConversation.findOne({ serviceRequestId, vendorId: req.user._id });
      if (!c) return res.status(404).json({ success: false, message: 'Conversation not found for this vendor' });
      return res.json({ id: c._id, serviceRequestId: c.serviceRequestId });
    }
    if (/technician|worker/i.test(role)) {
      c = await ChatConversation.findOne({ serviceRequestId, technicianId: req.user._id });
      if (c) return res.json({ id: c._id, serviceRequestId: c.serviceRequestId });
      // Auto-create for technician: resolve vendor from service
      const svc = await Service.findById(serviceRequestId).lean();
      if (!svc) return res.status(404).json({ success: false, message: 'Service not found' });
      const created = await ChatConversation.create({ serviceRequestId, vendorId: svc.vendorId, technicianId: req.user._id });
      return res.json({ id: created._id, serviceRequestId: created.serviceRequestId });
    }
    // For other roles, just return not found if generic lookup fails
    c = await ChatConversation.findOne({ serviceRequestId });
    if (!c) return res.status(404).json({ success: false, message: 'Conversation not found' });
    return res.json({ id: c._id, serviceRequestId: c.serviceRequestId });
  } catch (e) {
    return res.status(400).json({ success: false, message: 'Failed to get conversation by service', error: String(e?.message || e) });
  }
}
