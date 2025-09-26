import React from 'react';
import Header from '../../components/Header';
import type { RouteContext } from '../../components/Router';
import { useTranslation } from '../../hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { getProjects, deleteProject, type ProjectDto, getProjectBids } from '@/services/projects';
import { api } from '@/lib/api';
import { Eye, RefreshCw } from 'lucide-react';
import UserAvatar from '../../components/UserAvatar';
import { getUserById } from '@/services/admin';
import { useFirstLoadOverlay } from '../../hooks/useFirstLoadOverlay';
import { toastError, toastSuccess, confirmDialog } from '../../utils/alerts';

const STATUS_OPTIONS = [
  { id: 'all', ar: 'كل المعتمدة', en: 'All Approved' },
  { id: 'InProgress', ar: 'قيد التنفيذ', en: 'In Progress' },
  { id: 'published', ar: 'منشور', en: 'published' },
  { id: 'Completed', ar: 'مكتمل', en: 'Completed' },
];

function normalizeStatus(raw: any): string {
  if (raw === undefined || raw === null) return '';
  const s = String(raw);
  // Map numeric enum to string names
  switch (s) {
    case '0': return 'Draft';
    case '1': return 'Published';
    case '2': return 'InBidding';
    case '3': return 'BidSelected';
    case '4': return 'InProgress';
    case '5': return 'Completed';
    case '6': return 'Cancelled';
    default: return s; // assume already a name
  }
}

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'outline' {
  const lc = status.toLowerCase();
  if (['draft'].includes(lc)) return 'secondary';
  if (['published','inbidding','inprogress','bidselected'].includes(lc)) return 'default';
  if (['completed'].includes(lc)) return 'default';
  if (['cancelled','canceled'].includes(lc)) return 'outline';
  return 'outline';
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

export default function AdminAllProjects({ setCurrentPage, ...context }: Partial<RouteContext>) {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';
  const hideFirstOverlay = useFirstLoadOverlay(context, isAr ? 'جاري تحميل كل المشاريع' : 'Loading all projects', isAr ? 'يرجى الانتظار' : 'Please wait');

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<ProjectDto[]>([]);
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState<string>('all');
  const [now, setNow] = React.useState<number>(Date.now());

  // User details cache for owner info
  const userDetailsCacheRef = React.useRef<Map<string, any>>(new Map());
  const [userDetailsTick, setUserDetailsTick] = React.useState(0);

  // Bids count cache (fallback when list API doesn't include bids count)
  const bidsCountCacheRef = React.useRef<Map<string, number>>(new Map());
  const [bidsTick, setBidsTick] = React.useState(0);

  const ensureBidsCount = React.useCallback(async (projectId?: string | number) => {
    const pid = String(projectId || '').trim();
    if (!pid) return;
    if (bidsCountCacheRef.current.has(pid)) return;
    try {
      const r = await getProjectBids(pid);
      if (r.ok && Array.isArray(r.data)) {
        bidsCountCacheRef.current.set(pid, r.data.length);
        setBidsTick(t => t + 1);
      }
    } catch {}
  }, []);

  const ensureUserDetails = React.useCallback(async (id?: string | null) => {
    const key = String(id || '').trim();
    if (!key) return;
    if (userDetailsCacheRef.current.has(key)) return;
    try {
      const r = await getUserById(key);
      if (r.ok && (r.data as any)?.success) {
        userDetailsCacheRef.current.set(key, (r.data as any).item);
        setUserDetailsTick(t => t + 1);
      }
    } catch {}
  }, []);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Get all approved/published projects (excluding drafts and pending)
      const r = await getProjects({ page: 1, pageSize: 500, query });
      if (r.ok && r.data) {
        const list = (r.data as any).items as ProjectDto[];
        // Filter to show only approved/active projects
        const approvedProjects = (Array.isArray(list) ? list : []).filter((p: any) => {
          const st = normalizeStatus(p.status ?? p.Status);
          // Show Published, InBidding, BidSelected, InProgress, and Completed projects
          return ['Published', 'InBidding', 'BidSelected', 'InProgress', 'Completed'].includes(st);
        });
        
        setItems(approvedProjects);
      } else {
        setItems([]);
        setError(isAr ? 'تعذر جلب المشاريع' : 'Failed to fetch projects');
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setItems([]);
      setError(isAr ? 'تعذر الاتصال بالخادم' : 'Failed to contact server');
    } finally {
      setLoading(false);
    }
  }, [query, isAr]); // Removed loading to prevent infinite loops

  React.useEffect(() => { 
    let mounted = true;
    const loadData = async () => {
      if (mounted) {
        await load(); 
        hideFirstOverlay();
      }
    };
    loadData();
    return () => { mounted = false; };
  }, []); // Removed dependencies to prevent infinite loops

  // Tick every second for running timers
  React.useEffect(() => {
    const id = setInterval(()=> setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const filtered = React.useMemo(() => {
    const s = String(status || '').toLowerCase();
    return items.filter((p: any) => {
      const stLc = normalizeStatus((p as any).status ?? (p as any).Status).toLowerCase();
      if (s !== 'all' && stLc !== s) return false;
      if (query) {
        const q = query.toLowerCase();
        const inTitle = (p.title || '').toLowerCase().includes(q);
        const inDesc = (p.description || '').toLowerCase().includes(q);
        return inTitle || inDesc;
      }
      return true;
    });
  }, [items, status, query]);

  return (
    <div className="min-h-screen bg-background">
      <Header {...context} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{isAr ? 'كل المشاريع المعتمدة' : 'All Approved Projects'}</h1>
            <p className="text-muted-foreground">{isAr ? 'استعرض جميع المشاريع المعتمدة والمتوافق عليها وقم بالتصفية حسب الحالة' : 'Browse all approved and active projects and filter by status'}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="w-4 h-4 mr-1" /> {isAr ? 'تحديث' : 'Refresh'}
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm mb-1">{isAr ? 'بحث' : 'Search'}</label>
              <Input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder={isAr ? 'العنوان أو الوصف...' : 'Title or description...'} />
            </div>
            <div>
              <label className="block text-sm mb-1">{isAr ? 'الحالة' : 'Status'}</label>
              <Select value={status} onValueChange={(v)=>setStatus(v)}>
                <SelectTrigger>
                  <SelectValue placeholder={isAr ? 'اختر الحالة' : 'Select status'} />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(o => (
                    <SelectItem key={o.id} value={o.id}>{isAr ? o.ar : o.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card><CardContent className="p-6 text-muted-foreground">{isAr ? 'جارٍ التحميل...' : 'Loading...'}</CardContent></Card>
        ) : error ? (
          <Card><CardContent className="p-6 text-red-600">{error}</CardContent></Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{isAr ? `عدد النتائج: ${filtered.length}` : `Results: ${filtered.length}`}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {filtered.map((p: any, idx: number) => {
                  const st = normalizeStatus(p.status ?? p.Status);
                  const variant = statusBadgeVariant(st);
                  const ownerId = String((p as any)?.customerId || (p as any)?.customer?.id || '').trim();
                  if (ownerId) { void ensureUserDetails(ownerId); }
                  const owner = ownerId ? userDetailsCacheRef.current.get(ownerId) : undefined;
                  const acceptedAtRaw = (p as any)?.acceptedAt || (p as any)?.startedAt || (p as any)?.accepted_at || (p as any)?.started_at;
                  const bidsCount =
                    (p as any)?.bidCount ??
                    (p as any)?.BidCount ??
                    (p as any)?.bidsCount ??
                    (p as any)?.bids_count ??
                    (p as any)?.offersCount ??
                    (p as any)?.offers_count ??
                    (p as any)?.offers ??
                    (p as any)?.bids?.length ??
                    (p as any)?.stats?.bids ?? 0;
                  const projectIdStr = String((p as any)?.id ?? (p as any)?._id ?? '').trim();
                  let displayBids = bidsCount || (projectIdStr ? (bidsCountCacheRef.current.get(projectIdStr) ?? 0) : 0);
                  if (displayBids === 0 && projectIdStr) { void ensureBidsCount(projectIdStr); }
                  let runningSince: null | {d:number;h:number;m:number;s:number} = null;
                  if (st === 'InProgress' && acceptedAtRaw) {
                    try {
                      const dt = new Date(acceptedAtRaw);
                      const ms = now - dt.getTime();
                      if (ms >= 0) {
                        const s = Math.floor(ms/1000);
                        const d = Math.floor(s/86400);
                        const h = Math.floor((s%86400)/3600);
                        const m = Math.floor((s%3600)/60);
                        const ss = s%60;
                        runningSince = { d, h, m, s: ss };
                      }
                    } catch {}
                  }
                  return (
                    <div
                      key={`${p.id ?? p._id ?? 'row'}-${idx}`}
                      className="p-4 flex items-start justify-between gap-4 cursor-pointer hover:bg-accent/30"
                      onClick={() => {
                        try { window.localStorage.setItem('admin_selected_project_id', String(p.id ?? p._id)); } catch {}
                        setCurrentPage && setCurrentPage('admin-project-details');
                        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
                      }}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate max-w-[60vw]">{p.title || (isAr ? 'مشروع' : 'Project')}</span>
                          <Badge
                            variant={variant}
                            className={statusColorClasses(st) + ' cursor-pointer'}
                            onClick={(e) => { e.stopPropagation(); setStatus(st.toLowerCase()); }}
                            title={isAr ? 'تصفية حسب هذه الحالة' : 'Filter by this status'}
                          >
                            {isAr ? (st==='InProgress' ? 'قيد التنفيذ' : st==='Completed' ? 'مكتمل' : st==='Published' ? 'منشور' : st) : st}
                          </Badge>
                        </div>
                        {/* Owner Info */}
                        <div className="mt-2 flex items-center gap-3">
                          <UserAvatar
                            src={owner?.profilePicture || (p as any)?.customer?.profilePicture}
                            name={(p as any)?.customerName || (p as any)?.ownerName || owner?.name || (p as any)?.customer?.name || 'User'}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-green-700 truncate">
                              {(p as any)?.customerName || (p as any)?.ownerName || owner?.name || (p as any)?.customer?.name || (isAr ? 'غير محدد' : 'Not specified')}
                            </div>
                            {((p as any)?.customerEmail || (p as any)?.customer?.email || owner?.email) && (
                              <div className="text-xs text-green-600 truncate">
                                {(p as any)?.customerEmail || (p as any)?.customer?.email || owner?.email}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground truncate max-w-[80vw]">{p.description || ''}</div>
                        <div className="text-xs text-muted-foreground mt-1 space-y-1">
                          <div>
                            {isAr ? 'العروض: ' : 'Bids: '}{displayBids}
                            {(p as any).createdAt && (
                              <span> • {isAr ? 'التاريخ: ' : 'Date: '}{new Date((p as any).createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span>
                            )}
                            {runningSince && (
                              <span className="ml-2 text-blue-700">
                                {isAr ? 'العدّاد: ' : 'Timer: '}
                                {runningSince.d} {isAr ? 'يوم' : 'd'} {runningSince.h}:{String(runningSince.m).padStart(2,'0')}:{String(runningSince.s).padStart(2,'0')}
                              </span>
                            )}
                          </div>
                          {(p as any).bidCount > 0 || ((p as any).bids && (p as any).bids.length > 0) ? (
                            <div className="mt-1">
                              <span className="text-blue-600 font-medium">{isAr ? 'يوجد عروض مقدمة من التجار' : 'Has bidding merchants'}</span>
                              <span className="text-gray-500 ml-2">({isAr ? 'انقر لعرض التفاصيل' : 'Click to view details'})</span>
                            </div>
                          ) :null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            try { window.localStorage.setItem('admin_selected_project_id', String(p.id ?? p._id)); } catch {}
                            setCurrentPage && setCurrentPage('admin-project-details');
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          {isAr ? 'عرض' : 'View'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
