import React from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import type { RouteContext } from '../../components/routerTypes';
import { useTranslation } from '../../hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { getAdminProjectById, getAdminProjectBids } from '@/services/admin';
import { ArrowLeft } from 'lucide-react';
import { useFirstLoadOverlay } from '../../hooks/useFirstLoadOverlay';

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

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'outline' {
  const lc = status.toLowerCase();
  if (['draft'].includes(lc)) return 'secondary';
  if (['published','inbidding','inprogress','bidselected'].includes(lc)) return 'default';
  if (['completed'].includes(lc)) return 'default';
  if (['cancelled','canceled'].includes(lc)) return 'outline';
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

  const projectId = React.useMemo(() => {
    try {
      const raw = window.localStorage.getItem('admin_selected_project_id')
        || window.localStorage.getItem('selected_project_id');
      return raw || '';
    } catch { return ''; }
  }, []);

  const load = React.useCallback(async () => {
    if (!projectId) {
      setError(isAr ? 'معرّف المشروع غير صالح' : 'Invalid project id');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const r = await getAdminProjectById(projectId);
      if (r.ok) {
        setProject(r.data);
        // Load bids for this project
        try {
          const br = await getAdminProjectBids(projectId);
          if (br.ok && br.data && (br.data as any).success) {
            setBids((br.data as any).items || []);
          } else {
            setBids([]);
          }
        } catch { setBids([]); }
      } else {
        setError(isAr ? 'تعذر تحميل تفاصيل المشروع' : 'Failed to load project details');
      }
    } catch {
      setError(isAr ? 'تعذر الاتصال بالخادم' : 'Failed to contact server');
    } finally {
      setLoading(false);
    }
  }, [projectId, isAr]);

  React.useEffect(() => { void load(); }, [load]);
  React.useEffect(() => { if (!loading) hideFirstOverlay(); }, [loading]);

  const back = () => {
    setCurrentPage && setCurrentPage('admin-all-projects');
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
  };

  const st = normalizeStatus(project?.status ?? project?.Status);

  return (
    <div className="min-h-screen bg-background" dir={isAr ? 'rtl' : 'ltr'}>
      <Header {...(ctx as any)} />
      <div className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <Button variant="ghost" onClick={back}>
            <ArrowLeft className="w-4 h-4 mr-2" /> {isAr ? 'عودة' : 'Back'}
          </Button>
        </div>

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
                  <Badge variant={statusBadgeVariant(st)}>
                    {isAr ?
                      (st==='Draft' ? 'مسودة' : st==='Published' ? 'منشور' : st==='InBidding' ? 'مفتوح للمناقصات' : st==='BidSelected' ? 'تم اختيار عرض' : st==='InProgress' ? 'قيد التنفيذ' : st==='Completed' ? 'مكتمل' : st==='Cancelled' ? 'ملغي' : st)
                      : st}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-muted-foreground">ID: {project.id ?? project._id ?? '-'}</div>
                <div className="text-sm">{project.description || ''}</div>
                <div className="text-sm text-muted-foreground">
                  {isAr ? 'العميل' : 'Customer'}: {project.customerName || project.customerId || '-'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isAr ? 'العروض' : 'Bids'}: {project.bidCount ?? 0} • {isAr ? 'المشاهدات' : 'Views'}: {project.viewCount ?? 0}
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="text-sm"><span className="text-muted-foreground">{isAr ? 'النوع' : 'Type'}:</span> {project.type || '-'}</div>
                  <div className="text-sm"><span className="text-muted-foreground">{isAr ? 'الخامة' : 'Material'}:</span> {project.material || '-'}</div>
                  <div className="text-sm"><span className="text-muted-foreground">{isAr ? 'العرض' : 'Width'}:</span> {project.width ?? '-'}</div>
                  <div className="text-sm"><span className="text-muted-foreground">{isAr ? 'الطول' : 'Height'}:</span> {project.height ?? '-'}</div>
                  <div className="text-sm"><span className="text-muted-foreground">{isAr ? 'الكمية' : 'Quantity'}:</span> {project.quantity ?? '-'}</div>
                  <div className="text-sm"><span className="text-muted-foreground">{isAr ? 'أيام التنفيذ' : 'Days'}:</span> {project.days ?? '-'}</div>
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
                    {bids.map((b) => (
                      <div key={b.id} className="p-4 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-medium truncate max-w-[60vw]">{b.merchantName || b.merchantEmail || b.merchantId}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-[80vw]">{b.merchantEmail || ''}</div>
                          <div className="text-xs text-muted-foreground mt-1">{isAr ? 'المبلغ' : 'Amount'}: {b.amount} • {isAr ? 'الأيام' : 'Days'}: {b.estimatedDays}</div>
                          {b.proposal && (
                            <div className="text-sm mt-1">{b.proposal}</div>
                          )}
                        </div>
                        <div className="shrink-0">
                          <Badge variant={statusBadgeVariant(String(b.status))}>
                            {(() => {
                              const st = String(b.status);
                              return isAr ? (st==='Submitted' ? 'مُقدّم' : st==='UnderReview' ? 'قيد المراجعة' : st==='Accepted' ? 'مقبول' : st==='Rejected' ? 'مرفوض' : st==='Withdrawn' ? 'مسحوب' : st) : st;
                            })()}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
      <Footer setCurrentPage={setCurrentPage as any} />
    </div>
  );
}
