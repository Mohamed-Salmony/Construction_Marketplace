import express from 'express';
import { protect, requireRoles } from '../middlewares/auth.js';
import { getOption, setOption } from '../controllers/adminOptions.controller.js';

const router = express.Router();

router.get('/:key', protect, requireRoles('Admin'), getOption);
router.put('/:key', protect, requireRoles('Admin'), setOption);

export default router;
