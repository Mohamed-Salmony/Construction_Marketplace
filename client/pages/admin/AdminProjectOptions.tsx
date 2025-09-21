import React from 'react';
import Header from '../../components/Header';
import type { RouteContext } from '../../components/routerTypes';
import { useTranslation } from '../../hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { getAdminOption, setAdminOption } from '@/services/admin';
import { toastError, toastSuccess } from '../../utils/alerts';
import { useFirstLoadOverlay } from '../../hooks/useFirstLoadOverlay';

type Labeled = { id: string; en?: string; ar?: string };
type Accessory = { id: string; en?: string; ar?: string; price?: number };
type Dimensions = { width?: boolean; height?: boolean; length?: boolean };
// Material with price, attached under a specific subtype
type MaterialWithPrice = { id: string; en?: string; ar?: string; pricePerM2?: number };
// Subtype now can contain its own materials list
type SubtypeCfg = { id: string; en?: string; ar?: string; materials?: MaterialWithPrice[] };
type ProductCfg = {
  id: string;
  en?: string; ar?: string;
  dimensions?: Dimensions;
  // Default price (used for legacy/back-compat or when material price not set)
  basePricePerM2?: number;
  subtypes?: SubtypeCfg[];
  // Keep legacy flat materials to sync old keys (derived from subtypes.materials)
  materials?: Labeled[];
  colors?: Labeled[];
  accessories?: Accessory[];
};

type Catalog = { products: ProductCfg[] };

export default function AdminProjectOptions({ setCurrentPage, ...rest }: Partial<RouteContext>) {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';
  const hideFirstOverlay = useFirstLoadOverlay(rest, isAr ? 'جاري تحميل خيارات المشاريع' : 'Loading project options', isAr ? 'يرجى الانتظار' : 'Please wait');

  const [loading, setLoading] = React.useState(true);
  const [products, setProducts] = React.useState<ProductCfg[]>([]);

  // New product card visibility
  const [showNewCard, setShowNewCard] = React.useState(false);
  // Draft inputs for adding items
  const [newProduct, setNewProduct] = React.useState<ProductCfg>({ id: '', en: '', ar: '', dimensions: { width: true, height: true }, basePricePerM2: 0, subtypes: [], materials: [], colors: [], accessories: [] });
  // New-product inline collections
  const [npSubtypes, setNpSubtypes] = React.useState<SubtypeCfg[]>([]);
  // For new product, materials are added under a selected subtype
  const [npSelectedSubtypeForMaterial, setNpSelectedSubtypeForMaterial] = React.useState<string>('');
  const [npColors, setNpColors] = React.useState<Labeled[]>([]);
  const [npAccessories, setNpAccessories] = React.useState<Accessory[]>([]);
  const [npDraftSubtype, setNpDraftSubtype] = React.useState<Labeled>({ id: '', ar: '', en: '' });
  const [npDraftMaterial, setNpDraftMaterial] = React.useState<MaterialWithPrice>({ id: '', ar: '', en: '', pricePerM2: 0 });
  const [npDraftColor, setNpDraftColor] = React.useState<Labeled>({ id: '', ar: '', en: '' });
  const [npDraftAccessory, setNpDraftAccessory] = React.useState<Accessory>({ id: '', ar: '', en: '', price: 0 });
  const [draftSubtype, setDraftSubtype] = React.useState<{ [pid: string]: Labeled }>({});
  // Per product and per subtype draft material
  const [draftMaterial, setDraftMaterial] = React.useState<{ [pid: string]: { [subId: string]: MaterialWithPrice } }>({});
  // Selected subtype per product for adding new material
  const [selectedSubtypeForMaterial, setSelectedSubtypeForMaterial] = React.useState<{ [pid: string]: string }>({});
  const [draftColor, setDraftColor] = React.useState<{ [pid: string]: Labeled }>({});
  const [draftAccessory, setDraftAccessory] = React.useState<{ [pid: string]: Accessory }>({});

  // Inline validation states for new product
  const newProdName = (newProduct.en || newProduct.ar || '').trim();
  const newProdNameInvalid = newProdName.length === 0;
  const newProdPriceInvalid = !(Number(newProduct.basePricePerM2) > 0);
  const newProdDimsInvalid = !(!!newProduct.dimensions?.width || !!newProduct.dimensions?.height || !!newProduct.dimensions?.length);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Prefer unified catalog key
        const catalogRes = await getAdminOption('project_catalog');
        if (catalogRes.ok && catalogRes.data) {
          try {
            const val = JSON.parse((catalogRes.data as any).value || '{}');
            if (!cancelled && val && Array.isArray(val.products)) {
              // Normalize any legacy structures to the new shape
              const normalized: ProductCfg[] = (val.products as ProductCfg[]).map(p => {
                const subtypes: SubtypeCfg[] = (p.subtypes as any[] || []).map((s: any) => ({
                  id: String((s && s.id) || ''),
                  ar: s?.ar, en: s?.en,
                  materials: Array.isArray((s as any)?.materials) ? (s.materials as any[]).map(m => ({
                    id: String((m && m.id) || ''), ar: m?.ar, en: m?.en, pricePerM2: Number((m as any)?.pricePerM2 || 0) || undefined,
                  })) : [],
                })).filter(s => s.id);
                return {
                  ...p,
                  subtypes,
                  // Keep legacy materials list as a flattened list of labels (without price)
                  materials: Array.from(new Map(
                    subtypes.flatMap(s => (s.materials||[])).map(m => [m.id, { id: m.id, ar: m.ar, en: m.en }])
                  ).values()),
                } as ProductCfg;
              });
              setProducts(normalized);
              setLoading(false);
              return;
            }
          } catch {}
        }
        // Fallback: build from legacy keys
        const [types, mats, rules] = await Promise.all([
          getAdminOption('project_types'),
          getAdminOption('project_materials'),
          getAdminOption('project_price_rules'),
        ]);
        const typeArr: Labeled[] = (() => { try { const v = JSON.parse((types.data as any)?.value || '[]'); if (Array.isArray(v)) return v.map((x:any)=> typeof x==='string'? {id:x}:{id:String(x.id||x.value||''), en:x.en, ar:x.ar}).filter((x:any)=>x.id); } catch{} return []; })();
        const matArr: Labeled[] = (() => { try { const v = JSON.parse((mats.data as any)?.value || '[]'); if (Array.isArray(v)) return v.map((x:any)=> typeof x==='string'? {id:x}:{id:String(x.id||x.value||''), en:x.en, ar:x.ar}).filter((x:any)=>x.id); } catch{} return []; })();
        const priceRules: Record<string, number> = (() => { try { const v = JSON.parse((rules.data as any)?.value || '{}'); if (v && typeof v==='object') return v; } catch{} return {}; })();
        const built: ProductCfg[] = typeArr.map(t => ({ id: t.id, en: t.en, ar: t.ar, dimensions: { width: true, height: true }, basePricePerM2: Number(priceRules[t.id]||0), subtypes: [], materials: matArr, colors: [], accessories: [] }));
        if (!cancelled) setProducts(built);
      } catch {
        if (!cancelled) toastError(isAr ? 'تعذر تحميل الإعدادات' : 'Failed to load options', isAr);
      } finally { if (!cancelled) { setLoading(false); hideFirstOverlay(); } }
    })();
    return () => { cancelled = true; };
  }, [isAr, hideFirstOverlay]);

  const slugify = (s: string) => {
    return String(s || '')
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  };
  const norm = (s?: string) => String(s || '').trim().toLowerCase();

  const saveAllWith = async (prodList: ProductCfg[]) => {
    try {
      const catalog: Catalog = { products: prodList };
      const r = await setAdminOption('project_catalog', catalog);
      // Also sync legacy keys for compatibility with current builder
      const types = prodList.map(p => ({ id: p.id, en: p.en, ar: p.ar }));
      // Flatten materials from all subtypes for legacy key
      const materials = Array.from(new Map(
        prodList.flatMap(p => (p.subtypes||[]).flatMap(st => (st.materials||[]))).map(m => [m.id, { id: m.id, en: m.en, ar: m.ar }])
      ).values());
      const priceRules: Record<string, number> = {};
      prodList.forEach(p => { if (Number.isFinite(p.basePricePerM2||0)) priceRules[p.id] = Number(p.basePricePerM2||0); });
      await Promise.all([
        setAdminOption('project_types', types),
        setAdminOption('project_materials', materials),
        setAdminOption('project_price_rules', priceRules),
      ]);
      if (r.ok) {
        // Re-fetch to verify persistence and refresh local state
        const verify = await getAdminOption('project_catalog');
        try {
          const val = JSON.parse((verify.data as any)?.value || '{}');
          if (val && Array.isArray(val.products)) {
            setProducts(val.products as ProductCfg[]);
            toastSuccess(isAr ? 'تم الحفظ' : 'Saved', isAr);
          } else {
            toastError(isAr ? 'تم الحفظ، لكن لم يتم التحقق من البيانات' : 'Saved, but verification failed', isAr);
          }
        } catch {
          toastError(isAr ? 'تم الحفظ، لكن لم يتم التحقق من البيانات' : 'Saved, but verification failed', isAr);
        }
      } else {
        toastError(isAr ? 'فشل الحفظ' : 'Save failed', isAr);
      }
    } catch {
      toastError(isAr ? 'حدث خطأ أثناء الحفظ' : 'Failed to save', isAr);
    }
  };

  const saveAll = async () => saveAllWith(products);

  const updateProduct = (idx: number, patch: Partial<ProductCfg>) => {
    setProducts(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  };

  const removeProduct = (idx: number) => {
    applyAndSave(prev => prev.filter((_, i) => i !== idx));
  };

  const addProduct = async () => {
    // Auto-generate ID from AR/EN name
    const baseName = newProduct.en?.trim() || newProduct.ar?.trim() || '';
    if (!baseName) { toastError(isAr? 'أدخل اسم المنتج':'Enter product name', isAr); return; }
    if (!(Number(newProduct.basePricePerM2) > 0)) { toastError(isAr? 'أدخل سعرًا صحيحًا للمتر':'Enter a valid base price per m²', isAr); return; }
    const hasAnyDim = !!newProduct.dimensions?.width || !!newProduct.dimensions?.height || !!newProduct.dimensions?.length;
    if (!hasAnyDim) { toastError(isAr? 'اختر بُعدًا واحدًا على الأقل (عرض/ارتفاع/طول)':'Select at least one dimension (width/height/length)', isAr); return; }
    const existing = new Set(products.map(p => p.id));
    let id = slugify(baseName);
    if (!id) id = `prod-${products.length+1}`;
    let i = 1;
    let unique = id;
    while (existing.has(unique)) { unique = `${id}-${i++}`; }
    const nextList = [
      ...products,
      { ...newProduct, id: unique, subtypes: [...npSubtypes], materials: Array.from(new Map(npSubtypes.flatMap(st => (st.materials||[])).map(m => [m.id, { id: m.id, en: m.en, ar: m.ar }])).values()), colors: [...npColors], accessories: [...npAccessories] },
    ];
    await saveAllWith(nextList);
    // Clear drafts after persistence attempt; toasts are handled inside saveAllWith
    setNewProduct({ id: '', en: '', ar: '', dimensions: { width: true, height: true }, basePricePerM2: 0, subtypes: [], materials: [], colors: [], accessories: [] });
    setNpSubtypes([]); setNpColors([]); setNpAccessories([]);
    setNpSelectedSubtypeForMaterial('');
    setNpDraftSubtype({ id: '', ar: '', en: '' }); setNpDraftMaterial({ id: '', ar: '', en: '', pricePerM2: 0 }); setNpDraftColor({ id: '', ar: '', en: '' }); setNpDraftAccessory({ id: '', price: 0 });
    setShowNewCard(false);
  };

  const applyAndSave = (compute: (prev: ProductCfg[]) => ProductCfg[]) => {
    const next = compute(products);
    setProducts(next);
    setTimeout(() => { void saveAllWith(next); }, 0);
  };

  const addLabeled = (pid: string, kind: 'subtypes'|'materials'|'colors', item: Labeled) => {
    if (!item.id) return;
    // Special handling: when adding subtype, ensure correct structure
    if (kind === 'subtypes') {
      applyAndSave(prev => prev.map(p => p.id!==pid ? p : { ...p, subtypes: [ ...(p.subtypes as SubtypeCfg[] || []), { id: item.id.trim(), en: item.en, ar: item.ar, materials: [] } ] }));
    } else {
      applyAndSave(prev => prev.map(p => p.id!==pid ? p : { ...p, [kind]: [ ...(p[kind] as Labeled[] || []), { id: item.id.trim(), en: item.en, ar: item.ar } ] }));
    }
  };
  const delLabeled = (pid: string, kind: 'subtypes'|'materials'|'colors', id: string) => {
    if (kind === 'subtypes') {
      // Removing a subtype also removes its materials
      applyAndSave(prev => prev.map(p => p.id!==pid ? p : { ...p, subtypes: (p.subtypes as SubtypeCfg[] || []).filter(x=>x.id!==id) }));
    } else if (kind === 'materials') {
      // Materials should be removed from all subtypes (safety)
      applyAndSave(prev => prev.map(p => p.id!==pid ? p : { ...p, subtypes: (p.subtypes||[]).map(st => ({ ...st, materials: (st.materials||[]).filter(m => m.id !== id) })) }));
    } else {
      applyAndSave(prev => prev.map(p => p.id!==pid ? p : { ...p, [kind]: (p[kind] as Labeled[] || []).filter(x=>x.id!==id) }));
    }
  };
  const addMaterialToSubtype = (pid: string, subId: string, mat: MaterialWithPrice) => {
    const name = (mat.ar || mat.en || '').trim();
    if (!name) return;
    const genId = slugify(mat.en || mat.ar || '');
    applyAndSave(prev => prev.map(p => {
      if (p.id !== pid) return p;
      const target = (p.subtypes||[]).find(st => st.id === subId);
      const dup = (target?.materials||[]).some(m => (mat.ar && norm(m.ar)===norm(mat.ar)) || (mat.en && norm(m.en)===norm(mat.en)) );
      if (dup) {
        toastError(isAr? 'هذه الخامة موجودة بالفعل ضمن هذا النوع':'This material already exists in this subtype', isAr);
        return p;
      }
      return {
        ...p,
        subtypes: (p.subtypes||[]).map(st => st.id !== subId ? st : {
          ...st,
          materials: [ ...(st.materials||[]), { id: genId || `mat-${((st.materials||[]).length)+1}`, en: mat.en, ar: mat.ar, pricePerM2: Number(mat.pricePerM2||0) || undefined } ]
        }),
        // Keep legacy flat materials synced
        materials: Array.from(new Map(
          (p.subtypes||[]).flatMap(s => (s.materials||[])).concat([{ id: genId || `mat-temp`, en: mat.en, ar: mat.ar } as any]).map((m: any) => [m.id, { id: m.id, en: m.en, ar: m.ar }])
        ).values()),
      } as ProductCfg;
    }));
  };
  const delMaterialFromSubtype = (pid: string, subId: string, matId: string) => {
    applyAndSave(prev => prev.map(p => {
      if (p.id !== pid) return p;
      const nextSubtypes = (p.subtypes||[]).map(st => st.id !== subId ? st : ({ ...st, materials: (st.materials||[]).filter(m => m.id !== matId) }));
      return {
        ...p,
        subtypes: nextSubtypes,
        materials: Array.from(new Map(
          nextSubtypes.flatMap(s => (s.materials||[])).map(m => [m.id, { id: m.id, en: m.en, ar: m.ar }])
        ).values()),
      } as ProductCfg;
    }));
  };
  const addAccessory = (pid: string, acc: Accessory) => {
    const name = (acc.ar || acc.en || '').trim();
    if (!name) return;
    const genId = slugify(acc.en || acc.ar || '');
    applyAndSave(prev => prev.map(p => {
      if (p.id !== pid) return p;
      const id = genId || `acc-${((p.accessories||[]).length)+1}`;
      return { ...p, accessories: [ ...(p.accessories||[]), { id, en: acc.en, ar: acc.ar, price: Number(acc.price||0) } ] };
    }));
  };
  const delAccessory = (pid: string, id: string) => {
    applyAndSave(prev => prev.map(p => p.id!==pid ? p : { ...p, accessories: (p.accessories||[]).filter(x=>x.id!==id) }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header {...(rest as any)} />
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{isAr ? 'إعدادات كتالوج المشاريع' : 'Project Catalog Settings'}</h1>
          <p className="text-muted-foreground">{isAr ? 'إدارة المنتجات والأنواع الفرعية والخامات والألوان والملحقات وقواعد التسعير' : 'Manage products, subtypes, materials, colors, accessories and price rules'}</p>
        </div>

        {/* Toolbar: Add new product */}
        <div className="flex justify-end">
          {!showNewCard && (
            <Button onClick={()=> setShowNewCard(true)}>{isAr ? 'إضافة منتج جديد' : 'Add New Product'}</Button>
          )}
        </div>

        {/* New product big card (shown on demand) */}
        {showNewCard && (
        <Card>
          <CardHeader>
            <CardTitle>{isAr ? 'منتج جديد' : 'New Product'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs block mb-1">{isAr? 'الاسم (عربي)':'Name (Arabic)'}
                </label>
                <Input value={newProduct.ar} onChange={(e)=>setNewProduct(p=>({...p, ar: e.target.value}))} placeholder={isAr? 'باب':'باب'} />
                {newProdNameInvalid && (
                  <div className="text-[11px] text-red-600 mt-1">{isAr ? 'الاسم مطلوب (عربي أو إنجليزي)' : 'Name is required (Arabic or English)'}</div>
                )}
              </div>
              <div>
                <label className="text-xs block mb-1">{isAr? 'الاسم (إنجليزي)':'Name (English)'}
                </label>
                <Input value={newProduct.en} onChange={(e)=>setNewProduct(p=>({...p, en: e.target.value}))} placeholder="Door" />
                {newProdNameInvalid && (
                  <div className="text-[11px] text-red-600 mt-1">{isAr ? 'الاسم مطلوب (عربي أو إنجليزي)' : 'Name is required (Arabic or English)'}</div>
                )}
              </div>
              {/* Removed base price field as requested */}
              <div className="col-span-1 md:col-span-2 lg:col-span-4 grid grid-cols-3 gap-3">
                <label className="text-xs col-span-3">{isAr? 'الأبعاد المطلوبة':'Required dimensions'}</label>
                <div className="flex items-center gap-2"><input type="checkbox" checked={!!newProduct.dimensions?.width} onChange={(e)=>setNewProduct(p=>({...p, dimensions:{ ...(p.dimensions||{}), width: e.target.checked }}))} /> <span>{isAr ? 'العرض' : 'Width'}</span></div>
                <div className="flex items-center gap-2"><input type="checkbox" checked={!!newProduct.dimensions?.height} onChange={(e)=>setNewProduct(p=>({...p, dimensions:{ ...(p.dimensions||{}), height: e.target.checked }}))} /> <span>{isAr ? 'الارتفاع' : 'Height'}</span></div>
                <div className="flex items-center gap-2"><input type="checkbox" checked={!!newProduct.dimensions?.length} onChange={(e)=>setNewProduct(p=>({...p, dimensions:{ ...(p.dimensions||{}), length: e.target.checked }}))} /> <span>{isAr ? 'الطول' : 'Length'}</span></div>
                {newProdDimsInvalid && (
                  <div className="col-span-3 text-[11px] text-red-600">{isAr ? 'اختر بُعدًا واحدًا على الأقل (عرض/ارتفاع/طول)' : 'Select at least one dimension (width/height/length)'}</div>
                )}
              </div>
            </div>

            {/* New product subtypes */}
            <div className="space-y-2">
              <div className="font-medium">{isAr ? 'الأنواع الفرعية' : 'Subtypes'}</div>
              <div className="flex flex-wrap gap-2">
                {npSubtypes.map(s => (
                  <span key={s.id} className="inline-flex items-center gap-2 text-xs border rounded px-2 py-1">
                    {isAr ? (s.ar || s.id) : (s.en || s.id)}
                    <button onClick={()=> setNpSubtypes(prev => prev.filter(x=>x.id!==s.id))}>×</button>
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input placeholder={isAr?'عربي':'Arabic'} value={npDraftSubtype.ar || ''} onChange={(e)=> setNpDraftSubtype(prev => ({ ...prev, ar: e.target.value }))} />
                <Input placeholder={isAr?'إنجليزي':'English'} value={npDraftSubtype.en || ''} onChange={(e)=> setNpDraftSubtype(prev => ({ ...prev, en: e.target.value }))} />
                <div className="col-span-1 md:col-span-1 flex items-end">
                  <Button size="sm" variant="outline" disabled={!((npDraftSubtype.ar||'').trim()||(npDraftSubtype.en||'').trim())} onClick={()=>{
                    const name = (npDraftSubtype.ar || npDraftSubtype.en || '').trim();
                    if (!name) return;
                    // duplicate check within new product draft subtypes
                    const exists = npSubtypes.some(s => (npDraftSubtype.ar && norm(s.ar)===norm(npDraftSubtype.ar)) || (npDraftSubtype.en && norm(s.en)===norm(npDraftSubtype.en)) );
                    if (exists) { toastError(isAr? 'هذا النوع موجود بالفعل لهذا المنتج':'This subtype already exists for this product', isAr); return; }
                    const id = slugify(npDraftSubtype.en || npDraftSubtype.ar || '');
                    setNpSubtypes(prev => [...prev, { id: id || `sub-${prev.length+1}` , ar: npDraftSubtype.ar, en: npDraftSubtype.en }]);
                    setNpDraftSubtype({ id: '', ar: '', en: '' });
                  }}>{isAr?'إضافة نوع':'Add subtype'}</Button>
                </div>
              </div>
              {!( (npDraftSubtype.ar||'').trim() || (npDraftSubtype.en||'').trim() ) && (
                <div className="text-[11px] text-red-600">{isAr ? 'أدخل اسم النوع بالعربي أو الإنجليزي' : 'Enter subtype name in Arabic or English'}</div>
              )}
            </div>

            {/* New product materials under subtype with price */}
            <div className="space-y-2">
              <div className="font-medium">{isAr ? 'الخامات حسب النوع + السعر' : 'Materials per subtype + price'}</div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div className="md:col-span-1">
                  <label className="text-xs block mb-1">{isAr? 'اختر النوع':'Select subtype'}</label>
                  <select className="w-full border rounded px-2 py-2 text-sm" value={npSelectedSubtypeForMaterial} onChange={(e)=> setNpSelectedSubtypeForMaterial(e.target.value)}>
                    <option value="">{isAr? '— اختر —':'— Select —'}</option>
                    {npSubtypes.map(st => (
                      <option key={st.id} value={st.id}>{isAr ? (st.ar || st.id) : (st.en || st.id)}</option>
                    ))}
                  </select>
                </div>
                <Input placeholder={isAr?'اسم الخامة (عربي)':'Material name (Arabic)'} value={npDraftMaterial.ar || ''} onChange={(e)=> setNpDraftMaterial(prev => ({ ...prev, ar: e.target.value }))} />
                <Input placeholder={isAr?'اسم الخامة (إنجليزي)':'Material name (English)'} value={npDraftMaterial.en || ''} onChange={(e)=> setNpDraftMaterial(prev => ({ ...prev, en: e.target.value }))} />
                <Input placeholder={isAr?'السعر المتر المربع':'Price per m²'} type="number" inputMode="decimal" value={npDraftMaterial.pricePerM2 || ''} onChange={(e)=> setNpDraftMaterial(prev => ({ ...prev, pricePerM2: e.target.value ? Number(e.target.value) : undefined }))} />
                <div className="col-span-1 md:col-span-4">
                  <Button size="sm" variant="outline" disabled={!npSelectedSubtypeForMaterial || !((npDraftMaterial.ar||npDraftMaterial.en||'').trim())} onClick={()=>{
                    const name = (npDraftMaterial.ar || npDraftMaterial.en || '').trim();
                    if (!name || !npSelectedSubtypeForMaterial) return;
                    // Duplicate check by AR/EN within the selected subtype
                    const target = npSubtypes.find(s => s.id === npSelectedSubtypeForMaterial);
                    const exists = (target?.materials||[]).some(m => (npDraftMaterial.ar && norm(m.ar)===norm(npDraftMaterial.ar)) || (npDraftMaterial.en && norm(m.en)===norm(npDraftMaterial.en)) );
                    if (exists) { toastError(isAr? 'هذه الخامة موجودة بالفعل ضمن هذا النوع':'This material already exists in this subtype', isAr); return; }
                    const id = slugify(npDraftMaterial.en || npDraftMaterial.ar || '');
                    setNpSubtypes(prev => prev.map(s => s.id!==npSelectedSubtypeForMaterial ? s : ({
                      ...s,
                      materials: [ ...(s.materials||[]), { id: id || `mat-${(s.materials||[]).length+1}`, ar: npDraftMaterial.ar, en: npDraftMaterial.en, pricePerM2: Number(npDraftMaterial.pricePerM2||0) || undefined } ]
                    })));
                    setNpDraftMaterial({ id: '', ar: '', en: '', pricePerM2: undefined });
                  }}>{isAr?'إضافة خامة للنوع':'Add material to subtype'}</Button>
                </div>
              </div>
              {!( (npDraftMaterial.ar||'').trim() || (npDraftMaterial.en||'').trim() ) && (
                <div className="text-[11px] text-red-600">{isAr ? 'أدخل اسم الخامة بالعربي أو الإنجليزي' : 'Enter material name in Arabic or English'}</div>
              )}
              {/* Preview materials grouped by subtype */}
              <div className="space-y-2">
                {npSubtypes.map(st => (
                  <div key={st.id} className="border rounded p-2">
                    <div className="text-sm font-medium mb-2">{isAr ? 'النوع:' : 'Subtype:'} {isAr ? (st.ar || st.id) : (st.en || st.id)}</div>
                    <div className="flex flex-wrap gap-2">
                      {(st.materials||[]).map(m => (
                        <span key={m.id} className="inline-flex items-center gap-2 text-xs border rounded px-2 py-1">
                          {(isAr ? (m.ar || m.id) : (m.en || m.id)) + (Number.isFinite(m.pricePerM2 as any) && m.pricePerM2 ? ` • ${Number(m.pricePerM2||0)}` : '')}
                          <button onClick={()=> setNpSubtypes(prev => prev.map(s => s.id!==st.id ? s : ({ ...s, materials: (s.materials||[]).filter(x=>x.id!==m.id) })))}>×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* New product colors */}
            <div className="space-y-2">
              <div className="font-medium">{isAr ? 'الألوان' : 'Colors'}</div>
              <div className="flex flex-wrap gap-2">
                {npColors.map(s => (
                  <span key={s.id} className="inline-flex items-center gap-2 text-xs border rounded px-2 py-1">
                    {isAr ? (s.ar || s.id) : (s.en || s.id)}
                    <button onClick={()=> setNpColors(prev => prev.filter(x=>x.id!==s.id))}>×</button>
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input placeholder={isAr?'عربي':'Arabic'} value={npDraftColor.ar || ''} onChange={(e)=> setNpDraftColor(prev => ({ ...prev, ar: e.target.value }))} />
                <Input placeholder={isAr?'إنجليزي':'English'} value={npDraftColor.en || ''} onChange={(e)=> setNpDraftColor(prev => ({ ...prev, en: e.target.value }))} />
                <div className="col-span-1 md:col-span-1 flex items-end">
                  <Button size="sm" variant="outline" disabled={!((npDraftColor.ar||'').trim()||(npDraftColor.en||'').trim())} onClick={()=>{
                    const name = (npDraftColor.ar || npDraftColor.en || '').trim();
                    if (!name) return;
                    // duplicate check (by AR or EN)
                    const exists = npColors.some(c => (npDraftColor.ar && norm(c.ar)===norm(npDraftColor.ar)) || (npDraftColor.en && norm(c.en)===norm(npDraftColor.en)) );
                    if (exists) { toastError(isAr? 'هذا اللون موجود بالفعل لهذا المنتج':'This color already exists for this product', isAr); return; }
                    const id = slugify(npDraftColor.en || npDraftColor.ar || '');
                    setNpColors(prev => [...prev, { id: id || `col-${prev.length+1}`, ar: npDraftColor.ar, en: npDraftColor.en }]);
                    setNpDraftColor({ id: '', ar: '', en: '' });
                  }}>{isAr?'إضافة لون':'Add color'}</Button>
                </div>
              </div>
              {!( (npDraftColor.ar||'').trim() || (npDraftColor.en||'').trim() ) && (
                <div className="text-[11px] text-red-600">{isAr ? 'أدخل اسم اللون بالعربي أو الإنجليزي' : 'Enter color name in Arabic or English'}</div>
              )}
            </div>

            {/* New product accessories */}
            <div className="space-y-2">
              <div className="font-medium">{isAr ? 'الملحقات' : 'Accessories'}</div>
              <div className="flex flex-wrap gap-2">
                {npAccessories.map(s => (
                  <span key={s.id} className="inline-flex items-center gap-2 text-xs border rounded px-2 py-1">
                    {(isAr ? (s.ar || s.id) : (s.en || s.id)) + (Number.isFinite(s.price as any) ? ` • ${Number(s.price||0)}` : '')}
                    <button onClick={()=> setNpAccessories(prev => prev.filter(x=>x.id!==s.id))}>×</button>
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input placeholder={isAr?'عربي':'Arabic'} value={npDraftAccessory.ar || ''} onChange={(e)=> setNpDraftAccessory(prev => ({ ...prev, ar: e.target.value }))} />
                <Input placeholder={isAr?'إنجليزي':'English'} value={npDraftAccessory.en || ''} onChange={(e)=> setNpDraftAccessory(prev => ({ ...prev, en: e.target.value }))} />
                <Input placeholder={isAr?'السعر':'Price'} type="number" inputMode="decimal" value={Number(npDraftAccessory.price || 0)} onChange={(e)=> setNpDraftAccessory(prev => ({ ...prev, price: Number(e.target.value || 0) }))} />
                <div className="col-span-1 md:col-span-3">
                  <Button size="sm" variant="outline" disabled={!((npDraftAccessory.ar||npDraftAccessory.en||'').trim())} onClick={()=>{
                    const name = (npDraftAccessory.ar || npDraftAccessory.en || '').trim();
                    if (!name) return;
                    // duplicate check by AR/EN
                    const exists = npAccessories.some(a => (npDraftAccessory.ar && norm(a.ar)===norm(npDraftAccessory.ar)) || (npDraftAccessory.en && norm(a.en)===norm(npDraftAccessory.en)) );
                    if (exists) { toastError(isAr? 'هذا الملحق موجود بالفعل لهذا المنتج':'This accessory already exists for this product', isAr); return; }
                    const genId = slugify(npDraftAccessory.en || npDraftAccessory.ar || '');
                    setNpAccessories(prev => [...prev, { id: genId || `acc-${prev.length+1}`, ar: npDraftAccessory.ar, en: npDraftAccessory.en, price: Number(npDraftAccessory.price||0) }]);
                    setNpDraftAccessory({ id: '', ar: '', en: '', price: 0 });
                  }}>{isAr?'إضافة ملحق':'Add accessory'}</Button>
                </div>
              </div>
              {!( (npDraftAccessory.ar||'').trim() || (npDraftAccessory.en||'').trim() ) && (
                <div className="text-[11px] text-red-600">{isAr ? 'أدخل اسم الملحق بالعربي أو الإنجليزي' : 'Enter accessory name in Arabic or English'}</div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={addProduct} disabled={loading}>{isAr ? 'حفظ المنتج' : 'Save Product'}</Button>
              <Button variant="outline" onClick={()=>{
                setNewProduct({ id: '', en: '', ar: '', dimensions: { width: true, height: true }, basePricePerM2: 0, subtypes: [], materials: [], colors: [], accessories: [] });
                setNpSubtypes([]); setNpColors([]); setNpAccessories([]);
                setNpSelectedSubtypeForMaterial('');
                setNpDraftSubtype({ id: '', ar: '', en: '' }); setNpDraftMaterial({ id: '', ar: '', en: '', pricePerM2: 0 }); setNpDraftColor({ id: '', ar: '', en: '' }); setNpDraftAccessory({ id: '', price: 0 });
                setShowNewCard(false);
              }}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Existing products */}
        <div className="space-y-6">
          {products.map((p, idx) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>#{idx+1} — {p.ar || p.en || p.id}</span>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{p.id}</Badge>
                    <Button variant="outline" onClick={()=>removeProduct(idx)}>{isAr ? 'حذف' : 'Remove'}</Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs block mb-1">ID</label>
                    <Input value={p.id} readOnly disabled />
                  </div>
                  <div>
                    <label className="text-xs block mb-1">{isAr? 'العربي':'Arabic'}</label>
                    <Input value={p.ar || ''} onChange={(e)=>updateProduct(idx, { ar: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs block mb-1">{isAr? 'الإنجليزي':'English'}</label>
                    <Input value={p.en || ''} onChange={(e)=>updateProduct(idx, { en: e.target.value })} />
                  </div>
                  {/* Removed base price field as requested */}
                  <div className="col-span-1 md:col-span-2 lg:col-span-4 grid grid-cols-3 gap-3">
                    <label className="text-xs col-span-3">{isAr? 'الأبعاد المطلوبة':'Required dimensions'}</label>
                    <div className="flex items-center gap-2"><input type="checkbox" checked={!!p.dimensions?.width} onChange={(e)=>updateProduct(idx, { dimensions: { ...(p.dimensions||{}), width: e.target.checked } })} /> <span>{isAr ? 'العرض' : 'Width'}</span></div>
                    <div className="flex items-center gap-2"><input type="checkbox" checked={!!p.dimensions?.height} onChange={(e)=>updateProduct(idx, { dimensions: { ...(p.dimensions||{}), height: e.target.checked } })} /> <span>{isAr ? 'الارتفاع' : 'Height'}</span></div>
                    <div className="flex items-center gap-2"><input type="checkbox" checked={!!p.dimensions?.length} onChange={(e)=>updateProduct(idx, { dimensions: { ...(p.dimensions||{}), length: e.target.checked } })} /> <span>{isAr ? 'الطول' : 'Length'}</span></div>
                  </div>
                </div>

                {/* Subtypes */}
                <div className="space-y-2">
                  <div className="font-medium">{isAr ? 'الأنواع الفرعية' : 'Subtypes'}</div>
                  <div className="flex flex-wrap gap-2">
                    {(p.subtypes||[]).map(s => (
                      <Badge key={s.id} className="flex items-center gap-2">
                        {isAr ? (s.ar || s.id) : (s.en || s.id)}
                        <button className="text-xs" onClick={()=>delLabeled(p.id,'subtypes',s.id)}>×</button>
                      </Badge>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input placeholder={isAr?'عربي':'Arabic'} value={draftSubtype[p.id]?.ar || ''} onChange={(e)=>setDraftSubtype(d=>({ ...d, [p.id]: { ...(d[p.id]||{}), ar: e.target.value } }))} />
                    <Input placeholder={isAr?'إنجليزي':'English'} value={draftSubtype[p.id]?.en || ''} onChange={(e)=>setDraftSubtype(d=>({ ...d, [p.id]: { ...(d[p.id]||{}), en: e.target.value } }))} />
                    <div className="col-span-1 md:col-span-1">
                      <Button size="sm" variant="outline" onClick={()=>{
                        const ar = draftSubtype[p.id]?.ar || '';
                        const en = draftSubtype[p.id]?.en || '';
                        const name = (ar || en).trim();
                        if (!name) return;
                        // duplicate check in existing product subtypes
                        const exists = (p.subtypes||[]).some(s => (ar && norm(s.ar)===norm(ar)) || (en && norm(s.en)===norm(en)) );
                        if (exists) { toastError(isAr? 'هذا النوع موجود بالفعل لهذا المنتج':'This subtype already exists for this product', isAr); return; }
                        addLabeled(p.id, 'subtypes', { id: slugify(en || ar || '') || `sub-${(p.subtypes||[]).length+1}`, ar, en });
                        setDraftSubtype(d=>({ ...d, [p.id]: { id:'', ar:'', en:'' } }));
                      }}>{isAr?'إضافة نوع':'Add subtype'}</Button>
                    </div>
                  </div>
                </div>

                {/* Materials per subtype with price */}
                <div className="space-y-2">
                  <div className="font-medium">{isAr ? 'الخامات حسب النوع + السعر' : 'Materials per subtype + price'}</div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                    <div className="md:col-span-1">
                      <label className="text-xs block mb-1">{isAr? 'اختر النوع':'Select subtype'}</label>
                      <select className="w-full border rounded px-2 py-2 text-sm" value={selectedSubtypeForMaterial[p.id] || ''} onChange={(e)=> setSelectedSubtypeForMaterial(prev => ({ ...prev, [p.id]: e.target.value }))}>
                        <option value="">{isAr? '— اختر —':'— Select —'}</option>
                        {(p.subtypes||[]).map(st => (
                          <option key={st.id} value={st.id}>{isAr ? (st.ar || st.id) : (st.en || st.id)}</option>
                        ))}
                      </select>
                    </div>
                    <Input placeholder={isAr?'اسم الخامة (عربي)':'Material name (Arabic)'} value={(draftMaterial[p.id]?.[selectedSubtypeForMaterial[p.id] || '']?.ar) || ''} onChange={(e)=> setDraftMaterial(prev => ({ ...prev, [p.id]: { ...(prev[p.id]||{}), [selectedSubtypeForMaterial[p.id] || '']: { ...(prev[p.id]?.[selectedSubtypeForMaterial[p.id] || '']||{ id:'', ar:'', en:'', pricePerM2:undefined }), ar: e.target.value } } }))} />
                    <Input placeholder={isAr?'اسم الخامة (إنجليزي)':'Material name (English)'} value={(draftMaterial[p.id]?.[selectedSubtypeForMaterial[p.id] || '']?.en) || ''} onChange={(e)=> setDraftMaterial(prev => ({ ...prev, [p.id]: { ...(prev[p.id]||{}), [selectedSubtypeForMaterial[p.id] || '']: { ...(prev[p.id]?.[selectedSubtypeForMaterial[p.id] || '']||{ id:'', ar:'', en:'', pricePerM2:undefined }), en: e.target.value } } }))} />
                    <Input placeholder={isAr?'السعر المتر المربع':'Price per m²'} type="number" inputMode="decimal" value={(draftMaterial[p.id]?.[selectedSubtypeForMaterial[p.id] || '']?.pricePerM2) || ''} onChange={(e)=> setDraftMaterial(prev => ({ ...prev, [p.id]: { ...(prev[p.id]||{}), [selectedSubtypeForMaterial[p.id] || '']: { ...(prev[p.id]?.[selectedSubtypeForMaterial[p.id] || '']||{ id:'', ar:'', en:'', pricePerM2:undefined }), pricePerM2: e.target.value ? Number(e.target.value) : undefined } } }))} />
                    <div className="col-span-1 md:col-span-1">
                      <Button size="sm" variant="outline" onClick={()=>{
                        const subId = selectedSubtypeForMaterial[p.id];
                        if (!subId) return;
                        const draft = draftMaterial[p.id]?.[subId];
                        const ar = draft?.ar || '';
                        const en = draft?.en || '';
                        const name = (ar || en).trim();
                        if (!name) return;
                        const payload: MaterialWithPrice = { id: slugify(en || ar || '') || `mat-${((p.subtypes||[]).find(s=>s.id===subId)?.materials||[]).length+1}`, ar, en, pricePerM2: Number(draft?.pricePerM2||0) || undefined };
                        addMaterialToSubtype(p.id, subId, payload);
                        setDraftMaterial(prev => ({ ...prev, [p.id]: { ...(prev[p.id]||{}), [subId]: { id:'', ar:'', en:'', pricePerM2: 0 } } }));
                      }}>{isAr?'إضافة خامة':'Add material'}</Button>
                    </div>
                  </div>
                  {/* Display materials grouped by subtype */}
                  <div className="space-y-2">
                    {(p.subtypes||[]).map(st => (
                      <div key={st.id} className="border rounded p-2">
                        <div className="text-sm font-medium mb-2">{isAr ? 'النوع:' : 'Subtype:'} {isAr ? (st.ar || st.id) : (st.en || st.id)}</div>
                        <div className="flex flex-wrap gap-2">
                          {(st.materials||[]).map(m => (
                            <Badge key={m.id} className="flex items-center gap-2">
                              {(isAr ? (m.ar || m.id) : (m.en || m.id)) + (Number.isFinite(m.pricePerM2 as any) && m.pricePerM2 ? ` • ${Number(m.pricePerM2||0)}` : '')}
                              <button className="text-xs" onClick={()=>delMaterialFromSubtype(p.id, st.id, m.id)}>×</button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Colors */}
                <div className="space-y-2">
                  <div className="font-medium">{isAr ? 'الألوان' : 'Colors'}</div>
                  <div className="flex flex-wrap gap-2">
                    {(p.colors||[]).map(s => (
                      <Badge key={s.id} className="flex items-center gap-2">
                        {isAr ? (s.ar || s.id) : (s.en || s.id)}
                        <button className="text-xs" onClick={()=>delLabeled(p.id,'colors',s.id)}>×</button>
                      </Badge>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input placeholder={isAr?'عربي':'Arabic'} value={draftColor[p.id]?.ar || ''} onChange={(e)=>setDraftColor(d=>({ ...d, [p.id]: { ...(d[p.id]||{}), ar: e.target.value } }))} />
                    <Input placeholder={isAr?'إنجليزي':'English'} value={draftColor[p.id]?.en || ''} onChange={(e)=>setDraftColor(d=>({ ...d, [p.id]: { ...(d[p.id]||{}), en: e.target.value } }))} />
                    <div className="col-span-1 md:col-span-1">
                      <Button size="sm" variant="outline" onClick={()=>{
                        const ar = draftColor[p.id]?.ar || '';
                        const en = draftColor[p.id]?.en || '';
                        const name = (ar || en).trim();
                        if (!name) return;
                        // duplicate check in existing product colors
                        const exists = (p.colors||[]).some(c => (ar && norm(c.ar)===norm(ar)) || (en && norm(c.en)===norm(en)) );
                        if (exists) { toastError(isAr? 'هذا اللون موجود بالفعل لهذا المنتج':'This color already exists for this product', isAr); return; }
                        addLabeled(p.id, 'colors', { id: slugify(en || ar || '') || `col-${(p.colors||[]).length+1}`, ar, en });
                        setDraftColor(d=>({ ...d, [p.id]: { id:'', ar:'', en:'' } }));
                        setTimeout(() => { saveAll(); }, 0);
                      }}>{isAr?'إضافة لون':'Add color'}</Button>
                    </div>
                  </div>
                </div>

                {/* Accessories */}
                <div className="space-y-2">
                  <div className="font-medium">{isAr ? 'الملحقات' : 'Accessories'}</div>
                  <div className="flex flex-wrap gap-2">
                    {(p.accessories||[]).map(s => (
                      <Badge key={s.id} className="flex items-center gap-2">
                        {(isAr ? (s.ar || s.id) : (s.en || s.id)) + (Number.isFinite(s.price as any) ? ` • ${Number(s.price||0)}` : '')}
                        <button className="text-xs" onClick={()=>delAccessory(p.id, s.id)}>×</button>
                      </Badge>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input placeholder={isAr?'عربي':'Arabic'} value={draftAccessory[p.id]?.ar || ''} onChange={(e)=>setDraftAccessory(d=>({ ...d, [p.id]: { ...(d[p.id]||{}), ar: e.target.value } }))} />
                    <Input placeholder={isAr?'إنجليزي':'English'} value={draftAccessory[p.id]?.en || ''} onChange={(e)=>setDraftAccessory(d=>({ ...d, [p.id]: { ...(d[p.id]||{}), en: e.target.value } }))} />
                    <Input placeholder={isAr?'السعر':'Price'} type="number" inputMode="decimal" value={Number(draftAccessory[p.id]?.price || 0)} onChange={(e)=>setDraftAccessory(d=>({ ...d, [p.id]: { ...(d[p.id]||{}), price: Number(e.target.value||0) } }))} />
                    <div className="col-span-1 md:col-span-3">
                      <Button size="sm" variant="outline" onClick={()=>{
                        const ar = draftAccessory[p.id]?.ar || '';
                        const en = draftAccessory[p.id]?.en || '';
                        const name = (ar || en).trim();
                        if (!name) return;
                        // duplicate check in existing product accessories
                        const exists = (p.accessories||[]).some(a => (ar && norm(a.ar)===norm(ar)) || (en && norm(a.en)===norm(en)) );
                        if (exists) { toastError(isAr? 'هذا الملحق موجود بالفعل لهذا المنتج':'This accessory already exists for this product', isAr); return; }
                        const genId = slugify(draftAccessory[p.id]?.en || draftAccessory[p.id]?.ar || '');
                        const payload = { ...(draftAccessory[p.id] || {}), id: genId || `acc-${(p.accessories||[]).length+1}` } as Accessory;
                        addAccessory(p.id, payload);
                        setDraftAccessory(d=>({ ...d, [p.id]: {id:'',ar:'',en:'',price:0} }));
                      }}>{isAr?'إضافة ملحق':'Add accessory'}</Button>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={saveAll} disabled={loading}>{isAr ? 'حفظ كل الإعدادات' : 'Save All'}</Button>
          <Button variant="outline" onClick={()=> setCurrentPage && setCurrentPage('admin-dashboard')}>{isAr ? 'رجوع' : 'Back'}</Button>
        </div>

      </div>
    </div>
  )
}
