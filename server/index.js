import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db.js';
import { configureCloudinary } from './config/cloudinary.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Routes
import authRoutes from './routes/auth.routes.js';
import uploadRoutes from './routes/uploads.routes.js';
import productsRoutes from './routes/products.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import vendorsRoutes from './routes/vendors.routes.js';
import adminRoutes from './routes/admin.routes.js';
import adminOptionsRoutes from './routes/adminOptions.routes.js';
import optionsRoutes from './routes/options.routes.js';
import projectsRoutes from './routes/projects.routes.js';
import projectsAdminRoutes from './routes/projectsAdmin.routes.js';
import offersRoutes from './routes/offers.routes.js';
import servicesRoutes from './routes/services.routes.js';
import rentalsRoutes from './routes/rentals.routes.js';
import addressesRoutes from './routes/addresses.routes.js';
import cartRoutes from './routes/cart.routes.js';
import wishlistRoutes from './routes/wishlist.routes.js';
import chatRoutes from './routes/chat.routes.js';
import projectChatRoutes from './routes/projectChat.routes.js';
import vendorAnalyticsRoutes from './routes/vendorAnalytics.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import commissionsRoutes from './routes/commissions.routes.js';
import techniciansRoutes from './routes/technicians.routes.js';
import reviewsRoutes from './routes/reviews.routes.js';

import { errorHandler, notFound } from './middlewares/error.js';
import { seedAdmin, seedCategories } from './utils/seed.js';

dotenv.config();
configureCloudinary();

const app = express();

// Global error visibility to diagnose startup crashes
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

// CORS
// Normalize multiple leading slashes in incoming URLs to avoid 404s from paths like //api/...
app.use((req, _res, next) => {
  try {
    const original = req.url || '';
    // Collapse only leading double slashes (do not touch query/body)
    const normalized = original.replace(/^\/{2,}/, '/');
    req.url = normalized;
  } catch {}
  next();
});

// CORS
// Configure allowed origins via env, fallback to common localhost URLs
const allowedOrigins = (() => {
  const csv = process.env.ALLOWED_ORIGINS || '';
  const base = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://localhost:3000',
    'https://127.0.0.1:3000',
  ];
  const extra = csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const set = new Set([...base, ...extra]);
  return Array.from(set);
})();

const corsOptions = {
  origin: (origin, cb) => {
    try {
      // Emergency/temporary switch to allow all origins (reflect request origin)
      if (String(process.env.ALLOW_ALL_ORIGINS || '').toLowerCase() === 'true') {
        return cb(null, true);
      }
      // Allow requests with no origin (e.g., mobile apps, curl, Postman)
      if (!origin) return cb(null, true);

      // Helper: match explicit or wildcard patterns provided in ALLOWED_ORIGINS
      const matchOrigin = (value, patterns) => {
        for (const p of patterns) {
          if (!p) continue;
          if (p === value) return true;
          if (p.includes('*')) {
            // Convert simple wildcard to RegExp
            const regex = new RegExp('^' + p
              .replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&')
              .replace(/\\\*/g, '.*') + '$');
            if (regex.test(value)) return true;
          }
        }
        return false;
      };

      if (matchOrigin(origin, allowedOrigins)) return cb(null, true);

      // Additionally allow relaxed dev mode
      if (process.env.NODE_ENV !== 'production') return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    } catch (e) {
      // On parsing errors, fail open in dev
      if (process.env.NODE_ENV !== 'production') return cb(null, true);
      return cb(e);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
// Explicitly handle preflight requests for all routes
app.options('*', cors(corsOptions));

// Security
// In development, relax some Helmet policies that can interfere with cross-origin API calls
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: false,
}));
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
});
app.use(limiter);

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// DB
try {
  await connectDB();
} catch (e) {
  console.error('[startup] DB connection failed:', e);
  process.exit(1);
}
// Dev data seeders (create static Admin if configured)
try {
  if (process.env.SEED_ADMIN === 'true' || (process.env.NODE_ENV !== 'production' && process.env.SEED_ADMIN !== 'false')) {
    try { await seedAdmin(); } catch (e) { console.warn('[seed] admin seeding skipped:', e?.message || e); }
  }
  // Optionally seed default Categories for development/testing
  if (process.env.SEED_CATEGORIES === 'true' || (process.env.NODE_ENV !== 'production' && process.env.SEED_CATEGORIES !== 'false')) {
    try { await seedCategories(); } catch (e) { console.warn('[seed] categories seeding skipped:', e?.message || e); }
  }
} catch (e) {
  console.warn('[startup] seeders errored:', e?.message || e);
}

// Health
app.get('/health', (req, res) => res.json({ ok: true, service: 'construction-marketplace-backend' }));

// Root welcome (prevents 404 on GET /)
app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'Construction Marketplace API',
    docs: '/api',
    health: '/health',
  });
});

// Quiet the favicon 404s
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Mount routes (prefix /api)
app.use('/api/Auth', authRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/Products', productsRoutes);
app.use('/api/Categories', categoriesRoutes);
app.use('/api/Orders', ordersRoutes);
app.use('/api/Vendors', vendorsRoutes);
app.use('/api/Admin', adminRoutes);
app.use('/api/AdminOptions', adminOptionsRoutes);
app.use('/api/Options', optionsRoutes);
app.use('/api/Projects', projectsRoutes);
app.use('/api/ProjectsAdmin', projectsAdminRoutes);
app.use('/api/Offers', offersRoutes);
app.use('/api/Services', servicesRoutes);
app.use('/api/Rentals', rentalsRoutes);
app.use('/api/Addresses', addressesRoutes);
app.use('/api/Cart', cartRoutes);
app.use('/api/Wishlist', wishlistRoutes);
app.use('/api/Chat', chatRoutes);
app.use('/api/ProjectChat', projectChatRoutes);
app.use('/api/VendorAnalytics', vendorAnalyticsRoutes);
app.use('/api/commissions', commissionsRoutes);
app.use('/api/Technicians', techniciansRoutes);
app.use('/api/Notifications', notificationsRoutes);
app.use('/api/Reviews', reviewsRoutes);

// 404 and error
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
try {
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
} catch (e) {
  console.error('[startup] failed to listen:', e);
  process.exit(1);
}
