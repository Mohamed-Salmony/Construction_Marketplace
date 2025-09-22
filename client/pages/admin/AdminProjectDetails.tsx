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
    } catch (error) {
      console.error('Error loading project:', error);
      setError(isAr ? 'تعذر الاتصال بالخادم' : 'Failed to contact server');
    } finally {
      setLoading(false);
    }
  }, [projectId, isAr]);

  React.useEffect(() => { void load(); }, [load]);
  React.useEffect(() => { if (!loading) hideFirstOverlay(); }, [loading, hideFirstOverlay]);

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
              <CardContent className="space-y-3">
                <div className="text-sm">{project.description || ''}</div>
                
                {/* Owner/Customer Information */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-green-800 mb-1">
                    {isAr ? 'صاحب المشروع' : 'Project Owner'}
                  </div>
                  <div className="text-sm text-green-700">
                    {project.customerName || project.customer?.name || project.ownerName || (isAr ? 'غير محدد' : 'Not specified')}
                  </div>
                  {(project.customerEmail || project.customer?.email) && (
                    <div className="text-xs text-green-600 mt-1">
                      {project.customerEmail || project.customer?.email}
                    </div>
                  )}
                </div>

                {/* Project Stats */}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>{isAr ? 'العروض المقدمة: ' : 'Bids: '}<span className="font-medium">{project.bidCount ?? bids.length ?? 0}</span></span>
                  <span>{isAr ? 'المشاهدات: ' : 'Views: '}<span className="font-medium">{project.viewCount ?? project.views ?? 0}</span></span>
                  {project.createdAt && (
                    <span>{isAr ? 'تاريخ الإنشاء: ' : 'Created: '}<span className="font-medium">{new Date(project.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span></span>
                  )}
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
                    {bids.map((b, index) => (
                      <div key={index} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            {/* Merchant Info */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                              <div className="text-sm font-medium text-blue-800 mb-1">
                                {isAr ? 'التاجر المقدم للعرض' : 'Bidding Merchant'}
                              </div>
                              <div className="text-sm text-blue-700">
                                {b.merchantName || b.merchant?.name || b.vendorName || (isAr ? 'تاجر غير محدد' : 'Unknown Merchant')}
                              </div>
                              {(b.merchantEmail || b.merchant?.email) && (
                                <div className="text-xs text-blue-600 mt-1">
                                  {b.merchantEmail || b.merchant?.email}
                                </div>
                              )}
                              {(b.merchantPhone || b.merchant?.phone) && (
                                <div className="text-xs text-blue-600">
                                  {b.merchantPhone || b.merchant?.phone}
                                </div>
                              )}
                            </div>
                            
                            {/* Bid Details */}
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-4 text-sm">
                                <span className="font-medium text-green-600">
                                  {isAr ? 'المبلغ المقترح: ' : 'Proposed Amount: '}
                                  {new Intl.NumberFormat().format(b.amount || 0)} {b.currency || 'ر.س'}
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
                            <Badge variant={statusBadgeVariant(String(b.status))}>
                              {(() => {
                                const st = String(b.status);
                                return isAr ? (st==='Submitted' ? 'مُقدّم' : st==='UnderReview' ? 'قيد المراجعة' : st==='Accepted' ? 'مقبول' : st==='Rejected' ? 'مرفوض' : st==='Withdrawn' ? 'مسحوب' : st) : st;
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
          </>
        )}
      </div>
      <Footer setCurrentPage={setCurrentPage as any} />
    </div>
  );
}
