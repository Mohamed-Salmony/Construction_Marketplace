import express from 'express';
import { body, validationResult } from 'express-validator';
import { PromoCode } from '../models/PromoCode.js';
import { protect, requireRoles } from '../middlewares/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

// Validation middleware
const validatePromoCode = [
  body('code')
    .isLength({ min: 3, max: 20 })
    .withMessage('Code must be 3-20 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Code must contain only uppercase letters and numbers'),
  body('discountType')
    .isIn(['percentage', 'fixed'])
    .withMessage('Discount type must be percentage or fixed'),
  body('discountValue')
    .isFloat({ min: 0.01 })
    .withMessage('Discount value must be greater than 0'),
  body('maxUses')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max uses must be a positive integer'),
  body('maxUsesPerUser')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max uses per user must be a positive integer'),
  body('minOrderAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum order amount must be 0 or greater'),
];

// Create promo code (Admin only)
router.post('/', protect, requireRoles('Admin'), validatePromoCode, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const {
      code,
      discountType,
      discountValue,
      maxUses,
      maxUsesPerUser,
      minOrderAmount,
      startDate,
      endDate
    } = req.body;

    // Check if code already exists
    const existingPromo = await PromoCode.findOne({ code: code.toUpperCase() });
    if (existingPromo) {
      return res.status(400).json({
        success: false,
        message: 'Promo code already exists'
      });
    }

    const promoCode = new PromoCode({
      code: code.toUpperCase(),
      discountType,
      discountValue,
      maxUses: maxUses || null,
      maxUsesPerUser: maxUsesPerUser || 1,
      minOrderAmount: minOrderAmount || 0,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      createdBy: req.user._id
    });

    await promoCode.save();

    res.status(201).json({
      success: true,
      message: 'Promo code created successfully',
      data: promoCode
    });

  } catch (error) {
    console.error('Create promo code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create promo code'
    });
  }
});

// Get all promo codes (Admin only)
router.get('/', protect, requireRoles('Admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    
    const filter = {};
    
    // Filter by status
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    
    // Search by code
    if (search) {
      filter.code = { $regex: search, $options: 'i' };
    }

    const promoCodes = await PromoCode.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await PromoCode.countDocuments(filter);

    // Add statistics
    const stats = {
      total: await PromoCode.countDocuments(),
      active: await PromoCode.countDocuments({ isActive: true }),
      expired: await PromoCode.countDocuments({ 
        endDate: { $lt: new Date() }, 
        isActive: true 
      }),
      totalUsages: await PromoCode.aggregate([
        { $group: { _id: null, totalUses: { $sum: '$currentUses' } } }
      ]).then(result => result[0]?.totalUses || 0)
    };

    res.json({
      success: true,
      data: promoCodes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      stats
    });

  } catch (error) {
    console.error('Get promo codes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch promo codes'
    });
  }
});

// Validate promo code (for customers)
router.post('/validate', protect, async (req, res) => {
  try {
    const { code, orderAmount } = req.body;

    if (!code || !orderAmount) {
      return res.status(400).json({
        success: false,
        message: 'Code and order amount are required'
      });
    }

    const promoCode = await PromoCode.findOne({ 
      code: code.toUpperCase(),
      isActive: true 
    });

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'Invalid promo code'
      });
    }

    // Check if promo is valid
    if (!promoCode.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Promo code has expired or reached usage limit'
      });
    }

    // Check if user can use this promo
    if (!promoCode.canUserUse(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You have reached the usage limit for this promo code'
      });
    }

    // Check minimum order amount
    if (orderAmount < promoCode.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount is ${promoCode.minOrderAmount}`
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (promoCode.discountType === 'percentage') {
      discountAmount = Math.round(orderAmount * (promoCode.discountValue / 100));
    } else {
      discountAmount = Math.min(promoCode.discountValue, orderAmount);
    }

    res.json({
      success: true,
      message: 'Promo code is valid',
      data: {
        code: promoCode.code,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        discountAmount,
        finalAmount: orderAmount - discountAmount
      }
    });

  } catch (error) {
    console.error('Validate promo code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate promo code'
    });
  }
});

// Apply promo code (when placing order)
router.post('/apply/:id', protect, async (req, res) => {
  try {
    const { orderAmount } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid promo code ID'
      });
    }

    const promoCode = await PromoCode.findById(req.params.id);

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found'
      });
    }

    const discountAmount = promoCode.applyPromo(req.user._id, orderAmount);
    await promoCode.save();

    res.json({
      success: true,
      message: 'Promo code applied successfully',
      data: {
        discountAmount,
        finalAmount: orderAmount - discountAmount
      }
    });

  } catch (error) {
    console.error('Apply promo code error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to apply promo code'
    });
  }
});

// Update promo code (Admin only)
router.put('/:id', protect, requireRoles('Admin'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid promo code ID'
      });
    }

    const updates = { ...req.body };
    delete updates.currentUses; // Prevent manual manipulation
    delete updates.usedBy; // Prevent manual manipulation

    if (updates.code) {
      updates.code = updates.code.toUpperCase();
    }

    const promoCode = await PromoCode.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found'
      });
    }

    res.json({
      success: true,
      message: 'Promo code updated successfully',
      data: promoCode
    });

  } catch (error) {
    console.error('Update promo code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update promo code'
    });
  }
});

// Delete promo code (Admin only)
router.delete('/:id', protect, requireRoles('Admin'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid promo code ID'
      });
    }

    const promoCode = await PromoCode.findByIdAndDelete(req.params.id);

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found'
      });
    }

    res.json({
      success: true,
      message: 'Promo code deleted successfully'
    });

  } catch (error) {
    console.error('Delete promo code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete promo code'
    });
  }
});

export default router;
