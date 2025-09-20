import { Order } from '../models/Order.js';

function toDto(o) {
  return {
    id: o._id,
    status: o.status,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    itemsCount: (o.items || []).length,
    total: o.total,
  };
}

export async function list(req, res) {
  const q = {};
  if (req.query.vendorId) {
    if (req.query.vendorId === 'me') q.vendorId = req.user._id;
    else q.vendorId = req.query.vendorId;
  }
  if (req.query.status) q.status = req.query.status;
  const items = await Order.find(q).sort({ createdAt: -1 }).limit(200);
  res.json(items.map(toDto));
}

export async function getById(req, res) {
  const o = await Order.findById(req.params.id);
  if (!o) return res.status(404).json({ success: false, message: 'Order not found' });
  res.json(toDto(o));
}

export async function updateStatus(req, res) {
  const { status } = req.body || {};
  const o = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!o) return res.status(404).json({ success: false, message: 'Order not found' });
  res.json({ success: true });
}

export async function listMy(req, res) {
  const items = await Order.find({ customerId: req.user._id }).sort({ createdAt: -1 }).limit(200);
  res.json(items.map(toDto));
}

export async function cancel(req, res) {
  const o = await Order.findOneAndUpdate({ _id: req.params.id, customerId: req.user._id }, { status: 'cancelled' }, { new: true });
  if (!o) return res.status(404).json({ success: false, message: 'Order not found' });
  res.json({ success: true });
}

export async function confirmDelivered(req, res) {
  const o = await Order.findByIdAndUpdate(req.params.id, { status: 'delivered' }, { new: true });
  if (!o) return res.status(404).json({ success: false, message: 'Order not found' });
  res.json({ success: true });
}

export async function create(req, res) {
  const body = req.body || {};
  const items = Array.isArray(body.items) ? body.items : [];
  const total = items.reduce((s, it) => s + Number(it.price || 0) * Number(it.quantity || 0), 0);
  const o = await Order.create({
    customerId: req.user._id,
    status: 'pending',
    items: items.map((it) => ({ productId: it.id, price: it.price || 0, quantity: it.quantity || 1 })),
    total,
  });
  res.status(201).json({ id: o._id });
}
