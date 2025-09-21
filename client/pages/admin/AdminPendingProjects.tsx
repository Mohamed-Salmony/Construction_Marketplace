import React from 'react';
import Header from '../../components/Header';
import type { RouteContext } from '../../components/routerTypes';
import { useTranslation } from '../../hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { getPendingProjects, approveProject, rejectProject, getAdminProjectById, getAdminProjectBids } from '@/services/admin';
import { getProjectCatalog, type ProjectCatalog } from '@/services/options';
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
  const [catalog, setCatalog] = React.useState<ProjectCatalog | null>(null);

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

  React.useEffect(() => { (async ()=>{ await load(); hideFirstOverlay(); })(); }, []); // Removed dependencies to prevent infinite loops

  // Load admin product catalog to resolve localized labels
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await getProjectCatalog();
        if (!cancelled && r) setCatalog(r);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

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

  // Helpers: resolve human labels
  const resolveTypeLabel = React.useCallback((typeId?: string) => {
    try {
      const id = String(typeId || '');
      if (!id) return '';
      const p = catalog?.products?.find(x => x.id === id);
      if (p) return (isAr ? (p.ar || p.id) : (p.en || p.id));
      return id;
    } catch { return String(typeId || ''); }
  }, [catalog, isAr]);
  const resolveMaterialLabel = React.useCallback((typeId?: string, materialId?: string) => {
    try {
      const tid = String(typeId || '');
      const mid = String(materialId || '');
      if (!mid) return '';
      const prod = catalog?.products?.find(p => p.id === tid);
      const mats = ([] as any[]).concat(...((prod?.subtypes || []).map((s:any)=> s?.materials || [])));
      const m = mats.find((x:any)=> x?.id === mid);
      if (m) return (isAr ? (m.ar || m.id) : (m.en || m.id));
      return mid;
    } catch { return String(materialId || ''); }
  }, [catalog, isAr]);
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
              <div key={pidStr} className="p-4 md:p-5 border rounded-xl shadow-sm hover:shadow-md transition bg-background/80">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-base truncate">{p.title || (isAr ? 'مشروع' : 'Project')}</span>
                      {(() => {
                        const st = normalizeStatus((p as any).status ?? (p as any).Status);
                        return st ? (
                          <Badge variant={statusBadgeVariant(st)}>{isAr ? (st==='Draft' ? 'مسودة' : st==='Published' ? 'منشور' : st==='InBidding' ? 'مفتوح للمناقصات' : st==='BidSelected' ? 'تم اختيار عرض' : st==='InProgress' ? 'قيد التنفيذ' : st==='Completed' ? 'مكتمل' : st==='Cancelled' ? 'ملغي' : st) : st}</Badge>
                        ) : null;
                      })()}
                      {p.createdAt && (
                        <span className="text-[11px] text-muted-foreground">
                          {isAr ? 'تم الإنشاء: ' : 'Created: '}{new Date(p.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <div className="text-xs text-muted-foreground max-w-3xl mt-1 line-clamp-2">{p.description}</div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(() => {
                        const typeId = (p as any).ptype || (p as any).type || '';
                        const matId = (p as any).material || '';
                        const typeLabel = resolveTypeLabel(typeId);
                        const matLabel = resolveMaterialLabel(typeId, matId);
                        const dims = `${Number((p as any).width||0)} × ${Number((p as any).height||0)} m`;
                        const qty = Number((p as any).quantity||0);
                        const total = Number((p as any).total||0);
                        return (
                          <>
                            {typeLabel && <Badge variant="outline" className="rounded-full text-xs px-3">{typeLabel}</Badge>}
                            {matLabel && <Badge variant="outline" className="rounded-full text-xs px-3">{matLabel}</Badge>}
                            <Badge variant="outline" className="rounded-full text-xs px-3">{dims}</Badge>
                            <Badge variant="outline" className="rounded-full text-xs px-3">{isAr ? `الكمية: ${qty}` : `Qty: ${qty}`}</Badge>
                            {Number.isFinite(total) && total>0 && (
                              <Badge variant="secondary" className="rounded-full text-xs px-3">{isAr ? `الإجمالي: ${total}` : `Total: ${total}`}</Badge>
                            )}
                            {Boolean((p as any).customerName || (p as any).customerEmail) && (
                              <Badge variant="outline" className="rounded-full text-xs px-3">
                                {isAr ? 'العميل: ' : 'Customer: '}{(p as any).customerName || (p as any).customerEmail}
                              </Badge>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="ghost" onClick={()=> openDetails(pidStr)}>
                      {isAr ? 'تفاصيل' : 'Details'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={()=>doApprove(pidStr, 'Published')}>{isAr ? 'اعتماد (نشر)' : 'Approve (Publish)'}</Button>
                    <Button size="sm" variant="outline" onClick={()=>doReject(pidStr)}>{isAr ? 'رفض' : 'Reject'}</Button>
                  </div>
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
                </div>
                <div className="text-sm">{details.description || ''}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">{isAr ? 'النوع' : 'Type'}:</span> {resolveTypeLabel(details.ptype || details.type)}</div>
                  <div><span className="text-muted-foreground">{isAr ? 'الخامة' : 'Material'}:</span> {resolveMaterialLabel(details.ptype || details.type, details.material)}</div>
                  <div><span className="text-muted-foreground">{isAr ? 'الأبعاد' : 'Dimensions'}:</span> {Number(details.width||0)} × {Number(details.height||0)} m</div>
                  <div><span className="text-muted-foreground">{isAr ? 'الكمية' : 'Quantity'}:</span> {details.quantity ?? '-'}</div>
                  <div><span className="text-muted-foreground">{isAr ? 'سعر المتر' : 'Price/m²'}:</span> {details.pricePerMeter ?? '-'}</div>
                  <div><span className="text-muted-foreground">{isAr ? 'الإجمالي' : 'Total'}:</span> {details.total ?? '-'}</div>
                  <div className="md:col-span-2"><span className="text-muted-foreground">{isAr ? 'العميل' : 'Customer'}:</span> {details.customerName || details.customerEmail || details.customerId || '-'}</div>
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
