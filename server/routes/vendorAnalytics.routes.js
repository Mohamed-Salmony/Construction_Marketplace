import express from 'express';
import { protect, requireRoles } from '../middlewares/auth.js';
import { performanceSummary, performanceSeries, customersSummary, customersSeries, topProducts, categoriesSales } from '../controllers/vendorAnalytics.controller.js';

const router = express.Router();

router.get('/performance/summary', protect, requireRoles('Merchant', 'Admin'), performanceSummary);
router.get('/performance/series', protect, requireRoles('Merchant', 'Admin'), performanceSeries);
router.get('/customers/summary', protect, requireRoles('Merchant', 'Admin'), customersSummary);
router.get('/customers/series', protect, requireRoles('Merchant', 'Admin'), customersSeries);
router.get('/products/top', protect, requireRoles('Merchant', 'Admin'), topProducts);
router.get('/categories/sales', protect, requireRoles('Merchant', 'Admin'), categoriesSales);

export default router;
