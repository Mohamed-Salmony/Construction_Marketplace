import express from 'express';
import { protect, requireRoles } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', protect, requireRoles('Admin', 'Merchant'), (req, res) => res.json([]));
router.get('/pending', protect, requireRoles('Admin'), (req, res) => res.json([]));
router.patch('/:id/approve', protect, requireRoles('Admin'), (req, res) => res.json({ success: true }));
router.patch('/:id/suspend', protect, requireRoles('Admin'), (req, res) => res.json({ success: true }));

export default router;
