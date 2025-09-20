import jwt from 'jsonwebtoken';

export function signToken(payload, expiresIn = process.env.JWT_EXPIRE_DAYS ? `${process.env.JWT_EXPIRE_DAYS}d` : '7d') {
  const secret = process.env.JWT_SECRET || 'changeme-secret';
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyToken(token) {
  const secret = process.env.JWT_SECRET || 'changeme-secret';
  return jwt.verify(token, secret);
}
