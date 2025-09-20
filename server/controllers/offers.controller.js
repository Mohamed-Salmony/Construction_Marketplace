import { Offer } from '../models/Offer.js';
import { Service } from '../models/Service.js';
import { Project } from '../models/Project.js';
import { Notification } from '../models/Notification.js';
import { body, validationResult, param } from 'express-validator';
import mongoose from 'mongoose';

export const validateCreateOffer = [
  body('TargetType').isIn(['service', 'project']),
  body('Price').isNumeric(),
  body('Days').isInt({ min: 1 }),
  // Conditionally require and validate target IDs
  body('ServiceId')
    .if(body('TargetType').equals('service'))
    .exists().withMessage('ServiceId is required for service offers')
    .bail()
    .isMongoId().withMessage('ServiceId must be a valid ObjectId'),
  body('ProjectId')
    .if(body('TargetType').equals('project'))
    .exists().withMessage('ProjectId is required for project offers')
    .bail()
    .isMongoId().withMessage('ProjectId must be a valid ObjectId'),
];

export const validateUpdateOffer = [
  body('TargetType').optional().isIn(['service', 'project']),
  body('Price').optional().isNumeric(),
  body('Days').optional().isInt({ min: 1 }),
  body('ServiceId').optional().isMongoId(),
  body('ProjectId').optional().isMongoId(),
];

export async function create(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const b = req.body || {};
  try {
    // Extra defensive guard in addition to validators
    if (b.TargetType === 'service') {
      if (!b.ServiceId || !mongoose.Types.ObjectId.isValid(String(b.ServiceId))) {
        return res.status(400).json({ success: false, message: 'Invalid ServiceId' });
      }
    }
    if (b.TargetType === 'project') {
      if (!b.ProjectId || !mongoose.Types.ObjectId.isValid(String(b.ProjectId))) {
        return res.status(400).json({ success: false, message: 'Invalid ProjectId' });
      }
    }
    const payload = {
      technicianId: req.user._id,
      targetType: b.TargetType,
      serviceId: b.TargetType === 'service' ? b.ServiceId : undefined,
      projectId: b.TargetType === 'project' ? b.ProjectId : undefined,
      price: b.Price,
      days: b.Days,
      message: b.Message || undefined,
    };
    const created = await Offer.create(payload);
    return res.status(201).json(created);
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Failed to create offer', error: String(err?.message || err) });
  }
}

export async function update(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const b = req.body || {};
  const updates = {
    targetType: b.TargetType,
    serviceId: b.ServiceId,
    projectId: b.ProjectId,
    price: b.Price,
    days: b.Days,
    message: b.Message,
  };
  Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);
  const updated = await Offer.findOneAndUpdate({ _id: req.params.id, technicianId: req.user._id }, updates, { new: true });
  if (!updated) return res.status(404).json({ success: false, message: 'Offer not found' });
  res.json(updated);
}

export async function remove(req, res) {
  const deleted = await Offer.findOneAndDelete({ _id: req.params.id, technicianId: req.user._id });
  if (!deleted) return res.status(404).json({ success: false, message: 'Offer not found' });
  res.json({ success: true });
}

export async function listByService(req, res) {
  const id = String(req.params.serviceId || '');
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid service id' });
  const items = await Offer.find({ targetType: 'service', serviceId: id }).sort({ createdAt: -1 });
  res.json(items);
}

export async function listByProject(req, res) {
  const id = String(req.params.projectId || '');
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid project id' });
  const items = await Offer.find({ targetType: 'project', projectId: id }).sort({ createdAt: -1 });
  res.json(items);
}

export async function updateStatus(req, res) {
  const { Status } = req.body || {};
  const allowed = ['accepted', 'rejected', 'pending'];
  if (!allowed.includes(Status)) return res.status(400).json({ success: false, message: 'Invalid status' });
  const updated = await Offer.findByIdAndUpdate(req.params.id, { status: Status }, { new: true });
  if (!updated) return res.status(404).json({ success: false, message: 'Offer not found' });
  try {
    // Determine target user to notify
    let notifyUserId = null;
    let role = null;
    let title = 'Offer status updated';
    let message = `Your offer has been ${Status}`;
    if (updated.targetType === 'service' && updated.serviceId) {
      const svc = await Service.findById(updated.serviceId).lean();
      if (svc) {
        // Notify technician about status change
        notifyUserId = updated.technicianId;
        role = 'technician';
        title = Status === 'accepted' ? 'Offer accepted' : Status === 'rejected' ? 'Offer rejected' : 'Offer pending';
        message = `Your offer on service has been ${Status}`;
        // Also notify vendor when accepted
        if (Status === 'accepted' && svc.vendorId) {
          await Notification.create({ userId: svc.vendorId, role: 'vendor', type: 'offer.accepted', title: 'Offer accepted', message: 'You accepted a technician offer for your service.', data: { offerId: String(updated._id), serviceId: String(updated.serviceId) } });
        }
      }
    } else if (updated.targetType === 'project' && updated.projectId) {
      const prj = await Project.findById(updated.projectId).lean();
      if (prj) {
        notifyUserId = updated.technicianId;
        role = 'technician';
        title = Status === 'accepted' ? 'Offer accepted' : Status === 'rejected' ? 'Offer rejected' : 'Offer pending';
        message = `Your offer on project has been ${Status}`;
        if (Status === 'accepted' && prj.vendorId) {
          await Notification.create({ userId: prj.vendorId, role: 'vendor', type: 'offer.accepted', title: 'Offer accepted', message: 'You accepted a technician offer for your project.', data: { offerId: String(updated._id), projectId: String(updated.projectId) } });
        }
      }
    }
    if (notifyUserId) {
      await Notification.create({ userId: notifyUserId, role, type: `offer.${Status}`, title, message, data: { offerId: String(updated._id), targetType: updated.targetType, serviceId: updated.serviceId, projectId: updated.projectId } });
    }
  } catch {}
  res.json(updated);
}

export async function listByTechnician(req, res) {
  const items = await Offer.find({ technicianId: req.params.id }).sort({ createdAt: -1 });
  res.json(items);
}
