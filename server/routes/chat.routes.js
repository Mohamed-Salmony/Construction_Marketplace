import express from 'express';
import { protect } from '../middlewares/auth.js';
import { createConversation, getConversation, getConversationByKeys, listMessages, sendMessage, listMine, getByService } from '../controllers/chat.controller.js';

const router = express.Router();

router.post('/conversations', protect, createConversation);
router.get('/conversations/:id', protect, getConversation);
router.get('/conversations/by', protect, getConversationByKeys);
router.get('/conversations/:id/messages', protect, listMessages);
router.post('/conversations/:id/messages', protect, sendMessage);
router.get('/mine', protect, listMine);
router.get('/by-service/:serviceRequestId', protect, getByService);

export default router;
