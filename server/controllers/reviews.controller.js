import mongoose from 'mongoose';
import { Review } from '../models/Review.js';
import { Product } from '../models/Product.js';

export async function listByProduct(req, res) {
  try {
    const { productId } = req.params;
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product id' });
    }
    const items = await Review.find({ productId }).sort({ createdAt: -1 });
    // Optional: tell client if current authenticated user already reviewed
    let hasReviewed = false;
    try { if (req.user?._id) { hasReviewed = !!await Review.findOne({ productId, userId: req.user._id }); } } catch {}
    res.json({ success: true, items, hasReviewed });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
}

export async function addReview(req, res) {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body || {};
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product id' });
    }
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    // Prevent duplicate reviews by the same user
    const exists = await Review.findOne({ productId, userId: req.user._id });
    if (exists) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this product' });
    }
    const r = await Review.create({
      productId,
      userId: req.user._id,
      userName: req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'User',
      rating: Number(rating || 0),
      comment: String(comment || ''),
    });
    // Optionally update product aggregate fields
    try {
      const agg = await Review.aggregate([
        { $match: { productId: new mongoose.Types.ObjectId(productId) } },
        { $group: { _id: '$productId', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]);
      if (agg && agg[0]) {
        await Product.findByIdAndUpdate(productId, {
          averageRating: agg[0].avg,
          reviewCount: agg[0].count,
        });
      }
    } catch {}
    res.status(201).json({ success: true, item: r });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to add review' });
  }
}
