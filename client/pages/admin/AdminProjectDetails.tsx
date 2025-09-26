import React from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import type { RouteContext } from '../../components/routerTypes';
import { useTranslation } from '../../hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { getAdminProjectById, getAdminProjectBids, getUserById, getAdminProjectViews } from '@/services/admin';
import { getProjectConversationByKeys, listProjectMessages, ProjectMessageDto, getConversationsByProject } from '@/services/projectChat';
import { MessageCircle } from 'lucide-react';
import { useFirstLoadOverlay } from '../../hooks/useFirstLoadOverlay';
import UserAvatar from '../../components/UserAvatar';
import { formatCurrency } from '@/lib/format';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { ScrollArea } from '../../components/ui/scroll-area';

function normalizeStatus(raw: any): string {
  if (raw === undefined || raw === null) return '';
  const s = String(raw);
  switch (s) {
    case '0': return 'Draft';
    case '1': return 'Published';
    case '2': return 'InBidding';
    case '3': return 'BidSelected';
    case '4': return 'InProgress';
    case '5': return 'Completed';
    case '6': return 'Cancelled';
    default: return s;
  }
}

function statusColorClasses(status: string): string {
  const lc = status.toLowerCase();
  if (lc === 'published') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (lc === 'inbidding') return 'bg-blue-50 text-blue-700 border border-blue-200';
  if (lc === 'bidselected') return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
  if (lc === 'inprogress') return 'bg-amber-50 text-amber-700 border border-amber-200';
  if (lc === 'completed') return 'bg-green-50 text-green-700 border border-green-200';
  if (lc === 'cancelled' || lc === 'canceled') return 'bg-gray-50 text-gray-600 border border-gray-200';
  return 'bg-muted text-foreground/80';
}

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'outline' {
  const lc = status.toLowerCase();
  if (['draft'].includes(lc)) return 'secondary';
  if (['published', 'inbidding', 'inprogress', 'bidselected'].includes(lc)) return 'default';
  if (['completed'].includes(lc)) return 'default';
  if (['cancelled', 'canceled'].includes(lc)) return 'outline';
  return 'outline';
}

export default function AdminProjectDetails({ setCurrentPage, ...ctx }: Partial<RouteContext>) {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';
  const hideFirstOverlay = useFirstLoadOverlay(ctx, isAr ? 'جاري تحميل تفاصيل المشروع' : 'Loading project details', isAr ? 'يرجى الانتظار' : 'Please wait');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [project, setProject] = React.useState<any | null>(null);
  const [bids, setBids] = React.useState<any[]>([]);
  const [now, setNow] = React.useState<number>(Date.now());
  const [projectViews, setProjectViews] = React.useState<number>(0);
  // Chat states
  const [chatOpen, setChatOpen] = React.useState(false);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ProjectMessageDto[]>([]);
  const [loadingChat, setLoadingChat] = React.useState(false);
  // Avatar caches to avoid refetching
  const avatarCacheRef = React.useRef<Map<string, string>>(new Map());
  const avatarPromiseCacheRef = React.useRef<Map<string, Promise<string | undefined>>>(new Map());
  // User details cache (name, email, profile picture, etc.)
  const userDetailsCacheRef = React.useRef<Map<string, any>>(new Map());
  const [userDetailsTick, setUserDetailsTick] = React.useState(0);
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
  // Limit concurrent avatar fetches
  const maxAvatarConcurrency = 3;
  const avatarInFlightRef = React.useRef(0);
  const avatarWaitersRef = React.useRef<Array<() => void>>([]);
  const acquireAvatarSlot = async (): Promise<() => void> => {
    if (avatarInFlightRef.current < maxAvatarConcurrency) {
      avatarInFlightRef.current++;
      return () => {
        avatarInFlightRef.current--;
        const next = avatarWaitersRef.current.shift();
        if (next) next();
      };
    }
    return await new Promise<() => void>((resolve) => {
      avatarWaitersRef.current.push(() => {
        avatarInFlightRef.current++;
        resolve(() => {
          avatarInFlightRef.current--;
          const nxt = avatarWaitersRef.current.shift();
          if (nxt) nxt();
        });
      });
    });
  };

  // Inline avatar components
  const AvatarById: React.FC<{ id: string; name: string; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string; initialSrc?: string }> = ({ id, name, size = 'lg', className, initialSrc }) => {
    const [src, setSrc] = React.useState<string | undefined>(() => initialSrc || avatarCacheRef.current.get(id));
    React.useEffect(() => {
      let mounted = true;
      const run = async () => {
        if (src) { return; }
        const cached = avatarCacheRef.current.get(id);
        if (cached) { setSrc(cached); return; }
        try {
          const runFetch = async (): Promise<string | undefined> => {
            const attempts = [0, 400, 900];
            for (let i = 0; i < attempts.length; i++) {
              if (attempts[i] > 0) await delay(attempts[i]);
              const release = await acquireAvatarSlot();
              try {
                const r = await getUserById(String(id));
                if (r.ok && r.data && (r.data as any).success) {
                  const u = (r.data as any).item as any;
                  const pic = u?.profilePicture ? String(u.profilePicture) : undefined;
                  return pic;
                }
              } finally { release(); }
            }
            return undefined;
          };
          let p = avatarPromiseCacheRef.current.get(id);
          if (!p) { p = runFetch(); avatarPromiseCacheRef.current.set(id, p); }
          const pic = await p;
          if (mounted && pic) {
            avatarCacheRef.current.set(id, pic);
            setSrc(pic);
          }
        } catch { }
      };
      void run();
      return () => { mounted = false; };
    }, [id, src]);
    return (<UserAvatar src={src} name={name} size={size} className={className} />);
  };

  // Fixed Avatar Component - No IntersectionObserver to prevent infinite loops
  const AvatarLazy: React.FC<{ id: string; name: string; initialSrc?: string; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }> = ({ id, name, initialSrc, size = 'lg', className }) => {
    const [profilePic, setProfilePic] = React.useState<string | null>(initialSrc || null);
    const [loaded, setLoaded] = React.useState(false);

    React.useEffect(() => {
      if (loaded || !id || id === 'undefined' || id === 'null') return;

      const loadAvatar = async () => {
        try {
          // Check cache first
          const cached = avatarCacheRef.current.get(id);
          if (cached) {
            setProfilePic(cached);
            return;
          }

          // Fetch user data
          const r = await getUserById(String(id));
          if (r.ok && r.data && (r.data as any).success) {
            const user = (r.data as any).item;
            const pic = user?.profilePicture;
            if (pic) {
              avatarCacheRef.current.set(id, pic);
              setProfilePic(pic);
            }
          }
        } catch (error) {
          console.debug('Failed to load avatar for user:', id, error);
        } finally {
          setLoaded(true);
        }
      };

      loadAvatar();
    }, [id, loaded]);

    return (
      <div className={className}>
        <UserAvatar
          src={profilePic || initialSrc}
          name={name || 'User'}
          size={size}
        />
      </div>
    );
  };

  const projectId = React.useMemo(() => {
    try {
      const raw = window.localStorage.getItem('admin_selected_project_id')
        || window.localStorage.getItem('selected_project_id');
      return raw || '';
    } catch { return ''; }
  }, []);

  // Helper to fetch and cache full user details by id
  const ensureUserDetails = React.useCallback(async (id?: string | null) => {
    const key = String(id || '').trim();
    if (!key) return undefined;
    if (userDetailsCacheRef.current.has(key)) return userDetailsCacheRef.current.get(key);
    try {
      const r = await getUserById(key);
      if (r.ok && (r.data as any)?.success) {
        const u = (r.data as any).item;
        userDetailsCacheRef.current.set(key, u);
        setUserDetailsTick(t => t + 1); // trigger re-render
        // also cache avatar if available
        if (u?.profilePicture) {
          avatarCacheRef.current.set(key, String(u.profilePicture));
        }
        return u;
      }
    } catch { }
    return undefined;
  }, []);

  const load = React.useCallback(async () => {
    if (!projectId || projectId === 'undefined' || projectId === 'null') {
      setError(isAr ? 'لم يتم تحديد المشروع. يرجى العودة لقائمة المشاريع واختيار مشروع.' : 'No project selected. Please go back to projects list and select a project.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const r = await getAdminProjectById(projectId);
      if (r.ok) {
        setProject(r.data);
        // Load bids for this project (robust parsing)
        try {
          const br = await getAdminProjectBids(projectId);
          if ((br as any).ok) {
            const data: any = (br as any).data;
            const items = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
            setBids(items || []);
          } else {
            setBids([]);
          }
        } catch { setBids([]); }

        // Load accurate views
        try {
          const vr = await getAdminProjectViews(projectId);
          if (vr.ok && vr.data) {
            setProjectViews(vr.data.views || 0);
          }
        } catch (error) {
          console.debug('Views API not available, using project data:', error);
          setProjectViews(project?.viewCount || project?.views || 0);
        }
      } else {
        setError(isAr ? 'تعذر تحميل تفاصيل المشروع' : 'Failed to load project details');
      }
    } catch (error) {
      console.error('Error loading project:', error);
      setError(isAr ? 'تعذر الاتصال بالخادم' : 'Failed to contact server');
    } finally {
      setLoading(false);
    }
  }, [projectId, isAr]);

  React.useEffect(() => { void load(); }, [load]);
  React.useEffect(() => { if (!loading) hideFirstOverlay(); }, [loading, hideFirstOverlay]);

  // Derive status and accepted bid early so they are available for effects below
  const st = normalizeStatus(project?.status ?? project?.Status);
  const acceptedBid = React.useMemo(() => bids.find(b => String(b.status).toLowerCase() === 'accepted'), [bids]);

  // Auto-enrich customer details when project is loaded
  React.useEffect(() => {
    const cid = String(project?.customerId || project?.customer?.id || '').trim();
    if (cid) { void ensureUserDetails(cid); }
  }, [project?.customerId, project?.customer?.id, ensureUserDetails]);

  // Auto-enrich merchant details for all bids
  React.useEffect(() => {
    if (!bids || bids.length === 0) return;
    const ids = new Set<string>();
    for (const b of bids) {
      const mid = String(b?.merchantId || b?.merchant?.id || '').trim();
      if (mid) ids.add(mid);
    }
    ids.forEach((id) => { void ensureUserDetails(id); });
  }, [bids, ensureUserDetails]);

  // Auto-enrich accepted merchant details when available
  React.useEffect(() => {
    const mid = String(acceptedBid?.merchantId || acceptedBid?.merchant?.id || '').trim();
    if (mid) { void ensureUserDetails(mid); }
  }, [acceptedBid?.merchantId, acceptedBid?.merchant?.id, ensureUserDetails]);

  // Tick every second for the running counter
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const back = () => {
    setCurrentPage && setCurrentPage('admin-all-projects');
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { }
  };

  // Chat functions
  const loadChatConversation = async () => {
    if (!acceptedBid || !project) return;

    setLoadingChat(true);
    try {
      let loaded = false;
      // Try to get existing conversation
      try {
        const result = await getProjectConversationByKeys(projectId, acceptedBid.merchantId || acceptedBid.merchant?.id);
        if (result.ok && result.data?.id) {
          setConversationId(result.data.id);
          await loadMessages(result.data.id);
          loaded = true;
        }
      } catch (e) {
        // ignore, will fallback below
      }

      // Fallback if not loaded yet: list all conversations for this project and pick best match
      if (!loaded) {
        try {
          const lr = await getConversationsByProject(projectId);
          if (lr.ok && Array.isArray(lr.data) && lr.data.length > 0) {
            const list = lr.data;
            const accMid = String(acceptedBid.merchantId || acceptedBid.merchant?.id || '').trim();
            const exact = accMid ? list.find(c => String(c.merchantId) === accMid || String(c.customerId) === accMid) : undefined;
            const chosen = exact || list[0];
            if (chosen?.id) {
              setConversationId(String(chosen.id));
              await loadMessages(String(chosen.id));
              loaded = true;
            }
          }
        } catch (e) {
          // ignore
        }
      }

      if (!loaded) {
        setConversationId(null);
        setMessages([]);
      }
    } catch (error) {
      // Handle explicit 404 by trying fallback
      setConversationId(null);
      setMessages([]);
    } finally {
      setLoadingChat(false);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const result = await listProjectMessages(convId);
      if (result.ok && Array.isArray(result.data)) {
        setMessages(result.data);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  // Note: Sending messages is disabled for admin view (read-only)

  // Derive acceptance start time
  const acceptedAt: Date | null = React.useMemo(() => {
    const raw = (project as any)?.acceptedAt || (project as any)?.startedAt || (acceptedBid as any)?.updatedAt || (acceptedBid as any)?.acceptedAt || (acceptedBid as any)?.createdAt;
    try { return raw ? new Date(raw) : null; } catch { return null; }
  }, [project, acceptedBid]);
  const runningSince = React.useMemo(() => {
    if (!acceptedAt) return null;
    const ms = now - acceptedAt.getTime();
    if (ms < 0) return null;
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return { d, h, m, s: ss };
  }, [acceptedAt, now]);

  // Note: Chat will be loaded on demand via the dialog button (no auto-load)

  return (
    <div className="min-h-screen bg-background" dir={isAr ? 'rtl' : 'ltr'}>
      <Header {...(ctx as any)} />
      <div className="container mx-auto px-4 py-6">

        {loading ? (
          <Card><CardContent className="p-6 text-muted-foreground">{isAr ? 'جارٍ التحميل...' : 'Loading...'}</CardContent></Card>
        ) : error ? (
          <Card><CardContent className="p-6 text-red-600">{error}</CardContent></Card>
        ) : !project ? (
          <Card><CardContent className="p-6 text-muted-foreground">{isAr ? 'لا توجد بيانات' : 'No data'}</CardContent></Card>
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="truncate">{project.title || (isAr ? 'مشروع' : 'Project')}</span>
                  <Badge variant={statusBadgeVariant(st)} className={statusColorClasses(st)}>
                    {isAr ?
                      (st === 'Draft' ? 'مسودة' : st === 'Published' ? 'منشور' : st === 'InBidding' ? 'مفتوح للمناقصات' : st === 'BidSelected' ? 'تم اختيار عرض' : st === 'InProgress' ? 'قيد التنفيذ' : st === 'Completed' ? 'مكتمل' : st === 'Cancelled' ? 'ملغي' : st)
                      : st}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">{project.description || ''}</div>

                {/* Owner/Customer Information */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-green-800 mb-3">
                    {isAr ? 'صاحب المشروع' : 'Project Owner'}
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Prefer AvatarById to ensure image fetch when src is missing */}
                    <AvatarById
                      id={String(project.customerId || project.customer?.id || '')}
                      name={project.customerName || project.customer?.name || project.customer?.fullName || project.ownerName || (isAr ? 'العميل' : 'Customer')}
                      size="md"
                      initialSrc={project.customer?.profilePicture}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-green-700">
                        {project.customerName || project.customer?.name || project.customer?.fullName || project.ownerName || (userDetailsCacheRef.current.get(String(project.customerId || project.customer?.id || ''))?.name) || (isAr ? 'غير محدد' : 'Not specified')}
                      </div>
                      {(
                        (project.customerEmail || project.customer?.email) ||
                        userDetailsCacheRef.current.get(String(project.customerId || project.customer?.id || ''))?.email
                      ) && (
                          <div className="text-xs text-green-600 truncate">
                            {project.customerEmail || project.customer?.email || userDetailsCacheRef.current.get(String(project.customerId || project.customer?.id || ''))?.email}
                          </div>
                        )}
                      {(project.customer?.phone || project.customerPhone) && (
                        <div className="text-xs text-green-600 truncate">
                          {project.customer?.phone || project.customerPhone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Accepted merchant info when in progress or bid selected */}
                {(['InProgress', 'BidSelected'].includes(st) && acceptedBid) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-sm font-medium text-blue-800 mb-3">
                      {isAr ? 'التاجر الموافق عليه' : 'Accepted Merchant'}
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <AvatarById
                        id={String(acceptedBid.merchantId || acceptedBid.merchant?.id || '')}
                        name={acceptedBid.merchantName || acceptedBid.merchant?.name || acceptedBid.merchant?.fullName || (isAr ? 'التاجر' : 'Merchant')}
                        size="md"
                        initialSrc={acceptedBid.merchant?.profilePicture}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-blue-700">
                          {acceptedBid.merchantName || acceptedBid.merchant?.name || acceptedBid.merchant?.fullName || userDetailsCacheRef.current.get(String(acceptedBid.merchantId || acceptedBid.merchant?.id || ''))?.name || (isAr ? 'غير محدد' : 'Unknown')}
                        </div>
                        {(
                          (acceptedBid.merchantEmail || acceptedBid.merchant?.email) ||
                          userDetailsCacheRef.current.get(String(acceptedBid.merchantId || acceptedBid.merchant?.id || ''))?.email
                        ) && (
                            <div className="text-xs text-blue-600 truncate">
                              {acceptedBid.merchantEmail || acceptedBid.merchant?.email || userDetailsCacheRef.current.get(String(acceptedBid.merchantId || acceptedBid.merchant?.id || ''))?.email}
                            </div>
                          )}
                        {(acceptedBid.merchantPhone || acceptedBid.merchant?.phone) && (
                          <div className="text-xs text-blue-600 truncate">
                            {acceptedBid.merchantPhone || acceptedBid.merchant?.phone}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm">
                      <span className="font-medium text-green-700">
                        {isAr ? 'المبلغ المتفق عليه: ' : 'Agreed Amount: '}
                        {formatCurrency(isAr ? 'ar' : 'en', project?.currency || 'SAR', acceptedBid.amount || acceptedBid.price || 0)}
                      </span>
                      <span className="text-muted-foreground">
                        {isAr ? 'المدة: ' : 'Duration: '}{acceptedBid.estimatedDays || acceptedBid.days || '-'} {isAr ? 'يوم' : 'days'}
                      </span>
                      {runningSince && (
                        <span className="text-blue-700">
                          {isAr ? 'العدّاد: ' : 'Timer: '}
                          {runningSince.d} {isAr ? 'يوم' : 'd'} {runningSince.h}:{String(runningSince.m).padStart(2, '0')}:{String(runningSince.s).padStart(2, '0')}
                        </span>
                      )}
                      {/* Chat trigger */}
                      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
                        {/* <DialogTrigger asChild>
                          <Button size="sm" className="ml-auto" variant="outline" onClick={() => loadChatConversation()}>
                            <MessageCircle className="w-4 h-4 mr-1" />
                            {isAr ? 'المحادثة' : 'Chat'}
                          </Button>
                        </DialogTrigger> */}
                        <DialogContent className="max-w-2xl max-h-[600px] flex flex-col">
                          <DialogHeader>
                            <DialogTitle>{isAr ? 'المحادثة بين العميل والتاجر المقبول' : 'Chat between Customer and Accepted Merchant'}</DialogTitle>
                          </DialogHeader>
                          <div className="text-sm text-muted-foreground mb-2">
                            {isAr ? 'عرض رسائل المحادثة فقط (للقراءة).' : 'Conversation messages (read-only).'}
                          </div>
                          <div className="flex items-center justify-end mb-2">
                            <Button size="sm" variant="outline" onClick={() => loadChatConversation()} disabled={loadingChat}>
                              {loadingChat ? (isAr ? 'جاري التحميل...' : 'Loading...') : (isAr ? 'تحميل المحادثة' : 'Load Conversation')}
                            </Button>
                          </div>
                          <ScrollArea className="h-80 pr-2">
                            {messages.length === 0 ? (
                              <div className="text-center text-muted-foreground py-10">
                                {loadingChat ? (isAr ? 'جاري تحميل الرسائل...' : 'Loading messages...') : (isAr ? 'لا توجد رسائل للعرض.' : 'No messages to display.')}
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {messages.map((msg, idx) => (
                                  <div key={idx} className="bg-gray-50 border rounded-md px-3 py-2">
                                    <div className="text-sm text-gray-800 whitespace-pre-wrap">{msg.text}</div>
                                    <div className="text-xs text-gray-500 mt-1">{new Date(msg.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                )}

                {/* Project Stats */}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>{isAr ? 'العروض المقدمة: ' : 'Bids: '}<span className="font-medium">{project.bidCount ?? bids.length ?? 0}</span></span>
                  {project.createdAt && (
                    <span>{isAr ? 'تاريخ الإنشاء: ' : 'Created: '}<span className="font-medium">{new Date(project.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span></span>
                  )}
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="text-sm"><span className="text-muted-foreground">{isAr ? 'النوع' : 'Type'}:</span> {project.typeAr || project.productTypeAr || project.ptypeAr || project.type || project.productType || project.ptype || '-'}</div>
                  <div className="text-sm"><span className="text-muted-foreground">{isAr ? 'اسم المنتج' : 'Product Name'}:</span> {project.psubtypeAr || project.subtypeAr || project?.customProductDetails?.productName || project.psubtype || project.subtype || '-'}</div>
                  <div className="text-sm"><span className="text-muted-foreground">{isAr ? 'الخامة' : 'Material'}:</span> {project.materialAr || project.productMaterialAr || project.material || '-'}</div>
                  <div className="text-sm"><span className="text-muted-foreground">{isAr ? 'العرض' : 'Width'}:</span> {project.width ?? '-'}</div>
                  <div className="text-sm"><span className="text-muted-foreground">{isAr ? 'الارتفاع' : 'Height'}:</span> {project.height ?? '-'}</div>
                  <div className="text-sm"><span className="text-muted-foreground">{isAr ? 'الطول' : 'Length'}:</span> {project.length ?? '-'}</div>
                  <div className="text-sm"><span className="text-muted-foreground">{isAr ? 'الكمية' : 'Quantity'}:</span> {project.quantity ?? '-'}</div>
                  <div className="text-sm"><span className="text-muted-foreground">{isAr ? 'أيام التنفيذ' : 'Execution Days'}:</span> {acceptedBid ? (acceptedBid.estimatedDays || acceptedBid.days || '-') : '-'}</div>
                  <div className="text-sm"><span className="text-muted-foreground">{isAr ? 'سعر المتر' : 'Price/m²'}:</span> {project.pricePerMeter ?? '-'}</div>
                  <div className="text-sm"><span className="text-muted-foreground">{isAr ? 'الإجمالي' : 'Total'}:</span> {project.total ?? '-'}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{isAr ? 'العروض المقدمة' : 'Submitted Bids'}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {bids.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">{isAr ? 'لا توجد عروض حتى الآن.' : 'No bids yet.'}</div>
                ) : (
                  <div className="divide-y">
                    {bids.map((b, index) => (
                      <div key={index} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            {/* Merchant Info with UserAvatar */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                              <div className="text-sm font-medium text-blue-800 mb-2">
                                {isAr ? 'التاجر المقدم للعرض' : 'Bidding Merchant'}
                              </div>
                              <div className="flex items-center gap-3">
                                <AvatarById
                                  id={String(b.merchantId || b.merchant?.id || '')}
                                  name={b.merchantName || b.merchant?.name || b.merchant?.fullName || b.vendorName || (isAr ? 'التاجر' : 'Merchant')}
                                  size="md"
                                  initialSrc={b.merchant?.profilePicture}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-semibold text-blue-700">
                                    {b.merchantName || b.merchant?.name || b.merchant?.fullName || userDetailsCacheRef.current.get(String(b.merchantId || b.merchant?.id || ''))?.name || b.vendorName || (isAr ? 'تاجر غير محدد' : 'Unknown Merchant')}
                                  </div>
                                  {(
                                    (b.merchantEmail || b.merchant?.email) ||
                                    userDetailsCacheRef.current.get(String(b.merchantId || b.merchant?.id || ''))?.email
                                  ) && (
                                      <div className="text-xs text-blue-600 truncate">
                                        {b.merchantEmail || b.merchant?.email || userDetailsCacheRef.current.get(String(b.merchantId || b.merchant?.id || ''))?.email}
                                      </div>
                                    )}
                                  {(b.merchantPhone || b.merchant?.phone) && (
                                    <div className="text-xs text-blue-600 truncate">
                                      {b.merchantPhone || b.merchant?.phone}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Bid Details */}
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-4 text-sm">
                                <span className="font-medium text-green-600">
                                  {isAr ? 'المبلغ المقترح: ' : 'Proposed Amount: '}
                                  {formatCurrency(isAr ? 'ar' : 'en', project?.currency || 'SAR', Number(b.amount || b.price || 0))}
                                </span>
                                <span className="text-muted-foreground">
                                  {isAr ? 'مدة التنفيذ: ' : 'Duration: '}{b.estimatedDays || b.days || '-'} {isAr ? 'يوم' : 'days'}
                                </span>
                              </div>

                              {b.proposal && (
                                <div className="bg-gray-50 p-3 rounded-md">
                                  <div className="text-xs font-medium text-gray-600 mb-1">{isAr ? 'تفاصيل العرض:' : 'Proposal Details:'}</div>
                                  <div className="text-sm text-gray-700">{b.proposal}</div>
                                </div>
                              )}

                              {b.submittedAt && (
                                <div className="text-xs text-muted-foreground">
                                  {isAr ? 'تاريخ التقديم: ' : 'Submitted: '}{new Date(b.submittedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0">
                            <Badge variant={statusBadgeVariant(String(b.status))} className={statusColorClasses(String(b.status))}>
                              {(() => {
                                const st = String(b.status || '').trim();
                                const lc = st.toLowerCase();
                                if (isAr) {
                                  return lc === 'submitted' ? 'مُقدّم'
                                    : lc === 'underreview' || lc === 'under review' ? 'قيد المراجعة'
                                    : lc === 'accepted' ? 'مقبول'
                                    : lc === 'rejected' ? 'مرفوض'
                                    : lc === 'pending' ? 'قيد الانتظار'
                                    : st;
                                } else {
                                  return lc === 'submitted' ? 'Submitted'
                                    : lc === 'underreview' || lc === 'under review' ? 'Under Review'
                                    : lc === 'accepted' ? 'Accepted'
                                    : lc === 'rejected' ? 'Rejected'
                                    : lc === 'withdrawn' ? 'Withdrawn'
                                    : st;
                                }
                              })()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chat section at the bottom removed as requested */}
          </>
        )}
      </div>
      <Footer setCurrentPage={setCurrentPage as any} />
    </div>
  );
}
