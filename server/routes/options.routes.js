import express from 'express';
import { getPublicOption } from '../controllers/options.controller.js';

const router = express.Router();

// Public options (read-only for clients)
router.get('/:key', getPublicOption);

export default router;
