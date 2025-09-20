import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage();

const allowed = (process.env.ALLOWED_EXTENSIONS || '.jpg,.jpeg,.png,.gif,.pdf,.doc,.docx')
  .split(',')
  .map((s) => s.trim().toLowerCase());

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!allowed.includes(ext)) {
    return cb(new Error(`File type not allowed: ${ext}`));
  }
  cb(null, true);
}

export const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
