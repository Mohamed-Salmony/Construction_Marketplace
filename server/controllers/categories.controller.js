import { Category } from '../models/Category.js';

export async function listRoot(req, res) {
  const items = await Category.find({ parentCategoryId: null, isActive: true }).sort({ sortOrder: 1, _id: 1 });
  res.json(items);
}

export async function listAll(req, res) {
  const items = await Category.find({}).sort({ sortOrder: 1, _id: 1 });
  res.json(items);
}

export async function getById(req, res) {
  const item = await Category.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Category not found' });
  res.json(item);
}

export async function create(req, res) {
  const body = req.body || {};
  const created = await Category.create(body);
  res.status(201).json(created);
}

export async function update(req, res) {
  const updated = await Category.findByIdAndUpdate(req.params.id, req.body || {}, { new: true });
  if (!updated) return res.status(404).json({ success: false, message: 'Category not found' });
  res.json(updated);
}

export async function remove(req, res) {
  const deleted = await Category.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ success: false, message: 'Category not found' });
  res.json({ success: true });
}
