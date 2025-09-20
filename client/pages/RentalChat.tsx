import { useEffect, useRef, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import type { RouteContext } from '../components/Router';
import { useTranslation } from '../hooks/useTranslation';
import { listRentalMessages, sendRentalMessage, listTechRentalMessages, sendTechRentalMessage } from '@/services/rentals';
import { Card, CardContent } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { MessageCircle, Send } from 'lucide-react';
import { toastError, toastSuccess } from '../utils/alerts';

export default function RentalChat(context: Partial<RouteContext> = {}) {
  const { locale } = useTranslation();
  const roleLower = String((context as any)?.user?.role || '').toLowerCase();
  const useTechChannel = roleLower==='technician' || roleLower==='worker' || roleLower==='vendor';
  const [rentalId, setRentalId] = useState<string>('');
  const [messages, setMessages] = useState<Array<{ id: string; message: string; at: string; from: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement|null>(null);
  const inputRef = useRef<HTMLTextAreaElement|null>(null);

  // read id from URL
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const id = String(url.searchParams.get('id') || '').trim();
      if (id) setRentalId(id);
    } catch {}
  }, []);

  // load messages
  useEffect(() => {
    if (!rentalId) return;
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const r = useTechChannel ? await listTechRentalMessages(rentalId) : await listRentalMessages(rentalId);
        if (!cancelled) {
          const arr = (r.ok && Array.isArray(r.data)) ? (r.data as any[]).map((m:any)=> ({ id: String(m.id||m._id||''), message: String(m.message||''), at: String(m.at||m.createdAt||''), from: String(m.from||m.fromUserId||'') })) : [];
          setMessages(arr);
          setTimeout(()=> { try { listRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); } catch {} }, 50);
        }
      } catch { if (!cancelled) setMessages([]); }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    const t = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(t); };
  }, [rentalId, useTechChannel]);

  useEffect(() => {
    // focus editor when navigated here
    setTimeout(()=> inputRef.current?.focus(), 150);
  }, [rentalId]);

  const send = async () => {
    const msg = text.trim();
    if (!msg) { toastError(locale==='ar'? 'اكتب رسالة' : 'Write a message', locale==='ar'); return; }
    if (!rentalId) return;
    try {
      const resp = useTechChannel
        ? await sendTechRentalMessage(rentalId, { message: msg })
        : await sendRentalMessage(rentalId, { message: msg });
      if ((resp as any)?.ok) {
        setText('');
        setMessages((prev)=> [{ id: String(Date.now()), message: msg, at: new Date().toISOString(), from: 'me' }, ...prev]);
        toastSuccess(locale==='ar'? 'تم الإرسال' : 'Sent', locale==='ar');
      } else if ((resp as any)?.status === 401) {
        toastError(locale==='ar'? 'سجّل الدخول للمتابعة' : 'Please login', locale==='ar');
        context.setCurrentPage && context.setCurrentPage('login');
      } else {
        toastError(locale==='ar'? 'تعذر الإرسال' : 'Failed to send', locale==='ar');
      }
    } catch {
      toastError(locale==='ar'? 'تعذر الإرسال' : 'Failed to send', locale==='ar');
    }
  };

  return (
    <div className="min-h-screen bg-background" dir={locale==='ar'?'rtl':'ltr'}>
      <Header {...(context as any)} />
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <MessageCircle className="w-5 h-5" />
          <h1 className="text-xl font-semibold">{locale==='ar' ? 'محادثة التأجير' : 'Rental Chat'}</h1>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div ref={listRef} className="border rounded-md p-3 max-h-[60vh] overflow-auto flex flex-col gap-2 bg-muted/20">
              {loading && messages.length===0 && (<div className="text-sm text-muted-foreground">{locale==='ar' ? 'جاري التحميل...' : 'Loading...'}</div>)}
              {messages.length===0 && !loading && (<div className="text-sm text-muted-foreground">{locale==='ar' ? 'لا توجد رسائل بعد' : 'No messages yet'}</div>)}
              {messages.map((m)=> (
                <div key={m.id} className={`text-sm p-2 rounded ${String(m.from||'')==='me' ? 'bg-primary text-primary-foreground self-start' : 'bg-white border self-end'}`}>
                  <div className="whitespace-pre-wrap">{m.message}</div>
                  <div className={`mt-1 opacity-70 ${String(m.from||'')==='me' ? '' : 'text-muted-foreground'}`}>{new Date(m.at).toLocaleString(locale==='ar'?'ar-EG':'en-GB')}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>{locale==='ar' ? 'اكتب رسالتك' : 'Write your message'}</Label>
              <Textarea ref={inputRef as any} value={text} onChange={(e)=> setText(e.target.value)} rows={3} placeholder={locale==='ar' ? 'اكتب هنا...' : 'Type here...'} />
              <div className="flex justify-end">
                <Button variant="outline" onClick={send}><Send className="h-4 w-4 ml-2" />{locale==='ar'?'إرسال':'Send'}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer {...(context as any)} />
    </div>
  );
}
