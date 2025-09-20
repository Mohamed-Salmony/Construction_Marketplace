import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  // Store productId as String to support external numeric IDs or Mongo ObjectIds as strings
  items: {
    type: [{
      productId: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }],
    default: []
  },
}, { timestamps: true });

export const Wishlist = mongoose.models.Wishlist || mongoose.model('Wishlist', wishlistSchema);
