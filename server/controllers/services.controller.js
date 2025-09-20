import { Service } from '../models/Service.js';
import { body, validationResult } from 'express-validator';

export const validateCreate = [
  body('type').isString().notEmpty(),
  body('dailyWage').isNumeric(),
];

export async function list(req, res) {
  const q = {};
  if (req.query.vendorId) {
    q.vendorId = req.query.vendorId === 'me' ? req.user._id : req.query.vendorId;
  }
  const rows = await Service.find(q).sort({ createdAt: -1 }).limit(200);
  const items = rows.map((s) => ({
    id: String(s._id),
    type: s.type,
    dailyWage: s.dailyWage,
    days: s.days,
    total: s.total,
    description: s.description,
    vendorId: String(s.vendorId),
    isApproved: s.isApproved,
    status: s.status,
    startDate: s.startDate,
    endDate: s.endDate,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
  res.json(items);
}

export async function listPublic(req, res) {
  const rows = await Service.find({ isApproved: true, status: { $ne: 'Cancelled' } }).sort({ createdAt: -1 }).limit(200);
  const items = rows.map((s) => ({
    id: String(s._id),
    type: s.type,
    dailyWage: s.dailyWage,
    days: s.days,
    total: s.total,
    description: s.description,
    vendorId: String(s.vendorId),
    isApproved: s.isApproved,
    status: s.status,
    startDate: s.startDate,
    endDate: s.endDate,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
  res.json(items);
}

export async function getById(req, res) {
  const it = await Service.findById(req.params.id);
  if (!it) return res.status(404).json({ success: false, message: 'Service not found' });
  res.json(it);
}

export async function create(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const body = req.body || {};
  const total = Number(body.dailyWage || 0) * Number(body.days || 0);
  const created = await Service.create({ ...body, vendorId: req.user._id, total, isApproved: false });
  res.status(201).json(created);
}

export async function update(req, res) {
  const body = req.body || {};
  const total = body.dailyWage && body.days ? Number(body.dailyWage) * Number(body.days) : undefined;
  if (total != null) body.total = total;
  const updated = await Service.findOneAndUpdate({ _id: req.params.id, vendorId: req.user._id }, body, { new: true });
  if (!updated) return res.status(404).json({ success: false, message: 'Service not found' });
  res.json(updated);
}

export async function remove(req, res) {
  const deleted = await Service.findOneAndDelete({ _id: req.params.id, vendorId: req.user._id });
  if (!deleted) return res.status(404).json({ success: false, message: 'Service not found' });
  res.json({ success: true });
}

export async function complete(req, res) {
  const updated = await Service.findOneAndUpdate({ _id: req.params.id, vendorId: req.user._id }, { status: 'Completed', endDate: new Date() }, { new: true });
  if (!updated) return res.status(404).json({ success: false, message: 'Service not found' });
  res.json({ success: true });
}

// Admin flow (also duplicated under /api/Admin/services/*)
export async function adminListPending(req, res) {
  const rows = await Service.find({ isApproved: false }).sort({ createdAt: -1 });
  const items = rows.map((s) => ({
    id: String(s._id),
    title: s.title || s.type || 'Service',
    description: s.description,
    vendorId: s.vendorId,
    dailyWage: s.dailyWage,
    days: s.days,
    total: s.total,
    createdAt: s.createdAt,
  }));
  res.json({ success: true, items });
}

export async function adminApprove(req, res) {
  const it = await Service.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
  if (!it) return res.status(404).json({ success: false, message: 'Service not found' });
  res.json({ success: true });
}

export async function adminReject(req, res) {
  const it = await Service.findById(req.params.id);
  if (!it) return res.status(404).json({ success: false, message: 'Service not found' });
  it.isApproved = false;
  await it.save();
  res.json({ success: true });
}

// Technician types endpoint
export async function listTypes(req, res) {
  // يمكن لاحقاً قراءتها من AdminOption باسم service_types
  const types = [
    { id: 'electrician', ar: 'كهربائي', en: 'Electrician' },
    { id: 'plumber', ar: 'سباك', en: 'Plumber' },
    { id: 'carpenter', ar: 'نجار', en: 'Carpenter' },
  ];
  res.json(types);
}
