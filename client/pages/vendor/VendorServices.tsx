import { useEffect, useState, useRef, useCallback } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Eye } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import type { RouteContext } from "../../components/routerTypes";
import { listVendorServices, completeService } from "@/services/servicesCatalog";
import { useFirstLoadOverlay } from "../../hooks/useFirstLoadOverlay";

type Props = Partial<RouteContext>;

export default function VendorServices({ setCurrentPage, ...context }: Props) {
  const { locale } = useTranslation();
  const currency = locale === "ar" ? "ر.س" : "SAR";
  // Safe navigation fallback to avoid undefined setter issues
  const safeSetCurrentPage = setCurrentPage ?? (() => {});

  const [userServices, setUserServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  // Only show the global overlay once on the first load
  const firstLoadRef = useRef(true);
  const hideFirstOverlay = useFirstLoadOverlay(
    context,
    locale === 'ar' ? 'جاري تحميل خدماتك' : 'Loading your services',
    locale === 'ar' ? 'يرجى الانتظار' : 'Please wait'
  );

  const loadServices = useCallback(async () => {
    setFetchError(null);
    setLoading(true);
    try {
      const { ok, data, status } = await listVendorServices({ vendorId: 'me' }) as any;
      if (!ok) {
        setUserServices([]);
        setFetchError(status === 401 || status === 403 ? (locale==='ar' ? 'غير مصرح: يرجى تسجيل الدخول كتاجر' : 'Unauthorized: please login as Merchant') : (locale==='ar' ? 'فشل في جلب الخدمات' : 'Failed to fetch services'));
        return;
      }
      if (Array.isArray(data)) setUserServices(data as any[]);
      else setUserServices([]);
    } catch {
      setUserServices([]);
      setFetchError(locale==='ar' ? 'حدث خطأ أثناء الجلب' : 'An error occurred while fetching');
    } finally {
      setLoading(false);
      if (firstLoadRef.current) { hideFirstOverlay(); firstLoadRef.current = false; }
    }
  }, [hideFirstOverlay, locale]); // Include dependencies as indicated by ESLint

  useEffect(() => { 
    let mounted = true;
    const load = async () => {
      if (mounted) await loadServices();
    };
    load();
    return () => { mounted = false; };
  }, [loadServices]);


  const labelForServiceType = (id: string) => {
    const map: any = {
      plumber: { ar: "سباك", en: "Plumber" },
      electrician: { ar: "كهربائي", en: "Electrician" },
      carpenter: { ar: "نجار", en: "Carpenter" },
      painter: { ar: "نقاش", en: "Painter" },
      gypsum_installer: { ar: "فني تركيب جيبس بورد", en: "Gypsum Board Installer" },
      marble_installer: { ar: "فني تركيب رخام", en: "Marble Installer" },
    };
    return map[id]?.[locale === "ar" ? "ar" : "en"] || id;
  };

  // Generate a stable, unique key for each service card
  const keyForService = (s: any, idx: number) => {
    const candidate = s?.id ?? s?._id ?? s?.serviceId ?? s?.uuid ?? s?.slug;
    if (candidate !== undefined && candidate !== null && candidate !== "") return String(candidate);
    // Fallback uses some stable fields + index to avoid collisions
    const type = s?.technicianType || s?.requiredSkills || s?.type || "unknown";
    const start = s?.startDate || s?.createdAt || "";
    return `svc-${type}-${start}-${idx}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header currentPage="vendor-services" setCurrentPage={safeSetCurrentPage} {...context} />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{locale === 'ar' ? 'خدماتي' : 'My Services'}</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => safeSetCurrentPage('vendor-dashboard')}>
              {locale === 'ar' ? 'لوحة التاجر' : 'Vendor Dashboard'}
            </Button>
            <Button onClick={() => safeSetCurrentPage('add-service')}>
              {locale === 'ar' ? 'اطلب فني' : 'Request Technician'}
            </Button>
            <Button variant="secondary" onClick={() => safeSetCurrentPage('vendor-service-applicants')}>
              {locale === 'ar' ? 'عرض المتقدمين' : 'View Applicants'}
            </Button>
            <Button variant="outline" onClick={loadServices} disabled={loading}>
              {locale === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>
          </div>
        </div>

        {fetchError && (
          <Card className="mb-4">
            <CardContent className="p-4 text-sm text-red-600">{fetchError}</CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="p-6 text-muted-foreground">
              {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </CardContent>
          </Card>
        ) : userServices.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-muted-foreground">
              {locale === 'ar' ? 'لا توجد خدمات بعد.' : 'No services yet.'}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userServices.map((s:any, idx:number) => (
              <Card key={keyForService(s, idx)}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{labelForServiceType(s.technicianType || s.requiredSkills || s.type)}</CardTitle>
                    <div className="flex items-center gap-2">
                      {!!s.status && (
                        <Badge variant="secondary" className={`${String(s.status).toLowerCase()==='inprogress' ? 'bg-blue-100 text-blue-700' : String(s.status).toLowerCase()==='completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {locale==='ar' ? (String(s.status).toLowerCase()==='inprogress' ? 'قيد التنفيذ' : String(s.status).toLowerCase()==='completed' ? 'مكتملة' : 'مفتوحة') : (String(s.status).toLowerCase()==='inprogress' ? 'In Progress' : String(s.status).toLowerCase()==='completed' ? 'Completed' : 'Open')}
                        </Badge>
                      )}
                      <Badge className={!s.isApproved ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}>
                        {locale === 'ar' ? (!s.isApproved ? 'في انتظار الموافقة' : 'معتمد') : (!s.isApproved ? 'Pending' : 'Approved')}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="text-muted-foreground">
                    {locale === 'ar' ? 'اليومية' : 'Daily wage'}: {currency} {Number(s.dailyWage || 0).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                  </div>
                  <div className="text-muted-foreground">
                    {locale === 'ar' ? 'الأيام' : 'Days'}: {Number(s.days || 0)}
                  </div>
                  <div className="font-semibold">
                    {currency} {Number(s.total || 0).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                  </div>
                  {!!s.description && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</div>
                  )}
                  <div className="pt-2 flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Vendor should navigate to the public ServiceDetails page
                        try { window.localStorage.setItem('selected_service_id', String(s.id)); } catch {}
                        safeSetCurrentPage('service-details');
                      }}
                    >
                      {locale === 'ar' ? 'تفاصيل' : 'Details'}
                    </Button>
                    {(() => {
                      try {
                        const status = String(s.status || '').toLowerCase();
                        const endDateStr = s.endDate ? String(s.endDate) : '';
                        const end = endDateStr ? new Date(endDateStr) : null;
                        const now = new Date();
                        const canComplete = status === 'inprogress' && end && end <= now;
                        if (!canComplete) return null;
                        return (
                          <Button
                            onClick={async () => {
                              try {
                                await completeService(String(s.id));
                                await loadServices();
                              } catch {}
                            }}
                          >
                            {locale==='ar' ? 'تسليم' : 'Complete'}
                          </Button>
                        );
                      } catch { return null; }
                    })()}
                  </div>
                  {!s.isApproved && (
                    <div className="text-xs text-muted-foreground">
                      {locale === 'ar' ? 'هذه الخدمة بانتظار موافقة الأدمن قبل ظهورها للجمهور.' : 'This service is pending admin approval before it appears publicly.'}
                    </div>
                  )}
                  {/* Applicants section removed - dynamic only via backend if needed */}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer setCurrentPage={safeSetCurrentPage} />
    </div>
  );
}
