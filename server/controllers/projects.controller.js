import { Project } from '../models/Project.js';
import { Bid } from '../models/Bid.js';
import { body, validationResult } from 'express-validator';

export async function list(req, res) {
  const { page = 1, pageSize = 20, query, sortBy, sortDirection } = req.query;
  const q = {};
  if (query) q.$or = [{ title: { $regex: query, $options: 'i' } }, { description: { $regex: query, $options: 'i' } }];
  const sort = {};
  if (sortBy) sort[sortBy] = sortDirection === 'desc' ? -1 : 1;
  const skip = (Number(page) - 1) * Number(pageSize);
  const [items, totalCount] = await Promise.all([
    Project.find(q).sort(sort).skip(skip).limit(Number(pageSize)),
    Project.countDocuments(q),
  ]);
  res.json({ items, totalCount, page: Number(page), pageSize: Number(pageSize) });
}

export async function listOpen(req, res) {
  const items = await Project.find({ status: { $in: ['Published', 'InBidding'] } }).sort({ createdAt: -1 }).limit(200);
  res.json(items);
}

export async function getById(req, res) {
  const p = await Project.findById(req.params.id);
  if (!p) return res.status(404).json({ success: false, message: 'Project not found' });
  res.json(p);
}

export async function create(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const body = req.body || {};
  try {
    // Normalize items array
    const items = Array.isArray(body.items) ? body.items : [];
    const main = items.length ? items[0] : {};

    // Prefer explicit root fields; fallback to first item
    const ptype = body.ptype ?? body.type ?? main.ptype ?? main.type;
    const psubtype = body.psubtype ?? main.psubtype;
    const type = body.type ?? main.type ?? ptype; // keep both for compatibility
    const material = body.material ?? main.material;
    const color = body.color ?? main.color;
    const width = body.width ?? main.width;
    const height = body.height ?? main.height;
    const length = body.length ?? main.length;
    const quantity = body.quantity ?? main.quantity;
    // days field removed - no longer needed
    const pricePerMeter = body.pricePerMeter ?? main.pricePerMeter;
    const total = body.total ?? main.total;
    const selectedAcc = Array.isArray(body.selectedAcc) ? body.selectedAcc : (Array.isArray(main.selectedAcc) ? main.selectedAcc : []);
    const accessories = Array.isArray(body.accessories) ? body.accessories : (Array.isArray(main.accessories) ? main.accessories : []);
    
    // حقول جديدة لأنماط القياس وخيار "أخرى"
    const measurementMode = body.measurementMode ?? 'area_wh';
    const isCustomProduct = body.isCustomProduct ?? false;
    const customProductDetails = body.customProductDetails ?? null;

    const doc = await Project.create({
      title: body.title,
      description: body.description,
      customerId: req.user._id,
      categoryId: body.categoryId || null,
      status: 'Draft',
      views: 0,

      // root convenience fields
      ptype,
      psubtype,
      type,
      material,
      color,
      width,
      height,
      length,
      quantity,
      // days field removed - no longer needed
      pricePerMeter,
      total,
      selectedAcc,
      accessories,
      
      // حقول جديدة
      measurementMode,
      isCustomProduct,
      customProductDetails,

      // items array as received
      items,
    });

    res.status(201).json(doc);
  } catch (e) {
    console.error('Create Project error:', e);
    res.status(500).json({ success: false, message: 'Failed to create project' });
  }
}

export async function update(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const body = req.body || {};
  const p = await Project.findOneAndUpdate({ _id: req.params.id, customerId: req.user._id }, body, { new: true });
  if (!p) return res.status(404).json({ success: false, message: 'Project not found' });
  res.json(p);
}

export async function remove(req, res) {
  const p = await Project.findOneAndDelete({ _id: req.params.id, customerId: req.user._id });
  if (!p) return res.status(404).json({ success: false, message: 'Project not found' });
  res.json({ success: true });
}

export async function getMyProjects(req, res) {
  const items = await Project.find({ customerId: req.user._id }).sort({ createdAt: -1 });
  res.json(items);
}

// Bids
export async function listBids(req, res) {
  // Populate merchant to expose identity for UI (name, profile picture)
  const bids = await Bid.find({ projectId: req.params.projectId })
    .sort({ createdAt: -1 })
    .populate({ path: 'merchantId', select: 'name profilePicture' });

  // Compute completion metrics per unique merchant across accepted/completed projects
  const uniqueMerchantIds = Array.from(new Set(bids.map(b => String(b.merchantId?._id || b.merchantId)))).filter(Boolean);
  const merchantStats = {};
  try {
    // For each merchant, compute number of accepted bids and number of completed projects among those
    for (const mid of uniqueMerchantIds) {
      const acceptedProjectIds = await Bid.find({ merchantId: mid, status: 'accepted' }).distinct('projectId');
      const completedCount = acceptedProjectIds.length
        ? await Project.countDocuments({ _id: { $in: acceptedProjectIds }, status: 'Completed' })
        : 0;
      const acceptedCount = acceptedProjectIds.length || 0;
      const rating = acceptedCount > 0 ? Math.max(0, Math.min(5, (completedCount / acceptedCount) * 5)) : 0;
      merchantStats[mid] = { acceptedCount, completedCount, rating };
    }
  } catch (e) {
    console.warn('[projects.controller] Failed to compute merchant completion stats:', e?.message || e);
  }

  // Flatten merchant fields for client convenience while preserving original fields
  const items = bids.map((b) => ({
    id: b._id,
    projectId: b.projectId,
    merchantId: b.merchantId?._id || b.merchantId,
    price: b.price,
    amount: b.amount,
    days: b.days,
    message: b.message,
    status: b.status,
    createdAt: b.createdAt,
    // Flattened merchant info
    merchantName: b.merchantId && typeof b.merchantId === 'object' ? (b.merchantId.name || '') : '',
    merchantProfilePicture: b.merchantId && typeof b.merchantId === 'object' ? (b.merchantId.profilePicture || null) : null,
    merchantAcceptedProjects: merchantStats[String(b.merchantId?._id || b.merchantId)]?.acceptedCount ?? 0,
    merchantCompletedProjects: merchantStats[String(b.merchantId?._id || b.merchantId)]?.completedCount ?? 0,
    merchantRating: merchantStats[String(b.merchantId?._id || b.merchantId)]?.rating ?? 0,
  }));

  res.json(items);
}

export async function createBid(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const { price, days, message } = req.body || {};
  try {
    const b = await Bid.create({ projectId: req.params.projectId, merchantId: req.user._id, price, days, message });
    return res.status(201).json(b);
  } catch (e) {
    if (e && (e.code === 11000 || String(e.message||'').includes('duplicate key'))) {
      return res.status(409).json({ success: false, message: 'You have already submitted a bid for this project.' });
    }
    console.error('Create Bid error:', e);
    return res.status(500).json({ success: false, message: 'Failed to submit bid' });
  }
}

export const validateCreateProject = [
  body('title').optional().isString(),
  body('description').optional().isString(),
  body('categoryId').optional().isString(),
];

export const validateUpdateProject = [
  body('title').optional().isString().notEmpty(),
  body('description').optional().isString(),
  body('categoryId').optional().isString(),
];

export const validateCreateBid = [
  body('price').isNumeric(),
  body('days').isInt({ min: 1 }),
  body('message').optional().isString(),
];

export async function selectBid(req, res) {
  // Mark bid accepted and others rejected for the project
  const { projectId, bidId } = req.params;
  await Bid.updateMany({ projectId }, { $set: { status: 'rejected' } });
  await Bid.findByIdAndUpdate(bidId, { status: 'accepted' });
  await Project.findByIdAndUpdate(projectId, { status: 'Awarded' });
  res.json({ success: true, message: 'Bid selected' });
}

export async function acceptBid(req, res) {
  try {
    const bidId = req.params.bidId;
    const bid = await Bid.findById(bidId);
    if (!bid) return res.status(404).json({ success: false, message: 'Bid not found' });

    const project = await Project.findById(bid.projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Only project owner (customer) or admin can accept a bid
    const isOwner = String(project.customerId) === String(req.user._id);
    const isAdmin = String((req.user.role || '')).toLowerCase() === 'admin' || (Array.isArray(req.user.roles) && req.user.roles.map(r=>String(r).toLowerCase()).includes('admin'));
    if (!isOwner && !isAdmin) return res.status(403).json({ success: false, message: 'Forbidden' });

    // Allowed from Published/InBidding/Awarded/Draft (depending on business logic)
    const allowed = ['Draft', 'Published', 'InBidding', 'Awarded'];
    if (!allowed.includes(project.status)) {
      return res.status(400).json({ success: false, message: `Cannot accept bid when project status is ${project.status}` });
    }

    // Mark all bids rejected then accept chosen bid
    await Bid.updateMany({ projectId: bid.projectId }, { $set: { status: 'rejected' } });
    await Bid.findByIdAndUpdate(bidId, { status: 'accepted' });

    const now = new Date();
    const days = Number(bid.days) || 0;
    const expectedEndAt = days > 0 ? new Date(now.getTime() + days * 24 * 60 * 60 * 1000) : null;

    project.status = 'InProgress';
    project.acceptedBidId = bid._id;
    project.merchantId = bid.merchantId;
    project.agreedPrice = Number(bid.price) || 0;
    project.acceptedDays = days;
    project.startedAt = now;
    project.expectedEndAt = expectedEndAt;
    await project.save();

    return res.json({ success: true, message: 'Bid accepted', data: { project } });
  } catch (e) {
    console.error('[acceptBid] error:', e);
    return res.status(500).json({ success: false, message: 'Failed to accept bid' });
  }
}

export async function rejectBid(req, res) {
  await Bid.findByIdAndUpdate(req.params.bidId, { status: 'rejected' });
  res.json({ success: true, message: 'Bid rejected' });
}

// Vendor delivers project
export async function deliverProject(req, res) {
  try {
    const projectId = req.params.id;
    const { note, files } = req.body || {};
    const p = await Project.findById(projectId);
    if (!p) return res.status(404).json({ success: false, message: 'Project not found' });

    // Only assigned merchant or admin can deliver
    const isMerchant = String(p.merchantId || '') === String(req.user._id);
    const isAdmin = String((req.user.role || '')).toLowerCase() === 'admin' || (Array.isArray(req.user.roles) && req.user.roles.map(r=>String(r).toLowerCase()).includes('admin'));
    if (!isMerchant && !isAdmin) return res.status(403).json({ success: false, message: 'Forbidden' });

    if (p.status !== 'InProgress') {
      return res.status(400).json({ success: false, message: `Cannot deliver when status is ${p.status}` });
    }

    p.status = 'Delivered';
    p.deliveredAt = new Date();
    p.deliveryNote = note || '';
    p.deliveryFiles = Array.isArray(files) ? files : [];
    await p.save();
    return res.json({ success: true, data: p });
  } catch (e) {
    console.error('[deliverProject] error:', e);
    return res.status(500).json({ success: false, message: 'Failed to deliver project' });
  }
}

// Customer accepts delivery -> complete project & calculate payouts
export async function acceptDelivery(req, res) {
  try {
    const projectId = req.params.id;
    const p = await Project.findById(projectId);
    if (!p) return res.status(404).json({ success: false, message: 'Project not found' });

    const isOwner = String(p.customerId) === String(req.user._id);
    const isAdmin = String((req.user.role || '')).toLowerCase() === 'admin' || (Array.isArray(req.user.roles) && req.user.roles.map(r=>String(r).toLowerCase()).includes('admin'));
    if (!isOwner && !isAdmin) return res.status(403).json({ success: false, message: 'Forbidden' });

    if (p.status !== 'Delivered') {
      return res.status(400).json({ success: false, message: `Cannot accept delivery when status is ${p.status}` });
    }

    const price = Number(p.agreedPrice) || 0;
    const pct = Number.isFinite(Number(p.platformCommissionPct)) ? Number(p.platformCommissionPct) : 0.1;
    const commission = Math.max(0, Math.round(price * pct));
    const earnings = Math.max(0, price - commission);

    p.status = 'Completed';
    p.completedAt = new Date();
    p.platformCommission = commission;
    p.merchantEarnings = earnings;
    await p.save();

    return res.json({ success: true, data: p });
  } catch (e) {
    console.error('[acceptDelivery] error:', e);
    return res.status(500).json({ success: false, message: 'Failed to accept delivery' });
  }
}

// Customer rejects delivery -> back to InProgress with reason
export async function rejectDelivery(req, res) {
  try {
    const projectId = req.params.id;
    const { reason } = req.body || {};
    const p = await Project.findById(projectId);
    if (!p) return res.status(404).json({ success: false, message: 'Project not found' });

    const isOwner = String(p.customerId) === String(req.user._id);
    const isAdmin = String((req.user.role || '')).toLowerCase() === 'admin' || (Array.isArray(req.user.roles) && req.user.roles.map(r=>String(r).toLowerCase()).includes('admin'));
    if (!isOwner && !isAdmin) return res.status(403).json({ success: false, message: 'Forbidden' });

    if (p.status !== 'Delivered') {
      return res.status(400).json({ success: false, message: `Cannot reject delivery when status is ${p.status}` });
    }

    p.status = 'InProgress';
    // Append reason to note for traceability
    const prefix = p.deliveryNote ? `${p.deliveryNote}\n` : '';
    p.deliveryNote = `${prefix}Rejected by customer: ${reason || 'No reason provided'}`;
    await p.save();
    return res.json({ success: true, data: p });
  } catch (e) {
    console.error('[rejectDelivery] error:', e);
    return res.status(500).json({ success: false, message: 'Failed to reject delivery' });
  }
}

// Customer rates merchant after completion
export async function rateMerchant(req, res) {
  try {
    const projectId = req.params.id;
    const { value, comment } = req.body || {};
    const p = await Project.findById(projectId);
    if (!p) return res.status(404).json({ success: false, message: 'Project not found' });

    const isOwner = String(p.customerId) === String(req.user._id);
    const isAdmin = String((req.user.role || '')).toLowerCase() === 'admin' || (Array.isArray(req.user.roles) && req.user.roles.map(r=>String(r).toLowerCase()).includes('admin'));
    if (!isOwner && !isAdmin) return res.status(403).json({ success: false, message: 'Forbidden' });

    if (p.status !== 'Completed') {
      return res.status(400).json({ success: false, message: 'Project must be completed before rating' });
    }

    const v = Number(value);
    if (!Number.isFinite(v) || v < 1 || v > 5) {
      return res.status(400).json({ success: false, message: 'Invalid rating value' });
    }

    p.rating = { value: v, comment: (comment || '').trim(), by: req.user._id, at: new Date() };
    await p.save();
    return res.json({ success: true });
  } catch (e) {
    console.error('[rateMerchant] error:', e);
    return res.status(500).json({ success: false, message: 'Failed to rate merchant' });
  }
}
