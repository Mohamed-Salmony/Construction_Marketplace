import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Filter,
  ChevronDown,
  Star,
  Eye,
  ArrowUpDown,
  Grid,
  List,
  Tag,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Slider } from "../components/ui/slider";
import { Checkbox } from "../components/ui/checkbox";
import { Separator } from "../components/ui/separator";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useTranslation } from "../hooks/useTranslation";
import type { RouteContext } from "../components/routerTypes";
import { getOpenProjects, getProjects, getMyProjects, createProject, deleteProject, getProjectById } from "@/services/projects";
import { getProjectCatalog, type ProjectCatalog } from "@/services/options";
import { toastError, toastInfo } from "../utils/alerts";
import { useFirstLoadOverlay } from "../hooks/useFirstLoadOverlay";

// Mock data removed; show only user-added projects
const mockProjects: any[] = [];

const projectCategories = [
  { id: "web", name: { ar: "ويب", en: "Web" }, count: 24 },
  { id: "mobile", name: { ar: "موبايل", en: "Mobile" }, count: 12 },
  { id: "dashboard", name: { ar: "لوحات تحكم", en: "Dashboards" }, count: 7 },
  { id: "store", name: { ar: "متاجر", en: "Stores" }, count: 9 },
];

const stacks = [
  "React",
  "Next.js",
  "Tailwind",
  "Node.js",
  "Express",
  "Flutter",
  "Firebase",
  "D3",
];

// Project builder dictionaries
// Updated product types per user request: only Door, Window, Railing
const productTypes = [
  { id: 'door', ar: 'باب', en: 'Door' },
  { id: 'window', ar: 'شباك', en: 'Window' },
  { id: 'railing', ar: 'دربزين', en: 'Railing' },
];

const materials = [
  { id: 'aluminum', ar: 'ألمنيوم', en: 'Aluminum' },
  { id: 'steel', ar: 'صاج', en: 'Steel' },
  { id: 'laser', ar: 'ليزر', en: 'Laser-cut' },
  { id: 'glass', ar: 'سكريت', en: 'Glass (Securit)' },
];

const accessoriesCatalog = [
  { id: 'brass_handle', ar: 'أوكرة نحاس', en: 'Brass Handle', price: 20 },
  { id: 'stainless_handle', ar: 'أوكرة سلستين', en: 'Stainless Handle', price: 15 },
  { id: 'aluminum_lock', ar: 'كالون الومنيوم', en: 'Aluminum Lock', price: 40 },
  { id: 'computer_lock', ar: 'قفل كمبيوتر', en: 'Computer Lock', price: 60 },
  { id: 'window_knob', ar: 'مقبض شباك', en: 'Window Knob', price: 20 },
];

// Normalize server enum status (number or name) to canonical names used in UI
function normalizeStatus(raw: any): string {
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
}

interface ProjectsProps extends Partial<RouteContext> {}

export default function Projects({ setCurrentPage, ...rest }: ProjectsProps) {
  const { t, locale } = useTranslation();
  const currency = locale === "ar" ? "ر.س" : "SAR";
  const isLoggedIn = Boolean((rest as any)?.user);
  const currentUserId = (rest as any)?.user?.id ? String((rest as any).user.id) : '';
  const isVendor = ((rest as any)?.user?.role === 'vendor');
  const hideFirstOverlay = useFirstLoadOverlay(
    rest,
    locale==='ar' ? 'جاري تحميل المشاريع' : 'Loading projects',
    locale==='ar' ? 'يرجى الانتظار' : 'Please wait'
  );

  const [projects, setProjects] = useState(mockProjects);
  const [filtered, setFiltered] = useState(mockProjects);
  const [openProjects, setOpenProjects] = useState<any[]>([]);
  const [browseProjects, setBrowseProjects] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<ProjectCatalog | null>(null);
  // Track initial load completion to hide overlay once
  const [loadedCatalog, setLoadedCatalog] = useState(false);
  const [loadedOpen, setLoadedOpen] = useState(false);
  const [loadedBrowse, setLoadedBrowse] = useState(false);
  const [loadedMine, setLoadedMine] = useState(false);
  const [overlayHidden, setOverlayHidden] = useState(false);

  // Builder state
  const [ptype, setPtype] = useState<string>('');
  const [material, setMaterial] = useState<string>('');
  const [width, setWidth] = useState<number>(0); // meters
  const [height, setHeight] = useState<number>(0); // meters
  const [quantity, setQuantity] = useState<number>(0);
  const [pricePerMeter, setPricePerMeter] = useState<number>(0); // SAR per m²
  const [autoPrice, setAutoPrice] = useState<boolean>(true);
  const [selectedAcc, setSelectedAcc] = useState<string[]>([]);
  const [description, setDescription] = useState<string>("");
  const [total, setTotal] = useState<number>(0);
  type Builder = {
    id: string;
    ptype: string;
    material: string;
    width: number;
    height: number;
    quantity: number;
    autoPrice: boolean;
    pricePerMeter: number;
    selectedAcc: string[];
    description: string;
  };

  const openInlineDetails = async (pid: string | number) => {
    try {
      setDetailsOpen(true);
      setDetailsLoading(true);
      setDetailsProject(null);
      const idStr = String(pid ?? '').trim();
      const valid = /^[a-fA-F0-9]{24}$/.test(idStr) || /^\d+$/.test(idStr);
      if (!valid) { setDetailsLoading(false); setDetailsProject(null); return; }
      const r = await getProjectById(idStr);
      if (r.ok && r.data) {
        const data: any = r.data as any;
        const it0 = Array.isArray(data.items) && data.items.length ? data.items[0] : {};
        const merged = {
          ...data,
          ptype: data.ptype ?? data.type ?? it0.ptype ?? it0.type ?? '',
          type: data.type ?? it0.type ?? data.ptype ?? it0.ptype ?? '',
          material: data.material ?? it0.material ?? '',
          width: Number(data.width ?? it0.width ?? 0) || 0,
          height: Number(data.height ?? it0.height ?? 0) || 0,
          quantity: Number(data.quantity ?? it0.quantity ?? 0) || 0,
          days: Number(data.days ?? it0.days ?? 0) || 0,
          pricePerMeter: Number(data.pricePerMeter ?? it0.pricePerMeter ?? 0) || 0,
          total: Number(data.total ?? it0.total ?? 0) || 0,
          selectedAcc: Array.isArray(data.selectedAcc) ? data.selectedAcc : (Array.isArray(it0.selectedAcc) ? it0.selectedAcc : []),
          accessories: Array.isArray(data.accessories) ? data.accessories : (Array.isArray(it0.accessories) ? it0.accessories : []),
          description: data.description ?? it0.description ?? '',
        };
        setDetailsProject(merged);
      } else {
        setDetailsProject(null);
      }
    } catch {
      setDetailsProject(null);
    } finally {
      setDetailsLoading(false);
    }
  };
  const blankBuilder = (): Builder => ({
    id: `b-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    ptype: '',
    material: '',
    width: 0,
    height: 0,
    quantity: 0,
    autoPrice: true,
    pricePerMeter: 0,
    selectedAcc: [],
    description: '',
  });
  const [additionalBuilders, setAdditionalBuilders] = useState<Builder[]>([]);
  const [userProjects, setUserProjects] = useState<any[]>([]);
  const [userServices, setUserServices] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState<boolean>(false);
  const [showBuilder, setShowBuilder] = useState<boolean>(false);
  const [hasToken, setHasToken] = useState<boolean>(false);

  function getAuthToken(): string | null {
    try {
      if (typeof window === 'undefined') return null;
      const keys = ['auth_token','token','access_token','jwt'];
      for (const k of keys) {
        const v = window.localStorage.getItem(k);
        if (v) return v;
      }
      const cookies = document.cookie.split('; ');
      for (const k of keys) {
        const row = cookies.find((r) => r.startsWith(`${k}=`));
        if (row) return decodeURIComponent(row.split('=')[1] || '');
      }
      return null;
    } catch { return null; }
  }

  const hasAnyAuth = useCallback((): boolean => {
    try {
      if (typeof window === 'undefined') return false;
      if (getAuthToken()) return true;
      const cookieStr = document.cookie || '';
      const authCookieKeys = ['auth_token','token','access_token','jwt','.AspNetCore.Cookies'];
      return authCookieKeys.some(k => cookieStr.includes(`${k}=`));
    } catch { return false; }
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStacks, setSelectedStacks] = useState<string[]>([]);
  const [budgetRange, setBudgetRange] = useState([0, 20000]);
  const [sortBy, setSortBy] = useState("relevance");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  // Dynamic user-projects filters
  const [fType, setFType] = useState<string>('');
  const [fMaterial, setFMaterial] = useState<string>('');
  const [fAcc, setFAcc] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);

  // Inline details dialog state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsProject, setDetailsProject] = useState<any | null>(null);

  // Load admin product catalog to resolve localized names
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await getProjectCatalog();
        if (!cancelled && r) setCatalog(r);
      } catch {}
      finally { if (!cancelled) setLoadedCatalog(true); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Helpers to resolve labels from catalog first, then local lists, then raw id
  const resolveTypeLabel = useCallback((typeId: string): string => {
    try {
      if (!typeId) return '';
      const fromCat = catalog?.products?.find(p => p.id === typeId);
      if (fromCat) return (locale==='ar' ? (fromCat.ar || fromCat.id) : (fromCat.en || fromCat.id));
      const fromLocal = productTypes.find(pt => pt.id === typeId);
      if (fromLocal) return (locale==='ar' ? fromLocal.ar : fromLocal.en);
      return typeId;
    } catch { return typeId; }
  }, [catalog, locale]);

  const resolveMaterialLabel = useCallback((typeId: string, materialId: string): string => {
    try {
      if (!materialId) return '';
      // Try catalog under the product's subtypes materials
      const prod = catalog?.products?.find(p => p.id === typeId);
      const mats = ([] as any[]).concat(...((prod?.subtypes || []).map((s:any)=> s?.materials || [])));
      const found = mats.find((m:any)=> m?.id === materialId);
      if (found) return (locale==='ar' ? (found.ar || found.id) : (found.en || found.id));
      const fromLocal = materials.find(m => m.id === materialId);
      if (fromLocal) return (locale==='ar' ? fromLocal.ar : fromLocal.en);
      return materialId;
    } catch { return materialId; }
  }, [catalog, locale]);

  // Remove all localStorage-based project loading; rely on backend only
  useEffect(() => {
    let cancelled = false;
    setHydrated(true);
    setHasToken(hasAnyAuth());
    const onStorage = () => setHasToken(hasAnyAuth());
    const onFocus = () => setHasToken(hasAnyAuth());
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);

    (async () => {
      try {
        if (!hasToken || isVendor) return;
        const my = await getMyProjects();
        if (!cancelled && my.ok && Array.isArray(my.data)) {
          const mapped = (my.data as any[]).map((p:any) => {
            const rawStatus = p.status ?? p.Status ?? p.state ?? p.State ?? '';
            const byApproval = (p.isApproved === false || p.approved === false) ? 'PendingApproval' : (p.isApproved === true || p.approved === true ? (rawStatus || 'Published') : rawStatus);
            const status = normalizeStatus(byApproval || rawStatus);
            const firstItem = Array.isArray(p.items) && p.items.length ? p.items[0] : {};
            const typeVal = p.type || p.ptype || firstItem.ptype || firstItem.type || '';
            const materialVal = p.material || firstItem.material || '';
            const widthVal = Number(p.width ?? firstItem.width ?? 0) || 0;
            const heightVal = Number(p.height ?? firstItem.height ?? 0) || 0;
            const qtyVal = Number(p.quantity ?? firstItem.quantity ?? 0) || 0;
            const ppmVal = Number(p.pricePerMeter ?? firstItem.pricePerMeter ?? 0) || 0;
            const selAcc = Array.isArray(p.selectedAcc) ? p.selectedAcc : Array.isArray(firstItem.selectedAcc) ? firstItem.selectedAcc : [];
            const accs = Array.isArray(p.accessories) ? p.accessories : Array.isArray(firstItem.accessories) ? firstItem.accessories : [];
            return ({
              id: p.id ?? p._id,
              ownerId: currentUserId,
              type: typeVal,
              material: materialVal,
              width: widthVal,
              height: heightVal,
              quantity: qtyVal,
              pricePerMeter: ppmVal,
              selectedAcc: selAcc,
              accessories: accs,
              description: p.description || '',
              total: Number(p.total)||0,
              createdAt: p.createdAt || new Date().toISOString(),
              updatedAt: p.updatedAt || undefined,
              days: p.days || 0,
              status,
            });
          });
          setUserProjects(mapped);
        }
      } catch {} 
      finally { if (!cancelled) setLoadedMine(true); }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, [hasToken, isVendor, currentUserId, locale, hasAnyAuth]);

  // Fetch open projects from backend (read-only showcase)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { ok, data } = await getOpenProjects();
        if (ok && Array.isArray(data) && !cancelled) {
          const list = data.map((p: any) => ({
            id: p.id,
            title: p.title || (locale==='ar'? 'مشروع':'Project'),
            description: p.description || '',
            createdAt: p.createdAt || new Date().toISOString(),
            views: (p.viewCount ?? p.views ?? 0),
            budget: (p as any).budget ?? 0,
          }));
          setOpenProjects(list);
        }
      } catch {}
      finally { if (!cancelled) setLoadedOpen(true); }
    };
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch paged projects for browsing (first page)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { ok, data } = await getProjects({ page: 1, pageSize: 9, sortBy: 'createdAt', sortDirection: 'desc' });
        if (ok && data && (data as any).items && !cancelled) {
          const items = (data as any).items as any[];
          const mapped = items.map((p:any) => ({
            id: p.id,
            title: p.title || (locale==='ar'? 'مشروع':'Project'),
            description: p.description || '',
            createdAt: p.createdAt || new Date().toISOString(),
            views: (p.viewCount ?? p.views ?? 0),
            budget: (p as any).budget ?? 0,
          }));
          setBrowseProjects(mapped);
        }
      } catch {}
      finally { if (!cancelled) setLoadedBrowse(true); }
    })();
    return () => { cancelled = true; };
  }, [locale]);

  // Hide first-load overlay once any of the initial fetches completes
  useEffect(() => {
    if (!overlayHidden && (loadedCatalog || loadedOpen || loadedBrowse || loadedMine)) {
      try { hideFirstOverlay(); } catch {}
      setOverlayHidden(true);
    }
  }, [loadedCatalog, loadedOpen, loadedBrowse, loadedMine, overlayHidden, hideFirstOverlay]);

  // Stop persisting user projects to localStorage
  useEffect(() => {}, [userProjects]);

  // Persist additional builders
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (!hydrated) return;
      window.localStorage.setItem('builders_forms', JSON.stringify(additionalBuilders));
    } catch {}
  }, [additionalBuilders, hydrated]);

  // Persist user services
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (!hydrated) return;
      window.localStorage.setItem('user_services', JSON.stringify(userServices));
    } catch {}
  }, [userServices, hydrated]);

  const SERVICE_TYPES = [
    { id: 'plumber', ar: 'سباك', en: 'Plumber' },
    { id: 'electrician', ar: 'كهربائي', en: 'Electrician' },
    { id: 'carpenter', ar: 'نجار', en: 'Carpenter' },
    { id: 'painter', ar: 'نقاش', en: 'Painter' },
    { id: 'gypsum_installer', ar: 'فني تركيب جيبس بورد', en: 'Gypsum Board Installer' },
    { id: 'marble_installer', ar: 'فني تركيب رخام', en: 'Marble Installer' },
  ];

  // Build normalized dataset from userProjects for filters
  const normalizedUserProjects = (userProjects || []).map((up:any) => {
    const typeId = up.ptype || up.type || '';
    const matId = up.material || '';
    const totalPrice = typeof up.total === 'number' ? up.total : 0;
    const accIds: string[] = Array.isArray(up.selectedAcc)
      ? up.selectedAcc
      : Array.isArray(up.accessories)
        ? up.accessories.map((a:any)=> a?.id).filter(Boolean)
        : [];
    return { ...up, _typeId: typeId, _materialId: matId, _total: totalPrice, _accIds: accIds };
  });

  // Derive filter options and min/max from data
  const { typeOptions, materialOptions, accessoryOptions, minTotal, maxTotal } = (() => {
    const tSet = new Set<string>();
    const mSet = new Set<string>();
    const aSet = new Set<string>();
    let minT = Number.POSITIVE_INFINITY;
    let maxT = 0;
    normalizedUserProjects.forEach(p => {
      if (p._typeId) tSet.add(p._typeId);
      if (p._materialId) mSet.add(p._materialId);
      (p._accIds || []).forEach((id:string) => aSet.add(id));
      if (typeof p._total === 'number') {
        minT = Math.min(minT, p._total);
        maxT = Math.max(maxT, p._total);
      }
    });
    if (!Number.isFinite(minT)) minT = 0;
    return {
      typeOptions: Array.from(tSet),
      materialOptions: Array.from(mSet),
      accessoryOptions: Array.from(aSet),
      minTotal: minT,
      maxTotal: maxT,
    };
  })();

  // Initialize priceRange when data changes
  useEffect(() => {
    setPriceRange([minTotal, maxTotal]);
  }, [minTotal, maxTotal]);

  // Compute filtered user projects based on dynamic filters
  const filteredUserProjects = normalizedUserProjects.filter((p:any) => {
    if (fType && p._typeId !== fType) return false;
    if (fMaterial && p._materialId !== fMaterial) return false;
    if (fAcc.length > 0) {
      const hasAll = fAcc.every(id => p._accIds.includes(id));
      if (!hasAll) return false;
    }
    if (priceRange) {
      const [minP, maxP] = priceRange;
      if (typeof p._total === 'number') {
        if (p._total < minP || p._total > maxP) return false;
      }
    }
    // Optional: search term applies to description and type label
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const typeLabel = productTypes.find(pt=>pt.id===p._typeId)?.[locale==='ar'?'ar':'en'] || '';
      const matLabel = materials.find(m=>m.id===p._materialId)?.[locale==='ar'?'ar':'en'] || '';
      const desc = (p.description || '').toLowerCase();
      if (!typeLabel.toLowerCase().includes(q) && !matLabel.toLowerCase().includes(q) && !desc.includes(q)) return false;
    }
    return true;
  });

  // Remove mock-based client filtering for demo projects
  useEffect(() => { setFiltered([] as any); }, [projects, searchTerm, selectedCategory, selectedStacks, budgetRange, sortBy, locale]);

  // Fixed price per m² per product type (SAR)
  const fixedPricePerType: Record<string, number> = useMemo(() => ({
    door: 500,
    window: 400,
    railing: 380,
  }), []);

  useEffect(() => {
    if (autoPrice) {
      if (!ptype) {
        setPricePerMeter(0);
        return;
      }
      const calc = fixedPricePerType[ptype] ?? 0;
      setPricePerMeter(calc);
    }
  }, [autoPrice, ptype, fixedPricePerType]);

  const isComplete = Boolean(ptype) && Boolean(material) && width > 0 && height > 0 && quantity > 0 && pricePerMeter > 0;

  const isCompleteB = (b: Builder) => Boolean(b.ptype) && Boolean(b.material) && b.width > 0 && b.height > 0 && b.quantity > 0 && b.pricePerMeter > 0;

  const computeTotal = (w:number, h:number, ppm:number, qty:number, accIds:string[]) => {
    const area = Math.max(0, w) * Math.max(0, h);
    const accessoriesCost = accIds.map(id => accessoriesCatalog.find(a => a.id === id)?.price || 0).reduce((a,b)=>a+b,0);
    const subtotal = area * ppm;
    const totalOne = subtotal + accessoriesCost;
    return Math.max(0, Math.round(totalOne * Math.max(1, qty)));
  };

  useEffect(() => {
    if (!isComplete) {
      setTotal(0);
      return;
    }
    const area = Math.max(0, width) * Math.max(0, height); // m²
    const accessoriesCost = selectedAcc
      .map(id => accessoriesCatalog.find(a => a.id === id)?.price || 0)
      .reduce((a, b) => a + b, 0);
    const subtotal = area * pricePerMeter;
    const totalOne = subtotal + accessoriesCost;
    setTotal(Math.max(0, Math.round(totalOne * Math.max(1, quantity))));
  }, [width, height, pricePerMeter, selectedAcc, quantity, isComplete]);

  const toggleAccessory = (id: string, checked: boolean) => {
    setSelectedAcc(prev => checked ? Array.from(new Set([...prev, id])) : prev.filter(x => x !== id));
  };

  const resetBuilder = () => {
    setPtype('');
    setMaterial('');
    setWidth(0);
    setHeight(0);
    setQuantity(0);
    setSelectedAcc([]);
    setAutoPrice(true);
    setPricePerMeter(0);
    setTotal(0);
    setDescription("");
  };

  const addBlankBuilderBelow = () => {
    const newB: Builder = {
      id: `b-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      ptype,
      material,
      width,
      height,
      quantity,
      autoPrice,
      pricePerMeter,
      selectedAcc: [...selectedAcc],
      description,
    };
    setAdditionalBuilders(prev => [...prev, newB]);
    resetBuilder();
  };

  const updateBuilder = (id: string, patch: Partial<Builder>) => {
    setAdditionalBuilders(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
  };

  const toggleAccessoryB = (id: string, accId: string, checked: boolean) => {
    setAdditionalBuilders(prev => prev.map(b => {
      if (b.id !== id) return b;
      const next = checked ? Array.from(new Set([...b.selectedAcc, accId])) : b.selectedAcc.filter(x => x !== accId);
      return { ...b, selectedAcc: next };
    }));
  };

  const autoPriceFor = (_materialId:string, typeId:string) => {
    if (!typeId) return 0;
    return fixedPricePerType[typeId] ?? 0;
  };

  const addBuilderFrom = (base: Builder) => {
    const clone: Builder = {
      id: `b-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      ptype: base.ptype,
      material: base.material,
      width: base.width,
      height: base.height,
      quantity: base.quantity,
      autoPrice: base.autoPrice,
      pricePerMeter: base.pricePerMeter,
      selectedAcc: [...base.selectedAcc],
      description: base.description,
    };
    setAdditionalBuilders(prev => [...prev, clone]);
  };

  const confirmProject = async () => {
    const area = Math.max(0, width) * Math.max(0, height);
    const acc = accessoriesCatalog.filter(a => selectedAcc.includes(a.id));
    if (editingId) {
      setUserProjects(prev => prev.map((p:any) => p.id === editingId ? {
        ...p,
        type: ptype,
        material,
        width,
        height,
        area,
        quantity,
        pricePerMeter,
        accessories: acc,
        total,
        updatedAt: new Date().toISOString(),
      } : p));
      setEditingId(null);
      resetBuilder();
      setShowBuilder(false);
      return;
    }
    try {
      const title = `${ptype || ''} ${material || ''}`.trim() || (locale==='ar' ? 'مشروع' : 'Project');
      const payload: any = {
        title,
        description,
        type: ptype,
        material,
        width,
        height,
        quantity,
        days: 0,
        pricePerMeter,
        total,
        items: [
          {
            ptype,
            type: ptype,
            material,
            width,
            height,
            quantity,
            days: 0,
            pricePerMeter,
            selectedAcc,
            accessories: acc,
            total,
            description,
          },
        ],
      };
      const res = await createProject(payload);
      if (!res.ok) {
        alert(locale==='ar' ? 'غير مصرح. يرجى تسجيل الدخول بحساب عميل.' : 'Unauthorized. Please sign in with a Customer account.');
        return;
      }
      try {
        const my = await getMyProjects();
        if (my.ok && Array.isArray(my.data)) {
          const mapped = (my.data as any[]).map((p:any) => {
            const rawStatus = p.status ?? p.Status ?? p.state ?? p.State ?? '';
            const byApproval = (p.isApproved === false || p.approved === false) ? 'PendingApproval' : (p.isApproved === true || p.approved === true ? (rawStatus || 'Published') : rawStatus);
            const status = normalizeStatus(byApproval || rawStatus);
            const firstItem = Array.isArray(p.items) && p.items.length ? p.items[0] : {};
            const typeVal = p.type || p.ptype || firstItem.ptype || firstItem.type || '';
            const materialVal = p.material || firstItem.material || '';
            const widthVal = Number(p.width ?? firstItem.width ?? 0) || 0;
            const heightVal = Number(p.height ?? firstItem.height ?? 0) || 0;
            const qtyVal = Number(p.quantity ?? firstItem.quantity ?? 0) || 0;
            const ppmVal = Number(p.pricePerMeter ?? firstItem.pricePerMeter ?? 0) || 0;
            const selAcc = Array.isArray(p.selectedAcc) ? p.selectedAcc : Array.isArray(firstItem.selectedAcc) ? firstItem.selectedAcc : [];
            const accs = Array.isArray(p.accessories) ? p.accessories : Array.isArray(firstItem.accessories) ? firstItem.accessories : [];
            return ({
              id: p.id,
              ownerId: currentUserId,
              type: typeVal,
              material: materialVal,
              width: widthVal,
              height: heightVal,
              quantity: qtyVal,
              pricePerMeter: ppmVal,
              selectedAcc: selAcc,
              accessories: accs,
              description: p.description || '',
              total: Number(p.total)||0,
              createdAt: p.createdAt || new Date().toISOString(),
              updatedAt: p.updatedAt || undefined,
              days: p.days || 0,
              status,
            });
          });
          setUserProjects(mapped);
        }
      } catch {}
      resetBuilder();
      setShowBuilder(false);
    } catch (e) {
      alert(locale==='ar' ? 'تعذر إنشاء المشروع. يرجى المحاولة لاحقاً.' : 'Failed to create project. Please try again later.');
    }
  };

  const ProjectCard = ({ p }: { p: any }) => (
    <Card className="group hover:shadow-lg transition-all duration-300">
      <CardContent className="p-4">
        <div className="relative mb-4">
          <ImageWithFallback src={p.image} alt={p.name[locale]} className="w-full h-48 object-cover rounded-lg" />
          {p.isFeatured && (
            <Badge className="absolute top-2 right-2 bg-primary">{locale === 'ar' ? 'مميز' : 'Featured'}</Badge>
          )}
        </div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-medium text-lg">{p.name[locale]}</h3>
            <p className="text-sm text-muted-foreground">{p.client[locale]}</p>
          </div>
          <div className="flex items-center gap-1 text-yellow-500">
            <Star className="w-4 h-4" />
            <span className="text-sm">{p.rating}</span>
          </div>
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Tag className="w-4 h-4" /> {p.category[locale]} • {p.subCategory[locale]}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-primary font-semibold">
            {currency} {p.budget.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}
          </span>
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-1" /> {locale === 'ar' ? 'التفاصيل' : 'Details'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <Header currentPage="projects" setCurrentPage={setCurrentPage as any} {...(rest as any)} />

      <div className="container mx-auto px-4 py-8">
        {/* Login notice for viewing own projects */}
        {!hasToken && (
          <Card className="mb-6 border-yellow-400 bg-yellow-50">
            <CardContent className="p-4 flex items-center justify-between text-yellow-800">
              <span className="text-sm">{locale==='ar' ? 'يرجى تسجيل الدخول لعرض مشاريعك وحالتها.' : 'Please sign in to view your projects and their status.'}</span>
              <Button size="sm" variant="outline" onClick={() => setCurrentPage && setCurrentPage('login')}>
                {locale==='ar' ? 'تسجيل الدخول' : 'Login'}
              </Button>
            </CardContent>
          </Card>
        )}
        {!hasToken && (
          <Card className="mb-6">
            <CardContent className="p-4 text-sm text-muted-foreground">
              {locale==='ar' ? 'يرجى تسجيل الدخول لإنشاء وعرض مشاريعك الخاصة. لن يستطيع الزوار مشاهدة مشاريع المستخدمين.' : 'Please sign in to create and view your own projects. Guests cannot view users’ projects.'}
            </CardContent>
          </Card>
        )}
        {/* Header with Add Project (top-left) */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={() => setCurrentPage && setCurrentPage('projects-builder')}>
              <Plus className="w-4 h-4 mr-1" /> {locale==='ar' ? 'إضافة مشروع جديد' : 'Add New Project'}
            </Button>
            <h1 className="text-2xl font-bold">{locale==='ar' ? 'مشاريعي' : 'My Projects'}</h1>
          </div>
          <div />
        </div>

        {/* My Projects Only */}
        {hasToken && (
          <Card className="mb-8">
            <CardContent className="p-4">
              {/* Centered search for user's projects */}
              <div className="flex justify-center mb-4">
                <div className="relative w-full max-w-xl">
                  <Input
                    value={searchTerm}
                    onChange={(e)=>setSearchTerm(e.target.value)}
                    placeholder={locale==='ar' ? 'ابحث في مشاريعك...' : 'Search your projects...'}
                    className="pr-10"
                  />
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              {userProjects.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  {locale==='ar' ? 'لا توجد مشاريع بعد. اضغط "إضافة مشروع جديد" للبدء.' : 'No projects yet. Click "Add New Project" to get started.'}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  {locale==='ar' ? 'قائمة مشاريعك أدناه.' : 'Your projects are listed below.'}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Project Builder */}
        {(showBuilder || !!editingId) && (
          <Card className="mb-8">
            <CardContent className="p-4 md:p-6 space-y-4">
              <h2 className="text-xl font-semibold">
                {editingId ? (locale==='ar' ? 'تعديل مشروع' : 'Edit Project') : (locale==='ar' ? 'بناء مشروع جديد' : 'Build a New Project')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* نوع المنتج */}
                <div>
                  <label className="block text-sm mb-1">{locale==='ar' ? 'نوع المنتج' : 'Product Type'}</label>
                  <Select value={ptype} onValueChange={setPtype}>
                    <SelectTrigger>
                      <SelectValue placeholder={locale==='ar' ? 'اختر النوع' : 'Select type'} />
                    </SelectTrigger>
                    <SelectContent>
                      {productTypes.map(pt => (
                        <SelectItem key={pt.id} value={pt.id}>{locale==='ar' ? pt.ar : pt.en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* الخامة */}
                <div>
                  <label className="block text-sm mb-1">{locale==='ar' ? 'الخامة' : 'Material'}</label>
                  <Select value={material} onValueChange={setMaterial}>
                    <SelectTrigger>
                      <SelectValue placeholder={locale==='ar' ? 'اختر الخامة' : 'Select material'} />
                    </SelectTrigger>
                    <SelectContent>
                      {materials.map(m => (
                        <SelectItem key={m.id} value={m.id}>{locale==='ar' ? m.ar : m.en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* الأبعاد */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm mb-1">{locale==='ar' ? 'العرض (متر)' : 'Width (m)'}</label>
                    <Input type="number" min={0} step={0.01} value={Number.isFinite(width) ? width : 0} onChange={(e) => setWidth(parseFloat(e.target.value || '0'))} placeholder={locale==='ar' ? '0.00' : '0.00'} />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">{locale==='ar' ? 'الطول (متر)' : 'Height (m)'}</label>
                    <Input type="number" min={0} step={0.01} value={Number.isFinite(height) ? height : 0} onChange={(e) => setHeight(parseFloat(e.target.value || '0'))} placeholder={locale==='ar' ? '0.00' : '0.00'} />
                  </div>
                </div>
                {/* سعر المتر */}
                <div className="grid grid-cols-2 gap-2 items-end">
                  <div>
                    <label className="block text-sm mb-1">{locale==='ar' ? 'سعر المتر المربع' : 'Price per m²'}</label>
                    <Input type="number" min={0} step={1} value={Number.isFinite(pricePerMeter) ? pricePerMeter : 0} onChange={(e)=> { setPricePerMeter(parseFloat(e.target.value || '0')); setAutoPrice(false); }} disabled={autoPrice} placeholder={locale==='ar' ? '0' : '0'} />
                    <div className="text-xs text-muted-foreground mt-1">
                      {(() => {
                        const area = Math.max(0,width) * Math.max(0,height);
                        const accCost = selectedAcc.map(id => accessoriesCatalog.find(a => a.id === id)?.price || 0).reduce((a,b)=>a+b,0);
                        const subtotal = area * (pricePerMeter || 0);
                        const totalOne = subtotal + accCost;
                        const totalCalc = Math.max(0, Math.round(totalOne * Math.max(1, quantity)));
                        return `${locale==='ar' ? 'الحد الأدنى (الإجمالي المحسوب)' : 'Minimum (computed total)'}: ${currency} ${totalCalc.toLocaleString(locale==='ar'?'ar-EG':'en-US')}`;
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-6">
                    <Checkbox checked={autoPrice} onCheckedChange={(v) => setAutoPrice(!!v)} />
                    <span className="text-sm text-muted-foreground">{locale==='ar' ? 'حساب تلقائي' : 'Auto-calculate'}</span>
                  </div>
                </div>
                {/* الكمية */}
                <div>
                  <label className="block text-sm mb-1">{locale==='ar' ? 'الكمية' : 'Quantity'}</label>
                  <Input type="number" min={1} step={1} value={Number.isFinite(quantity) ? quantity : 0} onChange={(e) => setQuantity(parseInt(e.target.value || '0', 10) || 0)} placeholder={locale==='ar' ? '0' : '0'} />
                </div>
                {/* ملحقات */}
                <div className="md:col-span-2 lg:col-span-2">
                  <label className="block text-sm mb-2">{locale==='ar' ? 'ملحقات إضافية' : 'Additional Accessories'}</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {accessoriesCatalog.map(acc => (
                      <label key={acc.id} className="flex items-center gap-2 rounded-md border p-2">
                        <Checkbox checked={selectedAcc.includes(acc.id)} onCheckedChange={(v) => toggleAccessory(acc.id, !!v)} />
                        <span className="text-sm">
                          {locale==='ar' ? acc.ar : acc.en} <span className="text-muted-foreground">- {currency} {acc.price}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                {/* وصف المشروع */}
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm mb-1">{locale==='ar' ? 'وصف المشروع (اختياري)' : 'Project Description (optional)'}</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full border rounded-md p-2 bg-background"
                    placeholder={locale==='ar' ? 'اكتب وصفاً مختصراً للمشروع...' : 'Write a brief description of your project...'}
                  />
                </div>
              </div>

              {/* زر إضافة نسخة جديدة من الفورم */}
              <div className="flex justify-start mt-2">
                <Button onClick={addBlankBuilderBelow} className="flex items-center gap-1" variant="outline">
                  <Plus className="w-4 h-4" /> {locale==='ar' ? 'إضافة مشروع' : 'Add Project'}
                </Button>
              </div>

              {/* Summary */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-2">
                <div className="text-sm text-muted-foreground">
                  {locale==='ar' ? 'المساحة' : 'Area'}: {(Math.max(0,width)*Math.max(0,height)).toFixed(2)} m² • {locale==='ar' ? 'سعر المتر' : 'Price/m²'}: {currency} {pricePerMeter}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-lg font-semibold">
                    {locale==='ar' ? 'الإجمالي التقديري' : 'Estimated Total'}: <span className="text-primary">{currency} {(total || 0).toLocaleString(locale==='ar'?'ar-EG':'en-US')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingId && (
                      <Button variant="outline" onClick={() => { setEditingId(null); resetBuilder(); }}>
                        {locale==='ar' ? 'إلغاء' : 'Cancel'}
                      </Button>
                    )}
                    <Button onClick={confirmProject} disabled={!isComplete} className={!isComplete ? 'opacity-50 cursor-not-allowed' : ''}>
                      {editingId ? (locale==='ar' ? 'حفظ التعديلات' : 'Save Changes') : (locale==='ar' ? 'تأكيد' : 'Confirm')}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Additional Builder Forms */}
        {(showBuilder || !!editingId) && additionalBuilders.length > 0 && (
          <div className="space-y-6 mb-8">
            {additionalBuilders.map((b) => {
              const bAutoPrice = b.autoPrice ? autoPriceFor(b.material, b.ptype) : b.pricePerMeter;
              const effectivePPM = b.autoPrice ? bAutoPrice : b.pricePerMeter;
              const bTotal = isCompleteB({ ...b, pricePerMeter: effectivePPM }) ? computeTotal(b.width, b.height, effectivePPM, b.quantity, b.selectedAcc) : 0;
              return (
                <Card key={b.id}>
                  <CardContent className="p-4 md:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">{locale==='ar' ? 'مشروع إضافي' : 'Additional Project'}</h3>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => addBuilderFrom(b)}>
                          <Plus className="w-4 h-4" /> {locale==='ar' ? 'إضافة مشروع' : 'Add Project'}
                        </Button>
                        <Button variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700 text-white border border-red-600" onClick={() => setAdditionalBuilders(prev => prev.filter(x => x.id !== b.id))}>
                          {locale==='ar' ? 'حذف الفورم' : 'Remove Form'}
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm mb-1">{locale==='ar' ? 'نوع المنتج' : 'Product Type'}</label>
                        <Select value={b.ptype} onValueChange={(v)=> updateBuilder(b.id, { ptype: v, pricePerMeter: b.autoPrice ? autoPriceFor(b.material, v) : b.pricePerMeter })}>
                          <SelectTrigger>
                            <SelectValue placeholder={locale==='ar' ? 'اختر النوع' : 'Select type'} />
                          </SelectTrigger>
                          <SelectContent>
                            {productTypes.map(pt => (
                              <SelectItem key={pt.id} value={pt.id}>{locale==='ar' ? pt.ar : pt.en}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm mb-1">{locale==='ar' ? 'الخامة' : 'Material'}</label>
                        <Select value={b.material} onValueChange={(v)=> updateBuilder(b.id, { material: v, pricePerMeter: b.autoPrice ? autoPriceFor(v, b.ptype) : b.pricePerMeter })}>
                          <SelectTrigger>
                            <SelectValue placeholder={locale==='ar' ? 'اختر الخامة' : 'Select material'} />
                          </SelectTrigger>
                          <SelectContent>
                            {materials.map(m => (
                              <SelectItem key={m.id} value={m.id}>{locale==='ar' ? m.ar : m.en}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-sm mb-1">{locale==='ar' ? 'العرض (متر)' : 'Width (m)'}</label>
                          <Input type="number" min={0} step={0.01} value={Number.isFinite(b.width) ? b.width : 0} onChange={(e)=> updateBuilder(b.id, { width: parseFloat(e.target.value || '0') })} placeholder={locale==='ar' ? '0.00' : '0.00'} />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">{locale==='ar' ? 'الطول (متر)' : 'Height (m)'}</label>
                          <Input type="number" min={0} step={0.01} value={Number.isFinite(b.height) ? b.height : 0} onChange={(e)=> updateBuilder(b.id, { height: parseFloat(e.target.value || '0') })} placeholder={locale==='ar' ? '0.00' : '0.00'} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 items-end">
                        <div>
                          <label className="block text-sm mb-1">{locale==='ar' ? 'سعر المتر المربع' : 'Price per m²'}</label>
                          <Input type="number" min={0} step={1} value={Number.isFinite(effectivePPM) ? effectivePPM : 0} onChange={(e)=> updateBuilder(b.id, { pricePerMeter: parseFloat(e.target.value || '0'), autoPrice: false })} disabled={b.autoPrice} placeholder={locale==='ar' ? '0' : '0'} />
                          <div className="text-xs text-muted-foreground mt-1">
                            {locale==='ar' ? 'الحد الأدنى (الإجمالي المحسوب)' : 'Minimum (computed total)'}: {currency} {bTotal.toLocaleString(locale==='ar'?'ar-EG':'en-US')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-6">
                          <Checkbox checked={b.autoPrice} onCheckedChange={(v) => updateBuilder(b.id, { autoPrice: !!v, pricePerMeter: !!v ? autoPriceFor(b.material, b.ptype) : effectivePPM })} />
                          <span className="text-sm text-muted-foreground">{locale==='ar' ? 'حساب تلقائي' : 'Auto-calculate'}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm mb-1">{locale==='ar' ? 'الكمية' : 'Quantity'}</label>
                        <Input type="number" min={1} step={1} value={Number.isFinite(b.quantity) ? b.quantity : 0} onChange={(e)=> updateBuilder(b.id, { quantity: parseInt(e.target.value || '0', 10) || 0 })} placeholder={locale==='ar' ? '0' : '0'} />
                      </div>
                      <div className="md:col-span-2 lg:col-span-2">
                        <label className="block text-sm mb-2">{locale==='ar' ? 'ملحقات إضافية' : 'Additional Accessories'}</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {accessoriesCatalog.map(acc => (
                            <label key={acc.id} className="flex items-center gap-2 rounded-md border p-2">
                              <Checkbox checked={b.selectedAcc.includes(acc.id)} onCheckedChange={(v) => toggleAccessoryB(b.id, acc.id, !!v)} />
                              <span className="text-sm">
                                {locale==='ar' ? acc.ar : acc.en} <span className="text-muted-foreground">- {currency} {acc.price}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="md:col-span-2 lg:col-span-3">
                        <label className="block text-sm mb-1">{locale==='ar' ? 'وصف المشروع (اختياري)' : 'Project Description (optional)'}</label>
                        <textarea value={b.description} onChange={(e)=> updateBuilder(b.id, { description: e.target.value })} rows={3} className="w-full border rounded-md p-2 bg-background" placeholder={locale==='ar' ? 'اكتب وصفاً مختصراً للمشروع...' : 'Write a brief description of your project...'} />
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-2">
                      <div className="text-sm text-muted-foreground">
                        {locale==='ar' ? 'المساحة' : 'Area'}: {(Math.max(0,b.width)*Math.max(0,b.height)).toFixed(2)} m² • {locale==='ar' ? 'سعر المتر' : 'Price/m²'}: {currency} {effectivePPM}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-lg font-semibold">
                          {locale==='ar' ? 'الإجمالي التقديري' : 'Estimated Total'}: <span className="text-primary">{currency} {bTotal.toLocaleString(locale==='ar'?'ar-EG':'en-US')}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Grand total across all forms */}
        {(showBuilder || !!editingId) && (
        <div className="mb-8">
          {(() => {
            const mainTotal = total || 0;
            const addTotals = additionalBuilders.map(b => {
              const ppm = b.autoPrice ? autoPriceFor(b.material, b.ptype) : b.pricePerMeter;
              return isCompleteB({ ...b, pricePerMeter: ppm }) ? computeTotal(b.width, b.height, ppm, b.quantity, b.selectedAcc) : 0;
            }).reduce((a,b)=>a+b,0);
            const grand = mainTotal + addTotals;
            return (
              <div className="flex items-center justify-between p-4 rounded-md border bg-muted/30">
                <div className="text-sm text-muted-foreground">{locale==='ar' ? 'الإجمالي الكلي لكل المشاريع في النموذج' : 'Grand total for all form projects'}</div>
                <div className="text-xl font-bold text-primary">{currency} {grand.toLocaleString(locale==='ar'?'ar-EG':'en-US')}</div>
              </div>
            );
          })()}
        </div>
        )}

        {/* Toolbar removed to avoid duplicate Add button; search moved inside My Projects card */}

        {/* Content */}
        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          {/* Filters */}
          <aside className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
            <Card className="p-4">
              <CardContent className="space-y-6">
                {/* Type */}
                <div>
                  <h3 className="font-semibold mb-3">{locale==='ar' ? 'نوع المنتج' : 'Product Type'}</h3>
                  <Select value={fType} onValueChange={setFType}>
                    <SelectTrigger>
                      <SelectValue placeholder={locale==='ar' ? 'الكل' : 'All'} />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((tid) => (
                        <SelectItem key={tid} value={tid}>{productTypes.find(pt=>pt.id===tid)?.[locale==='ar'?'ar':'en'] || tid}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Material */}
                <div>
                  <h3 className="font-semibold mb-3">{locale==='ar' ? 'الخامة' : 'Material'}</h3>
                  <Select value={fMaterial} onValueChange={setFMaterial}>
                    <SelectTrigger>
                      <SelectValue placeholder={locale==='ar' ? 'الكل' : 'All'} />
                    </SelectTrigger>
                    <SelectContent>
                      {materialOptions.map((mid) => (
                        <SelectItem key={mid} value={mid}>{materials.find(m=>m.id===mid)?.[locale==='ar'?'ar':'en'] || mid}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Accessories */}
                <div>
                  <h3 className="font-semibold mb-3">{locale==='ar' ? 'الملحقات' : 'Accessories'}</h3>
                  <div className="space-y-2">
                    {accessoryOptions.map((aid) => (
                      <label key={aid} className="flex items-center gap-2">
                        <Checkbox checked={fAcc.includes(aid)} onCheckedChange={(v) => {
                          const checked = !!v;
                          setFAcc(prev => checked ? Array.from(new Set([...prev, aid])) : prev.filter(x=>x!==aid));
                        }} />
                        <span>{accessoriesCatalog.find(a=>a.id===aid)?.[locale==='ar'?'ar':'en'] || aid}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Total price range */}
                <div>
                  <h3 className="font-semibold mb-3">{locale==='ar' ? 'الإجمالي' : 'Total Price'}</h3>
                  <Slider value={priceRange} min={minTotal} max={maxTotal} step={Math.max(1, Math.round((maxTotal-minTotal)/20) || 1)} onValueChange={(v:any)=> setPriceRange([v[0], v[1]])} />
                  <div className="mt-2 text-sm text-muted-foreground">
                    {currency} {priceRange[0]} - {currency} {priceRange[1]}
                  </div>
                </div>

                <Button variant="ghost" className="w-full" onClick={() => {
                  setFType('');
                  setFMaterial('');
                  setFAcc([]);
                  setPriceRange([minTotal, maxTotal]);
                }}>
                  <ArrowUpDown className="w-4 h-4 mr-1" /> {t('resetFilters') || (locale==='ar'?'إعادة تعيين الفلاتر':'Reset filters')}
                </Button>
              </CardContent>
            </Card>
          </aside>

          {/* Results */}
          <section>
            {/* Services Section removed - services should be visible under Vendor Services only */}

            {/* User Projects */}
            {filteredUserProjects.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">{locale==='ar' ? 'المشاريع' : ' Projects'}</h3>
                <div className="space-y-3">
                  {filteredUserProjects.map((up, idx) => {
                    const rawStatus = (up.status || up.Status || '');
                    const norm = normalizeStatus(rawStatus);
                    const statusLc = norm.toLowerCase();
                    const isPending = ['draft','inbidding'].includes(statusLc) || ['pending','pendingapproval','inreview','underreview'].includes(statusLc);
                    // After admin approval (Published) user can edit/delete; also allow during InBidding
                    const isLocked = ['inprogress','bidselected','completed'].includes(statusLc);
                    const localizedStatus = (() => {
                      if (!norm) return locale==='ar' ? 'غير معروف' : 'Unknown';
                      if (statusLc==='draft') return locale==='ar' ? 'مسودة' : 'Draft';
                      if (statusLc==='pending' || statusLc==='pendingapproval' || statusLc==='inreview' || statusLc==='underreview') return locale==='ar' ? 'قيد الاعتماد' : 'Pending Approval';
                      if (statusLc==='inbidding') return locale==='ar' ? 'مفتوح للمناقصات' : 'In Bidding';
                      if (statusLc==='inprogress') return locale==='ar' ? 'قيد التنفيذ' : 'In Progress';
                      if (statusLc==='published') return locale==='ar' ? 'منشور' : 'Published';
                      if (statusLc==='bidselected') return locale==='ar' ? 'تم اختيار عرض' : 'Bid Selected';
                      if (statusLc==='completed') return locale==='ar' ? 'مكتمل' : 'Completed';
                      if (statusLc==='cancelled' || statusLc==='canceled') return locale==='ar' ? 'ملغي' : 'Cancelled';
                      return String(norm);
                    })();
                    return (
                  <Card key={`${String(up.id)}-${idx}`}>
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-medium">{locale==='ar' ? 'نوع' : 'Type'}: {resolveTypeLabel(String(up.ptype || up.type || ''))}</div>
                        <div className="text-sm text-muted-foreground">
                          {locale==='ar' ? 'خامة' : 'Material'}: {resolveMaterialLabel(String(up.ptype || up.type || ''), String(up.material || ''))} • {up.width}×{up.height} m • {locale==='ar' ? 'الكمية' : 'Qty'}: {up.quantity}
                        </div>
                        <div className="mt-1">
                          <Badge variant={isPending ? 'secondary' : (isLocked ? 'default' : 'outline')}>
                            {localizedStatus}
                          </Badge>
                        </div>
                        {up.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {locale==='ar' ? 'الوصف' : 'Description'}: {up.description}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {locale==='ar' ? 'ملحقات' : 'Accessories'}: {(() => {
                            // Prefer admin catalog
                            const typeId = String(up.ptype || up.type || '');
                            const ids: string[] = Array.isArray(up.selectedAcc) ? up.selectedAcc : [];
                            const prod = catalog?.products?.find(p => p.id === typeId);
                            const accs = prod?.accessories || [];
                            const accNames = ids.length && accs.length
                              ? ids.map((id:string) => {
                                  const a = accs.find(x => x.id === id);
                                  return a ? (locale==='ar' ? (a.ar || a.id) : (a.en || a.id)) : null;
                                }).filter(Boolean as any) as string[]
                              : Array.isArray(up.accessories)
                                ? (up.accessories as any[]).map((a:any)=> (locale==='ar'?a.ar:a.en))
                                : Array.isArray(up.selectedAcc)
                                  ? (up.selectedAcc as string[]).map((id:string)=>{ const acc = accessoriesCatalog.find(a=>a.id===id); return acc ? (locale==='ar'?acc.ar:acc.en) : null; }).filter(Boolean as any) as string[]
                                  : [] as string[];
                            return accNames.length>0 ? accNames.join(', ') : (locale==='ar'?'بدون':'None');
                          })()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">{locale==='ar' ? 'الإجمالي' : 'Total'}</div>
                        <div className="text-lg font-semibold text-primary">{currency} {up.total.toLocaleString(locale==='ar'?'ar-EG':'en-US')}</div>
                        <div className="mt-2 flex items-center gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => openInlineDetails(up.id)} aria-label={locale==='ar' ? 'التفاصيل' : 'Details'}>
                            <Eye className="w-4 h-4 ml-1" /> {locale==='ar' ? 'التفاصيل' : 'Details'}
                          </Button>
                          <Button size="sm" variant="secondary" disabled={isLocked} onClick={() => {
                            try {
                              const draft = {
                                id: up.id,
                                ptype: up.ptype || up.type || '',
                                psubtype: up.psubtype || 'normal',
                                material: up.material || '',
                                color: up.color || 'white',
                                width: up.width || 0,
                                height: up.height || 0,
                                quantity: up.quantity || 1,
                                days: Number(up.days) || 1,
                                // normalize accessories ids
                                selectedAcc: Array.isArray(up.selectedAcc)
                                  ? up.selectedAcc
                                  : Array.isArray(up.accessories)
                                    ? up.accessories.map((a:any)=>a?.id).filter(Boolean)
                                    : [],
                                description: up.description || ''
                              };
                              window.localStorage.setItem('edit_project_draft', JSON.stringify(draft));
                              if (Array.isArray((up as any).items) && (up as any).items.length > 0) {
                                const itemsDraft = (up as any).items.map((it:any) => ({
                                  id: it.id || Math.random().toString(36).slice(2),
                                  ptype: it.ptype || it.type || '',
                                  psubtype: it.psubtype || 'normal',
                                  material: it.material || '',
                                  color: it.color || 'white',
                                  width: Number(it.width) || 0,
                                  height: Number(it.height) || 0,
                                  quantity: Number(it.quantity) || 1,
                                  autoPrice: true,
                                  pricePerMeter: Number(it.pricePerMeter) || 0,
                                  selectedAcc: Array.isArray(it.selectedAcc) ? it.selectedAcc : [],
                                  description: it.description || '',
                                }));
                                window.localStorage.setItem('edit_project_items_draft', JSON.stringify(itemsDraft));
                              } else {
                                window.localStorage.removeItem('edit_project_items_draft');
                              }
                            } catch {}
                            setCurrentPage && setCurrentPage('projects-builder');
                            window?.scrollTo?.({ top: 0, behavior: 'smooth' });
                          }} aria-label={locale==='ar' ? 'تعديل' : 'Edit'}>
                            <Pencil className="w-4 h-4 ml-1" /> {locale==='ar' ? 'تعديل' : 'Edit'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700 text-white border border-red-600"
                            disabled={isLocked}
                            onClick={async () => {
                              if (isLocked) return;
                              const ok = window.confirm(locale==='ar' ? 'هل تريد حذف هذا المشروع؟' : 'Delete this project?');
                              if (!ok) return;
                              try {
                                const res = await deleteProject(up.id);
                                if (res.ok) {
                                  // Refresh from backend
                                  const my = await getMyProjects();
                                  if (my.ok && Array.isArray(my.data)) {
                                    const mapped = (my.data as any[]).map((p:any) => ({
                                      id: p.id ?? p._id,
                                      ownerId: currentUserId,
                                      type: p.type || p.ptype || '',
                                      psubtype: p.psubtype || '',
                                      material: p.material || '',
                                      color: p.color || '',
                                      width: Number(p.width)||0,
                                      height: Number(p.height)||0,
                                      quantity: Number(p.quantity)||0,
                                      pricePerMeter: Number(p.pricePerMeter)||0,
                                      selectedAcc: Array.isArray(p.selectedAcc) ? p.selectedAcc : [],
                                      accessories: Array.isArray(p.accessories) ? p.accessories : [],
                                      description: p.description || '',
                                      total: Number(p.total)||0,
                                      createdAt: p.createdAt || new Date().toISOString(),
                                      updatedAt: p.updatedAt || undefined,
                                      days: p.days || 0,
                                      status: p.status || p.Status || '',
                                    }));
                                    setUserProjects(mapped);
                                  } else {
                                    setUserProjects(prev => prev.filter(p => p.id !== up.id));
                                  }
                                } else {
                                  alert(locale==='ar' ? 'تعذر الحذف.' : 'Failed to delete.');
                                }
                              } catch {
                                alert(locale==='ar' ? 'تعذر الحذف.' : 'Failed to delete.');
                              }
                            }}
                            aria-label={locale==='ar' ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="w-4 h-4 ml-1" /> {locale==='ar' ? 'حذف' : 'Delete'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  )})}
                </div>
              </div>
            )}

            {/* Removed non-user results section (only user-added projects remain) */}
          </section>
        </div>
      </div>

      <Footer setCurrentPage={setCurrentPage as any} />

      {/* Inline Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl bg-white/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle>{locale==='ar' ? 'تفاصيل المشروع' : 'Project Details'}</DialogTitle>
          </DialogHeader>
          {detailsLoading ? (
            <div className="p-2 text-sm text-muted-foreground">{locale==='ar' ? 'جارٍ التحميل...' : 'Loading...'}</div>
          ) : !detailsProject ? (
            <div className="p-2 text-sm text-red-600">{locale==='ar' ? 'تعذر تحميل التفاصيل' : 'Failed to load details'}</div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">{locale==='ar' ? 'النوع:' : 'Type:'}</span> {resolveTypeLabel(String(detailsProject.ptype || detailsProject.type || '')) || (detailsProject.type||'-')}</div>
                <div><span className="text-muted-foreground">{locale==='ar' ? 'الخامة:' : 'Material:'}</span> {resolveMaterialLabel(String(detailsProject.ptype || detailsProject.type || ''), String(detailsProject.material || '')) || detailsProject.material || '-'}</div>
                <div><span className="text-muted-foreground">{locale==='ar' ? 'الأبعاد:' : 'Dimensions:'}</span> {detailsProject.width} × {detailsProject.height} m</div>
                <div><span className="text-muted-foreground">{locale==='ar' ? 'الكمية:' : 'Quantity:'}</span> {detailsProject.quantity}</div>
                <div><span className="text-muted-foreground">{locale==='ar' ? 'أيام التنفيذ:' : 'Days:'}</span> {detailsProject.days || '-'}</div>
                <div><span className="text-muted-foreground">{locale==='ar' ? 'سعر المتر:' : 'Price/m²:'}</span> {detailsProject.pricePerMeter || 0} {locale==='ar' ? 'ر.س' : 'SAR'}</div>
                <div><span className="text-muted-foreground">{locale==='ar' ? 'الإجمالي:' : 'Total:'}</span> {(detailsProject.total || 0).toLocaleString(locale==='ar'?'ar-EG':'en-US')} {locale==='ar' ? 'ر.س' : 'SAR'}</div>
                {(() => {
                  const rawStatus = detailsProject?.status || detailsProject?.Status || detailsProject?.state || detailsProject?.State || '';
                  const byApproval = (detailsProject?.isApproved === false || detailsProject?.approved === false)
                    ? 'PendingApproval'
                    : ((detailsProject?.isApproved === true || detailsProject?.approved === true) ? (rawStatus || 'Published') : rawStatus);
                  const norm = normalizeStatus(byApproval || rawStatus).toLowerCase();
                  const localized = (() => {
                    if (!norm) return locale==='ar' ? 'غير معروف' : 'Unknown';
                    if (norm==='draft') return locale==='ar' ? 'مسودة' : 'Draft';
                    if (['pending','pendingapproval','inreview','underreview'].includes(norm)) return locale==='ar' ? 'قيد الاعتماد' : 'Pending Approval';
                    if (norm==='inbidding') return locale==='ar' ? 'مفتوح للمناقصات' : 'In Bidding';
                    if (norm==='published') return locale==='ar' ? 'منشور' : 'Published';
                    if (norm==='inprogress') return locale==='ar' ? 'قيد التنفيذ' : 'In Progress';
                    if (norm==='bidselected') return locale==='ar' ? 'تم اختيار عرض' : 'Bid Selected';
                    if (norm==='completed') return locale==='ar' ? 'مكتمل' : 'Completed';
                    if (norm==='cancelled' || norm==='canceled') return locale==='ar' ? 'ملغي' : 'Cancelled';
                    return norm;
                  })();
                  return (
                    <div><span className="text-muted-foreground">{locale==='ar' ? 'الحالة:' : 'Status:'}</span> {localized}</div>
                  );
                })()}
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">{locale==='ar' ? 'الملحقات' : 'Accessories'}</div>
                {(() => {
                  const ids: string[] = Array.isArray(detailsProject.selectedAcc) ? detailsProject.selectedAcc : [];
                  const names = ids.map((id:string)=> accessoriesCatalog.find(a=>a.id===id)?.[locale==='ar'?'ar':'en'] || id).filter(Boolean);
                  return names.length ? (
                    <div className="flex flex-wrap gap-2">{names.map((n,i)=>(<span key={i} className="px-2 py-1 rounded border text-xs">{n}</span>))}</div>
                  ) : (
                    <div className="text-sm text-muted-foreground">{locale==='ar' ? 'بدون' : 'None'}</div>
                  );
                })()}
              </div>
              {detailsProject.description && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{locale==='ar' ? 'الوصف' : 'Description'}</div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 border rounded p-3">{detailsProject.description}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
