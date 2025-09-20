import { Project } from '../models/Project.js';
import { Bid } from '../models/Bid.js';
import { Notification } from '../models/Notification.js';

export async function listPending(req, res) {
  const items = await Project.find({ status: 'Draft' }).sort({ createdAt: -1 });
  res.json({ success: true, items });
}

export async function approve(req, res) {
  const id = req.params.id;
  const state = (req.query.state || 'Published');
  const p = await Project.findByIdAndUpdate(id, { status: state }, { new: true });
  if (!p) return res.status(404).json({ success: false, message: 'Project not found' });
  try {
    if (p.customerId) {
      await Notification.create({
        userId: p.customerId,
        role: 'customer',
        type: 'project.approved',
        title: 'Project approved',
        message: 'Your project has been approved by admin.',
        data: { projectId: String(p._id), status: state },
      });
    }
  } catch {}
  res.json({ success: true });
}

export async function reject(req, res) {
  const id = req.params.id;
  const p = await Project.findByIdAndUpdate(id, { status: 'Cancelled' }, { new: true });
  if (!p) return res.status(404).json({ success: false, message: 'Project not found' });
  try {
    if (p.customerId) {
      await Notification.create({
        userId: p.customerId,
        role: 'customer',
        type: 'project.rejected',
        title: 'Project rejected',
        message: 'Your project has been rejected by admin.',
        data: { projectId: String(p._id), status: 'Cancelled' },
      });
    }
  } catch {}
  res.json({ success: true });
}

export async function getById(req, res) {
  const p = await Project.findById(req.params.id);
  if (!p) return res.status(404).json({ success: false, message: 'Project not found' });
  res.json(p);
}

export async function listBids(req, res) {
  const items = await Bid.find({ projectId: req.params.id }).sort({ createdAt: -1 });
  res.json({ success: true, items });
}

export async function deleteProject(req, res) {
  const id = req.params.id;
  const p = await Project.findByIdAndDelete(id);
  if (!p) return res.status(404).json({ success: false, message: 'Project not found' });

  // Delete associated bids
  try {
    await Bid.deleteMany({ projectId: id });
  } catch {}

  // Notify customer if exists
  try {
    if (p.customerId) {
      await Notification.create({
        userId: p.customerId,
        role: 'customer',
        type: 'project.deleted',
        title: 'Project deleted',
        message: 'Your project has been deleted by admin.',
        data: { projectId: String(p._id) },
      });
    }
  } catch {}

  res.json({ success: true, message: 'Project deleted successfully' });
}
