export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

export function validatePasswordMin(password: string, min = 6): boolean {
  return typeof password === 'string' && password.length >= min;
}
