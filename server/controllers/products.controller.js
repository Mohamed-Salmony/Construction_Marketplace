import { Product } from '../models/Product.js';
import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { body, validationResult } from 'express-validator';
import { cloudinary } from '../config/cloudinary.js';

const toSlug = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

export async function list(req, res) {
  const { page = 1, pageSize = 20 } = req.query;
  const q = { isApproved: true }; // public listing should show approved products only
  if (req.query.SearchTerm) {
    q.$or = [
      { nameEn: { $regex: req.query.SearchTerm, $options: 'i' } },
      { nameAr: { $regex: req.query.SearchTerm, $options: 'i' } },
    ];
  }
  if (req.query.CategoryId) q.categoryId = req.query.CategoryId;
  const sort = {};
  if (req.query.SortBy) sort[req.query.SortBy] = req.query.SortDescending === 'true' ? -1 : 1;
  const skip = (Number(page) - 1) * Number(pageSize);
  const [items, totalCount] = await Promise.all([
    Product.find(q).sort(sort).skip(skip).limit(Number(pageSize)),
    Product.countDocuments(q),
  ]);
  res.json({ items, totalCount, page: Number(page), pageSize: Number(pageSize) });
}

export async function featured(req, res) {
  const items = await Product.find({ isApproved: true }).sort({ createdAt: -1 }).limit(12);
  res.json(items);
}

export async function rentals(req, res) {
  const items = await Product.find({ isAvailableForRent: true, isApproved: true }).limit(50);
  res.json(items);
}

export async function getById(req, res) {
  try {
    const { id } = req.params;
    const isValid = mongoose.isValidObjectId(id);
    if (!isValid) return res.status(400).json({ success: false, message: 'Invalid product id' });
    const item = await Product.findById(id);
    if (!item) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json(item);
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to fetch product' });
  }
}

export async function getBySlug(req, res) {
  const item = await Product.findOne({ slug: req.params.slug });
  if (!item) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json(item);
}

export async function listMyProducts(req, res) {
  const items = await Product.find({ merchantId: req.user._id });
  res.json(items);
}

export async function create(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const body = req.body || {};
  body.merchantId = req.user._id;

  // Auto-approve if created by Admin
  if (req.user?.role === 'Admin') {
    body.isApproved = true;
    body.approvedAt = new Date();
  }
  if (!body.slug && (body.nameEn || body.nameAr)) {
    body.slug = toSlug(body.nameEn || body.nameAr);
  }
  if (body.categoryId) {
    try {
      const cat = await Category.findById(body.categoryId);
      if (!cat) return res.status(400).json({ success: false, message: 'Invalid categoryId' });
      body.categoryName = cat.nameEn;
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid categoryId format' });
    }
  }
  // Handle images: accept array of base64 or URLs; upload base64 to Cloudinary
  if (Array.isArray(body.images) && body.images.length) {
    const uploaded = [];
    for (let i = 0; i < body.images.length; i++) {
      const item = body.images[i];
      try {
        if (typeof item === 'string' && item.startsWith('data:')) {
          // data URL
          // eslint-disable-next-line no-await-in-loop
          const resUpload = await cloudinary.uploader.upload(item, { folder: 'products' });
          uploaded.push({ imageUrl: resUpload.secure_url, altText: '', isPrimary: i === 0, sortOrder: i });
        } else if (typeof item === 'string' && /^(https?:)?\/\//.test(item)) {
          uploaded.push({ imageUrl: item, altText: '', isPrimary: i === 0, sortOrder: i });
        } else if (item && typeof item === 'object' && item.imageUrl) {
          uploaded.push({
            imageUrl: item.imageUrl,
            altText: item.altText || '',
            isPrimary: !!item.isPrimary || i === 0,
            sortOrder: item.sortOrder ?? i,
          });
        }
      } catch (e) {
        // skip failed image; continue others
      }
    }
    if (uploaded.length) body.images = uploaded;
    else delete body.images; // avoid invalid schema shape
  }
  const created = await Product.create(body);
  res.status(201).json(created);
}

export async function update(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const updates = req.body || {};
  if (!updates.slug && (updates.nameEn || updates.nameAr)) {
    updates.slug = toSlug(updates.nameEn || updates.nameAr);
  }
  if (updates.categoryId) {
    const cat = await Category.findById(updates.categoryId);
    if (cat) updates.categoryName = cat.nameEn;
  }
  // Handle images updates if provided
  if (Array.isArray(updates.images)) {
    const mapped = [];
    for (let i = 0; i < updates.images.length; i++) {
      const item = updates.images[i];
      try {
        if (typeof item === 'string' && item.startsWith('data:')) {
          // eslint-disable-next-line no-await-in-loop
          const resUpload = await cloudinary.uploader.upload(item, { folder: 'products' });
          mapped.push({ imageUrl: resUpload.secure_url, altText: '', isPrimary: i === 0, sortOrder: i });
        } else if (typeof item === 'string' && /^(https?:)?\/\//.test(item)) {
          mapped.push({ imageUrl: item, altText: '', isPrimary: i === 0, sortOrder: i });
        } else if (item && typeof item === 'object' && item.imageUrl) {
          mapped.push({
            imageUrl: item.imageUrl,
            altText: item.altText || '',
            isPrimary: !!item.isPrimary || i === 0,
            sortOrder: item.sortOrder ?? i,
          });
        }
      } catch (e) {
        // skip
      }
    }
    updates.images = mapped;
  }
  const updated = await Product.findOneAndUpdate({ _id: req.params.id, merchantId: req.user._id }, updates, { new: true });
  if (!updated) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json(updated);
}

export async function remove(req, res) {
  let deleted = null;
  if (req.user?.role === 'Admin') {
    // Admins can delete any product by ID
    deleted = await Product.findByIdAndDelete(req.params.id);
  } else {
    // Merchants can only delete their own products
    deleted = await Product.findOneAndDelete({ _id: req.params.id, merchantId: req.user._id });
  }
  if (!deleted) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true });
}

export async function addImage(req, res) {
  const { id } = req.params;
  const payload = req.body || {};
  if (!payload.imageUrl || typeof payload.imageUrl !== 'string') {
    return res.status(400).json({ success: false, message: 'imageUrl is required' });
  }
  const product = await Product.findOne({ _id: id, merchantId: req.user._id });
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  product.images.push({
    imageUrl: payload.imageUrl,
    altText: payload.altText,
    isPrimary: !!payload.isPrimary,
    sortOrder: payload.sortOrder ?? 0,
  });
  await product.save();
  res.status(201).json({ success: true });
}

// Admin: Products moderation
export async function adminListPendingProducts(req, res) {
  const docs = await Product.find({ isApproved: false }).sort({ createdAt: -1 });
  const items = docs.map((p) => ({
    id: String(p._id),
    nameEn: p.nameEn,
    nameAr: p.nameAr,
    merchantId: String(p.merchantId),
    merchantName: p.merchantName,
    categoryId: String(p.categoryId),
    price: p.price,
    discountPrice: p.discountPrice,
    createdAt: p.createdAt,
  }));
  res.json({ success: true, items });
}

export async function adminApproveProduct(req, res) {
  const { id } = req.params;
  const updated = await Product.findByIdAndUpdate(
    id,
    { isApproved: true, approvedAt: new Date() },
    { new: true }
  );
  if (!updated) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true });
}

export async function adminRejectProduct(req, res) {
  const { id } = req.params;
  const deleted = await Product.findByIdAndDelete(id);
  if (!deleted) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true });
}

// Validators (module scope)
export const validateCreateProduct = [
  body('nameEn').isString().notEmpty(),
  body('nameAr').isString().notEmpty(),

  body('categoryId').notEmpty(),
  body('price').isNumeric(),
  body('stockQuantity').optional().isInt({ min: 0 }),
];

export const validateUpdateProduct = [
  body('nameEn').optional().isString().notEmpty(),
  body('nameAr').optional().isString().notEmpty(),
  body('categoryId').optional().isMongoId().withMessage('categoryId must be a valid Mongo ObjectId'),
  body('price').optional().isNumeric(),
  body('stockQuantity').optional().isInt({ min: 0 }),
];

