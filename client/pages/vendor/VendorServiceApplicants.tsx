import React, { useEffect, useMemo, useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import type { RouteContext } from "../../components/routerTypes";
import { useTranslation } from "../../hooks/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { listVendorServices } from "@/services/servicesCatalog";
import { createConversation, getConversationByKeys } from "@/services/chat";
import { listOffersForVendorMine, updateOfferStatus, type OfferDto } from "@/services/offers";
import Swal from "sweetalert2";
import { useFirstLoadOverlay } from "../../hooks/useFirstLoadOverlay";

interface Props extends Partial<RouteContext> {}

export default function VendorServiceApplicants({ setCurrentPage, ...context }: Props) {
  const { locale } = useTranslation();
  const isAr = locale === "ar";
  const currency = isAr ? "ر.س" : "SAR";
  const vendorId = (context as any)?.user?.id || null;
  const hideFirstOverlay = useFirstLoadOverlay(
    context,
    isAr ? 'جاري تحميل المتقدمين' : 'Loading applicants',
    isAr ? 'يرجى الانتظار' : 'Please wait'
  );

  const [services, setServices] = useState<any[]>([]);
  const [offers, setOffers] = useState<OfferDto[]>([]);
  const [selectedType, setSelectedType] = useState<string>(() => {
    try { return window?.localStorage?.getItem('vendor_applicants_filter_type') || 'all'; } catch { return 'all'; }
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Load vendor services for labels/filter
        const svc = await listVendorServices({ vendorId: 'me' });
        if (!cancelled) setServices(svc.ok && Array.isArray(svc.data) ? (svc.data as any[]) : []);
        // Load all offers for vendor services (single endpoint)
        const off = await listOffersForVendorMine();
        if (!cancelled) setOffers(off.ok && Array.isArray(off.data) ? (off.data as any[]) : []);
      } catch {
        if (!cancelled) { setServices([]); setOffers([]); }
      } finally {
        if (!cancelled) hideFirstOverlay();
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Build a user-friendly technician label without exposing raw ID
  const techLabel = (r: OfferDto, isAr: boolean) => {
    const anyR: any = r as any;
    const name: string | undefined = anyR.technicianName || anyR.technician || anyR.name;
    if (name && String(name).trim().length > 0) return name;
    return isAr ? 'فني' : 'Technician';
  };

  const labelForServiceType = (id?: string) => {
    const map: any = {
      plumber: { ar: "سباك", en: "Plumber" },
      electrician: { ar: "كهربائي", en: "Electrician" },
      carpenter: { ar: "نجار", en: "Carpenter" },
      painter: { ar: "نقاش", en: "Painter" },
      gypsum_installer: { ar: "فني تركيب جيبس بورد", en: "Gypsum Board Installer" },
      marble_installer: { ar: "فني تركيب رخام", en: "Marble Installer" },
    };
    if (!id) return isAr ? 'خدمة' : 'Service';
    return map[id]?.[isAr ? 'ar' : 'en'] || id;
  };

  // Build quick lookup: serviceId -> service
  const svcById = useMemo(() => {
    const m = new Map<string, any>();
    for (const s of services) { m.set(String(s.id), s); }
    return m;
  }, [services]);

  // Helpers to normalize a value into a consistent key (lowercase + underscores)
  const normTypeKey = (t: string) => String(t || '').trim().toLowerCase().replace(/\s+/g, '_');

  // Unique service types for toolbar by display label to avoid duplicates across ids/locales
  const uniqueTypes = useMemo(() => {
    const map = new Map<string, string>(); // key -> label
    for (const s of services) {
      const rawType = String(s.type || '').trim();
      if (!rawType) continue;
      const label = labelForServiceType(rawType); // resolve to human-readable label
      const key = normTypeKey(label);
      if (!map.has(key)) map.set(key, label);
    }
    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  }, [services, isAr]);

  // Filtered list by selected type
  const filteredOffers = useMemo(() => {
    if (selectedType === 'all') return offers;
    return offers.filter((o:any) => {
      const sid = String((o as any).serviceId || '');
      const svc = svcById.get(sid);
      if (!svc) return false;
      const label = labelForServiceType(String(svc.type || ''));
      return normTypeKey(label) === selectedType;
    });
  }, [offers, selectedType, svcById, isAr]);

  const updateStatus = async (reqId: string, status: 'accepted' | 'rejected') => {
    const confirmText = status === 'accepted' ? (isAr ? 'قبول هذا المتقدم؟' : 'Accept this applicant?') : (isAr ? 'رفض هذا المتقدم؟' : 'Reject this applicant?');
    const ok = await Swal.fire({ title: confirmText, icon: 'question', showCancelButton: true, confirmButtonText: isAr ? 'تأكيد' : 'Confirm', cancelButtonText: isAr ? 'إلغاء' : 'Cancel' });
    if (!ok.isConfirmed) return;
    try {
      const res = await updateOfferStatus(reqId, status);
      if (res.ok) {
        // Refresh all offers flat list
        try { const off = await listOffersForVendorMine(); setOffers(off.ok && Array.isArray(off.data) ? (off.data as any[]) : []); } catch {}
        Swal.fire({ icon: 'success', title: status==='accepted' ? (isAr ? 'تم القبول' : 'Accepted') : (isAr ? 'تم الرفض' : 'Rejected'), timer: 1200, showConfirmButton: false });
      }
    } catch {}
  };

  return (
    <div className="min-h-screen bg-background">
      <Header {...context} />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{isAr ? 'المتقدمون على الخدمات' : 'Service Applicants'}</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={()=> setCurrentPage && setCurrentPage('vendor-services')}>
              {isAr ? 'خدماتي' : 'My Services'}
            </Button>
            <Button variant="outline" onClick={()=> setCurrentPage && setCurrentPage('vendor-dashboard')}>
              {isAr ? 'لوحة التاجر' : 'Vendor Dashboard'}
            </Button>
          </div>
        </div>

        {/* Always show toolbar to keep filter persistent */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant={selectedType==='all' ? 'default' : 'outline'}
              onClick={()=> { setSelectedType('all'); try { localStorage.setItem('vendor_applicants_filter_type','all'); } catch {} }}
            >
              {isAr ? 'الكل' : 'All'}
            </Button>
            {uniqueTypes.map((t)=> (
              <Button
                key={t.key}
                variant={selectedType===t.key ? 'default' : 'outline'}
                onClick={()=> { setSelectedType(t.key); try { localStorage.setItem('vendor_applicants_filter_type', t.key); } catch {} }}
              >
                {t.label}
              </Button>
            ))}
            <div className="ms-auto">
              <Button variant="outline" onClick={async ()=> {
                try {
                  const off = await listOffersForVendorMine();
                  setOffers(off.ok && Array.isArray(off.data) ? (off.data as any[]) : []);
                } catch {}
              }}>{isAr ? 'تحديث' : 'Refresh'}</Button>
            </div>
          </div>
        
        {services.length === 0 && filteredOffers.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-muted-foreground">
              {isAr ? 'لا توجد خدمات لعرض المتقدمين عليها.' : 'You have no services to show applicants for.'}
            </CardContent>
          </Card>
        ) : filteredOffers.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-muted-foreground">
              {isAr ? 'لا يوجد متقدمون حالياً.' : 'No applicants yet.'}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Flat list of applicants */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{isAr ? 'كل المتقدمين' : 'All Applicants'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredOffers.map((r:OfferDto, idx: number) => {
                    const anyR: any = r as any;
                    const sid = String(anyR.serviceId || '');
                    const svc = services.find((s:any)=> String(s.id) === sid);
                    const name = techLabel(r, isAr);
                    const avatar = anyR.technicianAvatar || anyR.avatar || '';
                    const phone = anyR.technicianPhone || anyR.phoneNumber || anyR.phone || '';
                    const city = anyR.city || '';
                    const country = anyR.country || '';
                    const profession = anyR.profession || anyR.technicianType || '';
                    const rating = typeof anyR.rating === 'number' ? anyR.rating : undefined;
                    const reviews = typeof anyR.reviewCount === 'number' ? anyR.reviewCount : undefined;
                    const verified = typeof anyR.isVerified === 'boolean' ? anyR.isVerified : undefined;
                    const priceValue = Number((r as any).price ?? 0);
                    const daysValue = Number((r as any).days ?? 0);
                    const dailyRateValue = Number(anyR.technicianDailyRate ?? 0);
                    const hasPrice = Number.isFinite(priceValue) && priceValue > 0;
                    const hasDays = Number.isFinite(daysValue) && daysValue > 0;
                    const hasDailyRate = Number.isFinite(dailyRateValue) && dailyRateValue > 0;
                    return (
                      <div key={r.id || `${sid}-${idx}`} className="rounded border p-3 bg-muted/20">
                        <div className="text-xs font-semibold text-foreground mb-2">
                          {isAr ? 'الخدمة' : 'Service'}: {svc ? labelForServiceType(svc.type) : sid}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
                              {avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs text-primary">{(name||'').slice(0,1) || (isAr?'ف':'T')}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="truncate max-w-[180px]">{name}</span>
                              {verified !== undefined && (
                                <Badge variant="secondary" className={`text-[10px] ${verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {verified ? (isAr?'موثّق':'Verified') : (isAr?'غير موثّق':'Unverified')}
                                </Badge>
                              )}
                              {(r as any).status && (
                                <Badge variant="secondary" className={`text-[10px] ${(r as any).status==='accepted' ? 'bg-green-100 text-green-700' : (r as any).status==='rejected' ? 'bg-red-100 text-red-700' : ''}`}>
                                  {(r as any).status==='accepted' ? (isAr ? 'مقبول' : 'Accepted') : (r as any).status==='rejected' ? (isAr ? 'مرفوض' : 'Rejected') : (isAr ? 'قيد الانتظار' : 'Pending')}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right min-w-[160px]">
                            <div className="text-lg font-bold text-foreground">
                              {hasPrice
                                ? `${currency} ${priceValue.toLocaleString(isAr?'ar-EG':'en-US')}`
                                : (isAr ? 'السعر غير محدد' : 'Price not set')}
                            </div>
                            <div className="mt-1">
                              <Badge variant="secondary" className="text-[11px]">
                                {hasDays
                                  ? (isAr ? `${daysValue} يوم` : `${daysValue} days`)
                                  : (isAr ? 'غير محدد' : 'Not specified')}
                              </Badge>
                            </div>
                            {hasDailyRate && (
                              <div className="text-[11px] text-muted-foreground mt-2">
                                {isAr ? 'السعر اليومي:' : 'Daily Rate:'} {currency} {dailyRateValue.toLocaleString(isAr?'ar-EG':'en-US')}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Optional details grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-[11px] text-muted-foreground">
                          {profession && (
                            <div><span className="font-medium text-foreground">{isAr?'المهنة':'Profession'}: </span>{profession}</div>
                          )}
                          {(city || country) && (
                            <div><span className="font-medium text-foreground">{isAr?'المدينة/الدولة':'City/Country'}: </span>{[city,country].filter(Boolean).join(' / ')}</div>
                          )}
                          {phone && (
                            <div dir="ltr"><span className="font-medium text-foreground">{isAr?'الهاتف':'Phone'}: </span>{phone}</div>
                          )}
                          {(typeof rating !== 'undefined' || typeof reviews !== 'undefined') && (
                            <div><span className="font-medium text-foreground">{isAr?'التقييم':'Rating'}: </span>{typeof rating==='number'? rating.toFixed(1): '—'}{typeof reviews==='number'? ` (${reviews})`: ''}</div>
                          )}
                        </div>

                        {!!(r as any).message && (
                          <div className="text-xs text-muted-foreground mt-2">
                            <span className="font-medium text-foreground">{isAr ? 'رسالة المتقدم:' : 'Applicant message:'} </span>
                            {(r as any).message}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-[10px] text-muted-foreground">
                            {isAr ? 'تاريخ' : 'Date'}: {(r as any).createdAt ? new Date((r as any).createdAt).toLocaleString(isAr?'ar-EG':'en-US') : '-'}
                          </div>
                          <div className="flex gap-2">
                            {(r as any).status !== 'accepted' && (
                              <Button size="sm" onClick={()=> updateStatus((r as any).id, 'accepted')}>
                                {isAr ? 'قبول' : 'Accept'}
                              </Button>
                            )}
                            {(r as any).status !== 'rejected' && (
                              <Button size="sm" variant="ghost" className="text-red-600" onClick={()=> updateStatus((r as any).id, 'rejected')}>
                                {isAr ? 'رفض' : 'Reject'}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={async ()=> {
                                try {
                                  const tid = String((r as any).technicianId);
                                  const sid = String(anyR.serviceId || '');
                                  try { if (name) window.localStorage.setItem('chat_technician_name', String(name)); } catch {}
                                  const cr = await createConversation(sid, tid);
                                  const convId = (cr.ok && (cr.data as any)?.id) ? String((cr.data as any).id) : null;
                                  if (convId) {
                                    try { window.localStorage.setItem('chat_conversation_id', convId); } catch {}
                                    try { window.localStorage.setItem('chat_technician_id', tid); } catch {}
                                    try { window.localStorage.setItem('chat_service_id', sid); } catch {}
                                    setCurrentPage && setCurrentPage('vendor-chat');
                                  } else {
                                    try {
                                      const found = await getConversationByKeys(sid, tid);
                                      const id = (found.ok && (found.data as any)?.id) ? String((found.data as any).id) : null;
                                      if (id) {
                                        try { window.localStorage.setItem('chat_conversation_id', id); } catch {}
                                        try { window.localStorage.setItem('chat_technician_id', tid); } catch {}
                                        try { window.localStorage.setItem('chat_service_id', sid); } catch {}
                                        try { if (name) window.localStorage.setItem('chat_technician_name', String(name)); } catch {}
                                        setCurrentPage && setCurrentPage('vendor-chat');
                                      }
                                    } catch {}
                                  }
                                } catch {}
                              }}
                            >
                              {isAr ? 'مراسلة' : 'Message'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        </div>
      </div>
      <Footer setCurrentPage={setCurrentPage as any} />
    </div>
  );
}
