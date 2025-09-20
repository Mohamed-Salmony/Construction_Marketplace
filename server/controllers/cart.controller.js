import { Cart } from '../models/Cart.js';

function calc(cart) {
  const total = (cart.items || []).reduce((s, it) => s + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
  return { items: cart.items || [], total };
}

export async function getCart(req, res) {
  const cart = await Cart.findOne({ userId: req.user._id }) || await Cart.create({ userId: req.user._id, items: [] });
  res.json(calc(cart));
}

export async function addItem(req, res) {
  const { id, quantity, price, name, brand, image } = req.body || {};
  let cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) cart = await Cart.create({ userId: req.user._id, items: [] });
  const idx = cart.items.findIndex((x) => String(x.productId) === String(id));
  if (idx >= 0) {
    cart.items[idx].quantity = Number(cart.items[idx].quantity) + Number(quantity || 1);
    if (price != null) cart.items[idx].price = Number(price);
    // Fill missing meta if provided
    if (!cart.items[idx].name && name) cart.items[idx].name = String(name);
    if (!cart.items[idx].brand && brand) cart.items[idx].brand = String(brand);
    if (!cart.items[idx].image && image) cart.items[idx].image = String(image);
  } else {
    cart.items.push({
      productId: id,
      quantity: Number(quantity || 1),
      price: Number(price || 0),
      name: name ? String(name) : undefined,
      brand: brand ? String(brand) : undefined,
      image: image ? String(image) : undefined,
    });
  }
  await cart.save();
  res.json(calc(cart));
}

export async function updateItemQuantity(req, res) {
  const { id } = req.params;
  const { quantity } = req.body || {};
  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) return res.json({ items: [], total: 0 });
  const idx = cart.items.findIndex((x) => String(x.productId) === String(id));
  if (idx >= 0) {
    cart.items[idx].quantity = Math.max(0, Number(quantity || 0));
    if (cart.items[idx].quantity === 0) cart.items.splice(idx, 1);
    await cart.save();
  }
  res.json(calc(cart));
}

export async function removeItem(req, res) {
  const { id } = req.params;
  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) return res.json({ items: [], total: 0 });
  cart.items = (cart.items || []).filter((x) => String(x.productId) !== String(id));
  await cart.save();
  res.json(calc(cart));
}

export async function clearCart(req, res) {
  let cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) cart = await Cart.create({ userId: req.user._id, items: [] });
  cart.items = [];
  await cart.save();
  res.json(calc(cart));
}
