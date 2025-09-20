export type AdminUserStatus = 'active' | 'pending' | 'suspended' | 'banned';
export type AdminRole = 'customer' | 'vendor' | 'technician' | 'admin';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: AdminRole;
  status: AdminUserStatus;
  joinDate: string;
  location: string;
  orders: number;
  totalSpent: string;
}

const STORAGE_KEY = 'admin_users_store_v1';

const SEED_USERS: AdminUser[] = [
  { id: 1, name: 'محمد العلي', email: 'mohammed@example.com', phone: '+966501234567', role: 'customer', status: 'active', joinDate: '2024-01-15', location: 'الرياض', orders: 12, totalSpent: '15,400 ر.س' },
  { id: 2, name: 'فاطمة أحمد', email: 'fatima@example.com', phone: '+966507654321', role: 'vendor', status: 'pending', joinDate: '2024-01-14', location: 'جدة', orders: 0, totalSpent: '0 ر.س' },
  { id: 3, name: 'علي محمود', email: 'ali@example.com', phone: '+966501122334', role: 'technician', status: 'active', joinDate: '2024-01-13', location: 'الدمام', orders: 8, totalSpent: '8,200 ر.س' },
  { id: 4, name: 'نورا السالم', email: 'nora@example.com', phone: '+966505566778', role: 'customer', status: 'suspended', joinDate: '2024-01-12', location: 'مكة', orders: 25, totalSpent: '32,100 ر.س' },
  { id: 5, name: 'خالد الأحمد', email: 'khalid@example.com', phone: '+966503344556', role: 'vendor', status: 'active', joinDate: '2024-01-11', location: 'المدينة', orders: 45, totalSpent: '67,800 ر.س' }
];

function read(): AdminUser[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as AdminUser[];
    return null;
  } catch {
    return null;
  }
}

function write(users: AdminUser[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(users)); } catch {}
}

export function getAdminUsers(): AdminUser[] {
  const existing = read();
  if (existing && existing.length) return existing;
  write(SEED_USERS);
  return [...SEED_USERS];
}

export function saveAdminUsers(users: AdminUser[]) {
  write(users);
}

export function addAdminUser(data: Omit<AdminUser, 'id' | 'joinDate'> & { joinDate?: string }): AdminUser {
  const users = getAdminUsers();
  const id = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
  const user: AdminUser = { id, joinDate: data.joinDate || new Date().toISOString().slice(0,10), ...data };
  users.push(user);
  saveAdminUsers(users);
  return user;
}

export function updateAdminUser(id: number, patch: Partial<AdminUser>): AdminUser | null {
  const users = getAdminUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...patch, id: users[idx].id };
  saveAdminUsers(users);
  return users[idx];
}

export function deleteAdminUser(id: number): boolean {
  const users = getAdminUsers();
  const next = users.filter(u => u.id !== id);
  const changed = next.length !== users.length;
  if (changed) saveAdminUsers(next);
  return changed;
}

export function setAdminUserStatus(id: number, status: AdminUserStatus): AdminUser | null {
  return updateAdminUser(id, { status });
}
