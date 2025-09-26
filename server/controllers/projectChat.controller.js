import mongoose from 'mongoose';
import { ProjectConversation } from '../models/ProjectConversation.js';
import { ProjectMessage } from '../models/ProjectMessage.js';

export async function createConversation(req, res) {
  const { projectId, merchantId } = req.body || {};
  console.log('[ProjectChat] createConversation called with:', { projectId, merchantId });
  
  if (!mongoose.isValidObjectId(projectId) || !mongoose.isValidObjectId(merchantId)) {
    console.log('[ProjectChat] Invalid IDs provided');
    return res.status(400).json({ success: false, message: 'Invalid projectId or merchantId' });
  }
  
  const customerId = req.user._id;
  console.log('[ProjectChat] Customer ID:', customerId);
  
  let c = await ProjectConversation.findOne({ projectId, merchantId, customerId });
  console.log('[ProjectChat] Existing conversation:', !!c);
  
  if (!c) {
    c = await ProjectConversation.create({ projectId, merchantId, customerId });
    console.log('[ProjectChat] Created new conversation:', c._id);
  }
  
  res.status(201).json({ id: c._id });
}

export async function getConversation(req, res) {
  const { id } = req.params;
  console.log('[ProjectChat] getConversation called with id:', id);
  
  if (!mongoose.isValidObjectId(id)) {
    console.log('[ProjectChat] Invalid ObjectId:', id);
    return res.status(400).json({ success: false, message: 'Invalid id' });
  }
  
  const c = await ProjectConversation.findById(id);
  console.log('[ProjectChat] Conversation found:', !!c);
  
  if (!c) {
    console.log('[ProjectChat] Conversation not found for id:', id);
    return res.status(404).json({ success: false, message: 'Conversation not found' });
  }
  
  // Only participants can view unless admin
  const uid = String(req.user._id);
  const role = String(req.user?.role || '');
  const isAdmin = ['admin','superadmin','owner','root'].includes(role.toLowerCase());
  const participants = [String(c.customerId), String(c.merchantId)];
  const isParticipant = participants.includes(uid);
  
  console.log('[ProjectChat] User ID:', uid);
  console.log('[ProjectChat] Participants:', participants);
  console.log('[ProjectChat] Is participant:', isParticipant);
  
  if (!isParticipant && !isAdmin) {
    console.log('[ProjectChat] User not authorized for conversation');
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  
  // Add user role info to response
  const isCustomer = String(c.customerId) === uid;
  const isMerchant = String(c.merchantId) === uid;
  
  res.json({ id: c._id, projectId: String(c.projectId), customerId: String(c.customerId), merchantId: String(c.merchantId) });
}

export async function getConversationByKeys(req, res) {
  const { projectId, merchantId } = req.query || {};
  console.log('[ProjectChat] getConversationByKeys called with:', { projectId, merchantId });
  
  if (!mongoose.isValidObjectId(projectId) || !mongoose.isValidObjectId(merchantId)) {
    console.log('[ProjectChat] Invalid IDs in getConversationByKeys');
    return res.status(400).json({ success: false, message: 'Invalid projectId or merchantId' });
  }
  
  const userId = req.user?._id;
  const role = String(req.user?.role || '');
  const isAdmin = ['admin','superadmin','owner','root'].includes(role.toLowerCase());
  console.log('[ProjectChat] User ID in getConversationByKeys:', userId);
  
  // Check if user is customer or merchant in this conversation
  // Try both possibilities: user as customer OR user as merchant
  let query;
  if (isAdmin) {
    // Admin can access conversation by projectId and merchantId directly
    query = { projectId, merchantId };
  } else {
    // Participants only
    query = {
      projectId,
      $or: [
        { customerId: userId, merchantId: merchantId },  // User is customer, merchantId is merchant
        { customerId: merchantId, merchantId: userId }    // merchantId is customer, user is merchant
      ]
    };
  }
  
  console.log('[ProjectChat] Query:', JSON.stringify(query, null, 2));
  
  const c = await ProjectConversation.findOne(query);
  console.log('[ProjectChat] Found conversation by keys:', !!c);
  
  if (!c) {
    console.log('[ProjectChat] No conversation found by keys');
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  
  res.json({ id: c._id });
}

export async function getConversationsByProject(req, res) {
  const { projectId } = req.params;
  console.log('[ProjectChat] getConversationsByProject called with:', projectId);
  
  if (!mongoose.isValidObjectId(projectId)) {
    console.log('[ProjectChat] Invalid project ID');
    return res.status(400).json({ success: false, message: 'Invalid projectId' });
  }
  
  const userId = req.user?._id;
  const role = String(req.user?.role || '');
  const isAdmin = ['admin','superadmin','owner','root'].includes(role.toLowerCase());
  console.log('[ProjectChat] User ID for project conversations:', userId);
  
  // Find all conversations for this project where user is participant
  const baseQuery = { projectId };
  const conversations = isAdmin
    ? await ProjectConversation.find(baseQuery)
    : await ProjectConversation.find({
        ...baseQuery,
        $or: [
          { customerId: userId },
          { merchantId: userId }
        ]
      });
  
  console.log('[ProjectChat] Found conversations for project:', conversations.length);
  
  res.json(conversations.map(c => ({
    id: c._id,
    projectId: String(c.projectId),
    customerId: String(c.customerId),
    merchantId: String(c.merchantId),
    createdAt: c.createdAt
  })));
}

export async function listMessages(req, res) {
  const { id } = req.params;
  console.log('[ProjectChat] listMessages called for conversation:', id);
  
  if (!mongoose.isValidObjectId(id)) {
    console.log('[ProjectChat] Invalid conversation ID for listMessages');
    return res.status(400).json({ success: false, message: 'Invalid conversation id' });
  }
  
  try {
    const messages = await ProjectMessage.find({ conversationId: id }).sort({ createdAt: 1 });
    console.log('[ProjectChat] Found messages for conversation:', { 
      conversationId: id, 
      messageCount: messages.length,
      messageIds: messages.map(m => m._id)
    });
    
    const formattedMessages = messages.map(m => ({ 
      id: m._id, 
      from: String(m.fromUserId), 
      text: m.text, 
      createdAt: m.createdAt 
    }));
    
    res.json(formattedMessages);
  } catch (error) {
    console.error('[ProjectChat] Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
}

export async function sendMessage(req, res) {
  const { id } = req.params;
  const { text } = req.body || {};
  
  console.log('[ProjectChat] sendMessage called with:', { conversationId: id, text: text?.substring(0, 50) + '...', userId: req.user._id });
  
  if (!mongoose.isValidObjectId(id)) {
    console.log('[ProjectChat] Invalid conversation ID for sendMessage');
    return res.status(400).json({ success: false, message: 'Invalid conversation id' });
  }
  
  if (!text || !text.trim()) {
    console.log('[ProjectChat] Empty message text');
    return res.status(400).json({ success: false, message: 'Message text is required' });
  }
  
  try {
    const msg = await ProjectMessage.create({ 
      conversationId: id, 
      fromUserId: req.user._id, 
      text: text.trim() 
    });

    console.log('[ProjectChat] Message created successfully:', { 
      messageId: msg._id, 
      conversationId: id, 
      from: req.user._id,
      textLength: text.trim().length 
    });

    res.status(201).json({ id: msg._id });
  } catch (error) {
    console.error('[ProjectChat] Error creating message:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
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
