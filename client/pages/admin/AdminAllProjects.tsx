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
import { getProjects, deleteProject, type ProjectDto } from '@/services/projects';
import { api } from '@/lib/api';
import { Eye, RefreshCw } from 'lucide-react';
import { useFirstLoadOverlay } from '../../hooks/useFirstLoadOverlay';
import { toastError, toastSuccess, confirmDialog } from '../../utils/alerts';

const STATUS_OPTIONS = [
  { id: 'all', ar: 'كل المعتمدة', en: 'All Approved' },
  { id: 'Published', ar: 'منشور', en: 'Published' },
  { id: 'InBidding', ar: 'مفتوح للمناقصات', en: 'In Bidding' },
  { id: 'BidSelected', ar: 'تم اختيار عرض', en: 'Bid Selected' },
  { id: 'InProgress', ar: 'قيد التنفيذ', en: 'In Progress' },
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

export default function AdminAllProjects({ setCurrentPage, ...context }: Partial<RouteContext>) {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';
  const hideFirstOverlay = useFirstLoadOverlay(context, isAr ? 'جاري تحميل كل المشاريع' : 'Loading all projects', isAr ? 'يرجى الانتظار' : 'Please wait');

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<ProjectDto[]>([]);
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState<string>('all');

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

  const filtered = React.useMemo(() => {
    const s = status;
    return items.filter((p: any) => {
      const st = normalizeStatus((p as any).status ?? (p as any).Status);
      if (s !== 'all' && st !== s) return false;
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
                          <Badge variant={variant}>{isAr ?
                            (st==='Draft' ? 'مسودة' : st==='Published' ? 'منشور' : st==='InBidding' ? 'مفتوح للمناقصات' : st==='BidSelected' ? 'تم اختيار عرض' : st==='InProgress' ? 'قيد التنفيذ' : st==='Completed' ? 'مكتمل' : st==='Cancelled' ? 'ملغي' : st)
                            : st}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground truncate max-w-[80vw]">{p.description || ''}</div>
                        <div className="text-xs text-muted-foreground mt-1 space-y-1">
                          <div>
                            {(p as any).customerName || (p as any).ownerName || (p as any).customer?.name ? (
                              <span className="text-green-600 font-medium">{isAr ? 'صاحب المشروع: ' : 'Owner: '}{(p as any).customerName || (p as any).ownerName || (p as any).customer?.name} • </span>
                            ) : (
                              <span className="text-gray-500">{isAr ? 'صاحب المشروع: غير محدد • ' : 'Owner: Not specified • '}</span>
                            )}
                            {isAr ? 'العروض: ' : 'Bids: '}{(p as any).bidCount ?? (p as any).bids?.length ?? 0} • {isAr ? 'المشاهدات: ' : 'Views: '}{(p as any).views ?? (p as any).viewCount ?? 0}
                            {(p as any).createdAt && (
                              <span> • {isAr ? 'التاريخ: ' : 'Date: '}{new Date((p as any).createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span>
                            )}
                          </div>
                          {(p as any).bidCount > 0 || ((p as any).bids && (p as any).bids.length > 0) ? (
                            <div className="mt-1">
                              <span className="text-blue-600 font-medium">{isAr ? 'يوجد عروض مقدمة من التجار' : 'Has bidding merchants'}</span>
                              <span className="text-gray-500 ml-2">({isAr ? 'انقر لعرض التفاصيل' : 'Click to view details'})</span>
                            </div>
                          ) : (
                            <div className="mt-1">
                              <span className="text-gray-500">{isAr ? 'لا توجد عروض حتى الآن' : 'No bids yet'}</span>
                            </div>
                          )}
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
