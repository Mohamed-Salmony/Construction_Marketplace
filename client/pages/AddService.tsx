import { useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useTranslation } from "../hooks/useTranslation";
import type { RouteContext } from "../components/routerTypes";
import { Separator } from "../components/ui/separator";
import { getAdminTechnicianOptions } from "../lib/adminOptions";
import { createService, updateService, listServiceTypes, type ServiceTypeItem } from "@/services/servicesCatalog";
import { toastSuccess, toastError } from "../utils/alerts";
import { getCommissionRates } from "@/services/commissions";
import { getAdminOption } from "@/services/admin";

interface AddServiceProps extends Partial<RouteContext> {}

const SERVICE_TYPES = [
  { id: "plumber", ar: "سباك", en: "Plumber" },
  { id: "electrician", ar: "كهربائي", en: "Electrician" },
  { id: "carpenter", ar: "نجار", en: "Carpenter" },
  { id: "painter", ar: "نقاش", en: "Painter" },
  { id: "gypsum_installer", ar: "فني تركيب جيبس بورد", en: "Gypsum Board Installer" },
  { id: "marble_installer", ar: "فني تركيب رخام", en: "Marble Installer" },
];

// Minimum daily wages per service type
const MIN_WAGE: Record<string, number> = {
  plumber: 200,
  electrician: 200,
  carpenter: 300,
  painter: 250,
  gypsum_installer: 450,
  marble_installer: 350,
};

interface TechnicianSpecialty {
  name: string;
  dailyRate: number;
}

export default function AddService({ setCurrentPage, ...rest }: AddServiceProps) {
  const { t, locale } = useTranslation();
  const currency = locale === "ar" ? "ر.س" : "SAR";

  const [stype, setStype] = useState<string>("");
  const [techOptions, setTechOptions] = useState<ServiceTypeItem[]>([]);
  const [techSpecialties, setTechSpecialties] = useState<TechnicianSpecialty[]>([]);
  const [dailyWage, setDailyWage] = useState<number>(0);
  const [days, setDays] = useState<number>(1);
  const [description, setDescription] = useState<string>("");
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const total = useMemo(() => Math.max(0, Math.round((dailyWage || 0) * Math.max(0, days || 0))), [dailyWage, days]);
  const [svcCommissionPct, setSvcCommissionPct] = useState<number>(0);
  const [ratesCurrency, setRatesCurrency] = useState<string>('SAR');

  const minForSelected = useMemo(() => {
    if (!stype) return 0;
    
    // First try to find from dynamic specialties
    const found = techSpecialties.find(spec => 
      spec.name.toLowerCase().includes(stype) || 
      stype.toLowerCase().includes(spec.name.toLowerCase())
    );
    if (found && found.dailyRate > 0) {
      return found.dailyRate;
    }
    
    // Fallback to static MIN_WAGE
    return MIN_WAGE[stype] || 0;
  }, [stype, techSpecialties]);

  const skipNextTypeMinRef = useRef<boolean>(false);
  // When changing type, reset to min, but if we're initializing edit, keep existing if >= min
  useEffect(() => {
    if (!stype) return;
    const min = minForSelected; // Use dynamic calculation instead of static
    if (skipNextTypeMinRef.current) {
      setDailyWage((prev) => (Number.isFinite(prev as any) ? Math.max(min, Number(prev)) : min));
      skipNextTypeMinRef.current = false;
    } else {
      setDailyWage(min);
    }
  }, [stype, minForSelected]);

  // Load services (technicians) commission from backend so the provider sees platform cut
  useEffect(() => {
    (async () => {
      try {
        const { ok, data } = await getCommissionRates();
        if (ok && (data as any)?.rates) {
          setSvcCommissionPct(Number((data as any).rates.servicesTechnicians || 0));
          setRatesCurrency(String((data as any).rates.currency || 'SAR'));
        }
      } catch {}
    })();
  }, []);

  // Load technician specialties with rates
  useEffect(() => {
    (async () => {
      try {
        const { ok, data } = await getAdminOption('technician_specialties');
        if (ok && data) {
          const arr = JSON.parse(String((data as any).value || '[]'));
          if (Array.isArray(arr)) {
            const converted = arr.map((x: any) => {
              if (typeof x === 'string') {
                return { name: x, dailyRate: 0 } as TechnicianSpecialty;
              } else if (x && typeof x === 'object' && x.name) {
                return { name: String(x.name), dailyRate: Number(x.dailyRate) || 0 } as TechnicianSpecialty;
              }
              return null;
            }).filter(Boolean) as TechnicianSpecialty[];
            setTechSpecialties(converted);
          }
        }
      } catch {}
    })();
  }, []);

  // Map human labels (Arabic/English) to backend enum codes
  const normalizeType = (val: string): string | null => {
    if (!val) return null;
    const v = String(val).trim().toLowerCase();
    const map: Record<string, string> = {
      plumber: 'plumber',
      electrician: 'electrician',
      carpenter: 'carpenter',
      painter: 'painter',
      'gypsum installer': 'gypsum_installer',
      gypsum_installer: 'gypsum_installer',
      'marble installer': 'marble_installer',
      marble_installer: 'marble_installer',
      daily: 'daily',
      hourly: 'hourly',
      project: 'project',
      // Arabic labels
      'سباك': 'plumber',
      'كهربائي': 'electrician',
      'نجار': 'carpenter',
      'نقاش': 'painter',
      'فني تركيب جيبس بورد': 'gypsum_installer',
      'فني تركيب رخام': 'marble_installer',
    };
    // direct match
    if (map[v]) return map[v];
    // try to match any SERVICE_TYPES label
    const fromStatic = SERVICE_TYPES.find(s => s.id === v || s.ar === val || s.en.toLowerCase() === v);
    if (fromStatic) return fromStatic.id;
    return null;
  };

  // Save service via backend only (no local fallback to avoid confusion)
  const saveService = async () => {
    try {
      if (typeof window === "undefined") return;
      // Prepare payload for backend with normalized type
      const t = normalizeType(stype);
      if (!t) {
        toastError(locale==='ar'? 'نوع الفني غير مدعوم. اختر نوعاً من القائمة.' : 'Unsupported technician type. Please select a valid type.', locale==='ar');
        return;
      }
      const payload = { type: t, dailyWage, days, total, description } as any;
      let ok = false;
      let resp: any = null;
      if (editingServiceId) {
        const r = await updateService(editingServiceId, payload);
        ok = !!r.ok; resp = r;
      } else {
        const r = await createService(payload);
        ok = !!r.ok; resp = r;
      }

      if (!ok) {
        const msg = (resp && resp.data && (resp.data.message || resp.data.error))
          ? String(resp.data.message || resp.data.error)
          : (locale === 'ar' ? 'فشل حفظ الخدمة. تأكد من تسجيل الدخول كـ تاجر واتصال السيرفر.' : 'Failed to save service. Ensure you are logged in as Merchant and server is running.');
        toastError(msg, locale==='ar');
        return;
      }

      toastSuccess(locale === 'ar' ? 'تم إرسال خدمتك وهي قيد موافقة الأدمن.' : 'Your service was submitted and is pending admin approval.', locale==='ar');
      setCurrentPage && setCurrentPage("vendor-services");
    } catch {}
  };

  const canSubmit = Boolean(stype) && dailyWage >= (minForSelected || 0) && days >= 1;

  // Load technician types dynamically from backend with fallbacks
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const loadTypes = async () => {
        try {
          const r = await listServiceTypes();
          if (r.ok && Array.isArray(r.data) && r.data.length) {
            setTechOptions(r.data as any);
            return;
          }
        } catch {}
        // Fallback to admin-configured specialties if backend types unavailable
        const specs = getAdminTechnicianOptions().specialties || [];
        if (Array.isArray(specs) && specs.length) {
          setTechOptions(specs.map((name) => {
            const match = SERVICE_TYPES.find(s => s.ar === name || s.en === name || s.id === name);
            return match ? { id: match.id, ar: match.ar, en: match.en } : { id: name, ar: name, en: name };
          }));
        } else {
          // Final fallback to static list
          setTechOptions(SERVICE_TYPES.map(s => ({ id: s.id, ar: s.ar, en: s.en })));
        }
      };
      loadTypes();
      const onAdminUpdate = () => loadTypes();
      window.addEventListener('admin_options_updated', onAdminUpdate as any);
      const editId = window.localStorage.getItem('edit_service_id');
      if (!editId) return;
      const raw = window.localStorage.getItem('user_services');
      if (!raw) return;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return;
      const found = list.find((s:any) => String(s.id) === String(editId));
      if (!found) return;
      setEditingServiceId(String(found.id));
      // set type first; tell the type effect to keep existing wage if it's >= min
      skipNextTypeMinRef.current = true;
      setDailyWage(Number(found.dailyWage || 0));
      setStype(found.type || '');
      // days/description
      setDays(Number(found.days || 1));
      setDescription(String(found.description || ''));
      return () => {
        window.removeEventListener('admin_options_updated', onAdminUpdate as any);
      };
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-background" dir={locale === "ar" ? "rtl" : "ltr"}>
      <Header currentPage="add-service" setCurrentPage={setCurrentPage as any} {...(rest as any)} />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{locale === 'ar' ? 'إضافة خدمة' : 'Add Service'}</h1>
            <p className="text-muted-foreground text-sm">{locale === 'ar' ? 'أدخل تفاصيل الخدمة لحساب السعر تلقائياً' : 'Enter service details to auto-calculate the price'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCurrentPage && setCurrentPage("vendor-services")}>{locale === 'ar' ? 'رجوع' : 'Back'}</Button>
            <Button onClick={saveService} disabled={!canSubmit} className={!canSubmit ? 'opacity-50 cursor-not-allowed' : ''}>
              {locale === 'ar' ? 'حفظ الخدمة' : 'Save Service'}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm mb-1">{locale === 'ar' ? 'نوع الفني' : 'Technician Type'}</label>
                <Select value={stype} onValueChange={setStype}>
                  <SelectTrigger>
                    <SelectValue placeholder={locale === 'ar' ? 'اختر النوع' : 'Select type'} />
                  </SelectTrigger>
                  <SelectContent>
                    {techOptions.length > 0
                      ? techOptions.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {locale === 'ar' ? opt.ar : opt.en}
                          </SelectItem>
                        ))
                      : SERVICE_TYPES.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {locale === 'ar' ? s.ar : s.en}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm mb-1">{locale === 'ar' ? 'اليومية' : 'Daily Wage'}</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className={""}
                    value={Number.isFinite(dailyWage) ? dailyWage : 0}
                    onChange={(e)=> {
                      const onlyDigits = (e.target.value || '').replace(/[^0-9.]/g, '');
                      const raw = parseFloat(onlyDigits || '0');
                      const min = minForSelected || 0;
                      setDailyWage(Number.isFinite(raw) ? Math.max(min, raw) : min);
                    }}
                    placeholder={minForSelected ? String(minForSelected) : (locale==='ar' ? '0' : '0')}
                  />
                  <span className="text-sm text-muted-foreground">{currency}</span>
                </div>
                {/* Commission preview */}
                {svcCommissionPct > 0 && dailyWage > 0 && (
                  <div className="text-xs text-muted-foreground mt-1 space-y-1">
                    <div className="text-blue-600">
                      {locale==='ar' ? 'النسبة الحالية:' : 'Current rate:'} {svcCommissionPct}%
                    </div>
                    <div>
                      {locale==='ar' ? 'عمولة المنصة:' : 'Platform commission:'} {Math.round((dailyWage || 0) * (svcCommissionPct / 100)).toLocaleString(locale==='ar'?'ar-EG':'en-US')} {ratesCurrency === 'SAR' ? (locale==='ar' ? 'ريال' : 'SAR') : ratesCurrency}
                    </div>
                    <div className="text-green-600 font-medium">
                      {locale==='ar' ? 'الصافي لك:' : 'Net for you:'} {Math.max((dailyWage || 0) - Math.round((dailyWage || 0) * (svcCommissionPct / 100)), 0).toLocaleString(locale==='ar'?'ar-EG':'en-US')} {ratesCurrency === 'SAR' ? (locale==='ar' ? 'ريال' : 'SAR') : ratesCurrency}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm mb-1">{locale === 'ar' ? 'عدد الأيام (الدوام)' : 'Duration (days)'}</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className={Number.isFinite(days) && days < 1 ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  value={Number.isFinite(days) ? days : 0}
                  onChange={(e)=> {
                    const onlyDigits = (e.target.value || '').replace(/[^0-9]/g, '');
                    const val = parseInt(onlyDigits || '0', 10) || 0;
                    setDays(Math.max(0, val));
                  }}
                  placeholder={locale==='ar' ? '1' : '1'}
                />
                {Number.isFinite(days) && days < 1 && (
                  <div className="text-xs mt-1 text-red-600">
                    {locale === 'ar' ? 'يجب أن يكون عدد الأيام 1 على الأقل.' : 'Days must be at least 1.'}
                  </div>
                )}
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm mb-1">{locale === 'ar' ? 'وصف الخدمة (اختياري)' : 'Service Description (optional)'}</label>
                <textarea rows={3} className="w-full border rounded-md p-2 bg-background" value={description} onChange={(e)=> setDescription(e.target.value)} placeholder={locale==='ar' ? 'اكتب وصفاً مختصراً للخدمة...' : 'Brief description of the service...'} />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {locale === 'ar' ? 'السعر الكلي' : 'Total Price'} = {locale === 'ar' ? 'اليومية' : 'Daily'} × {locale === 'ar' ? 'الأيام' : 'Days'}
              </div>
              <div className="text-xl font-semibold">
                {currency} {total.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}
              </div>
            </div>
            {/* Commission notice for services (technicians) */}
            {(() => {
              const v = Number(total || 0);
              if (!isFinite(v) || v <= 0) return null;
              const comm = Math.round(v * (svcCommissionPct / 100));
              const net = Math.max(v - comm, 0);
              const numLocale = locale === 'ar' ? 'ar-EG' : 'en-US';
              return (
                <div className="mt-1 text-xs text-muted-foreground">
                  <div>
                    {locale==='ar' ? 'عمولة الخدمات على الفني' : 'Service commission for technicians'} {svcCommissionPct}%: {comm.toLocaleString(numLocale)} {ratesCurrency==='SAR' ? (locale==='ar'?'ر.س':'SAR') : ratesCurrency}
                  </div>
                  <div>
                    {locale==='ar' ? 'الصافي بعد الخصم' : 'Net after commission'}: {net.toLocaleString(numLocale)} {ratesCurrency==='SAR' ? (locale==='ar'?'ر.س':'SAR') : ratesCurrency}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
      <Footer setCurrentPage={setCurrentPage as any} />
    </div>
  );
}
