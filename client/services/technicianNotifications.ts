import { safeAsync, handleApiError } from '../utils/errorHandler';
import { safeGet } from '../utils/safeApi';

// Technician notification types
export interface TechnicianNotification {
  id: string;
  type: 'service_request' | 'service_accepted' | 'service_completed' | 'payment_received' | 'new_job_match' | 'project_assigned' | 'message_received' | 'rating_received' | 'profile_approved';
  title: string;
  message: string;
  data?: any;
  page?: string; // Which page to navigate to
  createdAt: string;
  isRead: boolean;
}

// Get technician-specific notifications
export async function getTechnicianNotifications(): Promise<TechnicianNotification[]> {
  const notifications: TechnicianNotification[] = [];
  
  try {
    // Get technician's services using safe API (avoid endpoints that cause ObjectId errors)
    const servicesData = await safeAsync(async () => {
      const response = await safeGet('/api/Services?technicianId=me', {}, [], 'Technician Services');
      return response && Array.isArray(response) ? response : [];
    }, [], 'Technician Services API');

    if (servicesData && Array.isArray(servicesData)) {
      servicesData.slice(0, 3).forEach((service: any) => {
        if (service.status === 'Active') {
          notifications.push({
            id: `service_available_${service.id}_${Date.now()}`,
            type: 'service_request',
            title: 'فرصة عمل جديدة! 🔧',
            message: `خدمة ${service.title} متاحة للتطبيق. تحقق من التفاصيل الآن!`,
            data: { serviceId: service.id },
            page: 'technician-services',
            createdAt: service.createdAt || new Date().toISOString(),
            isRead: false
          });
        }
      });
    }

    // Get general projects data (avoid specific technician endpoints that may not exist)
    const projectsData = await safeAsync(async () => {
      const response = await safeGet('/api/Projects?page=1&pageSize=5', {}, [], 'Recent Projects');
      return response && Array.isArray(response) ? response : [];
    }, [], 'Projects API');

    if (projectsData && Array.isArray(projectsData)) {
      projectsData.slice(0, 2).forEach((project: any) => {
        if (project.status === 'Published' || project.status === 'InBidding') {
          notifications.push({
            id: `project_opportunity_${project.id}_${Date.now()}`,
            type: 'project_assigned',
            title: 'مشروع جديد متاح! 🏗️',
            message: `مشروع "${project.title}" متاح للتطبيق. لا تفوت الفرصة!`,
            data: { projectId: project.id },
            page: 'technician-projects',
            createdAt: project.createdAt || new Date().toISOString(),
            isRead: false
          });
        }
      });
    }

    // Avoid chat endpoints that may not exist - just add a generic notification
    // Most chat endpoints don't exist yet, so we'll create mock notifications instead
    
    // Add some professional development tips
    notifications.push({
      id: `skill_tip_${Date.now()}`,
      type: 'rating_received',
      title: 'تطوير المهارات 📈',
      message: 'حافظ على تحديث مهاراتك واطلع على أحدث التقنيات في مجال عملك لتحصل على مشاريع أكثر!',
      page: 'technician-services',
      createdAt: new Date().toISOString(),
      isRead: false
    });

    // Add helpful notifications if few real notifications
    if (notifications.length < 3) {
      notifications.push({
        id: `work_tip_${Date.now()}`,
        type: 'new_job_match',
        title: 'نصيحة مهنية 💡',
        message: 'حافظ على جودة عملك واستجب سريعاً للطلبات لزيادة تقييمك ودخلك',
        page: 'technician-services',
        createdAt: new Date().toISOString(),
        isRead: false
      });

      notifications.push({
        id: `profile_tip_${Date.now()}`,
        type: 'profile_approved',
        title: 'تحسين الملف الشخصي 📋',
        message: 'أضف المزيد من الصور لأعمالك السابقة وحدث مهاراتك لجذب المزيد من العملاء',
        page: 'profile',
        createdAt: new Date().toISOString(),
        isRead: false
      });
    }

  } catch (error: any) {
    handleApiError(error, 'Technician Notifications');
  }

  // Sort by creation date (newest first)
  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // If no notifications, add a welcome message
  if (notifications.length === 0) {
    notifications.push({
      id: 'technician_welcome',
      type: 'new_job_match',
      title: 'مرحباً بك! 👋',
      message: 'لا توجد إشعارات جديدة. ترقب طلبات العمل والمشاريع الجديدة!',
      page: 'technician-services',
      createdAt: new Date().toISOString(),
      isRead: false
    });
  }

  return notifications;
}

// Get count of unread technician notifications
export async function getTechnicianNotificationCount(): Promise<number> {
  return await safeAsync(async () => {
    const notifications = await getTechnicianNotifications();
    return notifications.filter(n => !n.isRead).length;
  }, 0, 'Technician Notification Count') || 0;
}

// Mark notification as read
export async function markTechnicianNotificationRead(notificationId: string): Promise<void> {
  try {
    // In a real app, this would call an API to mark the notification as read
    const readNotifications = JSON.parse(localStorage.getItem('technician_read_notifications') || '[]');
    if (!readNotifications.includes(notificationId)) {
      readNotifications.push(notificationId);
      localStorage.setItem('technician_read_notifications', JSON.stringify(readNotifications));
    }
  } catch (error) {
    console.error('Error marking technician notification as read:', error);
  }
}

// Mark all notifications as read
export async function markAllTechnicianNotificationsRead(): Promise<void> {
  try {
    const notifications = await getTechnicianNotifications();
    const notificationIds = notifications.map(n => n.id);
    localStorage.setItem('technician_read_notifications', JSON.stringify(notificationIds));
  } catch (error) {
    console.error('Error marking all technician notifications as read:', error);
  }
}
