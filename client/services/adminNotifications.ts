import { api } from '@/lib/api';
import { getPendingMerchants, getUsers, getPendingProducts } from './admin';
import { getAdminPendingServices } from './services';

// Admin notification types for pending items
export interface AdminNotification {
  id: string;
  type: 'pending_merchant' | 'pending_technician' | 'pending_product' | 'pending_service';
  title: string;
  message: string;
  count: number;
  page: string; // Which admin page to navigate to
  createdAt: string;
}

// Get all pending items that need admin approval
export async function getAdminPendingNotifications(): Promise<AdminNotification[]> {
  const notifications: AdminNotification[] = [];
  
  try {
    // Get pending merchants
    const merchantsRes = await getPendingMerchants();
    if (merchantsRes.ok && merchantsRes.data && Array.isArray((merchantsRes.data as any).items)) {
      const count = (merchantsRes.data as any).items.length;
      if (count > 0) {
        notifications.push({
          id: 'pending_merchants',
          type: 'pending_merchant',
          title: 'تجار قيد الاعتماد',
          message: `يوجد ${count} تاجر${count > 1 ? ' جديد' : ''} بانتظار الاعتماد`,
          count,
          page: 'admin-dashboard',
          createdAt: new Date().toISOString()
        });
      }
    }

    // Get pending technicians
    const techRes = await getUsers({ role: 'Technician' });
    if (techRes.ok && techRes.data && Array.isArray((techRes.data as any).items)) {
      const pending = (techRes.data as any).items.filter((u: any) => !u.isVerified || !u.isActive);
      if (pending.length > 0) {
        notifications.push({
          id: 'pending_technicians',
          type: 'pending_technician', 
          title: 'فنيين قيد الاعتماد',
          message: `يوجد ${pending.length} فني${pending.length > 1 ? ' جديد' : ''} بانتظار الاعتماد`,
          count: pending.length,
          page: 'admin-dashboard',
          createdAt: new Date().toISOString()
        });
      }
    }

    // Get pending products
    const productsRes = await getPendingProducts();
    if (productsRes.ok && productsRes.data && Array.isArray((productsRes.data as any).items)) {
      const count = (productsRes.data as any).items.length;
      if (count > 0) {
        notifications.push({
          id: 'pending_products',
          type: 'pending_product',
          title: 'منتجات قيد الاعتماد',
          message: `يوجد ${count} منتج${count > 1 ? ' جديد' : ''} بانتظار الاعتماد`,
          count,
          page: 'admin-dashboard',
          createdAt: new Date().toISOString()
        });
      }
    }

    // Get pending services
    const servicesRes = await getAdminPendingServices();
    if (servicesRes.ok && servicesRes.data && Array.isArray((servicesRes.data as any).items)) {
      const count = (servicesRes.data as any).items.length;
      if (count > 0) {
        notifications.push({
          id: 'pending_services',
          type: 'pending_service',
          title: 'خدمات قيد الاعتماد', 
          message: `يوجد ${count} خدمة${count > 1 ? ' جديدة' : ''} بانتظار الاعتماد`,
          count,
          page: 'admin-dashboard',
          createdAt: new Date().toISOString()
        });
      }
    }

  } catch (error) {
    console.error('Error fetching admin notifications:', error);
  }

  
  // If no pending items, add a welcome message
  if (notifications.length === 0) {
    notifications.push({
      id: 'admin_welcome',
      type: 'pending_merchant',
      title: 'لوحة الإدارة',
      message: 'لا توجد عناصر معلقة للموافقة حالياً',
      count: 0,
      page: 'admin-dashboard',
      createdAt: new Date().toISOString()
    });
  }

  return notifications;
}

// Get total count of pending items
export async function getAdminPendingCount(): Promise<number> {
  const notifications = await getAdminPendingNotifications();
  return notifications.reduce((total, notif) => total + notif.count, 0);
}
