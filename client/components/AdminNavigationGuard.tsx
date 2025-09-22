import React, { useEffect, useCallback } from 'react';
import { safeSync } from '../utils/errorHandler';

interface AdminNavigationGuardProps {
  user: any;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  children: React.ReactNode;
}

export default function AdminNavigationGuard({ 
  user, 
  currentPage, 
  setCurrentPage, 
  children 
}: AdminNavigationGuardProps) {
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const isAdminPage = currentPage.startsWith('admin-');

  // صفحات الأدمن المسموحة
  const allowedAdminPages = [
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

  // منع الأدمن من مغادرة منطقة الإدارة
  const guardAdminNavigation = useCallback(() => {
    if (!isAdmin) return;

    safeSync(() => {
      // إذا كان الأدمن في صفحة غير مسموحة، أعده للوحة التحكم
      if (!isAdminPage || !allowedAdminPages.includes(currentPage)) {
        console.log('🛡️ Admin navigation guard: Redirecting to dashboard');
        setCurrentPage('admin-dashboard');
        
        // تحديث URL أيضاً
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.set('page', 'admin-dashboard');
          window.history.replaceState({}, '', url.toString());
        }
      }
    }, undefined, 'Admin Navigation Guard');
  }, [isAdmin, isAdminPage, currentPage, setCurrentPage, allowedAdminPages]);

  // حماية من استخدام زر الرجوع في المتصفح
  useEffect(() => {
    if (!isAdmin) return;

    const handlePopState = (event: PopStateEvent) => {
      safeSync(() => {
        console.log('🛡️ Admin back button blocked');
        
        // منع التنقل للخلف
        event.preventDefault();
        
        // الحصول على الصفحة المطلوب الذهاب إليها
        const urlParams = new URLSearchParams(window.location.search);
        const targetPage = urlParams.get('page') || 'home';
        
        // إذا كان الأدمن يحاول الذهاب لصفحة غير مسموحة
        if (!targetPage.startsWith('admin-') || !allowedAdminPages.includes(targetPage)) {
          // أعده للوحة التحكم
          setCurrentPage('admin-dashboard');
          
          const url = new URL(window.location.href);
          url.searchParams.set('page', 'admin-dashboard');
          window.history.replaceState({}, '', url.toString());
          
          // إضافة entry جديد للتاريخ لمنع المحاولة مرة أخرى
          window.history.pushState({}, '', url.toString());
        } else {
          // إذا كانت صفحة أدمن مسموحة، اسمح بالتنقل
          setCurrentPage(targetPage);
        }
      }, undefined, 'Admin PopState Handler');
    };

    // إضافة listener لرصد تغييرات التاريخ
    window.addEventListener('popstate', handlePopState);
    
    // منع استخدام keyboard shortcuts للتنقل
    const handleKeyDown = (event: KeyboardEvent) => {
      safeSync(() => {
        // منع Alt+Left (رجوع) و Alt+Right (تقدم)
        if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
          console.log('🛡️ Admin keyboard navigation blocked');
          event.preventDefault();
          event.stopPropagation();
        }
        
        // منع Backspace للرجوع (إذا لم يكن في input field)
        if (event.key === 'Backspace' && 
            !['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement)?.tagName)) {
          console.log('🛡️ Admin backspace navigation blocked');
          event.preventDefault();
        }
      }, undefined, 'Admin Keyboard Handler');
    };

    window.addEventListener('keydown', handleKeyDown);

    // cleanup
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAdmin, setCurrentPage, allowedAdminPages]);

  // تشغيل الحماية عند تغيير الصفحة
  useEffect(() => {
    guardAdminNavigation();
  }, [guardAdminNavigation]);

  // حماية من التنقل المباشر عبر URL
  useEffect(() => {
    if (!isAdmin) return;

    const checkUrlChange = () => {
      safeSync(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlPage = urlParams.get('page') || 'home';
        
        // إذا كان URL يحتوي على صفحة غير مسموحة للأدمن
        if (urlPage !== currentPage && 
            (!urlPage.startsWith('admin-') || !allowedAdminPages.includes(urlPage))) {
          
          console.log('🛡️ Admin direct URL navigation blocked:', urlPage);
          
          // أعده للوحة التحكم
          setCurrentPage('admin-dashboard');
          
          const url = new URL(window.location.href);
          url.searchParams.set('page', 'admin-dashboard');
          window.history.replaceState({}, '', url.toString());
        }
      }, undefined, 'Admin URL Check');
    };

    // فحص دوري كل ثانية
    const interval = setInterval(checkUrlChange, 1000);

    return () => clearInterval(interval);
  }, [isAdmin, currentPage, setCurrentPage, allowedAdminPages]);

  // رسالة توضيحية للأدمن (اختيارية)
  useEffect(() => {
    if (isAdmin && typeof window !== 'undefined') {
      safeSync(() => {
        // إظهار رسالة ترحيبية للأدمن مرة واحدة
        const hasShownWelcome = sessionStorage.getItem('admin_welcome_shown');
        if (!hasShownWelcome) {
          console.log('🔒 وضع الأدمن: أنت الآن محمي في منطقة الإدارة');
          sessionStorage.setItem('admin_welcome_shown', 'true');
        }
      }, undefined, 'Admin Welcome Message');
    }
  }, [isAdmin]);

  // حماية إضافية: رصد محاولات تغيير الصفحة من الكود
  useEffect(() => {
    if (!isAdmin) return;

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    // تخصيص pushState
    window.history.pushState = function(state, title, url) {
      return safeSync(() => {
        if (url && typeof url === 'string') {
          const urlObj = new URL(url, window.location.origin);
          const targetPage = urlObj.searchParams.get('page') || 'home';
          
          // فحص إذا كانت الصفحة مسموحة للأدمن
          if (!targetPage.startsWith('admin-') || !allowedAdminPages.includes(targetPage)) {
            console.log('🛡️ Admin programmatic navigation blocked:', targetPage);
            
            // إعادة توجيه للوحة التحكم
            urlObj.searchParams.set('page', 'admin-dashboard');
            url = urlObj.toString();
            setCurrentPage('admin-dashboard');
          }
        }
        
        return originalPushState.call(this, state, title, url);
      }, originalPushState.call(this, state, title, url), 'Admin PushState Override');
    };

    // تخصيص replaceState
    window.history.replaceState = function(state, title, url) {
      return safeSync(() => {
        if (url && typeof url === 'string') {
          const urlObj = new URL(url, window.location.origin);
          const targetPage = urlObj.searchParams.get('page') || 'home';
          
          if (!targetPage.startsWith('admin-') || !allowedAdminPages.includes(targetPage)) {
            console.log('🛡️ Admin programmatic replace blocked:', targetPage);
            urlObj.searchParams.set('page', 'admin-dashboard');
            url = urlObj.toString();
            setCurrentPage('admin-dashboard');
          }
        }
        
        return originalReplaceState.call(this, state, title, url);
      }, originalReplaceState.call(this, state, title, url), 'Admin ReplaceState Override');
    };

    // استعادة الوظائف الأصلية عند cleanup
    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [isAdmin, setCurrentPage, allowedAdminPages]);

  return <>{children}</>;
}

// مكون مساعد لإظهار حالة الحماية
export function AdminGuardStatus({ user, currentPage }: { user: any; currentPage: string }) {
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const isAdminPage = currentPage.startsWith('admin-');

  if (!isAdmin || process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-blue-900 text-white p-2 rounded-md text-xs z-50">
      🔒 وضع الأدمن محمي | الصفحة: {currentPage}
      {isAdminPage ? ' ✅' : ' ⚠️'}
    </div>
  );
}

// Hook مساعد لاستخدام حماية الأدمن
export function useAdminGuard(user: any, currentPage: string, setCurrentPage: (page: string) => void) {
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    if (!isAdmin) return;

    // تأكد أن الأدمن في صفحة أدمن عند بداية الجلسة
    if (!currentPage.startsWith('admin-')) {
      console.log('🛡️ Admin guard: Initial redirect to dashboard');
      setCurrentPage('admin-dashboard');
    }
  }, [isAdmin, currentPage, setCurrentPage]);

  return {
    isAdminProtected: isAdmin,
    isInAdminArea: currentPage.startsWith('admin-')
  };
}
