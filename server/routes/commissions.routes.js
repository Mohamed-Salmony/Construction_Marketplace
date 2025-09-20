import express from 'express';
import { protect, requireRoles } from '../middlewares/auth.js';

const router = express.Router();

router.get('/rates', protect, requireRoles('Admin', 'Merchant'), (req, res) => {
  res.json({
    success: true,
    rates: {
      products: 0.05,
      projectsMerchants: 0.07,
      servicesTechnicians: 0.03,
      currency: 'SAR',
    },
  });
});

export default router;
