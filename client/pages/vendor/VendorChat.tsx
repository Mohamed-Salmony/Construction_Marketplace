import { useEffect, useRef, useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import type { RouteContext } from "../../components/routerTypes";
import { useTranslation } from "../../hooks/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { getConversation, getConversationByKeys, listMessages, sendMessage } from "@/services/chat";
import { useFirstLoadOverlay } from "../../hooks/useFirstLoadOverlay";

export default function VendorChat({ setCurrentPage, ...context }: Partial<RouteContext>) {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';
  const hideFirstOverlay = useFirstLoadOverlay(
    context,
    isAr ? 'جاري تحميل المحادثة' : 'Loading chat',
    isAr ? 'يرجى الانتظار' : 'Please wait'
  );

  const [technicianId, setTechnicianId] = useState<string>("");
  const [technicianName, setTechnicianName] = useState<string>("");
  const [serviceId, setServiceId] = useState<string>("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState<string>("");
  const [messages, setMessages] = useState<Array<{ id: number; from: string; text: string; ts: number }>>([]);
  const [text, setText] = useState<string>("");
  const endRef = useRef<HTMLDivElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [vendorName, setVendorName] = useState<string>("");

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tid = window.localStorage.getItem('chat_technician_id') || '';
    const sid = window.localStorage.getItem('chat_service_id') || '';
    const cid = window.localStorage.getItem('chat_conversation_id') || null;
    const tname = window.localStorage.getItem('chat_technician_name') || '';
    setTechnicianId(tid);
    setServiceId(sid);
    if (tname && !technicianName) setTechnicianName(tname);
    if (cid) setConversationId(String(cid));
    // Fallback: if no conversation id but we have keys and user is vendor, try resolve
    if (!cid && tid && sid) {
      (async () => {
        try {
          const found = await getConversationByKeys(String(sid), String(tid));
          if (found.ok && (found.data as any)?.id) {
            const id = String((found.data as any).id);
            setConversationId(id);
            try { window.localStorage.setItem('chat_conversation_id', id); } catch {}
          }
        } catch (e) {
          // ignore; will show empty state
          console.warn('Failed to resolve conversation by keys', e);
        } finally { try { hideFirstOverlay(); } catch {} }
      })();
    } else { try { hideFirstOverlay(); } catch {} }
  }, [hideFirstOverlay, technicianName]);

  // Load conversation details if only cid known (optional)
  useEffect(() => {
    (async () => {
      try {
        if (!conversationId) return;
        const c = await getConversation(String(conversationId));
        if (c.ok && c.data) {
          setTechnicianId((c.data as any).technicianId || technicianId);
          setServiceId(String((c.data as any).serviceRequestId || serviceId));
          setVendorId((c.data as any).vendorId || vendorId);
          setTechnicianName((c.data as any).technicianName || "");
          setVendorName((c.data as any).vendorName || "");
        }
      } catch {}
    })();
  }, [conversationId, technicianId, vendorId, serviceId]);

  // Poll messages
  useEffect(() => {
    let timer: any;
    (async () => {
      try {
        if (!conversationId) return;
        const r = await listMessages(String(conversationId));
        if (r.ok && Array.isArray(r.data)) {
          const arr = (r.data as any[]).map(m => ({ id: m.id, from: m.from, text: m.text, ts: new Date(m.createdAt).getTime() }));
          setMessages(arr);
        } else if (!r.ok) {
          console.warn('Failed to list messages', r.status, r.error);
        }
      } catch {}
    })();
    if (conversationId) {
      timer = setInterval(async () => {
        try {
          const r = await listMessages(String(conversationId));
          if (r.ok && Array.isArray(r.data)) {
            const arr = (r.data as any[]).map(m => ({ id: m.id, from: m.from, text: m.text, ts: new Date(m.createdAt).getTime() }));
            setMessages(arr);
          } else if (!r.ok) {
            // keep previous messages; optionally log
            console.warn('Polling listMessages failed', r.status);
          }
        } catch {}
      }, 3500);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [conversationId]);

  useEffect(() => {
    const el = boxRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    } else {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  const send = () => {
    if (!text.trim() || !conversationId) return;
    (async () => {
      try {
        const r = await sendMessage(String(conversationId), text.trim());
        if (r.ok) {
          // refresh messages immediately
          const l = await listMessages(String(conversationId));
          if (l.ok && Array.isArray(l.data)) {
            const arr = (l.data as any[]).map(m => ({ id: m.id, from: m.from, text: m.text, ts: new Date(m.createdAt).getTime() }));
            setMessages(arr);
          }
          setText("");
        } else {
          alert(isAr ? 'تعذر إرسال الرسالة. تأكد من تسجيل الدخول وتشغيل الخادم.' : 'Failed to send message. Ensure you are logged in and the server is running.');
        }
      } catch {}
    })();
  };

  return (
    <div className="min-h-screen bg-background" dir={isAr ? 'rtl' : 'ltr'}>
      <Header currentPage="vendor-chat" setCurrentPage={setCurrentPage as any} {...(context as any)} />
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>{isAr ? 'مراسلة الفني' : 'Message Technician'}</span>
              <div className="text-xs text-muted-foreground">{isAr ? `الفني: ${technicianName || 'الفني'}` : `Tech: ${technicianName || 'Technician'}`}</div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={boxRef} className="h-96 overflow-y-auto border rounded-md p-3 bg-muted/20">
              {(!conversationId) ? (
                <div className="text-sm text-muted-foreground text-center mt-8">
                  {isAr ? 'لا توجد محادثة محددة. حاول فتحها من صفحة المتقدمين.' : 'No conversation selected. Open it from applicants page.'}
                </div>
              ) : messages.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center mt-8">
                  {isAr ? 'ابدأ المحادثة بإرسال رسالة.' : 'Start the conversation by sending a message.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((m, i) => {
                    const isMine = m.from === vendorId;
                    const senderName = isMine ? (isAr ? 'أنا' : 'Me') : (technicianName || (isAr ? 'الفني' : 'Technician'));
                    return (
                      <div key={m.id ?? i} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                        <div className={`text-[11px] mb-1 ${isMine ? 'text-right' : 'text-left'} ${isMine ? 'text-blue-700' : 'text-muted-foreground'}`}>{senderName}</div>
                        <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${isMine ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
                          <div>{m.text}</div>
                          <div className={`text-[10px] opacity-70 mt-1 ${isMine ? 'text-right' : 'text-left'}`}>
                            {new Date(m.ts).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-3">
              <Input value={text} onChange={(e)=> setText(e.target.value)} placeholder={isAr ? 'اكتب رسالة...' : 'Type a message...'} onKeyDown={(e)=> { if (e.key==='Enter') send(); }} />
              <Button onClick={send} disabled={!text.trim()}>{isAr ? 'إرسال' : 'Send'}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer setCurrentPage={setCurrentPage as any} />
    </div>
  );
}
