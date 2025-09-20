import { User } from '../models/User.js';

// Map server User document to AdminListUser shape expected by client
function mapUser(u) {
  const roles = [u.role || 'User'];
  return {
    id: String(u._id),
    name: u.name || [u.firstName, u.lastName].filter(Boolean).join(' ') || '',
    email: u.email || '',
    phoneNumber: u.phoneNumber || '',
    roles,
    isActive: !!u.isActive,
    isVerified: !!u.isVerified,
    createdAt: u.createdAt ? u.createdAt.toISOString() : null,
    companyName: u.companyName || null,
    city: u.city || null,
    country: u.country || null,
  };
}

// GET /api/Admin/users?role=&status=
export async function adminListUsers(req, res) {
  const { role, status } = req.query || {};
  const q = {};
  // Role filter (Admin | Merchant | Technician | Customer)
  if (role) {
    // Treat 'Technician' filter as both 'Technician' and legacy 'Worker'
    if (String(role) === 'Technician') q.role = { $in: ['Technician', 'Worker'] };
    else q.role = role;
  }
  // Status mapping
  if (status) {
    const s = String(status).toLowerCase();
    if (s === 'active') { q.isActive = true; q.isVerified = true; }
    else if (s === 'pending') { q.isVerified = false; }
    else if (s === 'suspended' || s === 'banned') { q.isActive = false; }
  }
  const users = await User.find(q).sort({ createdAt: -1 }).limit(500);
  res.json({ success: true, items: users.map(mapUser) });
}

// POST /api/Admin/users/:id/status { status }
export async function adminSetUserStatus(req, res) {
  const { status } = req.body || {};
  const s = String(status || '').toLowerCase();
  const update = {};
  if (s === 'active') { update.isActive = true; update.isVerified = true; }
  else if (s === 'pending') { update.isVerified = false; }
  else if (s === 'suspended' || s === 'banned') { update.isActive = false; }
  const u = await User.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!u) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true });
}

// POST /api/Admin/users
export async function adminCreateUser(req, res) {
  const body = req.body || {};
  const role = body.role || 'Customer';
  const name = body.firstName || body.lastName ? `${body.firstName || ''} ${body.lastName || ''}`.trim() : body.name;
  const created = await User.create({
    firstName: body.firstName || '',
    middleName: body.middleName || '',
    lastName: body.lastName || '',
    name: name || '',
    email: body.email,
    password: body.password || 'changeme',
    role,
    phoneNumber: body.phoneNumber || '',
    companyName: body.companyName || '',
    city: body.city || '',
    country: body.country || '',
    isActive: true,
    isVerified: role === 'Admin' ? true : false,
  });
  res.status(201).json({ success: true, id: String(created._id) });
}

// PUT /api/Admin/users/:id
export async function adminUpdateUser(req, res) {
  const body = req.body || {};
  const update = {
    firstName: body.firstName,
    middleName: body.middleName,
    lastName: body.lastName,
    phoneNumber: body.phoneNumber,
    companyName: body.companyName,
    city: body.city,
    country: body.country,
  };
  if (body.role) update.role = body.role;
  const u = await User.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!u) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true });
}

// DELETE /api/Admin/users/:id
export async function adminDeleteUser(req, res) {
  const u = await User.findByIdAndDelete(req.params.id);
  if (!u) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true });
}

// GET /api/Admin/users/:id
export async function adminGetUserById(req, res) {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ success: false, message: 'User not found' });
  // Return full details needed by the admin UI
  const item = {
    id: String(u._id),
    name: u.name || [u.firstName, u.lastName].filter(Boolean).join(' '),
    email: u.email || null,
    phoneNumber: u.phoneNumber || null,
    phoneSecondary: u.phoneSecondary || null,
    roles: [u.role].filter(Boolean),
    isActive: !!u.isActive,
    isVerified: !!u.isVerified,
    createdAt: u.createdAt ? u.createdAt.toISOString() : null,
    companyName: u.companyName || null,
    city: u.city || null,
    country: u.country || null,
    firstName: u.firstName || null,
    middleName: u.middleName || null,
    lastName: u.lastName || null,
    taxNumber: u.taxNumber || u.vatNumber || u.taxId || u.tax_id || null,
    profession: u.profession || null,
    iban: u.iban || u.IBAN || u.ibanNumber || null,
    registryStart: u.registryStart || u.registryStartDate || u.commercialRegisterStart || null,
    registryEnd: u.registryEnd || u.registryEndDate || u.commercialRegisterEnd || null,
    address: u.address || null,
    buildingNumber: u.buildingNumber || null,
    streetName: u.streetName || null,
    postalCode: u.postalCode || null,
    dateOfBirth: u.dateOfBirth ? (u.dateOfBirth.toISOString ? u.dateOfBirth.toISOString() : String(u.dateOfBirth)) : null,
    // Media fields (both canonical and aliases for frontend compatibility)
    profilePicture: u.profilePicture || null,
    profileImageUrl: u.profileImageUrl || u.profilePictureUrl || null,
    imageUrl: u.imageUrl || u.photoUrl || null,
    documentUrl: u.documentUrl || u.document || null,
    documentPath: u.documentUrl || u.documentPath || u.document || null,
    licenseImageUrl: u.licenseImageUrl || u.licenseImage || null,
    licenseImagePath: u.licenseImageUrl || u.licenseImagePath || u.licenseImage || null,
    documents: Array.isArray(u.documents)
      ? u.documents.map(d => ({
          url: d?.url || null,
          path: d?.path || null,
          name: d?.name || null,
          type: d?.type || null,
        }))
      : [],
    rating: null,
    reviewCount: null,
  };
  res.json({ success: true, item });
}
