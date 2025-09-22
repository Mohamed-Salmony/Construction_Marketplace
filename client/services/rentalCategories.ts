import { api } from '../lib/api';

export interface RentalCategoryDto {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
  parentCategoryId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRentalCategoryDto {
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  imageUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
  parentCategoryId?: string;
}

export interface UpdateRentalCategoryDto extends Partial<CreateRentalCategoryDto> {}

// Get all rental categories (admin only)
export const getAllRentalCategories = async () => {
  return api.get('/api/RentalCategories');
};

// Get single rental category by ID
export const getRentalCategoryById = async (id: string) => {
  return api.get(`/api/RentalCategories/${id}`);
};

// Create new rental category (admin only)
export const createRentalCategory = async (data: CreateRentalCategoryDto) => {
  return api.post('/api/RentalCategories', data);
};

// Update rental category (admin only)
export const updateRentalCategory = async (id: string, data: UpdateRentalCategoryDto) => {
  return api.put(`/api/RentalCategories/${id}`, data);
};

// Delete rental category (admin only)
export const deleteRentalCategory = async (id: string) => {
  return api.del(`/api/RentalCategories/${id}`);
};

// Get root rental categories (public)
export const getRootRentalCategories = async () => {
  return api.get('/api/RentalCategories/root');
};

// Get subcategories by parent ID (public)
export const getRentalSubcategories = async (parentId: string) => {
  return api.get(`/api/RentalCategories/subcategories/${parentId}`);
};
