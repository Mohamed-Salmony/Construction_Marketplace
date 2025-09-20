import express from 'express';
import { protect } from '../middlewares/auth.js';
import { list, create, update, remove, makeDefault } from '../controllers/addresses.controller.js';

const router = express.Router();

router.get('/', protect, list);
router.post('/', protect, create);
router.put('/:id', protect, update);
router.delete('/:id', protect, remove);
router.put('/:id/make-default', protect, makeDefault);

export default router;
