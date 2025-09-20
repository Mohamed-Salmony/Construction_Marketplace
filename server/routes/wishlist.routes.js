import express from 'express';
import { protect } from '../middlewares/auth.js';
import { getWishlist, addToWishlist, removeFromWishlist, toggleWishlist } from '../controllers/wishlist.controller.js';

const router = express.Router();

router.get('/', protect, getWishlist);
// Toggle: add if missing, remove if exists (register BEFORE param routes)
router.post('/toggle', protect, toggleWishlist);
router.post('/toggle/:productId', protect, toggleWishlist);

// Support both URL-parameter and body-based operations
router.post('/', protect, addToWishlist);
router.post('/:productId', protect, addToWishlist);
router.delete('/', protect, removeFromWishlist);
router.delete('/:productId', protect, removeFromWishlist);

export default router;
