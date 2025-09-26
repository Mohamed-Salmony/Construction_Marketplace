import express from 'express';
import { protect } from '../middlewares/auth.js';
import { create, update, remove, listByService, listByProject, updateStatus, validateCreateOffer, validateUpdateOffer, listByVendor } from '../controllers/offers.controller.js';

const router = express.Router();

router.post('/', protect, validateCreateOffer, create);
router.put('/:id', protect, validateUpdateOffer, update);
router.delete('/:id', protect, remove);
router.get('/service/:serviceId', protect, listByService);
router.get('/project/:projectId', protect, listByProject);
router.post('/:id/status', protect, updateStatus);
router.get('/vendor/mine', protect, listByVendor);

export default router;
