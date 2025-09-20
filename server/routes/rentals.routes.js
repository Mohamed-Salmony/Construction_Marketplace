import express from 'express';
import { protect, requireRoles } from '../middlewares/auth.js';
import { listMine, listPublic, listAll, getById, create, update, remove, adjustDays, sendMessage, listMessages, replyMessage, vendorMessageCount, vendorRecentMessages, customerMessageCount, customerRecentMessages, myRecentMessages, myRecentTechMessages, myVendorRecentTechMessages, validateCreateRental, validateUpdateRental, validateAdjustDays, validateRentalMessage, validateRentalReply, adminApprove, adminDecline, adminRemove, sendTechMessage, listTechMessages, replyTechMessage } from '../controllers/rentals.controller.js';

const router = express.Router();

router.get('/mine', protect, listMine);
router.get('/public', listPublic);
router.get('/message-count', protect, vendorMessageCount);
router.get('/messages/recent', protect, vendorRecentMessages);
router.get('/customer/message-count', protect, customerMessageCount);
router.get('/customer/messages/recent', protect, customerRecentMessages);
router.get('/my/messages/recent', protect, myRecentMessages);
router.get('/my/messages/tech/recent', protect, myRecentTechMessages);
router.get('/my/messages/tech/recent/vendor', protect, (req, res, next) => {
  console.log('[Route] GET /my/messages/tech/recent/vendor called by user:', req.user?._id, 'role:', req.user?.role);
  next();
}, requireRoles('Merchant','Vendor','merchant','vendor'), myVendorRecentTechMessages);

// Admin pending must be before dynamic :id
router.get('/pending', protect, requireRoles('Admin'), listPublic);
router.get('/all', protect, requireRoles('Admin'), listAll);
router.post('/:id/approve', protect, requireRoles('Admin'), adminApprove);
router.post('/:id/decline', protect, requireRoles('Admin'), adminDecline);
router.delete('/:id/remove', protect, requireRoles('Admin'), adminRemove);

router.get('/:id', getById);
router.post('/', protect, validateCreateRental, create);
router.put('/:id', protect, validateUpdateRental, update);
router.delete('/:id', protect, remove);
router.post('/:id/adjust-days', protect, validateAdjustDays, adjustDays);
router.post('/:id/message', protect, validateRentalMessage, sendMessage);
router.get('/:id/messages', protect, listMessages);
router.post('/:id/reply', protect, validateRentalReply, replyMessage);

// Technician channel routes (vendor ↔ technician)
router.post('/:id/tech/message', protect, validateRentalMessage, sendTechMessage);
router.get('/:id/tech/messages', protect, listTechMessages);
router.post('/:id/tech/reply', protect, validateRentalReply, replyTechMessage);

export default router;
