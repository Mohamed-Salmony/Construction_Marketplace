import mongoose from 'mongoose';
import { Rental } from '../models/Rental.js';
import { Product } from '../models/Product.js';
import { RentalMessage } from '../models/RentalMessage.js';
import { RentalMessageTechnician } from '../models/RentalMessageTechnician.js';
import { Notification } from '../models/Notification.js';
import { body, validationResult } from 'express-validator';

export async function listMine(req, res) {
  try {
    const items = await Rental.find({ customerId: req.user._id }).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    console.error('[listMine] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch rentals', error: error.message });
  }
}

// Vendor-specific: recent technician-channel messages for rentals that belong to this vendor (by product.merchantId)
export async function myVendorRecentTechMessages(req, res) {
  try {
    console.log('[myVendorRecentTechMessages] Called by user:', req.user._id, 'role:', req.user.role);

    // Find products owned by vendor
    const products = await Product.find({ merchantId: req.user._id }).select('_id').lean();
    const productIdStrings = products.map(p => String(p._id));
    const productIds = productIdStrings.map(id => new mongoose.Types.ObjectId(id));
    console.log('[myVendorRecentTechMessages] products=', products.length, 'productIds.len=', productIds.length);
    if (productIds.length === 0) {
      console.log('[myVendorRecentTechMessages] No products found for vendor; falling back to authored tech messages only (if any)');
    }

    // Primary path: rentals that reference those products (ObjectId match)
    let rentals = await Rental.find({ productId: { $in: productIds } }).select('_id productId').lean();
    console.log('[myVendorRecentTechMessages] rentals(primary)=', rentals.length);

    // Secondary path: if primary returned none (or very few), derive from messages then filter by rental.productId in vendor's products
    if (!rentals || rentals.length === 0) {
      console.log('[myVendorRecentTechMessages] Primary path returned 0, trying secondary path');
      const m = await RentalMessageTechnician.aggregate([
        { $sort: { createdAt: -1 } },
        { $group: { _id: "$rentalId", at: { $first: "$createdAt" } } },
        { $limit: 200 }
      ]);
      const candIds = m.map(x => new mongoose.Types.ObjectId(String(x._id)));
      rentals = await Rental.find({ _id: { $in: candIds }, productId: { $in: productIds } }).select('_id productId').lean();
      console.log('[myVendorRecentTechMessages] rentals(secondary)=', rentals.length);
      if (!rentals || rentals.length === 0) {
        console.log('[myVendorRecentTechMessages] Secondary path also returned 0');
      }
    }

    const vendorOwnedIds = rentals.map(r => new mongoose.Types.ObjectId(String(r._id)));
    // Also include rentals where this vendor authored any tech message (participated)
    let authoredIdsRaw = [];
    try {
      authoredIdsRaw = await RentalMessageTechnician.distinct('rentalId', { fromUserId: req.user._id });
    } catch {}
    const authoredIds = authoredIdsRaw.map(id => new mongoose.Types.ObjectId(String(id)));
    const candidateIds = Array.from(new Set([ ...vendorOwnedIds, ...authoredIds ].map(x => String(x)))).map(id => new mongoose.Types.ObjectId(id));
    console.log('[myVendorRecentTechMessages] vendorOwnedIds.len=', vendorOwnedIds.length, 'authoredIds.len=', authoredIds.length, 'candidateIds.len=', candidateIds.length);

    if (candidateIds.length === 0) {
      res.set('Cache-Control','no-store');
      return res.json([]);
    }

    // Aggregate latest tech-channel message per candidate rentalId
    const msgs = await RentalMessageTechnician.aggregate([
      { $match: { rentalId: { $in: candidateIds } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$rentalId", latest: { $first: "$message" }, at: { $first: "$createdAt" }, from: { $first: "$fromUserId" } } },
      { $sort: { at: -1 } },
      { $limit: 20 }
    ]);
    console.log('[myVendorRecentTechMessages] msgs found=', msgs.length);
    res.set('Cache-Control','no-store');
    return res.json(msgs.map(m => ({ conversationId: String(m._id), projectId: null, message: m.latest, at: m.at, from: String(m.from || '') })));
  } catch (e) {
    console.error('[myVendorRecentTechMessages] failed', e);
    return res.json([]);
  }
}

export const validateCreateRental = [
  body('productId').optional().isString(),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  body('dailyRate').isNumeric(),
];

export const validateUpdateRental = [
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  body('dailyRate').optional().isNumeric(),
];

export const validateAdjustDays = [
  body('days').isInt({ min: 1 }),
];

export const validateRentalMessage = [
  body('message').isString().notEmpty(),
  body('name').optional().isString(),
  body('phone').optional().isString(),
];

export const validateRentalReply = [
  body('message').isString().notEmpty(),
  body('toEmail').optional().isEmail(),
];

export async function listPublic(req, res) {
  try {
    const items = await Rental.find({ status: { $in: ['pending', 'approved'] } }).sort({ createdAt: -1 }).limit(200);
    res.json(items);
  } catch (error) {
    console.error('[listPublic] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch public rentals', error: error.message });
  }
}

// Admin: list all rentals (any status)
export async function listAll(req, res) {
  try {
    const items = await Rental.find({}).sort({ createdAt: -1 }).limit(500);
    res.json(items);
  } catch (error) {
    console.error('[listAll] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch all rentals', error: error.message });
  }
}

export async function getById(req, res) {
  try {
    const r = await Rental.findById(req.params.id);
    if (!r) {
      return res.status(404).json({ success: false, message: 'Rental not found' });
    }
    res.json(r);
  } catch (error) {
    console.error('[getById] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch rental', error: error.message });
  }
}

export async function create(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('[create] Validation errors:', errors.array());
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const body = req.body || {};
    console.log('[create] Creating rental with data:', { ...body, customerId: req.user._id });
    
    // Validate required fields
    if (!body.startDate || !body.endDate) {
      return res.status(400).json({ success: false, message: 'Start date and end date are required' });
    }
    
    if (!body.dailyRate || Number(body.dailyRate) <= 0) {
      return res.status(400).json({ success: false, message: 'Daily rate must be greater than 0' });
    }
    
    const start = new Date(body.startDate);
    const end = new Date(body.endDate);
    
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format' });
    }
    
    if (end <= start) {
      return res.status(400).json({ success: false, message: 'End date must be after start date' });
    }
    
    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const total = days * Number(body.dailyRate || 0);
    
    const rentalData = {
      productId: body.productId || undefined,
      productName: body.productName || undefined,
      customerId: req.user._id,
      startDate: start,
      endDate: end,
      rentalDays: days,
      dailyRate: Number(body.dailyRate),
      totalAmount: total,
      status: 'pending',
      currency: body.currency || 'SAR',
      imageUrl: body.imageUrl || undefined,
      // Add optional fields
      securityDeposit: body.securityDeposit ? Number(body.securityDeposit) : 0,
      deliveryAddress: body.deliveryAddress || undefined,
      requiresDelivery: !!body.requiresDelivery,
      deliveryFee: body.deliveryFee ? Number(body.deliveryFee) : 0,
      requiresPickup: !!body.requiresPickup,
      pickupFee: body.pickupFee ? Number(body.pickupFee) : 0,
      specialInstructions: body.specialInstructions || undefined,
      usageNotes: body.usageNotes || undefined,
    };
    
    const r = await Rental.create(rentalData);
    console.log('[create] Rental created successfully:', r._id);
    res.status(201).json({ success: true, id: r._id });
  } catch (error) {
    console.error('[create] Error creating rental:', error);
    res.status(500).json({ success: false, message: 'Failed to create rental', error: error.message });
  }
}

export async function update(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const body = req.body || {};
    console.log('[update] Updating rental:', req.params.id, 'with data:', body);
    
    // Recalculate days and total if dates and rate provided
    if (body.startDate && body.endDate && body.dailyRate) {
      const start = new Date(body.startDate);
      const end = new Date(body.endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid date format' });
      }
      
      if (end <= start) {
        return res.status(400).json({ success: false, message: 'End date must be after start date' });
      }
      
      const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
      body.rentalDays = days;
      body.totalAmount = days * Number(body.dailyRate || 0);
    }
    
    const r = await Rental.findOneAndUpdate(
      { _id: req.params.id, customerId: req.user._id },
      {
        ...(body.startDate ? { startDate: new Date(body.startDate) } : {}),
        ...(body.endDate ? { endDate: new Date(body.endDate) } : {}),
        ...(typeof body.dailyRate !== 'undefined' ? { dailyRate: Number(body.dailyRate) } : {}),
        ...(typeof body.securityDeposit !== 'undefined' ? { securityDeposit: Number(body.securityDeposit) } : {}),
        ...(body.currency ? { currency: body.currency } : {}),
        ...(body.productId ? { productId: body.productId } : { productId: undefined }),
        ...(body.productName ? { productName: body.productName } : {}),
        ...(body.specialInstructions !== undefined ? { specialInstructions: body.specialInstructions } : {}),
        ...(body.usageNotes !== undefined ? { usageNotes: body.usageNotes } : {}),
        ...(typeof body.requiresDelivery !== 'undefined' ? { requiresDelivery: !!body.requiresDelivery } : {}),
        ...(typeof body.deliveryFee !== 'undefined' ? { deliveryFee: Number(body.deliveryFee) } : {}),
        ...(typeof body.requiresPickup !== 'undefined' ? { requiresPickup: !!body.requiresPickup } : {}),
        ...(typeof body.pickupFee !== 'undefined' ? { pickupFee: Number(body.pickupFee) } : {}),
        ...(body.imageUrl ? { imageUrl: body.imageUrl } : {}),
        ...(typeof body.rentalDays !== 'undefined' ? { rentalDays: Number(body.rentalDays) } : {}),
        ...(typeof body.totalAmount !== 'undefined' ? { totalAmount: Number(body.totalAmount) } : {}),
      },
      { new: true }
    );
    
    if (!r) {
      return res.status(404).json({ success: false, message: 'Rental not found or not authorized' });
    }
    
    console.log('[update] Rental updated successfully:', r._id);
    res.json({ success: true, data: r });
  } catch (error) {
    console.error('[update] Error updating rental:', error);
    res.status(500).json({ success: false, message: 'Failed to update rental', error: error.message });
  }
}

export async function remove(req, res) {
  try {
    const r = await Rental.findOneAndDelete({ _id: req.params.id, customerId: req.user._id });
    if (!r) {
      return res.status(404).json({ success: false, message: 'Rental not found or not authorized' });
    }
    console.log('[remove] Rental deleted successfully:', req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('[remove] Error deleting rental:', error);
    res.status(500).json({ success: false, message: 'Failed to delete rental', error: error.message });
  }
}

// Admin moderation endpoints
export async function adminApprove(req, res) {
  const r = await Rental.findByIdAndUpdate(
    req.params.id,
    { status: 'approved' },
    { new: true }
  );
  if (!r) return res.status(404).json({ success: false, message: 'Rental not found' });
  return res.json({ success: true });
}

export async function adminDecline(req, res) {
  const r = await Rental.findByIdAndUpdate(
    req.params.id,
    { status: 'declined' },
    { new: true }
  );
  if (!r) return res.status(404).json({ success: false, message: 'Rental not found' });
  return res.json({ success: true });
}

export async function adminRemove(req, res) {
  const r = await Rental.findByIdAndDelete(req.params.id);
  if (!r) return res.status(404).json({ success: false, message: 'Rental not found' });
  res.json({ success: true });
}

export async function adjustDays(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const { days } = req.body || {};
  const r = await Rental.findOne({ _id: req.params.id, customerId: req.user._id });
  if (!r) return res.status(404).json({ success: false, message: 'Rental not found' });
  r.rentalDays = Math.max(1, Number(days || 1));
  r.totalAmount = r.rentalDays * Number(r.dailyRate || 0);
  await r.save();
  res.json({ success: true });
}

// Messages
export async function sendMessage(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const rentalId = req.params.id;
  const { name, phone, message } = req.body || {};
  // Route by role: technicians/workers/vendors -> tech channel, customers -> user channel
  const role = String(req.user?.role || '');
  if (/technician|worker|merchant|vendor/i.test(role)) {
    try {
      const rid = new mongoose.Types.ObjectId(String(rentalId));
      const doc = await RentalMessageTechnician.create({ rentalId: rid, name, phone, message, fromUserId: req.user?._id });
      return res.json({ success: true, id: doc._id, channel: 'tech' });
    } catch (e) {
      try { console.error('[sendMessage->tech] failed', e); } catch {}
      return res.status(400).json({ success: false, message: 'Failed to save tech message' });
    }
  }
  await RentalMessage.create({ rentalId, name, phone, message, fromUserId: req.user?._id });
  try {
    const r = await Rental.findById(rentalId).select('customerId').lean();
    if (r && String(req.user?._id) !== String(r.customerId)) {
      // Sender is not the customer -> notify the customer
      await Notification.create({
        userId: r.customerId,
        type: 'chat.message',
        title: 'Rental chat',
        message: String(message || ''),
        data: { conversationId: rentalId, kind: 'rental' },
      });
    }
  } catch {}
  res.json({ success: true });
}

export async function listMessages(req, res) {
  const messages = await RentalMessage.find({ rentalId: req.params.id }).sort({ createdAt: -1 }).limit(200);
  res.json(messages.map(m => ({ id: m._id, message: m.message, at: m.createdAt, from: m.fromUserId })));
}

export async function replyMessage(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const { message, toEmail } = req.body || {};
  // Route by role
  const role = String(req.user?.role || '');
  if (/technician|worker|merchant|vendor/i.test(role)) {
    try {
      const rid = new mongoose.Types.ObjectId(String(req.params.id));
      const doc = await RentalMessageTechnician.create({ rentalId: rid, message, toEmail, fromUserId: req.user?._id });
      return res.json({ success: true, id: doc._id, channel: 'tech' });
    } catch (e) {
      try { console.error('[replyMessage->tech] failed', e); } catch {}
      return res.status(400).json({ success: false, message: 'Failed to save tech reply' });
    }
  }
  await RentalMessage.create({ rentalId: req.params.id, message, toEmail, fromUserId: req.user?._id });
  try {
    const r = await Rental.findById(req.params.id).select('customerId').lean();
    if (r && String(req.user?._id) !== String(r.customerId)) {
      await Notification.create({
        userId: r.customerId,
        type: 'chat.message',
        title: 'Rental chat',
        message: String(message || ''),
        data: { conversationId: req.params.id, kind: 'rental' },
      });
    }
  } catch {}
  res.json({ success: true });
}

// Notifications (basic counts)
export async function vendorMessageCount(req, res) {
  const count = await RentalMessage.countDocuments({});
  res.json({ count });
}

export async function vendorRecentMessages(req, res) {
  // Note: Rentals schema does not include vendorId; we return latest per rental globally
  const msgs = await RentalMessage.aggregate([
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$rentalId", latest: { $first: "$message" }, at: { $first: "$createdAt" }, from: { $first: "$fromUserId" } } },
    { $sort: { at: -1 } },
    { $limit: 20 }
  ]);
  res.set('Cache-Control','no-store');
  res.json(msgs.map(m => ({ conversationId: String(m._id), projectId: null, message: m.latest, at: m.at, from: String(m.from || '') })));
}

export async function customerMessageCount(req, res) {
  const count = await RentalMessage.countDocuments({ fromUserId: req.user._id });
  res.json({ count });
}

export async function customerRecentMessages(req, res) {
  // Include rentals owned by the customer AND rentals where the customer authored any message
  const rentals = await Rental.find({ customerId: req.user._id }).select('_id').lean();
  const ownedIds = rentals.map(r => r._id);
  const authoredIds = await RentalMessage.distinct('rentalId', { fromUserId: req.user._id });
  const allIds = Array.from(new Set([ ...ownedIds.map(String), ...authoredIds.map(String) ])).map(id => new mongoose.Types.ObjectId(id));
  if (allIds.length === 0) return res.json([]);
  const msgs = await RentalMessage.aggregate([
    { $match: { rentalId: { $in: allIds } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$rentalId", latest: { $first: "$message" }, at: { $first: "$createdAt" }, from: { $first: "$fromUserId" } } },
    { $sort: { at: -1 } },
    { $limit: 20 }
  ]);
  res.json(msgs.map(m => ({ conversationId: String(m._id), projectId: null, message: m.latest, at: m.at, from: String(m.from || '') })));
}

// Recent rentals where current user authored messages (works for vendor/technician/any role)
export async function myRecentMessages(req, res) {
  const authoredIds = await RentalMessage.distinct('rentalId', { fromUserId: req.user._id });
  if (!authoredIds || authoredIds.length === 0) return res.json([]);
  const ids = authoredIds.map(id => new mongoose.Types.ObjectId(String(id)));
  const msgs = await RentalMessage.aggregate([
    { $match: { rentalId: { $in: ids } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$rentalId", latest: { $first: "$message" }, at: { $first: "$createdAt" }, from: { $first: "$fromUserId" } } },
    { $sort: { at: -1 } },
    { $limit: 20 }
  ]);
  res.json(msgs.map(m => ({ conversationId: String(m._id), projectId: null, message: m.latest, at: m.at, from: String(m.from || '') })));
}

// Recent rentals where current user AND at least one worker/technician both participated
export async function myRecentTechMessages(req, res) {
  try {
    // Gather rentalIds the current user participated in (tech channel)
    const authoredIds = await RentalMessageTechnician.distinct('rentalId', { fromUserId: req.user._id });
    if (!authoredIds || authoredIds.length === 0) return res.json([]);

    const ids = authoredIds.map(id => new mongoose.Types.ObjectId(String(id)));
    // Return latest message per rentalId from tech channel without role-based participant filtering
    const msgs = await RentalMessageTechnician.aggregate([
      { $match: { rentalId: { $in: ids } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$rentalId", latest: { $first: "$message" }, at: { $first: "$createdAt" }, from: { $first: "$fromUserId" } } },
      { $sort: { at: -1 } },
      { $limit: 20 }
    ]);
    res.set('Cache-Control','no-store');
    res.json(msgs.map(m => ({ conversationId: String(m._id), projectId: null, message: m.latest, at: m.at, from: String(m.from || '') })));
  } catch (e) {
    return res.json([]);
  }
}

// Technician channel messages (vendor ↔ technician)
export async function sendTechMessage(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const rentalId = req.params.id;
  const { name, phone, message } = req.body || {};
  // Disallow customers from using tech channel
  try {
    const role = String(req.user?.role || '');
    if (/customer/i.test(role)) return res.status(403).json({ success: false, message: 'Customers cannot use tech channel' });
  } catch {}
  try {
    const rid = new mongoose.Types.ObjectId(String(rentalId));
    const doc = await RentalMessageTechnician.create({ rentalId: rid, name, phone, message, fromUserId: req.user?._id });
    return res.json({ success: true, id: doc._id });
  } catch (e) {
    try { console.error('[sendTechMessage] failed', e); } catch {}
    return res.status(400).json({ success: false, message: 'Failed to save tech message' });
  }
}

export async function listTechMessages(req, res) {
  const messages = await RentalMessageTechnician.find({ rentalId: req.params.id }).sort({ createdAt: -1 }).limit(200);
  res.json(messages.map(m => ({ id: m._id, message: m.message, at: m.createdAt, from: m.fromUserId })));
}

export async function replyTechMessage(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const { message, toEmail } = req.body || {};
  // Disallow customers from using tech channel
  try {
    const role = String(req.user?.role || '');
    if (/customer/i.test(role)) return res.status(403).json({ success: false, message: 'Customers cannot use tech channel' });
  } catch {}
  try {
    const rid = new mongoose.Types.ObjectId(String(req.params.id));
    const doc = await RentalMessageTechnician.create({ rentalId: rid, message, toEmail, fromUserId: req.user?._id });
    return res.json({ success: true, id: doc._id });
  } catch (e) {
    try { console.error('[replyTechMessage] failed', e); } catch {}
    return res.status(400).json({ success: false, message: 'Failed to save tech reply' });
  }
}
