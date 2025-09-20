import { useEffect, useRef, useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import type { RouteContext } from "../../components/routerTypes";
import { useTranslation } from "../../hooks/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { getConversation, listMessages, sendMessage } from "@/services/chat";

export default function TechnicianChat({ setCurrentPage, ...context }: Partial<RouteContext>) {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';
  const userRole = String((context as any)?.user?.role || '').toLowerCase();
  const userName = String((context as any)?.user?.name || '').trim();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string>("");
  const [vendorId, setVendorId] = useState<string>("");
  const [vendorName, setVendorName] = useState<string>("");
  const [techId, setTechId] = useState<string>("");
  const [messages, setMessages] = useState<Array<{ id: number; from: string; text: string; ts: number }>>([]);
  const [text, setText] = useState<string>("");
  const endRef = useRef<HTMLDivElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cid = window.localStorage.getItem('chat_conversation_id') || null;
    if (cid) setConversationId(String(cid));
    const sid = window.localStorage.getItem('chat_service_id') || '';
    if (sid) setServiceId(sid);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!conversationId) return;
        const c = await getConversation(String(conversationId));
        if (c.ok && c.data) {
          setServiceId(String((c.data as any).serviceRequestId || ''));
          setVendorId((c.data as any).vendorId || '');
          setVendorName((c.data as any).vendorName || "");
          setTechId((c.data as any).technicianId || '');
        }
      } catch {}
    })();
  }, [conversationId]);

  // Fallback vendor name from context if server didn't provide it
  useEffect(() => {
    if (!vendorName && userRole==='vendor') {
      if (userName) setVendorName(userName);
    }
  }, [vendorName, userRole, userName]);

  useEffect(() => {
    let timer: any;
    (async () => {
      try {
        if (!conversationId) return;
        const r = await listMessages(String(conversationId));
        if (r.ok && Array.isArray(r.data)) {
          const arr = (r.data as any[]).map(m => ({ id: m.id, from: m.from, text: m.text, ts: new Date(m.createdAt).getTime() }));
          setMessages(arr);
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
          }
        } catch {}
      }, 3500);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [conversationId]);

  useEffect(() => {
    // Scroll the messages container itself to bottom to avoid page jump
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
          const l = await listMessages(String(conversationId));
          if (l.ok && Array.isArray(l.data)) {
            const arr = (l.data as any[]).map(m => ({ id: m.id, from: m.from, text: m.text, ts: new Date(m.createdAt).getTime() }));
            setMessages(arr);
          }
          setText("");
        }
      } catch {}
    })();
  };

  return (
    <div className="min-h-screen bg-background" dir={isAr ? 'rtl' : 'ltr'}>
      <Header currentPage="technician-chat" setCurrentPage={setCurrentPage as any} {...(context as any)} />
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>{isAr ? 'دردشة مع التاجر' : 'Chat with Vendor'}</span>
              <div className="text-xs text-muted-foreground">{isAr ? `التاجر: ${vendorName || (context as any)?.user?.name || 'غير معرّف'}` : `Vendor: ${vendorName || (context as any)?.user?.name || 'Unknown'}`}</div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={boxRef} className="h-96 overflow-y-auto border rounded-md p-3 bg-muted/20">
              {messages.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center mt-8">
                  {isAr ? 'لا توجد رسائل بعد.' : 'No messages yet.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((m, i) => {
                    const isMine = m.from === techId;
                    const senderName = isMine ? (isAr ? 'أنا' : 'Me') : (vendorName || (isAr ? 'التاجر' : 'Vendor'));
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
