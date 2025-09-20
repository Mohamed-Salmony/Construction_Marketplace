import express from 'express';
import { protect } from '../middlewares/auth.js';
import { createConversation, getConversation, getConversationByKeys, listMessages, sendMessage, vendorMessageCount, vendorRecentMessages, customerMessageCount, customerRecentMessages } from '../controllers/projectChat.controller.js';

const router = express.Router();

router.post('/conversations', protect, createConversation);
router.get('/conversations/:id', protect, getConversation);
router.get('/by', protect, getConversationByKeys);
router.get('/conversations/:id/messages', protect, listMessages);
router.post('/conversations/:id/messages', protect, sendMessage);
router.get('/message-count', protect, vendorMessageCount);
router.get('/messages/recent', protect, vendorRecentMessages);
router.get('/customer/message-count', protect, customerMessageCount);
router.get('/customer/messages/recent', protect, customerRecentMessages);

export default router;
