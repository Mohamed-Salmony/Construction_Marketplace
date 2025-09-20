  function getAuthToken(): string | null {
    try {
      if (typeof window === 'undefined') return null;
      const lsAuth = window.localStorage.getItem('auth_token');
      if (lsAuth) return lsAuth;
      const lsToken = window.localStorage.getItem('token');
      if (lsToken) return lsToken;
      const cookie = document.cookie.split('; ').find((row) => row.startsWith('auth_token='));
      if (cookie) return decodeURIComponent(cookie.split('=')[1] || '');
      return null;
    } catch { return null; }
  }
import React, { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import type { RouteContext } from '../components/routerTypes';
import { useTranslation } from '../hooks/useTranslation';
import { createProject as apiCreateProject, updateProject as apiUpdateProject } from '@/services/projects';
import { toastInfo } from '../utils/alerts';
import { toastError } from '../utils/alerts';
import { confirmDialog } from '../utils/alerts';
import { getProjectTypes, getProjectMaterials, getProjectPriceRules, getProjectCatalog, type ProjectCatalog } from '@/services/options';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useFirstLoadOverlay } from '../hooks/useFirstLoadOverlay';

// Product types & materials are loaded from admin options at runtime

// Subtypes for product (requested: عادي / وسط / دبل)
const productSubtypes = [
  { id: 'normal', ar: 'عادي', en: 'Normal' },
  { id: 'center', ar: 'وسط', en: 'Center' },
  { id: 'double', ar: 'دبل', en: 'Double' },
];

// Materials, colors, accessories are loaded from admin catalog per selected product

// Accessories come from admin catalog per selected product

// Price rules are loaded from admin options: key = type id, value = base price per m²
// Example: { "door": 500, "window": 400 }

// Cost modifiers
const subtypeFactor: Record<string, number> = {
  normal: 1.0,
  center: 1.1,
  double: 1.2,
};
const colorFactor: Record<string, number> = {
  white: 1.00,
  black: 1.05,
  silver: 1.07,
  bronze: 1.10,
  gray: 1.05,
  beige: 1.05,
};

// PPM is computed dynamically using admin price rules via effect and per-item rendering

function computeTotal(w:number, h:number, l:number|undefined, ppm:number, qty:number, accIds:string[], getAccPrice:(id:string)=>number) {
  // Compute measure based on available dimensions: if l is provided and >0 and either w or h is 0, treat as linear meter
  let measure = 0;
  const W = Math.max(0, w);
  const H = Math.max(0, h);
  const L = Math.max(0, Number(l||0));
  if (W > 0 && H > 0) measure = W * H; else if (W > 0 && L > 0) measure = W * L; else if (H > 0 && L > 0) measure = H * L; else measure = W || H || L || 0;
  const accCost = accIds
    .map(id => getAccPrice(id) || 0)
    .reduce((a,b)=>a+b,0);
  const subtotal = measure * (ppm || 0);
  const totalOne = subtotal + accCost;
  return Math.max(0, Math.round(totalOne * Math.max(1, qty)));
}

export default function ProjectsBuilder({ setCurrentPage, ...rest }: RouteContext) {
  const { t, locale } = useTranslation();
  const currency = locale === 'ar' ? 'ر.س' : 'SAR';
  const hideFirstOverlay = useFirstLoadOverlay(
    rest,
    locale==='ar' ? 'جاري تحميل صفحة إنشاء المشروع' : 'Loading project builder',
    locale==='ar' ? 'يرجى الانتظار' : 'Please wait'
  );

  // Admin-configured catalogs
  const [productTypes, setProductTypes] = useState<Array<{ id: string; en?: string; ar?: string }>>([]);
  const [materials, setMaterials] = useState<Array<{ id: string; en?: string; ar?: string }>>([]);
  const [colors, setColors] = useState<Array<{ id: string; en?: string; ar?: string }>>([]);
  const [accessories, setAccessories] = useState<Array<{ id: string; en?: string; ar?: string; price?: number }>>([]);
  const [subtypes, setSubtypes] = useState<Array<{ id: string; en?: string; ar?: string }>>([]);
  const [catalog, setCatalog] = useState<ProjectCatalog | null>(null);
  const [priceRules, setPriceRules] = useState<Record<string, number>>({});

  const [ptype, setPtype] = useState('');
  const [psubtype, setPsubtype] = useState('');
  const [material, setMaterial] = useState('');
  const [color, setColor] = useState('');
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [length, setLength] = useState<number>(0);
  const [reqDim, setReqDim] = useState<{ width?: boolean; height?: boolean; length?: boolean }>({ width: true, height: true });
  const [quantity, setQuantity] = useState<number>(1);
  const [days, setDays] = useState<number>(1);
  const [pricePerMeter, setPricePerMeter] = useState<number>(0);
  const [autoPrice, setAutoPrice] = useState<boolean>(true);
  const [selectedAcc, setSelectedAcc] = useState<string[]>([]);
  const [description, setDescription] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  type Builder = {
    id: string;
    ptype: string;
    psubtype: string;
    material: string;
    color: string;
    width: number;
    height: number;
    quantity: number;
    days: number;
    autoPrice: boolean;
    pricePerMeter: number;
    selectedAcc: string[];
    description?: string;
  };
  const [additionalBuilders, setAdditionalBuilders] = useState<Builder[]>([]);
  const [hasToken, setHasToken] = useState<boolean>(false);

  useEffect(() => {
    setHasToken(!!getAuthToken());
  }, [hideFirstOverlay]);

  // Load admin-configured options once (legacy lists + unified catalog)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [types, mats, rules, cat] = await Promise.all([
          getProjectTypes(),
          getProjectMaterials(),
          getProjectPriceRules(),
          getProjectCatalog(),
        ]);
        if (!cancelled) {
          setProductTypes(types);
          setMaterials(mats);
          setPriceRules(rules);
          setCatalog(cat);
        }
      } catch {}
      finally { if (!cancelled) { try { hideFirstOverlay(); } catch {} } }
    })();
    return () => { cancelled = true; };
  }, [hideFirstOverlay]);

  useEffect(() => {
    // Auto-calc PPM with priority: material-level price (from selected subtype) -> legacy base rules
    const p = catalog?.products?.find(p => p.id === ptype);
    const st: any = p?.subtypes?.find((s: any) => s.id === psubtype);
    const mat = (st?.materials || []).find((m: any) => m.id === material);
    if (mat && Number.isFinite(Number(mat.pricePerM2))) {
      setPricePerMeter(Number(mat.pricePerM2 || 0));
      return;
    }
    const base = (p?.basePricePerM2 ?? priceRules[ptype] ?? 0) as number;
    const sf = subtypeFactor[psubtype] ?? 1;
    const cf = colorFactor[color] ?? 1;
    const ppm = Math.round(base * sf * cf);
    setPricePerMeter(ppm);
  }, [ptype, psubtype, material, color, priceRules, catalog]);

  // When product type or subtype changes, hydrate materials/colors/accessories and required dimensions
  useEffect(() => {
    const p = catalog?.products?.find(p => p.id === ptype);
    if (p) {
      const subs = p.subtypes || [];
      setSubtypes(subs);
      // materials now come from selected subtype if available
      const st = subs.find(s => s.id === psubtype);
      const mats = (st?.materials || []).map((m:any) => ({ id: m.id, ar: m.ar, en: m.en })) as Array<{id:string;ar?:string;en?:string}>;
      const cols = p.colors || [];
      const accs = p.accessories || [];
      setMaterials(mats);
      setColors(cols);
      setAccessories(accs);
      setReqDim(p.dimensions || { width: true, height: true });
      // Ensure selections exist in new lists; otherwise default to first
      if (!mats.find(m => m.id === material)) setMaterial(mats[0]?.id || '');
      if (!cols.find(c => c.id === color)) setColor(cols[0]?.id || '');
      if (!subs.find(s => s.id === psubtype)) setPsubtype(subs[0]?.id || '');
    }
  }, [ptype, psubtype, catalog, material, color]);

  // Prefill from edit draft if exists
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('edit_project_draft');
      if (!raw) return;
      const d = JSON.parse(raw);
      setEditingId(d.id || null);
      setPtype(d.ptype || '');
      setPsubtype(d.psubtype || 'normal');
      setMaterial(d.material || '');
      setColor(d.color || 'white');
      setWidth(Number(d.width) || 0);
      setHeight(Number(d.height) || 0);
      setQuantity(Number(d.quantity) || 1);
      setDays(Number(d.days) || 1);
      setSelectedAcc(Array.isArray(d.selectedAcc) ? d.selectedAcc : []);
      setDescription(d.description || '');
      // keep auto calc for ppm via effect
      window.localStorage.removeItem('edit_project_draft');
      // Load additional items draft if present
      const itemsRaw = window.localStorage.getItem('edit_project_items_draft');
      if (itemsRaw) {
        const items = JSON.parse(itemsRaw);
        if (Array.isArray(items)) {
          // Normalize into Builder shape
          const normalized = items.map((b:any) => ({
            id: b.id || Math.random().toString(36).slice(2),
            ptype: b.ptype || '',
            psubtype: b.psubtype || 'normal',
            material: b.material || '',
            color: b.color || 'white',
            width: Number(b.width) || 0,
            height: Number(b.height) || 0,
            quantity: Number(b.quantity) || 1,
            days: Number(b.days) || 1,
            autoPrice: true,
            pricePerMeter: Number(b.pricePerMeter) || 0,
            selectedAcc: Array.isArray(b.selectedAcc) ? b.selectedAcc : [],
            description: b.description || '',
          })) as Builder[];
          setAdditionalBuilders(normalized);
        }
        window.localStorage.removeItem('edit_project_items_draft');
      }
    } catch {}
  }, []);

  // Keep additional builders' days in sync with main days
  useEffect(() => {
    setAdditionalBuilders((prev) => prev.map((b) => ({ ...b, days })));
  }, [days]);

  const isComplete = (() => {
    if (!ptype || !material || quantity <= 0 || pricePerMeter <= 0) return false;
    const needW = !!reqDim.width; const needH = !!reqDim.height; const needL = !!reqDim.length;
    const okW = !needW || width > 0;
    const okH = !needH || height > 0;
    const okL = !needL || length > 0;
    return okW && okH && okL;
  })();

  const total = useMemo(() => computeTotal(width, height, length, pricePerMeter, quantity, selectedAcc, (id)=> accessories.find(a=>a.id===id)?.price || 0), [width, height, length, pricePerMeter, quantity, selectedAcc, accessories]);
  const totalExtra = useMemo(() => {
    return additionalBuilders.reduce((sum, b) => {
      const p = catalog?.products?.find(x => x.id === b.ptype);
      const st = p?.subtypes?.find((s:any)=> s.id===b.psubtype) as any;
      const mat = (st?.materials||[]).find((m:any)=> m.id===b.material) as any;
      const base = (p?.basePricePerM2 ?? priceRules[b.ptype] ?? 0) as number;
      const fallback = Math.round(base * (subtypeFactor[b.psubtype] ?? 1) * (colorFactor[b.color] ?? 1));
      const ppm = Number.isFinite(Number(mat?.pricePerM2)) ? Number(mat?.pricePerM2||0) : fallback;
      const accPrice = (id:string) => (p?.accessories || []).find(a=>a.id===id)?.price || 0;
      return sum + computeTotal(b.width, b.height, undefined, ppm, b.quantity, b.selectedAcc, accPrice);
    }, 0);
  }, [additionalBuilders, priceRules, catalog]);
  const grandTotal = useMemo(() => total + totalExtra, [total, totalExtra]);

  function toggleAccessory(id: string, checked: boolean) {
    setSelectedAcc((prev) => {
      if (checked) return Array.from(new Set([...prev, id]));
      return prev.filter((x) => x !== id);
    });
  }

  function toggleAccessoryFor(index: number, id: string, checked: boolean) {
    setAdditionalBuilders((prev) => {
      const copy = [...prev];
      const acc = copy[index].selectedAcc;
      copy[index] = {
        ...copy[index],
        selectedAcc: checked ? Array.from(new Set([...acc, id])) : acc.filter((x) => x !== id),
      };
      return copy;
    });
  }

  const addClonedForm = () => {
    // Add a BLANK form to let user add many items easily
    const newForm: Builder = {
      id: Math.random().toString(36).slice(2),
      ptype: '',
      psubtype: '',
      material: '',
      color: '',
      width: 0,
      height: 0,
      quantity: 1,
      days: days,
      autoPrice: true,
      pricePerMeter: 0,
      selectedAcc: [],
      description: '',
    };
    setAdditionalBuilders((prev) => [...prev, newForm]);
  };

  const removeForm = (index: number) => {
    setAdditionalBuilders((prev) => prev.filter((_, i) => i !== index));
  };

  const confirmProject = async () => {
    // Pre-submit auth check: require token
    const token = getAuthToken();
    if (!token) {
      const goLogin = await confirmDialog(
        locale==='ar' ? 'يجب تسجيل الدخول بحساب عميل لإرسال الطلب.' : 'You must be logged in as a Customer to submit.',
        locale==='ar' ? 'تسجيل الدخول' : 'Login',
        locale==='ar' ? 'إلغاء' : 'Cancel',
        locale==='ar'
      );
      if (goLogin) {
        setCurrentPage && setCurrentPage('login');
      }
      return;
    }
    if (!isComplete) return;
    // Build main project
    const mainPPM = pricePerMeter;
    const thisProd = catalog?.products?.find(x => x.id === ptype);
    const mainTotal = computeTotal(width, height, length, mainPPM, quantity, selectedAcc, (id)=> (thisProd?.accessories || []).find(a=>a.id===id)?.price || 0);
    // Build additional items (not as separate projects)
    const items = additionalBuilders.map((b) => {
      const p = catalog?.products?.find(x => x.id === b.ptype);
      const st: any = p?.subtypes?.find((s:any)=> s.id===b.psubtype);
      const mat: any = (st?.materials||[]).find((m:any)=> m.id===b.material);
      const base = (p?.basePricePerM2 ?? priceRules[b.ptype] ?? 0) as number;
      const fallback = Math.round(base * (subtypeFactor[b.psubtype] ?? 1) * (colorFactor[b.color] ?? 1));
      const ppm = Number.isFinite(Number(mat?.pricePerM2)) ? Number(mat?.pricePerM2||0) : fallback;
      const accPrices = (id:string) => (p?.accessories || []).find(a=>a.id===id)?.price || 0;
      return {
        id: Math.random().toString(36).slice(2),
        ptype: b.ptype,
        psubtype: b.psubtype,
        material: b.material,
        color: b.color,
        width: b.width,
        height: b.height,
        quantity: b.quantity,
        days: b.days,
        autoPrice: b.autoPrice,
        pricePerMeter: ppm,
        selectedAcc: b.selectedAcc,
        description: b.description || '',
        total: computeTotal(b.width, b.height, undefined, ppm, b.quantity, b.selectedAcc, accPrices),
        createdAt: Date.now(),
      };
    });
    // Include main selection as the first item so color and extras persist server-side via Items
    const mainItem = {
      id: Math.random().toString(36).slice(2),
      ptype,
      psubtype,
      material,
      color,
      width,
      height,
      quantity,
      days,
      autoPrice,
      pricePerMeter: mainPPM,
      selectedAcc,
      description: description || '',
      total: mainTotal,
      createdAt: Date.now(),
    };
    const allItems = [mainItem, ...items];
    // Attach current user info so vendors can see the requester name
    let currentUser: any = null;
    try {
      const uRaw = window.localStorage.getItem('mock_current_user');
      currentUser = uRaw ? JSON.parse(uRaw) : null;
    } catch {}

    // Map to backend CreateProjectDto
    const payload: any = {
      title: description ? (locale==='ar' ? 'مشروع' : 'Project') : undefined,
      description,
      type: ptype,
      psubtype,
      material,
      color,
      width,
      height,
      length,
      quantity,
      days,
      pricePerMeter: mainPPM,
      total: grandTotal,
      selectedAcc,
      items: allItems,
    };
    (async () => {
      try {
        if (editingId) {
          const r = await apiUpdateProject(editingId, payload);
          if (r.ok) {
            toastInfo(locale==='ar' ? 'تم حفظ التعديلات. الطلب قيد المراجعة من الإدارة.' : 'Changes saved. Your project is pending admin review.', locale==='ar');
          } else {
            if (r.status === 401) {
              toastError(locale==='ar' ? 'يجب تسجيل الدخول أولاً.' : 'You must be logged in.');
            } else if (r.status === 403) {
              toastError(locale==='ar' ? 'لا تملك صلاحية تعديل المشروع. تأكد أنك مسجل بحساب عميل.' : 'Forbidden. Ensure you are logged in as a Customer.');
            } else {
              toastError(locale==='ar' ? 'تعذر حفظ التعديلات' : 'Failed to save changes');
            }
            return;
          }
        } else {
          const r = await apiCreateProject(payload);
          if (r.ok) {
            toastInfo(locale==='ar' ? 'تم إنشاء المشروع. الطلب قيد المراجعة من الإدارة.' : 'Project created. Your request is pending admin review.', locale==='ar');
          } else {
            if (r.status === 401) {
              toastError(locale==='ar' ? 'يجب تسجيل الدخول أولاً.' : 'You must be logged in.');
            } else if (r.status === 403) {
              toastError(locale==='ar' ? 'لا تملك صلاحية إنشاء مشروع. تأكد أنك مسجل بحساب عميل.' : 'Forbidden. Ensure you are logged in as a Customer.');
            } else {
              toastError(locale==='ar' ? 'تعذر إنشاء المشروع' : 'Failed to create project');
            }
            return;
          }
        }
      } catch {}
      setCurrentPage && setCurrentPage('projects');
    })();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header currentPage="projects-builder" setCurrentPage={setCurrentPage as any} {...(rest as any)} />
      <main className="container mx-auto px-4 py-6 flex-1">
        <h1 className="text-2xl font-bold mb-4">{locale==='ar' ? 'إضافة مشروع' : 'Add Project'}</h1>
        {!hasToken && (
          <div className="mb-4 p-3 rounded-md border border-yellow-400 bg-yellow-50 text-yellow-800 flex items-center justify-between">
            <div className="text-sm">
              {locale==='ar' ? 'يجب تسجيل الدخول بحساب عميل قبل البدء في إنشاء مشروع.' : 'You must be logged in as a Customer before creating a project.'}
            </div>
            <Button size="sm" variant="outline" onClick={() => setCurrentPage && setCurrentPage('login')}>
              {locale==='ar' ? 'تسجيل الدخول' : 'Login'}
            </Button>
          </div>
        )}
        <Card className="mb-8">
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm mb-1">{locale==='ar' ? ' المنتج' : 'Product Type'}</label>
                <Select value={ptype} onValueChange={setPtype}>
                  <SelectTrigger>
                    <SelectValue placeholder={locale==='ar' ? 'اختر النوع' : 'Select type'} />
                  </SelectTrigger>
                  <SelectContent>
                    {productTypes.map(pt => (
                      <SelectItem key={pt.id} value={pt.id}>{locale==='ar' ? (pt.ar ?? pt.id) : (pt.en ?? pt.id)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm mb-1">{locale==='ar' ? 'النوع' : 'Subtype'}</label>
                <Select value={psubtype} onValueChange={setPsubtype}>
                  <SelectTrigger>
                    <SelectValue placeholder={locale==='ar' ? 'اختر النوع' : 'Select subtype'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(subtypes || []).map((st) => (
                      <SelectItem key={st.id} value={st.id}>{locale==='ar' ? (st.ar || st.id) : (st.en || st.id)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm mb-1">{locale==='ar' ? 'الخامة' : 'Material'}</label>
                <Select value={material} onValueChange={setMaterial}>
                  <SelectTrigger>
                    <SelectValue placeholder={locale==='ar' ? 'اختر الخامة' : 'Select material'} />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map(m => (
                      <SelectItem key={m.id} value={m.id}>{locale==='ar' ? (m.ar ?? m.id) : (m.en ?? m.id)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm mb-1">{locale==='ar' ? 'اللون' : 'Color'}</label>
                <Select value={color} onValueChange={setColor}>
                  <SelectTrigger>
                    <SelectValue placeholder={locale==='ar' ? 'اختر اللون' : 'Select color'} />
                  </SelectTrigger>
                  <SelectContent>
                    {colors.map(c => (
                      <SelectItem key={c.id} value={c.id}>{locale==='ar' ? c.ar : c.en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {reqDim.width && (
                  <div>
                    <label className="block text-sm mb-1">{locale==='ar' ? 'العرض (متر)' : 'Width (m)'}</label>
                    <Input type="text" inputMode="decimal" value={Number.isFinite(width) ? width : ''} onChange={(e) => setWidth(parseFloat(e.target.value || '0'))} placeholder={locale==='ar' ? '0.00' : '0.00'} />
                  </div>
                )}
                {reqDim.height && (
                  <div>
                    <label className="block text-sm mb-1">{locale==='ar' ? 'الارتفاع (متر)' : 'Height (m)'}</label>
                    <Input type="text" inputMode="decimal" value={Number.isFinite(height) ? height : ''} onChange={(e) => setHeight(parseFloat(e.target.value || '0'))} placeholder={locale==='ar' ? '0.00' : '0.00'} />
                  </div>
                )}
                {reqDim.length && (
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm mb-1">{locale==='ar' ? 'الطول (متر طولي)' : 'Length (linear m)'}</label>
                    <Input type="text" inputMode="decimal" value={Number.isFinite(length) ? length : ''} onChange={(e) => setLength(parseFloat(e.target.value || '0'))} placeholder={locale==='ar' ? '0.00' : '0.00'} />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm mb-1">{locale==='ar' ? 'سعر المتر المربع' : 'Price per m²'}</label>
                <Input type="number" min={0} step={1} value={Number.isFinite(pricePerMeter) ? pricePerMeter : 0} disabled placeholder={locale==='ar' ? '0' : '0'} />
              </div>
              <div>
                <label className="block text-sm mb-1">{locale==='ar' ? 'الكمية' : 'Quantity'}</label>
                <Input type="number" min={1} step={1} value={Number.isFinite(quantity) ? quantity : 0} onChange={(e) => setQuantity(parseInt(e.target.value || '0', 10) || 0)} placeholder={locale==='ar' ? '0' : '0'} />
              </div>
              <div>
                <label className="block text-sm mb-1">{locale==='ar' ? 'أيام التنفيذ' : 'Days to complete'}</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={String(Number.isFinite(days) ? days : 1)}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, '');
                    const n = Math.max(1, parseInt(v || '1', 10) || 1);
                    setDays(n);
                  }}
                  placeholder={locale==='ar' ? 'عدد الأيام' : 'Days'}
                />
              </div>
              
              <div className="md:col-span-2 lg:col-span-2">
                <label className="block text-sm mb-2">{locale==='ar' ? 'ملحقات إضافية' : 'Additional Accessories'}</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {accessories.map((acc: { id: string; en?: string; ar?: string; price?: number }) => (
                    <label key={acc.id} className="flex items-center gap-2 rounded-md border p-2">
                      <Checkbox checked={selectedAcc.includes(acc.id)} onCheckedChange={(v) => toggleAccessory(acc.id, !!v)} />
                      <span className="text-sm">
                        {locale==='ar' ? (acc.ar || acc.id) : (acc.en || acc.id)} <span className="text-muted-foreground">- {currency} {Number(acc.price||0)}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm mb-1">{locale==='ar' ? 'وصف المنتج (اختياري)' : 'Project Description (optional)'}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full border rounded-md p-2 bg-background"
                  spellCheck={false}
                  autoComplete="off"
                  data-gramm="false"
                  data-enable-grammarly="false"
                  placeholder={locale==='ar' ? 'اكتب وصفاً مختصراً للمشروع...' : 'Write a brief description of your project...'}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <Button type="button" variant="secondary" onClick={addClonedForm} className="mt-2 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> {locale==='ar' ? 'إضافة منتج' : 'Add Product'}
                </Button>
              </div>
            </div>

            {/* Actions moved to bottom under the last form */}
          </CardContent>
        </Card>

        {/* Additional Cloned Forms */}
        {additionalBuilders.length > 0 && (
          <div className="space-y-6 mt-6">
            {additionalBuilders.map((b, idx) => {
              const p = catalog?.products?.find(x => x.id === b.ptype);
              const st: any = p?.subtypes?.find((s:any)=> s.id===b.psubtype);
              const mat: any = (st?.materials||[]).find((m:any)=> m.id===b.material);
              const base = (p?.basePricePerM2 ?? priceRules[b.ptype] ?? 0) as number;
              const fallback = Math.round(base * (subtypeFactor[b.psubtype] ?? 1) * (colorFactor[b.color] ?? 1));
              const ppm = Number.isFinite(Number(mat?.pricePerM2)) ? Number(mat?.pricePerM2||0) : fallback;
              return (
                <Card key={b.id} className="p-4">
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{locale==='ar' ? `منتج إضافي #${idx+1}` : `Additional Item #${idx+1}`}</h3>
                      <Button variant="outline" onClick={() => removeForm(idx)}>
                        {locale==='ar' ? 'حذف' : 'Remove'}
                      </Button>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm mb-1">{locale==='ar' ? 'نوع المنتج' : 'Product Type'}</label>
                        <Select value={b.ptype} onValueChange={(v) => setAdditionalBuilders((prev)=>{ const c=[...prev]; c[idx] = { ...c[idx], ptype: v }; return c; })}>
                          <SelectTrigger>
                            <SelectValue placeholder={locale==='ar' ? 'اختر النوع' : 'Select type'} />
                          </SelectTrigger>
                          <SelectContent>
                            {productTypes.map((pt) => (
                              <SelectItem key={pt.id} value={pt.id}>{locale==='ar' ? pt.ar : pt.en}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm mb-1">{locale==='ar' ? 'النوع' : 'Subtype'}</label>
                        <Select value={b.psubtype} onValueChange={(v) => setAdditionalBuilders((prev)=>{ const c=[...prev]; c[idx] = { ...c[idx], psubtype: v }; return c; })}>
                          <SelectTrigger>
                            <SelectValue placeholder={locale==='ar' ? 'اختر النوع (عادي/وسط/دبل)' : 'Select subtype'} />
                          </SelectTrigger>
                          <SelectContent>
                            {(catalog?.products?.find(x=>x.id===b.ptype)?.subtypes || subtypes || []).map((st) => (
                              <SelectItem key={st.id} value={st.id}>{locale==='ar' ? (st.ar || st.id) : (st.en || st.id)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm mb-1">{locale==='ar' ? 'الخامة' : 'Material'}</label>
                        <Select value={b.material} onValueChange={(v) => setAdditionalBuilders((prev)=>{ const c=[...prev]; c[idx] = { ...c[idx], material: v }; return c; })}>
                          <SelectTrigger>
                            <SelectValue placeholder={locale==='ar' ? 'اختر الخامة' : 'Select material'} />
                          </SelectTrigger>
                          <SelectContent>
                            {((st?.materials||[]) as any[]).map((m:any) => (
                              <SelectItem key={m.id} value={m.id}>{locale==='ar' ? (m.ar || m.id) : (m.en || m.id)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm mb-1">{locale==='ar' ? 'اللون' : 'Color'}</label>
                        <Select value={b.color} onValueChange={(v) => setAdditionalBuilders((prev)=>{ const c=[...prev]; c[idx] = { ...c[idx], color: v }; return c; })}>
                          <SelectTrigger>
                            <SelectValue placeholder={locale==='ar' ? 'اختر اللون' : 'Select color'} />
                          </SelectTrigger>
                          <SelectContent>
                            {colors.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{locale==='ar' ? c.ar : c.en}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {(catalog?.products?.find(x=>x.id===b.ptype)?.dimensions?.width ?? true) && (
                          <div>
                            <label className="block text-sm mb-1">{locale==='ar' ? 'العرض (متر)' : 'Width (m)'}</label>
                            <Input type="text" inputMode="decimal" value={Number.isFinite(b.width) ? b.width : ''} onChange={(e)=> setAdditionalBuilders((prev)=>{ const c=[...prev]; c[idx] = { ...c[idx], width: parseFloat(e.target.value || '0') }; return c; })} />
                          </div>
                        )}
                        {(catalog?.products?.find(x=>x.id===b.ptype)?.dimensions?.height ?? true) && (
                          <div>
                            <label className="block text-sm mb-1">{locale==='ar' ? 'الارتفاع (متر)' : 'Height (m)'}</label>
                            <Input type="text" inputMode="decimal" value={Number.isFinite(b.height) ? b.height : ''} onChange={(e)=> setAdditionalBuilders((prev)=>{ const c=[...prev]; c[idx] = { ...c[idx], height: parseFloat(e.target.value || '0') }; return c; })} />
                          </div>
                        )}
                        {(catalog?.products?.find(x=>x.id===b.ptype)?.dimensions?.length ?? false) && (
                          <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm mb-1">{locale==='ar' ? 'الطول (متر طولي)' : 'Length (linear m)'}</label>
                            <Input type="text" inputMode="decimal" value={''} onChange={()=>{ /* manage if needed in extended model */ }} disabled />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm mb-1">{locale==='ar' ? 'سعر المتر المربع' : 'Price per m²'}</label>
                        <Input type="number" min={0} step={1} value={ppm} disabled />
                      </div>
                      
                      <div>
                        <label className="block text-sm mb-1">{locale==='ar' ? 'الكمية' : 'Quantity'}</label>
                        <Input type="number" min={1} step={1} value={Number.isFinite(b.quantity) ? b.quantity : 0} onChange={(e)=> setAdditionalBuilders((prev)=>{ const c=[...prev]; c[idx] = { ...c[idx], quantity: parseInt(e.target.value || '0', 10) || 0 }; return c; })} />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">{locale==='ar' ? 'أيام التنفيذ' : 'Days to complete'}</label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={String(Number.isFinite(b.days) ? b.days : 1)}
                          onChange={(e)=> {/* disabled */}}
                          disabled
                          readOnly
                          placeholder={locale==='ar' ? 'عدد الأيام' : 'Days'}
                        />
                      </div>
                      <div className="md:col-span-2 lg:col-span-2">
                        <label className="block text-sm mb-2">{locale==='ar' ? 'ملحقات إضافية' : 'Additional Accessories'}</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {(catalog?.products?.find(x=>x.id===b.ptype)?.accessories || accessories).map((acc: { id: string; en?: string; ar?: string; price?: number }) => (
                            <label key={acc.id} className="flex items-center gap-2 rounded-md border p-2">
                              <Checkbox checked={b.selectedAcc.includes(acc.id)} onCheckedChange={(v) => toggleAccessoryFor(idx, acc.id, !!v)} />
                              <span className="text-sm">
                                {locale==='ar' ? (acc.ar || acc.id) : (acc.en || acc.id)} <span className="text-muted-foreground">- {currency} {Number(acc.price||0)}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="md:col-span-2 lg:col-span-3">
                        <label className="block text-sm mb-1">{locale==='ar' ? 'وصف المنتج (اختياري)' : 'Item Description (optional)'}</label>
                        <textarea
                          value={b.description || ''}
                          onChange={(e)=> setAdditionalBuilders((prev)=>{ const c=[...prev]; c[idx] = { ...c[idx], description: e.target.value }; return c; })}
                          rows={3}
                          className="w-full border rounded-md p-2 bg-background"
                          placeholder={locale==='ar' ? 'وصف مختصر...' : 'Brief description...'}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Grand Total at the very end */}
        <div className="mt-6">
          <div className="flex items-center justify-between p-4 rounded-md border bg-muted/40">
            <div className="text-sm text-muted-foreground">
              {locale==='ar' ? 'الإجمالي التقديري بعد كل الاختيارات' : 'Estimated total after all selections'}
            </div>
            <div className="text-xl font-bold text-primary">
              {currency} {grandTotal.toLocaleString(locale==='ar'?'ar-EG':'en-US')}
            </div>
          </div>
        </div>

        {/* Bottom Actions under the last form */}
        <div className="flex items-center justify-between mt-4">
          <Button variant="outline" onClick={() => setCurrentPage && setCurrentPage('projects')}>
            {locale==='ar' ? 'رجوع للمشاريع' : 'Back to Projects'}
          </Button>
          <div className="flex items-center gap-3">
            <Button onClick={confirmProject} disabled={!isComplete} className={!isComplete ? 'opacity-50 cursor-not-allowed' : ''}>
              {locale==='ar' ? 'تأكيد' : 'Confirm'}
            </Button>
          </div>
        </div>
      </main>
      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}
