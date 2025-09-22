// Server-side safety utilities
const { AppError, isValidObjectId } = require('../middleware/errorHandler');

// Safe MongoDB operations
class SafeDB {
  // Safe findById with ObjectId validation
  static async findById(Model, id, options = {}) {
    try {
      if (!id || id === 'undefined' || id === 'null') {
        throw new AppError('ID is required', 400);
      }
      
      if (!isValidObjectId(id)) {
        throw new AppError('Invalid ID format', 400);
      }
      
      const result = await Model.findById(id, options.select, options);
      
      if (!result && options.required !== false) {
        throw new AppError(`${Model.modelName} not found`, 404);
      }
      
      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Error finding ${Model.modelName}: ${error.message}`, 500);
    }
  }

  // Safe find with query validation
  static async find(Model, query = {}, options = {}) {
    try {
      // Validate ObjectId fields in query
      Object.keys(query).forEach(key => {
        if (key.includes('Id') && query[key] && !isValidObjectId(query[key])) {
          throw new AppError(`Invalid ${key} format`, 400);
        }
      });
      
      const result = await Model.find(query, options.select, options);
      return result || [];
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Error finding ${Model.modelName}s: ${error.message}`, 500);
    }
  }

  // Safe create with validation
  static async create(Model, data) {
    try {
      if (!data || Object.keys(data).length === 0) {
        throw new AppError('Data is required', 400);
      }
      
      const result = await Model.create(data);
      return result;
    } catch (error) {
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(e => e.message);
        throw new AppError(`Validation error: ${errors.join(', ')}`, 400);
      }
      if (error.code === 11000) {
        throw new AppError('Duplicate entry', 400);
      }
      throw new AppError(`Error creating ${Model.modelName}: ${error.message}`, 500);
    }
  }

  // Safe update with ObjectId validation
  static async findByIdAndUpdate(Model, id, update, options = {}) {
    try {
      if (!isValidObjectId(id)) {
        throw new AppError('Invalid ID format', 400);
      }
      
      const result = await Model.findByIdAndUpdate(id, update, {
        new: true,
        runValidators: true,
        ...options
      });
      
      if (!result && options.required !== false) {
        throw new AppError(`${Model.modelName} not found`, 404);
      }
      
      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Error updating ${Model.modelName}: ${error.message}`, 500);
    }
  }

  // Safe delete with ObjectId validation
  static async findByIdAndDelete(Model, id) {
    try {
      if (!isValidObjectId(id)) {
        throw new AppError('Invalid ID format', 400);
      }
      
      const result = await Model.findByIdAndDelete(id);
      
      if (!result) {
        throw new AppError(`${Model.modelName} not found`, 404);
      }
      
      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Error deleting ${Model.modelName}: ${error.message}`, 500);
    }
  }

  // Safe aggregation
  static async aggregate(Model, pipeline = []) {
    try {
      const result = await Model.aggregate(pipeline);
      return result || [];
    } catch (error) {
      throw new AppError(`Error in aggregation: ${error.message}`, 500);
    }
  }
}

// Request validation helpers
class RequestValidator {
  // Validate pagination parameters
  static validatePagination(req) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Prevent excessive pagination
    if (page < 1) throw new AppError('Page must be greater than 0', 400);
    if (limit < 1 || limit > 100) throw new AppError('Limit must be between 1 and 100', 400);
    
    return { page, limit, skip };
  }

  // Validate sort parameters
  static validateSort(req, allowedFields = []) {
    const sortBy = req.query.sortBy;
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
    
    if (sortBy && allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
      throw new AppError(`Invalid sort field. Allowed: ${allowedFields.join(', ')}`, 400);
    }
    
    return sortBy ? { [sortBy]: sortOrder } : { createdAt: -1 };
  }

  // Validate required fields
  static validateRequired(data, requiredFields = []) {
    const missing = requiredFields.filter(field => !data[field]);
    
    if (missing.length > 0) {
      throw new AppError(`Missing required fields: ${missing.join(', ')}`, 400);
    }
  }

  // Sanitize query parameters
  static sanitizeQuery(query) {
    const sanitized = { ...query };
    
    // Remove potentially dangerous operators
    delete sanitized.$where;
    delete sanitized.$regex;
    
    // Convert string booleans
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === 'true') sanitized[key] = true;
      if (sanitized[key] === 'false') sanitized[key] = false;
    });
    
    return sanitized;
  }
}

// Response helpers
class SafeResponse {
  // Standard success response
  static success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  // Paginated response
  static paginated(res, data, pagination, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: Math.ceil(pagination.total / pagination.limit)
      },
      timestamp: new Date().toISOString()
    });
  }

  // Error response (should be handled by global error handler)
  static error(res, message, statusCode = 500) {
    return res.status(statusCode).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }
}

// Environment safety checks
const checkEnvironment = () => {
  const required = ['MONGODB_URI', 'JWT_SECRET'];
  const missing = required.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    console.error(`🚨 Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  
  console.log('✅ Environment variables validated');
};

// Database connection safety
const safeDatabaseConnection = async (mongoose) => {
  try {
    // Set mongoose options for stability
    mongoose.set('strictQuery', true);
    mongoose.set('sanitizeFilter', true);
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Database connected safely');
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('🚨 Database error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ Database disconnected');
    });
    
    return mongoose.connection;
  } catch (error) {
    console.error('🚨 Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = {
  SafeDB,
  RequestValidator,
  SafeResponse,
  checkEnvironment,
  safeDatabaseConnection
};
