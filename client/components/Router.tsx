"use client";

import { useState, useEffect, useRef } from "react";
import { routes } from "./routes";
import { getCart as apiGetCart, addItem as apiAddItem, updateItemQuantity as apiUpdateItemQuantity, removeItem as apiRemoveItem, clearCart as apiClearCart } from "@/services/cart";
import Homepage from "../pages/Homepage";
import { useTranslation } from "../hooks/useTranslation";
import { getProfile } from "@/services/auth";
import { toastInfo, toastError } from "../utils/alerts";
import { getWishlist as apiGetWishlist, addToWishlist as apiAddToWishlist, removeFromWishlist as apiRemoveFromWishlist, toggleWishlist as apiToggleWishlist } from "@/services/wishlist";
import { getProductById, cleanLocalStorageFromNonExistentProducts } from "@/services/products";
import LoadingOverlay from "./LoadingOverlay";
import AdminNavigationGuard, { AdminGuardStatus } from "./AdminNavigationGuard";

export type UserRole = "customer" | "vendor" | "worker" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  isVerified?: boolean;
}

// Shared cart item type for front-only testing
export type CartItem = {
  id: string;
  name: string;
  price: number;
  brand?: string;
  originalPrice?: number;
  image?: string;
  partNumber?: string;
  quantity: number;
  inStock?: boolean;
  maxQuantity?: number;
};

// Wishlist item type for front-only testing
export type WishlistItem = {
  id: string;
  name: string;
  price: number;
  brand?: string;
  originalPrice?: number;
  image?: string;
  partNumber?: string;
  inStock?: boolean;
};

export interface RouteContext {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  // Simple back navigation support
  prevPage: string | null;
  goBack: () => void;
  selectedProduct?: any;
  setSelectedProduct: (product: any) => void;
  searchFilters: SearchFilters | null;
  setSearchFilters: (filters: SearchFilters | null) => void;
  returnTo: string | null;
  setReturnTo: (page: string | null) => void;
  // Cart state/actions
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  updateCartQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  // Wishlist state/actions
  wishlistItems: WishlistItem[];
  addToWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (id: string) => void;
  isInWishlist: (id: string) => boolean;
  // Global loading overlay
  showLoading: (message?: string, subMessage?: string) => void;
  hideLoading: () => void;
}

export interface SearchFilters {
  term: string;
  carType?: string;
  model?: string;
  partCategory?: string; // engine | tires | electrical | tools
  categoryId?: string; // backend category filter (Mongo ObjectId)
}

export default function Router() {
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        return url.searchParams.get("page") || "home";
      } catch {
        return "home";
      }
    }
    return "home";
  });
  const [user, setUser] = useState<User | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [searchFilters, setSearchFilters] = useState<SearchFilters | null>(
    null
  );
  const [prevPage, setPrevPage] = useState<string | null>(null);
  // Keep an internal navigation history stack of visited pages
  const [history, setHistory] = useState<string[]>([]);
  const [returnTo, setReturnTo] = useState<string | null>(null);
  // Auth check states
  const [sessionChecked, setSessionChecked] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [verificationRecheckedAt, setVerificationRecheckedAt] = useState<number>(0);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  // Detect if there is any auth token present (localStorage/sessionStorage/cookies)
  const hasAuthToken = () => {
    try {
      if (typeof window === 'undefined') return false;
      const keys = ['auth_token', 'token', 'access_token', 'jwt', 'userToken', 'Authorization'];
      for (const k of keys) {
        const v = window.localStorage?.getItem(k) || window.sessionStorage?.getItem(k);
        if (v && String(v).length > 0) return true;
      }
      const cookies = document.cookie.split('; ');
      for (const k of keys) {
        if (cookies.find((r) => r.startsWith(`${k}=`))) return true;
      }
      return false;
    } catch { return false; }
  };
  // Helper: normalize base product id from any value or composite id. Returns '' if invalid.
  const normalizeBaseId = (val: any): string => {
    try {
      const raw = String(val ?? '').trim();
      const base = raw.split('|')[0];
      if (!base || base === 'undefined' || base === 'null') return '';
      return base;
    } catch { return ''; }
  };
  // Helper: reconcile server cart items back to client composite IDs without duplicating keys
  const pickNonEmpty = (...vals: Array<any>) => {
    for (const v of vals) {
      if (v === null || v === undefined) continue;
      const s = typeof v === 'string' ? v.trim() : v;
      if (typeof s === 'string') {
        if (s.length) return s;
      } else if (s) {
        return s;
      }
    }
    return vals[0];
  };
  const reconcileCartFromServer = (serverItems: any[], prev: CartItem[], fallback: CartItem | null = null): CartItem[] => {
    // Build a queue per base id from previous items so each server item gets a unique composite id
    const queues = new Map<string, CartItem[]>();
    for (const p of prev) {
      const b = normalizeBaseId(p.id);
      if (!b) continue;
      const arr = queues.get(b) || [];
      arr.push(p);
      queues.set(b, arr);
    }
    const result: CartItem[] = [];
    for (const it of serverItems) {
      // Prefer productId from server, fallback to id if present
      const rawId = (it as any)?.productId ?? (it as any)?.id;
      const base = normalizeBaseId(rawId);
      const q = base ? queues.get(base) : undefined;
      const prevItem = q && q.length ? q.shift()! : (fallback || null);
      const compositeId = prevItem ? String(prevItem.id) : base || String((it as any)?.id || '');
      result.push({
        id: compositeId,
        name: pickNonEmpty((it as any)?.name, prevItem?.name, fallback?.name),
        price: Number(pickNonEmpty((it as any)?.price, prevItem?.price, fallback?.price, 0)),
        brand: pickNonEmpty((it as any)?.brand, prevItem?.brand, fallback?.brand),
        image: pickNonEmpty((it as any)?.image, prevItem?.image, fallback?.image),
        quantity: Number(pickNonEmpty((it as any)?.quantity, prevItem?.quantity, fallback?.quantity, 1)),
      } as CartItem);
    }
    return result;
  };
  
  // Initialize wishlist state
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  // Cache of product IDs that returned 404 to avoid repeated fetches
  const notFoundProductsRef = useRef<Set<string>>(new Set());
  // Global loading overlay state
  const [loadingOpen, setLoadingOpen] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState<string | undefined>(undefined);
  const [loadingSub, setLoadingSub] = useState<string | undefined>(undefined);
  const showLoading = (message?: string, subMessage?: string) => { setLoadingMsg(message); setLoadingSub(subMessage); setLoadingOpen(true); };
  const hideLoading = () => { setLoadingOpen(false); setLoadingMsg(undefined); setLoadingSub(undefined); };

  const addToCart = (item: CartItem & { [key: string]: any }) => {
    // Build a composite client-side ID so different variants (e.g., installation) or rentals don't merge
    const baseId = String(item.id);
    const hasInstall = !!(item as any)?.addonInstallation?.enabled;
    const rentalId = (item as any)?.rental?.id ? String((item as any).rental.id) : '';
    // Variant signature to differentiate items that (incorrectly) share same backend id but differ by name/price/partNumber
    const varSigName = String((item as any)?.name || '');
    const varSigPart = String((item as any)?.partNumber || '');
    const varSigPrice = String((item as any)?.price ?? '');
    const varSigImg = String((item as any)?.image || '');
    const varSigBrand = String((item as any)?.brand || '');
    const variantSig = `${varSigName}|${varSigPart}|${varSigPrice}|${varSigBrand}|${varSigImg}`;
    const normalizedId = `${baseId}${hasInstall ? '|inst' : ''}${rentalId ? `|r:${rentalId}` : ''}|v:${variantSig}`;
    const normalized: CartItem & { [key: string]: any } = { ...item, id: normalizedId };
    // Optimistic update with normalized comparison
    setCartItems((prev) => {
      const idx = prev.findIndex((p) => String(p.id) === normalizedId);
      if (idx !== -1) {
        const copy = [...prev];
        const maxQ = normalized.maxQuantity ?? copy[idx].maxQuantity ?? 99;
        copy[idx] = { ...copy[idx], quantity: Math.min(maxQ, (copy[idx].quantity || 0) + (normalized.quantity || 0)) };
        return copy;
      }
      return [...prev, normalized];
    });
    // Sync with backend (guest or logged-in)
    (async () => {
      try {
        // Extract base product ID to send to API (before any composite suffix)
        const baseForApiStr = normalizeBaseId(normalizedId);
        if (!baseForApiStr) return; // avoid hitting /undefined
        const idForApi: any = isNaN(Number(baseForApiStr)) ? baseForApiStr : Number(baseForApiStr);
        const r = await apiAddItem({ id: idForApi, quantity: normalized.quantity, price: normalized.price });
        const itemsResp = r && r.data && Array.isArray((r.data as any).items) ? (r.data as any).items : null;
        if (itemsResp) {
          setCartItems((prev)=> reconcileCartFromServer(itemsResp, prev, normalized));
        }
      } catch {}
    })();
  };

  const updateCartQty = (id: string, qty: number) => {
    const normId = String(id);
    setCartItems((prev) => prev.map((p) => (String(p.id) === normId ? { ...p, quantity: Math.max(1, qty) } : p)));
    (async () => {
      try {
        const baseForApiStr = normalizeBaseId(normId);
        if (!baseForApiStr) return;
        const idForApi: any = isNaN(Number(baseForApiStr)) ? baseForApiStr : Number(baseForApiStr);
        const r = await apiUpdateItemQuantity(idForApi, Math.max(1, qty));
        const itemsResp = r && r.data && Array.isArray((r.data as any).items) ? (r.data as any).items : null;
        if (itemsResp) {
          setCartItems((prev)=> reconcileCartFromServer(itemsResp, prev));
        }
      } catch {}
    })();
  };

  const removeFromCart = (id: string) => {
    const normId = String(id);
    setCartItems((prev) => prev.filter((p) => String(p.id) !== normId));
    (async () => {
      try {
        const baseForApiStr = normalizeBaseId(normId);
        if (!baseForApiStr) return;
        const idForApi: any = isNaN(Number(baseForApiStr)) ? baseForApiStr : Number(baseForApiStr);
        const r = await apiRemoveItem(idForApi);
        const itemsResp = r && r.data && Array.isArray((r.data as any).items) ? (r.data as any).items : null;
        if (itemsResp) {
          setCartItems((prev)=> reconcileCartFromServer(itemsResp, prev));
        }
      } catch {}
    })();
  };

  const clearCart = () => {
    setCartItems([]);
    (async () => { try { await apiClearCart(); } catch {} })();
  };

  // Load cart from backend only when authenticated (avoid 401 noise for guests)
  useEffect(() => {
    (async () => {
      try {
        if (!user) return; // guest: keep empty cart client-side
        const r = await apiGetCart();
        if (r.ok && r.data && Array.isArray(r.data.items)) {
          const baseItems = r.data.items
            .map((it:any) => ({
            // Use productId returned by server; fallback to id for compatibility
            id: normalizeBaseId(it.productId ?? it.id) || String((it.productId ?? it.id) || ''),
            name: it.name,
            price: Number(it.price||0),
            brand: it.brand,
            image: it.image,
            quantity: Number(it.quantity||1)
          }))
          .filter((ci:any)=> !!ci.id && ci.id !== 'undefined' && ci.id !== 'null') as CartItem[];
          // Enrich items missing image/name from product service
          const enriched = await Promise.all(baseItems.map(async (ci) => {
            if (ci.image && ci.name) return ci;
            try {
              const pid = normalizeProductIdForApi(ci.id);
              if (pid === null) return ci;
              const pidStr = String(pid);
              if (notFoundProductsRef.current.has(pidStr)) return null; // Return null for not found products
              // Only fetch if it's a valid Mongo ObjectId (24 hex) or strictly numeric id
              const isValidOid = /^[a-fA-F0-9]{24}$/.test(pidStr);
              const isNumeric = /^\d+$/.test(pidStr);
              if (!isValidOid && !isNumeric) return ci;
              const p = await getProductById(pid as any);
              if (!p.ok && p.status === 404) {
                notFoundProductsRef.current.add(pidStr);
                // Silently remove not found products from cart
                return null; // Return null to filter out this item
              }
              if (p.ok && p.data) {
                const imgs = Array.isArray((p.data as any).images) ? (p.data as any).images : [];
                const image = imgs.find((im:any)=> im?.isPrimary)?.imageUrl || imgs[0]?.imageUrl || (p as any).data?.imageUrl;
                const name = (p as any).data?.nameAr || (p.data as any).nameEn || ci.name;
                const price = Number((p.data as any)?.price ?? ci.price ?? 0);
                return { ...ci, image: ci.image || image, name: ci.name || name, price } as CartItem;
              }
            } catch (error) {
              console.error('Error enriching cart item:', error);
            }
            return ci;
          }));
          
          // Filter out null items (not found products)
          const validItems = enriched.filter(item => item !== null) as CartItem[];
          // Generate composite IDs to avoid merging when backend returns same base id for different lines
          const withCompositeIds = (() => {
            const counts = new Map<string, number>();
            return validItems.map((it) => {
              const base = normalizeBaseId(it.id);
              const varSig = `${String((it as any).name || '')}|${String((it as any).partNumber || '')}|${String((it as any).price ?? '')}`;
              const compositeBase = `${base}|v:${varSig}`;
              const n = (counts.get(compositeBase) || 0) + 1;
              counts.set(compositeBase, n);
              const uniqueId = `${compositeBase}|n:${n}`;
              return { ...it, id: uniqueId } as CartItem;
            });
          })();
          setCartItems(withCompositeIds);
          
          // Update localStorage with cleaned cart (remove not found products)
          try {
            localStorage.setItem('cart', JSON.stringify(withCompositeIds.map(item => ({
              id: normalizeBaseId(item.id),
              name: item.name,
              price: item.price,
              image: item.image,
              quantity: item.quantity
            }))));
          } catch (error) {
            console.error('Failed to update localStorage cart:', error);
          }
        }
      } catch {}
    })();
  }, [user?.id]);

  // Wishlist: server-backed (requires auth) with enrichment (image/name/price)
  useEffect(() => {
    (async () => {
      if (!user) { setWishlistItems([]); return; }
      try {
        const r = await apiGetWishlist();
        if (r.ok && Array.isArray(r.data)) {
          const raw = r.data as any[];
          const enriched = await Promise.all(raw.map(async (w) => {
            const rawPid = (w as any).productId ?? (w as any).id;
            const pidNorm = normalizeProductIdForApi(rawPid);
            let image: string | undefined;
            let price: number | undefined;
            let name: string | undefined = (w as any).productName || (w as any).name;
            try {
              if (pidNorm !== null) {
                const pidStr = String(pidNorm);
                const isValidOid = /^[a-fA-F0-9]{24}$/.test(pidStr);
                const isNumeric = /^\d+$/.test(pidStr);
                if (isValidOid || isNumeric) {
                  if (!notFoundProductsRef.current.has(pidStr)) {
                    const p = await getProductById(pidNorm as any);
                    if (!p.ok && p.status === 404) {
                      notFoundProductsRef.current.add(pidStr);
                      // Silently remove not found products from wishlist
                      return null; // Return null to filter out this item
                    }
                    if (p.ok && p.data) {
                      const imgs = Array.isArray((p.data as any).images) ? (p.data as any).images : [];
                      image = imgs.find((im:any)=> im?.isPrimary)?.imageUrl || imgs[0]?.imageUrl || (p as any).data?.imageUrl;
                      price = Number((p.data as any).price ?? 0);
                      if (!name) name = (p.data as any)?.nameAr || (p.data as any)?.nameEn || undefined;
                    }
                  } else {
                    // If we know this product doesn't exist, filter it out
                    return null;
                  }
                }
              }
            } catch {}
            const idStr = String(pidNorm ?? rawPid ?? '');
            // Friendly fallback name for composite contract keys like 'contract:...|name|price|...'
            if (!name && /^contract:/.test(idStr)) {
              const parts = idStr.split('|');
              name = decodeURIComponent(parts[1] || parts[0].replace('contract:', 'contract'));
            }
            return {
              id: idStr,
              name: name || idStr,
              price: price ?? 0,
              image,
              inStock: true,
              brand: undefined,
              originalPrice: undefined,
              partNumber: undefined,
            } as WishlistItem;
          }));
          
          // Filter out null items (not found products)
          const validWishlistItems = enriched.filter(item => item !== null) as WishlistItem[];
          setWishlistItems(validWishlistItems);
        } else setWishlistItems([]);
      } catch { setWishlistItems([]); }
    })();
  }, [user?.id]);

  const normalizeProductIdForApi = (val: any): string | number | null => {
    try {
      const raw = String(val ?? '').trim();
      if (!raw || raw === 'undefined' || raw === 'null') return null;
      // Full Mongo ObjectId (24 hex)
      if (/^[a-fA-F0-9]{24}$/.test(raw)) return raw;
      // If composite like "<oid>|..." pick the 24-hex at the start
      const oidPrefix = raw.match(/^[a-fA-F0-9]{24}(?=\b|\|)/);
      if (oidPrefix && oidPrefix[0]) return oidPrefix[0];
      // Strictly numeric
      if (/^\d+$/.test(raw)) return Number(raw);
      // If composite like "123|..." pick numeric prefix
      const numPrefix = raw.match(/^\d+(?=\b|\|)/);
      if (numPrefix && numPrefix[0]) return Number(numPrefix[0]);
      return raw; // last resort, send as-is
    } catch { return null; }
  };

  const addToWishlist = async (item: WishlistItem) => {
    if (!user) {
      setReturnTo(currentPage);
      setCurrentPage('login');
      return;
    }
    try {
      const pid = normalizeProductIdForApi((item as any)?.productId ?? item.id);
      if (pid === null || Number.isNaN(pid)) {
        toastInfo(locale==='ar' ? 'معرّف منتج غير صالح للمفضلة' : 'Invalid product id for wishlist', locale==='ar');
        return;
      }
      // Use server toggle to ensure single source of truth
      const idStr = String(pid);
      // Optimistic: add if not exists
      let rollback: (()=>void)|null = null;
      setWishlistItems((prev) => {
        const exists = prev.some((w:any) => String(normalizeProductIdForApi((w as any).id)) === idStr);
        if (!exists) {
          const optimistic: WishlistItem = {
            id: idStr,
            name: String((item as any)?.name || idStr),
            price: Number((item as any)?.price ?? 0),
            image: (item as any)?.image,
            inStock: true,
            brand: (item as any)?.brand,
            originalPrice: (item as any)?.originalPrice,
            partNumber: (item as any)?.partNumber,
          } as any;
          rollback = () => setWishlistItems((p)=> p.filter((w:any)=> String(normalizeProductIdForApi((w as any).id)) !== idStr));
          return [...prev, optimistic];
        }
        return prev;
      });
      const toggled = await apiToggleWishlist(pid as any);
      if (toggled.ok && (toggled.data as any)?.success) {
        const inWishlist = !!(toggled.data as any).inWishlist;
        if (!inWishlist) {
          // Server says it is removed; reflect locally
          setWishlistItems((prev)=> prev.filter((w:any)=> String(normalizeProductIdForApi((w as any).id)) !== idStr));
        } else {
          // Optionally refresh details
        }
      } else {
        if (typeof rollback === 'function') (rollback as () => void)();
      }
    } catch {
      toastError(locale==='ar' ? 'تعذر إضافة المنتج إلى المفضلة' : 'Failed to add to wishlist', locale==='ar');
    }
  };

  const removeFromWishlist = async (id: string) => {
    if (!user) return;
    try {
      const pid = normalizeProductIdForApi(id);
      if (pid === null || Number.isNaN(pid as any)) return;
      // Optimistic: remove now
      const idStr = String(pid);
      let rollback: (()=>void)|null = null;
      setWishlistItems((prev) => {
        const before = prev;
        rollback = () => setWishlistItems(before);
        return prev.filter((w:any) => String(normalizeProductIdForApi((w as any).id)) !== idStr);
      });
      const toggled = await apiToggleWishlist(pid as any);
      if (toggled.ok && (toggled.data as any)?.success) {
        const inWishlist = !!(toggled.data as any).inWishlist;
        if (inWishlist) {
          // Server says it is now added; restore
          if (typeof rollback === 'function') (rollback as () => void)();
        }
      } else {
        if (typeof rollback === 'function') (rollback as () => void)();
      }
    } catch {}
  };

  const isInWishlist = (id: string) => {
    const norm = normalizeProductIdForApi(id);
    if (norm === null) return false;
    return wishlistItems.some((item: any) => {
      const pid = normalizeProductIdForApi((item as any)?.productId ?? (item as any)?.id);
      return pid !== null && String(pid) === String(norm);
    });
  };

  // Navigation wrapper: push current page to history, update prevPage, then navigate
  const navigate = (page: string) => {
    // Pre-navigation guard: block unverified vendors from vendor routes
    try {
      const targetRoute = routes[page as keyof typeof routes];
      const wantsVendor = !!(targetRoute && targetRoute.allowedRoles && targetRoute.allowedRoles.includes('vendor'));
      if (wantsVendor && user && user.role === 'vendor' && user.isVerified === false) {
        const isAr = typeof window !== 'undefined' && (document?.documentElement?.dir === 'rtl');
        toastInfo(isAr ? 'انتظر موافقة الادمن' : 'Please wait for admin approval', isAr);
        return; // Do NOT navigate
      }
    } catch {}
    setHistory((h) => [...h, currentPage]);
    setPrevPage(currentPage);
    setCurrentPage(page);
  };

  const context: RouteContext = {
    currentPage,
    setCurrentPage: navigate,
    user,
    setUser,
    prevPage,
    goBack: () => {
      setHistory((h) => {
        if (h.length > 0) {
          const newHistory = h.slice(0, -1);
          const target = h[h.length - 1];
          setCurrentPage(target);
          const newPrev = newHistory.length > 0 ? newHistory[newHistory.length - 1] : null;
          setPrevPage(newPrev);
          return newHistory;
        }
        // No history; fallback to prevPage if available, else stay on current page
        if (prevPage) {
          setCurrentPage(prevPage);
          setPrevPage(null);
        }
        return h;
      });
    },
    selectedProduct,
    setSelectedProduct,
    searchFilters,
    setSearchFilters,
    returnTo,
    setReturnTo,
    cartItems,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    wishlistItems,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    showLoading,
    hideLoading,
  };

  const currentRoute = routes[currentPage as keyof typeof routes];
  const CurrentPageComponent = currentRoute?.component || Homepage;

  const { locale } = useTranslation();
  const dir = locale === "ar" ? "rtl" : "ltr";

  // Clean localStorage from non-existent products on app start
  useEffect(() => {
    cleanLocalStorageFromNonExistentProducts();
  }, []);

  // Scroll to top on page change (ensure start at top, not footer)
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        if ("scrollRestoration" in window.history) {
          window.history.scrollRestoration = "manual" as any;
        }
      } catch {}

      // Scroll instantly to top now and on next tick to avoid layout race
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }, 0);
    }
  }, [currentPage]);

  // No prevPage persistence in localStorage; keep in-memory only

  // Mark as mounted to avoid SSR/CSR mismatch on URL-dependent initial state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Mark session check complete immediately; rely on JWT + getProfile below
  useEffect(() => {
    setSessionChecked(true);
  }, []);

  // Try to fetch profile only if we have some token; otherwise treat as guest to avoid 401 spam
  useEffect(() => {
    (async () => {
      if (!sessionChecked) return;
      // If there is no token at all, skip network call and mark as guest
      if (!hasAuthToken()) {
        setUser(null);
        setAuthChecked(true);
        return;
      }
      try {
        const r = await getProfile();
        if (r.ok && r.data) {
          const roleMap: Record<string, UserRole> = { Admin: 'admin', Merchant: 'vendor', Technician: 'worker', Customer: 'customer', Worker: 'worker' };
          const arr = ((r.data as any).roles || []) as string[];
          const firstRole = Array.isArray(arr) && arr.length > 0 ? arr[0] : (r.data as any).role;
          const first = (r.data as any).firstName || '';
          const mid = (r.data as any).middleName || '';
          const last = (r.data as any).lastName || '';
          const name = (r.data as any).name || `${first}${mid? ' ' + mid : ''}${(first||mid)&&last?' ':''}${last}`.trim();
          const mapped: User = {
            id: String((r.data as any).id || ''),
            name: String(name || ''),
            email: String((r.data as any).email || ''),
            role: roleMap[String(firstRole || '')] || 'customer',
            phone: (r.data as any).phoneNumber || (r.data as any).phone,
            firstName: first || undefined,
            middleName: mid || undefined,
            lastName: last || undefined,
            isVerified: Boolean((r.data as any).isVerified),
          };
          setUser(mapped);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, [sessionChecked]);

  // Do not persist session in localStorage; rely on JWT token storage in auth.ts only

  // Keep current page in URL (?page=...) so it persists across locale switches
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        if (currentPage) {
          url.searchParams.set("page", currentPage);
        } else {
          url.searchParams.delete("page");
        }
        // Clean up page-specific params so they don't leak into other pages
        const needsServiceId = currentPage === 'technician-service-details';
        const needsProjectId = currentPage === 'technician-project-details';
        const needsProductId = currentPage === 'product-details';
        const needsProjectDetailsId = currentPage === 'project-details';
        if (!needsServiceId) url.searchParams.delete('serviceId');
        if (!needsProjectId) url.searchParams.delete('projectId');
        // For product details, persist id or slug for shareable deep links
        if (needsProductId) {
          const pid = (selectedProduct as any)?.id ? String((selectedProduct as any).id) : '';
          const pslug = (selectedProduct as any)?.slug ? String((selectedProduct as any).slug) : '';
          if (pid) {
            url.searchParams.set('id', pid);
            url.searchParams.delete('slug');
          } else if (pslug) {
            url.searchParams.set('slug', pslug);
            url.searchParams.delete('id');
          }
        } else if (needsProjectDetailsId) {
          // Persist selected project id so deep link/refresh works
          let pid = '';
          try { pid = window.localStorage.getItem('selected_project_id') || ''; } catch {}
          if (pid) url.searchParams.set('id', pid); else url.searchParams.delete('id');
          url.searchParams.delete('slug');
        } else {
          url.searchParams.delete('id');
          url.searchParams.delete('slug');
        }
        window.history.replaceState({}, "", url.toString());
      } catch {
        // no-op
      }
    }
  }, [currentPage]);

  // Auth/role guard: enforce access to protected routes
  useEffect(() => {
    // Avoid running guard until we've checked for a persisted session
    if (!sessionChecked) return;
    // Also wait until we attempted profile fetch (cookie-based)
    if (!authChecked) return;
    // Special-case redirect: technicians should see services instead of public projects
    if (user && user.role === 'worker' && currentPage === 'projects') {
      setCurrentPage('technician-services');
      return;
    }
    const route = routes[currentPage as keyof typeof routes];
    if (!route) return;
    const needsAuth = !!route.requiresAuth;
    const allowed = (route.allowedRoles as any) as (UserRole[] | undefined);

    // If route needs auth and after auth check we still have no user -> redirect to login
    if (needsAuth && !user) {
      // Save intended page and redirect to login
      setReturnTo(currentPage);
      setCurrentPage("login");
      return;
    }
    if (needsAuth && user && allowed && allowed.length > 0) {
      if (!allowed.includes(user.role)) {
        // Not allowed; send to home
        setCurrentPage("home");
        return;
      }
      // If vendor/worker routes but account is not verified, block and inform
      const protectedVendor = allowed.includes('vendor' as any) && user.role === 'vendor';
      const protectedWorker = allowed.includes('worker' as any) && user.role === 'worker';
      if ((protectedVendor || protectedWorker) && user.isVerified === false) {
        // Before blocking, re-check profile once to pick up latest approval state
        const now = Date.now();
        const recentlyChecked = now - verificationRecheckedAt < 1500; // 1.5s throttle
        if (!recentlyChecked) {
          (async () => {
            try {
              const r = await getProfile();
              if (r.ok && r.data) {
                const roleMap: Record<string, UserRole> = { Admin: 'admin', Merchant: 'vendor', Technician: 'worker', Customer: 'customer', Worker: 'worker' };
                const arr = ((r.data as any).roles || []) as string[];
                const firstRole = Array.isArray(arr) && arr.length > 0 ? arr[0] : (r.data as any).role;
                const first = (r.data as any).firstName || '';
                const mid = (r.data as any).middleName || '';
                const last = (r.data as any).lastName || '';
                const name = (r.data as any).name || `${first}${mid? ' ' + mid : ''}${(first||mid)&&last?' ':''}${last}`.trim();
                const refreshed: User = {
                  id: String((r.data as any).id || ''),
                  name: String(name || ''),
                  email: String((r.data as any).email || ''),
                  role: roleMap[String(firstRole || '')] || 'customer',
                  phone: (r.data as any).phoneNumber || (r.data as any).phone,
                  firstName: first || undefined,
                  middleName: mid || undefined,
                  lastName: last || undefined,
                  isVerified: Boolean((r.data as any).isVerified),
                };
                setUser(refreshed);
              }
            } catch {}
            setVerificationRecheckedAt(Date.now());
          })();
        } else {
          const isAr = typeof window !== 'undefined' && (document?.documentElement?.dir === 'rtl');
          toastInfo(
            isAr
              ? 'انتظر موافقة الادمن'
              : 'Please wait for admin approval',
            isAr
          );
          setCurrentPage('home');
        }
      }
    }
  }, [currentPage, user, sessionChecked]);

  // Listen for SPA navigation events dispatched by components that may not have setCurrentPage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => {
      try {
        const ce = e as CustomEvent<{ page?: string }>;
        const page = ce?.detail?.page;
        if (page && typeof page === 'string') {
          navigate(page);
        }
      } catch {}
    };
    window.addEventListener('spa_navigate' as any, handler as any);
    return () => {
      window.removeEventListener('spa_navigate' as any, handler as any);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background" dir={dir} suppressHydrationWarning>
      <AdminNavigationGuard
        user={user}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      >
        <CurrentPageComponent {...context} />
        <LoadingOverlay open={loadingOpen} message={loadingMsg} subMessage={loadingSub} />
        <AdminGuardStatus user={user} currentPage={currentPage} />
      </AdminNavigationGuard>
    </div>
  );
}

export { routes };
