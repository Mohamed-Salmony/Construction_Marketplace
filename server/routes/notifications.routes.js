import express from 'express';
import { protect } from '../middlewares/auth.js';
import { create, listMine, markRead, markAllRead, validateCreateNotification } from '../controllers/notifications.controller.js';

const router = express.Router();

router.use(protect);

router.get('/mine', listMine);
router.post('/', validateCreateNotification, create);
router.patch('/:id/read', markRead);
router.post('/mark-all-read', markAllRead);

export default router;
