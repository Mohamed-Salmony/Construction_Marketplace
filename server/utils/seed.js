import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Category } from '../models/Category.js';

// Seed a static Admin user for development/testing
// Configuration via env (with sensible dev defaults):
// - ADMIN_EMAIL (default: admin@example.com)
// - ADMIN_PASSWORD (default: Admin123!)
// - ADMIN_NAME (default: Admin User)
export async function seedAdmin() {
  const email = String(process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || 'Admin123!');
  const name = String(process.env.ADMIN_NAME || 'Admin User');

  // Ensure we don't accidentally run on production with defaults
  if (process.env.NODE_ENV === 'production' && (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)) {
    console.warn('[seed] Skipping admin seed in production (missing ADMIN_EMAIL/ADMIN_PASSWORD)');
    return;
  }
  const existing = await User.findOne({ email });
  if (existing) {
    // Ensure role is Admin and password is set
    const updates = {};
    if (existing.role !== 'Admin') updates.role = 'Admin';
    const force = String(process.env.SEED_ADMIN_OVERRIDE || '').toLowerCase() === 'true';
    if (force || !existing.password || typeof existing.password !== 'string' || existing.password.length < 20) {
      updates.password = await bcrypt.hash(password, 10);
    }
    if (Object.keys(updates).length > 0) {
      await User.updateOne({ _id: existing._id }, { $set: { name, ...updates } });
      console.log('[seed] Admin updated:', email, force ? '(override)' : '');
    } else {
      console.log('[seed] Admin already exists:', email);
    }
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  await User.create({
    name,
    email,
    password: hash,
    role: 'Admin',
    isVerified: true,
  });
  console.log('[seed] Admin created:', email);
}

// Seed a few default product categories for development/testing
// Controlled via envs similar to seedAdmin. Safe to run multiple times (idempotent per nameEn/nameAr).
export async function seedCategories() {
  try {
    // In production, only seed if explicitly enabled
    if (process.env.NODE_ENV === 'production' && String(process.env.SEED_CATEGORIES).toLowerCase() !== 'true') {
      console.warn('[seed] Skipping categories seed in production (SEED_CATEGORIES not true)');
      return;
    }

    const defaults = [
      { nameEn: 'Doors', nameAr: 'أبواب', descriptionEn: 'All types of doors', descriptionAr: 'كل أنواع الأبواب', isActive: true, sortOrder: 1 },
      { nameEn: 'Windows', nameAr: 'نوافذ', descriptionEn: 'Windows and frames', descriptionAr: 'نوافذ وإطارات', isActive: true, sortOrder: 2 },
      { nameEn: 'Electrical', nameAr: 'كهرباء', descriptionEn: 'Electrical supplies', descriptionAr: 'مستلزمات كهربائية', isActive: true, sortOrder: 3 },
      { nameEn: 'Plumbing', nameAr: 'سباكة', descriptionEn: 'Plumbing supplies', descriptionAr: 'مستلزمات السباكة', isActive: true, sortOrder: 4 },
    ];

    for (const cat of defaults) {
      try {
        const existing = await Category.findOne({ $or: [ { nameEn: cat.nameEn }, { nameAr: cat.nameAr } ] });
        if (existing) {
          // Ensure active and sortOrder are set
          const updates = {};
          if (existing.isActive !== true) updates.isActive = true;
          if (typeof existing.sortOrder !== 'number') updates.sortOrder = cat.sortOrder;
          if (Object.keys(updates).length > 0) await Category.updateOne({ _id: existing._id }, { $set: updates });
          continue;
        }
        await Category.create(cat);
      } catch (e) {
        console.warn('[seed] category ensure error:', cat?.nameEn || cat?.nameAr, e?.message || e);
      }
    }
    console.log('[seed] Categories ensured.');
  } catch (err) {
    console.warn('[seed] categories seeding skipped:', err?.message || err);
  }
}
