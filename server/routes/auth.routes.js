import express from 'express';
import { body } from 'express-validator';
import { protect } from '../middlewares/auth.js';
import { register, login, profile, updateProfile, changePassword, forgotPassword, resetPassword, deleteAccount } from '../controllers/auth.controller.js';
import multer from 'multer';

const router = express.Router();
const storage = multer.memoryStorage();
const maxMb = Number(process.env.UPLOAD_MAX_FILE_MB || 15);
const maxFileSize = Math.max(1, isFinite(maxMb) ? maxMb : 15) * 1024 * 1024; // default 15MB per file
const allowed = (process.env.ALLOWED_EXTENSIONS || '.jpg,.jpeg,.png,.gif,.pdf,.doc,.docx')
  .split(',').map((s) => s.trim().toLowerCase());
const upload = multer({
  storage,
  limits: { fileSize: maxFileSize },
  fileFilter: (req, file, cb) => {
    try {
      const name = String(file.originalname || '').toLowerCase();
      const dot = name.lastIndexOf('.');
      const ext = dot >= 0 ? name.slice(dot) : '';
      const mt = String(file.mimetype || '').toLowerCase();
      const imageOk = mt.startsWith('image/');
      const docOk = mt === 'application/pdf' || mt === 'application/msword' || mt === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      if (ext && allowed.includes(ext)) return cb(null, true);
      if (!ext && (imageOk || docOk)) return cb(null, true);
      // fallback: allow; Cloudinary will reject if truly unsupported
      return cb(null, true);
    } catch { cb(null, true); }
  }
});

// Accept multipart/form-data coming from frontend (FormData)
router.post('/register', upload.any(), [
  body('Email').optional().isEmail(),
  body('email').optional().isEmail(),
  body('Password').optional().isLength({ min: 6 }),
  body('password').optional().isLength({ min: 6 }),
], register);

router.post('/login', login);

router.get('/profile', protect, profile);
router.put('/profile', protect, updateProfile);
router.post('/change-password', protect, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.delete('/account', protect, deleteAccount);

export default router;
