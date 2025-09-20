import express from 'express';
import { protect } from '../middlewares/auth.js';
import { listByTechnician } from '../controllers/offers.controller.js';

const router = express.Router();

// List offers for a technician
router.get('/:id/offers', protect, listByTechnician);

export default router;
