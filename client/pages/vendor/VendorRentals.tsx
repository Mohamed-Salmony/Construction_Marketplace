import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Search, Package, Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '../../components/ui/dialog';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { RouteContext } from '../../components/Router';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useTranslation } from '../../hooks/useTranslation';
import { toastError, toastSuccess } from '../../utils/alerts';
import { getMyProducts } from '@/services/products';
import { listMyRentals, createRental, type CreateRentalInput, updateRental, deleteRental, listRentalMessages, replyRentalMessage, getRentalById } from '@/services/rentals';
import { api } from '@/lib/api';
import { getCommissionRates } from '@/services/commissions';
import { getRootRentalCategories, type RentalCategoryDto } from '@/services/rentalCategories';
import { useFirstLoadOverlay } from '../../hooks/useFirstLoadOverlay';

// This page mirrors VendorProducts but for rentals. It reuses ProductForm and ProductItem for speed.

type VendorRentalsProps = Partial<RouteContext>;

export default function VendorRentals({ setCurrentPage, ...context }: VendorRentalsProps) {
  const { locale } = useTranslation();
  const hideFirstOverlay = useFirstLoadOverlay(
    context,
    locale==='ar' ? 'جاري تحميل التأجير' : 'Loading rentals',
    locale==='ar' ? 'يرجى الانتظار' : 'Please wait'
  );
  const [rentals, setRentals] = useState<any[]>([]);
  const [filteredRentals, setFilteredRentals] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTarget, setEditTarget] = useState<any|null>(null);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  // Dates are set by technician, not vendor
  const [editRate, setEditRate] = useState('');
  const [editDeposit, setEditDeposit] = useState('');
  const [editCurrency, setEditCurrency] = useState('SAR');
  const [editSpecial, setEditSpecial] = useState('');
  const [editUsage, setEditUsage] = useState('');
  const [editMachine, setEditMachine] = useState('');
  const [editProductId, setEditProductId] = useState<string>('');
  // Rental categories
  const [rentalCategories, setRentalCategories] = useState<RentalCategoryDto[]>([]);
  const [selectedRentalCategory, setSelectedRentalCategory] = useState('');
  // Messages dialog
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgTarget, setMsgTarget] = useState<any|null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [msgReply, setMsgReply] = useState('');
  const [msgLoading, setMsgLoading] = useState(false);
  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);
  // Form fields
  // product free text (machine name) with backend mapping to productId
  const [machineName, setMachineName] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('');
  // Dates are set by technician, not vendor
  const [dailyRate, setDailyRate] = useState<string>('');
  const [securityDeposit, setSecurityDeposit] = useState<string>('');
  const [currency, setCurrency] = useState<string>('SAR');
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  // Delivery/Pickup removed from UI for now
  const [requiresDelivery, setRequiresDelivery] = useState<boolean>(false);
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [deliveryFee, setDeliveryFee] = useState<string>('');
  const [requiresPickup, setRequiresPickup] = useState<boolean>(false);
  const [pickupFee, setPickupFee] = useState<string>('');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [usageNotes, setUsageNotes] = useState<string>('');
  const [myProducts, setMyProducts] = useState<any[]>([]);

  const safeSetCurrentPage = setCurrentPage ?? (() => {});

  // Derived calculations for create form
  const parsedDaily = Number(dailyRate || 0) || 0;
  const parsedDeposit = Number(securityDeposit || 0) || 0;
  // Total will be computed later by technician based on agreed dates
  const [commissionPct, setCommissionPct] = useState<number>(0);
  const [ratesCurrency, setRatesCurrency] = useState<string>('SAR');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rents, prods, rentalCats] = await Promise.all([
          listMyRentals(), 
          getMyProducts(),
          getRootRentalCategories()
        ]);
        if (!cancelled) {
          setRentals(Array.isArray(rents.data) ? (rents.data as any[]) : []);
          setMyProducts(Array.isArray(prods.data) ? (prods.data as any[]) : []);
          setRentalCategories(Array.isArray(rentalCats.data) ? (rentalCats.data as RentalCategoryDto[]) : []);
        }
      } catch {
        if (!cancelled) { 
          setRentals([]); 
          setRentalCategories([]);
          toastError(locale==='ar'?'فشل تحميل التأجير':'Failed to load rentals', locale==='ar'); 
        }
      } finally { if (!cancelled) { try { hideFirstOverlay(); } catch {} } }
    })();
    return () => { cancelled = true; };
  }, [hideFirstOverlay, locale]); // Include dependencies as indicated by ESLint

  // Load commission rates for rentals (now uses separate rentals commission rate)
  useEffect(() => {
    (async () => {
      try {
        const { ok, data } = await getCommissionRates();
        if (ok && (data as any)?.rates) {
          // Use rentals commission rate if available, fallback to products rate
          setCommissionPct(Number((data as any).rates.rentalsMerchants || (data as any).rates.products || 0));
          setRatesCurrency(String((data as any).rates.currency || 'SAR'));
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    let filtered = rentals;
    if (searchTerm) {
      filtered = filtered.filter((r: any) =>
        (r.name || '').includes(searchTerm) ||
        (r.partNumber || '').includes(searchTerm) ||
        (r.brand || '').includes(searchTerm)
      );
    }
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((r: any) => r.rentalCategoryId === selectedCategory);
    }
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((r: any) => r.status === selectedStatus);
    }
    setFilteredRentals(filtered);
  }, [searchTerm, selectedCategory, selectedStatus, rentals]);

  const resetForm = () => {
    setMachineName(''); setProductId(''); setCustomerId(''); setDailyRate(''); setSecurityDeposit('');
    setCurrency('SAR'); setSelectedRentalCategory(''); setRequiresDelivery(false); setDeliveryAddress(''); setDeliveryFee(''); setRequiresPickup(false); setPickupFee(''); setSpecialInstructions(''); setUsageNotes(''); setImages([]);
  };

  // Read hint from URL/localStorage to auto-open messages for a rental
  useEffect(() => {
    try {
      let id: string | null = null;
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        id = url.searchParams.get('openMessagesFor');
        if (!id) id = localStorage.getItem('open_messages_rental');
      }
      if (id) setPendingOpenId(id);
    } catch {}
  }, []);

  // Listen to custom event from Header to open messages instantly when clicking a notification
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail || {};
        const rid = String(detail.rentalId || '');
        if (!rid) return;
        setPendingOpenId(rid);
        // also persist so a subsequent navigation still works
        try { localStorage.setItem('open_messages_rental', rid); } catch {}
      } catch {}
    };
    window.addEventListener('open_messages_rental', handler as any);
    return () => {
      window.removeEventListener('open_messages_rental', handler as any);
    };
  }, []);

  // Once rentals are loaded, open dialog if requested
  useEffect(() => {
    if (!pendingOpenId) return;
    const r = rentals.find((x:any) => String(x.id) === String(pendingOpenId));
    if (r) {
      openMessages(r);
      setPendingOpenId(null);
      try {
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('openMessagesFor');
          window.history.replaceState({}, '', url.toString());
          localStorage.removeItem('open_messages_rental');
        }
      } catch {}
    }
  }, [pendingOpenId, rentals]);

  const openMessages = async (r:any) => {
    setMsgTarget(r); setMsgOpen(true); setMessages([]); setMsgReply(''); setMsgLoading(true);
    try {
      const rid = String(r?.id ?? r?._id ?? r?.Id ?? '');
      const res = await listRentalMessages(rid);
      if (res.ok && Array.isArray(res.data)) setMessages(res.data as any[]);
    } finally { setMsgLoading(false); }
  };

  const sendReply = async () => {
    if (!msgTarget || !msgReply.trim()) return;
    setMsgLoading(true);
    try {
      const rid = String((msgTarget as any)?.id ?? (msgTarget as any)?._id ?? (msgTarget as any)?.Id ?? '');
      const res = await replyRentalMessage(rid, msgReply.trim());
      if (res.ok) {
        setMsgReply('');
        const r2 = await listRentalMessages(rid);
        if (r2.ok && Array.isArray(r2.data)) setMessages(r2.data as any[]);
        // refresh counts
        const fresh = await listMyRentals();
        setRentals(Array.isArray(fresh.data) ? (fresh.data as any[]) : []);
      }
    } finally { setMsgLoading(false); }
  };

  const openEdit = async (r:any) => {
    // Use unified add dialog with prefilled values
    setEditMode(true);
    setEditTarget(r);
    setDialogOpen(true);
    // Start with what we have
    const rid = String(r?.id ?? r?._id ?? r?.Id ?? '');
    let details: any = r;
    if (rid) {
      try {
        const full = await getRentalById(rid);
        if (full.ok && full.data) details = full.data as any;
      } catch {}
    }
    // Case-insensitive search helpers for robustness against API field variations
    const pickVal = (obj:any, candidates:string[]) => {
      try {
        const map: Record<string, any> = {};
        Object.keys(obj||{}).forEach(k => { map[k.toLowerCase()] = (obj as any)[k]; });
        for (const c of candidates) {
          const v = map[c.toLowerCase()];
          if (v !== undefined && v !== null) return v;
        }
      } catch {}
      return undefined;
    };
    const depRaw =
      details.securityDeposit ?? details.securityDepositAmount ?? details.deposit ?? details.depositAmount ?? details.secDeposit ??
      r.securityDeposit ?? r.securityDepositAmount ?? r.deposit ?? r.depositAmount ?? r.secDeposit ??
      pickVal(details, ['securityDeposit','deposit','securityDepositAmount','depositAmount','secDeposit']) ??
      pickVal(r, ['securityDeposit','deposit','securityDepositAmount','depositAmount','secDeposit']);
    const notesRaw =
      details.usageNotes ?? details.rentalNotes ?? details.notes ??
      r.usageNotes ?? r.rentalNotes ?? r.notes ??
      pickVal(details, ['usageNotes','notes','rentalNotes']) ??
      pickVal(r, ['usageNotes','notes','rentalNotes']);
    const specRaw =
      details.specialInstructions ?? details.instructions ?? details.special ??
      r.specialInstructions ?? r.instructions ?? r.special ??
      pickVal(details, ['specialInstructions','instructions','special']) ??
      pickVal(r, ['specialInstructions','instructions','special']);
    const dep = (depRaw !== undefined && depRaw !== null) ? String(depRaw) : '';
    const notes = (notesRaw !== undefined && notesRaw !== null) ? String(notesRaw) : '';
    const spec = (specRaw !== undefined && specRaw !== null) ? String(specRaw) : '';
    try { console.debug('Edit rental details', { dep, notes, spec, details }); } catch {}
    setMachineName(String(details.productName || r.productName || ''));
    setProductId(details.productId ? String(details.productId) : (r.productId ? String(r.productId) : ''));
    setCustomerId(String(details.customerId || r.customerId || ''));
    setDailyRate(String((details.dailyRate ?? r.dailyRate ?? '') as any));
    setSecurityDeposit(dep);
    setCurrency(String(details.currency || r.currency || 'SAR'));
    // If usage notes are empty but special instructions were used to store text in earlier versions, show them in notes too
    setUsageNotes(notes || spec);
    setSpecialInstructions(spec);
    // Preload existing image into thumbnails
    const img = String(details.imageUrl || r.imageUrl || '');
    setImages(img ? [img] : []);
    setImageFiles([]);
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    try {
      setSaving(true);
      const rid = String((editTarget as any)?.id ?? (editTarget as any)?._id ?? (editTarget as any)?.Id ?? (editTarget as any)?.ID ?? '');
      if (!rid) {
        toastError(locale==='ar'? 'تعذر تحديد العقد لتحديثه.' : 'Unable to determine rental id to update.', locale==='ar');
        setSaving(false);
        return;
      }
      const res = await updateRental(rid, {
        dailyRate: Number(editRate||0),
        securityDeposit: editDeposit ? Number(editDeposit) : 0,
        currency: editCurrency,
        specialInstructions: editSpecial,
        usageNotes: editUsage,
        productId: editProductId ? String(editProductId) : undefined,
      });
      if (res.ok) {
        toastSuccess(locale==='ar'? 'تم تحديث العقد' : 'Rental updated', locale==='ar');
        setEditOpen(false);
        const fresh = await listMyRentals();
        setRentals(Array.isArray(fresh.data) ? (fresh.data as any[]) : []);
      } else {
        toastError(locale==='ar'? 'فشل تحديث العقد' : 'Failed to update rental', locale==='ar');
      }
    } finally { setSaving(false); }
  };

  const removeRental = async (r:any) => {
    try {
      if (!confirm(locale==='ar'? 'هل تريد حذف هذا العقد؟' : 'Delete this rental?')) return;
      const rid = String(r?.id ?? r?._id ?? r?.Id ?? '');
      const res = await deleteRental(rid);
      if (res.ok) {
        toastSuccess(locale==='ar'? 'تم حذف العقد' : 'Rental deleted', locale==='ar');
        const fresh = await listMyRentals();
        setRentals(Array.isArray(fresh.data) ? (fresh.data as any[]) : []);
      } else {
        toastError(locale==='ar'? 'فشل حذف العقد' : 'Failed to delete rental', locale==='ar');
      }
    } catch {
      toastError(locale==='ar'? 'فشل حذف العقد' : 'Failed to delete rental', locale==='ar');
    }
  };

  const submitRental = async () => {
    try {
      // If no matched product, allow creation without linking a product (backend supports optional productId)
      const effectiveProductId = productId || (myProducts?.[0]?.id ? String(myProducts[0].id) : '');
      if (!dailyRate || !securityDeposit) {
        toastError(
          locale==='ar'
            ? 'يرجى تعبئة الحقول المطلوبة (سعر اليوم، التأمين)'
            : 'Please fill required fields (daily rate, deposit)',
          locale==='ar'
        );
        return;
      }
      setSaving(true);
      // Upload first image if provided
      let uploadedUrl: string | undefined = undefined;
      try {
        if (imageFiles.length > 0) {
          const up = await api.uploadFiles([imageFiles[0]], 'images');
          if (up.ok && up.data && Array.isArray((up.data as any).items) && (up.data as any).items[0]?.url) {
            uploadedUrl = (up.data as any).items[0].url as string;
          }
        }
      } catch {}

      const todayIso = new Date().toISOString();
      // Determine customer id automatically if not provided
      let effectiveCustomerId = (customerId || '').trim();
      if (!effectiveCustomerId) {
        try { effectiveCustomerId = String((context as any)?.user?.id || ''); } catch {}
        if (!effectiveCustomerId) {
          try {
            const raw = localStorage.getItem('mock_current_user');
            if (raw) effectiveCustomerId = String((JSON.parse(raw)||{}).id || '');
          } catch {}
        }
      }
      if (!effectiveCustomerId) {
        toastError(locale==='ar'? 'تعذر تحديد هوية العميل. يرجى تسجيل الدخول أولاً.' : 'Could not determine customer identity. Please log in first.', locale==='ar');
        setSaving(false);
        return;
      }
      const payload: any = {
        productId: effectiveProductId ? String(effectiveProductId) : undefined,
        productName: machineName ? machineName.trim() : undefined,
        customerId: effectiveCustomerId,
        // Backend requires dates: provide same-day placeholder; technician will adjust later
        startDate: todayIso,
        endDate: todayIso,
        dailyRate: Number(dailyRate),
        currency,
        securityDeposit: Number(securityDeposit),
        // Include rental category
        rentalCategoryId: selectedRentalCategory || undefined,
        // Delivery/Pickup removed
        requiresDelivery: false,
        requiresPickup: false,
        specialInstructions: [specialInstructions, machineName ? `${locale==='ar' ? 'اسم الآلة' : 'Machine'}: ${machineName}` : ''].filter(Boolean).join(' | ') || undefined,
        usageNotes: usageNotes || undefined,
        // Attach image url if uploaded
        ...(uploadedUrl ? { imageUrl: uploadedUrl } as any : {}),
      };
      // If editing, call updateRental instead
      let res: any;
      if (editMode && editTarget) {
        const rid = String((editTarget as any)?.id ?? (editTarget as any)?._id ?? '');
        if (!rid) {
          toastError(locale==='ar'? 'تعذر تحديد العقد لتحديثه.' : 'Unable to determine rental id to update.', locale==='ar');
          setSaving(false);
          return;
        }
        res = await updateRental(rid, {
          dailyRate: Number(dailyRate),
          securityDeposit: Number(securityDeposit),
          currency,
          specialInstructions,
          usageNotes,
          productId: effectiveProductId ? String(effectiveProductId) : undefined,
        } as any);
        // If a new image was uploaded, attempt to update imageUrl too
        if (res.ok && uploadedUrl) {
          try { await updateRental(rid, { imageUrl: uploadedUrl } as any); } catch {}
        }
      } else {
        res = await createRental(payload);
      }

      if (res.ok) {
        toastSuccess(
          editMode ? (locale==='ar'? 'تم تحديث عقد التأجير' : 'Rental updated') : (locale==='ar'? 'تم إنشاء عقد التأجير' : 'Rental created'),
          locale==='ar'
        );
        setDialogOpen(false);
        setEditMode(false); setEditTarget(null);
        resetForm();
        const fresh = await listMyRentals();
        setRentals(Array.isArray(fresh.data) ? (fresh.data as any[]) : []);
      } else {
        const status = (res as any)?.status;
        const msg = (res as any)?.error?.message || (res as any)?.data?.message || '';
        toastError(
          locale==='ar'
            ? `${editMode? 'فشل تحديث عقد التأجير' : 'فشل إنشاء عقد التأجير'}${status? ` (رمز ${status})`: ''}${msg? ` • ${msg}`: ''}`
            : `${editMode? 'Failed to update rental' : 'Failed to create rental'}${status? ` (status ${status})`: ''}${msg? ` • ${msg}`: ''}`,
          locale==='ar'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header currentPage="vendor-rentals" setCurrentPage={safeSetCurrentPage} {...context} />

      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{locale === 'en' ? 'Rental Management' : 'إدارة التأجير'}</h1>
            <p className="text-muted-foreground">{locale === 'en' ? 'Manage your rentals' : 'إدارة خدمات التأجير'}</p>
          </div>
          <div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> {locale==='ar'? 'إضافة تأجير' : 'Add Rental'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editMode ? (locale==='ar'? 'تعديل عقد التأجير' : 'Edit Rental') : (locale==='ar'? 'إضافة عقد تأجير' : 'Create Rental')}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>{locale==='ar'? 'الآلة' : 'Machine'}</Label>
                    <Input
                      value={machineName}
                      onChange={(e)=> {
                        const val = e.target.value;
                        setMachineName(val);
                        // try to match a product by name and set its id for backend
                        const match = (myProducts || []).find((p:any)=> String(p.name || '').toLowerCase().includes(val.toLowerCase()));
                        setProductId(match ? String(match.id) : '');
                      }}
                      placeholder={locale==='ar'? 'اكتب اسم الآلة' : 'Type machine name'}
                    />
                    {productId && (
                      <div className="text-xs text-green-600">
                        {locale==='ar'? `تم التعرف على المنتج (ID ${productId}) تلقائياً` : `Matched product (ID ${productId})`}
                      </div>
                    )}
                  </div>
                  {/* Rental Category Selection */}
                  <div className="space-y-2 md:col-span-2">
                    <Label>{locale==='ar'? 'فئة التأجير' : 'Rental Category'}</Label>
                    <Select value={selectedRentalCategory} onValueChange={setSelectedRentalCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder={locale==='ar' ? 'اختر فئة التأجير' : 'Select rental category'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{locale==='ar' ? 'بدون فئة' : 'No category'}</SelectItem>
                        {rentalCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {locale==='ar' ? (category.nameAr || category.nameEn) : (category.nameEn || category.nameAr)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Customer ID (optional; auto-filled) */}
                  <div className="space-y-2 hidden">
                    <Label>{locale==='ar'? 'معرّف العميل' : 'Customer ID'}</Label>
                    <Input
                      value={customerId}
                      onChange={(e)=> setCustomerId(e.target.value)}
                      placeholder={locale==='ar'? 'أدخل رقم/معرّف العميل' : 'Enter customer id'}
                    />
                  </div>

                  {/* Optional images upload for the contract */}
                  <div className="space-y-2 md:col-span-2">
                    <Label>{locale==='ar'? 'صور العقد (اختياري)' : 'Contract images (optional)'}</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e)=>{
                          const files = Array.from(e.target.files || []);
                          if (!files.length) return;
                          const readers = files.map((file)=> new Promise<string>((resolve)=>{
                            const fr = new FileReader();
                            fr.onload = ()=> resolve(String(fr.result || ''));
                            fr.readAsDataURL(file);
                          }));
                          Promise.all(readers).then((base64s)=> {
                            setImages(prev=> [...prev, ...base64s]);
                            setImageFiles(prev => [...prev, ...files]);
                          });
                        }}
                      />
                      {images.length > 0 && (
                        <span className="text-xs text-muted-foreground">{locale==='ar'? `${images.length} صورة مضافة` : `${images.length} image(s) added`}</span>
                      )}
                    </div>
                    {images.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {images.map((src, idx)=> (
                          <div key={idx} className="relative w-16 h-16 border rounded overflow-hidden bg-white">
                            <Image src={src} alt={`img-${idx}`} width={64} height={64} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              className="absolute -top-1 -right-1 bg-white/90 border rounded-full w-5 h-5 text-xs"
                              title={locale==='ar'? 'حذف' : 'Remove'}
                              onClick={()=> { setImages(prev=> prev.filter((_,i)=> i!==idx)); setImageFiles(prev => prev.filter((_,i)=> i!==idx)); }}
                            >×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Dates removed: technician will set the schedule */}
                  <div className="space-y-2">
                    <Label>{locale==='ar'? 'سعر اليوم' : 'Daily rate'}</Label>
                    <Input type="number" inputMode="decimal" value={dailyRate} onChange={(e)=> setDailyRate(e.target.value)} placeholder="0.00" />
                    {/* Commission preview for rentals */}
                    {commissionPct > 0 && Number(dailyRate || 0) > 0 && (
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="text-blue-600">
                          {locale==='ar' ? 'النسبة الحالية:' : 'Current rate:'} {commissionPct}%
                        </div>
                        <div>
                          {locale==='ar' ? 'عمولة المنصة لليوم:' : 'Platform commission per day:'} {Math.round(Number(dailyRate || 0) * (commissionPct / 100)).toLocaleString(locale==='ar'?'ar-EG':'en-US')} {ratesCurrency === 'SAR' ? (locale==='ar' ? 'ريال' : 'SAR') : ratesCurrency}
                        </div>
                        <div className="text-green-600 font-medium">
                          {locale==='ar' ? 'الصافي لك لليوم:' : 'Net for you per day:'} {Math.max(Number(dailyRate || 0) - Math.round(Number(dailyRate || 0) * (commissionPct / 100)), 0).toLocaleString(locale==='ar'?'ar-EG':'en-US')} {ratesCurrency === 'SAR' ? (locale==='ar' ? 'ريال' : 'SAR') : ratesCurrency}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>{locale==='ar'? 'تأمين (إجباري)' : 'Security deposit (required)'}</Label>
                    <Input type="number" inputMode="decimal" value={securityDeposit} onChange={(e)=> setSecurityDeposit(e.target.value)} placeholder="0.00" required />
                  </div>
                  {/* Summary removed; totals depend on technician-set dates */}
                  <div className="space-y-2">
                    <Label>{locale==='ar'? 'العملة' : 'Currency'}</Label>
                    <Input value={currency} readOnly placeholder="SAR" />
                  </div>
                  <div className="space-y-2">
                    <Label>{locale==='ar'? 'ملاحظات الاستخدام' : 'Usage notes'}</Label>
                    <Textarea value={usageNotes} onChange={(e)=> setUsageNotes(e.target.value)} />
                  </div>
                </div>
                {/* Delivery/Pickup removed from the form as requested */}
                <DialogFooter className="mt-4">
                  <Button variant="ghost" onClick={()=> { setDialogOpen(false); }}>
                    {locale==='ar'? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button onClick={submitRental} disabled={saving}>
                    {saving ? (locale==='ar'? 'جارٍ الحفظ...' : 'Saving...') : (editMode ? (locale==='ar'? 'تحديث' : 'Update') : (locale==='ar'? 'حفظ' : 'Save'))}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder={locale === 'en' ? 'Search rentals...' : 'ابحث في التأجير...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder={locale === 'en' ? 'Category' : 'الفئة'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{locale === 'en' ? 'All Categories' : 'جميع الفئات'}</SelectItem>
                    {rentalCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {locale==='ar' ? (category.nameAr || category.nameEn) : (category.nameEn || category.nameAr)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder={locale === 'en' ? 'Status' : 'الحالة'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{locale === 'en' ? 'All Statuses' : 'جميع الحالات'}</SelectItem>
                    <SelectItem value="active">{locale === 'en' ? 'Active' : 'نشط'}</SelectItem>
                    <SelectItem value="draft">{locale === 'en' ? 'Draft' : 'مسودة'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rentals List */}
        <Card>
          <CardHeader>
            <CardTitle>{locale === 'en' ? 'Rentals' : 'التأجير'} ({filteredRentals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredRentals.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">{locale === 'en' ? 'No rentals' : 'لا توجد عناصر تأجير'}</h3>
                <p className="text-muted-foreground">{locale === 'en' ? 'Start by adding your first rental' : 'ابدأ بإضافة أول عنصر تأجير لك'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRentals.map((rental:any) => (
                  <Card key={rental.id} className="group hover:shadow-lg transition-all duration-300 relative">
                    <CardContent className="p-4">
                      <div className="relative mb-3">
                        {(() => {
                          const fallback = (myProducts || []).find((p:any)=> String(p.id) === String(rental.productId))?.image || '';
                          const src = rental.imageUrl || fallback || '';
                          return (
                            <Image
                              src={src || '/placeholder.png'}
                              alt={String(rental.productName || '')}
                              width={800}
                              height={400}
                              className="w-full h-40 object-cover rounded bg-gray-100"
                            />
                          );
                        })()}
                        <span className="absolute top-2 right-2 text-xs bg-primary text-primary-foreground rounded px-2 py-0.5">{locale==='ar'? 'عقد' : 'Contract'}</span>
                      </div>
                      <div className="font-medium line-clamp-1">{rental.productName || `#${rental.productId}`}</div>
                      <div className="text-xs text-muted-foreground">
                        {locale==='ar' ? `من ${new Date(rental.startDate).toLocaleDateString('ar-EG')} إلى ${new Date(rental.endDate).toLocaleDateString('ar-EG')}` : `From ${new Date(rental.startDate).toLocaleDateString('en-US')} to ${new Date(rental.endDate).toLocaleDateString('en-US')}`}
                      </div>
                      <div className="mt-2 grid grid-cols-3 text-sm text-muted-foreground">
                        <div>
                          <div className="text-xs">{locale==='ar'? 'الأيام' : 'Days'}</div>
                          <div className="font-medium">{rental.rentalDays}</div>
                        </div>
                        <div>
                          <div className="text-xs">{locale==='ar'? 'سعر اليوم' : 'Daily'}</div>
                          <div className="font-medium">{rental.dailyRate}</div>
                        </div>
                        <div>
                          <div className="text-xs">{locale==='ar'? 'الإجمالي' : 'Total'}</div>
                          <div className="font-semibold">{rental.totalAmount}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <Button size="sm" variant="secondary" onClick={()=> openMessages(rental)}>{locale==='ar'? 'الرسائل' : 'Messages'}</Button>
                        <Button size="sm" variant="outline" onClick={()=> openEdit(rental)}>{locale==='ar'? 'تعديل' : 'Edit'}</Button>
                        <Button size="sm" variant="destructive" onClick={()=> removeRental(rental)}>{locale==='ar'? 'حذف' : 'Delete'}</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog removed in favor of unified form */}

        {/* Messages Dialog */}
        <Dialog open={msgOpen} onOpenChange={setMsgOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{locale==='ar'? 'رسائل العقد' : 'Rental Messages'}</DialogTitle>
            </DialogHeader>
            <div className="max-h-80 overflow-auto border rounded p-3 bg-muted/30">
              {msgLoading ? (
                <div className="text-sm text-muted-foreground">{locale==='ar'? 'تحميل...' : 'Loading...'}</div>
              ) : messages.length === 0 ? (
                <div className="text-sm text-muted-foreground">{locale==='ar'? 'لا توجد رسائل بعد' : 'No messages yet'}</div>
              ) : (
                <div className="space-y-3">
                  {messages.map((m:any, idx:number)=> {
                    const key = String(m.id ?? m._id ?? m.messageId ?? m.at ?? idx);
                    return (
                    <div key={key} className={`rounded p-2 ${m.fromMerchant? 'bg-blue-50 text-blue-900' : 'bg-white'}`}>
                      <div className="text-xs text-muted-foreground flex justify-between">
                        <span>{m.fromMerchant ? (locale==='ar'? 'التاجر' : 'Merchant') : (m.name || 'Customer')}</span>
                        <span>{String(m.at).replace('T',' ').slice(0,16)}</span>
                      </div>
                      <div className="text-sm whitespace-pre-wrap">{m.message}</div>
                    </div>
                  );})}
                </div>
              )}
            </div>
            <div className="space-y-2 mt-3">
              <Label>{locale==='ar'? 'رد' : 'Reply'}</Label>
              <Textarea rows={3} value={msgReply} onChange={(e)=> setMsgReply(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={()=> setMsgOpen(false)}>{locale==='ar'? 'إغلاق' : 'Close'}</Button>
                <Button onClick={sendReply} disabled={msgLoading || !msgReply.trim()}>{msgLoading ? (locale==='ar'? 'جارٍ الإرسال...' : 'Sending...') : (locale==='ar'? 'إرسال' : 'Send')}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Footer setCurrentPage={safeSetCurrentPage} />
    </div>
  );
}
