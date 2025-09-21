
import React, { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import type { RouteContext } from '../components/routerTypes';
import { useTranslation } from '../hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Ruler, Package, Layers, Boxes, ClipboardList, Calendar, ArrowRight, Edit3, Info, Check, X, Send, MessageCircle } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import Swal from 'sweetalert2';
import { getProjectById, getProjectBids, createBid, acceptBid, rejectBid, type BidDto } from '@/services/projects';
import { getProjectCatalog, type ProjectCatalog } from '@/services/options';
import { createProjectConversation, getProjectConversationByKeys } from '@/services/projectChat';
import { getAdminProjectById } from '@/services/admin';
import { useFirstLoadOverlay } from '../hooks/useFirstLoadOverlay';

// Keep catalogs in sync with ProjectsBuilder/Projects
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

interface ProjectDetailsProps extends Partial<RouteContext> {}

export default function ProjectDetails({ setCurrentPage, goBack, ...rest }: ProjectDetailsProps) {
  const { locale } = useTranslation();
  const currency = locale === 'ar' ? 'ر.س' : 'SAR';
  const hideFirstOverlay = useFirstLoadOverlay(
    rest,
    locale==='ar' ? 'جاري تحميل تفاصيل المشروع' : 'Loading project details',
    locale==='ar' ? 'يرجى الانتظار' : 'Please wait'
  );

  const [project, setProject] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<BidDto[]>([]);
  const [catalog, setCatalog] = useState<ProjectCatalog | null>(null);
  const userId = (rest as any)?.user?.id ? String((rest as any).user.id) : '';
  const isLoggedIn = Boolean((rest as any)?.user);
  const isVendor = ((rest as any)?.user?.role === 'vendor');

  // Vendor proposal form state
  const [offerPrice, setOfferPrice] = useState<string>('');
  const [offerDays, setOfferDays] = useState<string>('');
  const [offerMessage, setOfferMessage] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [myProposal, setMyProposal] = useState<BidDto | null>(null);

  // Load selected project by id: URL ?id= first, then localStorage fallback
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (typeof window === 'undefined') return;
        let id: string | null = null;
        try {
          const url = new URL(window.location.href);
          id = url.searchParams.get('id');
        } catch {}
        if (!id) {
          try { id = localStorage.getItem('selected_project_id'); } catch {}
        }
        const isValidId = (val: any) => {
          const s = String(val ?? '').trim();
          if (!s || s === 'undefined' || s === 'null') return false;
          if (/^[a-fA-F0-9]{24}$/.test(s)) return true; // Mongo OID
          if (/^\d+$/.test(s)) return true; // numeric
          return false;
        };
        if (!isValidId(id)) {
          setLoading(false);
          try { setCurrentPage && setCurrentPage('projects'); } catch {}
          return;
        }
        // Load from backend only (use admin endpoint for admins)
        try {
          const isAdmin = ((rest as any)?.user?.role === 'admin');
          const resp = isAdmin
            ? await getAdminProjectById(String(id))
            : await getProjectById(String(id));
          const ok = (resp as any).ok;
          const data = (resp as any).data as any;
          if (!cancelled && ok && data) {
            const it0 = Array.isArray((data as any).items) && (data as any).items.length ? (data as any).items[0] : {};
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
            setProject(merged);
          }
        } catch {}
        // Load admin catalog to resolve accessories names and materials per type
        try {
          const r = await getProjectCatalog();
          if (!cancelled && r) setCatalog(r);
        } catch {}
        // Load bids (merchant proposals) from backend
        try {
          // Prefer same id used to fetch project
          const pidStr = String(id || localStorage.getItem('selected_project_id') || '');
          if (isValidId(pidStr)) {
            const r = await getProjectBids(pidStr);
            if (!cancelled && r.ok && Array.isArray(r.data)) {
              const mapped = (r.data as any[]).map((b:any) => {
                // Normalize status from server enum names to UI statuses
                const s = String(b.status || '').toLowerCase();
                let statusNorm: 'pending'|'accepted'|'rejected' = 'pending';
                if (s === 'accepted') statusNorm = 'accepted';
                else if (s === 'rejected' || s === 'withdrawn') statusNorm = 'rejected';
                else statusNorm = 'pending'; // submitted/underreview -> pending
                return { ...b, status: statusNorm } as BidDto;
              });
              setProposals(mapped as any);
            }
          }
        } catch {}
      } catch {}
      finally { if (!cancelled) { setLoading(false); try { hideFirstOverlay(); } catch {} } }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track if this vendor already submitted a proposal for this project
  useEffect(() => {
    try {
      if (!project || !isVendor) { setHasSubmitted(false); setMyProposal(null); return; }
      const vendorId = userId;
      const mine = proposals.find((b:any)=> String(b.projectId)===String(project.id) && (!!vendorId ? String(b.merchantId||'')===vendorId : false));
      setHasSubmitted(!!mine);
      setMyProposal(mine || null);
      if (mine && !editingProposalId) setEditingProposalId(String(mine.id));
    } catch { setHasSubmitted(false); setMyProposal(null); }
  }, [project, userId, isVendor, proposals, editingProposalId, rest]);

  const typeLabel = useMemo(() => {
    const fromCatalog = productTypes.find(pt => pt.id === (project?.ptype || project?.type))?.[locale==='ar'?'ar':'en'] || '';
    if (fromCatalog) return fromCatalog;
    // Fallback to category name if type not present
    return (project?.categoryName || '');
  }, [project, locale]);
  const materialLabel = useMemo(() => {
    const fromCatalog = materials.find(m => m.id === project?.material)?.[locale==='ar'?'ar':'en'] || '';
    if (fromCatalog) return fromCatalog;
    // Fallback to raw material string if provided from backend
    return (project?.material || '');
  }, [project, locale]);
  const accessoriesNames = useMemo(() => {
    if (!project) return [] as string[];
    // Prefer admin catalog per selected product type
    if (Array.isArray(project.selectedAcc) && catalog?.products?.length) {
      const pid = String(project.ptype || project.type || '');
      const prod = catalog.products.find(p => p.id === pid);
      const accessories = prod?.accessories || [];
      return (project.selectedAcc as string[])
        .map(id => {
          const acc = accessories.find(a => a.id === id);
          return acc ? (locale==='ar' ? (acc.ar || acc.id) : (acc.en || acc.id)) : null;
        })
        .filter(Boolean) as string[];
    }
    // Fallbacks
    if (Array.isArray(project.accessories)) return project.accessories.map((a: any)=> (locale==='ar'?a.ar:a.en));
    if (Array.isArray(project.selectedAcc)) return project.selectedAcc.map((id: string)=>{
      const acc = accessoriesCatalog.find(a=>a.id===id);
      return acc ? (locale==='ar'?acc.ar:acc.en) : null;
    }).filter(Boolean) as string[];
    return [] as string[];
  }, [project, locale, catalog]);

  // Derived values for summary/breakdown
  const area = useMemo(() => (project ? (Number(project.width)||0) * (Number(project.height)||0) : 0), [project]);
  const pricePerMeter = useMemo(() => (project ? (Number(project.pricePerMeter)||0) : 0), [project]);
  const quantity = useMemo(() => (project ? (Number(project.quantity)||0) : 0), [project]);
  const subtotal = useMemo(() => Math.max(0, area * pricePerMeter), [area, pricePerMeter]);
  const accessoriesCost = useMemo(() => {
    if (!project) return 0;
    if (Array.isArray(project.accessories)) return project.accessories.reduce((s: number, a: any) => s + (Number(a.price)||0), 0);
    if (Array.isArray(project.selectedAcc)) return project.selectedAcc.reduce((s: number, id: string) => {
      const acc = accessoriesCatalog.find(a=>a.id===id); return s + (acc?.price||0);
    }, 0);
    return 0;
  }, [project]);

  // Main item total based on current project values
  const mainItemTotal = useMemo(() => {
    const qty = Math.max(1, quantity || 0);
    return Math.max(0, Math.round((subtotal + accessoriesCost) * qty));
  }, [subtotal, accessoriesCost, quantity]);

  // Additional items helpers
  const itemsArray = useMemo(() => Array.isArray(project?.items) ? project!.items : [], [project]);
  const itemsCount = useMemo(() => itemsArray.length, [itemsArray]);
  const addItemsTotal = useMemo(() => itemsArray.reduce((s: number, it: any) => s + (Number(it?.total)||0), 0), [itemsArray]);

  // Baseline totals and helpers for vendor price validation
  const baseTotal: number = useMemo(() => {
    const p: any = project;
    if (!p) return 0;
    if (typeof p.total === 'number') return Math.max(0, Number(p.total));
    return Math.max(0, (mainItemTotal || 0) + (addItemsTotal || 0));
  }, [project, mainItemTotal, addItemsTotal]);
  const minPrice = baseTotal;
  const maxPrice = Math.max(minPrice, minPrice * 2);
  const formatMoney = (n: number) => {
    try { return n.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US'); } catch { return String(n); }
  };

  const handleEdit = () => {
    if (!project) return;
    try {
      const draft = {
        id: project.id,
        ptype: project.ptype || project.type || '',
        psubtype: project.psubtype || 'normal',
        material: project.material || '',
        color: project.color || 'white',
        width: project.width || 0,
        height: project.height || 0,
        quantity: project.quantity || 1,
        days: Number(project.days) || 1,
        selectedAcc: Array.isArray(project.selectedAcc)
          ? project.selectedAcc
          : Array.isArray(project.accessories)
            ? project.accessories.map((a:any)=>a?.id).filter(Boolean)
            : [],
        description: project.description || ''
      };
      localStorage.setItem('edit_project_draft', JSON.stringify(draft));

      // Prepare additional items for builder
      if (Array.isArray(project.items) && project.items.length > 0) {
        const itemsDraft = project.items.map((it: any) => ({
          id: it.id || Math.random().toString(36).slice(2),
          ptype: it.ptype || it.type || '',
          psubtype: it.psubtype || 'normal',
          material: it.material || '',
          color: it.color || 'white',
          width: Number(it.width) || 0,
          height: Number(it.height) || 0,
          quantity: Number(it.quantity) || 1,
          days: Number(it.days) || 1,
          autoPrice: true,
          pricePerMeter: Number(it.pricePerMeter) || 0, // builder recalculates
          selectedAcc: Array.isArray(it.selectedAcc) ? it.selectedAcc : [],
          description: it.description || '',
        }));
        localStorage.setItem('edit_project_items_draft', JSON.stringify(itemsDraft));
      } else {
        localStorage.removeItem('edit_project_items_draft');
      }
    } catch {}
    setCurrentPage && setCurrentPage('projects-builder');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const back = () => {
    if (goBack) return goBack();
    setCurrentPage && setCurrentPage('projects');
  };

  // Open or create a chat with the merchant for this project (customer side)
  const openChatWithMerchant = async (merchantId: string, merchantName?: string) => {
    try {
      if (!project || !merchantId) return;
      const pid = Number(project.id);
      try { localStorage.setItem('project_chat_project_id', String(pid)); } catch {}
      try { localStorage.setItem('project_chat_merchant_id', String(merchantId)); } catch {}
      if (merchantName) { try { localStorage.setItem('project_chat_merchant_name', String(merchantName)); } catch {} }
      // Try resolve existing conversation first
      try {
        const found = await getProjectConversationByKeys(pid, merchantId);
        if ((found as any)?.ok && (found as any).data?.id) {
          const cid = String((found as any).data.id);
          try { localStorage.setItem('project_chat_conversation_id', cid); } catch {}
          setCurrentPage && setCurrentPage('project-chat');
          return;
        }
      } catch {}
      // Create new conversation
      const created = await createProjectConversation(pid, merchantId);
      if ((created as any)?.ok && (created as any).data?.id) {
        const cid = String((created as any).data.id);
        try { localStorage.setItem('project_chat_conversation_id', cid); } catch {}
        setCurrentPage && setCurrentPage('project-chat');
        return;
      }
      // Fallback: navigate to chat page without cid; page will try resolve by keys
      setCurrentPage && setCurrentPage('project-chat');
    } catch {}
  };

  return (
    <div className="min-h-screen bg-background" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <Header currentPage="project-details" setCurrentPage={setCurrentPage as any} {...(rest as any)} />

      <div className="container mx-auto px-4 py-8">
        {/* Loading/empty state */}
        {loading && (
          <Card className="max-w-2xl mx-auto animate-pulse">
            <CardContent className="p-6 space-y-4">
              <div className="h-6 w-40 bg-muted rounded" />
              <div className="h-24 bg-muted rounded" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-12 bg-muted rounded" />
                <div className="h-12 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !project && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Info className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">
                {locale==='ar'
                  ? (isLoggedIn ? 'غير مصرح لك بعرض هذا المشروع.' : 'الرجاء تسجيل الدخول لعرض المشاريع.')
                  : (isLoggedIn ? 'You are not authorized to view this project.' : 'Please sign in to view projects.')
                }
              </p>
              {!isVendor && (
                <p className="text-sm text-muted-foreground">
                  {locale==='ar' ? 'هذه الصفحة تعرض فقط مشاريع المالك.' : 'This page only shows projects owned by the current user.'}
                </p>
              )}
              <div className="pt-1">
                <Button onClick={back} className="inline-flex items-center gap-1">
                  {locale==='ar' ? 'رجوع للمشاريع' : 'Back to Projects'} <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && project && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main details */}
            <Card className="lg:col-span-2 overflow-hidden shadow-sm">
              <div className="p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Package className="w-6 h-6 text-primary" />
                    <h1 className="text-2xl font-bold">{locale==='ar' ? 'تفاصيل المشروع' : 'Project Details'}</h1>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-sm">{typeLabel}</Badge>
                    {itemsCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {locale==='ar' ? `${itemsCount + 1} عناصر` : `${itemsCount + 1} items`}
                      </Badge>
                    )}
                  </div>
                  <div className="rounded-lg border p-4 bg-background shadow-sm">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> {locale==='ar' ? 'المدة (أيام)' : 'Duration (days)'}
                    </div>
                    <div className="mt-1 font-medium">{Number(project?.days) > 0 ? project.days : '-'}</div>
                  </div>
                </div>

                {/* Quick summary chips */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {/* Category/type */}
                  {typeLabel && (
                    <Badge variant="outline" className="rounded-full text-xs">{typeLabel}</Badge>
                  )}
                  {/* Material */}
                  {materialLabel && (
                    <Badge variant="outline" className="rounded-full text-xs">{materialLabel}</Badge>
                  )}
                  {/* Dimensions */}
                  <Badge variant="outline" className="rounded-full text-xs">
                    {(project?.width||0)} × {(project?.height||0)} m
                  </Badge>
                  {/* Quantity */}
                  <Badge variant="outline" className="rounded-full text-xs">
                    {locale==='ar' ? `الكمية: ${project?.quantity ?? 0}` : `Quantity: ${project?.quantity ?? 0}`}
                  </Badge>
                  {/* Price per m² or Budget */}
                  {Number(project?.pricePerMeter) > 0 ? (
                    <Badge variant="outline" className="rounded-full text-xs">
                      {locale==='ar' ? `سعر المتر: ${project.pricePerMeter}` : `Price per m²: ${project.pricePerMeter}`}
                    </Badge>
                  ) : (typeof project?.budgetMin !== 'undefined' || typeof project?.budgetMax !== 'undefined') ? (
                    <Badge variant="outline" className="rounded-full text-xs">
                      {locale==='ar'
                        ? `الميزانية: ${project?.budgetMin ?? '-'} - ${project?.budgetMax ?? '-'}`
                        : `Budget: ${project?.budgetMin ?? '-'} - ${project?.budgetMax ?? '-'}`}
                    </Badge>
                  ) : null}
                  {/* Days */}
                  {Number(project?.days) > 0 && (
                    <Badge variant="outline" className="rounded-full text-xs">
                      {locale==='ar' ? `الأيام: ${project.days}` : `Days: ${project.days}`}
                    </Badge>
                  )}
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Info grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4 bg-background shadow-sm">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Layers className="w-4 h-4" /> {locale==='ar' ? 'الخامة' : 'Material'}
                    </div>
                    <div className="mt-1 font-medium">{materialLabel || '-'}</div>
                  </div>
                  <div className="rounded-lg border p-4 bg-background shadow-sm">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Ruler className="w-4 h-4" /> {locale==='ar' ? 'الأبعاد (متر)' : 'Dimensions (m)'}
                    </div>
                    <div className="mt-1 font-medium">
                      {(project?.width||0)} × {(project?.height||0)}<span className="text-muted-foreground text-xs ms-1">m</span>
                    </div>
                  </div>
                  <div className="rounded-lg border p-4 bg-background shadow-sm">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Boxes className="w-4 h-4" /> {locale==='ar' ? 'الكمية' : 'Quantity'}
                    </div>
                    <div className="mt-1 font-medium">{project.quantity || 0}</div>
                  </div>
                  <div className="rounded-lg border p-4 bg-background shadow-sm">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <ClipboardList className="w-4 h-4" /> {locale==='ar' ? 'سعر المتر المربع' : 'Price per m²'}
                    </div>
                    <div className="mt-1 font-medium">{project.pricePerMeter || 0} {currency}</div>
                  </div>
                </div>

                <Separator />

                {/* Accessories */}
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">{locale==='ar' ? 'الملحقات' : 'Accessories'}</div>
                  {accessoriesNames.length>0 ? (
                    <div className="flex flex-wrap gap-2">
                      {accessoriesNames.map((name: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="rounded-full px-3 py-1 text-xs">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">{locale==='ar'?'بدون':'None'}</div>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">{locale==='ar' ? 'الوصف' : 'Description'}</div>
                  {project.description ? (
                    <div className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 border rounded-md p-3">
                      {project.description}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">{locale==='ar' ? 'لا يوجد وصف مضاف.' : 'No description provided.'}</div>
                  )}
                </div>

                {/* Additional Items (from builder) */}
                {itemsCount > 0 && (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      {locale==='ar' ? 'عناصر إضافية ضمن هذا المشروع' : 'Additional items in this project'}
                    </div>
                    <div className="space-y-4">
                      {itemsArray.map((it: any, idx: number) => {
                        const itTypeLabel = productTypes.find(pt => pt.id === (it?.ptype || it?.type))?.[locale==='ar'?'ar':'en'] || '';
                        const itMaterialLabel = materials.find(m => m.id === it?.material)?.[locale==='ar'?'ar':'en'] || '';
                        const itAccessoriesNames: string[] = (() => {
                          if (Array.isArray(it?.selectedAcc) && catalog?.products?.length) {
                            const pid = String(it?.ptype || it?.type || '');
                            const prod = catalog.products.find(p => p.id === pid);
                            const accs = prod?.accessories || [];
                            return (it.selectedAcc as string[])
                              .map((id: string) => {
                                const acc = accs.find(a => a.id === id);
                                return acc ? (locale==='ar' ? (acc.ar || acc.id) : (acc.en || acc.id)) : null;
                              })
                              .filter(Boolean) as string[];
                          }
                          if (Array.isArray(it?.selectedAcc)) {
                            return it.selectedAcc
                              .map((id: string) => {
                                const acc = accessoriesCatalog.find(a => a.id === id);
                                return acc ? (locale==='ar'?acc.ar:acc.en) : null;
                              })
                              .filter(Boolean) as string[];
                          }
                          return [] as string[];
                        })();
                        return (
                          <div key={it?.id || idx} className="rounded-lg border p-4 bg-background shadow-sm">
                            <div className="flex items-center justify-between">
                              <div className="font-semibold">{locale==='ar' ? `عنصر #${idx+2}` : `Item #${idx+2}`}</div>
                              {itTypeLabel && <Badge variant="outline">{itTypeLabel}</Badge>}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                              <div>
                                <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                  <Layers className="w-4 h-4" /> {locale==='ar' ? 'الخامة' : 'Material'}
                                </div>
                                <div className="mt-1 font-medium">{itMaterialLabel || '-'}</div>
                              </div>
                              <div>
                                <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                  <Ruler className="w-4 h-4" /> {locale==='ar' ? 'الأبعاد (متر)' : 'Dimensions (m)'}
                                </div>
                                <div className="mt-1 font-medium">
                                  {(it?.width||0)} × {(it?.height||0)}<span className="text-muted-foreground text-xs ms-1">m</span>
                                </div>
                              </div>
                              <div>
                                <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                  <Boxes className="w-4 h-4" /> {locale==='ar' ? 'الكمية' : 'Quantity'}
                                </div>
                                <div className="mt-1 font-medium">{it?.quantity || 0}</div>
                              </div>
                              <div>
                                <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                  <Calendar className="w-4 h-4" /> {locale==='ar' ? 'أيام التنفيذ' : 'Days to complete'}
                                </div>
                                <div className="mt-1 font-medium">{Number(it?.days) > 0 ? it.days : '-'}</div>
                              </div>
                              <div>
                                <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                  <ClipboardList className="w-4 h-4" /> {locale==='ar' ? 'سعر المتر المربع' : 'Price per m²'}
                                </div>
                                <div className="mt-1 font-medium">{it?.pricePerMeter || 0} {currency}</div>
                              </div>
                            </div>
                            {/* Item accessories */}
                            <div className="mt-3">
                              <div className="text-sm text-muted-foreground">{locale==='ar' ? 'الملحقات' : 'Accessories'}</div>
                              {itAccessoriesNames.length>0 ? (
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {itAccessoriesNames.map((name: string, i: number) => (
                                    <Badge key={i} variant="outline" className="rounded-full px-3 py-1 text-xs">{name}</Badge>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">{locale==='ar'?'بدون':'None'}</div>
                              )}
                            </div>
                            {/* Item description */}
                            {it?.description && (
                              <div className="mt-3">
                                <div className="text-sm text-muted-foreground">{locale==='ar' ? 'الوصف' : 'Description'}</div>
                                <div className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 border rounded-md p-3">{it.description}</div>
                              </div>
                            )}
                            {/* Item total */}
                            <div className="mt-3 flex items-center justify-end">
                              <div className="text-sm">
                                <span className="text-muted-foreground me-2">{locale==='ar' ? 'إجمالي هذا العنصر:' : 'Item total:'}</span>
                                <span className="font-semibold">{currency} {(it?.total || 0).toLocaleString(locale==='ar'?'ar-EG':'en-US')}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Meta */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
                  {project.createdAt && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" /> {locale==='ar' ? 'تم الإنشاء' : 'Created'}: {new Date(project.createdAt).toLocaleString(locale==='ar'?'ar-EG':'en-US')}
                    </div>
                  )}
                  {project.updatedAt && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" /> {locale==='ar' ? 'آخر تحديث' : 'Updated'}: {new Date(project.updatedAt).toLocaleString(locale==='ar'?'ar-EG':'en-US')}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Button variant="outline" onClick={back} className="inline-flex items-center gap-2">
                    {locale==='ar' ? 'رجوع' : 'Back'} <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sidebar */}
            <div className="space-y-4">
              {isVendor ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {(project?.customerName || project?.userName || project?.user?.name)
                          ? (locale==='ar' ? 'صاحب الطلب' : 'Customer')
                          : (locale==='ar' ? 'تفاصيل' : 'Details')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm">
                        {(project?.customerName || project?.userName || project?.user?.name) || (locale==='ar' ? 'غير معروف' : 'Unknown')}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {isEditing
                          ? (locale==='ar' ? 'تعديل عرضي' : 'Edit My Offer')
                          : (hasSubmitted
                              ? (locale==='ar' ? 'تم الإرسال' : 'Submitted')
                              : (locale==='ar' ? 'تقديم عرض' : 'Submit Proposal')
                            )
                        }
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {hasSubmitted && !isEditing ? (
                        <div className="space-y-3 text-sm">
                          {myProposal && (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">{locale==='ar' ? 'السعر المقدم' : 'Submitted Price'}</span>
                                <span className="font-semibold">{currency} {formatMoney(Number(myProposal.price||0))}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">{locale==='ar' ? 'الأيام' : 'Days'}</span>
                                <span className="font-semibold">{Number(myProposal.days||0)}</span>
                              </div>
                              {!!myProposal.message && (
                                <div className="text-muted-foreground whitespace-pre-wrap">{myProposal.message}</div>
                              )}
                            </>
                          )}
                          <div className="pt-2">
                            <Button className="w-full" variant="outline" disabled>
                              {locale==='ar' ? 'تعديل عرضي' : 'Edit my offer'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="grid gap-2">
                            <label className="text-sm">{locale==='ar' ? 'السعر المقترح' : 'Proposed Price'}</label>
                            <Input
                              type="number"
                              inputMode="decimal"
                              min={minPrice || 0}
                              max={maxPrice || undefined}
                              placeholder={
                                locale==='ar'
                                  ? `الحد الأدنى: ${currency} ${formatMoney(minPrice)} • الحد الأقصى: ${currency} ${formatMoney(maxPrice)}`
                                  : `Min: ${currency} ${formatMoney(minPrice)} • Max: ${currency} ${formatMoney(maxPrice)}`
                              }
                              value={offerPrice}
                              onChange={(e)=> setOfferPrice(e.target.value)}
                            />
                            {(() => {
                              const v = Number(offerPrice);
                              const invalid = offerPrice !== '' && (!isFinite(v) || v < (minPrice||0) || v > (maxPrice||Number.POSITIVE_INFINITY));
                              if (invalid) {
                                return (
                                  <span className="text-xs text-red-600">
                                    {locale==='ar'
                                      ? `السعر يجب أن يكون بين ${currency} ${formatMoney(minPrice)} و ${currency} ${formatMoney(maxPrice)}`
                                      : `Price must be between ${currency} ${formatMoney(minPrice)} and ${currency} ${formatMoney(maxPrice)}`}
                                  </span>
                                );
                              }
                              return (
                                <span className="text-xs text-muted-foreground">
                                  {locale==='ar'
                                    ? `يمكنك تقديم عرض بين ${currency} ${formatMoney(minPrice)} و ${currency} ${formatMoney(maxPrice)}`
                                    : `You can offer between ${currency} ${formatMoney(minPrice)} and ${currency} ${formatMoney(maxPrice)}`}
                                </span>
                              );
                            })()}
                          </div>

                          <div className="grid gap-2">
                            <label className="text-sm">{locale==='ar' ? 'المدة (أيام)' : 'Duration (days)'}</label>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={Number(project?.days) > 0 ? Number(project?.days) : undefined}
                              placeholder={
                                Number(project?.days) > 0
                                  ? (locale==='ar' ? `من 1 إلى ${Number(project?.days)} يوم` : `From 1 to ${Number(project?.days)} days`)
                                  : (locale==='ar' ? 'أقل قيمة: 1 يوم' : 'Minimum: 1 day')
                              }
                              value={offerDays}
                              onChange={(e)=>setOfferDays(e.target.value)}
                            />
                            {(() => {
                              const v = Number(offerDays);
                              const maxD = Number(project?.days) > 0 ? Number(project?.days) : Infinity;
                              const invalid = offerDays !== '' && (!Number.isFinite(v) || v < 1 || v > maxD);
                              if (invalid) {
                                return (
                                  <span className="text-xs text-red-600">
                                    {Number.isFinite(maxD)
                                      ? (locale==='ar' ? `عدد الأيام يجب أن يكون بين 1 و ${maxD}` : `Days must be between 1 and ${maxD}`)
                                      : (locale==='ar' ? 'عدد الأيام يجب ألا يقل عن 1' : 'Days must be at least 1')}
                                  </span>
                                );
                              }
                              return (
                                <span className="text-xs text-muted-foreground">
                                  {Number(project?.days) > 0
                                    ? (locale==='ar' ? `لا يمكن تجاوز ${Number(project?.days)} يوم` : `Cannot exceed ${Number(project?.days)} days`)
                                    : (locale==='ar' ? 'أقل مدة مسموحة هي يوم واحد' : 'Minimum allowed duration is 1 day')}
                                </span>
                              );
                            })()}
                          </div>

                          <div className="grid gap-2">
                            <label className="text-sm">{locale==='ar' ? 'رسالة' : 'Message'}</label>
                            <Textarea
                              rows={4}
                              placeholder={locale==='ar' ? 'عرّف بنفسك وقدّم تفاصيل العرض' : 'Introduce yourself and provide details of your offer'}
                              value={offerMessage}
                              onChange={(e)=>setOfferMessage(e.target.value)}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              disabled={(() => {
                                if (saving || hasSubmitted) return true;
                                const vP = Number(offerPrice);
                                const vD = Number(offerDays);
                                const validP = offerPrice !== '' && isFinite(vP) && vP >= (minPrice||0) && vP <= (maxPrice||Number.POSITIVE_INFINITY);
                                const maxD = Number(project?.days) > 0 ? Number(project?.days) : Infinity;
                                const validD = offerDays !== '' && Number.isFinite(vD) && vD >= 1 && vD <= maxD;
                                return !(validP && validD);
                              })()}
                              onClick={() => {
                                (async () => {
                                  try {
                                    setSaving(true);
                                    if (!project) return;
                                    const vP = Number(offerPrice);
                                    const vD = Number(offerDays);
                                    const res = await createBid(String(project.id), { price: vP, days: vD, message: offerMessage });
                                    if (res.ok) {
                                      const r = await getProjectBids(String(project.id));
                                      if (r.ok && Array.isArray(r.data)) setProposals(r.data as BidDto[]);
                                      setOfferPrice(''); setOfferDays(''); setOfferMessage('');
                                      setHasSubmitted(true);
                                      Swal.fire({ icon: 'success', title: locale==='ar' ? 'تم إرسال العرض' : 'Proposal submitted', timer: 1600, showConfirmButton: false });
                                    }
                                  } finally {
                                    setSaving(false);
                                  }
                                })();
                              }}
                            >
                              <Send className="mr-2 h-4 w-4" /> {saving ? (locale==='ar' ? 'جارٍ الحفظ...' : 'Saving...') : (isEditing ? (locale==='ar' ? 'حفظ التعديلات' : 'Save Changes') : (locale==='ar' ? 'إرسال العرض' : 'Send Proposal'))}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                // Owner/non-vendor: view and manage received proposals
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">{locale==='ar' ? 'عروض مقدّمة' : 'Submitted Proposals'}</h2>
                      <Badge variant="outline">{proposals.length}</Badge>
                    </div>
                    {proposals.length === 0 ? (
                      <div className="text-sm text-muted-foreground">{locale==='ar' ? 'لا توجد عروض حتى الآن.' : 'No proposals yet.'}</div>
                    ) : (
                      <div className="space-y-3">
                        {proposals.map((pp:any)=> (
                          <div key={pp.id} className="border rounded-md p-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium">{locale==='ar' ? 'السعر' : 'Price'}: {currency} {Number(pp.price||0).toLocaleString(locale==='ar'?'ar-EG':'en-US')}</div>
                              <Badge variant={pp.status==='accepted'? 'secondary' : pp.status==='rejected'? 'destructive' : 'outline'} className="text-xs capitalize">
                                {locale==='ar' ? (pp.status==='pending'?'معلق': pp.status==='accepted'?'مقبول':'مرفوض') : pp.status}
                              </Badge>
                            </div>
                            {/* Chat action */}
                            <div className="mt-2 flex items-center justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                className="inline-flex items-center gap-2"
                                onClick={() => openChatWithMerchant(String(pp.merchantId || ''), String(pp.merchantName || ''))}
                              >
                                <MessageCircle className="w-4 h-4" /> {locale==='ar' ? 'مراسلة التاجر' : 'Chat with merchant'}
                              </Button>
                            </div>
                            <div className="text-sm text-muted-foreground">{locale==='ar' ? 'المدة' : 'Days'}: {Number(pp.days||0)}</div>
                            {pp.message && <div className="mt-1 text-xs bg-muted/20 rounded p-2">{pp.message}</div>}
                            {pp.status === 'pending' && (
                              <div className="mt-2 flex items-center gap-2">
                                <Button size="sm" className="flex-1" onClick={async () => {
                                  try {
                                    const r = await acceptBid(String(pp.id));
                                    if (r.ok && project) {
                                      const rd = await getProjectBids(String(project.id));
                                      if (rd.ok && Array.isArray(rd.data)) setProposals(rd.data as BidDto[]);
                                    }
                                  } catch {}
                                }}>
                                  <Check className="w-4 h-4 ml-1" /> {locale==='ar' ? 'قبول' : 'Accept'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="flex-1 bg-red-600 hover:bg-red-700 text-white border border-red-600"
                                  onClick={async () => {
                                    try {
                                      const r = await rejectBid(String(pp.id));
                                      if (r.ok && project) {
                                        const rd = await getProjectBids(String(project.id));
                                        if (rd.ok && Array.isArray(rd.data)) setProposals(rd.data as BidDto[]);
                                      }
                                    } catch {}
                                  }}
                                >
                                  <X className="w-4 h-4 ml-1" /> {locale==='ar' ? 'رفض' : 'Reject'}
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      <Footer setCurrentPage={setCurrentPage as any} />
    </div>
  );
}