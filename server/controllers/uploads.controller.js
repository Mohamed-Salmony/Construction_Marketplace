import { cloudinary } from '../config/cloudinary.js';

export async function uploadSingle(req, res) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const folder = req.query.folder || 'uploads';
    const data = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
      stream.end(req.file.buffer);
    });
    return res.json({ success: true, url: data.secure_url, publicId: data.public_id });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Upload failed' });
  }
}

export async function uploadBatch(req, res) {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files uploaded' });
    const folder = req.query.folder || 'uploads';
    const items = [];
    for (const f of req.files) {
      // eslint-disable-next-line no-await-in-loop
      const data = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
        stream.end(f.buffer);
      });
      items.push({ url: data.secure_url, publicId: data.public_id, fileName: f.originalname });
    }
    return res.json({ success: true, items });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Batch upload failed' });
  }
}
