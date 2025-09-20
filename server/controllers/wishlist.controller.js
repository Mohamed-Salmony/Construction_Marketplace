import { Wishlist } from '../models/Wishlist.js';

export async function getWishlist(req, res) {
  const wl = await Wishlist.findOne({ userId: req.user._id }) || await Wishlist.create({ userId: req.user._id, items: [] });
  res.json(wl.items.map(x => ({ id: x._id, productId: x.productId, createdAt: x.createdAt })));
}

export async function addToWishlist(req, res) {
  const raw = (req.params && req.params.productId) || (req.body && (req.body.productId || req.body.id));
  const productId = String(raw ?? '').trim();
  if (!productId) return res.status(400).json({ success: false, message: 'productId required' });
  let wl = await Wishlist.findOne({ userId: req.user._id });
  if (!wl) wl = await Wishlist.create({ userId: req.user._id, items: [] });
  if (!wl.items.find(x => String(x.productId) === String(productId))) {
    wl.items.push({ productId });
    await wl.save();
  }
  res.json({ success: true });
}

export async function removeFromWishlist(req, res) {
  const raw = (req.params && req.params.productId) || (req.body && (req.body.productId || req.body.id));
  const productId = String(raw ?? '').trim();
  if (!productId) return res.json({ success: true });
  const wl = await Wishlist.findOne({ userId: req.user._id });
  if (!wl) return res.json({ success: true });
  wl.items = wl.items.filter(x => String(x.productId) !== String(productId));
  await wl.save();
  res.json({ success: true });
}

export async function toggleWishlist(req, res) {
  try {
    const raw = (req.params && req.params.productId) || (req.body && (req.body.productId || req.body.id));
    const productId = String(raw ?? '').trim();
    console.log('[wishlist.toggle] user=', String(req.user?._id || 'guest'), 'pid=', productId, 'params=', req.params, 'body=', req.body);
    if (!productId || productId === 'undefined' || productId === 'null') {
      return res.status(400).json({ success: false, message: `productId required (got: "${productId}")` });
    }
    let wl = await Wishlist.findOne({ userId: req.user._id });
    if (!wl) wl = await Wishlist.create({ userId: req.user._id, items: [] });
    const exists = wl.items.find((x) => String(x.productId) === String(productId));
    if (exists) {
      wl.items = wl.items.filter((x) => String(x.productId) !== String(productId));
      await wl.save();
      return res.json({ success: true, inWishlist: false });
    } else {
      wl.items.push({ productId });
      await wl.save();
      return res.json({ success: true, inWishlist: true });
    }
  } catch (e) {
    console.error('[wishlist.toggle] error', e);
    return res.status(500).json({ success: false, message: 'Failed to toggle wishlist' });
  }
}
