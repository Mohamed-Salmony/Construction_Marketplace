import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Eye, Send } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { getOpenProjects, getMyBids, createBid } from "@/services/projects";
import { getCommissionRates } from "@/services/commissions";
import { getToken, getProfile } from "@/services/auth";
import type { RouteContext } from "../../components/routerTypes";
import { useFirstLoadOverlay } from "../../hooks/useFirstLoadOverlay";

interface Props extends Partial<RouteContext> {}

export default function VendorProjects({ setCurrentPage, ...context }: Props) {
  const { locale } = useTranslation();
  const currency = locale === "ar" ? "ر.س" : "SAR";
  const hideFirstOverlay = useFirstLoadOverlay(
    context,
    locale === 'ar' ? 'جاري تحميل المشاريع' : 'Loading projects',
    locale === 'ar' ? 'يرجى الانتظار' : 'Please wait'
  );

  const [userProjects, setUserProjects] = useState<any[]>([]);
  const [myBids, setMyBids] = useState<any[]>([]);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [offerPrice, setOfferPrice] = useState<string>("");
  const [offerDays, setOfferDays] = useState<string>("");
  const [offerMessage, setOfferMessage] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [projCommissionPct, setProjCommissionPct] = useState<number>(0);
  const [ratesCurrency, setRatesCurrency] = useState<string>('SAR');
  const vendorId = (context as any)?.user?.id;
  const uiRole = (context as any)?.user?.role;
  const isVendor = String(uiRole || '').toLowerCase() === 'vendor';

  // Build a fast lookup for already-submitted project IDs by this vendor
  const submittedProjects = useMemo(() => {
    if (!Array.isArray(myBids)) return new Set<string>();
    return new Set<string>(myBids.map((b:any)=> String(b.projectId)));
  }, [myBids]);

  useEffect(() => {
    (async () => {
      try {
        const { ok, data } = await getOpenProjects();
        if (ok && Array.isArray(data)) {
          const approved = (data as any[]).filter((p:any) => {
            const s = (p.status ?? p.Status);
            if (typeof s === 'string') {
              const ss = s.toLowerCase();
              return ss === 'published' || ss === 'inbidding' || ss === 'in_bidding' || ss === 'in-bidding';
            }
            if (typeof s === 'number') {
              // ProjectStatus: Draft=0, Published=1, InBidding=2, ...
              return s === 1 || s === 2;
            }
            return true; // if status not provided, trust backend open endpoint
          });
          // Normalize common casing differences to ensure UI shows real values
          const normalized = approved.map((p:any) => {
            // Try extracting values from various possible keys
            const width = p.width ?? p.Width ?? p.requiredWidth ?? p.RequiredWidth ?? p.RequiredLength; // some backends store single length
            const height = p.height ?? p.Height ?? p.requiredHeight ?? p.RequiredHeight;
            const quantity = p.quantity ?? p.Quantity ?? p.requiredQuantity ?? p.RequiredQuantity ?? p.Qty ?? p.qty;
            // Total fallback: prefer total, else BudgetMax, else BudgetMin
            const total = p.total ?? p.Total ?? p.budgetMax ?? p.BudgetMax ?? p.budgetMin ?? p.BudgetMin;
            const days = p.days ?? p.Days;
            const material = p.material ?? p.Material;
            const type = p.type ?? p.ptype ?? p.Type ?? p.PType ?? p.productType ?? p.ProductType;
            const description = p.description ?? p.Description;
            const customerName = p.customerName ?? p.CustomerName;
            const currency = p.currency ?? p.Currency;
            return {
              ...p,
              id: p.id ?? p._id, // ensure id exists
              type,
              material,
              width,
              height,
              quantity,
              days,
              total,
              description,
              customerName,
              currency,
            };
          });
          setUserProjects(normalized);
        } else setUserProjects([]);
      } catch { setUserProjects([]); }
      finally { try { hideFirstOverlay(); } catch {} }
    })();
  }, [hideFirstOverlay]);

  // Load commission rates for projects (merchants)
  useEffect(() => {
    (async () => {
      try {
        const { ok, data } = await getCommissionRates();
        if (ok && (data as any)?.rates) {
          setProjCommissionPct(Number((data as any).rates.projectsMerchants || 0));
          setRatesCurrency(String((data as any).rates.currency || 'SAR'));
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // Avoid 401 spam: only fetch if we have a token and vendor role
        const token = getToken?.() ?? null;
        if (!token || !isVendor) { setMyBids([]); return; }
        const { ok, data, status } = await getMyBids();
        if (ok && Array.isArray(data)) setMyBids(data as any[]);
        else {
          // If unauthorized for any reason, clear bids silently
          if (status === 401 || status === 403) { setMyBids([]); return; }
          setMyBids([]);
        }
      } catch { setMyBids([]); }
    })();
  }, [vendorId, isVendor]);

  // Lightweight diagnostic: verify token roles via /api/Auth/profile
  useEffect(() => {
    (async () => {
      try {
        const token = getToken?.() ?? null;
        if (!token) return;
        const { ok, data, status, error } = await getProfile();
        // eslint-disable-next-line no-console
        console.log('[diag] profile status:', status, 'ok:', ok, 'data:', data, 'error:', error);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log('[diag] profile error', e);
      }
    })();
  }, []);

  const labelForProductType = (id: string) => {
    const map: any = {
      door: { ar: "باب", en: "Door" },
      window: { ar: "شباك", en: "Window" },
      railing: { ar: "دربزين", en: "Railing" },
    };
    return map[id]?.[locale === "ar" ? "ar" : "en"] || id;
  };
  const labelForMaterial = (id: string) => {
    const map: any = {
      aluminum: { ar: "ألمنيوم", en: "Aluminum" },
      steel: { ar: "صاج", en: "Steel" },
      laser: { ar: "ليزر", en: "Laser-cut" },
      glass: { ar: "سكريت", en: "Glass (Securit)" },
    };
    return map[id]?.[locale === "ar" ? "ar" : "en"] || id;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header {...context} />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{locale === 'ar' ? 'كل المشاريع' : 'All Projects'}</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCurrentPage && setCurrentPage('vendor-dashboard')}>
              {locale === 'ar' ? 'لوحة التاجر' : 'Vendor Dashboard'}
            </Button>
         
          </div>
        </div>

        {userProjects.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-muted-foreground">
              {locale === 'ar' ? 'لا توجد مشاريع بعد.' : 'No projects yet.'}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userProjects.map((p:any) => (
              <Card key={p.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {(p.title || p.Title) ? (p.title || p.Title) : labelForProductType(p.ptype || p.type)}
                    {p.material ? ` • ${labelForMaterial(p.material)}` : ''}
                  </CardTitle>
                  {!!(p.customerName) && (
                    <div className="text-xs text-muted-foreground">
                      {locale === 'ar' ? 'صاحب المشروع: ' : 'Owner: '}{p.customerName}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {(p.width || p.height) && (
                    <div className="text-muted-foreground">
                      {locale === 'ar' ? 'الأبعاد' : 'Dimensions'}: {p.width ? Number(p.width) : 0}×{p.height ? Number(p.height) : 0}
                    </div>
                  )}
                  {p.quantity != null && (
                    <div className="text-muted-foreground">
                      {locale === 'ar' ? 'الكمية' : 'Quantity'}: {Number(p.quantity)}
                    </div>
                  )}
                  {p.total != null && (
                    <div className="font-semibold">
                      {(p.currency || currency)} {Number(p.total).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                    </div>
                  )}
                  {!!p.description && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</div>
                  )}
                  <div className="pt-2 grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        try {
                          window.localStorage.setItem('selected_vendor_project_id', String(p.id ?? p._id ?? ''));
                        } catch {}
                        setCurrentPage && setCurrentPage('vendor-project-details');
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      {locale === 'ar' ? 'تفاصيل' : 'Details'}
                    </Button>
                    <Button
                      size="sm"
                      disabled={submittedProjects.has(String(p.id))}
                      onClick={() => {
                        if (submittedProjects.has(String(p.id))) {
                          Swal.fire({ icon: 'info', title: locale==='ar' ? 'تم الإرسال مسبقاً' : 'Already Submitted', text: locale==='ar' ? 'لا يمكنك إرسال عرض آخر لهذا المشروع.' : 'You have already submitted a proposal for this project.' });
                          return;
                        }
                        setSelectedProject(p);
                        setOfferPrice("");
                        setOfferDays("");
                        setOfferMessage("");
                        setProposalOpen(true);
                      }}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {submittedProjects.has(String(p.id)) ? (locale==='ar' ? 'تم الإرسال' : 'Submitted') : (locale === 'ar' ? 'تقديم عرض' : 'Submit Proposal')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {/* Proposal Dialog */}
      <Dialog open={proposalOpen} onOpenChange={setProposalOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>
              {locale === 'ar' ? 'تقديم عرض للمشروع' : 'Submit Proposal for Project'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="price">{locale === 'ar' ? 'السعر المقترح' : 'Proposed Price'}</Label>
              <Input
                id="price"
                type="number"
                inputMode="decimal"
                min={Number(selectedProject?.total || 0)}
                max={Number((selectedProject?.total || 0) * 2)}
                placeholder={(() => {
                  const base = Number(selectedProject?.total || 0);
                  const min = base;
                  const max = base * 2;
                  const numLocale = locale === 'ar' ? 'ar-EG' : 'en-US';
                  return locale === 'ar'
                    ? `الحد الأدنى ${currency} ${Number(min).toLocaleString(numLocale)} والحد الأقصى ${currency} ${Number(max).toLocaleString(numLocale)}`
                    : `Min ${currency} ${Number(min).toLocaleString(numLocale)} • Max ${currency} ${Number(max).toLocaleString(numLocale)}`;
                })()}
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
              />
              {/* Commission preview for projects */}
              {(() => {
                const v = Number(offerPrice || 0);
                if (!isFinite(v) || v <= 0) return null;
                const comm = Math.round(v * (projCommissionPct / 100));
                const net = Math.max(v - comm, 0);
                const numLocale = locale === 'ar' ? 'ar-EG' : 'en-US';
                return (
                  <div className="mt-1 text-xs text-muted-foreground">
                    <div>
                      {locale==='ar' ? 'عمولة المشاريع على التاجر' : 'Project commission for merchants'} {projCommissionPct}%: {comm.toLocaleString(numLocale)} {ratesCurrency==='SAR'? (locale==='ar'?'ر.س':'SAR') : ratesCurrency}
                    </div>
                    <div>
                      {locale==='ar' ? 'الصافي بعد الخصم' : 'Net after commission'}: {net.toLocaleString(numLocale)} {ratesCurrency==='SAR'? (locale==='ar'?'ر.س':'SAR') : ratesCurrency}
                    </div>
                  </div>
                );
              })()}
              {(() => {
                const base = Number(selectedProject?.total || 0);
                const min = base;
                const max = base * 2;
                const v = Number(offerPrice);
                const invalid = offerPrice !== '' && (!isFinite(v) || v < min || v > max);
                if (!invalid) return null;
                return (
                  <div className="text-xs text-red-600">
                    {locale === 'ar'
                      ? `السعر يجب أن يكون بين ${currency} ${min.toLocaleString('ar-EG')} و ${currency} ${max.toLocaleString('ar-EG')}`
                      : `Price must be between ${currency} ${min.toLocaleString('en-US')} and ${currency} ${max.toLocaleString('en-US')}`}
                  </div>
                );
              })()}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="days">{locale === 'ar' ? 'المدة (أيام)' : 'Duration (days)'}</Label>
              <Input
                id="days"
                type="number"
                inputMode="numeric"
                min={1}
                max={Number(selectedProject?.days || undefined)}
                placeholder={(() => {
                  const maxDays = Number(selectedProject?.days || 0);
                  return maxDays > 0
                    ? (locale === 'ar' ? `بين 1 و ${maxDays}` : `Between 1 and ${maxDays}`)
                    : (locale === 'ar' ? 'بحد أدنى 1' : 'Minimum 1');
                })()}
                value={offerDays}
                onChange={(e) => setOfferDays(e.target.value)}
              />
              {(() => {
                const maxDays = Number(selectedProject?.days || Infinity);
                const v = Number(offerDays);
                const invalid = offerDays !== '' && (!Number.isFinite(v) || v < 1 || (Number.isFinite(maxDays) && v > maxDays));
                if (!invalid) return null;
                return (
                  <div className="text-xs text-red-600">
                    {Number.isFinite(maxDays)
                      ? (locale === 'ar' ? `عدد الأيام يجب أن يكون بين 1 و ${maxDays}` : `Days must be between 1 and ${maxDays}`)
                      : (locale === 'ar' ? 'عدد الأيام يجب ألا يقل عن 1' : 'Days must be at least 1')}
                  </div>
                );
              })()}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">{locale === 'ar' ? 'رسالة' : 'Message'}</Label>
              <Textarea
                id="message"
                rows={4}
                placeholder={locale === 'ar' ? 'عرّف بنفسك وقدّم تفاصيل العرض' : 'Introduce yourself and provide details of your offer'}
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={(() => {
                if (saving || !selectedProject || !offerPrice || !offerDays || submittedProjects.has(String(selectedProject?.id || ''))) return true;
                const vP = Number(offerPrice);
                const vD = Number(offerDays);
                const minP = Number(selectedProject?.total || 0);
                const maxP = minP * 2;
                const validP = offerPrice !== '' && isFinite(vP) && vP >= minP && vP <= maxP;
                const maxD = Number(selectedProject?.days || Infinity);
                const validD = offerDays !== '' && Number.isFinite(vD) && vD >= 1 && (!Number.isFinite(maxD) || vD <= maxD);
                return !(validP && validD);
              })()}
              onClick={() => {
                if (!selectedProject) return;
                if (submittedProjects.has(String(selectedProject.id))) {
                  Swal.fire({ icon: 'info', title: locale==='ar' ? 'تم الإرسال مسبقاً' : 'Already Submitted', text: locale==='ar' ? 'لا يمكنك إرسال عرض آخر لهذا المشروع.' : 'You have already submitted a proposal for this project.' });
                  return;
                }
                (async () => {
                  try {
                    setSaving(true);
                    const pid = String(selectedProject.id ?? selectedProject._id ?? '');
                    if (!pid) {
                      Swal.fire({ icon: 'error', title: locale==='ar' ? 'تعذر تحديد المشروع' : 'Project not identified' });
                      return;
                    }
                    const res = await createBid(pid, { price: Number(offerPrice), days: Number(offerDays), message: offerMessage });
                    if (res.ok) {
                      try { const { ok, data } = await getMyBids(); if (ok && Array.isArray(data)) setMyBids(data as any[]); } catch {}
                      setProposalOpen(false);
                      Swal.fire({ icon: 'success', title: locale==='ar' ? 'تم إرسال العرض' : 'Proposal submitted', timer: 1600, showConfirmButton: false });
                    }
                  } finally { setSaving(false); }
                })();
              }}
            >
              {saving ? (locale === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : (locale === 'ar' ? 'إرسال العرض' : 'Send Proposal')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Footer setCurrentPage={setCurrentPage as any} />
    </div>
  );
}
