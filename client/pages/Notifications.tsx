import { useEffect, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import type { RouteContext } from "../components/routerTypes";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Bell } from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";
import { listMyNotifications, markNotificationRead } from "@/services/notifications";
import { getConversation } from "@/services/chat";

export default function NotificationsPage(context: Partial<RouteContext>) {
  const { locale } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const setCurrentPage = context.setCurrentPage as any;

  const load = async () => {
    try {
      const r = await listMyNotifications();
      if (r.ok && r.data && (r.data as any).success) {
        const list = ((r.data as any).data || []) as any[];
        setItems(list);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    }
  };

  useEffect(() => { void load(); }, []);

  const openFromNotification = async (n: any) => {
    try {
      // mark read first
      if (n && n._id) { try { await markNotificationRead(String(n._id)); } catch {} }
      // chat message -> navigate to chat using conversationId
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
            const role = String((context as any)?.user?.role || '').toLowerCase();
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
                  className={`p-3 border rounded-md bg-white cursor-pointer hover:bg-muted/30 ${n.read ? '' : 'border-primary/40'}`}
                  onClick={() => void openFromNotification(n)}
                >
                  <div className="text-sm font-medium">{n.title || (locale==='ar'?'تنبيه':'Notification')}</div>
                  <div className="text-sm text-muted-foreground break-words">{n.message}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString(locale==='ar'?'ar-EG':'en-US')}</div>
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
