import express from 'express';
import { protect, requireRoles } from '../middlewares/auth.js';
import { AdminOption } from '../models/AdminOption.js';

const router = express.Router();

router.get('/rates', protect, requireRoles('Admin', 'Merchant', 'Technician'), async (req, res) => {
  try {
    // Get commission rates from AdminOptions
    const [products, projectsMerchants, servicesTechnicians, rentalsMerchants] = await Promise.all([
      AdminOption.findOne({ key: 'commission_products' }),
      AdminOption.findOne({ key: 'commission_projects_merchants' }),
      AdminOption.findOne({ key: 'commission_services_technicians' }),
      AdminOption.findOne({ key: 'commission_rentals_merchants' }),
    ]);

    const parseRate = (option) => {
      try {
        return Number(JSON.parse(option?.value || '0')) / 100; // Convert percentage to decimal
      } catch {
        return 0;
      }
    };

    res.json({
      success: true,
      rates: {
        products: parseRate(products),
        projectsMerchants: parseRate(projectsMerchants),
        servicesTechnicians: parseRate(servicesTechnicians),
        rentalsMerchants: parseRate(rentalsMerchants),
        currency: 'SAR',
      },
    });
  } catch (error) {
    console.error('Commission rates error:', error);
    // Fallback to default rates
    res.json({
      success: true,
      rates: {
        products: 0.05,
        projectsMerchants: 0.07,
        servicesTechnicians: 0.03,
        rentalsMerchants: 0.05,
        currency: 'SAR',
      },
    });
  }
});

export default router;
