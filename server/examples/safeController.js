// Example of a safe controller using error handling
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { SafeDB, RequestValidator, SafeResponse } = require('../utils/serverSafeGuards');

// Example model (replace with actual model)
// const Project = require('../models/Project');

// Safe controller example
const safeProjectController = {
  // Get all projects with safe pagination
  getAllProjects: catchAsync(async (req, res, next) => {
    // Validate and sanitize request
    const pagination = RequestValidator.validatePagination(req);
    const sort = RequestValidator.validateSort(req, ['title', 'createdAt', 'status']);
    const query = RequestValidator.sanitizeQuery(req.query);
    
    // Remove pagination params from query
    delete query.page;
    delete query.limit;
    delete query.sortBy;
    delete query.sortOrder;
    
    // Safe database operations
    const projects = await SafeDB.find(Project, query, {
      limit: pagination.limit,
      skip: pagination.skip,
      sort
    });
    
    const total = await Project.countDocuments(query);
    
    // Safe response
    SafeResponse.paginated(res, projects, { ...pagination, total });
  }),

  // Get project by ID with validation
  getProjectById: catchAsync(async (req, res, next) => {
    const { id } = req.params;
    
    // Safe database operation with ObjectId validation
    const project = await SafeDB.findById(Project, id);
    
    SafeResponse.success(res, project);
  }),

  // Create project with validation
  createProject: catchAsync(async (req, res, next) => {
    // Validate required fields
    RequestValidator.validateRequired(req.body, ['title', 'description']);
    
    // Add user ID from auth middleware
    const projectData = {
      ...req.body,
      customerId: req.user?.id
    };
    
    // Safe database operation
    const project = await SafeDB.create(Project, projectData);
    
    SafeResponse.success(res, project, 'Project created successfully', 201);
  }),

  // Update project with validation
  updateProject: catchAsync(async (req, res, next) => {
    const { id } = req.params;
    
    // Check if user owns the project or is admin
    const existingProject = await SafeDB.findById(Project, id);
    
    if (req.user.role !== 'admin' && existingProject.customerId.toString() !== req.user.id) {
      return next(new AppError('You do not have permission to update this project', 403));
    }
    
    // Safe update operation
    const project = await SafeDB.findByIdAndUpdate(Project, id, req.body);
    
    SafeResponse.success(res, project, 'Project updated successfully');
  }),

  // Delete project with validation
  deleteProject: catchAsync(async (req, res, next) => {
    const { id } = req.params;
    
    // Check if user owns the project or is admin
    const existingProject = await SafeDB.findById(Project, id);
    
    if (req.user.role !== 'admin' && existingProject.customerId.toString() !== req.user.id) {
      return next(new AppError('You do not have permission to delete this project', 403));
    }
    
    // Safe delete operation
    await SafeDB.findByIdAndDelete(Project, id);
    
    SafeResponse.success(res, null, 'Project deleted successfully');
  }),

  // Get user's projects (safe user-specific query)
  getMyProjects: catchAsync(async (req, res, next) => {
    const pagination = RequestValidator.validatePagination(req);
    const sort = RequestValidator.validateSort(req, ['title', 'createdAt', 'status']);
    
    // Safe query with user validation
    const query = { customerId: req.user.id };
    
    const projects = await SafeDB.find(Project, query, {
      limit: pagination.limit,
      skip: pagination.skip,
      sort
    });
    
    const total = await Project.countDocuments(query);
    
    SafeResponse.paginated(res, projects, { ...pagination, total });
  }),

  // Get projects by status with validation
  getProjectsByStatus: catchAsync(async (req, res, next) => {
    const { status } = req.params;
    
    // Validate status parameter
    const validStatuses = ['Draft', 'Published', 'InBidding', 'BidSelected', 'InProgress', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return next(new AppError('Invalid status parameter', 400));
    }
    
    const pagination = RequestValidator.validatePagination(req);
    const sort = RequestValidator.validateSort(req, ['title', 'createdAt']);
    
    const query = { status };
    
    const projects = await SafeDB.find(Project, query, {
      limit: pagination.limit,
      skip: pagination.skip,
      sort
    });
    
    const total = await Project.countDocuments(query);
    
    SafeResponse.paginated(res, projects, { ...pagination, total });
  }),

  // Advanced search with safe aggregation
  searchProjects: catchAsync(async (req, res, next) => {
    const { q, category, minBudget, maxBudget } = req.query;
    const pagination = RequestValidator.validatePagination(req);
    
    let pipeline = [];
    
    // Text search stage
    if (q) {
      pipeline.push({
        $match: {
          $or: [
            { title: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } }
          ]
        }
      });
    }
    
    // Category filter
    if (category) {
      pipeline.push({
        $match: { category }
      });
    }
    
    // Budget range filter
    if (minBudget || maxBudget) {
      let budgetMatch = {};
      if (minBudget) budgetMatch.$gte = parseFloat(minBudget);
      if (maxBudget) budgetMatch.$lte = parseFloat(maxBudget);
      
      pipeline.push({
        $match: { budget: budgetMatch }
      });
    }
    
    // Pagination
    pipeline.push(
      { $skip: pagination.skip },
      { $limit: pagination.limit }
    );
    
    // Safe aggregation
    const projects = await SafeDB.aggregate(Project, pipeline);
    
    SafeResponse.success(res, projects, 'Search completed');
  })
};

module.exports = safeProjectController;

// Usage in routes:
/*
const express = require('express');
const { validateObjectId } = require('../middleware/errorHandler');
const router = express.Router();

router.get('/projects', safeProjectController.getAllProjects);
router.get('/projects/my', authMiddleware, safeProjectController.getMyProjects);
router.get('/projects/search', safeProjectController.searchProjects);
router.get('/projects/status/:status', safeProjectController.getProjectsByStatus);
router.get('/projects/:id', validateObjectId('id'), safeProjectController.getProjectById);
router.post('/projects', authMiddleware, safeProjectController.createProject);
router.put('/projects/:id', authMiddleware, validateObjectId('id'), safeProjectController.updateProject);
router.delete('/projects/:id', authMiddleware, validateObjectId('id'), safeProjectController.deleteProject);

module.exports = router;
*/
