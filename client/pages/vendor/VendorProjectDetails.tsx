import React, { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import type { RouteContext } from '../../components/routerTypes';
import { useTranslation } from '../../hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Separator } from '../../components/ui/separator';
import { Package, Layers, Ruler, Boxes, ClipboardList, Calendar, Send, ArrowRight, Info } from 'lucide-react';
import { getProjectById, getMyBids, createBid } from '@/services/projects';
import { getProjectCatalog, type ProjectCatalog } from '@/services/options';
import { useFirstLoadOverlay } from '../../hooks/useFirstLoadOverlay';

interface Props extends Partial<RouteContext> {}

export default function VendorProjectDetails({ setCurrentPage, ...context }: Props) {
  const { locale } = useTranslation();
  const currency = locale === 'ar' ? 'ر.س' : 'SAR';
  const hideFirstOverlay = useFirstLoadOverlay(
    context,
    locale === 'ar' ? 'جاري تحميل تفاصيل المشروع' : 'Loading project details',
    locale === 'ar' ? 'يرجى الانتظار' : 'Please wait'
  );

  const [project, setProject] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<ProjectCatalog | null>(null);

  const [offerPrice, setOfferPrice] = useState<string>('');
  const [offerDays, setOfferDays] = useState<string>('');
  const [offerMessage, setOfferMessage] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [myProposal, setMyProposal] = useState<any | null>(null);

  const labelForProductType = (id?: string) => {
    if (!id) return '';
    const map: any = {
      door: { ar: 'باب', en: 'Door' },
      window: { ar: 'شباك', en: 'Window' },
      railing: { ar: 'دربزين', en: 'Railing' },
    };
    return map[id]?.[locale === 'ar' ? 'ar' : 'en'] || id;
  };

  const labelForMaterial = (id?: string) => {
    if (!id) return '';
    const map: any = {
      aluminum: { ar: 'ألمنيوم', en: 'Aluminum' },
      steel: { ar: 'صاج', en: 'Steel' },
      laser: { ar: 'ليزر', en: 'Laser-cut' },
      glass: { ar: 'سكريت', en: 'Glass (Securit)' },
    };
    return map[id]?.[locale === 'ar' ? 'ar' : 'en'] || id;
  };

  // Load selected project by id from backend (id is stored just for navigation)
  useEffect(() => {
    (async () => {
      try {
        const id = typeof window !== 'undefined' ? window.localStorage.getItem('selected_vendor_project_id') : null;
        if (!id) { setLoading(false); return; }
        const { ok, data } = await getProjectById(String(id));

        if (ok && data) {
          const p: any = data;
          // Normalize fields from various casings/locations
          const width = p.width ?? p.Width ?? p.requiredWidth ?? p.RequiredWidth;
          const height = p.height ?? p.Height ?? p.requiredHeight ?? p.RequiredHeight;
          const length = p.length ?? p.Length ?? p.requiredLength ?? p.RequiredLength;
          const quantity = p.quantity ?? p.Quantity ?? p.requiredQuantity ?? p.RequiredQuantity ?? p.Qty ?? p.qty;
          const days = p.days ?? p.Days;
          const total = p.total ?? p.Total ?? p.budgetMax ?? p.BudgetMax ?? p.budgetMin ?? p.BudgetMin;
          const pricePerMeter = p.pricePerMeter ?? p.PricePerMeter;
          const material = p.material ?? p.Material;
          const type = p.type ?? p.Type ?? p.ptype ?? p.PType ?? p.productType ?? p.ProductType;
          const description = p.description ?? p.Description;
          const customerName = p.customerName ?? p.CustomerName ?? p.userName ?? p.UserName ?? p.user?.name;
          const currencyServer = p.currency ?? p.Currency;
          const items = Array.isArray(p.items) ? p.items : (Array.isArray(p.Items) ? p.Items : []);
          const normalized = {
            ...p,
            id: p.id ?? p._id,
            width,
            height,
            length,
            quantity,
            days,
            total,
            pricePerMeter,
            material,
            type,
            description,
            customerName,
            currency: currencyServer,
            items,
            title: p.title ?? p.Title,
          };
          setProject(normalized);
        } else setProject(null);
        // Load admin catalog for resolving accessories and materials per type
        try {
          const cat = await getProjectCatalog();
          setCatalog(cat);
        } catch {}
      } finally {
        setLoading(false);
        try { hideFirstOverlay(); } catch {}
      }
    })();
  }, [hideFirstOverlay]);

  // Check if current vendor already submitted a bid via backend
  useEffect(() => {
    (async () => {
      try {
        if (!project) { setHasSubmitted(false); setMyProposal(null); return; }
        const { ok, data } = await getMyBids();
        const list = ok && Array.isArray(data) ? (data as any[]) : [];
        const mine = list.find((b:any)=> String(b.projectId) === String(project.id ?? project._id));
        setHasSubmitted(!!mine);
        setMyProposal(mine || null);
        if (mine && !editingProposalId) setEditingProposalId(String(mine.id));
      } catch {
        setHasSubmitted(false);
        setMyProposal(null);
      }
    })();
  }, [project, editingProposalId]);

  const itemsArray = useMemo(() => Array.isArray(project?.items) ? project!.items : [], [project]);

  // Compute customer's baseline total (minimum acceptable price)
  const baseTotal: number = useMemo(() => {
    const p: any = project;
    if (!p) return 0;
    // Prefer explicit total or budgets
    if (typeof p.total === 'number') return Math.max(0, Number(p.total));
    if (typeof p.budgetMax === 'number') return Math.max(0, Number(p.budgetMax));
    if (typeof p.BudgetMax === 'number') return Math.max(0, Number(p.BudgetMax));
    if (typeof p.budgetMin === 'number') return Math.max(0, Number(p.budgetMin));
    if (typeof p.BudgetMin === 'number') return Math.max(0, Number(p.BudgetMin));
    // Fallback rough estimate
    const W = Math.max(0, Number(p.width || 0));
    const H = Math.max(0, Number(p.height || 0));
    const L = Math.max(0, Number(p.length || 0));
    const area = W>0 && H>0 ? (W*H) : (W>0 && L>0 ? (W*L) : (H>0 && L>0 ? (H*L) : (W || H || L)));
    const accessoriesCost = Array.isArray(p.accessories)
      ? p.accessories.map((a: any) => Number(a?.price || 0)).reduce((a: number, b: number) => a + b, 0)
      : 0;
    const pricePerM = Number(p.pricePerMeter || 0);
    const qty = Math.max(1, Number(p.quantity || 1));
    const subtotalOne = (area * pricePerM) + accessoriesCost;
    return Math.max(0, Math.round(subtotalOne * qty));
  }, [project]);

  const minPrice = baseTotal;
  const maxPrice = Math.max(minPrice, minPrice * 2);
  const formatMoney = (n: number) => {
    try { return n.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US'); } catch { return String(n); }
  };

  // Resolve accessories names using admin catalog when possible
  const accessoriesNames = useMemo(() => {
    if (!project) return [] as string[];
    const ids: string[] = Array.isArray(project.selectedAcc) ? project.selectedAcc : [];
    if (!ids.length) return [] as string[];
    const pid = String(project.ptype || project.type || '');
    const prod = catalog?.products?.find(p => p.id === pid);
    const accs = prod?.accessories || [];
    return ids
      .map(id => {
        const acc = accs.find(a => a.id === id);
        return acc ? (locale==='ar' ? (acc.ar || acc.id) : (acc.en || acc.id)) : null;
      })
      .filter(Boolean) as string[];
  }, [project, catalog, locale]);

  const back = () => setCurrentPage && setCurrentPage('vendor-projects');

  return (
    <div className="min-h-screen bg-background" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <Header {...context} />

      <div className="container mx-auto px-4 py-8">
        {loading && (
          <Card className="max-w-3xl mx-auto animate-pulse">
            <CardContent className="p-6 space-y-4">
              <div className="h-6 w-40 bg-muted rounded" />
              <div className="h-24 bg-muted rounded" />
            </CardContent>
          </Card>
        )}

        {!loading && !project && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Info className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">
                {locale==='ar' ? 'لا توجد تفاصيل متاحة لهذا المشروع.' : 'No details available for this project.'}
              </p>
              <div className="pt-1">
                <Button onClick={back} className="inline-flex items-center gap-1">
                  {locale==='ar' ? 'رجوع للمشاريع' : 'Back to Projects'} <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && project && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main details */}
            <Card className="lg:col-span-2 overflow-hidden shadow-sm">
              <div className="p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Package className="w-6 h-6 text-primary" />
                    <h1 className="text-2xl font-bold">
                      {locale==='ar' ? 'تفاصيل المشروع' : 'Project Details'}
                    </h1>
                  </div>
                </div>

                {/* Quick summary chips */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {!!(project.ptype || project.type || project.Type) && (
                    <Badge variant="outline" className="rounded-full text-xs">
                      {labelForProductType(project.ptype || project.type || project.Type)}
                    </Badge>
                  )}
                  {!!(project.material || project.Material) && (
                    <Badge variant="outline" className="rounded-full text-xs">
                      {labelForMaterial(project.material || project.Material)}
                    </Badge>
                  )}
                  {(project.width || project.height || project.length) && (
                    <Badge variant="outline" className="rounded-full text-xs">
                      {(() => {
                        const w = Number(project.width||0);
                        const h = Number(project.height||0);
                        const l = Number(project.length||0);
                        if (w>0 && h>0) return `${w} × ${h} m`;
                        if (w>0 && l>0) return `${w} × ${l} m`;
                        if (h>0 && l>0) return `${h} × ${l} m`;
                        return `${w || h || l || 0} m`;
                      })()}
                    </Badge>
                  )}
                  {project.quantity != null && (
                    <Badge variant="outline" className="rounded-full text-xs">
                      {locale==='ar' ? `الكمية: ${project.quantity}` : `Quantity: ${project.quantity}`}
                    </Badge>
                  )}
                  {Number(project?.days) > 0 && (
                    <Badge variant="outline" className="rounded-full text-xs">
                      {locale==='ar' ? `الأيام: ${project.days}` : `Days: ${project.days}`}
                    </Badge>
                  )}
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Info grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4 bg-background shadow-sm">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Package className="w-4 h-4" /> {locale==='ar' ? 'نوع المنتج' : 'Product Type'}
                    </div>
                    <div className="mt-1 font-medium">
                      {labelForProductType(project.ptype || project.type || project.Type) || '-'}
                    </div>
                  </div>
                  <div className="rounded-lg border p-4 bg-background shadow-sm">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Layers className="w-4 h-4" /> {locale==='ar' ? 'الخامة' : 'Material'}
                    </div>
                    <div className="mt-1 font-medium">{labelForMaterial(project.material || project.Material) || '-'}</div>
                  </div>
                  <div className="rounded-lg border p-4 bg-background shadow-sm">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Ruler className="w-4 h-4" /> {locale==='ar' ? 'الأبعاد (متر)' : 'Dimensions (m)'}
                    </div>
                    <div className="mt-1 font-medium">
                      {(() => {
                        const w = Number(project.width||0);
                        const h = Number(project.height||0);
                        const l = Number(project.length||0);
                        if (w>0 && h>0) return (<>{w} × {h}<span className="text-muted-foreground text-xs ms-1">m</span></>);
                        if (w>0 && l>0) return (<>{w} × {l}<span className="text-muted-foreground text-xs ms-1">m</span></>);
                        if (h>0 && l>0) return (<>{h} × {l}<span className="text-muted-foreground text-xs ms-1">m</span></>);
                        return (<>{w || h || l || 0}<span className="text-muted-foreground text-xs ms-1">m</span></>);
                      })()}
                    </div>
                  </div>
                  <div className="rounded-lg border p-4 bg-background shadow-sm">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Boxes className="w-4 h-4" /> {locale==='ar' ? 'الكمية' : 'Quantity'}
                    </div>
                    <div className="mt-1 font-medium">{project.quantity ?? '-'}</div>
                  </div>
                  <div className="rounded-lg border p-4 bg-background shadow-sm">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> {locale==='ar' ? 'المدة (أيام)' : 'Duration (days)'}
                    </div>
                    <div className="mt-1 font-medium">{Number(project?.days) > 0 ? project.days : '-'}</div>
                  </div>
                </div>

                <Separator />

                {/* Accessories */}
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">{locale==='ar' ? 'الملحقات' : 'Accessories'}</div>
                  {accessoriesNames.length>0 ? (
                    <div className="flex flex-wrap gap-2">
                      {accessoriesNames.map((name: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="rounded-full px-3 py-1 text-xs">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">{locale==='ar'?'بدون':'None'}</div>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    {locale==='ar' ? 'الوصف' : 'Description'}
                  </div>
                  {project.description ? (
                    <div className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 border rounded-md p-3">
                      {project.description}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      {locale==='ar' ? 'لا يوجد وصف مضاف.' : 'No description provided.'}
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>

            {/* Sidebar: submit proposal */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{locale==='ar' ? 'صاحب الطلب' : 'Customer'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    {(project?.customerName || project?.userName || project?.user?.name) || (locale==='ar' ? 'غير معروف' : 'Unknown')}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    {isEditing
                      ? (locale==='ar' ? 'تعديل عرضي' : 'Edit My Offer')
                      : (hasSubmitted
                          ? (locale==='ar' ? 'تم الإرسال' : 'Submitted')
                          : (locale==='ar' ? 'تقديم عرض' : 'Submit Proposal')
                        )
                    }
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {hasSubmitted && !isEditing ? (
                    <div className="space-y-3 text-sm">
                      {myProposal && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{locale==='ar' ? 'السعر المقدم' : 'Submitted Price'}</span>
                            <span className="font-semibold">{currency} {formatMoney(Number(myProposal.price||0))}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{locale==='ar' ? 'الأيام' : 'Days'}</span>
                            <span className="font-semibold">{Number(myProposal.days||0)}</span>
                          </div>
                          {!!myProposal.message && (
                            <div className="text-muted-foreground whitespace-pre-wrap">{myProposal.message}</div>
                          )}
                        </>
                      )}
                      <div className="pt-2">
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => {
                            const p = myProposal;
                            if (p) {
                              setOfferPrice(String(p.price ?? ''));
                              setOfferDays(String(p.days ?? ''));
                              setOfferMessage(String(p.message ?? ''));
                              setEditingProposalId(String(p.id));
                            }
                            setIsEditing(true);
                          }}
                        >
                          {locale==='ar' ? 'تعديل عرضي' : 'Edit my offer'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-2">
                        <label className="text-sm">{locale==='ar' ? 'السعر المقترح' : 'Proposed Price'}</label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          placeholder={locale==='ar' ? 'السعر' : 'Price'}
                          value={offerPrice}
                          onChange={(e)=> setOfferPrice(e.target.value)}
                        />
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm">{locale==='ar' ? 'المدة (أيام)' : 'Duration (days)'}</label>
                        <Input
                          type="number"
                          inputMode="numeric"
                          placeholder={locale==='ar' ? 'الأيام' : 'Days'}
                          value={offerDays}
                          onChange={(e)=>setOfferDays(e.target.value)}
                        />
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm">{locale==='ar' ? 'رسالة' : 'Message'}</label>
                        <Textarea
                          rows={4}
                          placeholder={locale==='ar' ? 'عرّف بنفسك وقدّم تفاصيل العرض' : 'Introduce yourself and provide details of your offer'}
                          value={offerMessage}
                          onChange={(e)=>setOfferMessage(e.target.value)}
                        />
                      </div>

                      <Button
                        className="w-full"
                        disabled={saving || !project || (hasSubmitted && !isEditing)}
                        onClick={() => {
                          if (!project) return;
                          const vP = Number(offerPrice || 0);
                          const vD = Number(offerDays || 0);
                          (async () => {
                            try {
                              setSaving(true);
                              const pid = String(project.id ?? project._id ?? '');
                              if (!pid) {
                                Swal.fire({ icon: 'error', title: locale==='ar' ? 'تعذر تحديد المشروع' : 'Project not identified' });
                                return;
                              }
                              const res = await createBid(pid, { price: vP, days: vD, message: offerMessage });

                              if (res.ok) {
                                setHasSubmitted(true);
                                try {
                                  const mb = await getMyBids();
                                  if (mb.ok && Array.isArray(mb.data)) {
                                    setMyProposal((mb.data as any[]).find(b=> String(b.projectId)===String(project.id ?? project._id)) || null);
                                  }
                                } catch {}
                                if (isEditing) setIsEditing(false);
                                Swal.fire({ icon: 'success', title: locale==='ar' ? 'تم إرسال العرض' : 'Proposal submitted', timer: 1600, showConfirmButton: false });
                              }
                            } finally {
                              setSaving(false);
                            }
                          })();
                        }}
                      >
                        <Send className="mr-2 h-4 w-4" /> {saving ? (locale==='ar' ? 'جارٍ الحفظ...' : 'Saving...') : (isEditing ? (locale==='ar' ? 'حفظ التعديلات' : 'Save Changes') : (locale==='ar' ? 'إرسال العرض' : 'Send Proposal'))}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      <Footer setCurrentPage={setCurrentPage as any} />
    </div>
  );
}