import express from 'express';
import { protect, requireRoles } from '../middlewares/auth.js';

import { list, listOpen, getById, create, update, remove, getMyProjects, listBids, createBid, selectBid, acceptBid, rejectBid, validateCreateProject, validateUpdateProject, validateCreateBid, deliverProject, acceptDelivery, rejectDelivery, rateMerchant } from '../controllers/projects.controller.js';

const router = express.Router();

router.get('/', list);
router.get('/open', listOpen);

// Specific routes should come before dynamic ':id' to avoid shadowing
router.get('/customer/my-projects', protect, requireRoles('Customer', 'Admin'), getMyProjects);

// Bids
router.get('/:projectId/bids', protect, listBids);
router.post('/:projectId/bids', protect, requireRoles('Merchant', 'Admin'), validateCreateBid, createBid);
router.post('/:projectId/select-bid/:bidId', protect, selectBid);
router.post('/bids/:bidId/accept', protect, acceptBid);
router.post('/bids/:bidId/reject', protect, rejectBid);
router.get('/bids/merchant/my-bids', protect, requireRoles('Merchant', 'Admin'), listBidsForCurrentMerchant);

// Vendor assigned projects (in progress)
router.get('/vendor/assigned', protect, requireRoles('Merchant', 'Admin'), listAssignedForVendor);

// Lifecycle actions
router.post('/:id/deliver', protect, requireRoles('Merchant', 'Admin'), deliverProject);
router.post('/:id/accept-delivery', protect, requireRoles('Customer', 'Admin'), acceptDelivery);
router.post('/:id/reject-delivery', protect, requireRoles('Customer', 'Admin'), rejectDelivery);
router.post('/:id/rate-merchant', protect, requireRoles('Customer', 'Admin'), rateMerchant);

// CRUD
router.post('/', protect, requireRoles('Customer', 'Admin'), validateCreateProject, create);
router.put('/:id', protect, requireRoles('Customer', 'Admin'), validateUpdateProject, update);
router.delete('/:id', protect, requireRoles('Customer', 'Admin'), remove);

// Get by id should be last among GET routes to avoid capturing other paths
router.get('/:id', protect, getById);

export default router;
