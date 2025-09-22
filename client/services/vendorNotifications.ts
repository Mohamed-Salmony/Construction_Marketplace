import { api } from '@/lib/api';
import { safeAsync, handleApiError } from '../utils/errorHandler';

// Vendor notification types
export interface VendorNotification {
  id: string;
  type: 'bid_accepted' | 'bid_rejected' | 'new_project_match' | 'payment_received' | 'order_placed' | 'product_approved' | 'product_rejected' | 'rental_request' | 'rental_payment' | 'project_update' | 'message_received';
  title: string;
  message: string;
  data?: any;
  page?: string; // Which page to navigate to
  createdAt: string;
  isRead: boolean;
}

// Get vendor-specific notifications
export async function getVendorNotifications(): Promise<VendorNotification[]> {
  const notifications: VendorNotification[] = [];
  
  try {
    // Safe wrapper to prevent any API errors from crashing the app
    // Get vendor's orders using the working endpoint
    const ordersData = await safeAsync(async () => {
      const ordersRes = await api.get('/api/Orders?vendorId=me', { auth: true });
      return ordersRes.ok && ordersRes.data ? (ordersRes.data as any).items || [] : [];
    }, [], 'Vendor Orders API');

    if (ordersData && Array.isArray(ordersData)) {
      ordersData.slice(0, 3).forEach((order: any) => {
        if (order.status === 'Pending' || order.status === 'Confirmed') {
          notifications.push({
            id: `order_${order.id}_${Date.now()}`,
            type: 'order_placed',
            title: 'طلب جديد! 📦',
            message: `تم طلب منتجاتك بقيمة ${new Intl.NumberFormat().format(order.total || 0)} ر.س`,
            data: { orderId: order.id },
            page: 'vendor-orders',
            createdAt: order.createdAt || new Date().toISOString(),
            isRead: false
          });
        }

        if (order.status === 'Paid') {
          notifications.push({
            id: `payment_${order.id}_${Date.now()}`,
            type: 'payment_received',
            title: 'تم استلام الدفع 💰',
            message: `تم استلام دفع بقيمة ${new Intl.NumberFormat().format(order.total || 0)} ر.س للطلب رقم ${order.orderNumber || order.id}`,
            data: { orderId: order.id },
            page: 'vendor-orders',
            createdAt: order.paidAt || order.updatedAt || new Date().toISOString(),
            isRead: false
          });
        }
      });
    }

    // Get vendor's products using the working endpoint
    try {
      const productsRes = await api.get('/api/Products/merchant/my-products', { auth: true });
      if (productsRes.ok && productsRes.data) {
        const products = (productsRes.data as any).items || (productsRes.data as any) || [];
        
        if (Array.isArray(products)) {
          products.slice(0, 3).forEach((product: any) => {
            if (product.status === 'Approved' && !product.approvalNotified) {
              notifications.push({
                id: `product_approved_${product.id}_${Date.now()}`,
                type: 'product_approved',
                title: 'تم اعتماد منتجك ✅',
                message: `تم اعتماد منتج "${product.nameAr || product.nameEn || product.name || 'منتج'}" وهو متاح الآن للعملاء`,
                data: { productId: product.id },
                page: 'vendor-products',
                createdAt: product.updatedAt || new Date().toISOString(),
                isRead: false
              });
            }

            if (product.status === 'Rejected' && !product.rejectionNotified) {
              notifications.push({
                id: `product_rejected_${product.id}_${Date.now()}`,
                type: 'product_rejected',
                title: 'تم رفض منتجك ❌',
                message: `تم رفض منتج "${product.nameAr || product.nameEn || product.name || 'منتج'}". يرجى مراجعة التفاصيل وإعادة التقديم.`,
                data: { productId: product.id },
                page: 'vendor-products',
                createdAt: product.updatedAt || new Date().toISOString(),
                isRead: false
              });
            }
          });
        }
      }
    } catch (e) {
      console.log('No products found or API not available');
    }

    // Get vendor's services
    try {
      const servicesRes = await api.get('/api/Services?vendorId=me', { auth: true });
      if (servicesRes.ok && servicesRes.data) {
        const services = (servicesRes.data as any).items || (servicesRes.data as any) || [];
        
        if (Array.isArray(services)) {
          services.slice(0, 2).forEach((service: any) => {
            if (service.status === 'Approved') {
              notifications.push({
                id: `service_approved_${service.id}_${Date.now()}`,
                type: 'product_approved',
                title: 'تم اعتماد خدمتك ✅',
                message: `تم اعتماد خدمة "${service.name || service.title || 'خدمة'}" وهي متاحة الآن للعملاء`,
                data: { serviceId: service.id },
                page: 'vendor-services',
                createdAt: service.updatedAt || new Date().toISOString(),
                isRead: false
              });
            }
          });
        }
      }
    } catch (e) {
      console.log('No services found or API not available');
    }

    // Add some sample business notifications based on existing data
    if (notifications.length < 3) {
      // Add some helpful business notifications for vendors
      notifications.push({
        id: `business_tip_${Date.now()}`,
        type: 'new_project_match',
        title: 'نصيحة تجارية 💡',
        message: 'تأكد من تحديث منتجاتك وخدماتك لجذب المزيد من العملاء',
        page: 'vendor-products',
        createdAt: new Date().toISOString(),
        isRead: false
      });
      
      notifications.push({
        id: `welcome_${Date.now()}`,
        type: 'order_placed',
        title: 'مرحباً بك في لوحة التجار! 👋',
        message: 'راجع طلباتك ومنتجاتك وخدماتك من هنا',
        page: 'vendor-dashboard',
        createdAt: new Date().toISOString(),
        isRead: false
      });
    }

  } catch (error: any) {
    handleApiError(error, 'Vendor Notifications');
  }

  // Sort by creation date (newest first)
  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // If no notifications, add a welcome message
  if (notifications.length === 0) {
    notifications.push({
      id: 'vendor_welcome',
      type: 'new_project_match',
      title: 'مرحباً بك!',
      message: 'لا توجد إشعارات جديدة. ترقب الطلبات والمشاريع الجديدة!',
      page: 'vendor-dashboard',
      createdAt: new Date().toISOString(),
      isRead: false
    });
  }

  return notifications;
}

// Get count of unread vendor notifications
export async function getVendorNotificationCount(): Promise<number> {
  return await safeAsync(async () => {
    const notifications = await getVendorNotifications();
    return notifications.filter(n => !n.isRead).length;
  }, 0, 'Vendor Notification Count') || 0;
}

// Mark notification as read
export async function markVendorNotificationRead(notificationId: string): Promise<void> {
  try {
    // In a real app, this would call an API to mark the notification as read
    // For now, we'll store it in localStorage
    const readNotifications = JSON.parse(localStorage.getItem('vendor_read_notifications') || '[]');
    if (!readNotifications.includes(notificationId)) {
      readNotifications.push(notificationId);
      localStorage.setItem('vendor_read_notifications', JSON.stringify(readNotifications));
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

// Get specific notification types for targeted alerts
export async function getVendorCriticalNotifications(): Promise<VendorNotification[]> {
  const notifications = await getVendorNotifications();
  // Return only critical notifications (accepted bids, payments, urgent orders)
  return notifications.filter(n => 
    ['bid_accepted', 'payment_received', 'order_placed'].includes(n.type)
  ).slice(0, 5);
}
