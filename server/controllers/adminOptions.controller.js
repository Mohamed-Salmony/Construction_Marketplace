import { AdminOption } from '../models/AdminOption.js';

export async function getOption(req, res) {
  const key = req.params.key;
  const found = await AdminOption.findOne({ key });
  
  // Default values for commission rates (as percentage)
  const defaults = {
    'commission_products': '5',
    'commission_projects_merchants': '7', 
    'commission_services_technicians': '3',
    'commission_rentals_merchants': '5'
  };
  
  let value = found?.value ?? '';
  
  // If no value exists and it's a commission key, create default
  if (!value && defaults[key]) {
    value = defaults[key];
    // Create the default value in database
    try {
      await AdminOption.findOneAndUpdate({ key }, { value }, { upsert: true });
    } catch (error) {
      console.error('Error creating default commission value:', error);
    }
  }
  
  res.json({ key, value });
}

export async function setOption(req, res) {
  try {
    const key = req.params.key;

    // Accept both primitive payloads and object { value }
    const incoming = (req && typeof req.body === 'object' && req.body !== null && Object.prototype.hasOwnProperty.call(req.body, 'value'))
      ? req.body.value
      : req.body;

    let value;
    if (typeof incoming === 'number') {
      value = String(incoming);
    } else if (typeof incoming === 'string') {
      value = incoming;
    } else if (incoming === null || incoming === undefined) {
      value = '0';
    } else {
      // If an unexpected object/array is sent, try to coerce to number, else stringify
      const maybe = Number(incoming);
      value = Number.isFinite(maybe) ? String(maybe) : JSON.stringify(incoming);
    }

    // Normalize trimming
    value = (String(value || '')).trim();
    if (!value) value = '0';

    // Additional validation for commission keys (0-100 inclusive)
    if (key && key.startsWith('commission_')) {
      const numValue = Number(value);
      if (!Number.isFinite(numValue)) {
        return res.status(400).json({ success: false, message: 'Invalid commission value (not a number)' });
      }
      if (numValue < 0 || numValue > 100) {
        return res.status(400).json({ success: false, message: 'Commission must be between 0 and 100' });
      }
      // store normalized integer/decimal as string
      value = String(numValue);
    }

    const result = await AdminOption.findOneAndUpdate(
      { key },
      { $set: { key, value } },
      { upsert: true, new: true }
    );
    res.status(200).json({
      success: true,
      key: result.key,
      value: result.value,
      message: 'Option saved successfully'
    });
  
  } catch (error) {
    console.error('Error in setOption:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
