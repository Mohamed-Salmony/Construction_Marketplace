export function notFound(req, res, next) {
  const message = `Route not found: ${req.method} ${req.originalUrl}`;
  
  // Log 404s for debugging but don't spam
  if (!req.originalUrl.includes('favicon.ico') && !req.originalUrl.includes('robots.txt')) {
    console.log(`📝 [404] ${message}`);
  }
  
  res.status(404).json({ 
    success: false, 
    message,
    timestamp: new Date().toISOString()
  });
}

export function errorHandler(err, req, res, next) {
  // Don't log errors if response already sent
  if (res.headersSent) {
    return next(err);
  }

  // Enhanced error logging with context
  const errorInfo = {
    message: err.message || 'Unknown error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage()
  };

  // Log different error types with different levels
  if (err.status >= 400 && err.status < 500) {
    console.warn('⚠️  [CLIENT ERROR]', JSON.stringify(errorInfo, null, 2));
  } else {
    console.error('❌ [SERVER ERROR]', JSON.stringify(errorInfo, null, 2));
  }

  // Handle specific error types
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Multer file upload errors
  if (err && (err.code === 'LIMIT_FILE_SIZE' || err.name === 'MulterError')) {
    status = 413;
    const field = err.field || err.fieldname;
    message = field ? `File too large for field ${field}` : 'File too large';
  }

  // MongoDB errors
  if (err.name === 'MongoError' || err.name === 'MongooseError') {
    status = 500;
    message = process.env.NODE_ENV === 'production' ? 'Database error' : err.message;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token expired';
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map(e => e.message).join(', ');
  }

  // Cast errors (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid ID format';
  }

  // Rate limit errors
  if (err.status === 429) {
    status = 429;
    message = 'Too many requests, please try again later';
  }

  // Don't leak internal error details in production
  if (process.env.NODE_ENV === 'production' && status === 500) {
    message = 'Internal Server Error';
  }

  res.status(status).json({ 
    success: false, 
    message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      originalError: err.message 
    })
  });
}
