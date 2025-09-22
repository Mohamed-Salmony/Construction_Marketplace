import { useEffect, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import type { RouteContext } from "../components/routerTypes";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Bell } from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";
import { listMyNotifications, markNotificationRead } from "@/services/notifications";
import { getConversation } from "@/services/chat";
import { getAdminPendingNotifications } from "@/services/adminNotifications";
import { getVendorNotifications } from "@/services/vendorNotifications";
import { getTechnicianNotifications } from "@/services/technicianNotifications";
import { getCustomerNotifications, markCustomerNotificationRead } from "@/services/customerNotifications";

export default function NotificationsPage(context: Partial<RouteContext>) {
  const { locale } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const setCurrentPage = context.setCurrentPage as any;

  const load = async () => {
    try {
      const user = (context as any)?.user;
      const role = (user?.role || '').toString().toLowerCase();
      const isAdmin = role === 'admin';
      const isVendor = role === 'vendor' || role === 'merchant';
      const isWorker = role === 'worker' || role === 'technician';
      const isCustomerRole = !isVendor && !isAdmin && !isWorker && !!user; // treat any other logged-in role as customer

      let notifications: any[] = [];

      if (isAdmin) {
        // For admin, show pending items that need approval
        notifications = await getAdminPendingNotifications();
      } else if (isVendor) {
        // For vendors, show business-related notifications
        notifications = await getVendorNotifications();
      } else if (isWorker) {
        // For technicians, show job-related notifications
        notifications = await getTechnicianNotifications();
      } else if (isCustomerRole) {
        // For customers, show order and project related notifications
        notifications = await getCustomerNotifications();
      } else {
        // Fallback for other users - use legacy system
        const r = await listMyNotifications();
        if (r.ok && r.data && (r.data as any).success) {
          const list = ((r.data as any).data || []) as any[];
          // Exclude any message-related notification types from the list
          notifications = list.filter((n:any)=> {
            const tp = String(n.type || '').toLowerCase();
            return tp && !tp.includes('message');
          });
        }
      }

      setItems(notifications || []);
    } catch (error) {
      console.log('Error loading notifications:', error);
      setItems([]);
    }
  };

  useEffect(() => { void load(); }, []);

  const openFromNotification = async (n: any) => {
    try {
      const user = (context as any)?.user;
      const role = (user?.role || '').toString().toLowerCase();
      const isAdmin = role === 'admin';
      const isVendor = role === 'vendor' || role === 'merchant';
      const isWorker = role === 'worker' || role === 'technician';
      const isCustomerRole = !isVendor && !isAdmin && !isWorker && !!user;

      // Mark notification as read based on user type
      if (n && n.id) {
        try {
          if (isCustomerRole) {
            await markCustomerNotificationRead(String(n.id));
          } else if (n._id) {
            await markNotificationRead(String(n._id));
          }
        } catch {}
      }

      // Handle navigation based on notification page property
      if (n.page) {
        // Store any additional data for the target page
        if (n.data) {
          const prefix = isCustomerRole ? 'customer' : isVendor ? 'vendor' : isWorker ? 'technician' : 'user';
          Object.keys(n.data).forEach(key => {
            try {
              localStorage.setItem(`${prefix}_${key}`, String(n.data[key]));
            } catch {}
          });
        }
        
        setCurrentPage && setCurrentPage(n.page);
        return;
      }

      // Handle legacy chat message navigation
      if (n?.type === 'chat.message' && n?.data?.conversationId) {
        const cid = String(n.data.conversationId);
        try { window.localStorage.setItem('chat_conversation_id', cid); } catch {}
        // try load conv to know role-based page
        try {
          const c = await getConversation(cid);
          if (c.ok && c.data) {
            const vendorId = String((c.data as any).vendorId || '');
            const techId = String((c.data as any).technicianId || '');
            const sid = String((c.data as any).serviceRequestId || '');
            try { if (sid) window.localStorage.setItem('chat_service_id', sid); } catch {}
            // decide target page based on current user role
            if (role === 'vendor') {
              try { if (techId) window.localStorage.setItem('chat_technician_id', techId); } catch {}
              setCurrentPage && setCurrentPage('vendor-chat');
            } else {
              setCurrentPage && setCurrentPage('technician-chat');
            }
            return;
          }
        } catch {}
      }
    } finally {
      // refresh list after marking read
      void load();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header {...(context as any)} />
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {locale === 'ar' ? 'التنبيهات' : 'Notifications'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.length === 0 ? (
              <div className="p-4 border rounded-lg text-sm text-muted-foreground">
                {locale === 'ar' ? 'لا توجد تنبيهات بعد.' : 'No notifications yet.'}
              </div>
            ) : (
              items.map((n:any) => (
                <div
                  key={String(n._id || n.id)}
                  className={`p-3 border rounded-md bg-white cursor-pointer hover:bg-muted/30 ${n.isRead ? '' : 'border-primary/40 bg-blue-50/50'}`}
                  onClick={() => void openFromNotification(n)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{n.title || (locale==='ar'?'تنبيه':'Notification')}</div>
                      <div className="text-sm text-muted-foreground break-words mt-1">{n.message}</div>
                      <div className="text-[10px] text-muted-foreground mt-2">{new Date(n.createdAt).toLocaleString(locale==='ar'?'ar-EG':'en-US')}</div>
                    </div>
                    {!n.isRead && (
                      <div className="w-2 h-2 bg-primary rounded-full ml-2 mt-1 flex-shrink-0"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
      <Footer setCurrentPage={context.setCurrentPage as any} />
    </div>
  );
}
