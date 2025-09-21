import { useEffect, useMemo, useState } from 'react';
import { Search, Grid, List, Tag, Eye, Heart, ShoppingCart, CreditCard } from 'lucide-react';
import Swal from 'sweetalert2';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { useTranslation } from '../hooks/useTranslation';
import type { RouteContext } from '../components/routerTypes';
import { toastError } from '../utils/alerts';
import { getAvailableForRent, type ProductDto } from '../services/products';
import { listPublicRentals, type RentalDto } from '@/services/rentals';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { toastSuccess, toastInfo } from '../utils/alerts';
import LoadingOverlay from '../components/LoadingOverlay';
// Favorites storage is no longer used here; rely on Router context for wishlist
// Vendor rentals are managed in the vendor dashboard; not shown on public rentals page

interface RentalsProps extends Partial<RouteContext> {}

export default function Rentals({ setCurrentPage, ...rest }: RentalsProps) {
  const { locale } = useTranslation();
  const currency = locale === 'ar' ? 'ر.س' : 'SAR';

  const [rentals, setRentals] = useState<ProductDto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  // Local tick to force re-render when favorites (localStorage) change for guests
  const [favVersion, setFavVersion] = useState(0);
  const [publicRentals, setPublicRentals] = useState<RentalDto[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingContracts, setLoadingContracts] = useState(true);
  // Local optimistic overrides so hearts fill instantly per item
  const [wishOverrides, setWishOverrides] = useState<Record<string, boolean>>({});
  const [applyOpen, setApplyOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState<RentalDto | null>(null);
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantMsg, setApplicantMsg] = useState('');
  // Read-only page (no add/edit in this view)
  const [isAddDialogOpen] = useState(false);
  const [editingRental] = useState<any>(null);

  // Debug helper for tracing wishlist id resolution
  const DEBUG_WISHLIST = true;
  const dbg = (...args: any[]) => { try { if (DEBUG_WISHLIST) console.debug('[wishlist][debug]', ...args); } catch {} };

  const isVendor = !!(rest as any)?.user && (rest as any)?.user?.role === 'vendor';
  const isLoggedIn = !!(rest as any)?.user;

  const isWishlisted = (id: string) => {
    const key = String(id);
    if (key in wishOverrides) return !!wishOverrides[key];
    return isLoggedIn && typeof (rest as any)?.isInWishlist === 'function' ? !!(rest as any).isInWishlist(key) : false;
  };

  // Normalize rental id from various shapes
  const getRentalId = (r: any): string => {
    const rid = String(r?.id ?? r?.rentalId ?? r?._id ?? '').trim();
    return rid && rid !== 'undefined' && rid !== 'null' ? rid : '';
  };

  // Is the contract active today (between start and end inclusive) AND approved (paid/confirmed)?
  const isContractActive = (r: any): boolean => {
    try {
      if (String(r?.status || '').toLowerCase() !== 'approved') return false;
      const now = new Date();
      const s = new Date(r?.startDate);
      const e = new Date(r?.endDate);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return false;
      // Normalize to midnight for inclusive comparison
      const n0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const s0 = new Date(s.getFullYear(), s.getMonth(), s.getDate());
      const e0 = new Date(e.getFullYear(), e.getMonth(), e.getDate());
      return n0.getTime() >= s0.getTime() && n0.getTime() <= e0.getTime();
    } catch { return false; }
  };

  // Build a stable local-only wishlist key when backend product id is unavailable
  const getContractWishlistKey = (r: RentalDto): string => {
    const rid = String((r as any)?.id ?? '').trim();
    if (rid && rid !== 'undefined' && rid !== 'null') return `contract:${rid}`;
    const pid = String((r as any)?.productId ?? '').trim();
    const nm = String((r as any)?.productName ?? '').trim().toLowerCase();
    const dr = String((r as any)?.dailyRate ?? '').trim();
    const rd = String((r as any)?.rentalDays ?? '').trim();
    const sd = String((r as any)?.startDate ?? '').slice(0, 10);
    const ed = String((r as any)?.endDate ?? '').slice(0, 10);
    const ca = String((r as any)?.createdAt ?? '').slice(0, 19);
    const fallback = [pid || 'nopid', nm || 'noname', dr || '0', rd || '0', sd || 'nos', ed || 'noe', ca || 'noc'].join('|');
    return `contract:${fallback}`;
  };

  // Resolve a reliable product id for a rental contract card
  const resolveProductIdForContract = (r: RentalDto): string => {
    try {
      // 0) Try nested product object commonly returned by some APIs
      const nested = ((r as any)?.product || {}) as any;
      const nestedId = String(nested?.id ?? nested?._id ?? '').trim();
      if (nestedId && nestedId !== 'undefined' && nestedId !== 'null') { dbg('resolve: nested.id/_id', nestedId); return nestedId; }

      // 1) Try direct product match by id on products list we loaded
      const byId = rentals.find((p: any) => String(p?.id || '') === String((r as any)?.productId || ''));
      if (byId?.id) { const v = String(byId.id); dbg('resolve: match products[] by productId', v); return v; }

      // 2) Try by productName equality on either Arabic or English name
      const nm = String(((r as any)?.productName || nested?.name || nested?.nameAr || nested?.nameEn || '')).trim().toLowerCase();
      if (nm) {
        const byName = rentals.find((p: any) => {
          const a = String((p as any)?.nameAr || '').trim().toLowerCase();
          const e = String((p as any)?.nameEn || '').trim().toLowerCase();
          return (a && a === nm) || (e && e === nm);
        });
        if (byName?.id) { const v = String(byName.id); dbg('resolve: match products[] by name', { nm, id: v }); return v; }
      }

      // 3) Fallback to whatever productId the contract has (string/number)
      const raw = String((r as any)?.productId || '').trim();
      if (raw && raw !== 'undefined' && raw !== 'null') { dbg('resolve: raw r.productId', raw); return raw; }
      // 4) Some APIs return the related product's id in _id directly on the contract item
      const rawUnderscore = String((r as any)?._id || '').trim();
      if (rawUnderscore && rawUnderscore !== 'undefined' && rawUnderscore !== 'null') { dbg('resolve: raw r._id (treating as productId)', rawUnderscore); return rawUnderscore; }
    } catch {}
    dbg('resolve: failed to determine product id for contract', r);
    return '';
  };

  // Fallback: query backend by product name to resolve product id when missing
  const resolveProductIdViaApi = async (r: RentalDto): Promise<string> => {
    try {
      const name = String((r as any)?.productName || '').trim();
      if (!name) return '';
      // Try exact-name query first
      const res = await (await import('../services/products')).getProducts({ page: 1, pageSize: 5, query: name } as any) as any;
      if (res?.ok && res?.data) {
        const list: any[] = Array.isArray((res.data as any).items)
          ? (res.data as any).items
          : Array.isArray((res.data as any).Items)
            ? (res.data as any).Items
            : (Array.isArray(res.data as any) ? (res.data as any) : []);
        const nmLc = name.toLowerCase();
        const exact = list.find((p:any) => {
          const a = String((p as any)?.nameAr || '').trim().toLowerCase();
          const e = String((p as any)?.nameEn || '').trim().toLowerCase();
          return (a && a === nmLc) || (e && e === nmLc);
        }) || list[0];
        let id = exact?.id ?? exact?._id;
        if (id) { const v = String(id); dbg('resolveViaApi: exact/first id', v); return v; }
        // Try partial includes if exact failed
        const partial = list.find((p:any) => {
          const a = String((p as any)?.nameAr || '').trim().toLowerCase();
          const e = String((p as any)?.nameEn || '').trim().toLowerCase();
          return (a && a.includes(nmLc)) || (e && e.includes(nmLc));
        });
        id = partial?.id ?? partial?._id;
        if (id) { const v = String(id); dbg('resolveViaApi: partial id', v); return v; }
      }
      // If we reach here, try a cache-busting direct GET to avoid 304 Not Modified blocking body
      try {
        const { api } = await import('@/lib/api');
        const bust = Date.now();
        const direct = await api.get<any>(`/api/Products?page=1&pageSize=5&SearchTerm=${encodeURIComponent(name)}&_=${bust}`);
        if (direct?.ok && direct?.data) {
          const list: any[] = Array.isArray((direct.data as any).items)
            ? (direct.data as any).items
            : Array.isArray((direct.data as any).Items)
              ? (direct.data as any).Items
              : (Array.isArray(direct.data as any) ? (direct.data as any) : []);
          const nmLc = name.toLowerCase();
          const exact = list.find((p:any) => {
            const a = String((p as any)?.nameAr || '').trim().toLowerCase();
            const e = String((p as any)?.nameEn || '').trim().toLowerCase();
            return (a && a === nmLc) || (e && e === nmLc);
          }) || list[0];
          let id = exact?.id ?? exact?._id;
          if (id) { const v = String(id); dbg('resolveViaApi: direct exact/first', v); return v; }
          const partial = list.find((p:any) => {
            const a = String((p as any)?.nameAr || '').trim().toLowerCase();
            const e = String((p as any)?.nameEn || '').trim().toLowerCase();
            return (a && a.includes(nmLc)) || (e && e.includes(nmLc));
          });
          id = partial?.id ?? partial?._id;
          if (id) { const v = String(id); dbg('resolveViaApi: direct partial', v); return v; }
        }
      } catch {}
    } catch {}
    return '';
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingProducts(true);
        const { ok, data } = await getAvailableForRent();
        if (!cancelled) {
          setRentals(ok && Array.isArray(data) ? (data as ProductDto[]) : []);
        }
      } catch {
        if (!cancelled) { setRentals([]); toastError(locale==='ar'? 'فشل تحميل عناصر التأجير':'Failed to load rentals', locale==='ar'); }
      } finally { if (!cancelled) setLoadingProducts(false); }
    })();
    return () => { cancelled = true; };
  }, [locale]);

  // Remove guest favorites listeners; wishlist is server-backed only here

  // No need for local favorites re-render tick

  // Load rentals from database (public), filter invalids and deduplicate by contract key
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingContracts(true);
        const res = await listPublicRentals();
        if (!cancelled) {
          const arr = Array.isArray(res.data) ? (res.data as RentalDto[]) : [];
          const valid = arr.filter((r:any) => {
            const hasName = String((r as any)?.productName || '').trim().length > 0;
            const hasId = String((r as any)?.id || '').trim().length > 0;
            const hasPid = String((r as any)?.productId || '').trim().length > 0;
            return hasName || hasId || hasPid;
          });
          const seen = new Set<string>();
          const dedup = valid.filter((r:any) => {
            const key = getContractWishlistKey(r);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setPublicRentals(dedup as any);
        }
      } catch {
        if (!cancelled) setPublicRentals([]);
      } finally { if (!cancelled) setLoadingContracts(false); }
    })();
    return () => { cancelled = true; };
  }, []);


  const filtered = useMemo(() => {
    if (!searchTerm) return rentals;
    const q = searchTerm.toLowerCase();
    return rentals.filter((r:any) => {
      const nm = String((r as any).nameAr || (r as any).nameEn || '').toLowerCase();
      return nm.includes(q);
    });
  }, [rentals, searchTerm]);

  
  const onApplyClick = (r: RentalDto) => {
    if (!isLoggedIn) {
      toastInfo(locale==='ar'? 'يرجى تسجيل الدخول للتقديم على عقد التأجير' : 'Please sign in to apply for this rental', locale==='ar');
      setCurrentPage && setCurrentPage('login');
      return;
    }
    setSelectedRental(r);
    setApplicantName(''); setApplicantPhone(''); setApplicantMsg('');
    setApplyOpen(true);
  };
  const submitApplication = () => {
    if (!applicantName || !applicantPhone) {
      toastError(locale==='ar'? 'يرجى إدخال الاسم ورقم الجوال' : 'Please enter your name and phone');
      return;
    }
    // Placeholder: store locally; backend endpoint can be added later
    try { if (typeof window!=='undefined') {
      const key = 'rental_applications';
      const raw = window.localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({
        rentalId: selectedRental?.id,
        productId: selectedRental?.productId,
        at: new Date().toISOString(),
        name: applicantName,
        phone: applicantPhone,
        message: applicantMsg,
      });
      window.localStorage.setItem(key, JSON.stringify(arr));
    }} catch {}
    toastSuccess(locale==='ar'? 'تم إرسال طلبك بنجاح' : 'Your application has been sent', locale==='ar');
    setApplyOpen(false);
  };

  const mapRentalToProduct = (p: ProductDto) => ({
    id: String(p.id),
    name: (p as any).nameAr || (p as any).nameEn || '',
    price: Number(p.rentPricePerDay ?? 0),
    originalPrice: Number((p as any)?.price ?? p.rentPricePerDay ?? 0),
    image: (p as any)?.images?.[0]?.imageUrl || (p as any)?.imageUrl || '',
    brand: (p as any)?.brand || { ar: 'عام', en: 'Generic' },
    inStock: true,
    stockCount: 99,
    partNumber: (p as any)?.sku || `R-${p.id}`,
  });

  // Map a RentalDto (contract) to a cart item shape
  const mapContractToCartItem = (r: RentalDto, imgSrc: string, overrideId?: string) => ({
    id: (() => {
      if (overrideId) return String(overrideId);
      const rid = resolveProductIdForContract(r);
      return rid || String((r as any)?.productId || (r as any)?.id || '');
    })(),
    name: (r as any).productName || `#${r.productId}`,
    price: Number(r.dailyRate || 0),
    image: imgSrc,
    quantity: 1,
    inStock: true,
    partNumber: `R-${r.id}`,
    originalPrice: Number(r.totalAmount || 0),
    rental: {
      id: r.id,
      productId: r.productId,
      startDate: r.startDate,
      endDate: r.endDate,
      rentalDays: r.rentalDays,
      dailyRate: r.dailyRate,
      totalAmount: r.totalAmount,
    }
  });

  const RentalCard = ({ r }: { r: ProductDto }) => (
    <Card
      className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={() => {
        try {
          (rest as any)?.setSelectedProduct && (rest as any).setSelectedProduct(mapRentalToProduct(r));
        } catch {}
        if (setCurrentPage) setCurrentPage('rental-details');
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
    >
      <CardContent className="p-4">
        <div className="relative mb-4">
          <ImageWithFallback src={(r as any)?.images?.[0]?.imageUrl || (r as any)?.imageUrl} alt={String((r as any).nameAr || (r as any).nameEn || '')} className="w-full h-48 object-cover rounded-lg" />
          {(r as any).isAvailableForRent && (
            <Badge className="absolute top-2 right-2 bg-primary">{locale==='ar' ? 'نشط' : 'Active'}</Badge>
          )}
          {!isVendor && (
            <Button
              variant="ghost"
              size="icon"
              className={`absolute top-2 left-2 h-9 w-9 p-0 bg-white/95 border border-gray-200 shadow-sm hover:bg-white ring-1 ring-black/5 ${isWishlisted(String(r.id)) ? 'text-red-600 border-red-200 ring-red-200' : 'text-gray-700'}`}
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isLoggedIn) {
                  (rest as any)?.setCurrentPage && (rest as any).setCurrentPage('login');
                  toastInfo(locale==='ar' ? 'يرجى تسجيل الدخول لإضافة إلى المفضلة' : 'Please sign in to add to wishlist', locale==='ar');
                  return;
                }
                const pid = String(r.id);
                try { console.debug('[wishlist] rental-product heart click', { product: r, pid }); } catch {}
                if (!pid || pid === 'undefined' || pid === 'null') {
                  toastError(locale==='ar'? 'لا يمكن تحديث المفضلة (معرّف غير متاح)':'Cannot update wishlist (missing id)', locale==='ar');
                  return;
                }
                const already = isWishlisted(pid);
                try {
                  if (!already) {
                    await Promise.resolve((rest as any)?.addToWishlist?.({
                      id: pid,
                      name: String((r as any).nameAr || (r as any).nameEn || ''),
                      price: Number((r as any).rentPricePerDay || 0),
                      image: (r as any)?.images?.[0]?.imageUrl || (r as any)?.imageUrl || '',
                      inStock: true,
                    } as any));
                    setWishOverrides((prev) => ({ ...prev, [pid]: true }));
                    toastSuccess(locale==='ar'? 'تمت الإضافة إلى المفضلة':'Added to favorites', locale==='ar');
                  } else {
                    await Promise.resolve((rest as any)?.removeFromWishlist?.(pid));
                    setWishOverrides((prev) => ({ ...prev, [pid]: false }));
                    toastInfo(locale==='ar'? 'تمت الإزالة من المفضلة':'Removed from favorites', locale==='ar');
                  }
                } catch {
                  toastError(locale==='ar'? 'تعذر تحديث المفضلة':'Failed to update wishlist', locale==='ar');
                }
              }}
              title={locale==='ar'?'مفضلة':'Favorite'}
            >
              <Heart className={`h-5 w-5 ${isWishlisted(String(r.id)) ? 'fill-current text-red-600' : ''}`} />
            </Button>
          )}
        </div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-medium text-lg">{String((r as any).nameAr || (r as any).nameEn || '')}</h3>
            <p className="text-sm text-muted-foreground">{locale==='ar'?'منتج للتأجير':'Rental product'}</p>
          </div>
          {isVendor && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{locale==='ar'?'خاص بالتاجر':'Vendor-owned'}</Badge>
            </div>
          )}
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Tag className="w-4 h-4" /> {locale==='ar' ? 'متاح للتأجير' : 'Available for rent'}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-primary font-semibold">
            {currency} {(Number(r.rentPricePerDay||0)).toLocaleString(locale==='ar'?'ar-EG':'en-US')} / {locale==='ar'?'يوم':'day'}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  // Add/Edit/Delete removed – backend-driven only

  return (
    <div className="min-h-screen bg-background" dir={locale==='ar'?'rtl':'ltr'}>
      <Header currentPage="rentals" setCurrentPage={setCurrentPage as any} {...(rest as any)} />

      <div className="container mx-auto px-4 py-8">
        <LoadingOverlay open={loadingProducts || loadingContracts} message={locale==='ar'? 'جاري تحميل التأجير...' : 'Loading rentals...'} />
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">{locale==='ar' ? 'التأجير' : 'Rentals'}</h1>
            <p className="text-muted-foreground">{locale==='ar' ? 'تصفح عناصر التأجير المتاحة' : 'Browse available rental items'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('grid')}>
              <Grid className="w-4 h-4 mr-1" /> {locale==='ar' ? 'شبكة' : 'Grid'}
            </Button>
            <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')}>
              <List className="w-4 h-4 mr-1" /> {locale==='ar' ? 'قائمة' : 'List'}
            </Button>
            {/* Rentals are sourced from backend; vendor can manage via Products if needed */}
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative max-w-xl">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={locale==='ar' ? 'ابحث في التأجير...' : 'Search rentals...'}
                value={searchTerm}
                onChange={(e)=> setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Rentals from database */}
        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">{locale==='ar'? 'عقود التأجير' : 'Rental Contracts'}</h2>
              <span className="text-sm text-muted-foreground">{publicRentals.length}</span>
            </div>
            {publicRentals.length === 0 ? (
              <div className="text-sm text-muted-foreground">{locale==='ar'? 'لا توجد عقود تأجير متاحة للعرض حالياً.' : 'No rental contracts to display yet.'}</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {publicRentals.map((r, index) => {
                  const prod = rentals.find((p:any) => String(p.id) === String(r.productId));
                  const prodImg = (prod as any)?.images?.[0]?.imageUrl || (prod as any)?.imageUrl || '';
                  const imgSrc = (r as any).imageUrl || prodImg || '';
                  return (
                  <Card
                    key={`${r.id}-${index}-contract`}
                    className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={()=> {
                      try {
                        if (typeof window!== 'undefined') {
                          const rid = getRentalId(r);
                          if (!rid) { toastError(locale==='ar'? 'تعذر فتح العقد (معرّف غير متاح)':'Cannot open contract (missing id)', locale==='ar'); return; }
                          const toSave: any = { ...r, id: rid, rentalId: rid, imageUrl: imgSrc };
                          localStorage.setItem('selected_rental', JSON.stringify(toSave));
                          const url = new URL(window.location.href);
                          url.searchParams.set('page', 'rental-contract');
                          url.searchParams.set('id', String(rid || ''));
                          window.history.replaceState({}, '', url.toString());
                        }
                      } catch {}
                      setCurrentPage && setCurrentPage('rental-contract');
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="relative mb-4">
                        <ImageWithFallback src={imgSrc} alt={String((r as any).productName || '')} className="w-full h-48 object-cover rounded-lg bg-gray-100" />
                        <Badge className="absolute top-2 right-2 bg-primary">{locale==='ar' ? 'عقد' : 'Contract'}</Badge>
                        {!isVendor && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`absolute top-2 left-2 h-9 w-9 p-0 bg-white/95 border border-gray-200 shadow-sm hover:bg-white ring-1 ring-black/5 ${(() => { const pid = String((prod as any)?.id || resolveProductIdForContract(r) || ''); const filled = pid && isWishlisted(pid); return filled ? 'text-red-600 border-red-200 ring-red-200' : 'text-gray-700'; })()}`}
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!isLoggedIn) {
                                (rest as any)?.setCurrentPage && (rest as any).setCurrentPage('login');
                                toastInfo(locale==='ar' ? 'يرجى تسجيل الدخول لإضافة إلى المفضلة' : 'Please sign in to add to wishlist', locale==='ar');
                                return;
                              }
                              // Verbose diagnostics to pinpoint why id is missing
                              try {
                                const snapshot = (() => { try { return JSON.parse(JSON.stringify(r)); } catch { return r as any; } })();
                                const candidateDirect = String((r as any)?.productId ?? '');
                                const candidateNestedId = String(((r as any)?.product as any)?.id ?? '');
                                const candidateNestedOid = String(((r as any)?.product as any)?._id ?? '');
                                const candidateUpper = String((r as any)?.ProductId ?? '');
                                const candidateSelf = String((r as any)?.id ?? '');
                                console.debug('[wishlist][debug] contract click snapshot', {
                                  productId: candidateDirect,
                                  product_nested_id: candidateNestedId,
                                  product_nested__id: candidateNestedOid,
                                  ProductId_caps: candidateUpper,
                                  contract_id: candidateSelf,
                                  productName: String((r as any)?.productName || ''),
                                  snapshot,
                                });
                              } catch {}
                              let pid = (prod as any)?.id ? String((prod as any).id) : resolveProductIdForContract(r);
                              if (!pid || pid === 'undefined' || pid === 'null') {
                                pid = await resolveProductIdViaApi(r);
                              }
                              try { console.debug('[wishlist] contract heart click', { contract: r, inferredProductId: pid, product: prod }); } catch {}
                              if (!pid) { toastError(locale==='ar'? 'لا يمكن تحديث المفضلة (معرّف غير متاح)':'Cannot update wishlist (missing id)', locale==='ar'); return; }
                              const already = isWishlisted(pid);
                              try {
                                if (!already) {
                                  await Promise.resolve((rest as any)?.addToWishlist?.({ id: pid, name: (r as any).productName || `#${r.productId}`, price: Number(r.dailyRate||0), image: imgSrc } as any));
                                  setWishOverrides((prev) => ({ ...prev, [pid]: true }));
                                  toastSuccess(locale==='ar'? 'تمت الإضافة إلى المفضلة':'Added to favorites', locale==='ar');
                                } else {
                                  await Promise.resolve((rest as any)?.removeFromWishlist?.(pid));
                                  setWishOverrides((prev) => ({ ...prev, [pid]: false }));
                                  toastInfo(locale==='ar'? 'تمت الإزالة من المفضلة':'Removed from favorites', locale==='ar');
                                }
                              } catch { toastError(locale==='ar'? 'تعذر تحديث المفضلة':'Failed to update wishlist', locale==='ar'); }
                            }}
                            title={locale==='ar'?'مفضلة':'Favorite'}
                          >
                            {(() => { const pid = String((prod as any)?.id || resolveProductIdForContract(r) || ''); const filled = pid && isWishlisted(pid); return (<Heart className={`h-5 w-5 ${filled ? 'fill-current text-red-600' : ''}`} />); })()}
                          </Button>
                        )}
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium text-lg line-clamp-1">{(r as any).productName || `#${r.productId}`}</h3>
                          <p className="text-sm text-muted-foreground">
                            {locale==='ar' ? `من ${new Date(r.startDate).toLocaleDateString('ar-EG')} إلى ${new Date(r.endDate).toLocaleDateString('ar-EG')}` : `From ${new Date(r.startDate).toLocaleDateString('en-US')} to ${new Date(r.endDate).toLocaleDateString('en-US')}`}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground grid grid-cols-3 gap-2">
                        <div>
                          <div className="text-xs">{locale==='ar'?'أيام':'Days'}</div>
                          <div className="font-medium">{r.rentalDays}</div>
                        </div>
                        <div>
                          <div className="text-xs">{locale==='ar'?'سعر اليوم':'Daily'}</div>
                          <div className="font-medium">{currency} {Number(r.dailyRate||0).toLocaleString(locale==='ar'?'ar-EG':'en-US')}</div>
                        </div>
                        <div>
                          <div className="text-xs">{locale==='ar'?'الإجمالي':'Total'}</div>
                          <div className="font-semibold text-primary">{currency} {Number(r.totalAmount||0).toLocaleString(locale==='ar'?'ar-EG':'en-US')}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        {(() => {
                          const qty = Number((prod as any)?.stockQuantity ?? 0);
                          const active = isContractActive(r);
                          const canAdd = active ? qty > 0 : true;
                          if (canAdd) return <span />;
                          // Blocked only when active and no stock
                          return (
                            <span className="text-xs text-muted-foreground">
                              {locale==='ar' ? 'متاجر حالياً' : 'Rented now'}
                            </span>
                          );
                        })()}
                        <Button
                          variant="default"
                          size="sm"
                          className={`${(() => { const qty = Number((prod as any)?.stockQuantity ?? 0); const active = isContractActive(r); const canAdd = active ? qty>0 : true; return canAdd ? '' : 'opacity-50 cursor-not-allowed'; })()}`}
                          disabled={(() => { const qty = Number((prod as any)?.stockQuantity ?? 0); const active = isContractActive(r); return active ? !(qty>0) : false; })()}
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                              const qty = Number((prod as any)?.stockQuantity ?? 0);
                              const active = isContractActive(r);
                              if (active && !(qty > 0)) { toastInfo(locale==='ar'? 'متاجر حالياً':'Rented now', locale==='ar'); return; }
                              const rid = getRentalId(r);
                              // Resolve related product id mainly to build a consistent cart id
                              let pid = resolveProductIdForContract(r);
                              if (!pid || pid === 'undefined' || pid === 'null') {
                                pid = await resolveProductIdViaApi(r);
                              }
                              const item = mapContractToCartItem(r as any, imgSrc, pid || undefined);
                              (rest as any)?.addToCart && (rest as any).addToCart(item);
                              toastSuccess(locale==='ar'? 'تمت الإضافة إلى السلة':'Added to cart', locale==='ar');
                            } catch {
                              toastError(locale==='ar'? 'تعذر الإضافة إلى السلة':'Failed to add to cart', locale==='ar');
                            }
                          }}
                        >
                          <ShoppingCart className="w-4 h-4 mr-1" /> {locale==='ar' ? 'أضف للسلة' : 'Add'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Apply Dialog */}
        <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{locale==='ar'? 'تقديم على عقد التأجير' : 'Apply for Rental'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">{locale==='ar'? 'العقد' : 'Contract'}</Label>
                <div className="text-sm text-muted-foreground">{selectedRental ? ((selectedRental as any).productName || `#${selectedRental.productId}`) : '-'}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="applName">{locale==='ar'? 'الاسم' : 'Name'}</Label>
                  <Input id="applName" value={applicantName} onChange={(e)=> setApplicantName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="applPhone">{locale==='ar'? 'الجوال' : 'Phone'}</Label>
                  <Input id="applPhone" value={applicantPhone} onChange={(e)=> setApplicantPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="applMsg">{locale==='ar'? 'رسالتك' : 'Message'}</Label>
                <Textarea id="applMsg" rows={4} value={applicantMsg} onChange={(e)=> setApplicantMsg(e.target.value)} placeholder={locale==='ar'? 'اكتب تفاصيل إضافية...' : 'Add any details...'} />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={()=> setApplyOpen(false)}>{locale==='ar'? 'إلغاء' : 'Cancel'}</Button>
              <Button onClick={submitApplication}>{locale==='ar'? 'إرسال الطلب' : 'Send application'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Public rentals list */}
        {filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-20">
            {locale==='ar' ? 'لا توجد عناصر تأجير بعد.' : 'No rental items yet.'}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filtered.map((r:any) => (
              <RentalCard key={`${r.id}-prod`} r={r} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((r:any) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-16 overflow-hidden rounded-md border bg-gray-50">
                        <ImageWithFallback src={(r as any)?.images?.[0]?.imageUrl || (r as any)?.imageUrl} alt={String((r as any).nameAr || (r as any).nameEn || '')} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="font-semibold">{String((r as any).nameAr || (r as any).nameEn || '')}</div>
                        <div className="text-xs text-muted-foreground">{locale==='ar'?'متاح للتأجير':'Available for rent'}</div>
                      </div>
                    </div>
                    <div className="text-primary font-semibold">
                      {currency} {(Number(r.rentPricePerDay||0)).toLocaleString(locale==='ar'?'ar-EG':'en-US')} / {locale==='ar'?'يوم':'day'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {/* Edit dialog removed: rentals are displayed from backend */}
      </div>

      <Footer setCurrentPage={setCurrentPage as any} />
    </div>
  );
}
