import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export async function protect(req, res, next) {
  try {
    let token;
    const auth = req.headers.authorization || req.headers.Authorization;
    if (auth && String(auth).startsWith('Bearer ')) {
      token = String(auth).slice(7);
    }
    // Accept several cookie names commonly used
    if (!token && req.cookies) {
      token = req.cookies.auth_token
        || req.cookies.token
        || req.cookies.access_token
        || req.cookies.Authorization;
    }
    if (!token) {
      res.setHeader('WWW-Authenticate', 'Bearer');
      return res.status(401).json({ success: false, message: 'Not authorized: token missing' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'changeme-secret');
    } catch (e) {
      const name = e?.name || '';
      if (name === 'TokenExpiredError') {
        res.setHeader('WWW-Authenticate', 'Bearer error="invalid_token", error_description="token expired"');
        return res.status(401).json({ success: false, message: 'Token expired' });
      }
      if (name === 'JsonWebTokenError') {
        res.setHeader('WWW-Authenticate', 'Bearer error="invalid_token"');
        return res.status(401).json({ success: false, message: 'Invalid token' });
      }
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    try {
      req.user = await User.findById(decoded.id).select('-password');
    } catch {
      req.user = null;
    }
    if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
    next();
  } catch (err) {
    // Ensure we never crash on auth errors
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
}

export function requireRoles(...roles) {
  // Technician = Worker alias rule
  const norm = (r) => {
    if (!r) return r;
    const x = String(r);
    if (x.toLowerCase() === 'technician') return 'Worker';
    return x;
  };
  const required = roles.map(norm);
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
    const userRoles = [];
    if (Array.isArray(req.user.roles)) userRoles.push(...req.user.roles);
    if (req.user.role) userRoles.push(req.user.role);
    const normalizedUser = userRoles.map(norm);
    const allowed = normalizedUser.some((ur) => required.includes(ur));
    if (!allowed) return res.status(403).json({ success: false, message: 'Forbidden' });
    next();
  };
}
