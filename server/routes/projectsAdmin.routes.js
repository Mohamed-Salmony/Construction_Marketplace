import express from 'express';
import { protect, requireRoles } from '../middlewares/auth.js';
import { listPending, approve, reject, getById, listBids, deleteProject } from '../controllers/projectsAdmin.controller.js';

const router = express.Router();
const adminOnly = [protect, requireRoles('Admin')];

router.get('/pending', ...adminOnly, listPending);
router.post('/:id/approve', ...adminOnly, approve);
router.post('/:id/reject', ...adminOnly, reject);
router.get('/:id', ...adminOnly, getById);
router.get('/:id/bids', ...adminOnly, listBids);
router.delete('/:id', ...adminOnly, deleteProject);

export default router;
