// Global Server Error Handler Middleware
const mongoose = require('mongoose');

// Custom error types
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// MongoDB ObjectId validation helper
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

// Handle different types of errors
const handleCastErrorDB = (err) => {
  // MongoDB cast errors (invalid ObjectId)
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  // MongoDB duplicate key errors
  const value = err.errmsg ? err.errmsg.match(/(["'])(\\?.)*?\1/)[0] : 'unknown';
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  // MongoDB validation errors
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

// Safe error logging
const logError = (err, req) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id || 'anonymous',
    error: {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }
  };

  console.error('🚨 Application Error:', JSON.stringify(errorLog, null, 2));
  
  // In production, you might want to send this to a logging service
  // like Winston, Morgan, or external services like Sentry
};

// Send error response based on environment
const sendErrorDev = (err, req, res) => {
  return res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
};

const sendErrorProd = (err, req, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }

  // Programming or other unknown error: don't leak error details
  console.error('ERROR 💥', err);
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
    timestamp: new Date().toISOString()
  });
};

// Main error handling middleware
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log the error
  logError(err, req);

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (err.name === 'CastError') error = handleCastErrorDB(error);
    if (err.code === 11000) error = handleDuplicateFieldsDB(error);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};

// Catch async errors wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// 404 handler for undefined routes
const notFound = (req, res, next) => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
  next(err);
};

// Process unhandled rejections and exceptions
const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (err, promise) => {
    console.error('🚨 UNHANDLED REJECTION! 💥 Shutting down...');
    console.error('Error:', err.name, err.message);
    console.error('Promise:', promise);
    
    // Give ongoing requests time to finish
    process.exit(1);
  });
};

const handleUncaughtException = () => {
  process.on('uncaughtException', (err) => {
    console.error('🚨 UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error('Error:', err.name, err.message);
    console.error('Stack:', err.stack);
    
    process.exit(1);
  });
};

// Request timeout middleware
const requestTimeout = (timeout = 30000) => {
  return (req, res, next) => {
    res.setTimeout(timeout, () => {
      const err = new AppError('Request timeout', 408);
      next(err);
    });
    next();
  };
};

// Rate limiting helper
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  const requests = new Map();
  
  return (req, res, next) => {
    try {
      const key = req.ip;
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Clean old entries
      const userRequests = requests.get(key) || [];
      const validRequests = userRequests.filter(time => time > windowStart);
      
      if (validRequests.length >= max) {
        return res.status(429).json({
          status: 'error',
          message: 'Too many requests from this IP, please try again later.',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
      
      validRequests.push(now);
      requests.set(key, validRequests);
      
      next();
    } catch (error) {
      // If rate limiting fails, continue anyway
      console.warn('Rate limiting error:', error.message);
      next();
    }
  };
};

// Request validation middleware
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    try {
      const id = req.params[paramName];
      
      if (id && !isValidObjectId(id)) {
        const err = new AppError(`Invalid ${paramName}. Must be a valid ObjectId.`, 400);
        return next(err);
      }
      
      next();
    } catch (error) {
      const err = new AppError(`Error validating ${paramName}`, 400);
      next(err);
    }
  };
};

// Safe JSON parser middleware
const safeJsonParser = (req, res, next) => {
  if (req.headers['content-type'] === 'application/json') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        req.body = body ? JSON.parse(body) : {};
        next();
      } catch (error) {
        const err = new AppError('Invalid JSON in request body', 400);
        next(err);
      }
    });
  } else {
    next();
  }
};

module.exports = {
  AppError,
  globalErrorHandler,
  catchAsync,
  notFound,
  handleUnhandledRejection,
  handleUncaughtException,
  requestTimeout,
  createRateLimiter,
  validateObjectId,
  safeJsonParser,
  isValidObjectId
};
