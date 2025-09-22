import express from 'express';
import { protect, requireRoles } from '../middlewares/auth.js';
import {
  getAllRentalCategories,
  getRentalCategoryById,
  createRentalCategory,
  updateRentalCategory,
  deleteRentalCategory,
  getRootRentalCategories,
  getRentalSubcategories
} from '../controllers/rentalCategories.controller.js';

const router = express.Router();




// Admin-only routes (more specific routes first)
router.get('/', getAllRentalCategories); // Make public for now
router.post('/', protect, requireRoles('admin'), createRentalCategory);

router.put('/:id', protect, requireRoles('admin'), updateRentalCategory);
router.delete('/:id', protect, requireRoles('admin'), deleteRentalCategory);

// Public routes (less specific routes last)
router.get('/root', getRootRentalCategories);
router.get('/subcategories/:parentId', getRentalSubcategories);
router.get('/:id', getRentalCategoryById);

export default router;
