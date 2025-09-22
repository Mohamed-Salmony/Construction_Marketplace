import mongoose from 'mongoose';

const PromoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  
  // Discount details
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true,
    default: 'percentage'
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Usage limits
  maxUses: {
    type: Number,
    default: null, // null means unlimited
    min: 1
  },
  currentUses: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // User restrictions
  maxUsesPerUser: {
    type: Number,
    default: 1,
    min: 1
  },
  
  // Date restrictions
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null // null means no expiry
  },
  
  // Minimum order restrictions
  minOrderAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Creator info
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Usage tracking
  usedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    usedAt: {
      type: Date,
      default: Date.now
    },
    orderAmount: {
      type: Number,
      default: 0
    },
    discountAmount: {
      type: Number,
      default: 0
    }
  }]
}, {
  timestamps: true
});

// Indexes
PromoCodeSchema.index({ code: 1 });
PromoCodeSchema.index({ isActive: 1 });
PromoCodeSchema.index({ startDate: 1, endDate: 1 });

// Virtual for checking if promo is still valid
PromoCodeSchema.virtual('isValid').get(function() {
  const now = new Date();
  
  // Check if active
  if (!this.isActive) return false;
  
  // Check date range
  if (this.startDate && now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;
  
  // Check usage limits
  if (this.maxUses && this.currentUses >= this.maxUses) return false;
  
  return true;
});

// Method to check if user can use this promo
PromoCodeSchema.methods.canUserUse = function(userId) {
  if (!this.isValid) return false;
  
  // Count how many times this user has used this promo
  const userUsages = this.usedBy.filter(usage => 
    usage.userId.toString() === userId.toString()
  ).length;
  
  return userUsages < this.maxUsesPerUser;
};

// Method to apply promo and record usage
PromoCodeSchema.methods.applyPromo = function(userId, orderAmount) {
  if (!this.canUserUse(userId)) {
    throw new Error('User cannot use this promo code');
  }
  
  if (orderAmount < this.minOrderAmount) {
    throw new Error(`Minimum order amount is ${this.minOrderAmount}`);
  }
  
  let discountAmount = 0;
  
  if (this.discountType === 'percentage') {
    discountAmount = Math.round(orderAmount * (this.discountValue / 100));
  } else {
    discountAmount = Math.min(this.discountValue, orderAmount);
  }
  
  // Record usage
  this.usedBy.push({
    userId,
    orderAmount,
    discountAmount
  });
  this.currentUses += 1;
  
  return discountAmount;
};

export const PromoCode = mongoose.model('PromoCode', PromoCodeSchema);
