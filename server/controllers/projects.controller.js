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
  const p = await Project.create({
    title: body.title,
    description: body.description,
    customerId: req.user._id,
    categoryId: body.categoryId || null,
    status: 'Draft',
    views: 0,
  });
  res.status(201).json(p);
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
  const b = await Bid.create({ projectId: req.params.projectId, merchantId: req.user._id, price, days, message });
  res.status(201).json(b);
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
