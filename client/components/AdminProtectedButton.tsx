import React from 'react';
import { Button } from './ui/button';
import { guardAdminNavigation, isAdmin } from '../utils/adminProtection';
import { safeSync } from '../utils/errorHandler';

interface AdminProtectedButtonProps {
  user: any;
  targetPage: string;
  setCurrentPage: (page: string) => void;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  onClick?: () => void;
}

// زر محمي للأدمن - يمنع التنقل خارج منطقة الإدارة
export function AdminProtectedButton({
  user,
  targetPage,
  setCurrentPage,
  children,
  className,
  variant = 'default',
  size = 'default',
  disabled = false,
  onClick
}: AdminProtectedButtonProps) {
  
  const handleClick = () => {
    safeSync(() => {
      // تنفيذ onClick المخصص أولاً
      if (onClick) {
        onClick();
      }

      // فحص وحماية التنقل للأدمن
      const isAllowed = guardAdminNavigation(user, targetPage, setCurrentPage);
      
      if (isAllowed) {
        setCurrentPage(targetPage);
      }
      
    }, undefined, 'Admin Protected Button Click');
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={disabled}
      onClick={handleClick}
    >
      {children}
    </Button>
  );
}

// رابط محمي للأدمن
interface AdminProtectedLinkProps {
  user: any;
  targetPage: string;
  setCurrentPage: (page: string) => void;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function AdminProtectedLink({
  user,
  targetPage,
  setCurrentPage,
  children,
  className = '',
  onClick
}: AdminProtectedLinkProps) {
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    safeSync(() => {
      if (onClick) {
        onClick();
      }

      const isAllowed = guardAdminNavigation(user, targetPage, setCurrentPage);
      
      if (isAllowed) {
        setCurrentPage(targetPage);
      }
      
    }, undefined, 'Admin Protected Link Click');
  };

  return (
    <a
      href={`#${targetPage}`}
      className={`cursor-pointer hover:underline ${className}`}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}

// مكون navigation آمن للأدمن
interface AdminSafeNavProps {
  user: any;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  children: React.ReactNode;
}

export function AdminSafeNav({
  user,
  currentPage,
  setCurrentPage,
  children
}: AdminSafeNavProps) {
  
  if (!isAdmin(user)) {
    return <>{children}</>;
  }

  // تعديل جميع الروابط والأزرار لتكون آمنة
  const enhanceChildren = (children: React.ReactNode): React.ReactNode => {
    return React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) {
        return child;
      }

      // إذا كان الطفل يحتوي على onClick أو href
      const props = child.props as any;
      
      if (props.onClick || props.href) {
        const originalOnClick = props.onClick;
        const href = props.href;
        
        const safeOnClick = (e: React.MouseEvent) => {
          safeSync(() => {
            // منع التنقل الافتراضي
            e.preventDefault();
            e.stopPropagation();
            
            // إذا كان href يحتوي على page parameter
            if (href && href.includes('page=')) {
              const match = href.match(/page=([^&]+)/);
              if (match) {
                const targetPage = match[1];
                const isAllowed = guardAdminNavigation(user, targetPage, setCurrentPage);
                
                if (isAllowed) {
                  setCurrentPage(targetPage);
                }
                return;
              }
            }
            
            // تنفيذ onClick الأصلي
            if (originalOnClick) {
              originalOnClick(e);
            }
          }, undefined, 'Admin Safe Nav Click');
        };

        // إرجاع العنصر مع onClick محمي
        return React.cloneElement(child, {
          ...props,
          onClick: safeOnClick,
          href: undefined // إزالة href لمنع التنقل التلقائي
        });
      }

      // إذا كان للطفل أطفال، تطبيق الحماية عليهم أيضاً
      if (props.children) {
        return React.cloneElement(child, {
          ...props,
          children: enhanceChildren(props.children)
        });
      }

      return child;
    });
  };

  return <>{enhanceChildren(children)}</>;
}

// Hook لإنشاء navigate function آمن للأدمن
export function useAdminSafeNavigate(
  user: any,
  setCurrentPage: (page: string) => void
) {
  const navigate = (targetPage: string) => {
    safeSync(() => {
      const isAllowed = guardAdminNavigation(user, targetPage, setCurrentPage);
      
      if (isAllowed) {
        setCurrentPage(targetPage);
        
        // تحديث URL
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.set('page', targetPage);
          window.history.pushState({}, '', url.toString());
        }
      }
    }, undefined, 'Admin Safe Navigate');
  };

  return { navigate, isAdmin: isAdmin(user) };
}

// مكون عرض حالة الحماية للتطوير
export function AdminProtectionStatus({ 
  user, 
  currentPage 
}: { 
  user: any; 
  currentPage: string; 
}) {
  if (!isAdmin(user) || process.env.NODE_ENV !== 'development') {
    return null;
  }

  const isInAdminArea = currentPage.startsWith('admin-');
  const timestamp = new Date().toLocaleTimeString('ar-EG');

  return (
    <div className="fixed top-4 left-4 bg-blue-900 text-white p-2 rounded-md text-xs z-50 font-mono">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
        <span>حماية الأدمن نشطة</span>
      </div>
      <div className="text-blue-200 mt-1">
        الصفحة: {currentPage} {isInAdminArea ? '✅' : '⚠️'}
      </div>
      <div className="text-blue-300 text-xs">
        {timestamp}
      </div>
    </div>
  );
}

export default AdminProtectedButton;
