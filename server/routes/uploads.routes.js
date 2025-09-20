import express from 'express';
import { protect } from '../middlewares/auth.js';
import { upload } from '../utils/upload.js';
import { uploadSingle, uploadBatch } from '../controllers/uploads.controller.js';

const router = express.Router();

router.post('/', protect, upload.single('file'), uploadSingle);
router.post('/batch', protect, upload.array('files'), uploadBatch);

export default router;
