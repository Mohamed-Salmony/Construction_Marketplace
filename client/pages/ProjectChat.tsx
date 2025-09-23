import { useEffect, useRef, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import type { RouteContext } from '../components/routerTypes';
import { useTranslation } from '../hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { getProjectConversation, getProjectConversationByKeys, listProjectMessages, sendProjectMessage, createProjectConversation } from '@/services/projectChat';
import { useFirstLoadOverlay } from '../hooks/useFirstLoadOverlay';

export default function ProjectChat({ setCurrentPage, ...context }: Partial<RouteContext>) {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';
  const hideFirstOverlay = useFirstLoadOverlay(
    context,
    isAr ? 'جاري تحميل المحادثة' : 'Loading chat',
    isAr ? 'يرجى الانتظار' : 'Please wait'
  );
  // Extract stable user role and id to avoid complex expressions in deps
  const userRole = String((context as any)?.user?.role || '').toLowerCase();
  const userId = String((context as any)?.user?.id || '');

  const [projectId, setProjectId] = useState<string>('');
  const [merchantId, setMerchantId] = useState<string>('');
  const [conversationId, setConversationId] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [merchantName, setMerchantName] = useState<string>('');
  const [messages, setMessages] = useState<Array<{ id: string; from: string; text: string; ts: number }>>([]);
  const [text, setText] = useState<string>('');
  const boxRef = useRef<HTMLDivElement | null>(null);
  const firstInitRef = useRef(false);

  useEffect(() => {
    if (firstInitRef.current) return;
    firstInitRef.current = true;
    if (typeof window === 'undefined') return;
    // Extract from localStorage
    let pidLs = '';
    let cidLs = '';
    try { pidLs = localStorage.getItem('project_chat_project_id') || ''; } catch {}
    try { cidLs = localStorage.getItem('project_chat_conversation_id') || ''; } catch {}
    let midLs = '';
    try { midLs = localStorage.getItem('project_chat_merchant_id') || ''; } catch {}
    let midName = '';
    try { midName = localStorage.getItem('project_chat_merchant_name') || ''; } catch {}
    // Extract from URL query params
    let pidUrl = '';
    let cidUrl = '';
    try {
      const url = new URL(window.location.href);
      const qpPid = url.searchParams.get('projectId');
      const qpCid = url.searchParams.get('conversationId');
      if (qpPid) pidUrl = qpPid;
      if (qpCid) cidUrl = qpCid;
    } catch {}
    const pid = pidLs || pidUrl;
    const cid = cidLs || cidUrl;
    setProjectId(pid);
    setMerchantId(midLs);
    if (midName) setMerchantName(midName);
    // Determine merchant id to use now (avoid stale state inside async)
    let midUsed = midLs;
    console.log('[ProjectChat] Initial setup - pid:', pid, 'midUsed:', midUsed, 'userRole:', userRole, 'userId:', userId);
    
    // For merchants: use the stored merchant ID from localStorage (the other party)
    // For customers: midUsed should be the merchant they want to chat with
    try {
      if (!midUsed && userRole === 'vendor' && userId) {
        // If merchant and no merchantId stored, we can't determine who to chat with
        console.log('[ProjectChat] Merchant but no stored merchant ID - need to get from project context');
      }
    } catch {}
    
    (async () => {
      try {
        if (cid) {
          console.log('[ProjectChat] Using existing conversation ID:', cid);
          setConversationId(cid);
          return;
        }
        if (pid) {
          console.log('[ProjectChat] Trying to find conversations for project:', pid);
          
          // First, try to get all conversations for this project that user is part of
          try {
            const response = await fetch(`/api/ProjectChat/project/${pid}/conversations`, {
              method: 'GET',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
              const conversations = await response.json();
              console.log('[ProjectChat] Found conversations:', conversations);
              
              if (conversations && conversations.length > 0) {
                // Use the first available conversation
                const conv = conversations[0];
                const id = String(conv.id);
                setConversationId(id);
                try { window.localStorage.setItem('project_chat_conversation_id', id); } catch {}
                return;
              }
            }
          } catch (e) {
            console.log('[ProjectChat] Error fetching project conversations:', e);
          }
          
          // If no conversation found and we have merchantId, try to create or find one
          if (midUsed) {
            console.log('[ProjectChat] Trying to find/create conversation with merchant:', midUsed);
            try {
              const found = await getProjectConversationByKeys(pid, midUsed);
              if (found.ok && (found.data as any)?.id) {
                const id = String((found.data as any).id);
                setConversationId(id);
                try { window.localStorage.setItem('project_chat_conversation_id', id); } catch {}
                return;
              }
            } catch {}
            
            // Create new conversation only if user is customer (not merchant)
            if (userRole !== 'vendor') {
              try {
                const created = await createProjectConversation(pid, midUsed);
                if (created.ok && (created.data as any)?.id) {
                  const id = String((created.data as any).id);
                  setConversationId(id);
                  try { window.localStorage.setItem('project_chat_conversation_id', id); } catch {}
                  return;
                }
              } catch {}
            }
          }
        }
      } catch {}
      finally { try { hideFirstOverlay(); } catch {} }
    })();
    if (!cid && !(pid && midUsed)) { try { hideFirstOverlay(); } catch {} }
    // Listen to storage changes (e.g., when opened via notification without full reload)
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === 'project_chat_conversation_id' && e.newValue) {
        const v = String(e.newValue).trim();
        if (v) setConversationId(v);
      }
      if (e.key === 'project_chat_project_id' && e.newValue) {
        const v = String(e.newValue).trim();
        if (v) setProjectId(v);
      }
      if (e.key === 'project_chat_merchant_id' && e.newValue) {
        setMerchantId(String(e.newValue));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener('storage', onStorage); };
  }, [hideFirstOverlay, userRole, userId, context]);

  useEffect(() => {
    (async () => {
      try {
        if (!conversationId) return;
        const c = await getProjectConversation(conversationId);
        if (c.ok && c.data) {
          setMerchantId((prev) => String((c.data as any).merchantId || '') || prev);
          setMerchantName((c.data as any).merchantName || '');
          setCustomerId((prev) => String((c.data as any).customerId || '') || prev);
          setCustomerName((c.data as any).customerName || '');
        }
      } catch {}
    })();
  }, [conversationId]);

  // Poll messages
  useEffect(() => {
    let timer: any;
    (async () => {
      try {
        if (!conversationId) return;
        const r = await listProjectMessages(conversationId);
        if (r.ok && Array.isArray(r.data)) {
          const arr = (r.data as any[]).map(m => ({ id: m.id || m._id, from: m.from || m.fromUserId, text: m.text, ts: new Date(m.createdAt).getTime() }));
          setMessages(arr);
        }
      } catch {}
    })();
    if (conversationId) {
      timer = setInterval(async () => {
        try {
          const r = await listProjectMessages(conversationId);
          if (r.ok && Array.isArray(r.data)) {
            const arr = (r.data as any[]).map(m => ({ id: m.id || m._id, from: m.from || m.fromUserId, text: m.text, ts: new Date(m.createdAt).getTime() }));
            setMessages(arr);
          }
        } catch {}
      }, 3500);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [conversationId]);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = () => {
    if (!conversationId) {
      alert(isAr ? 'لا توجد محادثة محددة بعد. افتح الشات من الإشعار مرة أخرى أو من تفاصيل المشروع.' : 'No conversation selected yet. Open chat from the notification again or from project details.');
      return;
    }
    if (!text.trim()) return;
    (async () => {
      try {
        const r = await sendProjectMessage(conversationId, text.trim());
        if (r.ok) {
          const l = await listProjectMessages(conversationId);
          if (l.ok && Array.isArray(l.data)) {
            const arr = (l.data as any[]).map(m => ({ id: m.id, from: m.from, text: m.text, ts: new Date(m.createdAt).getTime() }));
            setMessages(arr);
          }
          setText('');
        } else {
          alert(isAr ? 'تعذر إرسال الرسالة.' : 'Failed to send message.');
        }
      } catch {}
    })();
  };

  // Determine current user and role to render labels and bubble alignment correctly
  const role = userRole;
  const myId = userId;
  const isVendor = role === 'vendor' || role === 'merchant';
  
  console.log('[ProjectChat] User role info:', { 
    role, 
    isVendor, 
    userId: myId, 
    customerName, 
    merchantName 
  });

  return (
    <div className="min-h-screen bg-background" dir={isAr ? 'rtl' : 'ltr'}>
      <Header currentPage="project-chat" setCurrentPage={setCurrentPage as any} {...(context as any)} />
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>{isVendor ? (isAr ? 'مراسلة العميل' : 'Message Customer') : (isAr ? 'مراسلة التاجر' : 'Message Merchant')}</span>
              <div className="text-xs text-muted-foreground">
                {isVendor
                  ? (isAr ? `العميل: ${customerName || (isAr ? 'غير معرّف' : 'Unknown')}` : `Customer: ${customerName || 'Unknown'}`)
                  : (isAr ? `التاجر: ${merchantName || (isAr ? 'غير معرّف' : 'Unknown')}` : `Merchant: ${merchantName || 'Unknown'}`)
                }
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={boxRef} className="h-96 overflow-y-auto border rounded-md p-3 bg-muted/20">
              {(!conversationId) ? (
                <div className="text-sm text-muted-foreground text-center mt-8">
                  {isAr ? 'لا توجد محادثة محددة. حاول فتحها من تفاصيل المشروع.' : 'No conversation selected. Open it from project details.'}
                </div>
              ) : messages.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center mt-8">
                  {isAr ? 'ابدأ المحادثة بإرسال رسالة.' : 'Start the conversation by sending a message.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((m, i) => {
                    const isMine = m.from === myId;
                    const name = (() => {
                      if (m.from === merchantId) return merchantName || (isAr ? 'التاجر' : 'Merchant');
                      if (m.from === customerId) return customerName || (isAr ? 'العميل' : 'Customer');
                      if (isMine) return isAr ? 'أنا' : 'Me';
                      return isAr ? 'مستخدم' : 'User';
                    })();
                    return (
                      <div key={m.id ?? i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-[70%]">
                          <div className={`rounded-lg px-3 py-2 text-sm ${isMine ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
                            <div>{m.text}</div>
                            <div className={`text-[10px] opacity-70 mt-1 ${isMine ? 'text-right' : 'text-left'}`}>
                              {name} • {new Date(m.ts).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-3">
              <Input
                value={text}
                onChange={(e)=> setText(e.target.value)}
                placeholder={conversationId ? 
                  (isVendor ? 
                    (isAr ? 'اكتب رسالة للعميل...' : 'Type a message to customer...') : 
                    (isAr ? 'اكتب رسالة للتاجر...' : 'Type a message to merchant...')
                  ) : (isAr ? 'لا توجد محادثة محددة' : 'No conversation selected')
                }
                disabled={!conversationId}
                onKeyDown={(e)=> { if (e.key==='Enter') send(); }}
              />
              <Button onClick={send} disabled={!text.trim() || !conversationId}>{isAr ? 'إرسال' : 'Send'}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer setCurrentPage={setCurrentPage as any} />
    </div>
  );
}
