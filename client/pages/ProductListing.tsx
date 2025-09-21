import { useState, useEffect, useRef } from "react";
import {
  Search,
  Filter,
  ChevronDown,
  Star,
  ShoppingCart,
  Heart,
  Eye,
  ArrowUpDown,
  Grid,
  List,
  Package,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import Swal from "sweetalert2";
import { toastSuccess, toastInfo } from "../utils/alerts";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
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
import { RouteContext } from "../components/Router";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { getAllCategories, type CategoryDto } from "../services/products";
import { useTranslation } from "../hooks/useTranslation";
import { Dialog, DialogTrigger } from "../components/ui/dialog";
import ProductForm from "../components/vendor/ProductForm";
import { confirmDialog } from "../utils/alerts";
import { getProducts } from "../services/products";
import { addFavorite, removeFavorite, isFavorite } from "../lib/favorites";

// Categories come from backend
const categoriesSeed: string[] = [];

interface ProductListingProps {
  setCurrentPage: (page: string) => void;
  setSelectedProduct: (product: any) => void;
  isInWishlist?: (id: string) => boolean;
}

export default function ProductListing({
  setCurrentPage,
  setSelectedProduct,
  isInWishlist,
  ...rest
}: ProductListingProps & Partial<RouteContext>) {
  const { t, locale } = useTranslation();
  const currency = locale === "ar" ? "ر.س" : "SAR";
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState(rest?.searchFilters?.term || "");
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>(rest?.searchFilters?.partCategory || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(rest?.searchFilters?.categoryId ? String(rest.searchFilters.categoryId) : 'all');
  // Removed brands filter
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [priceBounds, setPriceBounds] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState("relevance");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [openCategories, setOpenCategories] = useState(false);
  const [openPrice, setOpenPrice] = useState(false);
  const [openFlags, setOpenFlags] = useState(false);
  // Force public listing to be read-only and sourced only from backend
  const isVendor = false;
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  // Only show the global loading overlay once when the page initially mounts
  const firstLoadRef = useRef(true);

  // Helper: collect all descendant category IDs for a given category id
  const collectDescendantIds = (list: CategoryDto[], rootId: string): string[] => {
    // Use parentCategoryId across the whole list to find all descendants
    const result: string[] = [];
    const stack: string[] = [String(rootId)];
    const all = Array.isArray(list) ? list : [];
    while (stack.length) {
      const parent = String(stack.pop());
      const children = all.filter((c:any) => String(c?.parentCategoryId || '') === parent);
      for (const ch of children) {
        const id = String((ch as any).id || '');
        if (id && !result.includes(id)) {
          result.push(id);
          stack.push(id);
        }
      }
    }
    // Remove the root itself if it got included; we only want descendants
    return result.filter(id => id !== String(rootId));
  };

  // Load from backend only and map records to UI shape
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // Show global loading overlay on first entry to the products page
        if (firstLoadRef.current && typeof (rest as any)?.showLoading === 'function') {
          (rest as any).showLoading(
            locale === 'ar' ? 'جاري تحميل المنتجات' : 'Loading products',
            locale === 'ar' ? 'يرجى الانتظار' : 'Please wait'
          );
        }
        const sortMap: Record<string, { sortBy?: string; sortDirection?: 'asc'|'desc' }> = {
          relevance: {},
          'price-low': { sortBy: 'price', sortDirection: 'asc' },
          'price-high': { sortBy: 'price', sortDirection: 'desc' },
          rating: { sortBy: 'rating', sortDirection: 'desc' },
          newest: { sortBy: 'createdAt', sortDirection: 'desc' },
        };
        // If user typed a category name, map it to categoryId to ask backend directly
        const catMatch = categories.find((c:any) => {
          const nmAr = String(c?.nameAr || '').trim();
          const nmEn = String(c?.nameEn || '').trim();
          return searchTerm && (nmAr === searchTerm || nmEn === searchTerm);
        });
        const effectiveCategoryId = catMatch?.id
          ?? (rest?.searchFilters?.categoryId ? String(rest.searchFilters.categoryId) : undefined)
          ?? (selectedCategoryId && selectedCategoryId !== 'all' ? String(selectedCategoryId) : undefined);
        try { console.debug('[products] selectedCategoryId', selectedCategoryId, 'catMatch?', !!catMatch, 'effectiveCategoryId', effectiveCategoryId); } catch {}
        const params: any = {
          page: 1,
          pageSize: 100,
          // If a category is selected, do not filter by text to avoid over-filtering
          query: effectiveCategoryId ? '' : (catMatch ? '' : searchTerm),
          categoryId: effectiveCategoryId,
          ...sortMap[sortBy]
        };
        // If a category is selected and has descendants, fetch all and merge
        let allItems: any[] = [];
        if (effectiveCategoryId) {
          const descendants = collectDescendantIds(categories as any, String(effectiveCategoryId));
          const ids = [String(effectiveCategoryId), ...descendants];
          if (ids.length > 1) {
            const calls = ids.map((cid) => getProducts({ ...params, categoryId: cid, query: '' }) as any);
            const results = await Promise.allSettled(calls);
            results.forEach((r:any) => {
              if (r.status === 'fulfilled' && r.value?.ok && r.value?.data) {
                const d = r.value.data;
                const arr = Array.isArray((d as any).items)
                  ? (d as any).items
                  : Array.isArray((d as any).Items)
                    ? (d as any).Items
                    : (Array.isArray(d as any) ? (d as any) : []);
                allItems.push(...arr);
              }
            });
            // Deduplicate by product id
            const seen = new Set<string>();
            allItems = allItems.filter((p:any)=> {
              const id = String(p?.id ?? '');
              if (!id || seen.has(id)) return false;
              seen.add(id);
              return true;
            });
          } else {
            const { ok, data, status } = await getProducts(params) as any;
            try { console.debug('[products] request params', params, 'ok', ok, 'status', status); } catch {}
            if (ok && data) {
              let arr = Array.isArray((data as any).items)
                ? (data as any).items
                : Array.isArray((data as any).Items)
                  ? (data as any).Items
                  : (Array.isArray(data as any) ? (data as any) : []);
              allItems = arr;
            }
          }
        } else {
          const { ok, data, status } = await getProducts(params) as any;
          try { console.debug('[products] request params', params, 'ok', ok, 'status', status); } catch {}
          if (ok && data) {
            let arr = Array.isArray((data as any).items)
              ? (data as any).items
              : Array.isArray((data as any).Items)
                ? (data as any).Items
                : (Array.isArray(data as any) ? (data as any) : []);
            allItems = arr;
          }
        }

        if (Array.isArray(allItems)) {
          let arr = allItems;
          try { console.debug('[products] raw items count', Array.isArray(arr) ? arr.length : 0); } catch {}
          // keep only products that have at least one image url
          arr = arr.filter((p: any) => {
            const imgs = Array.isArray((p as any).images) ? (p as any).images : [];
            const primaryUrl = imgs.find((im: any) => im?.isPrimary)?.imageUrl || imgs[0]?.imageUrl;
            return Boolean(primaryUrl || (p as any).imageUrl);
          });
          try { console.debug('[products] after image filter count', Array.isArray(arr) ? arr.length : 0); } catch {}
          const backendList = arr.map((p: any) => {
            const imgs = Array.isArray((p as any).images) ? (p as any).images : [];
            const primaryUrl = imgs.find((im: any) => im?.isPrimary)?.imageUrl || imgs[0]?.imageUrl;
            const basePrice = Number(p.price || 0);
            const disc = (p as any).discountPrice;
            const hasValidDiscount = typeof disc === 'number' && disc > 0 && disc < basePrice;
            const currentPrice = hasValidDiscount ? Number(disc) : basePrice;
            const originalPrice = basePrice;
            // Safe id mapping
            const rawId = (p as any).id ?? (p as any)._id ?? '';
            const idStr = String(rawId).trim();
            // Derive brand from attributes if available
            const attrs = Array.isArray((p as any).attributes) ? (p as any).attributes : [];
            const brandAttr = attrs.find((a:any) => {
              const nEn = String(a?.nameEn || '').toLowerCase();
              const nAr = String(a?.nameAr || '').toLowerCase();
              return ['brand','make','manufacturer','company'].includes(nEn) || ['العلامة التجارية','الماركة','ماركة','الشركة','الصانع'].includes(nAr);
            });
            const brandAr = String(brandAttr?.valueAr || brandAttr?.valueEn || '').trim();
            const brandEn = String(brandAttr?.valueEn || brandAttr?.valueAr || '').trim();
            return ({
              id: idStr,
              slug: (p as any).slug || undefined,
              group: 'tools',
              name: { ar: p.nameAr || '', en: p.nameEn || '' },
              brand: { ar: brandAr || 'عام', en: brandEn || 'Generic' },
              category: { ar: (p as any).categoryName || '', en: (p as any).categoryName || '' },
              categoryId: String((p as any).categoryId ?? ''),
              subCategory: { ar: '', en: '' },
              price: currentPrice,
              originalPrice: originalPrice,
              rating: Number((p as any).averageRating ?? 0),
              reviewCount: Number((p as any).reviewCount ?? 0),
              image: primaryUrl || (p as any).imageUrl,
              inStock: Number((p as any).stockQuantity ?? 0) > 0,
              isNew: false,
              isOnSale: currentPrice < originalPrice,
              compatibility: [],
              partNumber: (p as any).partNumber || '',
              warranty: { ar: 'سنة', en: '1 year' },
              description: { ar: (p as any).descriptionAr || '', en: (p as any).descriptionEn || '' },
            })
          });
          try { if (backendList.length) console.debug('[products] sample id/slug', backendList[0]?.id, backendList[0]?.slug); } catch {}
          if (!cancelled) {
            const cleaned = backendList.filter((p:any) => !!p.id && p.id !== 'undefined' && p.id !== 'null');
            setProducts(cleaned);
            // Dynamic price bounds
            const prices = backendList.map((p:any) => Number(p.price || 0)).filter((n:number)=> !isNaN(n));
            const minP = prices.length ? Math.max(0, Math.floor(Math.min(...prices))) : 0;
            const maxP = prices.length ? Math.ceil(Math.max(...prices)) : 1000;
            setPriceBounds([minP, maxP]);
            // If current range is default or out of new bounds, reset to bounds
            setPriceRange((prev) => {
              const isDefault = prev[0] === 0 && prev[1] === 1000;
              const outOfBounds = prev[0] < minP || prev[1] > maxP || prev[0] > prev[1];
              return (isDefault || outOfBounds) ? [minP, maxP] : [
                Math.max(minP, prev[0]),
                Math.min(maxP, prev[1])
              ];
            });
          }
          if (Array.isArray(arr) && arr.length === 0) {
            try { console.warn('[products] Empty after filtering.'); } catch {}
          }
        } else if (!cancelled) {
          setProducts([]);
        }
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (firstLoadRef.current && typeof (rest as any)?.hideLoading === 'function') {
          (rest as any).hideLoading();
          firstLoadRef.current = false;
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [searchTerm, sortBy, selectedCategoryId, categories, locale]);

  // Load categories from backend; guard with ref to avoid repeating unless locale changes
  const categoriesLoadedRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (categoriesLoadedRef.current && !cancelled) return;
        const { ok, data } = await getAllCategories();
        if (ok && data) {
          let arr: any[] = [];
          if (Array.isArray(data)) arr = data as any[];
          else if (Array.isArray((data as any).items)) arr = (data as any).items;
          else if (Array.isArray((data as any).Items)) arr = (data as any).Items;
          // Normalize shape: ensure id and names exist
          const normalized = arr
            .map((c:any) => ({
              id: String((c?.id ?? c?._id ?? '')).trim(),
              nameAr: c?.nameAr ?? c?.arabicName ?? c?.name ?? '',
              nameEn: c?.nameEn ?? c?.englishName ?? c?.name ?? '',
              parentCategoryId: c?.parentCategoryId ? String(c.parentCategoryId) : undefined,
              subCategories: Array.isArray(c?.subCategories) ? c.subCategories : [],
              isActive: c?.isActive !== false,
            }))
            .filter((c:any) => !!c.id);
          try { console.debug('[categories] loaded', normalized.length); } catch {}
          if (!cancelled) {
            setCategories(normalized as any);
            categoriesLoadedRef.current = true;
          }
        } else if (!cancelled) {
          setCategories([] as any);
        }
      } catch {
        // keep empty if failed
      }
    })();
    return () => { cancelled = true; };
  }, [locale]);

  // Apply incoming normalized group from homepage (engines | tires | electrical | tools)
  useEffect(() => {
    const sf = rest?.searchFilters;
    if (sf) {
      const { partCategory } = sf;
      if (partCategory) {
        setSelectedGroup(partCategory);
        // Reset category filter when group is set to avoid conflicts
        setSelectedCategoryId('all');
      }
    }
  }, [rest?.searchFilters?.partCategory]);

  // Sync selectedCategoryId from router's searchFilters.categoryId when it changes (primitive-only dependency)
  useEffect(() => {
    const cid = rest?.searchFilters?.categoryId ? String(rest.searchFilters.categoryId) : undefined;
    if (cid && cid !== 'all' && cid !== selectedCategoryId) {
      setSelectedCategoryId(cid);
      // When setting an explicit category from router, clear group and search term to avoid conflicts
      setSelectedGroup('');
      setSearchTerm('');
    }
    // If router clears categoryId, do not force local state; user selection persists
  }, [rest?.searchFilters?.categoryId]);

  useEffect(() => {
    let filtered = products;

    // Search filter (case-insensitive). If a category is selected, skip client-side text filtering
    const categorySelected = selectedCategoryId && selectedCategoryId !== 'all';
    if (searchTerm && !categorySelected) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name[locale]?.toLowerCase().includes(q) ||
          product.brand[locale]?.toLowerCase().includes(q) ||
          product.category[locale]?.toLowerCase().includes(q)
      );
    }

    // Removed client-side group and category filters; rely on backend CategoryId filtering

    // Removed brand filter

    // Price filter
    filtered = filtered.filter(
      (product) =>
        product.price >= priceRange[0] && product.price <= priceRange[1]
    );

    // Stock filter
    if (inStockOnly) {
      filtered = filtered.filter((product) => product.inStock);
    }

    // Sale filter
    if (onSaleOnly) {
      filtered = filtered.filter((product) => product.isOnSale);
    }

    // Sort
    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case "newest":
        filtered.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        break;
      default:
        // Keep original order for relevance
        break;
    }

    setFilteredProducts(filtered);
  }, [
    searchTerm,
    selectedGroup,
    selectedCategoryId,
    priceRange,
    sortBy,
    inStockOnly,
    onSaleOnly,
    products,
    locale,
  ]);

  const handleProductClick = (product: any) => {
    setSelectedProduct(product);
    setCurrentPage("product-details");
  };


  const isWishlisted = (id: string) => {
    const isLoggedIn = !!(rest as any)?.user;
    if (isLoggedIn && typeof isInWishlist === 'function') return !!isInWishlist(id);
    return isFavorite(id);
  };

  const ProductCard = ({ product }: { product: any }) => (
    <Card
      className="group cursor-pointer hover:shadow-lg transition-all duration-300"
      onClick={() => { if (!isVendor) handleProductClick(product); }}
    >
      <CardContent className="p-4">
        <div className="relative mb-4">
          <ImageWithFallback
            src={product.image}
            alt={product.name[locale]}
            className="w-full h-48 object-cover rounded-lg"
          />
          {product.isNew && (
            <Badge className="absolute top-2 right-2 bg-green-500">
              {t("new")}
            </Badge>
          )}
          {product.isOnSale && (
            <Badge className="absolute top-2 left-2 bg-red-500">
              {t("sale")}
            </Badge>
          )}
          {!product.inStock && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
              <span className="text-white font-medium">{t("outOfStock")}</span>
            </div>
          )}
          <div className="absolute bottom-2 right-2 opacity-100 transition-opacity flex gap-2">
            {!isVendor && (
              <Button
                variant="ghost"
                size="icon"
                className={`h-9 w-9 p-0 bg-white/95 border border-gray-200 shadow-sm hover:bg-white ring-1 ring-black/5 ${isWishlisted(product.id) ? 'text-red-500 border-red-200 ring-red-200' : 'text-gray-700'}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const isLoggedIn = !!(rest as any)?.user;
                  const useContextWishlist = isLoggedIn && typeof isInWishlist === 'function' && !!rest.addToWishlist && !!rest.removeFromWishlist;
                  const already = isWishlisted(product.id);
                  if (!already) {
                    if (useContextWishlist) {
                      rest.addToWishlist!({
                        id: product.id,
                        name: product.name[locale],
                        price: product.price,
                        brand: product.brand[locale],
                        originalPrice: product.originalPrice,
                        image: product.image,
                        inStock: product.inStock
                      });
                    } else {
                      addFavorite({
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        brand: product.brand,
                        category: product.category,
                        image: product.image,
                      });
                      try { window.dispatchEvent(new Event('favorites_updated')); } catch {}
                    }
                    toastSuccess(locale === 'en' ? 'Added to favorites' : 'تمت الإضافة إلى المفضلة', locale==='ar');
                  } else {
                    if (useContextWishlist) {
                      rest.removeFromWishlist!(product.id);
                    } else {
                      removeFavorite(product.id);
                      try { window.dispatchEvent(new Event('favorites_updated')); } catch {}
                    }
                    toastInfo(locale === 'en' ? 'Removed from favorites' : 'تمت الإزالة من المفضلة', locale==='ar');
                  }
                }}
              >
                <Heart className={`h-5 w-5 ${isWishlisted(product.id) ? 'fill-current' : ''}`} />
              </Button>
            )}
            {isVendor && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 p-0 bg-white/95 border border-gray-200 shadow-sm hover:bg-white ring-1 ring-black/5 text-gray-700"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingProduct(product); }}
                  title={locale==='ar'?'تعديل':'Edit'}
                >
                  <Pencil className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 p-0 bg-white/95 border border-gray-200 shadow-sm hover:bg-white ring-1 ring-black/5 text-red-600"
                  onClick={async (e) => { 
                    e.preventDefault(); e.stopPropagation();
                    const ok = await confirmDialog(locale==='ar'? 'هل تريد حذف هذا المنتج؟':'Delete this product?', locale==='ar'?'حذف':'Delete', locale==='ar'?'إلغاء':'Cancel', locale==='ar');
                    if (!ok) return;
                    setProducts(prev => prev.filter((p:any)=> p.id !== product.id));
                    try {
                      const raw = window.localStorage.getItem('user_products');
                      const list = raw ? JSON.parse(raw) : [];
                      const filtered = Array.isArray(list) ? list.filter((x:any)=> x.id !== product.id) : [];
                      window.localStorage.setItem('user_products', JSON.stringify(filtered));
                    } catch {}
                  }}
                  title={locale==='ar'?'حذف':'Delete'}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-medium text-sm line-clamp-2">
            {product.name[locale]}
          </h3>
          <p className="text-sm text-muted-foreground">
            {product.brand[locale]}
          </p>
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${
                  i < Math.floor(product.rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            ))}
            <span className="text-xs text-muted-foreground mr-1">
              ({product.reviewCount})
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-primary">
                {product.price} {currency}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-sm text-muted-foreground line-through">
                  {product.originalPrice} {currency}
                </span>
              )}
            </div>
            {!isVendor && (
              <Button
                size="sm"
                className="h-8"
                disabled={!product.inStock}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!product.inStock) return;
                  rest.addToCart && rest.addToCart({
                    id: product.id,
                    name: product.name[locale],
                    price: product.price,
                    image: product.image,
                    quantity: 1,
                    inStock: product.inStock,
                  });
                  toastSuccess(locale === 'en' ? 'Added to cart' : 'تمت الإضافة إلى السلة', locale==='ar');
                }}
              >
                <ShoppingCart className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ProductListItem = ({ product }: { product: any }) => (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => { if (!isVendor) handleProductClick(product); }}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="relative">
            <ImageWithFallback
              src={product.image}
              alt={product.name[locale]}
              className="w-24 h-24 object-cover rounded-lg"
            />
            {product.isNew && (
              <Badge className="absolute -top-1 -right-1 bg-green-500 text-xs">
                {t("new")}
              </Badge>
            )}
            {product.isOnSale && (
              <Badge className="absolute -top-1 -left-1 bg-red-500 text-xs">
                {t("sale")}
              </Badge>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{product.name[locale]}</h3>
                <p className="text-sm text-muted-foreground">
                  {product.brand[locale]} | {product.category[locale]}
                </p>
                <p className="text-xs text-muted-foreground">
                  رقم القطعة: {product.partNumber}
                </p>
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-primary">
                    {product.price} {currency}
                  </span>
                  {product.originalPrice > product.price && (
                    <span className="text-sm text-muted-foreground line-through">
                      {product.originalPrice} {currency}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 justify-end">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < Math.floor(product.rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground mr-1">
                    ({product.reviewCount})
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                    product.inStock
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {product.inStock ? t("inStock") : t("outOfStock")}
                </span>
                <span className="mr-2 text-muted-foreground">
                  {t("warranty")}: {product.warranty[locale]}
                </span>
              </div>
              {!isVendor && (
                <Button size="sm" disabled={!product.inStock}>
                  <ShoppingCart className="h-4 w-4 ml-1" />
                  {t("addToCart")}
                </Button>
              )}
              {isVendor && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={(e)=> { e.preventDefault(); e.stopPropagation(); setEditingProduct(product); }}>
                    <Pencil className="h-4 w-4 ml-1" /> {locale==='ar'?'تعديل':'Edit'}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={async (e)=> { e.preventDefault(); e.stopPropagation(); const ok = await confirmDialog(locale==='ar'? 'هل تريد حذف هذا المنتج؟':'Delete this product?', locale==='ar'?'حذف':'Delete', locale==='ar'?'إلغاء':'Cancel', locale==='ar'); if (!ok) return; setProducts(prev=> prev.filter((p:any)=> p.id !== product.id)); try { const raw = window.localStorage.getItem('user_products'); const list = raw ? JSON.parse(raw) : []; const filtered = Array.isArray(list) ? list.filter((x:any)=> x.id !== product.id) : []; window.localStorage.setItem('user_products', JSON.stringify(filtered)); } catch {} }}>
                    <Trash2 className="h-4 w-4 ml-1" /> {locale==='ar'?'حذف':'Delete'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header currentPage="products" setCurrentPage={setCurrentPage} {...(rest as any)} />

      <div className="container mx-auto px-4 py-6">
        {/* Search and Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Select value={selectedCategoryId} onValueChange={(v)=> { setSelectedCategoryId(v); if (v !== 'all') setSelectedGroup(''); setSearchTerm(''); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={locale === 'en' ? 'Category' : 'الفئة'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{locale === 'en' ? 'All Categories' : 'جميع الفئات'}</SelectItem>
                {categories.filter((c:any)=> !!c?.id).map((c, idx) => (
                  <SelectItem key={`cat-${String((c as any).id)}`} value={String((c as any).id)}>
                    {String((c as any).nameAr || (c as any).nameEn || '')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t("sortBy")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">{t("relevance")}</SelectItem>
                <SelectItem value="price-low">{t("priceLow")}</SelectItem>
                <SelectItem value="price-high">{t("priceHigh")}</SelectItem>
                <SelectItem value="rating">{t("highestRating")}</SelectItem>
                <SelectItem value="newest">{t("newest")}</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-l-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-r-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            {isVendor && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 ml-2" /> {locale==='ar' ? 'إضافة منتج جديد' : 'Add New Product'}
                  </Button>
                </DialogTrigger>
                <ProductForm
                  onSave={(data: any) => {
                    const newProduct = {
                      id: data?.id || `v-${Date.now()}`,
                      group: 'tools',
                      name: { ar: data?.nameAr || '', en: data?.nameEn || '' },
                      brand: { ar: 'عام', en: 'Generic' },
                      category: { ar: data?.category || 'أبواب', en: data?.category === 'نوافذ' ? 'Windows' : 'Doors' },
                      subCategory: { ar: data?.subCategory?.ar || data?.subCategoryAr || '', en: data?.subCategory?.en || data?.subCategoryEn || '' },
                      price: Number(data?.price || 0),
                      originalPrice: Number(data?.originalPrice || data?.price || 0),
                      rating: 0,
                      reviewCount: 0,
                      image: data?.image || (Array.isArray(data?.images) && data.images[0]) || '',
                      images: Array.isArray(data?.images) ? data.images : [],
                      inStock: Boolean(data?.inStock ?? (Number(data?.stock || 0) > 0)),
                      isNew: !!data?.isNew,
                      isOnSale: !!data?.isOnSale,
                      compatibility: Array.isArray(data?.compatibility) ? data.compatibility.map((c:any)=> ({ ar: c, en: c })) : [],
                      partNumber: data?.partNumber || '',
                      warranty: { ar: 'سنة', en: '1 year' },
                      description: { ar: data?.descriptionAr || '', en: data?.descriptionEn || '' },
                    } as any;
                    try {
                      const raw = window.localStorage.getItem('user_products');
                      const list = raw ? JSON.parse(raw) : [];
                      window.localStorage.setItem('user_products', JSON.stringify([newProduct, ...list]));
                    } catch {}
                    setProducts((prev) => [newProduct, ...prev]);
                    setIsAddDialogOpen(false);
                  }}
                  onCancel={() => setIsAddDialogOpen(false)}
                />
              </Dialog>
            )}
          </div>

          </div>

          {/* Vendor Edit Dialog */}
          {isVendor && (
            <Dialog open={!!editingProduct} onOpenChange={(open) => { if (!open) setEditingProduct(null); }}>
              {editingProduct && (
                <ProductForm
                  product={{
                    id: editingProduct.id,
                    nameAr: editingProduct?.name?.ar || '',
                    nameEn: editingProduct?.name?.en || '',
                    category: editingProduct?.category?.ar || 'أبواب',
                    subCategoryAr: editingProduct?.subCategory?.ar || '',
                    subCategoryEn: editingProduct?.subCategory?.en || '',
                    price: editingProduct?.price,
                    originalPrice: editingProduct?.originalPrice,
                    stock: (editingProduct as any)?.stock ?? (editingProduct?.inStock ? 10 : 0),
                    inStock: editingProduct?.inStock,
                    partNumber: editingProduct?.partNumber || '',
                    descriptionAr: editingProduct?.description?.ar || '',
                    descriptionEn: editingProduct?.description?.en || '',
                    image: editingProduct?.image || '',
                    images: (editingProduct as any)?.images || (editingProduct?.image ? [editingProduct.image] : []),
                    isNew: editingProduct?.isNew || false,
                    isOnSale: editingProduct?.isOnSale || false,
                    isActive: (editingProduct as any)?.status === 'active',
                  }}
                  onSave={(data: any) => {
                    const updated = {
                      id: data?.id || editingProduct.id,
                      group: editingProduct.group || 'tools',
                      name: { ar: data?.nameAr || '', en: data?.nameEn || '' },
                      brand: { ar: 'عام', en: 'Generic' },
                      category: { ar: data?.category || 'أبواب', en: data?.category === 'نوافذ' ? 'Windows' : 'Doors' },
                      subCategory: { ar: data?.subCategory?.ar || data?.subCategoryAr || '', en: data?.subCategory?.en || data?.subCategoryEn || '' },
                      price: Number(data?.price || 0),
                      originalPrice: Number(data?.originalPrice || data?.price || 0),
                      rating: editingProduct?.rating ?? 0,
                      reviewCount: editingProduct?.reviewCount ?? 0,
                      image: data?.image || (Array.isArray(data?.images) && data.images[0]) || '',
                      images: Array.isArray(data?.images) ? data.images : [],
                      inStock: Boolean(data?.inStock ?? (Number(data?.stock || 0) > 0)),
                      isNew: !!data?.isNew,
                      isOnSale: !!data?.isOnSale,
                      compatibility: Array.isArray(data?.compatibility) ? data.compatibility.map((c:any)=> ({ ar: c, en: c })) : [],
                      partNumber: data?.partNumber || '',
                      warranty: editingProduct?.warranty || { ar: 'سنة', en: '1 year' },
                      description: { ar: data?.descriptionAr || '', en: data?.descriptionEn || '' },
                    } as any;
                    setProducts((prev) => prev.map((p:any) => p.id === updated.id ? updated : p));
                    try {
                      const raw = window.localStorage.getItem('user_products');
                      const list = raw ? JSON.parse(raw) : [];
                      const exists = Array.isArray(list) && list.some((x:any) => x.id === updated.id);
                      const newList = exists ? list.map((x:any) => x.id === updated.id ? updated : x) : [updated, ...list];
                      window.localStorage.setItem('user_products', JSON.stringify(newList));
                    } catch {}
                    setEditingProduct(null);
                  }}
                  onCancel={() => setEditingProduct(null)}
                />
              )}
            </Dialog>
          )}

          <div className="flex gap-6">
            {/* Filters Sidebar */}
            <div
              className={`lg:block ${showFilters ? "block" : "hidden"} lg:w-52 w-full lg:relative lg:sticky lg:top-24 absolute lg:bg-transparent bg-background lg:shadow-none shadow-lg lg:z-auto z-10 lg:p-0 p-2 lg:rounded-none rounded-lg`}
            >
              <Card className="p-3 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">{t("categories")}</h3>
                    <button
                      type="button"
                      onClick={() => setOpenCategories(!openCategories)}
                      className="p-1 rounded hover:bg-muted"
                      aria-label="toggle-categories"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${openCategories ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                  {openCategories && (
                  <div className="space-y-1.5 max-h-96 overflow-y-auto">
                    <div
                      className={`cursor-pointer p-1.5 rounded-md text-sm ${selectedCategoryId === 'all' ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                      onClick={() => setSelectedCategoryId('all')}
                    >
                      {t("allCategories")}
                    </div>
                    {categories.filter((c:any)=> !!c?.id).map((c:any, idx:number) => (
                      <div
                        key={`side-cat-${String(c?.id)}`}
                        className={`cursor-pointer p-1.5 rounded-md text-sm ${String(selectedCategoryId) === String(c?.id) ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                        onClick={() => { setSelectedCategoryId(String(c?.id)); setSelectedGroup(''); setSearchTerm(''); }}
                      >
                        {String(c?.nameAr || c?.nameEn || '')}
                      </div>
                    ))}
                  </div>
                  )}
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">{t("priceRange")}</h3>
                    <button
                      type="button"
                      onClick={() => setOpenPrice(!openPrice)}
                      className="p-1 rounded hover:bg-muted"
                      aria-label="toggle-price"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${openPrice ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                  {openPrice && (
                  <div className="space-y-3">
                    <Slider
                      value={priceRange as unknown as number[]}
                      onValueChange={(v: number[]) => setPriceRange([v[0] ?? priceBounds[0], v[1] ?? priceBounds[1]] as [number, number])}
                      min={priceBounds[0]}
                      max={priceBounds[1]}
                      step={10}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm">
                      <span>{priceRange[0]} {currency}</span>
                      <span>{priceRange[1]} {currency}</span>
                    </div>
                  </div>
                  )}
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">{t("filter")}</h3>
                    <button
                      type="button"
                      onClick={() => setOpenFlags(!openFlags)}
                      className="p-1 rounded hover:bg-muted"
                      aria-label="toggle-flags"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${openFlags ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                  {openFlags && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox id="inStock" checked={inStockOnly} onCheckedChange={(checked) => setInStockOnly(checked === true)} />
                      <label htmlFor="inStock" className="text-sm cursor-pointer">{t("inStockOnly")}</label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox id="onSale" checked={onSaleOnly} onCheckedChange={(checked) => setOnSaleOnly(checked === true)} />
                      <label htmlFor="onSale" className="text-sm cursor-pointer">{t("offersOnly")}</label>
                    </div>
                  </div>
                  )}
                </div>
              </Card>
            </div>

          {/* Products Grid */}
          <div className="flex-1">
            <div
              className="flex justify-between items-center mb-4"
              dir={locale === "ar" ? "rtl" : "ltr"}
            >
              <h2 className="text-lg font-medium">
                {t("products")} ({filteredProducts.length} {t("productsCount")})
              </h2>
            </div>

            {filteredProducts.length === 0 ? (
              <Card className="p-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">{t("noProductsFound")}</h3>
                <p className="text-muted-foreground">
                  {t("tryAdjustingFilters")}
                </p>
              </Card>
            ) : (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    : "space-y-4"
                }
              >
                {filteredProducts.map((product, idx) =>
                  viewMode === "grid" ? (
                    <ProductCard key={product.id || `prod-${idx}`} product={product} />
                  ) : (
                    <ProductListItem key={product.id || `prod-${idx}`} product={product} />
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}
