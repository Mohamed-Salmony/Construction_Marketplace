"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "../../components/Header";
import type { RouteContext } from "../../components/routerTypes";
import { useTranslation } from "../../hooks/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import Swal from "sweetalert2";
import { toastSuccess, toastError, toastInfo } from "../../utils/alerts";
import { listPublicServices } from "@/services/servicesCatalog";
import { createOffer, getTechnicianOffers } from "@/services/offers";

type Props = Partial<RouteContext>;

export default function TechnicianServices({ setCurrentPage, ...context }: Props) {
  const { locale } = useTranslation();
  const isAr = locale === "ar";
  const currency = isAr ? "ر.س" : "SAR";
  const technicianId = (context as any)?.user?.id || null;
  const isWorker = String((context as any)?.user?.role || '').toLowerCase() === 'worker';
  const isVerified = Boolean((context as any)?.user?.isVerified);
  const safeSetCurrentPage = setCurrentPage ?? (() => {});

  const [services, setServices] = useState<any[]>([]);
  const [myOffers, setMyOffers] = useState<any[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Proposal dialog state
  const [requestOpen, setRequestOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [offerPrice, setOfferPrice] = useState<string>("");
  const [offerDays, setOfferDays] = useState<string>("");
  const [offerMessage, setOfferMessage] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Load all approved/public services from backend
  useEffect(() => {
    let cancelled = false;
    setHydrated(true);
    (async () => {
      (context as any)?.showLoading?.(isAr ? 'جاري تحميل الخدمات...' : 'Loading services...');
      try {
        const { ok, data } = await listPublicServices();
        if (!cancelled && ok && Array.isArray(data)) setServices(data as any[]);
        else if (!cancelled) setServices([]);
      } catch { if (!cancelled) setServices([]); }
    })().finally(() => {
      (context as any)?.hideLoading?.();
    });
    return () => { cancelled = true; };
  }, [isAr]);

  // Inform unverified workers and block the page
  useEffect(() => {
    if (isWorker && !isVerified) {
      toastInfo(
        isAr
          ? 'حسابك كعامل قيد المراجعة. لا يمكنك استخدام صفحة الخدمات حتى تتم الموافقة. يرجى الانتظار من 24 إلى 48 ساعة.'
          : 'Your worker account is pending admin approval. You cannot use the services page until approved. Please wait 24 to 48 hours.',
        isAr
      );
    }
  }, [isWorker, isVerified, isAr]);

  // Load my offers to know what I already submitted
  useEffect(() => {
    let cancelled = false;
    (async () => {
      (context as any)?.showLoading?.(isAr ? 'جاري تحميل عروضك...' : 'Loading your offers...');
      try {
        if (!technicianId) { setMyOffers([]); return; }
        const { ok, data } = await getTechnicianOffers(String(technicianId));
        if (!cancelled && ok && Array.isArray(data)) setMyOffers(data as any[]);
        else if (!cancelled) setMyOffers([]);
      } catch { if (!cancelled) setMyOffers([]); }
    })().finally(() => {
      (context as any)?.hideLoading?.();
    });
    return () => { cancelled = true; };
  }, [isAr, technicianId]);

  // Build fast lookup for requests already submitted by this technician
  const submittedServices = useMemo(() => {
    if (!Array.isArray(myOffers)) return new Set<string>();
    return new Set<string>(
      myOffers
        .filter((o: any) => String(o.targetType).toLowerCase() === 'service' && o.serviceId != null)
        .map((o: any) => String(o.serviceId))
    );
  }, [myOffers]);

  const labelForServiceType = (t?: string) => {
    switch ((t || "").toLowerCase()) {
      case "plumber":
        return isAr ? "سباك" : "Plumber";
      case "electrician":
        return isAr ? "كهربائي" : "Electrician";
      case "carpenter":
        return isAr ? "نجار" : "Carpenter";
      case "painter":
        return isAr ? "دهان" : "Painter";
      case "gypsum":
        return isAr ? "جبس" : "Gypsum Installer";
      case "marble":
        return isAr ? "رخام" : "Marble Installer";
      default:
        return t || (isAr ? "خدمة" : "Service");
    }
  };

  if (isWorker && !isVerified) {
    return (
      <div className="min-h-screen bg-background">
        <Header currentPage="technician-services" setCurrentPage={safeSetCurrentPage} {...context} />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-6 text-muted-foreground text-sm">
              {isAr
                ? 'حسابك كعامل قيد المراجعة من الإدارة. لا يمكنك استخدام صفحة الخدمات حتى تتم الموافقة. يرجى الانتظار من 24 إلى 48 ساعة.'
                : 'Your worker account is pending admin approval. You cannot use the services page until approved. Please wait 24 to 48 hours.'}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header currentPage="technician-services" setCurrentPage={safeSetCurrentPage} {...context} />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{isAr ? "الخدمات" : "Services"}</h1>
        </div>

        {services.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-muted-foreground">
              {isAr ? "لا توجد خدمات متاحة حالياً." : "No services available right now."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((s: any) => (
              <Card key={s.id}>
                <CardHeader>
                  <CardTitle className="text-base">{labelForServiceType(s.type)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-muted-foreground">
                      {isAr ? "الأجر اليومي" : "Daily wage"}: {currency} {Number(s.dailyWage || 0).toLocaleString(isAr ? "ar-EG" : "en-US")}
                    </div>
                    <Badge variant="secondary">{s.days ? (isAr ? `${s.days} يوم` : `${s.days} days`) : (isAr ? "غير محدد" : "N/A")}</Badge>
                  </div>
                  {!!s.total && (
                    <div className="text-sm text-muted-foreground mb-2">
                      {isAr ? "الإجمالي المتوقع" : "Expected total"}: {currency} {Number(s.total).toLocaleString(isAr ? "ar-EG" : "en-US")}
                    </div>
                  )}
                  {!!s.description && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</div>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        try {
                          const url = new URL(window.location.href);
                          url.searchParams.set('serviceId', String(s.id));
                          url.searchParams.set('page', 'technician-service-details');
                          window.history.replaceState({}, '', url.toString());
                        } catch {}
                        try { window.localStorage.setItem('selected_service_id', String(s.id)); } catch {}
                        safeSetCurrentPage('technician-service-details');
                      }}
                    >
                      {isAr ? 'تفاصيل' : 'Details'}
                    </Button>
                    <Button
                      disabled={submittedServices.has(String(s.id))}
                      onClick={() => {
                        if (submittedServices.has(String(s.id))) { toastInfo(isAr ? "لقد قدّمت طلباً لهذه الخدمة مسبقاً." : "You have already submitted a request for this service.", isAr); return; }
                        setSelectedService(s);
                        setOfferPrice("");
                        setOfferDays("");
                        setOfferMessage("");
                        setRequestOpen(true);
                      }}
                    >
                      {submittedServices.has(String(s.id)) ? (isAr ? "تم الإرسال" : "Submitted") : (isAr ? "تقديم طلب" : "Request Service")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Request Dialog */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>
              {isAr ? "تقديم طلب للخدمة" : "Submit Request for Service"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>{isAr ? 'السعر المقترح' : 'Proposed Price'}</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                value={offerPrice}
                onChange={(e)=> setOfferPrice(e.target.value)}
                min={Number((selectedService?.total ?? selectedService?.dailyWage) || 0)}
                max={Number((((selectedService?.total ?? selectedService?.dailyWage) || 0) * 2))}
                placeholder={(() => {
                  const base = Number((selectedService?.total ?? selectedService?.dailyWage) || 0);
                  const min = base;
                  const max = base * 2;
                  const numLocale = isAr ? 'ar-EG' : 'en-US';
                  return isAr
                    ? `الحد الأدنى ${Number(min).toLocaleString(numLocale)} والحد الأقصى ${Number(max).toLocaleString(numLocale)}`
                    : `Min ${Number(min).toLocaleString(numLocale)} • Max ${Number(max).toLocaleString(numLocale)}`;
                })()}
              />
              {(() => {
                const base = Number((selectedService?.total ?? selectedService?.dailyWage) || 0);
                const min = base;
                const max = base * 2;
                const v = Number(offerPrice);
                const invalid = offerPrice !== '' && (!isFinite(v) || v < min || v > max);
                if (!invalid) return null;
                return (
                  <div className="text-xs text-red-600">
                    {isAr
                      ? `السعر يجب أن يكون بين ${currency} ${min.toLocaleString('ar-EG')} و ${currency} ${max.toLocaleString('ar-EG')}`
                      : `Price must be between ${currency} ${min.toLocaleString('en-US')} and ${currency} ${max.toLocaleString('en-US')}`}
                  </div>
                );
              })()}
            </div>
            <div className="grid gap-2">
              <Label>{isAr ? 'المدة (أيام)' : 'Duration (days)'}</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={offerDays}
                onChange={(e)=> setOfferDays(e.target.value)}
                min={1}
                max={Number(selectedService?.days || undefined)}
                placeholder={(() => {
                  const maxDays = Number(selectedService?.days || 0);
                  return maxDays > 0
                    ? (isAr ? `بين 1 و ${maxDays}` : `Between 1 and ${maxDays}`)
                    : (isAr ? 'بحد أدنى 1' : 'Minimum 1');
                })()}
              />
              {(() => {
                const maxDays = Number(selectedService?.days || Infinity);
                const v = Number(offerDays);
                const invalid = offerDays !== '' && (!Number.isFinite(v) || v < 1 || (Number.isFinite(maxDays) && v > maxDays));
                if (!invalid) return null;
                return (
                  <div className="text-xs text-red-600">
                    {Number.isFinite(maxDays)
                      ? (isAr ? `عدد الأيام يجب أن يكون بين 1 و ${maxDays}` : `Days must be between 1 and ${maxDays}`)
                      : (isAr ? 'عدد الأيام يجب ألا يقل عن 1' : 'Days must be at least 1')}
                  </div>
                );
              })()}
            </div>
            <div className="grid gap-2">
              <Label>{isAr ? 'رسالة' : 'Message'}</Label>
              <Input value={offerMessage} onChange={(e)=> setOfferMessage(e.target.value)} placeholder={isAr ? 'أدخل رسالة قصيرة' : 'Enter a short message'} />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full"
              disabled={(() => {
                if (saving || !selectedService) return true;
                const base = Number((selectedService?.total ?? selectedService?.dailyWage) || 0);
                const minP = base, maxP = base * 2;
                const vP = Number(offerPrice);
                const maxD = Number(selectedService?.days || Infinity);
                const vD = Number(offerDays);
                const validP = offerPrice !== '' && isFinite(vP) && vP >= minP && vP <= maxP;
                const validD = offerDays !== '' && Number.isFinite(vD) && vD >= 1 && (!Number.isFinite(maxD) || vD <= maxD);
                return !(validP && validD);
              })()}
              onClick={() => {
                if (!selectedService) return;
                if (!technicianId) { toastInfo(isAr ? 'الرجاء تسجيل الدخول كفني لتقديم الطلب.' : 'Please log in as a technician to submit requests.', isAr); return; }
                // Validate ranges strictly (no clamping)
                const basePrice = Number((selectedService?.total ?? selectedService?.dailyWage) || 0);
                const minPrice = basePrice;
                const maxPrice = basePrice * 2;
                const priceNum = Number(offerPrice);
                const daysNum = Number(offerDays);
                const numLocale = isAr ? 'ar-EG' : 'en-US';
                if (!isFinite(priceNum) || priceNum < minPrice || priceNum > maxPrice) { toastError(isAr
                      ? `يجب أن يكون السعر بين ${currency} ${minPrice.toLocaleString(numLocale)} و ${currency} ${maxPrice.toLocaleString(numLocale)}`
                      : `Price must be between ${currency} ${minPrice.toLocaleString(numLocale)} and ${currency} ${maxPrice.toLocaleString(numLocale)}`, isAr); return; }
                const maxDays = Number(selectedService?.days || Infinity);
                if (!Number.isFinite(daysNum) || daysNum < 1 || (Number.isFinite(maxDays) && daysNum > maxDays)) { toastError(Number.isFinite(maxDays)
                      ? (isAr ? `عدد الأيام يجب أن يكون بين 1 و ${maxDays}` : `Days must be between 1 and ${maxDays}`)
                      : (isAr ? 'عدد الأيام يجب ألا يقل عن 1' : 'Days must be at least 1'), isAr); return; }
                (async () => {
                  try {
                    setSaving(true);
                    const sid = String(selectedService?.id ?? '');
                    const isValidObjectId = /^[a-f0-9]{24}$/i.test(sid);
                    if (!isValidObjectId) {
                      setSaving(false);
                      try { alert(locale==='ar' ? 'معرّف الخدمة غير صالح' : 'Invalid service id'); } catch {}
                      return;
                    }
                    const res = await createOffer({ targetType: 'service', serviceId: sid, price: priceNum, days: daysNum, message: offerMessage || '' });
                    if (res.ok) {
                      // refresh my offers to update UI state
                      try {
                        if (technicianId) {
                          const { ok, data } = await getTechnicianOffers(String(technicianId));
                          if (ok && Array.isArray(data)) setMyOffers(data as any[]);
                        }
                      } catch {}
                      setRequestOpen(false);
                      toastSuccess(isAr ? 'تم إرسال الطلب' : 'Request submitted', isAr);
                    }
                  } finally {
                    setSaving(false);
                  }
                })();
              }}
            >
              {saving ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'إرسال الطلب' : 'Send Request')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
