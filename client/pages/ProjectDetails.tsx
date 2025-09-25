import React, { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import type { RouteContext } from '../components/routerTypes';
import { useTranslation } from '../hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Ruler, Package, Layers, Boxes, ClipboardList, Calendar, ArrowRight, Info, Check, X, Send, MessageCircle, Star } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import Swal from 'sweetalert2';
import {
  getProjectById,
  getProjectBids,
  createBid,
  acceptBid,
  rejectBid,
  deleteProject,
  deliverProject,
  acceptDelivery,
  rejectDelivery as rejectProjectDelivery,
  rateMerchant,
  type BidDto
} from '@/services/projects';
import { getProjectCatalog, type ProjectCatalog } from '@/services/options';
import { createProjectConversation, getProjectConversationByKeys } from '@/services/projectChat';
import { getAdminProjectById } from '@/services/admin';
import { useFirstLoadOverlay } from '../hooks/useFirstLoadOverlay';
import UserAvatar from '@/components/UserAvatar';

interface ProjectDetailsProps extends Partial<RouteContext> { }

export default function ProjectDetails({ setCurrentPage, goBack, ...rest }: ProjectDetailsProps) {
  const { locale } = useTranslation();
  const currency = locale === 'ar' ? 'ر.س' : 'SAR';
  const hideFirstOverlay = useFirstLoadOverlay(
    rest,
    locale === 'ar' ? 'جاري تحميل تفاصيل المشروع' : 'Loading project details',
    locale === 'ar' ? 'يرجى الانتظار' : 'Please wait'
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
        } catch { }
        if (!id) {
          try { id = localStorage.getItem('selected_project_id'); } catch { }
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
          try { setCurrentPage && setCurrentPage('projects'); } catch { }
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
              id: (data as any).id ?? (data as any)._id ?? String((data as any).id || (data as any)._id || ''),
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
              // If backend returns length, keep it; otherwise default to 0
              length: Number(data.length ?? it0.length ?? 0) || 0,
            };
            setProject(merged);
          }
        } catch { }
        // Load admin catalog to resolve accessories names and materials per type
        try {
          const r = await getProjectCatalog();
          if (!cancelled && r) setCatalog(r);
        } catch { }
        // Load bids (merchant proposals) from backend
        try {
          // Prefer same id used to fetch project
          const pidStr = String(id || localStorage.getItem('selected_project_id') || '');
          if (isValidId(pidStr)) {
            const r = await getProjectBids(pidStr);
            if (!cancelled && r.ok && Array.isArray(r.data)) {
              const mapped = (r.data as any[]).map((b: any) => {
                // Normalize status from server enum names to UI statuses
                const s = String(b.status || '').toLowerCase();
                let statusNorm: 'pending' | 'accepted' | 'rejected' = 'pending';
                if (s === 'accepted') statusNorm = 'accepted';
                else if (s === 'rejected' || s === 'withdrawn') statusNorm = 'rejected';
                else statusNorm = 'pending'; // submitted/underreview -> pending
                return { ...b, status: statusNorm } as BidDto;
              });
              setProposals(mapped as any);
            }
          }
        } catch { }
      } catch { }
      finally { if (!cancelled) { setLoading(false); try { hideFirstOverlay(); } catch { } } }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track if this vendor already submitted a proposal for this project
  useEffect(() => {
    try {
      if (!project || !isVendor) { setHasSubmitted(false); setMyProposal(null); return; }
      const vendorId = userId;
      const mine = proposals.find((b: any) => String(b.projectId) === String(project.id) && (!!vendorId ? String(b.merchantId || '') === vendorId : false));
      setHasSubmitted(!!mine);
      setMyProposal(mine || null);
      if (mine && !editingProposalId) setEditingProposalId(String(mine.id));
    } catch { setHasSubmitted(false); setMyProposal(null); }
  }, [project, userId, isVendor, proposals, editingProposalId, rest]);

  // Dynamic labels from ProjectCatalog
  const typeLabel = useMemo(() => {
    const pid = String(project?.ptype || project?.type || '');
    if (!pid) return project?.categoryName || '';
    const prod = catalog?.products?.find(p => p.id === pid);
    if (!prod) return project?.categoryName || '';
    return (locale === 'ar' ? (prod.ar || prod.id) : (prod.en || prod.id)) || prod.id;
  }, [project, locale, catalog]);

  const materialLabel = useMemo(() => {
    if (!project) return '';
    const pid = String(project.ptype || project.type || '');
    const mid = String(project.material || '');
    if (!pid || !mid) return project?.material || '';
    const prod = catalog?.products?.find(p => p.id === pid);
    const mat = prod?.materials?.find(m => m.id === mid)
      || prod?.subtypes?.flatMap(s => s.materials || []).find(m => m.id === mid);
    if (mat) return locale === 'ar' ? (mat.ar || mat.id) : (mat.en || mat.id);
    return project?.material || '';
  }, [project, locale, catalog]);

  const accessoriesNames = useMemo(() => {
    if (!project) return [] as string[];
    const pid = String(project.ptype || project.type || '');
    const prod = catalog?.products?.find(p => p.id === pid);
    const accessories = prod?.accessories || [];
    if (Array.isArray(project.selectedAcc) && accessories.length) {
      return (project.selectedAcc as string[])
        .map(id => {
          const acc = accessories.find(a => a.id === id);
          return acc ? (locale === 'ar' ? (acc.ar || acc.id) : (acc.en || acc.id)) : null;
        })
        .filter(Boolean) as string[];
    }
    if (Array.isArray(project.accessories)) {
      return project.accessories.map((a: any) => (locale === 'ar' ? (a.ar || a.name || a.id) : (a.en || a.name || a.id))).filter(Boolean);
    }
    return [] as string[];
  }, [project, locale, catalog]);

  // Product name fallback chain
  const productName = useMemo(() => {
    return project?.title || project?.productName || project?.name || project?.categoryName || '';
  }, [project]);

  // Derived values for summary/breakdown
  const area = useMemo(() => (project ? (Number(project.width) || 0) * (Number(project.height) || 0) : 0), [project]);
  const pricePerMeter = useMemo(() => (project ? (Number(project.pricePerMeter) || 0) : 0), [project]);
  const quantity = useMemo(() => (project ? (Number(project.quantity) || 0) : 0), [project]);
  const subtotal = useMemo(() => Math.max(0, area * pricePerMeter), [area, pricePerMeter]);

  // Accessories cost (dynamic from DB)
  const accessoriesCost = useMemo(() => {
    if (!project) return 0;
    // If backend already includes priced accessories on the project
    if (Array.isArray(project.accessories)) return project.accessories.reduce((s: number, a: any) => s + (Number(a.price) || 0), 0);
    // Otherwise resolve from catalog using selectedAcc
    const pid = String(project.ptype || project.type || '');
    const prod = catalog?.products?.find(p => p.id === pid);
    const accessories = prod?.accessories || [];
    if (Array.isArray(project.selectedAcc) && accessories.length) {
      return project.selectedAcc.reduce((s: number, id: string) => {
        const acc = accessories.find(a => a.id === id);
        return s + (Number(acc?.price) || 0);
      }, 0);
    }
    return 0;
  }, [project, catalog]);

  // Main item total based on current project values
  const mainItemTotal = useMemo(() => {
    const qty = Math.max(1, quantity || 0);
    return Math.max(0, Math.round((subtotal + accessoriesCost) * qty));
  }, [subtotal, accessoriesCost, quantity]);

  // Additional items helpers - filter out duplicate items that match main item exactly
  const itemsArray = useMemo(() => {
    if (!Array.isArray(project?.items)) return [];
    // Filter out items that match the main item completely (normalized with fallbacks)
    return project.items.filter((item: any) => {
      const normStr = (v: any) => String(v ?? '').trim().toLowerCase();
      const normNum = (v: any) => Number(v) || 0;
      const normPrice = (v: any) => Math.round((Number(v) || 0) * 100) / 100;
      const normAcc = (arr: any) =>
        Array.isArray(arr) ? [...arr].map((x: any) => String(x)).sort() : [];

      // Normalize main
      const mainItem = {
        ptype: normStr(project.ptype || project.type || ''),
        material: normStr(project.material || ''),
        color: normStr(project.color || ''),
        width: normNum(project.width),
        height: normNum(project.height),
        length: normNum(project.length),
        pricePerMeter: normPrice(project.pricePerMeter),
        selectedAcc: normAcc(project.selectedAcc),
        description: String(project.description || '').trim(),
      };

      // Normalize item, with fallbacks to main when missing/empty
      const itemNorm = {
        ptype: normStr(item.ptype || item.type || mainItem.ptype),
        material: normStr((item.material ?? '') || project.material || ''),
        color: normStr((item.color ?? '') || project.color || ''),
        width: normNum(item.width || project.width),
        height: normNum(item.height || project.height),
        // If item's length is missing/zero, fallback to main length (so 4×7 and 4×7×15 are considered identical when they should be)
        length: (() => {
          const l = normNum(item.length);
          return l > 0 ? l : mainItem.length;
        })(),
        // If item has no explicit pricePerMeter, fallback to main
        pricePerMeter: (() => {
          const p = normPrice(item.pricePerMeter);
          return p > 0 ? p : mainItem.pricePerMeter;
        })(),
        // If item has no accessories array or empty, fallback to main
        selectedAcc: (() => {
          const acc = normAcc(item.selectedAcc);
          return acc.length ? acc : mainItem.selectedAcc;
        })(),
        // If item description empty, fallback to main
        description: (() => {
          const d = String(item.description || '').trim();
          return d || mainItem.description;
        })(),
      };

      return JSON.stringify(mainItem) !== JSON.stringify(itemNorm);
    });
  }, [project]);
  const itemsCount = useMemo(() => itemsArray.length, [itemsArray]);
  const addItemsTotal = useMemo(() => itemsArray.reduce((s: number, it: any) => s + (Number(it?.total) || 0), 0), [itemsArray]);

  // Get accepted proposal days (only show days from accepted bids)
  const acceptedProposal = useMemo(() => {
    return proposals.find((p: any) => p.status === 'accepted');
  }, [proposals]);
  const acceptedDays = useMemo(() => {
    return acceptedProposal ? Number(acceptedProposal.days) || 0 : 0;
  }, [acceptedProposal]);

  // Identify if the main product is of type Other/custom (no price per m²)
  const isOtherMain = useMemo(() => {
    const t = String(project?.ptype || project?.type || '').trim().toLowerCase();
    const mm = String((project as any)?.measurementMode || '').trim().toLowerCase();
    const custom = Boolean((project as any)?.isCustomProduct);
    return t === 'other' || mm === 'other_3d' || custom;
  }, [project]);

  // Role flags for view logic
  const isOwner = useMemo(() => {
    const uid = String((rest as any)?.user?.id || '');
    const ownerId =
      String((project as any)?.customerId || '') ||
      String((project as any)?.userId || '') ||
      String((project as any)?.user?._id || '');
    return uid && ownerId && uid === ownerId;
  }, [rest, project]);

  const isAssignedVendor = useMemo(() => {
    const uid = String((rest as any)?.user?.id || '');
    const mid = String((project as any)?.merchantId || '');
    return uid && mid && uid === mid;
  }, [rest, project]);

  // Live countdown (for InProgress)
  const [remaining, setRemaining] = useState<string>('');
  useEffect(() => {
    try {
      const started = (project as any)?.startedAt ? new Date((project as any).startedAt) : null;
      const end = (project as any)?.expectedEndAt ? new Date((project as any).expectedEndAt) : null;
      if (!project || !started || !end) {
        setRemaining('');
        return;
      }
      const tick = () => {
        const now = new Date();
        const diff = end.getTime() - now.getTime();
        if (diff <= 0) {
          setRemaining(locale === 'ar' ? 'انتهى الوقت المتوقع' : 'Expected time elapsed');
          return;
        }
        const totalSec = Math.floor(diff / 1000);
        const days = Math.floor(totalSec / (24 * 3600));
        const hours = Math.floor((totalSec % (24 * 3600)) / 3600);
        const minutes = Math.floor((totalSec % 3600) / 60);
        const seconds = totalSec % 60;
        if (locale === 'ar') {
          setRemaining(`${days} يوم ${hours} س ${minutes} د ${seconds} ث`);
        } else {
          setRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        }
      };
      tick();
      const id = setInterval(tick, 1000);
      return () => clearInterval(id);
    } catch {
      setRemaining('');
    }
  }, [project?.startedAt, project?.expectedEndAt, project, locale]);

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
            ? project.accessories.map((a: any) => a?.id).filter(Boolean)
            : [],
        description: project.description || '',
        length: Number(project.length) || 0,
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
          length: Number(it.length) || 0,
        }));
        localStorage.setItem('edit_project_items_draft', JSON.stringify(itemsDraft));
      } else {
        localStorage.removeItem('edit_project_items_draft');
      }
    } catch { }
    setCurrentPage && setCurrentPage('projects-builder');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const back = () => {
    if (goBack) return goBack();
    setCurrentPage && setCurrentPage('projects');
  };

  // Open or create a chat for this project (works for both customer and merchant)
  const openChatWithMerchant = async (merchantId: string, merchantName?: string, merchantAvatar?: string) => {
    try {
      if (!project || !merchantId) return;

      const pid = String(project.id || project._id || '').trim();
      // Store basic values into localStorage for ProjectChat to resolve even on reload
      try { localStorage.setItem('project_chat_project_id', pid); } catch { }
      if (merchantAvatar) {
        try { localStorage.setItem('project_chat_merchant_avatar', String(merchantAvatar)); } catch { }
      }

      // If no project id yet, navigate and allow ProjectChat fallback resolution
      if (!pid) {
        setCurrentPage && setCurrentPage('project-chat');
        return;
      }

      // Determine if current user is merchant or customer
      const currentUserId = userId;
      const isCurrentUserMerchant = String(currentUserId) === String(merchantId);

      if (isCurrentUserMerchant) {
        // Current user is the merchant, so we're chatting with the customer (store counterpart info)
        try { localStorage.setItem('project_chat_merchant_id', String(merchantId)); } catch { }
        try { localStorage.setItem('project_chat_merchant_name', merchantName || ''); } catch { }
      } else {
        // Current user is customer, chatting with merchant
        try { localStorage.setItem('project_chat_merchant_id', String(merchantId)); } catch { }
        if (merchantName) { try { localStorage.setItem('project_chat_merchant_name', String(merchantName)); } catch { } }
      }

      // Try resolve existing conversation first (only if both keys exist)
      if (pid && merchantId) {
        try {
          const found = await getProjectConversationByKeys(pid, merchantId);
          if ((found as any)?.ok && (found as any).data?.id) {
            const cid = String((found as any).data.id);
            try { localStorage.setItem('project_chat_conversation_id', cid); } catch { }
            setCurrentPage && setCurrentPage('project-chat');
            return;
          }
        } catch { }
      }

      // Create new conversation (only if current user is customer)
      if (!isCurrentUserMerchant && pid && merchantId) {
        try {
          const created = await createProjectConversation(pid, merchantId);
          if ((created as any)?.ok && (created as any).data?.id) {
            const cid = String((created as any).data.id);
            try { localStorage.setItem('project_chat_conversation_id', cid); } catch { }
            setCurrentPage && setCurrentPage('project-chat');
            return;
          }
        } catch { }
      }

      // Fallback: navigate to chat page without cid; page will try resolve by keys
      setCurrentPage && setCurrentPage('project-chat');
    } catch { }
  };

  // Helper: format dimensions dynamically (W × H × L) and hide missing/zero values
  const formatDims = (w?: any, h?: any, l?: any) => {
    const W = Number(w) || 0;
    const H = Number(h) || 0;
    const L = Number(l) || 0;
    const parts: string[] = [];
    if (W > 0) parts.push(String(W));
    if (H > 0) parts.push(String(H));
    if (L > 0) parts.push(String(L));
    if (parts.length === 0) return '-';
    return `${parts.join(' × ')} m`;
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
                {locale === 'ar'
                  ? (isLoggedIn ? 'غير مصرح لك بعرض هذا المشروع.' : 'الرجاء تسجيل الدخول لعرض المشاريع.')
                  : (isLoggedIn ? 'You are not authorized to view this project.' : 'Please sign in to view projects.')
                }
              </p>
              {!isVendor && (
                <p className="text-sm text-muted-foreground">
                  {locale === 'ar' ? 'هذه الصفحة تعرض فقط مشاريع المالك.' : 'This page only shows projects owned by the current user.'}
                </p>
              )}
              <div className="pt-1">
                <Button onClick={back} className="inline-flex items-center gap-1">
                  {locale === 'ar' ? 'رجوع للمشاريع' : 'Back to Projects'} <ArrowRight className="w-4 h-4" />
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
                    <div>
                      <h1 className="text-2xl font-bold">
                        {locale === 'ar' ? ' تفاصيل المشروع'  : 'Project Details'}

                        {(project?.title || project?.productName || project?.categoryName) && (
                          <span className="text-lg font-semibold ms-2">
                            {project?.title || project?.productName || project?.categoryName}
                          </span>
                        )}

                        {typeLabel && (
                          <span className="text-lg font-medium text-muted-foreground ms-2">({typeLabel})</span>
                        )}
                      </h1>

                      {(project?.customerName || project?.userName || project?.user?.name) && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {locale === 'ar' ? 'صاحب المشروع: ' : 'Project Owner: '}
                          <span className="font-medium text-foreground">
                            {project?.customerName || project?.userName || project?.user?.name}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!!project?.status && (
                      <Badge variant="outline" className="text-xs">
                        {locale === 'ar'
                          ? (project.status === 'InProgress' ? 'قيد التنفيذ'
                            : project.status === 'Delivered' ? 'تم التسليم'
                            : project.status === 'Completed' ? 'مكتمل'
                            : project.status === 'Cancelled' ? 'ملغي'
                            : project.status === 'InBidding' ? 'قيد العروض'
                            : project.status === 'Published' ? 'منشور'
                            : project.status === 'Draft' ? 'مسودة'
                            : project.status)
                          : project.status}
                      </Badge>
                    )}
                    {project?.status === 'InProgress' && remaining && (
                      <Badge variant="secondary" className="text-xs">
                        {locale === 'ar' ? `الوقت المتبقي: ${remaining}` : `Remaining: ${remaining}`}
                      </Badge>
                    )}
                    {acceptedDays > 0 && (
                      <Badge variant="secondary" className="text-sm bg-green-100 text-green-800">
                        {locale === 'ar' ? `${acceptedDays} أيام تنفيذ` : `${acceptedDays} days execution`}
                      </Badge>
                    )}
                    {itemsCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {locale === 'ar' ? `${itemsCount + 1} عناصر` : `${itemsCount + 1} items`}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Quick summary chips */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {/* Material */}
                  {materialLabel && (
                    <Badge variant="outline" className="rounded-full text-xs">{materialLabel}</Badge>
                  )}
                  {/* Dimensions */}
                  <Badge variant="outline" className="rounded-full text-xs">
                    {formatDims(project?.width, project?.height, project?.length)}
                  </Badge>
                  {/* Quantity */}
                  <Badge variant="outline" className="rounded-full text-xs">
                    {locale === 'ar' ? `الكمية: ${project?.quantity ?? 0}` : `Quantity: ${project?.quantity ?? 0}`}
                  </Badge>
                  {/* Price per m² or Budget */}
                  {Number(project?.pricePerMeter) > 0 && !isOtherMain ? (
                    <Badge variant="outline" className="rounded-full text-xs">
                      {locale === 'ar' ? `سعر المتر: ${project.pricePerMeter}` : `Price per m²: ${project.pricePerMeter}`}
                    </Badge>
                  ) : (typeof project?.budgetMin !== 'undefined' || typeof project?.budgetMax !== 'undefined') ? (
                    <Badge variant="outline" className="rounded-full text-xs">
                      {locale === 'ar'
                        ? `الميزانية: ${project?.budgetMin ?? '-'} - ${project?.budgetMax ?? '-'}`
                        : `Budget: ${project?.budgetMin ?? '-'} - ${project?.budgetMax ?? '-'}`}
                    </Badge>
                  ) : null}
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Info grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Product Name */}
                  <div className="rounded-lg border p-4 bg-background shadow-sm">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Package className="w-4 h-4" /> {locale === 'ar' ? 'اسم المنتج' : 'Product'}
                    </div>
                    <div className="mt-1 font-medium">{productName || '-'}</div>
                  </div>

                  {/* Product Type */}
                  <div className="rounded-lg border p-4 bg-background shadow-sm">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Boxes className="w-4 h-4" /> {locale === 'ar' ? 'نوع المنتج' : 'Product Type'}
                    </div>
                    <div className="mt-1 font-medium">{typeLabel || '-'}</div>
                  </div>

                  <div className="rounded-lg border p-4 bg-background shadow-sm">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Layers className="w-4 h-4" /> {locale === 'ar' ? 'الخامة' : 'Material'}
                    </div>
                    <div className="mt-1 font-medium">{materialLabel || '-'}</div>
                  </div>
                  <div className="rounded-lg border p-4 bg-background shadow-sm">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Ruler className="w-4 h-4" /> {locale === 'ar' ? 'الأبعاد (متر)' : 'Dimensions (m)'}
                    </div>
                    <div className="mt-1 font-medium">
                      {formatDims(project?.width, project?.height, project?.length)}
                    </div>
                  </div>
                  <div className="rounded-lg border p-4 bg-background shadow-sm">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Boxes className="w-4 h-4" /> {locale === 'ar' ? 'الكمية' : 'Quantity'}
                    </div>
                    <div className="mt-1 font-medium">{project.quantity || 0}</div>
                  </div>
                  {!isOtherMain && (
                    <div className="rounded-lg border p-4 bg-background shadow-sm">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <ClipboardList className="w-4 h-4" /> {locale === 'ar' ? 'سعر المتر المربع' : 'Price per m²'}
                      </div>
                      <div className="mt-1 font-medium">{project.pricePerMeter || 0} {currency}</div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Accessories */}
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">{locale === 'ar' ? 'الملحقات' : 'Accessories'}</div>
                  {accessoriesNames.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {accessoriesNames.map((name: string, idx: number) => (
                        <Badge key={`acc-${idx}-${name}`} variant="outline" className="rounded-full px-3 py-1 text-xs">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">{locale === 'ar' ? 'بدون' : 'None'}</div>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">{locale === 'ar' ? 'الوصف' : 'Description'}</div>
                  {project.description ? (
                    <div className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 border rounded-md p-3">
                      {project.description}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">{locale === 'ar' ? 'لا يوجد وصف مضاف.' : 'No description provided.'}</div>
                  )}
                </div>

                {/* Delivery details when Delivered */}
                {project?.status === 'Delivered' && (project?.deliveryNote || (Array.isArray(project?.deliveryFiles) && project.deliveryFiles.length > 0)) && (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">{locale === 'ar' ? 'تفاصيل التسليم' : 'Delivery details'}</div>
                    {project.deliveryNote && (
                      <div className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 border rounded-md p-3">
                        {project.deliveryNote}
                      </div>
                    )}
                    {Array.isArray(project.deliveryFiles) && project.deliveryFiles.length > 0 && (
                      <div className="flex flex-col gap-1">
                        {project.deliveryFiles.map((u: string, i: number) => (
                          <a key={`file-${i}`} href={u} target="_blank" rel="noreferrer" className="text-primary underline text-sm">
                            {locale === 'ar' ? `ملف #${i + 1}` : `File #${i + 1}`}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Payout summary when Completed (optional) */}
                {project?.status === 'Completed' && (
                  <div className="rounded-lg border p-4 bg-background shadow-sm">
                    <div className="text-sm text-muted-foreground mb-1">
                      {locale === 'ar' ? 'المدفوعات' : 'Payouts'}
                    </div>
                    <div className="text-sm">
                      {locale === 'ar' ? 'السعر المتفق عليه:' : 'Agreed price:'} {currency} {(Number(project?.agreedPrice || 0)).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                    </div>
                    <div className="text-sm">
                      {locale === 'ar' ? 'العمولة:' : 'Commission:'} {currency} {(Number(project?.platformCommission || 0)).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                    </div>
                    <div className="text-sm">
                      {locale === 'ar' ? 'أرباح التاجر:' : 'Merchant earnings:'} {currency} {(Number(project?.merchantEarnings || 0)).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                    </div>
                  </div>
                )}

                {/* Additional Items (from builder) */}
                {itemsCount > 0 && (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      {locale === 'ar' ? 'عناصر إضافية ضمن هذا المشروع' : 'Additional items in this project'}
                    </div>
                    <div className="space-y-4">
                      {itemsArray.map((it: any, idx: number) => {
                        // Dynamic labels for each additional item
                        const itPid = String(it?.ptype || it?.type || '');
                        const itProd = catalog?.products?.find(p => p.id === itPid);
                        const itTypeLabel = itProd ? (locale === 'ar' ? (itProd.ar || itProd.id) : (itProd.en || itProd.id)) : '';
                        const itMatId = String(it?.material || '');
                        const itMat = itProd?.materials?.find(m => m.id === itMatId)
                          || itProd?.subtypes?.flatMap(s => s.materials || []).find(m => m.id === itMatId);
                        const itMaterialLabel = itMat ? (locale === 'ar' ? (itMat.ar || itMat.id) : (itMat.en || itMat.id)) : '';
                        const isOtherItem = String(itPid).trim().toLowerCase() === 'other';
                        const itAccessoriesNames: string[] = (() => {
                          if (Array.isArray(it?.selectedAcc) && catalog?.products?.length) {
                            const pid = String(it?.ptype || it?.type || '');
                            const prod = catalog.products.find(p => p.id === pid);
                            const accs = prod?.accessories || [];
                            return (it.selectedAcc as string[])
                              .map((id: string) => {
                                const acc = accs.find(a => a.id === id);
                                return acc ? (locale === 'ar' ? (acc.ar || acc.id) : (acc.en || acc.id)) : null;
                              })
                              .filter(Boolean) as string[];
                          }
                          return [] as string[];
                        })();
                        return (
                          <div key={it?.id || `item-${idx}`} className="rounded-lg border p-4 bg-background shadow-sm">
                            <div className="flex items-center justify-between">
                              <div className="font-semibold">{locale === 'ar' ? `عنصر #${idx + 2}` : `Item #${idx + 2}`}</div>
                              {itTypeLabel && <Badge variant="outline">{itTypeLabel}</Badge>}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                              <div>
                                <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                  <Layers className="w-4 h-4" /> {locale === 'ar' ? 'الخامة' : 'Material'}
                                </div>
                                <div className="mt-1 font-medium">{itMaterialLabel || '-'}</div>
                              </div>
                              <div>
                                <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                  <Ruler className="w-4 h-4" /> {locale === 'ar' ? 'الأبعاد (متر)' : 'Dimensions (m)'}
                                </div>
                                <div className="mt-1 font-medium">
                                  {formatDims(it?.width, it?.height, it?.length)}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                  <Boxes className="w-4 h-4" /> {locale === 'ar' ? 'الكمية' : 'Quantity'}
                                </div>
                                <div className="mt-1 font-medium">{it?.quantity || 0}</div>
                              </div>
                              <div>
                                <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                  <Calendar className="w-4 h-4" /> {locale === 'ar' ? 'أيام التنفيذ' : 'Days to complete'}
                                </div>
                                <div className="mt-1 font-medium">{Number(it?.days) > 0 ? it.days : '-'}</div>
                              </div>
                              {!isOtherItem && Number(it?.pricePerMeter) > 0 && (
                                <div>
                                  <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <ClipboardList className="w-4 h-4" /> {locale === 'ar' ? 'سعر المتر المربع' : 'Price per m²'}
                                  </div>
                                  <div className="mt-1 font-medium">{it?.pricePerMeter || 0} {currency}</div>
                                </div>
                              )}
                            </div>
                            {/* Item accessories */}
                            <div className="mt-3">
                              <div className="text-sm text-muted-foreground">{locale === 'ar' ? 'الملحقات' : 'Accessories'}</div>
                              {itAccessoriesNames.length > 0 ? (
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {itAccessoriesNames.map((name: string, i: number) => (
                                    <Badge key={`item-acc-${i}-${name}`} variant="outline" className="rounded-full px-3 py-1 text-xs">{name}</Badge>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">{locale === 'ar' ? 'بدون' : 'None'}</div>
                              )}
                            </div>
                            {/* Item description */}
                            {it?.description && (
                              <div className="mt-3">
                                <div className="text-sm text-muted-foreground">{locale === 'ar' ? 'الوصف' : 'Description'}</div>
                                <div className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 border rounded-md p-3">{it.description}</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Totals section or other UI can continue here as per your design... */}
              </CardContent>
            </Card>

            {/* Right column: proposals / vendor form */}
            {isVendor ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{locale === 'ar' ? 'قدّم عرضك' : 'Submit your proposal'}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="grid gap-2">
                      <label className="text-sm">{locale === 'ar' ? 'السعر الإجمالي' : 'Total Price'}</label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={minPrice}
                        max={maxPrice}
                        placeholder={
                          locale === 'ar'
                            ? `بين ${currency} ${formatMoney(minPrice)} و ${currency} ${formatMoney(maxPrice)}`
                            : `Between ${currency} ${formatMoney(minPrice)} and ${currency} ${formatMoney(maxPrice)}`
                        }
                        value={offerPrice}
                        onChange={(e) => setOfferPrice(e.target.value)}
                      />
                      {(() => {
                        const v = Number(offerPrice);
                        const invalid = offerPrice !== '' && (!Number.isFinite(v) || v < minPrice || v > maxPrice);
                        if (invalid) {
                          return (
                            <span className="text-xs text-red-600">
                              {locale === 'ar'
                                ? `السعر يجب أن يكون بين ${currency} ${formatMoney(minPrice)} و ${currency} ${formatMoney(maxPrice)}`
                                : `Price must be between ${currency} ${formatMoney(minPrice)} and ${currency} ${formatMoney(maxPrice)}`}
                            </span>
                          );
                        }
                        return (
                          <span className="text-xs text-muted-foreground">
                            {locale === 'ar'
                              ? `يمكنك التقديم بين ${currency} ${formatMoney(minPrice)} و ${currency} ${formatMoney(maxPrice)}`
                              : `You can offer between ${currency} ${formatMoney(minPrice)} and ${currency} ${formatMoney(maxPrice)}`}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm">{locale === 'ar' ? 'المدة (أيام)' : 'Duration (days)'}</label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={Number(project?.days) > 0 ? Number(project?.days) : undefined}
                        placeholder={
                          Number(project?.days) > 0
                            ? (locale === 'ar' ? `من 1 إلى ${Number(project?.days)} يوم` : `From 1 to ${Number(project?.days)} days`)
                            : (locale === 'ar' ? 'أقل قيمة: 1 يوم' : 'Minimum: 1 day')
                        }
                        value={offerDays}
                        onChange={(e) => setOfferDays(e.target.value)}
                      />
                      {(() => {
                        const v = Number(offerDays);
                        const maxD = Number(project?.days) > 0 ? Number(project?.days) : Infinity;
                        const invalid = offerDays !== '' && (!Number.isFinite(v) || v < 1 || v > maxD);
                        if (invalid) {
                          return (
                            <span className="text-xs text-red-600">
                              {Number.isFinite(maxD)
                                ? (locale === 'ar' ? `عدد الأيام يجب أن يكون بين 1 و ${maxD}` : `Days must be between 1 and ${maxD}`)
                                : (locale === 'ar' ? 'عدد الأيام يجب ألا يقل عن 1' : 'Days must be at least 1')}
                            </span>
                          );
                        }
                        return (
                          <span className="text-xs text-muted-foreground">
                            {Number(project?.days) > 0
                              ? (locale === 'ar' ? `لا يمكن تجاوز ${Number(project?.days)} يوم` : `Cannot exceed ${Number(project?.days)} days`)
                              : (locale === 'ar' ? 'أقل مدة مسموحة هي يوم واحد' : 'Minimum allowed duration is 1 day')}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm">{locale === 'ar' ? 'رسالة' : 'Message'}</label>
                      <Textarea
                        rows={4}
                        placeholder={locale === 'ar' ? 'عرّف بنفسك وقدّم تفاصيل العرض' : 'Introduce yourself and provide details of your offer'}
                        value={offerMessage}
                        onChange={(e) => setOfferMessage(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        disabled={(() => {
                          if (saving || hasSubmitted) return true;
                          const vP = Number(offerPrice);
                          const vD = Number(offerDays);
                          const validP = offerPrice !== '' && isFinite(vP) && vP >= (minPrice || 0) && vP <= (maxPrice || Number.POSITIVE_INFINITY);
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
                                Swal.fire({ icon: 'success', title: locale === 'ar' ? 'تم إرسال العرض' : 'Proposal submitted', timer: 1600, showConfirmButton: false });
                              }
                            } finally {
                              setSaving(false);
                            }
                          })();
                        }}
                      >
                        <Send className="mr-2 h-4 w-4" /> {saving ? (locale === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : (isEditing ? (locale === 'ar' ? 'حفظ التعديلات' : 'Save Changes') : (locale === 'ar' ? 'إرسال العرض' : 'Send Proposal'))}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Vendor delivery action when assigned and in progress */}
                {isAssignedVendor && project?.status === 'InProgress' && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-base">{locale === 'ar' ? 'تسليم المشروع' : 'Deliver Project'}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-3">
                      <div className="text-sm text-muted-foreground">
                        {locale === 'ar'
                          ? 'أدخل ملاحظة التسليم وروابط الملفات إن وجدت (اختياري).'
                          : 'Provide a delivery note and any file links (optional).'}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={async () => {
                            try {
                              const { value: note } = await Swal.fire({
                                title: locale === 'ar' ? 'ملاحظة التسليم' : 'Delivery note',
                                input: 'textarea',
                                inputLabel: locale === 'ar' ? 'يمكن تركها فارغة' : 'Optional',
                                showCancelButton: true,
                                confirmButtonText: locale === 'ar' ? 'متابعة' : 'Continue',
                                cancelButtonText: locale === 'ar' ? 'إلغاء' : 'Cancel'
                              });
                              if (note === undefined) return;

                              const { value: filesStr } = await Swal.fire({
                                title: locale === 'ar' ? 'روابط الملفات' : 'File links',
                                input: 'text',
                                inputLabel: locale === 'ar' ? 'افصل الروابط بفواصل' : 'Comma-separated URLs',
                                inputPlaceholder: 'https://..., https://...',
                                showCancelButton: true,
                                confirmButtonText: locale === 'ar' ? 'تسليم' : 'Deliver',
                                cancelButtonText: locale === 'ar' ? 'إلغاء' : 'Cancel'
                              });
                              if (filesStr === undefined) return;
                              const files = String(filesStr || '')
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean);

                              const r = await deliverProject(String(project.id), { note: note || '', files });
                              if ((r as any)?.ok) {
                                const refreshed = await getProjectById(String(project.id));
                                if (refreshed?.ok && refreshed.data) setProject(refreshed.data as any);
                                Swal.fire({
                                  icon: 'success',
                                  title: locale === 'ar' ? 'تم التسليم' : 'Delivered successfully',
                                  timer: 1600,
                                  showConfirmButton: false
                                });
                              } else {
                                const msg = (r as any)?.data?.message || (r as any)?.error || '';
                                Swal.fire({
                                  icon: 'error',
                                  title: locale === 'ar' ? 'تعذر التسليم' : 'Delivery failed',
                                  text: msg || (locale === 'ar' ? 'تحقق من الحالة وحاول مرة أخرى' : 'Check state and try again')
                                });
                              }
                            } catch (e: any) {
                              Swal.fire({
                                icon: 'error',
                                title: locale === 'ar' ? 'تعذر التسليم' : 'Delivery failed',
                                text: e?.message || (locale === 'ar' ? 'حدث خطأ غير متوقع' : 'Unexpected error')
                              });
                            }
                          }}
                        >
                          {locale === 'ar' ? 'تسليم الآن' : 'Deliver now'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              // Owner/non-vendor: view and manage received proposals
              <>
                {isOwner && project?.status === 'Delivered' && (
                  <div className="flex items-center justify-between p-3 mb-3 border rounded-md bg-muted/30">
                    <div className="text-sm">
                      {locale === 'ar' ? 'تم تسليم المشروع. راجع الملاحظات والملفات ثم اتخذ إجراء.' : 'Project delivered. Review notes/files and take action.'}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        size="sm"
                        onClick={async () => {
                          try {
                            const r = await acceptDelivery(String(project.id));
                            if ((r as any)?.ok) {
                              const refreshed = await getProjectById(String(project.id));
                              if (refreshed?.ok && refreshed.data) setProject(refreshed.data as any);
                              Swal.fire({
                                icon: 'success',
                                title: locale === 'ar' ? 'تم قبول التسليم' : 'Delivery accepted',
                                timer: 1400,
                                showConfirmButton: false
                              });
                              // Ask for rating
                              const { value: ratingVal } = await Swal.fire({
                                title: locale === 'ar' ? 'قيّم التاجر' : 'Rate the merchant',
                                input: 'range',
                                inputAttributes: { min: '1', max: '5', step: '1' },
                                inputValue: 5,
                                showCancelButton: true,
                                confirmButtonText: locale === 'ar' ? 'متابعة' : 'Continue',
                                cancelButtonText: locale === 'ar' ? 'تخطي' : 'Skip'
                              });
                              if (ratingVal !== undefined) {
                                const { value: comment } = await Swal.fire({
                                  title: locale === 'ar' ? 'تعليق (اختياري)' : 'Comment (optional)',
                                  input: 'textarea',
                                  inputPlaceholder: locale === 'ar' ? 'اكتب تعليقك...' : 'Write a comment...',
                                  showCancelButton: true,
                                  confirmButtonText: locale === 'ar' ? 'إرسال' : 'Submit',
                                  cancelButtonText: locale === 'ar' ? 'إلغاء' : 'Cancel'
                                });
                                const rr = await rateMerchant(String(project.id), Number(ratingVal || 5), String(comment || ''));
                                if ((rr as any)?.ok) {
                                  Swal.fire({
                                    icon: 'success',
                                    title: locale === 'ar' ? 'تم حفظ التقييم' : 'Rating saved',
                                    timer: 1200,
                                    showConfirmButton: false
                                  });
                                }
                              }
                            } else {
                              const msg = (r as any)?.data?.message || (r as any)?.error || '';
                              Swal.fire({
                                icon: 'error',
                                title: locale === 'ar' ? 'تعذر قبول التسليم' : 'Accept delivery failed',
                                text: msg || (locale === 'ar' ? 'تحقق من الحالة' : 'Check current state')
                              });
                            }
                          } catch (e: any) {
                            Swal.fire({
                              icon: 'error',
                              title: locale === 'ar' ? 'تعذر قبول التسليم' : 'Accept delivery failed',
                              text: e?.message || (locale === 'ar' ? 'حدث خطأ غير متوقع' : 'Unexpected error')
                            });
                          }
                        }}
                      >
                        {locale === 'ar' ? 'قبول التسليم' : 'Accept delivery'}
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          try {
                            const { value: reason } = await Swal.fire({
                              title: locale === 'ar' ? 'سبب الرفض' : 'Rejection reason',
                              input: 'textarea',
                              inputPlaceholder: locale === 'ar' ? 'اذكر السبب' : 'Provide a reason',
                              showCancelButton: true,
                              confirmButtonText: locale === 'ar' ? 'رفض' : 'Reject',
                              cancelButtonText: locale === 'ar' ? 'إلغاء' : 'Cancel'
                            });
                            if (reason === undefined) return;
                            const r = await rejectProjectDelivery(String(project.id), String(reason || ''));
                            if ((r as any)?.ok) {
                              const refreshed = await getProjectById(String(project.id));
                              if (refreshed?.ok && refreshed.data) setProject(refreshed.data as any);
                              Swal.fire({
                                icon: 'success',
                                title: locale === 'ar' ? 'تم رفض التسليم' : 'Delivery rejected',
                                timer: 1400,
                                showConfirmButton: false
                              });
                            } else {
                              const msg = (r as any)?.data?.message || (r as any)?.error || '';
                              Swal.fire({
                                icon: 'error',
                                title: locale === 'ar' ? 'تعذر رفض التسليم' : 'Reject delivery failed',
                                text: msg || (locale === 'ar' ? 'تحقق من الحالة' : 'Check current state')
                              });
                            }
                          } catch (e: any) {
                            Swal.fire({
                              icon: 'error',
                              title: locale === 'ar' ? 'تعذر رفض التسليم' : 'Reject delivery failed',
                              text: e?.message || (locale === 'ar' ? 'حدث خطأ غير متوقع' : 'Unexpected error')
                            });
                          }
                        }}
                      >
                        {locale === 'ar' ? 'طلب تعديلات' : 'Request changes'}
                      </Button>
                    </div>
                  </div>
                )}

                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">{locale === 'ar' ? 'عروض مقدّمة' : 'Submitted Proposals'}</h2>
                      <Badge variant="outline">{proposals.length}</Badge>
                    </div>
                    {proposals.length === 0 ? (
                      <div className="text-sm text-muted-foreground">{locale === 'ar' ? 'لا توجد عروض حتى الآن.' : 'No proposals yet.'}</div>
                    ) : (
                      <div className="space-y-4">
                        {proposals.map((pp: any, idx: number) => (
                          <Card key={pp.id || `proposal-${idx}`} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-start gap-3">
                                  {/* Merchant Avatar (image if provided, otherwise initials) */}
                                  {pp.merchantProfilePicture ? (
                                    <img
                                      src={pp.merchantProfilePicture}
                                      alt={pp.merchantName || 'Merchant'}
                                      className="w-12 h-12 rounded-full object-cover border"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                                      {pp.merchantName ? pp.merchantName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'M'}
                                    </div>
                                  )}

                                  <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-semibold text-base">
                                        {pp.merchantName || (locale === 'ar' ? 'تاجر' : 'Merchant')}
                                      </h4>
                                      <Badge variant={pp.status === 'accepted' ? 'secondary' : pp.status === 'rejected' ? 'destructive' : 'outline'} className="text-xs">
                                        {locale === 'ar' ? (pp.status === 'pending' ? 'معلق' : pp.status === 'accepted' ? 'مقبول' : 'مرفوض') : pp.status}
                                      </Badge>
                                    </div>

                                    {/* Rating Stars based on backend merchantRating, with numeric value if present */}
                                    <div className="flex items-center gap-1">
                                      {[1, 2, 3, 4, 5].map(star => {
                                        const ratingVal = Number(pp.merchantRating ?? 0);
                                        const filled = Number.isFinite(ratingVal) ? star <= Math.round(Math.max(0, Math.min(5, ratingVal))) : false;
                                        return (
                                          <Star key={star} className={`w-3 h-3 ${filled ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                                        );
                                      })}
                                      {Number.isFinite(Number(pp.merchantRating)) && (
                                        <span className="text-xs text-muted-foreground ms-1">{Number(pp.merchantRating).toFixed(1)}</span>
                                      )}
                                    </div>

                                    {/* Completed / Accepted summary if available */}
                                    {(Number.isFinite(Number(pp.merchantCompletedProjects)) || Number.isFinite(Number(pp.merchantAcceptedProjects))) && (
                                      <p className="text-xs text-muted-foreground">
                                        {(() => {
                                          const completed = Number(pp.merchantCompletedProjects || 0);
                                          const accepted = Number(pp.merchantAcceptedProjects || 0);
                                          if (locale === 'ar') {
                                            return accepted > 0
                                              ? `إنجازات: أكمل ${completed} من ${accepted} مشروع`
                                              : `إنجازات: أكمل ${completed} مشروع`;
                                          }
                                          return accepted > 0
                                            ? `Achievements: completed ${completed} of ${accepted} projects`
                                            : `Achievements: completed ${completed} projects`;
                                        })()}
                                      </p>
                                    )}

                                    {pp.createdAt && (
                                      <p className="text-xs text-muted-foreground">
                                        {locale === 'ar' ? 'تاريخ التقديم: ' : 'Submitted: '}
                                        {new Date(pp.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 mb-3">
                                <div className="text-center p-3 bg-primary/5 rounded-lg">
                                  <div className="text-xs text-muted-foreground mb-1">{locale === 'ar' ? 'السعر المعروض' : 'Offered Price'}</div>
                                  <div className="text-lg font-bold text-primary">
                                    {currency} {Number(pp.price || 0).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                                  </div>
                                </div>
                                <div className="text-center p-3 bg-muted/30 rounded-lg">
                                  <div className="text-xs text-muted-foreground mb-1">{locale === 'ar' ? 'مدة التنفيذ' : 'Duration'}</div>
                                  <div className="text-lg font-bold">
                                    {Number(pp.days || 0)} {locale === 'ar' ? 'يوم' : 'days'}
                                  </div>
                                </div>
                              </div>

                              {pp.message && (
                                <div className="mb-3">
                                  <div className="text-xs text-muted-foreground mb-1">{locale === 'ar' ? 'رسالة التاجر:' : 'Merchant message:'}</div>
                                  <div className="text-sm bg-muted/20 rounded-lg p-3 border-l-4 border-primary/20">
                                    {pp.message}
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-2 border-t">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="inline-flex items-center gap-2"
                                  onClick={() => openChatWithMerchant(
                                    String(pp.merchantId || ''),
                                    String(pp.merchantName || ''),
                                    pp.merchantProfilePicture || ''
                                  )}
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  {locale === 'ar' ? 'مراسلة التاجر' : 'Chat with merchant'}
                                </Button>

                                {pp.status === 'pending' && (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={async () => {
                                        try {
                                          const r = await acceptBid(String(pp.id));
                                          if ((r as any)?.ok) {
                                            if (project?.id) {
                                              const refreshed = await getProjectById(String(project.id));
                                              if (refreshed?.ok && refreshed.data) {
                                                setProject(refreshed.data as any);
                                              }
                                            }
                                            const rd = await getProjectBids(String(project.id));
                                            if (rd.ok && Array.isArray(rd.data)) setProposals(rd.data as BidDto[]);
                                            Swal.fire({ icon: 'success', title: locale === 'ar' ? 'تم قبول العرض وبدء التنفيذ' : 'Bid accepted and project started', timer: 1600, showConfirmButton: false });
                                          } else {
                                            const msg = (r as any)?.data?.message || (r as any)?.error || (r as any)?.statusText || '';
                                            Swal.fire({ icon: 'error', title: locale === 'ar' ? 'فشل قبول العرض' : 'Failed to accept bid', text: msg || (locale === 'ar' ? 'حدث خطأ غير متوقع' : 'Unexpected error') });
                                          }
                                        } catch (e: any) {
                                          Swal.fire({ icon: 'error', title: locale === 'ar' ? 'فشل قبول العرض' : 'Failed to accept bid', text: e?.message || (locale === 'ar' ? 'حدث خطأ غير متوقع' : 'Unexpected error') });
                                        }
                                      }}
                                    >
                                      <Check className="w-4 h-4 ml-1" /> {locale === 'ar' ? 'قبول' : 'Accept'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="bg-red-600 hover:bg-red-700"
                                      onClick={async () => {
                                        try {
                                          const r = await rejectBid(String(pp.id));
                                          if (r.ok && project) {
                                            const rd = await getProjectBids(String(project.id));
                                            if (rd.ok && Array.isArray(rd.data)) setProposals(rd.data as BidDto[]);
                                          }
                                        } catch { }
                                      }}
                                    >
                                      <X className="w-4 h-4 ml-1" /> {locale === 'ar' ? 'رفض' : 'Reject'}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </div>

      <Footer setCurrentPage={setCurrentPage as any} />
    </div>
  );
}