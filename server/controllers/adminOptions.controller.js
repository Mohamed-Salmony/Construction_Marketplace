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
    
    console.log('setOption received:', {
      key,
      body: req.body,
      type: typeof req.body,
      rawBody: JSON.stringify(req.body),
      headers: req.headers['content-type']
    });
    
    // Handle the value based on the actual data received
    let value;
    
    // The client now sends numbers directly for commission values
    if (typeof req.body === 'number') {
      value = String(req.body);
    }
    // If it's a string, use it directly
    else if (typeof req.body === 'string') {
      value = req.body;
    }
    // For commission values, handle null/undefined/NaN
    else if (req.body === null || req.body === undefined || Number.isNaN(req.body)) {
      console.log('Invalid value received, using default 0');
      value = '0';
    }
    // If it's an object/array, stringify it
    else if (typeof req.body === 'object' && req.body !== null) {
      value = JSON.stringify(req.body);
    }
    // For anything else, use string representation
    else {
      value = String(req.body || '0');
    }
    
    // Additional validation for commission keys
    if (key && key.startsWith('commission_')) {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < 0 || numValue > 100) {
        console.log(`Invalid commission value ${value}, using 0`);
        value = '0';
      }
    }
    
    console.log(`Storing AdminOption: ${key} = "${value}"`);
    
    // Save to database
    const result = await AdminOption.findOneAndUpdate(
      { key }, 
      { $set: { key, value } }, 
      { upsert: true, new: true }
    );
    
    console.log('AdminOption saved successfully:', { key: result.key, value: result.value });
    
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
