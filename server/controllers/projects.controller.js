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
    const type = body.type ?? main.type ?? ptype; // keep both for compatibility
    const material = body.material ?? main.material;
    const psubtype = body.psubtype ?? main.psubtype;
    const color = body.color ?? main.color;
    const width = body.width ?? main.width;
    const height = body.height ?? main.height;
    const length = body.length ?? main.length;
    const quantity = body.quantity ?? main.quantity;
    const days = body.days ?? main.days;
    const pricePerMeter = body.pricePerMeter ?? main.pricePerMeter;
    const total = body.total ?? main.total;
    const selectedAcc = Array.isArray(body.selectedAcc) ? body.selectedAcc : (Array.isArray(main.selectedAcc) ? main.selectedAcc : []);
    const accessories = Array.isArray(body.accessories) ? body.accessories : (Array.isArray(main.accessories) ? main.accessories : []);

    const doc = await Project.create({
      title: body.title,
      description: body.description,
      customerId: req.user._id,
      categoryId: body.categoryId || null,
      status: 'Draft',
      views: 0,

      // root convenience fields
      ptype,
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
      days,
      pricePerMeter,
      total,
      selectedAcc,
      accessories,

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
  const items = await Bid.find({ projectId: req.params.projectId })
    .populate('merchantId', 'name')
    .sort({ createdAt: -1 });
  const mapped = items.map((b) => {
    const obj = normalizeBid(b);
    if (b.merchantId && typeof b.merchantId === 'object') {
      obj.merchantName = b.merchantId.name || obj.merchantName;
    }
    return obj;
  });
  res.json(mapped);
}

// Merchant: list my bids across projects
export async function listBidsForCurrentMerchant(req, res) {
  const userId = req.user && req.user._id;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  const items = await Bid.find({ merchantId: userId }).sort({ createdAt: -1 });
  res.json(items.map((b) => normalizeBid(b)));
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
  const bid = await Bid.findById(req.params.bidId).populate('merchantId', 'name');
  if (!bid) {
    return res.status(404).json({ success: false, message: 'Bid not found' });
  }

  const project = await Project.findById(bid.projectId);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  if (String(project.customerId) !== String(req.user._id)) {
    return res.status(403).json({ success: false, message: 'Not authorized to accept this bid' });
  }

  await Bid.updateMany({ projectId: bid.projectId, _id: { $ne: bid._id } }, { $set: { status: 'rejected' } });
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
  res.json({ success: true, message: 'Bid accepted', bid: nBid, project: normalizeProject(project) });
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
