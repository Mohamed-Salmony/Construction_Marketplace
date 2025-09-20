  // Parse a composite contract key into readable fields
  const parseContractKey = (idStr: string): Partial<FavoriteItem> => {
    try {
      if (!/^contract:/.test(idStr)) return {};
      const parts = idStr.split('|');
      const name = decodeURIComponent(parts[1] || '').trim();
      const price = Number(parts[2] || 0);
      return {
        name: name || idStr,
        price: Number.isFinite(price) ? price : 0,
      } as Partial<FavoriteItem>;
    } catch { return {}; }
  };
import { useEffect, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useTranslation } from '../hooks/useTranslation';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import type { RouteContext } from '../components/Router';
import { FavoriteItem, getFavorites, removeFavorite, addFavorite } from '../lib/favorites';

export default function Favorites(props: Partial<RouteContext>) {
  const { t, locale } = useTranslation();
  const [items, setItems] = useState<FavoriteItem[]>([]);

  // Normalize any incoming id to a safe string; return '' if invalid
  const normalizeId = (val: any): string => {
    try {
      const raw = String(val ?? '').trim();
      if (!raw || raw === 'undefined' || raw === 'null') return '';
      // Prefer 24-hex ObjectId or numeric prefix if present
      const oid = raw.match(/^[a-fA-F0-9]{24}(?=\b|\|)/)?.[0];
      if (oid) return oid;
      const num = raw.match(/^\d+(?=\b|\|)/)?.[0];
      if (num) return num;
      return raw;
    } catch { return ''; }
  };

  const refresh = () => {
    const list = getFavorites().map((p) => {
      if (typeof p.id === 'string' && p.id.startsWith('contract:')) {
        const parsed = parseContractKey(p.id);
        return { ...p, ...parsed } as FavoriteItem;
      }
      return p;
    });
    setItems(list);
  };

  useEffect(() => {
    // If logged-in, reflect server-backed wishlist from Router context
    const isLoggedIn = !!props.user;
    if (isLoggedIn) {
      const list = (props.wishlistItems || [])
        .map((w: any) => {
          const pid = normalizeId((w as any)?.productId ?? (w as any)?.id);
          if (!pid) return null;
          const base: FavoriteItem = {
            id: pid,
            name: String((w as any)?.name ?? ''),
            price: Number((w as any)?.price ?? 0),
            image: (w as any)?.image,
            brand: (w as any)?.brand,
          } as FavoriteItem;
          if (pid.startsWith('contract:')) {
            return { ...base, ...parseContractKey(pid) } as FavoriteItem;
          }
          return base;
        })
        .filter(Boolean) as FavoriteItem[];
      setItems(list);
      return;
    }
    // Guest mode: use localStorage
    refresh();
    const onStorage = (e: StorageEvent) => { if (e.key === 'favorites_v1') refresh(); };
    const onCustom = () => refresh();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage);
      window.addEventListener('favorites_updated', onCustom as any);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('favorites_updated', onCustom as any);
      }
    };
  }, [props.user, props.wishlistItems]);

  // One-time migration: if guest and favorites are empty but context wishlist has items, migrate them to localStorage
  useEffect(() => {
    const isGuest = !props.user;
    const current = getFavorites();
    if (!isGuest) return;
    if (current.length > 0) return;
    const ctx = (props as any)?.wishlistItems as any[] | undefined;
    if (Array.isArray(ctx) && ctx.length > 0) {
      try {
        ctx.forEach((w: any) => {
          addFavorite({
            id: String(w.id),
            name: w.name,
            price: w.price,
            brand: w.brand,
            image: w.image,
          });
        });
        try { window.dispatchEvent(new Event('favorites_updated')); } catch {}
      } finally {
        setTimeout(refresh, 0);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getText = (val: any): string => {
    if (val && typeof val === 'object') return val[locale] ?? val.ar ?? val.en ?? '';
    return String(val ?? '');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header currentPage="favorites" setCurrentPage={props.setCurrentPage} cartItems={props.cartItems} user={props.user} setUser={props.setUser} />

      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">{locale==='ar' ? 'المفضلة' : 'Favorites'}</h1>
          {items.length > 0 && (
            <Badge className="text-sm">{items.length}</Badge>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            {locale==='ar' ? 'لا توجد منتجات في المفضلة حتى الآن.' : 'No favorite products yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <ImageWithFallback src={p.image || ''} alt={getText(p.name)} className="w-24 h-24 object-cover rounded-md" />
                    <div className="flex-1">
                      <h3 className="font-medium line-clamp-2">{getText(p.name)}</h3>
                      {p.brand || p.category ? (
                        <p className="text-sm text-muted-foreground">
                          {[getText(p.brand), getText(p.category)].filter(Boolean).join(' | ')}
                        </p>
                      ) : null}
                      {typeof p.price === 'number' && (
                        <div className="mt-1 text-primary font-semibold">
                          {locale==='ar' ? `${p.price} ر.س` : `SAR ${p.price}`}
                        </div>
                      )}
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="secondary" onClick={async () => {
              if (props.user) {
                // Logged-in: remove via server and then refresh from context
                const pid = normalizeId(p.id);
                if (pid) await (props.removeFromWishlist as any)?.(pid);
                // Context effect above will update items
              } else {
                if (p?.id) removeFavorite(p.id);
                try { window.dispatchEvent(new Event('favorites_updated')); } catch {}
                refresh();
              }
            }}>
                          {locale==='ar' ? 'إزالة' : 'Remove'}
                        </Button>
                        <Button size="sm" onClick={() => {
                          if (props.setSelectedProduct && props.setCurrentPage) {
                            props.setSelectedProduct(p as any);
                            props.setCurrentPage('product-details');
                          }
                        }}>
                          {locale==='ar' ? 'عرض التفاصيل' : 'View details'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Footer setCurrentPage={props.setCurrentPage as any} />
    </div>
  );
}
