import { useEffect, useMemo, useState } from 'react';
import type { RouteContext } from '../components/Router';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useTranslation } from '../hooks/useTranslation';
import { getConversation, getMyConversations, listMessages as listServiceMessages } from '@/services/chat';
import { getCustomerProjectRecentMessages, getVendorProjectRecentMessages } from '@/services/projectChat';
import { getCustomerRecentMessages, getRecentVendorMessages, getMyRecentMessages, getMyRecentTechMessages, getMyVendorRecentTechMessages, listMyRentals, listRentalMessages, sendRentalMessage, listTechRentalMessages, sendTechRentalMessage } from '@/services/rentals';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { MessageCircle, Search } from 'lucide-react';

export default function ChatInbox(context: RouteContext = {} as RouteContext) {
  const { t, locale } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [projectItems, setProjectItems] = useState<Array<{ conversationId: string; projectId: string; message: string; at: string }>>([]);
  const [rentalItems, setRentalItems] = useState<Array<{ rentalId: string; message: string; at: string }>>([]);
  // Vendor split data
  const [vendorServiceItems, setVendorServiceItems] = useState<Array<{ conversationId: string; projectId: string; message: string; at: string }>>([]);
  const [vendorUserProjectItems, setVendorUserProjectItems] = useState<Array<{ conversationId: string; projectId: string; message: string; at: string }>>([]);
  const [vendorUserRentalItems, setVendorUserRentalItems] = useState<Array<{ rentalId: string; message: string; at: string }>>([]);
  const [vendorTechRentalItems, setVendorTechRentalItems] = useState<Array<{ rentalId: string; message: string; at: string }>>([]);
  const [vendorTab, setVendorTab] = useState<'users' | 'tech'>('users');
  const [q, setQ] = useState('');
  // Inline rental reply modal state
  const [rentalModalOpen, setRentalModalOpen] = useState(false);
  const [activeRentalId, setActiveRentalId] = useState<string>('');
  const [rentalThread, setRentalThread] = useState<Array<{ id: string; message: string; at: string; from: string }>>([]);
  const [rentalThreadLoading, setRentalThreadLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [rentalChannel, setRentalChannel] = useState<'user' | 'tech'>('user');
  // last seen tracking
  const roleLower = (context?.user?.role || '').toString().toLowerCase();
  const lsServiceKey = `chat_last_seen_services_${roleLower||'guest'}`;
  const lsRentalKey = `chat_last_seen_rentals_${roleLower||'guest'}`;
  const getLastSeen = (key: string) => {
    try { const v = localStorage.getItem(key); return v ? new Date(v).getTime() : 0; } catch { return 0; }
  };
  const setLastSeen = (key: string) => {
    try { localStorage.setItem(key, new Date().toISOString()); } catch {}
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('chat_seen_refresh', { detail: { key, at: Date.now() } } as any)); } catch {}
  };

  // Manual refresh mirrors load() logic without timers
  const handleRefresh = async () => {
    try {
      const role = (context?.user?.role || '').toString().toLowerCase();
      const projPromise = (async () => {
        if (role === 'technician' || role === 'worker' || role === 'vendor') {
          const conv = await getMyConversations();
          if (conv.ok && Array.isArray(conv.data)) {
            const arr = conv.data as any[];
            const top = arr
              .sort((a:any,b:any)=> new Date(b.updatedAt||b.createdAt||0).getTime() - new Date(a.updatedAt||a.createdAt||0).getTime())
              .slice(0, 20);
            const withLatest = await Promise.all(top.map(async (c:any) => {
              try {
                const msgs = await listServiceMessages(String(c.id));
                const mArr = (msgs.ok && Array.isArray(msgs.data)) ? (msgs.data as any[]) : [];
                const latest = mArr.length
                  ? mArr.reduce((a:any,b:any)=> new Date(a.createdAt||a.at||0).getTime() >= new Date(b.createdAt||b.at||0).getTime() ? a : b)
                  : null;
                return {
                  conversationId: String(c.id),
                  projectId: String(c.serviceRequestId||''),
                  message: latest ? String((latest as any).text || (latest as any).message || '') : '',
                  at: latest ? String((latest as any).createdAt || (latest as any).at || '') : String(c.updatedAt||c.createdAt||new Date().toISOString()),
                };
              } catch {
                return { conversationId: String(c.id), projectId: String(c.serviceRequestId||''), message: '', at: String(c.updatedAt||c.createdAt||new Date().toISOString()) };
              }
            }));
            return { ok: true, data: withLatest } as any;
          }
          return { ok: true, data: [] } as any;
        }
        return getCustomerProjectRecentMessages();
      })();
      // For vendor, combine vendor-owned rentals (by product) AND authored tech-channel rentals
      const rentPromise = role === 'vendor'
        ? Promise.all([getMyVendorRecentTechMessages(), getMyRecentTechMessages()]).then(([a,b]) => {
            const arrA = (a && (a as any).ok && Array.isArray((a as any).data)) ? ((a as any).data as any[]) : [];
            const arrB = (b && (b as any).ok && Array.isArray((b as any).data)) ? ((b as any).data as any[]) : [];
            const map = new Map<string, any>();
            for (const x of [...arrA, ...arrB]) {
              const rid = String((x as any).rentalId ?? (x as any).conversationId ?? (x as any).id ?? '');
              if (!rid) continue;
              const item = { rentalId: rid, message: String((x as any).message||''), at: String((x as any).at||'') };
              const prev = map.get(rid);
              if (!prev || new Date(item.at).getTime() > new Date(prev.at).getTime()) map.set(rid, item);
            }
            return { ok: true, data: Array.from(map.values()) } as any;
          })
        : (role === 'technician' || role === 'worker')
          ? getMyRecentTechMessages()
          : getCustomerRecentMessages();
      const vendorExtra = role === 'vendor'
        ? Promise.all([ getVendorProjectRecentMessages(), getRecentVendorMessages() ])
        : Promise.resolve([null, null] as any);
      const [proj, rent, extra] = await Promise.all([projPromise, rentPromise, vendorExtra]);

      // Projects/services dedupe by conversationId
      const rawProj = proj.ok && Array.isArray(proj.data) ? (proj.data as any[]) : [];
      const projMap = new Map<string, { conversationId: string; projectId: string; message: string; at: string }>();
      for (const p of rawProj) {
        const cid = String((p as any).conversationId || '');
        if (!cid) continue;
        const item = { conversationId: cid, projectId: String((p as any).projectId || ''), message: String((p as any).message || ''), at: String((p as any).at || '') };
        const prev = projMap.get(cid);
        if (!prev || new Date(item.at).getTime() > new Date(prev.at).getTime()) projMap.set(cid, item);
      }
      const projArr = Array.from(projMap.values()).sort((a,b)=> new Date(b.at).getTime() - new Date(a.at).getTime());

      // Rentals dedupe by rentalId
      let renArr = rent.ok && Array.isArray(rent.data) ? (rent.data as any[]).map((r:any)=> ({ rentalId: String(r.rentalId ?? r.conversationId ?? r.id ?? ''), message: String(r.message||''), at: String(r.at||'') })) : [];
      const rentMap = new Map<string, { rentalId: string; message: string; at: string }>();
      for (const r of renArr) {
        const rid = String((r as any).rentalId || '');
        if (!rid) continue;
        const prev = rentMap.get(rid);
        if (!prev || new Date((r as any).at).getTime() > new Date(prev.at).getTime()) rentMap.set(rid, { rentalId: rid, message: String((r as any).message||''), at: String((r as any).at||'') });
      }
      renArr = Array.from(rentMap.values()).sort((a,b)=> new Date(b.at).getTime() - new Date(a.at).getTime());

      if (role==='vendor') {
        // Show only service conversations that already have at least one message
        setVendorServiceItems(projArr.filter((x)=> String(x.message||'').trim().length>0));
        const vProjRaw = extra && extra[0] && (extra[0] as any).ok && Array.isArray((extra[0] as any).data) ? ((extra[0] as any).data as any[]) : [];
        const vProjMap = new Map<string, { conversationId: string; projectId: string; message: string; at: string }>();
        for (const p of vProjRaw) {
          const cid = String((p as any).conversationId||'');
          if (!cid) continue;
          const item = { conversationId: cid, projectId: String((p as any).projectId||''), message: String((p as any).message||''), at: String((p as any).at||'') };
          const prev = vProjMap.get(cid);
          if (!prev || new Date(item.at).getTime() > new Date(prev.at).getTime()) vProjMap.set(cid, item);
        }
        setVendorUserProjectItems(Array.from(vProjMap.values()).sort((a,b)=> new Date(b.at).getTime() - new Date(a.at).getTime()));

        // Build technician rentals from renArr first
        const tRenMap = new Map<string, { rentalId: string; message: string; at: string }>();
        for (const r of renArr) {
          const rid = String((r as any).rentalId ?? (r as any).conversationId ?? (r as any).id ?? '');
          if (!rid) continue;
          const prev = tRenMap.get(rid);
          if (!prev || new Date(r.at).getTime() > new Date(prev.at).getTime()) tRenMap.set(rid, r);
        }
        const techRentals = Array.from(tRenMap.values()).sort((a,b)=> new Date(b.at).getTime() - new Date(a.at).getTime());

        // User rentals from vendor perspective (RentalMessage only)
        const vRenRaw = extra && extra[1] && (extra[1] as any).ok && Array.isArray((extra[1] as any).data) ? ((extra[1] as any).data as any[]) : [];
        const vRenMap = new Map<string, { rentalId: string; message: string; at: string }>();
        for (const r of vRenRaw) {
          const rid = String((r as any).rentalId ?? (r as any).conversationId ?? (r as any).id ?? '');
          if (!rid) continue;
          const item = { rentalId: rid, message: String((r as any).message||''), at: String((r as any).at||'') };
          const prev = vRenMap.get(rid);
          if (!prev || new Date(item.at).getTime() > new Date(prev.at).getTime()) vRenMap.set(rid, item);
        }
        const userRentals = Array.from(vRenMap.values()).sort((a,b)=> new Date(b.at).getTime() - new Date(a.at).getTime());
        setVendorUserRentalItems(userRentals);
        setVendorTechRentalItems(techRentals);
      } else {
        setProjectItems(projArr);
        setRentalItems(renArr);
      }
    } catch {}
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const role = (context?.user?.role || '').toString().toLowerCase();
        // Vendor gets split view; technicians/workers use services view
        const projPromise = (async () => {
          if (role === 'technician' || role === 'worker' || role === 'vendor') {
            const conv = await getMyConversations();
            if (conv.ok && Array.isArray(conv.data)) {
              const arr = conv.data as any[];
              // Fetch latest message text for top N conversations in parallel
              const top = arr
                .sort((a:any,b:any)=> new Date(b.updatedAt||b.createdAt||0).getTime() - new Date(a.updatedAt||a.createdAt||0).getTime())
                .slice(0, 20);
              const withLatest = await Promise.all(top.map(async (c:any) => {
                try {
                  const msgs = await listServiceMessages(String(c.id));
                  const arr = (msgs.ok && Array.isArray(msgs.data)) ? (msgs.data as any[]) : [];
                  const latest = arr.length
                    ? arr.reduce((a:any,b:any)=> new Date(a.createdAt||a.at||0).getTime() >= new Date(b.createdAt||b.at||0).getTime() ? a : b)
                    : null;
                  return {
                    conversationId: String(c.id),
                    projectId: String(c.serviceRequestId||''),
                    message: latest ? String((latest as any).text || (latest as any).message || '') : '',
                    at: latest ? String((latest as any).createdAt || (latest as any).at || '') : String(c.updatedAt||c.createdAt||new Date().toISOString()),
                  };
                } catch {
                  return {
                    conversationId: String(c.id),
                    projectId: String(c.serviceRequestId||''),
                    message: '',
                    at: String(c.updatedAt||c.createdAt||new Date().toISOString()),
                  };
                }
              }));
              return { ok: true, data: withLatest } as any;
            }
            return { ok: true, data: [] } as any;
          }
          // customers -> project recent messages endpoints
          return getCustomerProjectRecentMessages();
        })();
        // For vendor and technicians/workers, use technician-channel recent messages (RentalMessageTechnician)
        // This aligns with handleRefresh() and ensures the Tech tab rentals come from the tech channel
        const rentPromise = role === 'vendor' ? getMyVendorRecentTechMessages() : (role === 'technician' || role === 'worker') ? getMyRecentTechMessages() : getCustomerRecentMessages();
        const vendorExtra = role === 'vendor'
          ? Promise.all([
              getVendorProjectRecentMessages(), // user projects
              getRecentVendorMessages(),        // user rentals (global)
            ])
          : Promise.resolve([null, null] as any);
        const [proj, rent, extra] = await Promise.all([projPromise, rentPromise, vendorExtra]);
        try {
          // Debug info for diagnostics
          console.debug('[ChatInbox] role=', role, 'proj.ok=', (proj as any)?.ok, 'rent.ok=', (rent as any)?.ok);
          const projLen = Array.isArray((proj as any)?.data) ? ((proj as any).data as any[]).length : -1;
          const rentLen = Array.isArray((rent as any)?.data) ? ((rent as any).data as any[]).length : -1;
          console.debug('[ChatInbox] lengths proj=', projLen, 'rent=', rentLen);
          if (!(proj as any)?.ok || !(rent as any)?.ok) {
            console.debug('[ChatInbox] proj.status=', (proj as any)?.status, 'rent.status=', (rent as any)?.status, 'errors:', (proj as any)?.error, (rent as any)?.error);
          }
          // Log specific rental data for vendor tech rentals
          if (role === 'vendor' && Array.isArray((rent as any)?.data)) {
            console.debug('[ChatInbox] vendor tech rental data:', (rent as any).data);
          }
        } catch {}
        if (!cancelled) {
          const rawProj = proj.ok && Array.isArray(proj.data) ? (proj.data as any[]) : [];
          // Deduplicate by conversationId keeping latest (works for projects or services)
          const projMap = new Map<string, { conversationId: string; projectId: string; message: string; at: string }>();
          for (const p of rawProj) {
            const cid = String((p as any).conversationId || '')
            if (!cid) continue;
            const item = { conversationId: cid, projectId: String((p as any).projectId || ''), message: String((p as any).message || ''), at: String((p as any).at || '') };
            const prev = projMap.get(cid);
            if (!prev || new Date(item.at).getTime() > new Date(prev.at).getTime()) projMap.set(cid, item);
          }
          const projArr = Array.from(projMap.values()).sort((a,b)=> new Date(b.at).getTime() - new Date(a.at).getTime());

          let renArr = rent.ok && Array.isArray(rent.data) ? (rent.data as any[]).map((r:any)=> ({ rentalId: String(r.rentalId ?? r.conversationId ?? r.id ?? ''), message: String(r.message||''), at: String(r.at||'') })) : [];
          // Deduplicate by rentalId keeping latest
          const rentMap = new Map<string, { rentalId: string; message: string; at: string }>();
          for (const r of renArr) {
            const rid = String((r as any).rentalId || '');
            if (!rid) continue;
            const prev = rentMap.get(rid);
            if (!prev || new Date((r as any).at).getTime() > new Date(prev.at).getTime()) rentMap.set(rid, { rentalId: rid, message: String((r as any).message||''), at: String((r as any).at||'') });
          }
          renArr = Array.from(rentMap.values()).sort((a,b)=> new Date(b.at).getTime() - new Date(a.at).getTime());

          // Fallback (customers only): if rentals still empty, scan my rentals (limit) and pick last message per rental
          // IMPORTANT: Do NOT run this for vendor/technician/worker, to avoid mixing tech-channel with user-channel
          if (renArr.length === 0 && !(role === 'vendor' || role === 'technician' || role === 'worker')) {
            try {
              const my = await listMyRentals();
              if (my.ok && Array.isArray(my.data)) {
                const limited = (my.data as any[]).slice(0, 5);
                const results: Array<{ rentalId: string; message: string; at: string }> = [];
                for (const r of limited) {
                  const rid = String((r as any).id || (r as any)._id || '');
                  if (!rid) continue;
                  try {
                    const msgs = await listRentalMessages(rid);
                    if (msgs.ok && Array.isArray(msgs.data) && (msgs.data as any[]).length) {
                      const latest = (msgs.data as any[])[0]; // already sorted desc
                      results.push({ rentalId: rid, message: String(latest.message||''), at: String(latest.at||'') });
                    }
                  } catch {}
                }
                if (results.length) renArr = results.sort((a,b)=> new Date(b.at).getTime() - new Date(a.at).getTime());
              }
            } catch {}
          }

          if (role==='vendor') {
            // Services list for vendor (technicians) - only those with at least one message
            setVendorServiceItems(projArr.filter((x)=> String(x.message||'').trim().length>0));
            // User-side projects (keep latest per conversationId)
            const vProjRaw = extra && extra[0] && (extra[0] as any).ok && Array.isArray((extra[0] as any).data)
              ? ((extra[0] as any).data as any[])
              : [];
            const vProjMap = new Map<string, { conversationId: string; projectId: string; message: string; at: string }>();
            for (const p of vProjRaw) {
              const cid = String((p as any).conversationId||'');
              if (!cid) continue;
              const item = { conversationId: cid, projectId: String((p as any).projectId||''), message: String((p as any).message||''), at: String((p as any).at||'') };
              const prev = vProjMap.get(cid);
              if (!prev || new Date(item.at).getTime() > new Date(prev.at).getTime()) vProjMap.set(cid, item);
            }
            const vProj = Array.from(vProjMap.values()).sort((a,b)=> new Date(b.at).getTime() - new Date(a.at).getTime());
            setVendorUserProjectItems(vProj);
            // Tech-side rentals authored by vendor (ensure latest per rentalId)
            const tRenMap = new Map<string, { rentalId: string; message: string; at: string }>();
            for (const r of renArr) {
              const rid = String((r as any).rentalId ?? (r as any).conversationId ?? (r as any).id ?? '');
              if (!rid) continue;
              const prev = tRenMap.get(rid);
              if (!prev || new Date(r.at).getTime() > new Date(prev.at).getTime()) tRenMap.set(rid, r);
            }
            const techRentals = Array.from(tRenMap.values()).sort((a,b)=> new Date(b.at).getTime() - new Date(a.at).getTime());

            // User-side rentals (user ↔ vendor) from RentalMessage only
            const vRenRaw = extra && extra[1] && (extra[1] as any).ok && Array.isArray((extra[1] as any).data)
              ? ((extra[1] as any).data as any[])
              : [];
            const vRenMap = new Map<string, { rentalId: string; message: string; at: string }>();
            for (const r of vRenRaw) {
              const rid = String((r as any).rentalId ?? (r as any).conversationId ?? (r as any).id ?? '');
              if (!rid) continue;
              const item = { rentalId: rid, message: String((r as any).message||''), at: String((r as any).at||'') };
              const prev = vRenMap.get(rid);
              if (!prev || new Date(item.at).getTime() > new Date(prev.at).getTime()) vRenMap.set(rid, item);
            }
            const vRen = Array.from(vRenMap.values()).sort((a,b)=> new Date(b.at).getTime() - new Date(a.at).getTime());

            setVendorUserRentalItems(vRen);
            setVendorTechRentalItems(techRentals);
          } else {
            // Default: ensure rentals are unique by rentalId keeping latest
            const renMap = new Map<string, { rentalId: string; message: string; at: string }>();
            for (const r of renArr) {
              const rid = String((r as any).rentalId||'');
              if (!rid) continue;
              const prev = renMap.get(rid);
              if (!prev || new Date(r.at).getTime() > new Date(prev.at).getTime()) renMap.set(rid, r);
            }
            setProjectItems(projArr);
            setRentalItems(Array.from(renMap.values()).sort((a,b)=> new Date(b.at).getTime() - new Date(a.at).getTime()));
          }
        }
      } catch (err) { 
        try { console.debug('[ChatInbox] load error', err); } catch {}
        if (!cancelled) { setProjectItems([]); setRentalItems([]); }
      }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    const timer = setInterval(load, 5000);
    // React to header chat events for immediate refresh
    const onIncoming = (e?: any) => { 
      if (cancelled) return; 
      load(); 
      try {
        const detail = e?.detail || {};
        const kind = String(detail.kind||'');
        const cid = String(detail.conversationId||'');
        const role = (context?.user?.role || '').toString().toLowerCase();
        if (kind==='rental' && cid && role==='customer') {
          openRentalThread(cid);
        }
      } catch {}
    };
    if (typeof window !== 'undefined') window.addEventListener('chat_incoming', onIncoming as any);
    // Auto-open rental chat if hinted from contract
    try {
      const rid = typeof window !== 'undefined' ? window.localStorage.getItem('open_rental_chat_id') : null;
      if (rid) {
        openRentalThread(String(rid));
        window.localStorage.removeItem('open_rental_chat_id');
      }
    } catch {}
    return () => { cancelled = true; clearInterval(timer); if (typeof window !== 'undefined') window.removeEventListener('chat_incoming', onIncoming as any); };
  }, [context?.user?.id, context?.user?.role]);

  const filteredProjects = useMemo(() => {
    if (!q) return projectItems;
    const s = q.toLowerCase();
    return projectItems.filter((p)=> [p.conversationId, p.projectId, p.message].some((v)=> String(v||'').toLowerCase().includes(s)));
  }, [projectItems, q]);
  const filteredRentals = useMemo(() => {
    if (!q) return rentalItems;
    const s = q.toLowerCase();
    return rentalItems.filter((r)=> [r.rentalId, r.message].some((v)=> String(v||'').toLowerCase().includes(s)));
  }, [rentalItems, q]);

  const openConversation = async (cid: string) => {
    try {
      const c = await getConversation(cid);
      if (c.ok && c.data) {
        try { localStorage.setItem('chat_conversation_id', cid); } catch {}
        const role = (context?.user?.role || '').toString().toLowerCase();
        if (role === 'vendor') {
          const techId = String((c.data as any).technicianId || '');
          const sid = String((c.data as any).serviceRequestId || '');
          try { if (techId) localStorage.setItem('chat_technician_id', techId); } catch {}
          try { if (sid) localStorage.setItem('chat_service_id', sid); } catch {}
          context.setCurrentPage ? context.setCurrentPage('vendor-chat') : undefined;
        } else if (role === 'worker' || role === 'technician') {
          const sid = String((c.data as any).serviceRequestId || '');
          try { if (sid) localStorage.setItem('chat_service_id', sid); } catch {}
          context.setCurrentPage ? context.setCurrentPage('technician-chat') : undefined;
        } else {
          const pid = String((c.data as any).projectId || '');
          try { if (pid) localStorage.setItem('project_chat_project_id', pid); } catch {}
          context.setCurrentPage ? context.setCurrentPage('project-chat') : undefined;
        }
      }
    } catch {}
  };

  const openRentalThread = async (rentalId: string, lastMessage?: string) => {
    try {
      setRentalChannel('user');
      setActiveRentalId(rentalId);
      setRentalModalOpen(true);
      setReplyText('');
      // Load thread
      setRentalThreadLoading(true);
      const res = await listRentalMessages(rentalId);
      const arr = (res.ok && Array.isArray(res.data)) ? (res.data as any[]).map((m:any)=> ({ id: String(m.id||m._id||''), message: String(m.message||''), at: String(m.at||m.createdAt||''), from: String(m.from||m.fromUserId||'') })) : [];
      // Server returns newest first; show oldest at top
      setRentalThread(arr.slice().reverse());
      setRentalThreadLoading(false);
    } catch {}
  };

  const openTechRentalThread = async (rentalId: string) => {
    try {
      setRentalChannel('tech');
      setActiveRentalId(rentalId);
      setRentalModalOpen(true);
      setReplyText('');
      setRentalThreadLoading(true);
      const res = await listTechRentalMessages(rentalId);
      const arr = (res.ok && Array.isArray(res.data)) ? (res.data as any[]).map((m:any)=> ({ id: String(m.id||m._id||''), message: String(m.message||''), at: String(m.at||m.createdAt||''), from: String(m.from||m.fromUserId||'') })) : [];
      setRentalThread(arr.slice().reverse());
      setRentalThreadLoading(false);
    } catch {}
  };

  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const showServices = roleLower==='technician' || roleLower==='worker' || roleLower==='vendor';
  const projectHeader = showServices ? (locale==='ar' ? 'الخدمات' : 'Services') : (locale==='ar' ? 'المشاريع' : 'Projects');
  const projectEmpty = showServices ? (locale==='ar' ? 'لا توجد محادثات خدمات.' : 'No service chats.') : (locale==='ar' ? 'لا توجد محادثات مشاريع.' : 'No project chats.');
  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <Header {...context} />
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <MessageCircle className="w-5 h-5" />
          <h1 className="text-xl font-semibold">{locale==='ar' ? 'المحادثات' : 'Conversations'}</h1>
        </div>

        <div className="relative mb-4 flex items-center gap-3">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input value={q} onChange={(e)=> setQ(e.target.value)} placeholder={locale==='ar' ? 'ابحث برقم المحادثة أو الخدمة أو الفني' : 'Search by conversation, service or technician'} className="pr-10" />
          <Button variant="outline" size="sm" onClick={async()=>{ setLoading(true); await handleRefresh(); setLoading(false); }}>
            {locale==='ar' ? 'تحديث' : 'Refresh'}
          </Button>
        </div>

        {loading && (
          <div className="grid gap-3">
            {[...Array(4)].map((_,i)=> (<div key={i} className="h-16 rounded bg-muted animate-pulse" />))}
          </div>
        )}

        {/* Vendor split view: Users (projects + rentals) and Technicians (services + rentals) */}
        {!loading && roleLower==='vendor' && (
          <div className="space-y-6">
            {/* Tabs header */}
            <div className="flex items-center gap-2 border-b">
              <button
                className={`px-3 py-2 text-sm border-b-2 ${vendorTab==='users' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={()=> setVendorTab('users')}
              >
                {locale==='ar' ? 'المستخدمين' : 'Users'}
              </button>
              <button
                className={`px-3 py-2 text-sm border-b-2 ${vendorTab==='tech' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={()=> setVendorTab('tech')}
              >
                {locale==='ar' ? 'الفنيين' : 'Technicians'}
              </button>
            </div>

            {vendorTab==='users' && (
            <section>
              <h2 className="text-lg font-semibold mb-4">{locale==='ar' ? 'المستخدمين' : 'Users'}</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">{locale==='ar' ? 'المشاريع' : 'Projects'}</h3>
                  {vendorUserProjectItems.length === 0 ? (
                    <div className="text-muted-foreground text-sm">{locale==='ar' ? 'لا توجد محادثات مشاريع.' : 'No project chats.'}</div>
                  ) : (
                    <div className="space-y-3">
                      {vendorUserProjectItems.map((p)=> (
                        <Card key={`u-${p.conversationId}-${p.projectId}`} className="hover:shadow-sm transition">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className={`rounded-md p-2 ${new Date(p.at).getTime() > getLastSeen(lsServiceKey) ? 'bg-yellow-50' : ''}`}>
                              <div className="font-medium text-sm">{locale==='ar' ? 'محادثة مشروع' : 'Project chat'}</div>
                              <div className="text-xs text-muted-foreground line-clamp-2">{p.message}</div>
                            </div>
                            <Button size="sm" variant="outline" onClick={()=> { setLastSeen(lsServiceKey); openConversation(String(p.conversationId)); }}>{locale==='ar' ? 'فتح' : 'Open'}</Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-medium mb-2">{locale==='ar' ? 'التأجير' : 'Rentals'}</h3>
                  {vendorUserRentalItems.length === 0 ? (
                    <div className="text-muted-foreground text-sm">{locale==='ar' ? 'لا توجد محادثات تأجير.' : 'No rental chats.'}</div>
                  ) : (
                    <div className="space-y-3">
                      {vendorUserRentalItems.map((r)=> (
                        <Card key={`ur-${r.rentalId}`} className="hover:shadow-sm transition">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className={`rounded-md p-2 ${new Date(r.at).getTime() > getLastSeen(lsRentalKey) ? 'bg-yellow-50' : ''}`}>
                              <div className="font-medium text-sm">{locale==='ar' ? 'محادثة تأجير' : 'Rental chat'}</div>
                              <div className="text-xs text-muted-foreground line-clamp-2">{r.message}</div>
                            </div>
                            <Button size="sm" variant="outline" onClick={()=> { setLastSeen(lsRentalKey); openRentalThread(String(r.rentalId)); }}>{locale==='ar' ? 'فتح' : 'Open'}</Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            )}

            {vendorTab==='tech' && (
            <section>
              <h2 className="text-lg font-semibold mb-4">{locale==='ar' ? 'الفنيين' : 'Technicians'}</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">{locale==='ar' ? 'الخدمات' : 'Services'}</h3>
                  {vendorServiceItems.length === 0 ? (
                    <div className="text-muted-foreground text-sm">{locale==='ar' ? 'لا توجد محادثات خدمات.' : 'No service chats.'}</div>
                  ) : (
                    <div className="space-y-3">
                      {vendorServiceItems.map((p)=> (
                        <Card key={`s-${p.conversationId}-${p.projectId}`} className="hover:shadow-sm transition">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className={`rounded-md p-2 ${new Date(p.at).getTime() > getLastSeen(lsServiceKey) ? 'bg-yellow-50' : ''}`}>
                              <div className="font-medium text-sm">{locale==='ar' ? 'محادثة خدمة' : 'Service chat'}</div>
                              <div className="text-xs text-muted-foreground line-clamp-2">{p.message}</div>
                            </div>
                            <Button size="sm" variant="outline" onClick={()=> { setLastSeen(lsServiceKey); openConversation(String(p.conversationId)); }}>{locale==='ar' ? 'فتح' : 'Open'}</Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-medium mb-2">{locale==='ar' ? 'التأجير' : 'Rentals'}</h3>
                  {vendorTechRentalItems.length === 0 ? (
                    <div className="text-muted-foreground text-sm">{locale==='ar' ? 'لا توجد محادثات تأجير.' : 'No rental chats.'}</div>
                  ) : (
                    <div className="space-y-3">
                      {vendorTechRentalItems.map((r)=> (
                        <Card key={`tr-${r.rentalId}`} className="hover:shadow-sm transition">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className={`rounded-md p-2 ${new Date(r.at).getTime() > getLastSeen(lsRentalKey) ? 'bg-yellow-50' : ''}`}>
                              <div className="font-medium text-sm">{locale==='ar' ? 'محادثة تأجير' : 'Rental chat'}</div>
                              <div className="text-xs text-muted-foreground line-clamp-2">{r.message}</div>
                            </div>
                            <Button size="sm" variant="outline" onClick={()=> { setLastSeen(lsRentalKey); openTechRentalThread(String(r.rentalId)); }}>{locale==='ar' ? 'فتح' : 'Open'}</Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
            )}
          </div>
        )}

        {!loading && roleLower!=='vendor' && (
          <div className="space-y-8">
            <section>
              <h2 className="font-semibold mb-3">{projectHeader}</h2>
              {filteredProjects.length === 0 ? (
                <div className="text-muted-foreground text-sm">{projectEmpty}</div>
              ) : (
                <div className="space-y-3">
                  {filteredProjects.map((p) => (
                    <Card key={`${p.conversationId}-${p.projectId}`} className="hover:shadow-sm transition">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className={`rounded-md p-2 ${new Date(p.at).getTime() > getLastSeen(lsServiceKey) ? 'bg-yellow-50' : ''}`}>
                          <div className="font-medium text-sm">{roleLower==='technician'||roleLower==='worker' ? (locale==='ar' ? 'محادثة خدمة' : 'Service chat') : (locale==='ar' ? 'محادثة مشروع' : 'Project chat')}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2">{p.message}</div>
                        </div>
                        <Button size="sm" variant="outline" onClick={()=> { setLastSeen(lsServiceKey); openConversation(String(p.conversationId)); }}>{locale==='ar' ? 'فتح' : 'Open'}</Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="font-semibold mb-3">{locale==='ar' ? 'التأجير' : 'Rentals'}</h2>
              {filteredRentals.length === 0 ? (
                <div className="text-muted-foreground text-sm">{locale==='ar' ? 'لا توجد محادثات تأجير.' : 'No rental chats.'}</div>
              ) : (
                <div className="space-y-3">
                  {filteredRentals.map((r) => (
                    <Card key={r.rentalId} className="hover:shadow-sm transition">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className={`rounded-md p-2 ${new Date(r.at).getTime() > getLastSeen(lsRentalKey) ? 'bg-yellow-50' : ''}`}>
                          <div className="font-medium text-sm">{locale==='ar' ? 'محادثة تأجير' : 'Rental chat'}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2">{r.message}</div>
                        </div>
                        <Button size="sm" variant="outline" onClick={()=> { setLastSeen(lsRentalKey); (roleLower==='technician'||roleLower==='worker') ? openTechRentalThread(String(r.rentalId)) : openRentalThread(String(r.rentalId), r.message); }}>{locale==='ar' ? 'فتح' : 'Open'}</Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
      {/* Rental inline reply modal */}
      {rentalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setRentalModalOpen(false)}>
          <div className="w-full max-w-2xl bg-white rounded-md shadow-lg" onClick={(e)=> e.stopPropagation()}>
            <div className="p-4 border-b font-semibold flex items-center justify-between">
              <span>{locale==='ar' ? 'محادثة التأجير' : 'Rental Chat'}</span>
              <button className="text-sm text-muted-foreground" onClick={()=> setRentalModalOpen(false)}>{locale==='ar' ? 'إغلاق' : 'Close'}</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="border rounded-md p-3 max-h-[50vh] overflow-auto flex flex-col gap-2 bg-muted/20">
                {rentalThreadLoading && rentalThread.length===0 && (
                  <div className="text-sm text-muted-foreground">{locale==='ar' ? 'جاري التحميل...' : 'Loading...'}</div>
                )}
                {rentalThread.length===0 && !rentalThreadLoading && (
                  <div className="text-sm text-muted-foreground">{locale==='ar' ? 'لا توجد رسائل بعد' : 'No messages yet'}</div>
                )}
                {rentalThread.map((m)=> {
                  const my = String(m.from||'')==='me' || (context?.user?.id && String(m.from||'')===String(context.user.id));
                  return (
                  <div key={m.id} className={`text-sm p-2 rounded ${my ? 'bg-blue-500 text-white self-start' : 'bg-white border self-end'}`}>
                    <div className="whitespace-pre-wrap">{m.message}</div>
                    <div className={`mt-1 opacity-70 ${my ? '' : 'text-muted-foreground'}`}>{new Date(m.at).toLocaleString(locale==='ar'?'ar-EG':'en-GB')}</div>
                  </div>
                  );
                })}
              </div>
              <div className="space-y-2">
                <Label>{locale==='ar' ? 'اكتب رسالتك' : 'Write your message'}</Label>
                <textarea className="w-full border rounded-md p-2 text-sm" rows={3} value={replyText} onChange={(e)=> setReplyText(e.target.value)} />
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={async()=>{
                      const msg = replyText.trim();
                      if (!msg || !activeRentalId) return;
                      const r = rentalChannel==='tech'
                        ? await sendTechRentalMessage(activeRentalId, { message: msg })
                        : await sendRentalMessage(activeRentalId, { message: msg });
                      if ((r as any)?.ok) {
                        setReplyText('');
                        setRentalThread((prev)=> [...prev, { id: String(Date.now()), message: msg, at: new Date().toISOString(), from: 'me' }]);
                      }
                    }}
                  >
                    {locale==='ar' ? 'إرسال' : 'Send'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <Footer {...context} />
    </div>
  );
}
