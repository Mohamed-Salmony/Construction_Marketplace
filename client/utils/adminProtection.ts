// Admin Protection Utilities
import { safeSync } from './errorHandler';

// قائمة الصفحات المسموحة للأدمن
export const ADMIN_ALLOWED_PAGES = [
  'admin-dashboard',
  'admin-users', 
  'admin-vendors',
  'admin-technicians',
  'admin-products',
  'admin-services',
  'admin-all-projects',
  'admin-project-details',
  'admin-pending-projects',
  'admin-project-options',
  'admin-orders',
  'admin-analytics',
  'admin-reports',
  'admin-settings',
  'admin-offers',
  'admin-rentals',
  'admin-sections',
  'admin-sections-products',
  'admin-sections-technicians'
];

// فحص إذا كان المستخدم أدمن
export function isAdmin(user: any): boolean {
  return user?.role?.toLowerCase() === 'admin';
}

// فحص إذا كانت الصفحة مسموحة للأدمن
export function isAdminPageAllowed(page: string): boolean {
  return ADMIN_ALLOWED_PAGES.includes(page);
}

// حماية التنقل للأدمن
export function guardAdminNavigation(
  user: any, 
  targetPage: string, 
  setCurrentPage: (page: string) => void
): boolean {
  return safeSync(() => {
    // إذا لم يكن أدمن، السماح بالتنقل العادي
    if (!isAdmin(user)) {
      return true;
    }

    // إذا كان أدمن وحاول الذهاب لصفحة غير مسموحة
    if (!targetPage.startsWith('admin-') || !isAdminPageAllowed(targetPage)) {
      console.log('🛡️ Admin navigation blocked:', targetPage, '→ admin-dashboard');
      
      // إعادة توجيه للوحة التحكم
      setCurrentPage('admin-dashboard');
      
      // تحديث URL
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('page', 'admin-dashboard');
        window.history.replaceState({}, '', url.toString());
      }
      
      return false; // منع التنقل
    }

    return true; // السماح بالتنقل
  }, false, 'Admin Navigation Guard') ?? false;
}

// حماية الروابط في الـ Header
export function createSafeAdminNavigate(
  user: any,
  setCurrentPage: (page: string) => void,
  originalNavigate: (page: string) => void
) {
  return (page: string) => {
    return safeSync(() => {
      const isAllowed = guardAdminNavigation(user, page, setCurrentPage);
      
      if (isAllowed) {
        originalNavigate(page);
      }
      // إذا لم يكن مسموحاً، guardAdminNavigation سيتولى إعادة التوجيه
    }, undefined, 'Safe Admin Navigate');
  };
}

// منع الروابط الخارجية للأدمن
export function blockExternalLinksForAdmin(user: any): void {
  if (!isAdmin(user) || typeof window === 'undefined') return;

  safeSync(() => {
    // رصد جميع الروابط في الصفحة
    const links = document.querySelectorAll('a[href]');
    
    links.forEach((link) => {
      const href = link.getAttribute('href');
      
      // إذا كان رابط خارجي أو يوجه خارج منطقة الأدمن
      if (href && (
        href.startsWith('http') || 
        href.startsWith('mailto:') || 
        href.startsWith('tel:') ||
        (href.startsWith('/') && !href.includes('admin'))
      )) {
        
        // إضافة مستمع لمنع النقر
        link.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          console.log('🛡️ External link blocked for admin:', href);
          
          // إظهار تنبيه للأدمن
          if (window.confirm('أنت في وضع الأدمن. هل تريد حقاً مغادرة منطقة الإدارة؟')) {
            // إذا وافق الأدمن، اسمح بالتنقل
            window.open(href, '_blank');
          }
        });
      }
    });
  }, undefined, 'Block External Links');
}

// مراقبة تغييرات DOM للروابط الجديدة
export function watchForNewLinksForAdmin(user: any): () => void {
  if (!isAdmin(user) || typeof window === 'undefined') {
    return () => {};
  }

  let observer: MutationObserver | null = null;

  safeSync(() => {
    observer = new MutationObserver((mutations) => {
      let hasNewLinks = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // فحص إذا كان العنصر رابط أو يحتوي على روابط
              if (element.tagName === 'A' || element.querySelectorAll('a').length > 0) {
                hasNewLinks = true;
              }
            }
          });
        }
      });
      
      // إذا تم إضافة روابط جديدة، حمايتها
      if (hasNewLinks) {
        setTimeout(() => blockExternalLinksForAdmin(user), 100);
      }
    });

    // بدء مراقبة الـ DOM
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }, undefined, 'Watch New Links');

  // إرجاع دالة cleanup
  return () => {
    if (observer) {
      observer.disconnect();
    }
  };
}

// حماية شاملة للأدمن
export function enableAdminProtection(
  user: any,
  setCurrentPage: (page: string) => void
): () => void {
  if (!isAdmin(user)) {
    return () => {};
  }

  const cleanupFunctions: Array<() => void> = [];

  safeSync(() => {
    console.log('🛡️ تفعيل الحماية الشاملة للأدمن');

    // حماية الروابط الموجودة
    blockExternalLinksForAdmin(user);
    
    // مراقبة الروابط الجديدة
    const watchCleanup = watchForNewLinksForAdmin(user);
    cleanupFunctions.push(watchCleanup);

    // منع right-click على الروابط
    const preventRightClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'A') {
        e.preventDefault();
        console.log('🛡️ Right-click blocked on link for admin');
      }
    };

    document.addEventListener('contextmenu', preventRightClick);
    cleanupFunctions.push(() => {
      document.removeEventListener('contextmenu', preventRightClick);
    });

    // منع drag & drop للروابط
    const preventDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'A') {
        e.preventDefault();
        console.log('🛡️ Link drag blocked for admin');
      }
    };

    document.addEventListener('dragstart', preventDragStart);
    cleanupFunctions.push(() => {
      document.removeEventListener('dragstart', preventDragStart);
    });

  }, undefined, 'Enable Admin Protection');

  // إرجاع دالة cleanup موحدة
  return () => {
    cleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch (e) {
        console.warn('Error during admin protection cleanup:', e);
      }
    });
  };
}

// معلومات حالة الحماية
export function getAdminProtectionStatus(user: any, currentPage: string) {
  const adminStatus = isAdmin(user);
  const inAdminArea = currentPage.startsWith('admin-');
  const pageAllowed = isAdminPageAllowed(currentPage);

  return {
    isAdmin: adminStatus,
    isProtected: adminStatus,
    inAdminArea,
    pageAllowed,
    shouldRedirect: adminStatus && (!inAdminArea || !pageAllowed),
    protectionLevel: adminStatus ? 'high' : 'none'
  };
}
