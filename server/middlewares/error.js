export function notFound(req, res, next) {
  res.status(404);
  res.json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  console.error('[error]', err);
  // Handle Multer file size limit errors explicitly
  if (err && (err.code === 'LIMIT_FILE_SIZE' || err.name === 'MulterError')) {
    const field = err.field || err.fieldname;
    const msg = field
      ? `File too large for field ${field}`
      : 'File too large';
    return res.status(413).json({ success: false, message: msg });
  }
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ success: false, message: err.message || 'Server error' });
}
