import { Notification } from '../models/Notification.js';
import { body, validationResult } from 'express-validator';

export const validateCreateNotification = [
  body('userId').optional().isString(),
  body('role').optional().isString(),
  body('type').isString(),
  body('title').optional().isString(),
  body('message').optional().isString(),
  body('data').optional().isObject(),
];

// Create (admin or server-side usage)
export async function create(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const b = req.body || {};
  const target = {
    userId: b.userId || req.user?._id,
    role: b.role || req.user?.role,
    type: b.type,
    title: b.title,
    message: b.message,
    data: b.data,
  };
  const created = await Notification.create(target);
  res.status(201).json({ success: true, data: created });
}

// List my notifications (optionally filter unread)
export async function listMine(req, res) {
  const onlyUnread = String(req.query.unread || '').toLowerCase() === 'true';
  const filter = { userId: req.user._id };
  if (onlyUnread) filter.read = false;
  const items = await Notification.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, data: items });
}

// Mark one as read
export async function markRead(req, res) {
  const updated = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { read: true }, { new: true });
  if (!updated) return res.status(404).json({ success: false, message: 'Notification not found' });
  res.json({ success: true, data: updated });
}

// Mark all as read
export async function markAllRead(req, res) {
  await Notification.updateMany({ userId: req.user._id, read: false }, { $set: { read: true } });
  res.json({ success: true });
}
