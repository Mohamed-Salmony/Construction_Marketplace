import express from 'express';
import { protect, requireRoles } from '../middlewares/auth.js';
import { list, listPublic, getById, create, update, remove, complete, adminListPending, adminApprove, adminReject, listTypes, validateCreate } from '../controllers/services.controller.js';

const router = express.Router();

// Vendor services CRUD
router.get('/', protect, list); // supports ?vendorId=me
router.get('/public', listPublic);
router.get('/types', listTypes);
router.get('/:id', protect, getById);
router.post('/', protect, requireRoles('Merchant', 'Admin'), validateCreate, create);
router.put('/:id', protect, requireRoles('Merchant', 'Admin'), update);
router.delete('/:id', protect, requireRoles('Merchant', 'Admin'), remove);
router.post('/:id/complete', protect, requireRoles('Merchant', 'Admin'), complete);

// Admin duplicates
router.get('/admin/pending', protect, requireRoles('Admin'), adminListPending);
router.post('/admin/:id/approve', protect, requireRoles('Admin'), adminApprove);
router.post('/admin/:id/reject', protect, requireRoles('Admin'), adminReject);

export default router;
