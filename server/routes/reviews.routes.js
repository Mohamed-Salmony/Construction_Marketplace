import express from 'express';
import { protect } from '../middlewares/auth.js';
import { listByProduct, addReview } from '../controllers/reviews.controller.js';

const router = express.Router();

// GET /api/Reviews/:productId -> list reviews for product
router.get('/:productId', listByProduct);

// POST /api/Reviews/:productId -> add a review (auth required)
router.post('/:productId', protect, addReview);

export default router;
