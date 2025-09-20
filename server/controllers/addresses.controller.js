import { Address } from '../models/Address.js';

export async function list(req, res) {
  const items = await Address.find({ userId: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
  res.json(items);
}

export async function create(req, res) {
  const body = req.body || {};
  const addr = await Address.create({ ...body, userId: req.user._id });
  res.status(201).json(addr);
}

export async function update(req, res) {
  const updated = await Address.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, req.body || {}, { new: true });
  if (!updated) return res.status(404).json({ success: false, message: 'Address not found' });
  res.json(updated);
}

export async function remove(req, res) {
  const deleted = await Address.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!deleted) return res.status(404).json({ success: false, message: 'Address not found' });
  res.json({ ok: true });
}

export async function makeDefault(req, res) {
  const id = req.params.id;
  await Address.updateMany({ userId: req.user._id }, { $set: { isDefault: false } });
  const updated = await Address.findOneAndUpdate({ _id: id, userId: req.user._id }, { isDefault: true }, { new: true });
  if (!updated) return res.status(404).json({ success: false, message: 'Address not found' });
  res.json();
}
