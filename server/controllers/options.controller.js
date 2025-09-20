import { AdminOption } from '../models/AdminOption.js';

export async function getPublicOption(req, res) {
  const key = req.params.key;
  const found = await AdminOption.findOne({ key });
  res.json({ key, value: found?.value ?? '' });
}
