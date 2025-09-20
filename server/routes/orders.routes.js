import express from 'express';
import { protect, requireRoles } from '../middlewares/auth.js';
import { list, getById, updateStatus, listMy, cancel, confirmDelivered, create } from '../controllers/orders.controller.js';

const router = express.Router();

router.get('/', protect, list);
router.get('/my', protect, listMy);
router.get('/:id', protect, getById);
router.patch('/:id/status', protect, requireRoles('Merchant', 'Admin'), updateStatus);
router.post('/:id/cancel', protect, cancel);
router.post('/:id/confirm-delivered', protect, confirmDelivered);
router.post('/', protect, create);

export default router;
