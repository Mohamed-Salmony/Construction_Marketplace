"use client";

import { Search, ShoppingCart, User, Menu, Phone, MapPin, ArrowLeft, ArrowRight, Bell, MessageCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from '../hooks/useTranslation';
import type { RouteContext } from './Router';
import { useEffect, useState, useCallback, useRef } from 'react';
import { logout as apiLogout } from '@/services/auth';
import { getVendorMessageCount, getRecentVendorMessages, getCustomerMessageCount, getCustomerRecentMessages } from '@/services/rentals';
import { getVendorProjectMessageCount, getVendorProjectRecentMessages, getCustomerProjectMessageCount, getCustomerProjectRecentMessages } from '@/services/projectChat';
import { listMyNotifications, markNotificationRead, markAllNotificationsRead } from '@/services/notifications';
import { getConversation } from '@/services/chat';
import { getAdminPendingNotifications, getAdminPendingCount } from '@/services/adminNotifications';
import { getVendorNotifications, getVendorNotificationCount } from '@/services/vendorNotifications';
import { getTechnicianNotifications, getTechnicianNotificationCount } from '@/services/technicianNotifications';
import { getCustomerNotifications, getCustomerNotificationCount } from '@/services/customerNotifications';
import { useAdminGuard } from './AdminNavigationGuard';

interface HeaderProps extends Partial<RouteContext> {
  currentPage?: string;
}

export default function Header({ currentPage, setCurrentPage, cartItems, user, setUser, goBack }: HeaderProps) {
  const { t, locale } = useTranslation();
  const cartCount = (cartItems || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
  // Robust navigation: uses context when available, otherwise falls back to URL param
  const go = (page: string) => {
    if (setCurrentPage) return setCurrentPage(page);
    if (typeof window !== 'undefined') {
      // SPA navigation fallback: dispatch an event that Router listens to, and update URL without reload
      try {
        window.dispatchEvent(new CustomEvent('spa_navigate', { detail: { page } }));
      } catch {}
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('page', page);
        window.history.replaceState({}, '', url.toString());
      } catch {}
    }
  };

  // Load chat-only messages for the dedicated chat icon
  const loadChats = async () => {
    try {
      // Skip if unauthenticated or page is not visible
      if (!user) { setChatItems([]); setChatUnreadCount(0); return; }
      if (typeof document !== 'undefined' && (document as any).hidden) return;
      const notif = await listMyNotifications();
      let mappedChat: any[] = [];
      if (notif.ok && (notif.data as any)?.success) {
        const arr = ((notif.data as any).data || []) as any[];
        mappedChat = arr
          .filter((n:any)=> String(n.type||'') === 'chat.message')
          .map((n:any)=> ({
            type: 'chat.message',
            title: locale==='ar' ? 'رسالة دردشة' : 'Chat message',
            message: n.message,
            createdAt: n.createdAt,
            conversationId: n?.data?.conversationId,
            kind: n?.data?.kind || '',
            _id: n?._id,
            read: !!n?.read,
          }));
      }
      const unread = mappedChat.filter((x:any)=> !x.read).length;
      setChatUnreadCount(unread);
      const sorted = mappedChat.sort((a:any,b:any)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0,15);
      setChatItems(sorted);
      // Fire an event if there are newer messages
      try {
        const latest = sorted.length ? new Date(sorted[0].createdAt).getTime() : 0;
        if (latest && latest > (lastChatTsRef.current || 0)) {
          lastChatTsRef.current = latest;
          if (typeof window !== 'undefined') {
            const top = sorted[0];
            window.dispatchEvent(new CustomEvent('chat_incoming', { detail: { at: latest, conversationId: top?.conversationId || '', kind: 'rental' } }));
          }
        }
      } catch {}
    } catch { setChatItems([]); setChatUnreadCount(0); }
  };
  // Unified notification badge: count unread notifications
  useEffect(() => {
    let timer: any;
    let chatTimer: any;
    const onVisibility = () => {
      // When tab becomes visible, trigger an immediate refresh
      if (typeof document !== 'undefined' && !(document as any).hidden) {
        fetchCount();
        loadChats();
      }
    };
    async function fetchCount() {
      try {
        // Skip if unauthenticated or page is not visible
        if (!user) { setVendorMsgCount(0); return; }
        if (typeof document !== 'undefined' && (document as any).hidden) return;
        // Prefer unified unread notifications count
        try {
          const notif = await listMyNotifications({ unread: true });
          if (notif.ok && (notif.data as any)?.success) {
            const arr = (((notif.data as any).data) || []) as any[];
            // Exclude any message-related notification types from the badge count
            const filtered = arr.filter((n:any)=> {
              const tp = String(n.type || '').toLowerCase();
              return tp && !tp.includes('message');
            });
            setVendorMsgCount(filtered.length);
            return;
          }
        } catch { /* fall back below */ }

        // Fallback by role (using new notification systems)
        if (role === 'admin') {
          // For admin, get count of pending items that need approval
          const count = await getAdminPendingCount();
          setVendorMsgCount(count);
        } else if (role === 'vendor' || role === 'merchant') {
          // For vendors, get count of business notifications (bids, orders, payments, etc.)
          const count = await getVendorNotificationCount();
          setVendorMsgCount(count);
        } else if (role === 'worker' || role === 'technician') {
          // For technicians, get count of job-related notifications
          const count = await getTechnicianNotificationCount();
          setVendorMsgCount(count);
        } else if (role === 'customer' || isCustomerRole) {
          // For customers, get count of order and project related notifications
          const count = await getCustomerNotificationCount();
          setVendorMsgCount(count);
        } else { 
          setVendorMsgCount(0); 
        }
      } catch { /* ignore */ }
    }
    fetchCount();
    // also refresh chat items/counts periodically
    loadChats();
    // Back off intervals to reduce rate-limit risk
    timer = setInterval(fetchCount, 30000); // 30s
    chatTimer = setInterval(loadChats, 15000); // 15s
    if (typeof document !== 'undefined') {
      (document as any).addEventListener('visibilitychange', onVisibility);
    }
    return () => {
      if (timer) clearInterval(timer);
      if (chatTimer) clearInterval(chatTimer);
      if (typeof document !== 'undefined') {
        (document as any).removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, [user?.id, user?.role]);
  const displayName = [user?.firstName, user?.middleName, user?.lastName].filter(Boolean).join(' ') || (user?.name || '');
  const isHome = (() => {
    if (currentPage) return currentPage === 'home';
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        return (url.searchParams.get('page') || 'home') === 'home';
      } catch {}
    }
    return false;
  })();
  const current = (() => {
    if (currentPage) return currentPage;
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        return (url.searchParams.get('page') || 'home');
      } catch {}
    }
    return 'home';
  })();
  const hideBack = current === 'vendor-dashboard' || current === 'admin-dashboard';
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = (user?.role || '').toString().toLowerCase();
  const isAdmin = role === 'admin';
  const isVendor = role === 'vendor' || role === 'merchant';
  const isWorker = role === 'worker' || role === 'technician';
  const isCustomerRole = !isVendor && !isAdmin && !isWorker && !!user; // treat any other logged-in role as customer
  // Restrict header content on admin pages: only greeting, logout, language, and notifications
  const isRestricted = isAdmin && current.startsWith('admin-');

  // تفعيل حماية الأدمن
  const { isAdminProtected, isInAdminArea } = useAdminGuard(user, current, setCurrentPage || (() => {}));
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [vendorMsgCount, setVendorMsgCount] = useState<number>(0);
  // Chat state (dedicated icon)
  const [chatOpen, setChatOpen] = useState(false);
  const [chatItems, setChatItems] = useState<any[]>([]);
  const [chatUnreadCount, setChatUnreadCount] = useState<number>(0);
  // Track latest chat timestamp for change detection (used in loadChats) without causing re-renders
  const lastChatTsRef = useRef<number>(0);
  const loadNotifications = async () => {
    try {
      if (isAdmin) {
        // For admin, show pending items that need approval
        const adminNotifications = await getAdminPendingNotifications();
        setNotifications(adminNotifications || []);
      } else if (isVendor) {
        // For vendors, show business-related notifications
        const vendorNotifications = await getVendorNotifications();
        setNotifications(vendorNotifications || []);
      } else if (isWorker) {
        // For technicians, show job-related notifications
        const technicianNotifications = await getTechnicianNotifications();
        setNotifications(technicianNotifications || []);
      } else if (isCustomerRole) {
        // For customers, show order and project related notifications
        const customerNotifications = await getCustomerNotifications();
        setNotifications(customerNotifications || []);
      } else {
        // Fallback for other users - use legacy system
        try {
          const resp = await listMyNotifications();
          if (resp.ok && (resp.data as any)?.success) {
            const list = (((resp.data as any).data) || []) as any[];
            const filtered = list
              .filter((n:any)=> {
                const tp = String(n.type || '').toLowerCase();
                return tp && !tp.includes('message');
              })
              .map((n:any)=> ({
                type: n.type,
                title: n.title,
                message: n.message,
                createdAt: n.createdAt,
                data: n.data,
                _id: n._id || n.id,
                read: !!n.read,
              }))
              .sort((a:any,b:any)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 10);
            setNotifications(filtered);
          } else {
            setNotifications([]);
          }
        } catch {
          setNotifications([]);
        }
      }
    } catch { setNotifications([]); }
  };
  
  return (
    <>
    <header className="w-full">
      {/* Top promotional banner removed per request */}

      {/* Main header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              {/* Back button */}
              {!isHome && !hideBack && (
                <button
                  onClick={() => {
                    // Special case: from notifications page, vendors go back to vendor dashboard
                    if (current === 'notifications' && isVendor) { go('vendor-dashboard'); return; }
                    if (goBack) return goBack();
                    // Try using stored previous page from Router if available
                    if (typeof window !== 'undefined') {
                      try {
                        const prev = localStorage.getItem('mock_prev_page');
                        if (prev) { go(prev); return; }
                      } catch {}
                    }
                    // Fallback to browser history
                    if (typeof window !== 'undefined' && window.history.length > 1) {
                      try { window.history.back(); return; } catch {}
                    }
                    // Final fallback
                    go('home');
                  }}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label={locale==='ar' ? 'رجوع' : 'Back'}
                  title={locale==='ar' ? 'رجوع' : 'Back'}
                >
                  {locale === 'ar' ? (
                    <ArrowRight className="w-5 h-5" />
                  ) : (
                    <ArrowLeft className="w-5 h-5" />
                  )}
                </button>
              )}

              <button onClick={() => go('home')} className="flex items-center gap-2" aria-label={t('brandLogo')}>
                <div className="bg-primary text-white p-2 rounded-lg">
                  <div className="w-8 h-8 flex items-center justify-center font-bold text-lg">
                    {t('brandName').charAt(0)}
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-primary">{t('brandName')}</h1>
                  <p className="text-xs text-muted-foreground">{t('brandSubtitle')}</p>
                </div>
              </button>
            </div>

            {/* Navigation */}
            {!isRestricted && (
              <nav className="hidden md:flex items-center gap-8">
                <button onClick={() => go('home')} className="text-foreground hover:text-primary transition-colors">{t('home')}</button>
                <button onClick={() => go('products')} className="text-foreground hover:text-primary transition-colors">{t('products')}</button>
                <button onClick={() => go('offers')} className="text-foreground hover:text-primary transition-colors">{t('offers')}</button>
                {/* Projects/Services: for workers show Services instead of Projects */}
                {isWorker ? (
                  <button onClick={() => go('technician-services')} className="text-foreground hover:text-primary transition-colors">{locale==='ar' ? 'الخدمات' : 'Services'}</button>
                ) : (
                  <button onClick={() => go('projects')} className="text-foreground hover:text-primary transition-colors">{t('projects') || (locale==='ar'?'المشاريع':'Projects')}</button>
                )}
                {/* Rentals: show for all logged-in users, including technicians */}
                {user && (
                  <button onClick={() => go('rentals')} className="text-foreground hover:text-primary transition-colors">{locale==='ar' ? 'التأجير' : 'Rentals'}</button>
                )}
                {/* Removed separate technician quick link as services replaces projects above */}
                <button onClick={() => go('about')} className="text-foreground hover:text-primary transition-colors">{t('about')}</button>
              </nav>
            )}

            {/* Contact info & actions */}
            <div className="flex items-center gap-4">
              {!isRestricted && (
                <div className="hidden lg:flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{t('phone')}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{t('location')}</span>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <LanguageSwitcher />
                {/* Guest favorites button removed per request */}
                {user && (
                  <Popover open={notifOpen} onOpenChange={async (o)=>{ setNotifOpen(o); if (o) { await markAllNotificationsRead().catch(()=>{}); loadNotifications(); setVendorMsgCount(0); } }}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative"
                        onMouseDown={(e)=>{ e.preventDefault(); if (!notifOpen) { setNotifOpen(true); loadNotifications(); } }}
                        onClick={(e)=>{ e.preventDefault(); }}
                        aria-label={locale==='ar' ? 'التنبيهات' : 'Notifications'}
                        title={locale==='ar' ? 'التنبيهات' : 'Notifications'}
                      >
                        <Bell className="w-5 h-5" />
                        {vendorMsgCount > 0 && (
                          <Badge className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full px-1 flex items-center justify-center text-xs">
                            {vendorMsgCount}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align={locale==='ar' ? 'start' : 'end'} side="bottom" sideOffset={10} className="w-80 p-0 bg-white">
                      <div className="p-3 border-b font-semibold text-sm">
                        {locale==='ar' ? 'التنبيهات' : 'Notifications'}
                      </div>
                      <div className="p-3 space-y-3 max-h-80 overflow-auto">
                        {notifications.length === 0 && (
                          <div className="text-sm text-muted-foreground">
                            {locale==='ar' ? 'لا توجد تنبيهات حالياً.' : 'No notifications yet.'}
                          </div>
                        )}
                        {notifications.map((n:any, idx:number) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setNotifOpen(false);
                              // Clear the badge count once a notification item is opened
                              setVendorMsgCount(0);
                              
                              // Handle admin notifications - navigate to appropriate page
                              if (isAdmin && n.page) {
                                if (setCurrentPage) setCurrentPage(n.page);
                                else {
                                  const url = new URL(window.location.href);
                                  url.searchParams.set('page', n.page);
                                  window.location.href = url.toString();
                                }
                                return;
                              }

                              // Handle vendor notifications - navigate to appropriate page
                              if ((isVendor || role === 'merchant') && n.page) {
                                // Store any additional data for the target page
                                if (n.data) {
                                  Object.keys(n.data).forEach(key => {
                                    try {
                                      localStorage.setItem(`vendor_${key}`, String(n.data[key]));
                                    } catch {}
                                  });
                                }
                                
                                if (setCurrentPage) setCurrentPage(n.page);
                                else {
                                  const url = new URL(window.location.href);
                                  url.searchParams.set('page', n.page);
                                  window.location.href = url.toString();
                                }
                                return;
                              }

                              // Handle technician notifications - navigate to appropriate page
                              if ((isWorker || role === 'technician') && n.page) {
                                // Store any additional data for the target page
                                if (n.data) {
                                  Object.keys(n.data).forEach(key => {
                                    try {
                                      localStorage.setItem(`technician_${key}`, String(n.data[key]));
                                    } catch {}
                                  });
                                }
                                
                                if (setCurrentPage) setCurrentPage(n.page);
                                else {
                                  const url = new URL(window.location.href);
                                  url.searchParams.set('page', n.page);
                                  window.location.href = url.toString();
                                }
                                return;
                              }

                              // Handle customer notifications - navigate to appropriate page
                              if (isCustomerRole && n.page) {
                                // Store any additional data for the target page
                                if (n.data) {
                                  Object.keys(n.data).forEach(key => {
                                    try {
                                      localStorage.setItem(`customer_${key}`, String(n.data[key]));
                                    } catch {}
                                  });
                                }
                                
                                if (setCurrentPage) setCurrentPage(n.page);
                                else {
                                  const url = new URL(window.location.href);
                                  url.searchParams.set('page', n.page);
                                  window.location.href = url.toString();
                                }
                                return;
                              }
                              
                              // Handle chat.message first using conversationId to open existing chat
                              if (n.type === 'chat.message' && n.conversationId) {
                                (async () => {
                                  try {
                                    const cid = String(n.conversationId);
                                    try { if (n._id) await markNotificationRead(String(n._id)); } catch {}
                                    try { localStorage.setItem('chat_conversation_id', cid); } catch {}
                                    const c = await getConversation(cid);
                                    if (c.ok && c.data) {
                                      const roleLower = role;
                                      if (roleLower === 'vendor') {
                                        const techId = String((c.data as any).technicianId || '');
                                        const sid = String((c.data as any).serviceRequestId || '');
                                        try { if (techId) localStorage.setItem('chat_technician_id', techId); } catch {}
                                        try { if (sid) localStorage.setItem('chat_service_id', sid); } catch {}
                                        if (setCurrentPage) setCurrentPage('vendor-chat'); else {
                                          const url = new URL(window.location.href); url.searchParams.set('page','vendor-chat'); window.location.href = url.toString();
                                        }
                                      } else {
                                        // technician or others
                                        const sid = String((c.data as any).serviceRequestId || '');
                                        try { if (sid) localStorage.setItem('chat_service_id', sid); } catch {}
                                        if (setCurrentPage) setCurrentPage('technician-chat'); else {
                                          const url = new URL(window.location.href); url.searchParams.set('page','technician-chat'); window.location.href = url.toString();
                                        }
                                      }
                                      return;
                                    }
                                  } catch {}
                                })();
                                return;
                              }
                              if (role === 'vendor') {
                                try {
                                  if (n.type === 'project' || n.projectId || n.conversationId) {
                                    if (n.projectId) localStorage.setItem('project_chat_project_id', String(n.projectId));
                                    if (n.conversationId) localStorage.setItem('project_chat_conversation_id', String(n.conversationId));
                                    // Ensure merchant id/name are available for ProjectChat resolution
                                    try {
                                      if (user?.id) localStorage.setItem('project_chat_merchant_id', String(user.id));
                                      if (displayName) localStorage.setItem('project_chat_merchant_name', String(displayName));
                                    } catch {}
                                  } else if (n.rentalId) {
                                    localStorage.setItem('open_messages_rental', String(n.rentalId));
                                    // Dispatch an event so vendor-rentals page can react immediately without reload
                                    if (typeof window !== 'undefined' && n.rentalId) {
                                      try { window.dispatchEvent(new CustomEvent('open_messages_rental', { detail: { rentalId: String(n.rentalId) } })); } catch {}
                                    }
                                  }
                                } catch {}
                                if (setCurrentPage) {
                                  if (n.type === 'project' || n.projectId || n.conversationId) {
                                    // Prefer URL with params when possible
                                    try {
                                      const url = new URL(window.location.href);
                                      url.searchParams.set('page','project-chat');
                                      if (n.projectId) url.searchParams.set('projectId', String(n.projectId));
                                      if (n.conversationId) url.searchParams.set('conversationId', String(n.conversationId));
                                      window.location.href = url.toString();
                                    } catch {
                                      setCurrentPage('project-chat');
                                    }
                                  } else {
                                    setCurrentPage('vendor-rentals');
                                  }
                                } else if (typeof window !== 'undefined') {
                                  try {
                                    const url = new URL(window.location.href);
                                    if (n.type === 'project' || n.projectId || n.conversationId) {
                                      url.searchParams.set('page','project-chat');
                                      if (n.projectId) url.searchParams.set('projectId', String(n.projectId));
                                      if (n.conversationId) url.searchParams.set('conversationId', String(n.conversationId));
                                    } else {
                                      url.searchParams.set('page','vendor-rentals');
                                      if (n.rentalId) url.searchParams.set('openMessagesFor', String(n.rentalId||''));
                                    }
                                    window.location.href = url.toString();
                                  } catch {}
                                }
                              } else if (role === 'customer') {
                                // customer: open project chat or rental contract
                                try {
                                  if (n.type === 'project' || n.projectId || n.conversationId) {
                                    if (n.projectId) localStorage.setItem('project_chat_project_id', String(n.projectId));
                                    if (n.conversationId) localStorage.setItem('project_chat_conversation_id', String(n.conversationId));
                                  } else if (n.rentalId) {
                                    localStorage.setItem('open_messages_contract', String(n.rentalId));
                                  }
                                } catch {}
                                if (setCurrentPage) {
                                  if (n.type === 'project' || n.projectId || n.conversationId) {
                                    try {
                                      const url = new URL(window.location.href);
                                      url.searchParams.set('page','project-chat');
                                      if (n.projectId) url.searchParams.set('projectId', String(n.projectId));
                                      if (n.conversationId) url.searchParams.set('conversationId', String(n.conversationId));
                                      window.location.href = url.toString();
                                    } catch {
                                      setCurrentPage('project-chat');
                                    }
                                  } else {
                                    setCurrentPage('rental-contract');
                                  }
                                } else if (typeof window !== 'undefined') {
                                  try {
                                    const url = new URL(window.location.href);
                                    if (n.type === 'project' || n.projectId || n.conversationId) {
                                      url.searchParams.set('page','project-chat');
                                      if (n.projectId) url.searchParams.set('projectId', String(n.projectId));
                                      if (n.conversationId) url.searchParams.set('conversationId', String(n.conversationId));
                                    } else {
                                      url.searchParams.set('page','rental-contract');
                                      if (n.rentalId) url.searchParams.set('id', String(n.rentalId));
                                      url.searchParams.set('openMessagesFor', String(n.rentalId||''));
                                    }
                                    window.location.href = url.toString();
                                  } catch {}
                                }
                              } else {
                                // Other roles: no-op
                              }
                            }}
                            className="w-full text-left p-3 border rounded-md hover:bg-gray-50"
                          >
                            <div className="text-sm font-medium">{n.title || (locale==='ar' ? 'تنبيه' : 'Notification')}</div>
                            {n.message && (
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</div>
                            )}
                            {n.createdAt && (
                              <div className="text-[11px] text-muted-foreground mt-1">
                                {new Date(n.createdAt).toLocaleString(locale==='ar' ? 'ar-EG' : 'en-US')}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="p-3 border-t">
                        <Button
                          className="w-full"
                          onClick={() => {
                            setNotifOpen(false);
                            
                            // Different pages for different user types
                            let targetPage = 'notifications'; // default for customers and technicians
                            if (isAdmin) {
                              targetPage = 'admin-dashboard';
                            } else if (isVendor || role === 'merchant') {
                              targetPage = 'vendor-dashboard';
                            } else if (isWorker || role === 'technician') {
                              targetPage = 'notifications'; // technicians go to notifications page
                            }
                            
                            if (setCurrentPage) {
                              setCurrentPage(targetPage);
                            } else {
                              // Fallback navigation
                              if (typeof window !== 'undefined') {
                                try {
                                  const url = new URL(window.location.href);
                                  url.searchParams.set('page', targetPage);
                                  window.location.href = url.toString();
                                } catch (e) {
                                  console.error('Navigation error:', e);
                                  // Direct navigation as last resort
                                  window.location.href = `/${locale}?page=${targetPage}`;
                                }
                              }
                            }
                          }}
                        >
                          {locale==='ar' ? 'عرض المزيد' : 'Show more'}
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                {user && !isAdmin && (
                  <Popover open={chatOpen} onOpenChange={(o)=>{ setChatOpen(o); if (o) loadChats(); }}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative"
                        onClick={(e)=>{ e.preventDefault(); if (setCurrentPage) setCurrentPage('chat-inbox'); else { const url=new URL(window.location.href); url.searchParams.set('page','chat-inbox'); window.location.href=url.toString(); } }}
                        aria-label={locale==='ar' ? 'الدردشة' : 'Chat'}
                        title={locale==='ar' ? 'الدردشة' : 'Chat'}
                      >
                        <MessageCircle className="w-5 h-5" />
                        {chatUnreadCount > 0 && (
                          <Badge className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full px-1 flex items-center justify-center text-xs">
                            {chatUnreadCount}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align={locale==='ar' ? 'start' : 'end'} side="bottom" sideOffset={10} className="w-80 p-0 bg-white">
                      <div className="p-3 border-b font-semibold text-sm">
                        {locale==='ar' ? 'الدردشة' : 'Chat'}
                      </div>
                      <div className="p-3 space-y-3 max-h-80 overflow-auto">
                        {chatItems.length === 0 && (
                          <div className="text-sm text-muted-foreground">
                            {locale==='ar' ? 'لا توجد رسائل دردشة.' : 'No chat messages.'}
                          </div>
                        )}
                        {chatItems.map((n:any, idx:number) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setChatOpen(false);
                              (async () => {
                                try {
                                  const cid = String(n.conversationId||'');
                                  if (!cid) return;
                                  // If this is a rental chat notification, open chat-inbox and trigger rental thread open
                                  if (String(n.kind||'') === 'rental') {
                                    try { if (n._id) await markNotificationRead(String(n._id)); } catch {}
                                    // Navigate to chat inbox and dispatch an event so ChatInbox can open the rental thread immediately
                                    if (setCurrentPage) setCurrentPage('chat-inbox'); else {
                                      const url = new URL(window.location.href); url.searchParams.set('page','chat-inbox'); window.location.href = url.toString();
                                    }
                                    try {
                                      if (typeof window !== 'undefined') {
                                        window.dispatchEvent(new CustomEvent('chat_incoming', { detail: { at: Date.now(), conversationId: cid, kind: 'rental' } }));
                                      }
                                    } catch {}
                                    return;
                                  }
                                  // Otherwise, treat as service/project conversation
                                  try { localStorage.setItem('chat_conversation_id', cid); } catch {}
                                  const c = await getConversation(cid);
                                  if (c.ok && c.data) {
                                    const roleLower = role;
                                    if (roleLower === 'vendor') {
                                      const techId = String((c.data as any).technicianId || '');
                                      const sid = String((c.data as any).serviceRequestId || '');
                                      try { if (techId) localStorage.setItem('chat_technician_id', techId); } catch {}
                                      try { if (sid) localStorage.setItem('chat_service_id', sid); } catch {}
                                      if (setCurrentPage) setCurrentPage('vendor-chat'); else {
                                        const url = new URL(window.location.href); url.searchParams.set('page','vendor-chat'); window.location.href = url.toString();
                                      }
                                    } else if (roleLower === 'worker' || roleLower === 'technician') {
                                      const sid = String((c.data as any).serviceRequestId || '');
                                      try { if (sid) localStorage.setItem('chat_service_id', sid); } catch {}
                                      if (setCurrentPage) setCurrentPage('technician-chat'); else {
                                        const url = new URL(window.location.href); url.searchParams.set('page','technician-chat'); window.location.href = url.toString();
                                      }
                                    } else {
                                      // customers or other roles: go to project-chat
                                      const pid = String((c.data as any).projectId || '');
                                      try { if (pid) localStorage.setItem('project_chat_project_id', pid); } catch {}
                                      if (setCurrentPage) setCurrentPage('project-chat'); else {
                                        const url = new URL(window.location.href); url.searchParams.set('page','project-chat'); window.location.href = url.toString();
                                      }
                                    }
                                  }
                                } catch {}
                              })();
                            }}
                            className="w-full text-left p-3 border rounded-md hover:bg-gray-50"
                          >
                            <div className="text-sm font-medium line-clamp-1">{n.title || (locale==='ar' ? 'رسالة دردشة' : 'Chat')}</div>
                            {n.message && (
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</div>
                            )}
                            {n.createdAt && (
                              <div className="text-[11px] text-muted-foreground mt-1">
                                {new Date(n.createdAt).toLocaleString(locale==='ar' ? 'ar-EG' : 'en-US')}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="p-3 border-t">
                        <Button className="w-full" onClick={() => { setChatOpen(false); if (setCurrentPage) setCurrentPage('chat-inbox'); else { const url=new URL(window.location.href); url.searchParams.set('page','chat-inbox'); window.location.href=url.toString(); } }}>
                          {locale==='ar' ? 'فتح الدردشة' : 'Open Chat'}
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                {/* Auth area */}
                {user ? (
                  <>
                    {/* Desktop greeting */}
                    <div className="hidden md:flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {locale === 'ar' ? 'أهلاً،' : 'Welcome,'} <span className="font-semibold text-foreground">{displayName}</span>
                      </span>
                      {isVendor && !isRestricted && (
                        <button
                          onClick={() => go('vendor-dashboard')}
                          className="text-foreground hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          {locale === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                        </button>
                      )}
                      {isAdmin && !isRestricted && (
                        <button
                          onClick={() => go('admin-dashboard')}
                          className="text-foreground hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          {locale === 'ar' ? 'لوحة المدير' : 'Admin Dashboard'}
                        </button>
                      )}
                      {!isRestricted && (
                        <Button variant="ghost" size="icon" onClick={() => go('profile')} aria-label="Profile">
                          <User className="w-5 h-5" />
                        </Button>
                      )}
                      <button
                        onClick={() => { try { apiLogout(); localStorage.removeItem('mock_current_user'); } catch {} setUser && setUser(null); go('home'); }}
                        className="text-foreground hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        {locale === 'ar' ? 'تسجيل الخروج' : 'Logout'}
                      </button>
                    </div>
                    {/* Mobile minimal greeting for restricted roles */}
                    {isRestricted && (
                      <span className="md:hidden text-sm text-muted-foreground">
                        {locale==='ar' ? (isVendor ? 'أهلاً تاجر' : 'أهلاً مدير') : (isVendor ? 'Hello Vendor' : 'Hello Admin')}
                      </span>
                    )}
                  </>
                ) : (
                  <div className="hidden md:flex items-center gap-4">
                    <button
                      onClick={() => go('login')}
                      className="text-foreground hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      {locale === 'ar' ? 'تسجيل الدخول' : 'Login'}
                    </button>
                    <button
                      onClick={() => go('register')}
                      className="text-foreground hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      {locale === 'ar' ? 'إنشاء حساب' : 'Register'}
                    </button>
                  </div>
                )}
                {/* Show cart for guests and customers (hide only for restricted roles) */}
                {!isRestricted && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    onClick={() => go('cart')}
                    aria-label={locale==='ar' ? 'سلة التسوق' : 'Cart'}
                    title={locale==='ar' ? 'سلة التسوق' : 'Cart'}
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {cartCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full px-1 flex items-center justify-center text-xs">
                        {cartCount}
                      </Badge>
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open menu"
                  aria-expanded={mobileOpen}
                  onClick={() => setMobileOpen((v) => !v)}
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 dark:text-gray-100 border-b dark:border-gray-700 shadow-sm">
          <div className="container mx-auto px-4 py-2 flex flex-col gap-1">
            {!isRestricted && (
              <>
                <button onClick={() => { go('home'); setMobileOpen(false); }} className="py-3 text-left text-foreground hover:text-primary transition-colors">{t('home')}</button>
                <button onClick={() => { go('products'); setMobileOpen(false); }} className="py-3 text-left text-foreground hover:text-primary transition-colors">{t('products')}</button>
                <button onClick={() => { go('offers'); setMobileOpen(false); }} className="py-3 text-left text-foreground hover:text-primary transition-colors">{t('offers')}</button>
                {/* Projects/Services: for workers show Services instead of Projects */}
                {isWorker ? (
                  <button onClick={() => { go('technician-services'); setMobileOpen(false); }} className="py-3 text-left text-foreground hover:text-primary transition-colors">{locale==='ar' ? 'الخدمات' : 'Services'}</button>
                ) : (
                  <button onClick={() => { go('projects'); setMobileOpen(false); }} className="py-3 text-left text-foreground hover:text-primary transition-colors">{t('projects') || (locale==='ar'?'المشاريع':'Projects')}</button>
                )}
                {/* Rentals: show only for logged-in, non-worker users */}
                {user && !isWorker && (
                  <button onClick={() => { go('rentals'); setMobileOpen(false); }} className="py-3 text-left text-foreground hover:text-primary transition-colors">{locale==='ar' ? 'التأجير' : 'Rentals'}</button>
                )}
                {/* Removed duplicate technician services quick link */}
                {/* Vendor dashboard quick link visible for vendors */}
                {user && isVendor && (
                  <button onClick={() => { go('vendor-dashboard'); setMobileOpen(false); }} className="py-3 text-left text-foreground hover:text-primary transition-colors">{locale==='ar' ? 'لوحة التحكم' : 'Dashboard'}</button>
                )}
                <button onClick={() => { go('about'); setMobileOpen(false); }} className="py-3 text-left text-foreground hover:text-primary transition-colors">{t('about')}</button>
                <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              </>
            )}
            {/* Restricted (admin only): show limited options */}
            {isAdmin && (
              <>
                <button onClick={() => { try { apiLogout(); localStorage.removeItem('mock_current_user'); } catch {} setUser && setUser(null); go('home'); setMobileOpen(false); }} className="py-3 text-left text-foreground hover:text-primary transition-colors">{locale === 'ar' ? 'تسجيل الخروج' : 'Logout'}</button>
              </>
            )}
            {user ? (
              <>
                {!isRestricted && (
                  <button onClick={() => { go('profile'); setMobileOpen(false); }} className="py-3 text-left text-foreground hover:text-primary transition-colors">{locale === 'ar' ? 'الملف الشخصي' : 'Profile'}</button>
                )}
                {!isRestricted && (
                  <button onClick={() => { try { apiLogout(); localStorage.removeItem('mock_current_user'); } catch {} setUser && setUser(null); go('home'); setMobileOpen(false); }} className="py-3 text-left text-foreground hover:text-primary transition-colors">{locale === 'ar' ? 'تسجيل الخروج' : 'Logout'}</button>
                )}
              </>
            ) : (
              !isRestricted && (
                <>
                  <button onClick={() => { go('login'); setMobileOpen(false); }} className="py-3 text-left text-foreground hover:text-primary transition-colors">{locale === 'ar' ? 'تسجيل الدخول' : 'Login'}</button>
                  <button onClick={() => { go('register'); setMobileOpen(false); }} className="py-3 text-left text-foreground hover:text-primary transition-colors">{locale === 'ar' ? 'إنشاء حساب' : 'Register'}</button>
                </>
              )
            )}
          </div>
        </div>
      )}
    </header>

    {/* Floating Chatbot Button (bottom-right) - hidden on support page and for admins */}
    {current !== 'support' && !isAdmin && (
      <Button
        className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg h-12 w-12 p-0 bg-blue-600 hover:bg-blue-700 text-white"
        onClick={() => go('support')}
        aria-label={locale==='ar' ? 'الدعم' : 'Support'}
        title={locale==='ar' ? 'الدعم' : 'Support'}
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    )}

    {/* Notifications popover handled above */}
    </>
  );
}
