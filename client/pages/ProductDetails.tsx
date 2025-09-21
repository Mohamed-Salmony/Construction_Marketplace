import { useState, useEffect } from "react";
import {
  ArrowRight,
  Star,
  ShoppingCart,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Check,
} from "lucide-react";
import Swal from "sweetalert2";
import { toastSuccess, toastInfo } from "../utils/alerts";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
import { RouteContext } from "../components/Router";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useTranslation } from "../hooks/useTranslation";
import { getProductById, getProductBySlug, getCategoryById } from "../services/products";
import { getReviews, addReview, type ReviewDto } from "@/services/reviews";

// Remove static related products and reviews; page is fully backend-driven

import { WishlistItem } from "../components/Router";

interface ProductDetailsProps {
  currentPage?: string;
  setCurrentPage?: (page: string) => void;
  selectedProduct?: any;
  addToCart?: (item: any) => void;
  isInWishlist?: (id: string) => boolean;
  addToWishlist?: (item: WishlistItem) => void;
  removeFromWishlist?: (id: string) => void;
}

export default function ProductDetails({
  currentPage,
  setCurrentPage,
  selectedProduct,
  addToCart,
  isInWishlist,
  addToWishlist,
  removeFromWishlist,
  ...rest
}: ProductDetailsProps & Partial<RouteContext>) {
  const { t, locale } = useTranslation();
  const isVendor = ((rest as any)?.user?.role) === 'vendor';
  const currency = locale === "ar" ? "ر.س" : "SAR";
  const formatDateTime = (iso: string | undefined | null) => {
    try {
      if (!iso) return '';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      const fmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
      });
      return fmt.format(d);
    } catch { return ''; }
  };
  const getText = (val: any): string => {
    if (val && typeof val === "object") {
      return val[locale] ?? val.ar ?? val.en ?? "";
    }
    return String(val ?? "");
  };

  // Try to fetch full product details from backend when an id is present in URL or when a selectedProduct is passed
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // Helpers to normalize varying backend field names across environments
        const pickStr = (obj: any, keys: string[], fallback: string = ''): string => {
          try {
            for (const k of keys) {
              const v = obj?.[k];
              if (typeof v === 'string' && v.trim().length) return v.trim();
            }
          } catch {}
          return fallback;
        };
        const pickNum = (obj: any, keys: string[], fallback: number = 0): number => {
          try {
            for (const k of keys) {
              const v = obj?.[k];
              const n = Number(v);
              if (Number.isFinite(n)) return n;
            }
          } catch {}
          return fallback;
        };
        const pickBool = (obj: any, keys: string[], fallback: boolean = false): boolean => {
          try {
            for (const k of keys) {
              const v = obj?.[k];
              if (typeof v === 'boolean') return v;
              if (v === 1 || v === '1' || v === 'true' || v === 'True') return true;
              if (v === 0 || v === '0' || v === 'false' || v === 'False') return false;
            }
          } catch {}
          return fallback;
        };

        // 1) Prefer URL param id if present
        let urlId: string | number | null = null;
        let urlSlug: string | null = null;
        try {
          const url = new URL(window.location.href);
          const idParam = url.searchParams.get('id');
          const slugParam = url.searchParams.get('slug');
          if (idParam) {
            // If purely numeric use number, else keep string (e.g., 24-hex ObjectId)
            urlId = /^\d+$/.test(idParam) ? Number(idParam) : idParam;
          }
          if (slugParam) {
            urlSlug = String(slugParam).trim();
          }
        } catch {}

        if (urlId !== null) {
          const cleanId = typeof urlId === 'string' ? urlId.trim() : urlId;
          console.debug('[ProductDetails] Fetching by URL id:', cleanId);
          const res = await getProductById(cleanId as any);
          console.debug('[ProductDetails] getProductById status:', res?.status, 'ok:', res?.ok, 'error:', res?.error);
          if (!res?.ok) {
            if (!cancelled) {
              const err = { status: res.status, error: res.error, source: 'url-id', id: cleanId } as any;
              try { (window as any).__lastProductError = err; } catch {}
              setLoadError(err);
            }
          }
          if (res.ok && res.data && !cancelled) {
            try { (window as any).__lastProductRaw = res.data; } catch {}
            const d: any = res.data as any;
            const stockQ = pickNum(d, ['stockQuantity','stock','quantity','availableQuantity'], 0);
            const price = pickNum(d, ['discountPrice','price'], Number(d?.price ?? 0));
            const origPrice = pickNum(d, ['price'], 0);
            const nameAr = pickStr(d, ['nameAr','name_ar','nameAR','name_arabic','arabicName']);
            const nameEn = pickStr(d, ['nameEn','name_en','nameEN','englishName','name']);
            // Description fields may arrive nested as an object with ar/en keys
            let descAr = pickStr(d, ['descriptionAr','description_ar','descAr','desc_ar','description','detailsAr','details_ar']);
            let descEn = pickStr(d, ['descriptionEn','description_en','descEn','desc_en','description','detailsEn','details_en']);
            try {
              if (!descAr || !descEn) {
                const desc = (d as any)?.description;
                if (desc && typeof desc === 'object') {
                  descAr = descAr || String(desc.ar || desc['ar-SA'] || desc['ar_EG'] || desc.arabic || '');
                  descEn = descEn || String(desc.en || desc['en-US'] || desc['en_GB'] || desc.english || '');
                }
              }
            } catch {}
            const rating = pickNum(d, ['averageRating','rating'], 0);
            const reviewCount = pickNum(d, ['reviewCount','reviewsCount','reviews'], 0);
            const partNumber = pickStr(d, ['sku','partNumber','part_number']);
            const warrantyAr = pickStr(d, ['warrantyAr','warranty_ar','warranty'], 'سنة');
            const warrantyEn = pickStr(d, ['warrantyEn','warranty_en','warranty'], '1 year');
            const categoryId = pickStr(d, ['categoryId','category_id']);

            setRemoteProduct({
              id: d.id || String(cleanId),
              name: { ar: nameAr, en: nameEn },
              brand: { ar: d?.brandAr || d?.brand || 'عام', en: d?.brandEn || d?.brand || 'Generic' },
              categoryId,
              price,
              originalPrice: origPrice,
              rating,
              reviewCount,
              images: Array.isArray(d?.images)
                ? (d.images.map((im:any)=> im?.imageUrl || im?.url || im?.src).filter(Boolean))
                : ((d?.imageUrl || d?.image || d?.thumbnail || d?.mainImage) ? [String(d?.imageUrl || d?.image || d?.thumbnail || d?.mainImage)] : []),
              inStock: stockQ > 0 || pickBool(d, ['inStock','available'], false),
              stockCount: stockQ,
              isNew: false,
              isOnSale: false,
              compatibility: [],
              partNumber,
              warranty: { ar: warrantyAr, en: warrantyEn },
              description: { ar: descAr, en: descEn },
              features: Array.isArray(d?.features) ? d.features : [],
              installationTips: Array.isArray(d?.installationTips) ? d.installationTips : [],
              specifications: typeof d?.specifications === 'object' && d?.specifications !== null ? d.specifications : {},
              compatibilityBackend: Array.isArray(d?.compatibility) ? d.compatibility : [],
              addonInstallation: d?.addonInstallation,
            });
          }
          return;
        }
        // If we didn't have a URL id but we have a slug in URL, try slug
        if (!urlId && urlSlug) {
          console.debug('[ProductDetails] Fetching by URL slug:', urlSlug);
          const rSlug = await getProductBySlug(urlSlug);
          if (!rSlug.ok) {
            if (!cancelled) {
              const err = { status: rSlug.status, error: rSlug.error, source: 'url-slug', slug: urlSlug } as any;
              try { (window as any).__lastProductError = err; } catch {}
              setLoadError(err);
            }
          }
          if (rSlug.ok && rSlug.data && !cancelled) {
            try { (window as any).__lastProductRaw = rSlug.data; } catch {}
            const d: any = rSlug.data as any;
            const stockQ = pickNum(d, ['stockQuantity','stock','quantity','availableQuantity'], 0);
            const price = pickNum(d, ['discountPrice','price'], Number(d?.price ?? 0));
            const origPrice = pickNum(d, ['price'], 0);
            const nameAr = pickStr(d, ['nameAr','name_ar','nameAR','name_arabic','arabicName']);
            const nameEn = pickStr(d, ['nameEn','name_en','nameEN','englishName','name']);
            let descAr = pickStr(d, ['descriptionAr','description_ar','descAr','desc_ar','description','detailsAr','details_ar']);
            let descEn = pickStr(d, ['descriptionEn','description_en','descEn','desc_en','description','detailsEn','details_en']);
            try {
              if (!descAr || !descEn) {
                const desc = (d as any)?.description;
                if (desc && typeof desc === 'object') {
                  descAr = descAr || String(desc.ar || desc['ar-SA'] || desc['ar_EG'] || desc.arabic || '');
                  descEn = descEn || String(desc.en || desc['en-US'] || desc['en_GB'] || desc.english || '');
                }
              }
            } catch {}
            const rating = pickNum(d, ['averageRating','rating'], 0);
            const reviewCount = pickNum(d, ['reviewCount','reviewsCount','reviews'], 0);
            const partNumber = pickStr(d, ['sku','partNumber','part_number']);
            const warrantyAr = pickStr(d, ['warrantyAr','warranty_ar','warranty'], 'سنة');
            const warrantyEn = pickStr(d, ['warrantyEn','warranty_en','warranty'], '1 year');
            const categoryId = pickStr(d, ['categoryId','category_id']);

            setRemoteProduct({
              id: d.id || d._id || urlSlug,
              name: { ar: nameAr, en: nameEn },
              brand: { ar: d?.brandAr || d?.brand || 'عام', en: d?.brandEn || d?.brand || 'Generic' },
              categoryId,
              price,
              originalPrice: origPrice,
              rating,
              reviewCount,
              images: Array.isArray(d?.images)
                ? (d.images.map((im:any)=> im?.imageUrl || im?.url || im?.src).filter(Boolean))
                : ((d?.imageUrl || d?.image || d?.thumbnail || d?.mainImage) ? [String(d?.imageUrl || d?.image || d?.thumbnail || d?.mainImage)] : []),
              inStock: stockQ > 0 || (d?.inStock === true) || (d?.available === true),
              stockCount: stockQ,
              isNew: false,
              isOnSale: false,
              compatibility: Array.isArray(d?.compatibility) ? d.compatibility : [],
              partNumber,
              warranty: { ar: warrantyAr, en: warrantyEn },
              description: { ar: descAr, en: descEn },
              features: Array.isArray(d?.features) ? d.features : [],
              installationTips: Array.isArray(d?.installationTips) ? d.installationTips : [],
              specifications: typeof d?.specifications === 'object' && d?.specifications !== null ? d.specifications : {},
              compatibilityBackend: Array.isArray(d?.compatibility) ? d.compatibility : [],
              addonInstallation: d?.addonInstallation,
            });
            return;
          }
        }
        // 2) Fallbacks when navigated from listing page
        const cand: any = selectedProduct;
        if (cand && cand.id) {
          const cid = String(cand.id).trim();
          try {
            const r2 = await getProductById(cid);
            console.debug('[ProductDetails] Fallback fetch by selectedProduct.id status:', r2?.status, 'ok:', r2?.ok);
            if (r2.ok && r2.data && !cancelled) {
              const d: any = r2.data as any;
              const stockQ = pickNum(d, ['stockQuantity','stock','quantity','availableQuantity'], 0);
              const price = pickNum(d, ['discountPrice','price'], Number(d?.price ?? 0));
              const origPrice = pickNum(d, ['price'], 0);
              const nameAr = pickStr(d, ['nameAr','name_ar','nameAR','name_arabic','arabicName']);
              const nameEn = pickStr(d, ['nameEn','name_en','nameEN','englishName','name']);
              let descAr = pickStr(d, ['descriptionAr','description_ar','descAr','desc_ar','description','detailsAr','details_ar']);
              let descEn = pickStr(d, ['descriptionEn','description_en','descEn','desc_en','description','detailsEn','details_en']);
              try {
                if (!descAr || !descEn) {
                  const desc = (d as any)?.description;
                  if (desc && typeof desc === 'object') {
                    descAr = descAr || String(desc.ar || desc['ar-SA'] || desc['ar_EG'] || desc.arabic || '');
                    descEn = descEn || String(desc.en || desc['en-US'] || desc['en_GB'] || desc.english || '');
                  }
                }
              } catch {}
              const rating = pickNum(d, ['averageRating','rating'], 0);
              const reviewCount = pickNum(d, ['reviewCount','reviewsCount','reviews'], 0);
              const partNumber = pickStr(d, ['sku','partNumber','part_number']);
              const warrantyAr = pickStr(d, ['warrantyAr','warranty_ar','warranty'], 'سنة');
              const warrantyEn = pickStr(d, ['warrantyEn','warranty_en','warranty'], '1 year');
              const categoryId = pickStr(d, ['categoryId','category_id']);

              setRemoteProduct({
                id: d.id || d._id || cid,
                name: { ar: nameAr, en: nameEn },
                brand: { ar: d?.brandAr || d?.brand || 'عام', en: d?.brandEn || d?.brand || 'Generic' },
                categoryId,
                price,
                originalPrice: origPrice,
                rating,
                reviewCount,
                images: Array.isArray(d?.images)
                  ? (d.images.map((im:any)=> im?.imageUrl || im?.url || im?.src).filter(Boolean))
                  : ((d?.imageUrl || d?.image || d?.thumbnail || d?.mainImage) ? [String(d?.imageUrl || d?.image || d?.thumbnail || d?.mainImage)] : []),
                inStock: stockQ > 0 || (d?.inStock === true) || (d?.available === true),
                stockCount: stockQ,
                isNew: false,
                isOnSale: false,
                compatibility: Array.isArray(d?.compatibility) ? d.compatibility : [],
                partNumber,
                warranty: { ar: warrantyAr, en: warrantyEn },
                description: { ar: descAr, en: descEn },
                features: Array.isArray(d?.features) ? d.features : [],
                installationTips: Array.isArray(d?.installationTips) ? d.installationTips : [],
                specifications: typeof d?.specifications === 'object' && d?.specifications !== null ? d.specifications : {},
                compatibilityBackend: Array.isArray(d?.compatibility) ? d.compatibility : [],
                addonInstallation: d?.addonInstallation,
              });
              return;
            }
          } catch {}
        }
        if (cand && cand.slug && typeof cand.slug === 'string') {
          const { ok, data } = await getProductBySlug(String(cand.slug));
          if (ok && data && !cancelled) setRemoteProduct({ ...cand, ...data });
        }
      } catch {}
    };
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(selectedProduct)]);
  const [quantity, setQuantity] = useState(1);
  const [loadError, setLoadError] = useState<{ status: number; error: any; source: string } | null>(null);
  const [installSelected, setInstallSelected] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [userComment, setUserComment] = useState("");
  // Reviews state
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [reviewsLoadedFor, setReviewsLoadedFor] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  
  // Prefer remote fetched product when available
  const [remoteProduct, setRemoteProduct] = useState<any | null>(null);
  // Use only backend/selected source; no static fallback
  const product = remoteProduct || selectedProduct || null;

  // Check if product is in wishlist using props
  const isWishlisted = isInWishlist && isInWishlist(product?.id || "1");

  const deriveImages = (p: any): string[] => {
    try {
      if (!p) return [];
      const imgs = p.images;
      if (Array.isArray(imgs)) {
        // Support arrays of strings or objects with common keys
        const mapped = imgs
          .map((im: any) => {
            if (!im) return null;
            if (typeof im === 'string') return im;
            return im.imageUrl || im.url || im.src || null;
          })
          .filter(Boolean) as string[];
        if (mapped.length) return mapped;
      }
      // Single image common fields
      const single = p.imageUrl || p.image || p.thumbnail || p.mainImage || null;
      if (single) return [String(single)];
      return [];
    } catch { return []; }
  };

  const images = deriveImages(product);
  // If product has no images, we'll optionally fall back to category image further below
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  // displayedImages will be recalculated after we (optionally) fetch a category image; define a placeholder now
  let displayedImages: string[] = images;
  const discountPercentage =
    product && Number(product.originalPrice) > Number(product.price)
      ? Math.round(
          ((Number(product.originalPrice) - Number(product.price)) / Number(product.originalPrice)) * 100
        )
      : 0;

  // Normalize availability in case product from other pages lacks these fields
  const normalizedInStock = !!product && ((product as any).inStock !== false) && ((((product as any).stockCount ?? (product as any).stock ?? 1) as number) > 0);
  const normalizedStockCount = (product as any)?.stockCount ?? (product as any)?.stock ?? 99;

  const textName = getText(product?.name || '').toLowerCase();
  const textCat = '';
  const textSub = '';
  const isDoorLike = /باب|door/.test(textName) || /باب|door/.test(textCat) || /باب|door/.test(textSub);
  const isWindowLike = /شباك|نافذة|window/.test(textName) || /شباك|نافذة|window/.test(textCat) || /شباك|نافذة|window/.test(textSub);
  const doorWindowIds = new Set(['wd-1','mw-1','aw-1']);
  // Prefer vendor-provided installation availability and fee if present
  const vendorInstallEnabled = !!(product as any)?.addonInstallation?.enabled;
  const vendorInstallFee = Number((product as any)?.addonInstallation?.feePerUnit ?? 50);
  const fallbackInstall = doorWindowIds.has(product?.id || '') || isDoorLike || isWindowLike;
  const showInstallOption = vendorInstallEnabled ? true : fallbackInstall;
  const INSTALL_FEE_PER_UNIT = vendorInstallEnabled ? vendorInstallFee : 50;
  const priceWithAddon = (product?.price || 0) + (showInstallOption && installSelected ? INSTALL_FEE_PER_UNIT : 0);
  const subtotal = priceWithAddon * quantity;

  const handleAddToCart = () => {
    // Front-only add to cart using context
    if (addToCart) {
      addToCart({
        id: product.id,
        name: getText(product.name),
        price: priceWithAddon,
        image: displayedImages[0],
        partNumber: product.partNumber,
        quantity,
        inStock: normalizedInStock,
        maxQuantity: normalizedStockCount,
        originalPrice: product.originalPrice,
        brand: getText(product.brand),
        // metadata
        addonInstallation: showInstallOption && installSelected ? {
          enabled: true,
          feePerUnit: INSTALL_FEE_PER_UNIT,
          totalFee: INSTALL_FEE_PER_UNIT * quantity,
          label: locale === 'ar' ? 'خدمة تركيب مع ضمان جودة' : 'Installation service with quality guarantee'
        } : { enabled: false }
      });
    }
    if (setCurrentPage) {
      setCurrentPage("cart");
    }
  };

  const handleBuyNow = () => {
    if (addToCart) {
      addToCart({
        id: product.id,
        name: getText(product.name),
      price: priceWithAddon,
      image: images[0],
      partNumber: product.partNumber,
      quantity,
      inStock: normalizedInStock,
      maxQuantity: normalizedStockCount,
      originalPrice: product.originalPrice,
      brand: getText(product.brand),
      addonInstallation: showInstallOption && installSelected ? {
        enabled: true,
        feePerUnit: INSTALL_FEE_PER_UNIT,
        totalFee: INSTALL_FEE_PER_UNIT * quantity,
        label: locale === 'ar' ? 'خدمة تركيب مع ضمان جودة' : 'Installation service with quality guarantee'
      } : { enabled: false }
      });
    }
    if (setCurrentPage) {
      setCurrentPage("checkout");
    }
  };

  // Resolve category name if categoryId exists
  const [categoryName, setCategoryName] = useState<string>("");
  const [categoryImage, setCategoryImage] = useState<string>("");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cid = (product as any)?.categoryId;
        if (!cid) { setCategoryName(""); return; }
        const { ok, data } = await getCategoryById(String(cid));
        if (ok && data && !cancelled) {
          setCategoryName(String((data as any)?.nameAr || (data as any)?.nameEn || ''));
          const cimg = (data as any)?.imageUrl || (data as any)?.ImageUrl || '';
          if (cimg) setCategoryImage(String(cimg));
        }
      } catch { setCategoryName(""); }
    })();
    return () => { cancelled = true; };
  }, [product]);

  // Final displayed images with category fallback
  displayedImages = images.length ? images : (categoryImage ? [categoryImage] : []);

  // Keep selected index within bounds when images change
  useEffect(() => {
    if (selectedImageIndex > Math.max(0, displayedImages.length - 1)) {
      setSelectedImageIndex(0);
    }
  }, [selectedImageIndex, displayedImages.length]);

  // Load reviews when product id becomes available
  useEffect(() => {
    (async () => {
      try {
        const getPid = (): string => {
          try {
            const url = new URL(window.location.href);
            const idParam = url.searchParams.get('id');
            if (idParam && /^[a-fA-F0-9]{24}$/.test(idParam)) return idParam;
          } catch {}
          try {
            const raw = String((product as any)?.id || '').trim();
            if (!raw) return '';
            const oid = raw.match(/^[a-fA-F0-9]{24}(?=\b|\|)/);
            return oid && oid[0] ? oid[0] : raw.split('|')[0];
          } catch { return ''; }
        };
        const pid = getPid();
        if (!pid || pid === reviewsLoadedFor) return;
        try { console.debug('[reviews] fetching for product', pid); } catch {}
        const r = await getReviews(pid);
        if (r.ok && (r.data as any)?.items) {
          setReviews(((r.data as any).items as any[]).map((it:any)=> ({
            id: String(it._id || it.id || ''),
            productId: String(it.productId || pid),
            userId: String(it.userId || ''),
            userName: String(it.userName || ''),
            rating: Number(it.rating || 0),
            comment: String(it.comment || ''),
            createdAt: String(it.createdAt || ''),
          })));
          setReviewsLoadedFor(pid);
        } else {
          setReviews([]);
          setReviewsLoadedFor(pid);
        }
      } catch {}
    })();
  }, [product, reviewsLoadedFor]);

  const submitReview = async () => {
    const currentUser = (rest as any)?.user;
    const setReturnToFn = (rest as any)?.setReturnTo as undefined | ((p: string|null)=>void);
    const setCurrentPageFn = (rest as any)?.setCurrentPage as undefined | ((p: string)=>void);
    if (!currentUser) { setReturnToFn && setReturnToFn('product-details'); setCurrentPageFn && setCurrentPageFn('login'); return; }
    const pid = (() => {
      try {
        const url = new URL(window.location.href);
        const idParam = url.searchParams.get('id');
        if (idParam && /^[a-fA-F0-9]{24}$/.test(idParam)) return idParam;
      } catch {}
      try {
        const raw = String((product as any)?.id || '').trim();
        const oid = raw.match(/^[a-fA-F0-9]{24}(?=\b|\|)/);
        return oid && oid[0] ? oid[0] : raw.split('|')[0];
      } catch { return ''; }
    })();
    if (!pid || !userRating) return;
    setSubmittingReview(true);
    try {
      try { console.debug('[reviews] submit', { pid, rating: userRating, comment: userComment }); } catch {}
      const r = await addReview(pid, { rating: userRating, comment: userComment });
      try { console.debug('[reviews] submit result', r?.status, r?.ok, r?.error); } catch {}
      if (r.ok) {
        // Prepend optimistically
        setReviews((prev)=> [{ id: String(Date.now()), productId: pid, userId: String((currentUser as any)?.id || ''), userName: String((currentUser as any)?.name || 'User'), rating: userRating, comment: userComment, createdAt: new Date().toISOString() }, ...prev]);
        setUserRating(null);
        setUserComment('');
        toastSuccess(locale==='ar' ? 'تم إرسال التقييم' : 'Review submitted', locale==='ar');
        // Re-fetch from server to reflect aggregates/order
        try {
          const rr = await getReviews(pid);
          if (rr.ok && (rr.data as any)?.items) {
            setReviews(((rr.data as any).items as any[]).map((it:any)=> ({
              id: String(it._id || it.id || ''),
              productId: String(it.productId || pid),
              userId: String(it.userId || ''),
              userName: String(it.userName || ''),
              rating: Number(it.rating || 0),
              comment: String(it.comment || ''),
              createdAt: String(it.createdAt || ''),
            })));
          }
        } catch {}
      } else {
        if (r.status === 401) {
          toastInfo(locale==='ar' ? 'الرجاء تسجيل الدخول لإضافة تقييم' : 'Please login to add a review', locale==='ar');
          setReturnToFn && setReturnToFn('product-details');
          setCurrentPageFn && setCurrentPageFn('login');
        } else if (r.status === 400) {
          toastInfo(locale==='ar' ? 'معرّف المنتج غير صالح' : 'Invalid product id', locale==='ar');
        } else {
          toastInfo(locale==='ar' ? 'تعذر إرسال التقييم' : 'Failed to submit review', locale==='ar');
        }
      }
    } catch {
      toastInfo(locale==='ar' ? 'تعذر إرسال التقييم' : 'Failed to submit review', locale==='ar');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header currentPage="product-details" setCurrentPage={setCurrentPage!} {...(rest as any)} />
        <div className="container mx-auto px-4 py-12">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold mb-2">{locale==='ar'? 'تعذر تحميل تفاصيل المنتج' : 'Failed to load product details'}</h2>
              {loadError && (
                <div className="text-sm text-muted-foreground mb-4 break-all">
                  {locale==='ar' ? `رمز الاستجابة: ${loadError.status}` : `Status: ${loadError.status}`}
                </div>
              )}
              <div className="text-xs text-muted-foreground mb-4">
                {locale==='ar' ? 'تحقق من المعرف في الرابط أو جرّب لاحقاً.' : 'Check the id in the URL or try again later.'}
              </div>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => { try { window.location.reload(); } catch {} }}>
                  {locale==='ar' ? 'إعادة المحاولة' : 'Retry'}
                </Button>
                <Button className="" onClick={() => setCurrentPage && setCurrentPage('products')}>
                  {locale==='ar'? 'العودة للمنتجات' : 'Back to Products'}
                </Button>
              </div>
              <div className="text-left text-xs mt-6 p-3 bg-muted/40 rounded">
                <pre className="whitespace-pre-wrap break-all">
                  {typeof window !== 'undefined' ? JSON.stringify((window as any).__lastProductError || loadError, null, 2) : ''}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer setCurrentPage={setCurrentPage!} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background"
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <Header currentPage="product-details" setCurrentPage={setCurrentPage!} {...(rest as any)} />

      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <button
            onClick={() => setCurrentPage && setCurrentPage("home")}
            className="hover:text-primary"
          >
            {t("home")}
          </button>
          <ChevronLeft className="h-4 w-4" />
          <button
            onClick={() => setCurrentPage && setCurrentPage("products")}
            className="hover:text-primary"
          >
            {t("products")}
          </button>
          <ChevronLeft className="h-4 w-4" />
          <button
            onClick={() => {
              try {
                (rest as any)?.setSearchFilters && (rest as any).setSearchFilters({ term: '', categoryId: Number((product as any)?.categoryId || 0) });
              } catch {}
              setCurrentPage && setCurrentPage('products');
            }}
            className="hover:text-primary"
          >
            {categoryName || (locale==='ar'? 'الصنف' : 'Category')}
          </button>
          <ChevronLeft className="h-4 w-4" />
          <span className="text-foreground">{getText(product.name)}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative">
              <ImageWithFallback
                src={displayedImages[selectedImageIndex]}
                alt={getText(product.name)}
                className="w-full h-96 object-cover rounded-lg"
              />
              {product.isNew && (
                <Badge className="absolute top-4 right-4 bg-green-500">
                  {locale === "en" ? "New" : "جديد"}
                </Badge>
              )}
              {product.isOnSale && (
                <Badge className="absolute top-4 left-4 bg-red-500">
                  {locale === "en" ? "Discount" : "خصم"} {discountPercentage}%
                </Badge>
              )}

              {displayedImages.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/90"
                    onClick={() =>
                      setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))
                    }
                    disabled={selectedImageIndex === 0}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/90"
                    onClick={() =>
                      setSelectedImageIndex(
                        Math.min(displayedImages.length - 1, selectedImageIndex + 1)
                      )
                    }
                    disabled={selectedImageIndex === displayedImages.length - 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            {displayedImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {displayedImages.map((image: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 border-2 rounded-lg overflow-hidden ${
                      index === selectedImageIndex
                        ? "border-primary"
                        : "border-gray-200"
                    }`}
                    aria-label={`thumbnail-${index + 1}`}
                  >
                    <ImageWithFallback
                      src={image}
                      alt={`${getText(product.name)} - ${index + 1}`}
                      className="w-20 h-20 object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">{getText(product.name)}</h1>
              {/* Brand removed per request */}

              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(product.rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm">{product.rating}</span>
                <span className="text-sm text-muted-foreground">
                  ({product.reviewCount} Reviews)
                </span>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <span className="text-3xl font-bold text-primary">
                  {product.price} {currency}
                </span>
                {product.originalPrice > product.price && (
                  <span className="text-xl text-muted-foreground line-through">
                    {product.originalPrice} {currency}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                    normalizedInStock
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {normalizedInStock
                    ? `${t("available")} (${normalizedStockCount})`
                    : t("outOfStock")}
                </span>
                {/* Part number removed per request */}
              </div>
            </div>

            {/* Quantity and Actions */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">{t("quantity")}:</label>
                <div className="flex items-center border rounded-lg">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="px-4 py-2 min-w-[60px] text-center">
                    {quantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={quantity >= normalizedStockCount}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {showInstallOption && (
                <div className="flex items-start gap-3 rounded-md border p-3 bg-muted/40">
                  <input
                    id="install-addon"
                    type="checkbox"
                    className="mt-1"
                    checked={installSelected}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInstallSelected(e.target.checked)}
                  />
                  <label htmlFor="install-addon" className="text-sm cursor-pointer">
                    <span className="font-medium">
                      {locale === 'ar' ? 'خدمة تركيب احترافية' : 'Professional installation service'}
                    </span>
                    <span className="mx-1">•</span>
                    <span className="text-primary font-semibold">{INSTALL_FEE_PER_UNIT} {currency}</span>
                    <div className="text-xs text-muted-foreground mt-1">
                      {locale === 'ar' ? 'تقديم الخدمة بمعايير عالية مع ضمان جودة الخدمة.' : 'Delivered with high standards and a quality guarantee.'}
                    </div>
                    {installSelected && (
                      <div className="text-xs mt-1">
                        {locale === 'ar'
                          ? `إجمالي خدمة التركيب: ${INSTALL_FEE_PER_UNIT * quantity} ${currency} ( ${quantity} × ${INSTALL_FEE_PER_UNIT} )`
                          : `Installation total: ${INSTALL_FEE_PER_UNIT * quantity} ${currency} ( ${quantity} × ${INSTALL_FEE_PER_UNIT} )`}
                      </div>
                    )}
                  </label>
                </div>
              )}

              {/* Subtotal reflecting quantity and installation per unit */}
              <div className="flex items-center justify-between text-sm bg-muted/30 rounded-md px-3 py-2">
                <span className="text-muted-foreground">
                  {locale === 'ar' ? 'الإجمالي' : 'Subtotal'}
                </span>
                <span className="font-semibold text-primary">
                  {subtotal} {currency}
                </span>
              </div>

              <div className="flex gap-4">
                {!isVendor && (
                  <Button
                    className="flex-1"
                    onClick={handleAddToCart}
                    disabled={!normalizedInStock}
                  >
                    <ShoppingCart className="h-4 w-4 ml-2" />
                    {t("addToCart")}
                  </Button>
                )}
                {!isVendor && (
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isWishlisted) {
                        addToWishlist && addToWishlist({
                          id: product?.id || "1",
                          name: getText(product?.name),
                          price: product?.price || 0,
                          brand: getText(product?.brand),
                          originalPrice: product?.originalPrice,
                          image: product?.images?.[0] || "",
                          partNumber: product?.partNumber,
                          inStock: product?.inStock || false
                        });
                        toastSuccess(locale === 'en' ? 'Added to wishlist' : 'تمت الإضافة إلى المفضلة', locale==='ar');
                      } else {
                        removeFromWishlist && removeFromWishlist(product?.id || "1");
                        toastInfo(locale === 'en' ? 'Removed from wishlist' : 'تمت الإزالة من المفضلة', locale==='ar');
                      }
                    }}
                    className={isWishlisted ? "text-red-500 border-red-500" : ""}
                  >
                    <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      const url = window.location.href;
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(url)
                          .then(() => {
                            toastSuccess(locale === 'ar' ? 'تم نسخ الرابط' : 'Link copied', locale==='ar');
                          })
                          .catch(() => {
                            window.prompt(locale==='ar' ? 'انسخ الرابط:' : 'Copy link:', url);
                          });
                      } else {
                        window.prompt(locale==='ar' ? 'انسخ الرابط:' : 'Copy link:', url);
                      }
                    } catch {}
                  }}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Remove static features card. If backend provides warranty/return policy, it can be shown elsewhere. */}
          </div>
        </div>

        {/* Product Details Tabs */}
        <Tabs defaultValue="description" className="mb-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="description">{t("description")}</TabsTrigger>
            {product.specifications && Object.keys(product.specifications || {}).length > 0 && (
              <TabsTrigger value="specifications">{t("specifications")}</TabsTrigger>
            )}
            {(Array.isArray(product.compatibilityBackend) && product.compatibilityBackend.length > 0) || (Array.isArray(product.compatibility) && product.compatibility.length > 0) ? (
              <TabsTrigger value="compatibility">{t("compatibility") || "Compatibility"}</TabsTrigger>
            ) : null}
            <TabsTrigger value="reviews">{locale==='ar' ? 'التقييمات' : 'Reviews'}</TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <p className="mb-6">{(() => {
                  const desc = getText(product.description);
                  // Remove unwanted phrases from description
                  return desc
                    .replace(/جودة عالية/gi, '')
                    .replace(/أسعار منافسة/gi, '')
                    .replace(/خدمة سريعة/gi, '')
                    .replace(/Quality/gi, '')
                    .replace(/Competitive/gi, '')
                    .replace(/Service/gi, '')
                    .replace(/نصائح تركيب/gi, '')
                    .replace(/Installation Tips/gi, '')
                    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                    .trim();
                })()}</p>

                <h3 className="font-medium mb-4">{t("features")}</h3>
                <ul className="space-y-2">
                  {product.features?.map((feature: string, index: number) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Installation tips removed as requested */}
              </CardContent>
            </Card>
          </TabsContent>

          {product.specifications && Object.keys(product.specifications || {}).length > 0 && (
            <TabsContent value="specifications" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <div className="grid gap-4">
                    {Object.entries(product.specifications || {}).map(
                      ([key, value]: [string, unknown]) => (
                        <div
                          key={key}
                          className="flex justify-between py-2 border-b border-gray-100 last:border-b-0"
                        >
                          <span className="font-medium">{key}</span>
                          <span className="text-muted-foreground">{typeof value === 'object' && value !== null ? getText(value as any) : String(value)}</span>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {((Array.isArray(product.compatibilityBackend) && product.compatibilityBackend.length > 0) || (Array.isArray(product.compatibility) && product.compatibility.length > 0)) && (
            <TabsContent value="compatibility" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-4">
                    {t("compatibility") || "Compatibility"}:
                  </h3>
                  <div className="grid gap-2">
                    {(product.compatibilityBackend?.length ? product.compatibilityBackend : product.compatibility)?.map((car: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-muted rounded"
                      >
                        <Check className="h-4 w-4 text-green-500" />
                        <span>{typeof car === 'object' && car !== null ? getText(car) : String(car)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="mt-6">
            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="font-medium mb-3">{locale==='ar' ? 'أضف تقييمك' : 'Add your review'}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    {[1,2,3,4,5].map((s)=> (
                      <button
                        key={s}
                        onClick={() => setUserRating(s)}
                        className="p-1"
                        aria-label={`rate-${s}`}
                      >
                        <Star className={`h-5 w-5 ${userRating && s <= userRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={userComment}
                    onChange={(e)=> setUserComment(e.target.value)}
                    className="w-full border rounded-md p-2 text-sm"
                    rows={3}
                    placeholder={locale==='ar' ? 'أضف تعليقك (اختياري)' : 'Write a comment (optional)'}
                  />
                  <div className="mt-2">
                    <Button disabled={!userRating || submittingReview} onClick={submitReview}>
                      {submittingReview ? (locale==='ar' ? 'جاري الإرسال...' : 'Submitting...') : (locale==='ar' ? 'إرسال' : 'Submit')}
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-3">{locale==='ar' ? 'آراء المستخدمين' : 'User Reviews'}</h3>
                  {reviews.length === 0 ? (
                    <div className="text-sm text-muted-foreground">{locale==='ar' ? 'لا توجد تقييمات بعد.' : 'No reviews yet.'}</div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((rv) => (
                        <div key={rv.id} className="border rounded-md p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-medium text-sm">{rv.userName}</div>
                            <div className="flex items-center gap-1">
                              {[1,2,3,4,5].map((s)=> (
                                <Star key={s} className={`h-3.5 w-3.5 ${s <= (rv.rating||0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                              ))}
                            </div>
                          </div>
                          {rv.comment && (<div className="text-sm text-muted-foreground whitespace-pre-wrap">{rv.comment}</div>)}
                          {rv.createdAt && (<div className="text-[11px] text-gray-400 mt-1">{formatDateTime(rv.createdAt)}</div>)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        {/* Remove static related products placeholder */}
      </div>

      <Footer setCurrentPage={setCurrentPage!} />
    </div>
  );
}


// Force SSR to prevent static export
export async function getServerSideProps() {
  return { props: {} };
}