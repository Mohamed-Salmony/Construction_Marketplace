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
    const type = body.type ?? main.type ?? ptype; // keep both for compatibility
    const material = body.material ?? main.material;
    const width = body.width ?? main.width;
    const height = body.height ?? main.height;
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
      material,
      width,
      height,
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
  const items = await Bid.find({ projectId: req.params.projectId }).sort({ createdAt: -1 });
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
  await Bid.findByIdAndUpdate(req.params.bidId, { status: 'accepted' });
  res.json({ success: true, message: 'Bid accepted' });
}

export async function rejectBid(req, res) {
  await Bid.findByIdAndUpdate(req.params.bidId, { status: 'rejected' });
  res.json({ success: true, message: 'Bid rejected' });
}
