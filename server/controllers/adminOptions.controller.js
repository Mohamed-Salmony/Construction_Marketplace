import { AdminOption } from '../models/AdminOption.js';

export async function getOption(req, res) {
  const key = req.params.key;
  const found = await AdminOption.findOne({ key });
  res.json({ key, value: found?.value ?? '' });
}

export async function setOption(req, res) {
  const key = req.params.key;
  const value = typeof req.body === 'object' ? JSON.stringify(req.body) : String(req.body ?? '');
  await AdminOption.findOneAndUpdate({ key }, { value }, { upsert: true });
  res.json({ success: true });
}
