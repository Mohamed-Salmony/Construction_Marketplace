import { User } from '../models/User.js';

// List merchants pending verification (not verified)
export async function adminListPendingMerchants(req, res) {
  const items = await User.find({ role: 'Merchant', isVerified: false }).select({
    _id: 1,
    email: 1,
    name: 1,
    companyName: 1,
    createdAt: 1,
  });
  const result = items.map((u) => ({
    id: String(u._id),
    email: u.email,
    name: u.name || '',
    companyName: u.companyName || '',
    createdAt: u.createdAt,
  }));
  res.json({ success: true, items: result });
}

// Approve merchant: mark verified and active
export async function adminApproveMerchant(req, res) {
  const { id } = req.params;
  const updated = await User.findOneAndUpdate(
    { _id: id, role: 'Merchant' },
    { isVerified: true, isActive: true },
    { new: true }
  );
  if (!updated) return res.status(404).json({ success: false, message: 'Merchant not found' });
  res.json({ success: true });
}

// Suspend merchant: mark inactive (keep verified state)
export async function adminSuspendMerchant(req, res) {
  const { id } = req.params;
  const updated = await User.findOneAndUpdate(
    { _id: id, role: 'Merchant' },
    { isActive: false },
    { new: true }
  );
  if (!updated) return res.status(404).json({ success: false, message: 'Merchant not found' });
  res.json({ success: true });
}
