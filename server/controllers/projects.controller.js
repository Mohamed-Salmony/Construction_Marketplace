import { Project } from '../models/Project.js';
import { Bid } from '../models/Bid.js';
import { body, validationResult } from 'express-validator';

function normalizeProject(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject({ getters: true }) : { ...doc };
  obj.id = obj.id || (doc._id ? doc._id.toString() : obj._id ? String(obj._id) : undefined);
  if (obj._id) delete obj._id;
  if (obj.customerId) obj.customerId = String(obj.customerId);
  if (obj.merchantId) obj.merchantId = String(obj.merchantId);
  if (obj.assignedMerchantId) obj.assignedMerchantId = String(obj.assignedMerchantId);
  if (obj.awardedBidId) obj.awardedBidId = String(obj.awardedBidId);
  if (obj.executionStartedAt) {
    const started = new Date(obj.executionStartedAt);
    obj.executionStartedAt = Number.isNaN(started.getTime()) ? undefined : started.toISOString();
  }
  if (obj.executionDueAt) {
    const due = new Date(obj.executionDueAt);
    obj.executionDueAt = Number.isNaN(due.getTime()) ? undefined : due.toISOString();
  }
  if (Array.isArray(obj.items)) {
    obj.items = obj.items.map((item) => {
      if (!item) return item;
      const mapped = { ...item };
      mapped.id = mapped.id || (mapped._id ? String(mapped._id) : undefined);
      if (mapped._id) delete mapped._id;
      if (mapped.projectId) mapped.projectId = String(mapped.projectId);
      if (mapped.merchantId) mapped.merchantId = String(mapped.merchantId);
      return mapped;
    });
  }
  return obj;
}

function normalizeBid(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject({ getters: true }) : { ...doc };
  obj.id = obj.id || (doc._id ? doc._id.toString() : obj._id ? String(obj._id) : undefined);
  if (obj._id) delete obj._id;
  if (obj.projectId) obj.projectId = String(obj.projectId);
  if (obj.merchantId) obj.merchantId = String(obj.merchantId);
  return obj;
}

export async function list(req, res) {
  const { page = 1, pageSize = 20, query, sortBy, sortDirection } = req.query;
  const q = {};
  if (query) q.$or = [{ title: { $regex: query, $options: 'i' } }, { description: { $regex: query, $options: 'i' } }];
  const sort = {};
  if (sortBy) sort[sortBy] = sortDirection === 'desc' ? -1 : 1;
  const skip = (Number(page) - 1) * Number(pageSize);
  const [items, totalCount] = await Promise.all([
    Project.find(q)
      .populate('customerId', 'name email')
      .populate('assignedMerchantId', 'name')
      .sort(sort)
      .skip(skip)
      .limit(Number(pageSize)),
    Project.countDocuments(q),
  ]);
  const mapped = items.map((p) => {
    const obj = normalizeProject(p);
    if (p.customerId && typeof p.customerId === 'object') {
      obj.customerName = p.customerId.name || obj.customerName;
      obj.customerEmail = p.customerId.email || obj.customerEmail;
    }
    if (p.assignedMerchantId && typeof p.assignedMerchantId === 'object') {
      obj.assignedMerchantName = p.assignedMerchantId.name || obj.assignedMerchantName;
    }
    return obj;
  });
  res.json({ items: mapped, totalCount, page: Number(page), pageSize: Number(pageSize) });
}

export async function listOpen(req, res) {
  const items = await Project.find({ status: { $in: ['Published', 'InBidding'] } })
    .populate('customerId', 'name email')
    .populate('assignedMerchantId', 'name')
    .sort({ createdAt: -1 })
    .limit(200);
  const mapped = items.map((p) => {
    const obj = normalizeProject(p);
    if (p.customerId && typeof p.customerId === 'object') {
      obj.customerName = p.customerId.name || obj.customerName;
      obj.customerEmail = p.customerId.email || obj.customerEmail;
    }
    if (p.assignedMerchantId && typeof p.assignedMerchantId === 'object') {
      obj.assignedMerchantName = p.assignedMerchantId.name || obj.assignedMerchantName;
    }
    return obj;
  });
  res.json(mapped);
}

export async function getById(req, res) {
  const p = await Project.findById(req.params.id)
    .populate('customerId', 'name email')
    .populate('assignedMerchantId', 'name');
  if (!p) return res.status(404).json({ success: false, message: 'Project not found' });
  const obj = normalizeProject(p);
  if (p.customerId && typeof p.customerId === 'object') {
    obj.customerName = p.customerId.name || obj.customerName;
    obj.customerEmail = p.customerId.email || obj.customerEmail;
  }
  if (p.assignedMerchantId && typeof p.assignedMerchantId === 'object') {
    obj.assignedMerchantName = p.assignedMerchantId.name || obj.assignedMerchantName;
  }
  res.json(obj);
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
    const psubtype = body.psubtype ?? main.psubtype;

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
      psubtype,
      material,
      color,
      // optional localized labels if provided by client
      ptypeAr: body.ptypeAr,
      ptypeEn: body.ptypeEn,
      psubtypeAr: body.psubtypeAr,
      psubtypeEn: body.psubtypeEn,
      materialAr: body.materialAr,
      materialEn: body.materialEn,
      colorAr: body.colorAr,
      colorEn: body.colorEn,
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
  // Whitelist fields allowed to be updated by customer; cast numbers defensively
  const pick = (o, keys) => keys.reduce((acc, k) => {
    if (o[k] !== undefined) acc[k] = o[k];
    return acc;
  }, {});
  const allowed = [
    'title','description','categoryId','ptype','type','material','color',
    'width','height','length','quantity','days','pricePerMeter','total',
    'selectedAcc','accessories','items','status'
  ];
  const updateDoc = pick(body, allowed);
  // Cast numerics if present
  ['width','height','length','quantity','days','pricePerMeter','total'].forEach(k => {
    if (updateDoc[k] !== undefined) updateDoc[k] = Number(updateDoc[k]);
  });
  // Ensure items, if provided, is an array
  if (updateDoc.items && !Array.isArray(updateDoc.items)) delete updateDoc.items;

  const p = await Project.findOneAndUpdate(
    { _id: req.params.id, customerId: req.user._id },
    { $set: updateDoc },
    { new: true, runValidators: true }
  );
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
    return res.status(201).json(normalizeBid(b));
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
  const bid = await Bid.findById(bidId).populate('merchantId', 'name');
  if (!bid) {
    return res.status(404).json({ success: false, message: 'Bid not found' });
  }
  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  await Bid.updateMany({ projectId, _id: { $ne: bidId } }, { $set: { status: 'rejected' } });
  bid.status = 'accepted';
  await bid.save();

  const now = new Date();
  const durationDays = Number(bid.days) > 0 ? Number(bid.days) : Number(project.days) > 0 ? Number(project.days) : null;
  let executionDueAt;
  if (durationDays) {
    executionDueAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  }

  project.status = 'InProgress';
  project.assignedMerchantId = bid.merchantId;
  project.awardedBidId = bid._id;
  project.executionStartedAt = now;
  project.executionDueAt = executionDueAt || null;
  await project.save();

  const nBid = normalizeBid(bid);
  if (bid.merchantId && typeof bid.merchantId === 'object') nBid.merchantName = bid.merchantId.name || nBid.merchantName;
  res.json({ success: true, message: 'Bid selected', project: normalizeProject(project), bid: nBid });
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
  const updated = await Bid.findByIdAndUpdate(req.params.bidId, { status: 'rejected' }, { new: true });
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Bid not found' });
  }
  res.json({ success: true, message: 'Bid rejected', bid: normalizeBid(updated) });
}

// Vendor: list projects assigned to me and in execution
export async function listAssignedForVendor(req, res) {
  const vendorId = req.user && req.user._id;
  if (!vendorId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  const items = await Project.find({
    assignedMerchantId: vendorId,
    status: { $in: ['InProgress', 'Awarded'] },
  }).sort({ updatedAt: -1 });
  res.json(items.map((p) => normalizeProject(p)));
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
