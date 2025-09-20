import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import { User } from '../models/User.js';
import { signToken } from '../utils/jwt.js';
import { cloudinary } from '../config/cloudinary.js';

export async function register(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { Email, Password, Name, Role, PhoneNumber } = req.body;

    const email = (Email || req.body.email || '').toLowerCase();
    const password = Password || req.body.password;
    const name = Name || req.body.name || email.split('@')[0];
    let role = Role || req.body.role || 'User';
    // Normalize roles
    const map = {
      vendor: 'Merchant', customer: 'Customer', technician: 'Worker', worker: 'Worker', admin: 'Admin', user: 'User'
    };
    const rl = String(role).toLowerCase();
    role = map[rl] || role;

    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ success: false, message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    // Normalize dateOfBirth from multiple possible keys and coerce to Date
    const rawDob = req.body.DateOfBirth || req.body.dateOfBirth || req.body.BirthDate || req.body.birthDate || req.body.Birthdate || req.body.birthdate || req.body.DOB || req.body.dob;
    const dobVal = (() => {
      if (!rawDob) return undefined;
      try {
        const s = String(rawDob).trim();
        // Accept 'YYYY-MM-DD'
        const m1 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m1) {
          const d = new Date(Date.UTC(Number(m1[1]), Number(m1[2]) - 1, Number(m1[3])));
          return isNaN(d.getTime()) ? undefined : d;
        }
        // Accept 'MM/DD/YYYY' or 'DD/MM/YYYY' -> infer by first part > 12 => DD/MM/YYYY
        const m2 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m2) {
          const a = Number(m2[1]);
          const b = Number(m2[2]);
          const year = Number(m2[3]);
          const month = (a > 12 ? b : a) - 1;
          const day = a > 12 ? a : b;
          const d = new Date(Date.UTC(year, month, day));
          return isNaN(d.getTime()) ? undefined : d;
        }
        // Fallback: ISO or other formats
        const d = new Date(s);
        return isNaN(d.getTime()) ? undefined : d;
      } catch { return undefined; }
    })();
    // Prepare Cloudinary uploads if FormData arrived
    const files = Array.isArray(req.files) ? req.files : [];
    try {
      console.log('[register] fields:', Object.keys(req.body || {}));
      console.log('[register] files:', files.map((f) => ({ name: f.fieldname, size: f.size, mt: f.mimetype, hasBuffer: !!f.buffer })));
    } catch {}
    const byField = (name) => files.find((f) => f.fieldname === name);
    async function uploadIfPresent(file, folder) {
      if (!file) return undefined;
      const opts = { folder, resource_type: 'auto' };
      // If multer used memoryStorage -> file.buffer is available
      if (file.buffer) {
        return await new Promise((resolve) => {
          const stream = cloudinary.uploader.upload_stream(opts, (err, result) => {
            if (err || !result) return resolve(undefined);
            resolve(result.secure_url || result.url);
          });
          stream.end(file.buffer);
        });
      }
      // If multer stored on disk -> file.path exists
      if (file.path) {
        try {
          const res = await cloudinary.uploader.upload(file.path, opts);
          return res?.secure_url || res?.url;
        } catch {
          return undefined;
        }
      }
      return undefined;
    }

    // Try named fields first
    let docFile = byField('DocumentFile') || byField('documentFile') || byField('Document') || byField('document');
    let imgFile = byField('ImageFile') || byField('imageFile') || byField('ProfileImage') || byField('profileImage') || byField('Image') || byField('image');
    let licenseFile = byField('LicenseImage') || byField('licenseImage') || byField('License') || byField('license');
    // If not found, pick by mimetype heuristics
    if (!imgFile) imgFile = files.find(f => String(f.mimetype||'').toLowerCase().startsWith('image/'));
    if (!docFile) docFile = files.find(f => {
      const mt = String(f.mimetype||'').toLowerCase();
      return mt === 'application/pdf' || mt === 'application/msword' || mt === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    });
    if (!licenseFile) {
      const images = files.filter(f => String(f.mimetype||'').toLowerCase().startsWith('image/'));
      licenseFile = images.length > 1 ? images[1] : undefined;
    }
    const docUrl = await uploadIfPresent(docFile, 'users/documents');
    const imgUrl = await uploadIfPresent(imgFile, 'users/images');
    const licenseUrl = await uploadIfPresent(licenseFile, 'users/licenses');
    try {
      console.log('[register] cloudinary urls:', { docUrl, imgUrl, licenseUrl });
      console.log('[register] parsed dob:', dobVal, 'raw:', rawDob);
    } catch {}

    const user = await User.create({
      email,
      password: hash,
      name,
      firstName: req.body.FirstName || req.body.firstName || (name ? String(name).trim().split(/\s+/)[0] : undefined),
      middleName: req.body.MiddleName || req.body.middleName || undefined,
      lastName: req.body.LastName || req.body.lastName || (name ? String(name).trim().split(/\s+/).slice(1).join(' ') || undefined : undefined),
      address: req.body.Address || req.body.address || undefined,
      city: req.body.City || req.body.city || req.body.CityName || req.body.cityName || undefined,
      country: req.body.Country || req.body.country || undefined,
      postalCode: req.body.PostalCode || req.body.postalCode || undefined,
      buildingNumber: req.body.BuildingNumber || req.body.buildingNumber || undefined,
      streetName: req.body.StreetName || req.body.streetName || undefined,
      role,
      phoneNumber: PhoneNumber || req.body.phoneNumber || req.body.phone,
      phoneSecondary: req.body.PhoneSecondary || req.body.phoneSecondary || undefined,
      dateOfBirth: dobVal,
      companyName: req.body.CompanyName || req.body.companyName || undefined,
      iban: req.body.Iban || req.body.iban || undefined,
      taxNumber: req.body.TaxNumber || req.body.taxNumber || undefined,
      registryStart: req.body.RegistryStart || req.body.registryStart || undefined,
      registryEnd: req.body.RegistryEnd || req.body.registryEnd || undefined,
      profession: req.body.Profession || req.body.profession || undefined,
      // Uploaded file URLs
      documentUrl: docUrl,
      imageUrl: imgUrl,
      licenseImageUrl: licenseUrl,
    });

    const token = signToken({ id: user._id, role: user.role });
    return res.status(201).json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role, isVerified: user.isVerified } });
  } catch (err) {
    console.error('[register] error:', err);
    // Duplicate key (email unique)
    if ((err && (err.code === 11000 || err.code === '11000')) || /duplicate key/i.test(String(err?.message || ''))) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }
    // Validation-like messages
    const devMsg = process.env.NODE_ENV !== 'production' ? (err?.message || 'Registration failed') : 'Registration failed';
    return res.status(500).json({ success: false, message: devMsg });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || '').toLowerCase() });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    // Some legacy/test users may have been created without a password hash; guard against that
    if (!user.password || typeof user.password !== 'string') {
      return res.status(400).json({ success: false, message: 'Password not set for this account. Please reset your password.' });
    }
    const ok = await bcrypt.compare(String(password || ''), user.password);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const token = signToken({ id: user._id, role: user.role });
    return res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role, isVerified: user.isVerified } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
}

export async function profile(req, res) {
  const fullName = req.user.name || '';
  const parts = String(fullName).trim().split(/\s+/);
  const derivedFirst = parts[0] || '';
  const derivedLast = parts.slice(1).join(' ');
  return res.json({
    id: req.user._id,
    name: fullName,
    firstName: req.user.firstName || derivedFirst,
    middleName: req.user.middleName || '',
    lastName: req.user.lastName || derivedLast,
    address: req.user.address || '',
    city: req.user.city || '',
    country: req.user.country || '',
    postalCode: req.user.postalCode || '',
    buildingNumber: req.user.buildingNumber || '',
    streetName: req.user.streetName || '',
    email: req.user.email,
    role: req.user.role,
    isVerified: !!req.user.isVerified,
    phone: req.user.phoneNumber || '',
    phoneSecondary: req.user.phoneSecondary || '',
    birthdate: req.user.dateOfBirth ? new Date(req.user.dateOfBirth).toISOString() : '',
    companyName: req.user.companyName || '',
    iban: req.user.iban || '',
    taxNumber: req.user.taxNumber || '',
    registryStart: req.user.registryStart || '',
    registryEnd: req.user.registryEnd || '',
    profession: req.user.profession || '',
    documentUrl: req.user.documentUrl || '',
    imageUrl: req.user.imageUrl || '',
    licenseImageUrl: req.user.licenseImageUrl || '',
    profilePicture: req.user.profilePicture || req.user.imageUrl || '',
  });
}

export async function updateProfile(req, res) {
  try {
    const updates = req.body || {};
    ['role', 'password', 'email', 'createdAt', 'updatedAt', '_id'].forEach((k) => delete updates[k]);
    // Map UI fields to model fields
    if (updates.phone) {
      updates.phoneNumber = updates.phone;
      delete updates.phone;
    }
    if (updates.birthdate) {
      const raw = String(updates.birthdate).trim();
      const m1 = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
      const m2 = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      let d;
      if (m1) d = new Date(Date.UTC(Number(m1[1]), Number(m1[2]) - 1, Number(m1[3])));
      else if (m2) {
        const a = Number(m2[1]);
        const b = Number(m2[2]);
        const year = Number(m2[3]);
        const month = (a > 12 ? b : a) - 1;
        const day = a > 12 ? a : b;
        d = new Date(Date.UTC(year, month, day));
      } else d = new Date(raw);
      if (!isNaN(d.getTime())) updates.dateOfBirth = d;
      delete updates.birthdate;
    }
    // Accept first/middle/last and extended address/company fields directly (if present)
    ['firstName','middleName','lastName','address','city','country','postalCode','buildingNumber','streetName','companyName','iban','taxNumber','registryStart','registryEnd','profession','phoneSecondary','name'].forEach(()=>{});
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName || '',
        middleName: user.middleName || '',
        lastName: user.lastName || '',
        address: user.address || '',
        city: user.city || '',
        country: user.country || '',
        email: user.email,
        role: user.role,
        phone: user.phoneNumber || '',
        birthdate: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString() : '',
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Update failed' });
  }
}

export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    const ok = await bcrypt.compare(String(currentPassword || ''), user.password);
    if (!ok) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    user.password = await bcrypt.hash(String(newPassword || ''), 10);
    await user.save();
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Password change failed' });
  }
}

export async function forgotPassword(req, res) {
  // Placeholder: would send email with reset token
  return res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
}

export async function resetPassword(req, res) {
  try {
    const { email, newPassword } = req.body || {};
    const em = String(email || '').toLowerCase();
    if (!em || !newPassword) {
      return res.status(400).json({ success: false, message: 'email and newPassword are required' });
    }
    const user = await User.findOne({ email: em });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.password = await bcrypt.hash(String(newPassword), 10);
    await user.save();
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Reset failed' });
  }
}

export async function deleteAccount(req, res) {
  try {
    if (!req.user?._id) return res.status(401).json({ success: false, message: 'Not authorized' });
    const uid = req.user._id;
    // Soft-archive related domain entities (best-effort)
    try { const { Offer } = await import('../models/Offer.js'); await Offer.updateMany({ technicianId: uid }, { $set: { archived: true } }); } catch {}
    try { const { Project } = await import('../models/Project.js'); await Project.updateMany({ customerId: uid }, { $set: { archived: true } }); } catch {}
    try { const { Order } = await import('../models/Order.js'); await Order.updateMany({ $or: [{ customerId: uid }, { vendorId: uid }] }, { $set: { archived: true } }); } catch {}
    // Clean up simple per-user docs (delete small aggregates)
    try { const { Cart } = await import('../models/Cart.js'); await Cart.deleteOne({ userId: uid }); } catch {}
    try { const { Wishlist } = await import('../models/Wishlist.js'); await Wishlist.deleteOne({ userId: uid }); } catch {}
    try { const { Address } = await import('../models/Address.js'); await Address.deleteMany({ userId: uid }); } catch {}
    // Finally remove the user
    await User.findByIdAndDelete(uid);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to delete account' });
  }
}
