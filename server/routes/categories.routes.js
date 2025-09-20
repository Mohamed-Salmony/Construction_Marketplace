import express from 'express';
import { protect, requireRoles } from '../middlewares/auth.js';
import { listRoot, listAll, getById, create, update, remove } from '../controllers/categories.controller.js';

const router = express.Router();

router.get('/', listRoot);
router.get('/all', listAll);
router.get('/:id', getById);

router.post('/', protect, requireRoles('Admin'), create);
router.put('/:id', protect, requireRoles('Admin'), update);
router.delete('/:id', protect, requireRoles('Admin'), remove);

export default router;
