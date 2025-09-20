import express from 'express';
import { protect, requireRoles } from '../middlewares/auth.js';
import { list, listOpen, getById, create, update, remove, getMyProjects, listBids, createBid, selectBid, acceptBid, rejectBid, validateCreateProject, validateUpdateProject, validateCreateBid } from '../controllers/projects.controller.js';

const router = express.Router();

router.get('/', list);
router.get('/open', listOpen);
router.get('/:id', protect, getById);

// Bids
router.get('/:projectId/bids', protect, listBids);
router.post('/:projectId/bids', protect, requireRoles('Merchant', 'Admin'), validateCreateBid, createBid);
router.post('/:projectId/select-bid/:bidId', protect, selectBid);
router.post('/bids/:bidId/accept', protect, acceptBid);
router.post('/bids/:bidId/reject', protect, rejectBid);
router.get('/bids/merchant/my-bids', protect, requireRoles('Merchant', 'Admin'), listBids);

// CRUD
router.post('/', protect, requireRoles('Customer', 'Admin'), validateCreateProject, create);
router.put('/:id', protect, requireRoles('Customer', 'Admin'), validateUpdateProject, update);
router.delete('/:id', protect, requireRoles('Customer', 'Admin'), remove);
router.get('/customer/my-projects', protect, requireRoles('Customer', 'Admin'), getMyProjects);

export default router;
