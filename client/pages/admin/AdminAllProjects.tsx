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
import { Eye, RefreshCw } from 'lucide-react';
import { useFirstLoadOverlay } from '../../hooks/useFirstLoadOverlay';
import { toastError, toastSuccess, confirmDialog } from '../../utils/alerts';

const STATUS_OPTIONS = [
  { id: 'all', ar: 'الكل', en: 'All' },
  { id: 'Draft', ar: 'مسودة', en: 'Draft' },
  { id: 'Published', ar: 'منشور', en: 'Published' },
  { id: 'InBidding', ar: 'مفتوح للمناقصات', en: 'In Bidding' },
  { id: 'BidSelected', ar: 'تم اختيار عرض', en: 'Bid Selected' },
  { id: 'InProgress', ar: 'قيد التنفيذ', en: 'In Progress' },
  { id: 'Completed', ar: 'مكتمل', en: 'Completed' },
  { id: 'Cancelled', ar: 'ملغي', en: 'Cancelled' },
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
      const r = await getProjects({ page: 1, pageSize: 200, query });
      if (r.ok && r.data) {
        const list = (r.data as any).items as ProjectDto[];
        setItems(Array.isArray(list) ? list : []);
      } else {
        setItems([]);
        setError(isAr ? 'تعذر جلب المشاريع' : 'Failed to fetch projects');
      }
    } catch {
      setItems([]);
      setError(isAr ? 'تعذر الاتصال بالخادم' : 'Failed to contact server');
    } finally {
      setLoading(false);
    }
  }, [query, isAr]);

  React.useEffect(() => { (async ()=> { await load(); hideFirstOverlay(); })(); }, [load]);

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
            <h1 className="text-2xl font-bold">{isAr ? 'كل المشاريع' : 'All Projects'}</h1>
            <p className="text-muted-foreground">{isAr ? 'استعرض كل المشاريع وقم بالتصفية حسب الحالة' : 'Browse all projects and filter by status'}</p>
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
                        <div className="text-xs text-muted-foreground mt-1">
                          ID: {p.id} • {isAr ? 'عدد العروض:' : 'Bids:'} {(p as any).bidCount ?? 0} • {isAr ? 'المشاهدات:' : 'Views:'} {(p as any).views ?? (p as any).viewCount ?? 0}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async (e) => {
                            e.stopPropagation();
                            // Confirm deletion
                            const ok = await confirmDialog(
                              isAr ? 'هل أنت متأكد من حذف هذا المشروع؟ لا يمكن التراجع.' : 'Delete this project? This cannot be undone.',
                              isAr ? 'حذف' : 'Delete',
                              isAr ? 'إلغاء' : 'Cancel',
                              isAr
                            );
                            if (!ok) return;
                            try {
                              const r = await deleteProject(p.id ?? p._id);
                              if (r.ok) {
                                toastSuccess(isAr ? 'تم حذف المشروع' : 'Project deleted', isAr);
                                void load();
                              } else {
                                const errorMsg = (r as any).error?.message || (r as any).error || 'Failed to delete project';
                                toastError(isAr ? `فشل حذف المشروع: ${errorMsg}` : `Failed to delete project: ${errorMsg}`, isAr);
                              }
                            } catch (error: any) {
                              const errorMsg = error?.message || 'Failed to delete project';
                              toastError(isAr ? `فشل حذف المشروع: ${errorMsg}` : `Failed to delete project: ${errorMsg}`, isAr);
                            }
                          }}
                        >
                          {isAr ? 'حذف' : 'Delete'}
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
