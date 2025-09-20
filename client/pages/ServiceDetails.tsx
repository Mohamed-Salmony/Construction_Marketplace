import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { useTranslation } from "../hooks/useTranslation";
import type { RouteContext } from "../components/routerTypes";
import { getServiceById, deleteService as apiDeleteService } from "@/services/servicesCatalog";
import { Info, Package, Calendar, ClipboardList, Check, X } from "lucide-react";
import { listOffersForService, updateOfferStatus, type OfferDto } from "@/services/offers";
import { getConversationByKeys, createConversation } from "@/services/chat";

interface ServiceDetailsProps extends Partial<RouteContext> {}

type Service = {
  id: string;
  type: string;
  dailyWage: number;
  days: number;
  total: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
};

const SERVICE_TYPES = [
  { id: 'plumber', ar: 'سباك', en: 'Plumber' },
  { id: 'electrician', ar: 'كهربائي', en: 'Electrician' },
  { id: 'carpenter', ar: 'نجار', en: 'Carpenter' },
  { id: 'painter', ar: 'نقاش', en: 'Painter' },
  { id: 'gypsum_installer', ar: 'فني تركيب جيبس بورد', en: 'Gypsum Board Installer' },
  { id: 'marble_installer', ar: 'فني تركيب رخام', en: 'Marble Installer' },
];

export default function ServiceDetails({ setCurrentPage, ...context }: ServiceDetailsProps) {
  const { locale } = useTranslation();
  const currency = locale === 'ar' ? 'ر.س' : 'SAR';
  const numLocale = locale === 'ar' ? 'ar-EG' : 'en-US';
  const [service, setService] = useState<Service | null>(null);
  const [proposals, setProposals] = useState<OfferDto[]>([]);
  const usersById = useMemo(() => ({} as Record<string,string>), []);
  const technicianId = String((context as any)?.user?.id || '');

  // Load selected service by id: backend first, then fallback to localStorage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (typeof window === 'undefined') return;
        // Prefer serviceId from URL param if present
        let id: string | null = null;
        try {
          const url = new URL(window.location.href);
          const qid = url.searchParams.get('serviceId');
          if (qid) id = qid;
        } catch {}
        if (!id) id = window.localStorage.getItem('selected_service_id');
        if (!id) {
          // No id anywhere -> redirect back
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('serviceId');
            url.searchParams.set('page', 'technician-services');
            window.history.replaceState({}, '', url.toString());
          } catch {}
          setCurrentPage && setCurrentPage('technician-services');
          return;
        }
        const validObjectId = /^[a-f0-9]{24}$/i.test(String(id));
        if (!validObjectId) {
          // Invalid id -> redirect back
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('serviceId');
            url.searchParams.set('page', 'technician-services');
            window.history.replaceState({}, '', url.toString());
          } catch {}
          setCurrentPage && setCurrentPage('technician-services');
          return;
        }
        // Try backend
        try {
          if (validObjectId) {
            const { ok, data } = await getServiceById(id);
            if (!cancelled && ok && data) {
              setService(data as any);
            }
          }
        } catch {}
        // Fallback to local list if still null
        if (!cancelled && !service) {
          const raw = window.localStorage.getItem('user_services');
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const found = list.find((s: any) => String(s.id) === String(id));
              if (found) setService(found as Service);
            }
          }
        }
        // Load technician offers (proposals) for this service from backend if we have a service id
        try {
          const sid = id ?? ((service as any)?.id ? String((service as any).id) : null);
          if (sid != null && /^[a-f0-9]{24}$/i.test(String(sid))) {
            const r = await listOffersForService(String(sid));
            if (!cancelled && r.ok && Array.isArray(r.data)) setProposals(r.data as OfferDto[]);
          }
        } catch {}
      } catch {}
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const typeLabel = useMemo(() => {
    if (!service) return '';
    const key = (service as any).technicianType || (service as any).requiredSkills || service.type;
    const item = SERVICE_TYPES.find(s => s.id === key);
    return item ? (locale === 'ar' ? item.ar : item.en) : key;
  }, [service, locale]);

  const deleteService = async () => {
    try {
      if (!service) return;
      // Try backend deletion first
      try { await apiDeleteService(service.id as any); } catch {}
      // Fallback: remove from local storage
      const raw = window.localStorage.getItem('user_services');
      const list = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list)) {
        const next = list.filter((s: any) => String(s.id) !== String(service.id));
        window.localStorage.setItem('user_services', JSON.stringify(next));
      }
    } catch {}
    setCurrentPage && setCurrentPage('projects');
  };

  if (!service) {
    return (
      <div className="min-h-screen bg-background" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <Header currentPage="projects" setCurrentPage={setCurrentPage as any} {...context} />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Info className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">{locale === 'ar' ? 'لا توجد تفاصيل متاحة لهذه الخدمة.' : 'No details available for this service.'}</p>
              <div className="pt-1">
                <Button onClick={() => setCurrentPage && setCurrentPage('projects')} className="inline-flex items-center gap-1">
                  {locale === 'ar' ? 'رجوع' : 'Back'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer setCurrentPage={setCurrentPage as any} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <Header currentPage="projects" setCurrentPage={setCurrentPage as any} {...context} />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main details */}
          <Card className="lg:col-span-2 overflow-hidden shadow-sm">
            <div className="p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="w-6 h-6 text-primary" />
                  <h1 className="text-2xl font-bold">{locale === 'ar' ? 'تفاصيل الخدمة' : 'Service Details'}</h1>
                </div>
              </div>
              {/* Quick summary chips */}
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="outline" className="rounded-full text-xs">{typeLabel}</Badge>
                {Number(service.days) > 0 && (
                  <Badge variant="outline" className="rounded-full text-xs">{locale==='ar' ? `الأيام: ${service.days}` : `Days: ${service.days}`}</Badge>
                )}
                <Badge variant="outline" className="rounded-full text-xs">{locale==='ar' ? `اليومية: ${currency} ${Number(service.dailyWage||0).toLocaleString(numLocale)}` : `Daily: ${currency} ${Number(service.dailyWage||0).toLocaleString(numLocale)}`}</Badge>
                <Badge variant="outline" className="rounded-full text-xs">{locale==='ar' ? `الإجمالي: ${currency} ${Number(service.total||0).toLocaleString(numLocale)}` : `Total: ${currency} ${Number(service.total||0).toLocaleString(numLocale)}`}</Badge>
              </div>
            </div>
            <CardContent className="p-6 space-y-6">
              {/* Info grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border p-4 bg-background shadow-sm">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" /> {locale==='ar' ? 'نوع الفني' : 'Technician Type'}
                  </div>
                  <div className="mt-1 font-medium">{typeLabel}</div>
                </div>
                <div className="rounded-lg border p-4 bg-background shadow-sm">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" /> {locale==='ar' ? 'اليومية' : 'Daily Wage'}
                  </div>
                  <div className="mt-1 font-medium">{currency} {Number(service.dailyWage || 0).toLocaleString(numLocale)}</div>
                </div>
                <div className="rounded-lg border p-4 bg-background shadow-sm">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> {locale==='ar' ? 'الأيام' : 'Days'}
                  </div>
                  <div className="mt-1 font-medium">{Number(service.days || 0)}</div>
                </div>
                <div className="rounded-lg border p-4 bg-background shadow-sm">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" /> {locale==='ar' ? 'الإجمالي' : 'Total'}
                  </div>
                  <div className="mt-1 font-semibold text-primary">{currency} {Number(service.total || 0).toLocaleString(numLocale)}</div>
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">{locale === 'ar' ? 'الوصف' : 'Description'}</div>
                {service.description ? (
                  <div className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 border rounded-md p-3">{service.description}</div>
                ) : (
                  <div className="text-sm text-muted-foreground">{locale === 'ar' ? 'لا يوجد وصف مضاف.' : 'No description provided.'}</div>
                )}
                <div className="text-xs text-muted-foreground">
                  {service.createdAt ? (locale === 'ar' ? `أُنشئت: ${new Date(service.createdAt).toLocaleString('ar-EG')}` : `Created: ${new Date(service.createdAt).toLocaleString('en-US')}`) : null}
                  {service.updatedAt ? (locale === 'ar' ? ` • آخر تحديث: ${new Date(service.updatedAt).toLocaleString('ar-EG')}` : ` • Updated: ${new Date(service.updatedAt).toLocaleString('en-US')}`) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sidebar: proposals */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{locale === 'ar' ? 'عروض مقدّمة' : 'Submitted Proposals'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <button
                    className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm"
                    onClick={async ()=>{
                      try {
                        const sid = (service as any)?.id ? String((service as any).id) : (typeof window!=='undefined' ? String(window.localStorage.getItem('selected_service_id')||'') : '');
                        if (!sid || !/^[a-f0-9]{24}$/i.test(sid)) { alert(locale==='ar' ? 'معرّف الخدمة غير صالح' : 'Invalid service id'); return; }
                        if (!technicianId) { alert(locale==='ar' ? 'الرجاء تسجيل الدخول كفني' : 'Please login as a technician'); return; }
                        // Try find conversation by keys, else create
                        let convId: string | null = null;
                        try {
                          const found = await getConversationByKeys(sid, technicianId);
                          if (found.ok && (found.data as any)?.id) convId = String((found.data as any).id);
                        } catch {}
                        if (!convId) {
                          const cr = await createConversation(sid);
                          if (cr.ok && (cr.data as any)?.id) convId = String((cr.data as any).id);
                        }
                        if (convId) {
                          try { window.localStorage.setItem('chat_conversation_id', convId); } catch {}
                          try { window.localStorage.setItem('chat_service_id', sid); } catch {}
                          try { window.localStorage.setItem('chat_technician_id', technicianId); } catch {}
                          setCurrentPage && setCurrentPage('technician-chat');
                        }
                      } catch {}
                    }}
                  >
                    {locale==='ar' ? 'مراسلة التاجر' : 'Message Vendor'}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{locale === 'ar' ? 'عدد العروض' : 'Total'}</span>
                  <Badge variant="outline">{proposals.length}</Badge>
                </div>
                {proposals.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{locale === 'ar' ? 'لا توجد عروض حتى الآن.' : 'No proposals yet.'}</div>
                ) : (
                  <div className="space-y-3">
                    {proposals.map((pp: any) => (
                      <div key={pp.id} className="border rounded-md p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">{usersById[String(pp.technicianId)] || (locale==='ar' ? 'فني' : 'Technician')}</div>
                          <Badge variant={pp.status==='accepted'? 'secondary' : pp.status==='rejected'? 'destructive' : 'outline'} className="text-xs capitalize">{locale==='ar' ? (pp.status==='pending'?'معلق': pp.status==='accepted'?'مقبول':'مرفوض') : pp.status}</Badge>
                        </div>
                        <div className="text-sm">{locale === 'ar' ? 'السعر' : 'Price'}: {currency} {Number(pp.price||0).toLocaleString(numLocale)}</div>
                        <div className="text-sm text-muted-foreground">{locale === 'ar' ? 'المدة' : 'Days'}: {Number(pp.days||0)}</div>
                        {pp.message && <div className="mt-1 text-xs bg-muted/20 rounded p-2">{pp.message}</div>}
                        {pp.status === 'pending' && (
                          <div className="mt-2 flex items-center gap-2">
                            <Button size="sm" className="flex-1" onClick={async () => {
                              try {
                                const r = await updateOfferStatus(String(pp.id), 'accepted');
                                if (r.ok) {
                                  setProposals(prev => prev.map(x => x.id===pp.id ? { ...x, status: 'accepted' } as any : x));
                                }
                              } catch {}
                            }}>
                              <Check className="w-4 h-4 ml-1" /> {locale === 'ar' ? 'قبول' : 'Accept'}
                            </Button>
                            <Button size="sm" variant="destructive" className="flex-1 bg-red-600 hover:bg-red-700 text-white border border-red-600" onClick={async () => {
                              try {
                                const r = await updateOfferStatus(String(pp.id), 'rejected');
                                if (r.ok) {
                                  setProposals(prev => prev.map(x => x.id===pp.id ? { ...x, status: 'rejected' } as any : x));
                                }
                              } catch {}
                            }}>
                              <X className="w-4 h-4 ml-1" /> {locale === 'ar' ? 'رفض' : 'Reject'}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer setCurrentPage={setCurrentPage as any} />
    </div>
  );
}
