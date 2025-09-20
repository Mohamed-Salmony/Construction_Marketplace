import React from 'react';
import Header from '../../components/Header';
import type { RouteContext } from '../../components/routerTypes';
import { useTranslation } from '../../hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { getPendingProjects, approveProject, rejectProject, getAdminProjectById, getAdminProjectBids } from '@/services/admin';
import { toastError, toastSuccess } from '../../utils/alerts';
import { useFirstLoadOverlay } from '../../hooks/useFirstLoadOverlay';

export default function AdminPendingProjects({ setCurrentPage, ...rest }: Partial<RouteContext>) {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';
  const hideFirstOverlay = useFirstLoadOverlay(rest, isAr ? 'جاري تحميل المشاريع قيد الاعتماد' : 'Loading pending projects', isAr ? 'يرجى الانتظار' : 'Please wait');
  const [items, setItems] = React.useState<Array<{ id: number; title: string; description?: string; customerId: string; customerName?: string; categoryId: number; createdAt: string }>>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [selectedPid, setSelectedPid] = React.useState<string>('');
  const [detailsLoading, setDetailsLoading] = React.useState(false);
  const [details, setDetails] = React.useState<any | null>(null);
  const [detailsBids, setDetailsBids] = React.useState<any[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await getPendingProjects();
      if (r.ok && r.data && Array.isArray((r.data as any).items)) setItems((r.data as any).items);
      else setItems([]);
    } catch {
      setItems([]);
      toastError(isAr ? 'تعذر جلب المشاريع' : 'Failed to fetch projects', isAr);
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  React.useEffect(() => { (async ()=>{ await load(); hideFirstOverlay(); })(); }, [load]);

  const normalizeStatus = (raw: any): string => {
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
  };
  const statusBadgeVariant = (status: string): 'default'|'secondary'|'outline' => {
    const lc = String(status || '').toLowerCase();
    if (['draft'].includes(lc)) return 'secondary';
    if (['published','inbidding','inprogress','bidselected'].includes(lc)) return 'default';
    if (['completed'].includes(lc)) return 'default';
    if (['cancelled','canceled'].includes(lc)) return 'outline';
    return 'outline';
  };

  const openDetails = async (pid: string) => {
    setSelectedPid(pid);
    setDetailsOpen(true);
    setDetails(null);
    setDetailsBids([]);
    setDetailsLoading(true);
    try {
      const r = await getAdminProjectById(pid);
      if (r.ok) setDetails(r.data);
      const br = await getAdminProjectBids(pid);
      if (br.ok && (br.data as any)?.success) setDetailsBids((br.data as any).items || []);
    } catch {
      // ignore, dialog will show placeholders
    } finally {
      setDetailsLoading(false);
    }
  };

  const doApprove = async (id: number | string, state: 'Published'|'InBidding') => {
    try {
      const r = await approveProject(id, state);
      if (r.ok) { toastSuccess(isAr ? 'تم الاعتماد' : 'Approved', isAr); await load(); }
      else toastError(isAr ? 'فشل الاعتماد' : 'Approval failed', isAr);
    } catch { toastError(isAr ? 'فشل الاعتماد' : 'Approval failed', isAr); }
  };
  const doReject = async (id: number | string) => {
    try {
      const r = await rejectProject(id, '');
      if (r.ok) { toastSuccess(isAr ? 'تم الرفض' : 'Rejected', isAr); await load(); }
      else toastError(isAr ? 'فشل الرفض' : 'Rejection failed', isAr);
    } catch { toastError(isAr ? 'فشل الرفض' : 'Rejection failed', isAr); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header {...(rest as any)} />
      <div className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">{isAr ? 'المشاريع قيد الاعتماد' : 'Pending Projects'}</h1>
          <p className="text-muted-foreground">{isAr ? 'راجع واعتمد أو ارفض طلبات المشاريع' : 'Review and approve or reject project requests'}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isAr ? 'قائمة المشاريع' : 'Projects List'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.length === 0 && (
              <div className="text-sm text-muted-foreground">{loading ? (isAr ? 'جاري التحميل...' : 'Loading...') : (isAr ? 'لا توجد مشاريع قيد الاعتماد' : 'No pending projects')}</div>
            )}
            {items.map((p, idx) => {
              const pid = (p as any).id ?? (p as any)._id;
              const pidStr = String(pid ?? `${p.customerId}-${idx}`);
              return (
              <div key={pidStr} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{p.title}</span>
                    {(() => {
                      const st = normalizeStatus((p as any).status ?? (p as any).Status);
                      return st ? (<Badge variant={statusBadgeVariant(st)}>{isAr ? (st==='Draft' ? 'مسودة' : st==='Published' ? 'منشور' : st==='InBidding' ? 'مفتوح للمناقصات' : st==='BidSelected' ? 'تم اختيار عرض' : st==='InProgress' ? 'قيد التنفيذ' : st==='Completed' ? 'مكتمل' : st==='Cancelled' ? 'ملغي' : st) : st}</Badge>) : null;
                    })()}
                    <Badge variant="secondary">#{pidStr}</Badge>
                    {p.createdAt && (
                      <span className="text-[10px] text-muted-foreground">
                        {isAr ? 'تم الإنشاء: ' : 'Created: '}{new Date(p.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground max-w-xl mt-1">{(p.description || '').slice(0, 160)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{isAr ? 'العميل' : 'Customer'}: {p.customerName || p.customerId}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={()=> openDetails(pidStr)}>
                    {isAr ? 'تفاصيل' : 'Details'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={()=>doApprove(pidStr, 'Published')}>{isAr ? 'اعتماد (نشر)' : 'Approve (Publish)'}</Button>
                  <Button size="sm" variant="outline" onClick={()=>doReject(pidStr)}>{isAr ? 'رفض' : 'Reject'}</Button>
                </div>
              </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="mt-4">
          <Button variant="outline" onClick={()=> setCurrentPage && setCurrentPage('admin-dashboard')}>{isAr ? 'رجوع' : 'Back'}</Button>
        </div>

        {/* Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-sm border border-white/20">
            <DialogHeader>
              <DialogTitle>{isAr ? 'تفاصيل المشروع' : 'Project Details'}</DialogTitle>
            </DialogHeader>
            {detailsLoading ? (
              <div className="p-2 text-sm text-muted-foreground">{isAr ? 'جارٍ التحميل...' : 'Loading...'}</div>
            ) : !details ? (
              <div className="p-2 text-sm text-red-600">{isAr ? 'تعذر تحميل التفاصيل' : 'Failed to load details'}</div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{details.title || (isAr ? 'مشروع' : 'Project')}</span>
                  {(() => {
                    const st = normalizeStatus(details.status ?? details.Status);
                    return st ? (<Badge variant={statusBadgeVariant(st)}>{isAr ? (st==='Draft' ? 'مسودة' : st==='Published' ? 'منشور' : st==='InBidding' ? 'مفتوح للمناقصات' : st==='BidSelected' ? 'تم اختيار عرض' : st==='InProgress' ? 'قيد التنفيذ' : st==='Completed' ? 'مكتمل' : st==='Cancelled' ? 'ملغي' : st) : st}</Badge>) : null;
                  })()}
                  <Badge variant="secondary">#{details.id ?? details._id}</Badge>
                </div>
                <div className="text-sm">{details.description || ''}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">{isAr ? 'العميل' : 'Customer'}:</span> {details.customerName || details.customerId || '-'}</div>
                  <div><span className="text-muted-foreground">{isAr ? 'الكمية' : 'Quantity'}:</span> {details.quantity ?? '-'}</div>
                  <div><span className="text-muted-foreground">{isAr ? 'العرض' : 'Width'}:</span> {details.width ?? '-'}</div>
                  <div><span className="text-muted-foreground">{isAr ? 'الطول' : 'Height'}:</span> {details.height ?? '-'}</div>
                  <div><span className="text-muted-foreground">{isAr ? 'سعر المتر' : 'Price/m²'}:</span> {details.pricePerMeter ?? '-'}</div>
                  <div><span className="text-muted-foreground">{isAr ? 'الإجمالي' : 'Total'}:</span> {details.total ?? '-'}</div>
                </div>
                <div className="pt-2">
                  <div className="font-medium text-sm mb-1">{isAr ? 'العروض المقدمة' : 'Submitted Bids'}</div>
                  {detailsBids.length === 0 ? (
                    <div className="text-sm text-muted-foreground">{isAr ? 'لا توجد عروض.' : 'No bids.'}</div>
                  ) : (
                    <div className="divide-y">
                      {detailsBids.map((b) => (
                        <div key={b.id || `${b.merchantId}-${b.createdAt}`} className="py-2 flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{b.merchantName || b.merchantEmail || b.merchantId}</div>
                            <div className="text-xs text-muted-foreground truncate">{b.merchantEmail || ''}</div>
                            <div className="text-xs text-muted-foreground mt-1">{isAr ? 'المبلغ' : 'Amount'}: {b.amount} • {isAr ? 'الأيام' : 'Days'}: {b.estimatedDays}</div>
                          </div>
                          <div className="shrink-0">
                            <Badge variant={statusBadgeVariant(String(b.status))}>{String(b.status)}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
