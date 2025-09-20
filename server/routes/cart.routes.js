import express from 'express';
import { protect } from '../middlewares/auth.js';
import { getCart, addItem, updateItemQuantity, removeItem, clearCart } from '../controllers/cart.controller.js';

const router = express.Router();

router.get('/', protect, getCart);
router.post('/items', protect, addItem);
router.patch('/items/:id', protect, updateItemQuantity);
router.delete('/items/:id', protect, removeItem);
router.delete('/', protect, clearCart);

export default router;
