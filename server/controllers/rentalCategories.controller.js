import { RentalCategory } from '../models/RentalCategory.js';
import asyncHandler from '../middlewares/asyncHandler.js';

// Get all rental categories
export const getAllRentalCategories = asyncHandler(async (req, res) => {
  try {
    const categories = await RentalCategory.find()
      .populate('parentCategoryId', 'nameAr nameEn')
      .sort({ sortOrder: 1, createdAt: 1 });
    
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching rental categories:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single rental category by ID
export const getRentalCategoryById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const category = await RentalCategory.findById(id)
      .populate('parentCategoryId', 'nameAr nameEn');
    
    if (!category) {
      return res.status(404).json({ success: false, message: 'Rental category not found' });
    }
    
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    console.error('Error fetching rental category:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create new rental category
export const createRentalCategory = asyncHandler(async (req, res) => {
  try {
    const {
      nameAr,
      nameEn,
      descriptionAr,
      descriptionEn,
      imageUrl,
      isActive,
      sortOrder,
      parentCategoryId
    } = req.body;

    // Validate required fields
    if (!nameAr || !nameEn) {
      return res.status(400).json({
        success: false,
        message: 'Name in both Arabic and English is required'
      });
    }

    // Check if parent category exists
    if (parentCategoryId) {
      const parentExists = await RentalCategory.findById(parentCategoryId);
      if (!parentExists) {
        return res.status(400).json({
          success: false,
          message: 'Parent category not found'
        });
      }
    }

    const newCategory = new RentalCategory({
      nameAr,
      nameEn,
      descriptionAr,
      descriptionEn,
      imageUrl,
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder || 0,
      parentCategoryId: parentCategoryId || null
    });

    const savedCategory = await newCategory.save();
    const populatedCategory = await RentalCategory.findById(savedCategory._id)
      .populate('parentCategoryId', 'nameAr nameEn');

    res.status(201).json({ success: true, data: populatedCategory });
  } catch (error) {
    console.error('Error creating rental category:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update rental category
export const updateRentalCategory = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nameAr,
      nameEn,
      descriptionAr,
      descriptionEn,
      imageUrl,
      isActive,
      sortOrder,
      parentCategoryId
    } = req.body;

    const category = await RentalCategory.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Rental category not found' });
    }

    // Check if parent category exists (if provided)
    if (parentCategoryId && parentCategoryId !== id) {
      const parentExists = await RentalCategory.findById(parentCategoryId);
      if (!parentExists) {
        return res.status(400).json({
          success: false,
          message: 'Parent category not found'
        });
      }
    }

    // Prevent circular reference
    if (parentCategoryId === id) {
      return res.status(400).json({
        success: false,
        message: 'Category cannot be its own parent'
      });
    }

    // Update fields
    if (nameAr !== undefined) category.nameAr = nameAr;
    if (nameEn !== undefined) category.nameEn = nameEn;
    if (descriptionAr !== undefined) category.descriptionAr = descriptionAr;
    if (descriptionEn !== undefined) category.descriptionEn = descriptionEn;
    if (imageUrl !== undefined) category.imageUrl = imageUrl;
    if (isActive !== undefined) category.isActive = isActive;
    if (sortOrder !== undefined) category.sortOrder = sortOrder;
    if (parentCategoryId !== undefined) category.parentCategoryId = parentCategoryId || null;

    const updatedCategory = await category.save();
    const populatedCategory = await RentalCategory.findById(updatedCategory._id)
      .populate('parentCategoryId', 'nameAr nameEn');

    res.status(200).json({ success: true, data: populatedCategory });
  } catch (error) {
    console.error('Error updating rental category:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete rental category
export const deleteRentalCategory = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const category = await RentalCategory.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Rental category not found' });
    }

    // Check if category has subcategories
    const hasSubcategories = await RentalCategory.findOne({ parentCategoryId: id });
    if (hasSubcategories) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category that has subcategories'
      });
    }

    await RentalCategory.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Rental category deleted successfully' });
  } catch (error) {
    console.error('Error deleting rental category:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get root rental categories (no parent)
export const getRootRentalCategories = asyncHandler(async (req, res) => {
  try {
    const categories = await RentalCategory.find({ 
      parentCategoryId: null, 
      isActive: true 
    }).sort({ sortOrder: 1, createdAt: 1 });
    
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching root rental categories:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get subcategories by parent ID
export const getRentalSubcategories = asyncHandler(async (req, res) => {
  try {
    const { parentId } = req.params;
    
    const subcategories = await RentalCategory.find({ 
      parentCategoryId: parentId, 
      isActive: true 
    }).sort({ sortOrder: 1, createdAt: 1 });
    
    res.status(200).json({ success: true, data: subcategories });
  } catch (error) {
    console.error('Error fetching rental subcategories:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
