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
import { getOption } from "@/services/options";
import { getMyBids, getProjectById, type BidDto, type ProjectDto } from "@/services/projects";

interface AddServiceForProjectProps extends Partial<RouteContext> {}

const MIN_WAGE: Record<string, number> = {
  plumber: 200,
  electrician: 200,
  carpenter: 300,
  painter: 250,
  gypsum_installer: 450,
  marble_installer: 350,
};

interface TechnicianSpecialty { name: string; dailyRate: number; }

export default function AddServiceForProject({ setCurrentPage, ...rest }: AddServiceForProjectProps) {
  const { locale } = useTranslation();
  const currency = locale === "ar" ? "ر.س" : "SAR";

  // Project selection
  const [projectId, setProjectId] = useState<string>("");
  const [projects, setProjects] = useState<Array<ProjectDto & { display: string }>>([]);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(false);

  // Service form state (copied from AddService)
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
    const found = techSpecialties.find(spec => spec.name.toLowerCase().includes(stype) || stype.toLowerCase().includes(spec.name.toLowerCase()));
    if (found && found.dailyRate > 0) return found.dailyRate;
    return MIN_WAGE[stype] || 0;
  }, [stype, techSpecialties]);

  const skipNextTypeMinRef = useRef<boolean>(false);
  useEffect(() => {
    if (!stype) return;
    const min = minForSelected;
    if (skipNextTypeMinRef.current) {
      setDailyWage(prev => (Number.isFinite(prev as any) ? Math.max(min, Number(prev)) : min));
      skipNextTypeMinRef.current = false;
    } else {
      setDailyWage(min);
    }
  }, [stype, minForSelected]);

  // Load commissions
  useEffect(() => { (async () => {
    try {
      const { ok, data } = await getCommissionRates();
      if (ok && (data as any)?.rates) {
        setSvcCommissionPct(Number((data as any).rates.servicesTechnicians || 0));
        setRatesCurrency(String((data as any).rates.currency || 'SAR'));
      }
    } catch {}
  })(); }, []);

  // Load technician specialties (from public Options endpoint)
  useEffect(() => { (async () => {
    try {
      const { ok, data } = await getOption('technician_specialties');
      if (ok && data) {
        const arr = JSON.parse(String((data as any).value || '[]'));
        if (Array.isArray(arr)) {
          const converted = arr.map((x: any) => {
            if (typeof x === 'string') return { name: x, dailyRate: 0 } as TechnicianSpecialty;
            if (x && typeof x === 'object' && x.name) return { name: String(x.name), dailyRate: Number(x.dailyRate) || 0 } as TechnicianSpecialty;
            return null;
          }).filter(Boolean) as TechnicianSpecialty[];
          setTechSpecialties(converted);
        }
      }
    } catch {}
  })(); }, []);

  // Load types (from DB Options first, then fallback to catalog service types)
  useEffect(() => {
    try {
      const loadTypes = async () => {
        // Primary: public Options 'technician_specialties' (DB)
        try {
          const { ok, data } = await getOption('technician_specialties');
          if (ok && data) {
            const arr = JSON.parse(String((data as any).value || '[]'));
            if (Array.isArray(arr) && arr.length) {
              const mapped = arr
                .map((it: any) => {
                  if (typeof it === 'string') {
                    const id = it.trim();
                    if (!id) return null;
                    return { id, ar: it, en: it };
                  }
                  if (it && typeof it === 'object') {
                    const id = String(it.id || it.value || it.name || '').trim();
                    if (!id) return null;
                    const ar = typeof it.ar === 'string' && it.ar.trim() ? it.ar : (typeof it.name === 'string' ? it.name : id);
                    const en = typeof it.en === 'string' && it.en.trim() ? it.en : id;
                    return { id, ar, en };
                  }
                  return null;
                })
                .filter((x: any) => x && x.id && String(x.id).trim() !== '');
              if (mapped.length) { setTechOptions(mapped as any); return; }
            }
          }
        } catch {}

        // Fallback: services catalog types
        try {
          const r = await listServiceTypes();
          if (r.ok && Array.isArray(r.data) && r.data.length) { setTechOptions(r.data as any); return; }
        } catch {}
      };
      loadTypes();
    } catch {}
  }, []);

  // Load vendor in-progress projects via my bids (accepted/in_progress)
  useEffect(() => { (async () => {
    setLoadingProjects(true);
    try {
      const { ok, data } = await getMyBids();
      if (ok && Array.isArray(data)) {
        const accepted = (data as BidDto[]).filter(b => {
          const s = String(b.status || '').toLowerCase();
          return s === 'accepted' || s === 'in_progress' || s === 'in-progress' || s === 'inprogress';
        });
        // Fetch projects in parallel
        const uniqueIds = Array.from(new Set(accepted.map(b => String(b.projectId)))).filter(Boolean);
        const results = await Promise.allSettled(uniqueIds.map(id => getProjectById(id)));
        const items: Array<ProjectDto & { display: string }> = [];
        results.forEach((r, idx) => {
          if (r.status === 'fulfilled' && r.value?.ok && r.value.data) {
            const p = r.value.data as ProjectDto;
            const title = (p.title && p.title.trim()) ? p.title : (locale==='ar' ? `مشروع #${p.id}` : `Project #${p.id}`);
            const status = String(p.status || '');
            items.push({ ...p, display: `${title} • ${status}` });
          }
        });
        setProjects(items);
      } else setProjects([]);
    } catch { setProjects([]); }
    finally { setLoadingProjects(false); }
  })(); }, [locale]);

  const normalizeType = (val: string): string | null => {
    if (!val) return null;
    const v = String(val).trim().toLowerCase();
    // Try match against loaded techOptions first (DB-driven)
    const fromOptions = techOptions.find(o => o.id.toLowerCase() === v || o.ar?.toLowerCase() === v || o.en?.toLowerCase() === v);
    if (fromOptions) return fromOptions.id;
    // Try match against admin specialties (from DB option) as free text
    const fromSpecs = techSpecialties.find(s => s.name && (s.name.toLowerCase() === v));
    if (fromSpecs) return fromSpecs.name;
    return null;
  };

  const saveService = async () => {
    try {
      if (typeof window === "undefined") return;
      if (!projectId) {
        toastError(locale==='ar' ? 'يرجى اختيار مشروع قيد التنفيذ' : 'Please select an in-progress project', locale==='ar');
        return;
      }
      const t = normalizeType(stype);
      if (!t) {
        toastError(locale==='ar'? 'نوع الفني غير مدعوم. اختر نوعاً من القائمة.' : 'Unsupported technician type. Please select a valid type.', locale==='ar');
        return;
      }
      // Attach project reference in description to avoid backend schema changes
      const projectLine = locale==='ar' ? `\n(مرتبط بالمشروع: ${projectId})` : `\n(related to project: ${projectId})`;
      const payload = { type: t, dailyWage, days, total, description: `${description || ''}${projectLine}` } as any;
      let ok = false; let resp: any = null;
      if (editingServiceId) { const r = await updateService(editingServiceId, payload); ok = !!r.ok; resp = r; }
      else { const r = await createService(payload); ok = !!r.ok; resp = r; }
      if (!ok) {
        const msg = (resp && resp.data && (resp.data.message || resp.data.error))
          ? String(resp.data.message || resp.data.error)
          : (locale === 'ar' ? 'فشل حفظ الخدمة. تأكد من تسجيل الدخول وتوفر السيرفر.' : 'Failed to save service. Ensure you are logged in and server is running.');
        toastError(msg, locale==='ar');
        return;
      }
      toastSuccess(locale === 'ar' ? 'تم إرسال طلب الفني للمشروع وهو قيد موافقة الأدمن.' : 'Your technician request for the project was submitted and is pending admin approval.', locale==='ar');
      setCurrentPage && setCurrentPage("vendor-services");
    } catch {}
  };

  const canSubmit = Boolean(projectId) && Boolean(stype) && dailyWage >= (minForSelected || 0) && days >= 1;

  return (
    <div className="min-h-screen bg-background" dir={locale === "ar" ? "rtl" : "ltr"}>
      <Header currentPage="add-service-for-project" setCurrentPage={setCurrentPage as any} {...(rest as any)} />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{locale === 'ar' ? 'اطلب فني لمشروع' : 'Request Technician for Project'}</h1>
            <p className="text-muted-foreground text-sm">{locale === 'ar' ? 'اختر مشروعاً قيد التنفيذ ثم أدخل تفاصيل الفني' : 'Select an in-progress project then enter technician details'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCurrentPage && setCurrentPage("vendor-dashboard")}>{locale === 'ar' ? 'لوحة التاجر' : 'Vendor Dashboard'}</Button>
            <Button onClick={saveService} disabled={!canSubmit} className={!canSubmit ? 'opacity-50 cursor-not-allowed' : ''}>
              {locale === 'ar' ? 'حفظ الطلب' : 'Save Request'}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-3">
                <label className="block text-sm mb-1">{locale === 'ar' ? 'اختر المشروع (قيد التنفيذ)' : 'Select Project (In Progress)'}</label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingProjects ? (locale==='ar' ? 'جاري التحميل...' : 'Loading...') : (locale==='ar' ? 'اختر المشروع' : 'Select project')} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">{locale==='ar' ? 'لا توجد مشاريع قيد التنفيذ' : 'No in-progress projects found'}</div>
                    ) : (
                      projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.display}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm mb-1">{locale === 'ar' ? 'نوع الفني' : 'Technician Type'}</label>
                <Select value={stype} onValueChange={setStype}>
                  <SelectTrigger>
                    <SelectValue placeholder={locale === 'ar' ? 'اختر النوع' : 'Select type'} />
                  </SelectTrigger>
                  <SelectContent>
                    {techOptions.length > 0
                      ? techOptions
                          .filter((opt) => opt && typeof opt.id === 'string' && opt.id.trim() !== '')
                          .map((opt) => (
                            <SelectItem key={opt.id} value={opt.id}>{locale === 'ar' ? (opt.ar || opt.id) : (opt.en || opt.id)}</SelectItem>
                          ))
                      : (
                          <div className="p-2 text-sm text-muted-foreground">{locale==='ar' ? 'لا توجد أنواع مسجلة' : 'No types available'}</div>
                        )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm mb-1">{locale === 'ar' ? 'اليومية' : 'Daily Wage'}</label>
                <div className="flex items-center gap-2">
                  <Input type="text" inputMode="numeric" pattern="[0-9]*" value={Number.isFinite(dailyWage) ? dailyWage : 0}
                    onChange={(e)=> { const onlyDigits = (e.target.value || '').replace(/[^0-9.]/g, ''); const raw = parseFloat(onlyDigits || '0'); const min = minForSelected || 0; setDailyWage(Number.isFinite(raw) ? Math.max(min, raw) : min); }}
                    placeholder={locale==='ar' ? 'السعر' : 'Price'} />
                  <span className="text-sm text-muted-foreground">{currency}</span>
                </div>
                {svcCommissionPct > 0 && dailyWage > 0 && (
                  <div className="text-xs text-muted-foreground mt-1 space-y-1">
                    <div className="text-blue-600">{locale==='ar' ? 'النسبة الحالية:' : 'Current rate:'} {svcCommissionPct}%</div>
                    <div>{locale==='ar' ? 'عمولة المنصة:' : 'Platform commission:'} {Math.round((dailyWage || 0) * (svcCommissionPct / 100)).toLocaleString(locale==='ar'?'ar-EG':'en-US')} {ratesCurrency === 'SAR' ? (locale==='ar' ? 'ريال' : 'SAR') : ratesCurrency}</div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm mb-1">{locale === 'ar' ? 'عدد الأيام (الدوام)' : 'Duration (days)'}</label>
                <Input type="text" inputMode="numeric" pattern="[0-9]*" className={Number.isFinite(days) && days < 1 ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  value={Number.isFinite(days) ? days : 0} onChange={(e)=> { const onlyDigits = (e.target.value || '').replace(/[^0-9]/g, ''); const val = parseInt(onlyDigits || '0', 10) || 0; setDays(Math.max(0, val)); }} placeholder={locale==='ar' ? 'الأيام' : 'Days'} />
                {Number.isFinite(days) && days < 1 && (
                  <div className="text-xs mt-1 text-red-600">{locale === 'ar' ? 'يجب أن يكون عدد الأيام 1 على الأقل.' : 'Days must be at least 1.'}</div>
                )}
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm mb-1">{locale === 'ar' ? 'وصف الطلب (اختياري)' : 'Request Description (optional)'}</label>
                <textarea rows={3} className="w-full border rounded-md p-2 bg-background" value={description} onChange={(e)=> setDescription(e.target.value)} placeholder={locale==='ar' ? 'اكتب وصفاً مختصراً...' : 'Brief description...'} />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{locale === 'ar' ? 'السعر الكلي' : 'Total Price'} = {locale === 'ar' ? 'اليومية' : 'Daily'} × {locale === 'ar' ? 'الأيام' : 'Days'}</div>
              <div className="text-xl font-semibold">{currency} {total.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}</div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer setCurrentPage={setCurrentPage as any} />
    </div>
  );
}
