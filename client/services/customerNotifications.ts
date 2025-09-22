import { safeAsync, handleApiError } from '../utils/errorHandler';
import { safeGet } from '../utils/safeApi';

// Customer notification types
export interface CustomerNotification {
  id: string;
  type: 'order_status' | 'delivery_update' | 'project_update' | 'service_response' | 'rental_reminder' | 'payment_due' | 'offer_available' | 'message_received' | 'bid_received' | 'project_completed';
  title: string;
  message: string;
  data?: any;
  page?: string; // Which page to navigate to
  createdAt: string;
  isRead: boolean;
}

// Get customer-specific notifications
export async function getCustomerNotifications(): Promise<CustomerNotification[]> {
  const notifications: CustomerNotification[] = [];
  
  // Clean old notifications periodically (moved to bottom of function)
  
  try {
    // Get customer's orders using safe API endpoints only
    const ordersData = await safeAsync(async () => {
      const response = await safeGet('/api/Orders?customerId=me', {}, [], 'Customer Orders');
      return response && Array.isArray(response) ? response : [];
    }, [], 'Customer Orders API');

    if (ordersData && Array.isArray(ordersData)) {
      ordersData.slice(0, 3).forEach((order: any) => {
        if (order.status === 'Processing') {
          notifications.push({
            id: `order_processing_${order.id}_${Date.now()}`,
            type: 'order_status',
            title: 'جاري تجهيز طلبك 📦',
            message: `طلبك رقم ${order.orderNumber || order.id} قيد التجهيز. سيتم شحنه قريباً!`,
            data: { orderId: order.id },
            page: 'my-orders',
            createdAt: order.updatedAt || new Date().toISOString(),
            isRead: false
          });
        }

        if (order.status === 'Shipped') {
          notifications.push({
            id: `order_shipped_${order.id}_${Date.now()}`,
            type: 'delivery_update',
            title: 'تم شحن طلبك! 🚚',
            message: `طلبك رقم ${order.orderNumber || order.id} في الطريق إليك. رقم التتبع: ${order.trackingNumber || 'غير متوفر'}`,
            data: { orderId: order.id },
            page: 'track-order',
            createdAt: order.shippedAt || order.updatedAt || new Date().toISOString(),
            isRead: false
          });
        }

        if (order.status === 'Delivered') {
          notifications.push({
            id: `order_delivered_${order.id}_${Date.now()}`,
            type: 'delivery_update',
            title: 'تم تسليم طلبك! ✅',
            message: `طلبك رقم ${order.orderNumber || order.id} تم تسليمه بنجاح. نتمنى أن تكون راضياً عن الخدمة!`,
            data: { orderId: order.id },
            page: 'my-orders',
            createdAt: order.deliveredAt || order.updatedAt || new Date().toISOString(),
            isRead: false
          });
        }
      });
    }

    // Get projects using safe API endpoints only
    const projectsData = await safeAsync(async () => {
      const response = await safeGet('/api/Projects?page=1&pageSize=10', {}, [], 'Recent Projects');
      return response && Array.isArray(response) ? response : [];
    }, [], 'Projects API');

    if (projectsData && Array.isArray(projectsData)) {
      projectsData.slice(0, 2).forEach((project: any) => {
        // Show active projects as opportunities
        if (project.status === 'Published' || project.status === 'InBidding') {
          notifications.push({
            id: `project_available_${project.id}_${Date.now()}`,
            type: 'project_update',
            title: 'مشروع جديد متاح! 🏗️',
            message: `مشروع "${project.title}" متاح الآن. تقدم بعرضك واحصل على فرصة العمل!`,
            data: { projectId: project.id },
            page: 'project-details',
            createdAt: project.createdAt || new Date().toISOString(),
            isRead: false
          });
        }
      });
    }

    // Get rentals using safe API endpoints (try different endpoints)
    const rentalsData = await safeAsync(async () => {
      // Try the simple endpoint first
      let response = await safeGet('/api/Rentals', {}, [], 'Available Rentals');
      if (!response || !Array.isArray(response)) {
        // If that doesn't work, try the customer endpoint
        response = await safeGet('/api/Rentals/customer', {}, [], 'Customer Rentals');
        if (!response || !Array.isArray(response)) {
          // If that doesn't work either, return empty array
          return [];
        }
      }
      return response;
    }, [], 'Rentals API');

    if (rentalsData && Array.isArray(rentalsData)) {
      // Show available rentals as opportunities
      rentalsData.slice(0, 2).forEach((rental: any) => {
        if (rental.status === 'Available') {
          notifications.push({
            id: `rental_available_${rental.id}_${Date.now()}`,
            type: 'rental_reminder',
            title: 'معدة متاحة للإيجار! 🚜',
            message: `${rental.itemName || rental.name} متاحة للإيجار. احجزها الآن قبل نفاد الكمية!`,
            data: { rentalId: rental.id },
            page: 'rental-details',
            createdAt: rental.createdAt || new Date().toISOString(),
            isRead: false
          });
        }
      });
    }

    // Get special offers
    const offersData = await safeAsync(async () => {
      const response = await safeGet('/api/Products?featured=true&page=1&pageSize=5', {}, [], 'Featured Products');
      return response && Array.isArray(response) ? response : [];
    }, [], 'Products API');

    if (offersData && Array.isArray(offersData)) {
      offersData.slice(0, 2).forEach((product: any) => {
        notifications.push({
          id: `offer_${product.id}_${Date.now()}`,
          type: 'offer_available',
          title: 'عرض خاص لك! 🎯',
          message: `منتج مميز: ${product.name}. تحقق من العروض المتاحة!`,
          data: { productId: product.id },
          page: 'product-details',
          createdAt: product.createdAt || new Date().toISOString(),
          isRead: false
        });
      });
    }

    // Get messages/chat notifications  
    const messagesData = await safeAsync(async () => {
      const response = await safeGet('/api/Chat/customer/unread', {}, { count: 0 }, 'Customer Messages');
      return response && typeof response === 'object' && 'count' in response ? response : { count: 0 };
    }, { count: 0 }, 'Customer Messages API');

    if (messagesData && messagesData.count > 0) {
      notifications.push({
        id: `messages_${Date.now()}`,
        type: 'message_received',
        title: 'رسائل جديدة 💬',
        message: `لديك ${messagesData.count} رسالة غير مقروءة من الموردين والفنيين`,
        data: { count: messagesData.count },
        page: 'chat-inbox',
        createdAt: new Date().toISOString(),
        isRead: false
      });
    }

    // Get bids on customer projects
    const bidsData = await safeAsync(async () => {
      // Try different bid endpoints
      let response = await safeGet('/api/Bids/customer', {}, [], 'Customer Bids');
      if (!response || !Array.isArray(response)) {
        response = await safeGet('/api/Bids', {}, [], 'All Bids');
        if (!response || !Array.isArray(response)) {
          return [];
        }
      }
      return response;
    }, [], 'Bids API');

    if (bidsData && Array.isArray(bidsData)) {
      bidsData.slice(0, 2).forEach((bid: any) => {
        if (bid.status === 'Pending' || bid.status === 'Submitted') {
          notifications.push({
            id: `bid_received_${bid.id}_${Date.now()}`,
            type: 'bid_received',
            title: 'عرض جديد على مشروعك! 💼',
            message: `تم استلام عرض بقيمة ${bid.amount ? `${bid.amount.toLocaleString()} ريال` : 'غير محدد'} على مشروع "${bid.projectTitle || 'غير محدد'}"`,
            data: { bidId: bid.id, projectId: bid.projectId, amount: bid.amount },
            page: 'project-details',
            createdAt: bid.createdAt || new Date().toISOString(),
            isRead: false
          });
        }
      });
    }

    // Get wishlist notifications (if items are on sale)
    const wishlistData = await safeAsync(async () => {
      // Try different wishlist endpoints
      let response = await safeGet('/api/Wishlist', {}, [], 'Customer Wishlist');
      if (!response || !Array.isArray(response)) {
        response = await safeGet('/api/Wishlist/me', {}, [], 'My Wishlist');
        if (!response || !Array.isArray(response)) {
          return [];
        }
      }
      return response;
    }, [], 'Wishlist API');

    if (wishlistData && Array.isArray(wishlistData)) {
      wishlistData.slice(0, 2).forEach((item: any) => {
        const product = item.product || item;
        if (product && product.isOnSale) {
          notifications.push({
            id: `wishlist_sale_${product.id}_${Date.now()}`,
            type: 'offer_available',
            title: 'منتج في مفضلتك معروض! 🔥',
            message: `"${product.name}" أصبح معروضاً بخصم خاص! لا تفوت الفرصة`,
            data: { productId: product.id, salePrice: product.salePrice },
            page: 'product-details',
            createdAt: new Date().toISOString(),
            isRead: false
          });
        }
      });
    }

    // Add helpful notifications if few real notifications
    if (notifications.length < 3) {
      // Welcome notification
      notifications.push({
        id: `welcome_customer_${Date.now()}`,
        type: 'offer_available',
        title: 'أهلاً وسهلاً! 🌟',
        message: 'اكتشف منتجاتنا وخدماتنا المميزة. نحن هنا لخدمتك على مدار الساعة!',
        page: 'home',
        createdAt: new Date().toISOString(),
        isRead: false
      });
      
      // Explore categories notification
      notifications.push({
        id: `explore_categories_${Date.now()}`,
        type: 'offer_available',
        title: 'استكشف الفئات المتنوعة 📂',
        message: 'تصفح مجموعة واسعة من المنتجات والخدمات المقسمة حسب التخصص',
        page: 'categories',
        createdAt: new Date().toISOString(),
        isRead: false
      });
      
      // Projects notification
      notifications.push({
        id: `create_project_${Date.now()}`,
        type: 'project_update',
        title: 'هل لديك مشروع؟ 🏗️',
        message: 'أنشئ مشروعك واحصل على عروض من مختلف المقاولين والخبراء',
        page: 'projects-builder',
        createdAt: new Date().toISOString(),
        isRead: false
      });
    }

  } catch (error: any) {
    handleApiError(error, 'Customer Notifications');
  }

  // Sort by creation date (newest first)
  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Check localStorage for read notifications and update isRead property
  try {
    const readNotifications = JSON.parse(localStorage.getItem('customer_read_notifications') || '[]');
    notifications.forEach(notification => {
      notification.isRead = readNotifications.includes(notification.id);
    });
  } catch (error) {
    console.log('Error reading customer read notifications from localStorage:', error);
  }

  // If no notifications, add a welcome message
  if (notifications.length === 0) {
    notifications.push({
      id: 'customer_welcome',
      type: 'offer_available',
      title: 'مرحباً بك! 👋',
      message: 'لا توجد إشعارات جديدة. تصفح منتجاتنا واستمتع بالتسوق!',
      page: 'home',
      createdAt: new Date().toISOString(),
      isRead: false
    });
  }

  return notifications;
}

// Get count of unread customer notifications
export async function getCustomerNotificationCount(): Promise<number> {
  return await safeAsync(async () => {
    const notifications = await getCustomerNotifications();
    // Check localStorage for read notifications
    const readNotifications = JSON.parse(localStorage.getItem('customer_read_notifications') || '[]');
    return notifications.filter(n => !readNotifications.includes(n.id)).length;
  }, 0, 'Customer Notification Count') || 0;
}

// Mark notification as read
export async function markCustomerNotificationRead(notificationId: string): Promise<void> {
  try {
    // In a real app, this would call an API to mark the notification as read
    const readNotifications = JSON.parse(localStorage.getItem('customer_read_notifications') || '[]');
    if (!readNotifications.includes(notificationId)) {
      readNotifications.push(notificationId);
      localStorage.setItem('customer_read_notifications', JSON.stringify(readNotifications));
    }
  } catch (error) {
    console.error('Error marking customer notification as read:', error);
  }
}

// Mark all notifications as read
export async function markAllCustomerNotificationsRead(): Promise<void> {
  try {
    const notifications = await getCustomerNotifications();
    const notificationIds = notifications.map(n => n.id);
    localStorage.setItem('customer_read_notifications', JSON.stringify(notificationIds));
  } catch (error) {
    console.error('Error marking all customer notifications as read:', error);
  }
}

// Clean old read notifications (older than 30 days)
export function cleanOldCustomerNotifications(): void {
  try {
    const readNotifications = JSON.parse(localStorage.getItem('customer_read_notifications') || '[]');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Filter out old notification IDs (those with old timestamps)
    const validNotifications = readNotifications.filter((id: string) => {
      try {
        // Extract timestamp from ID if it exists
        const parts = id.split('_');
        const timestamp = parts[parts.length - 1];
        if (timestamp && !isNaN(Number(timestamp))) {
          const notificationDate = new Date(Number(timestamp));
          return notificationDate > thirtyDaysAgo;
        }
        return true; // Keep if we can't determine age
      } catch {
        return true; // Keep if there's an error
      }
    });
    
    if (validNotifications.length !== readNotifications.length) {
      localStorage.setItem('customer_read_notifications', JSON.stringify(validNotifications));
      console.log(`Cleaned ${readNotifications.length - validNotifications.length} old customer notifications`);
    }
  } catch (error) {
    console.error('Error cleaning old customer notifications:', error);
  }
}

// Get notification statistics for debugging
export async function getCustomerNotificationStats(): Promise<{
  total: number;
  unread: number;
  byType: Record<string, number>;
}> {
  try {
    const notifications = await getCustomerNotifications();
    const readNotifications = JSON.parse(localStorage.getItem('customer_read_notifications') || '[]');
    
    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !readNotifications.includes(n.id)).length,
      byType: {} as Record<string, number>
    };
    
    // Count by type
    notifications.forEach(n => {
      const type = n.type || 'unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });
    
    return stats;
  } catch (error) {
    console.error('Error getting customer notification stats:', error);
    return { total: 0, unread: 0, byType: {} };
  }
}
