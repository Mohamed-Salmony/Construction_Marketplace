import { RouteContext } from "../components/Router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Package } from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useEffect, useState, useRef } from "react";
import { getProducts, type ProductDto } from "@/services/products";

export default function Offers({ setCurrentPage, ...context }: Partial<RouteContext>) {
  const { t, locale } = useTranslation();
  const currency = locale === 'ar' ? 'ر.س' : 'SAR';
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const firstLoadRef = useRef(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        if (firstLoadRef.current && typeof (context as any)?.showLoading === 'function') {
          (context as any).showLoading(
            locale==='ar' ? 'جاري تحميل العروض' : 'Loading offers',
            locale==='ar' ? 'يرجى الانتظار' : 'Please wait'
          );
        }
        const r = await getProducts({ page: 1, pageSize: 500, sortBy: 'CreatedAt', sortDirection: 'desc' as any });
        if (!cancelled) {
          const items = ((r.data as any)?.items ?? (r.data as any)?.Items ?? []) as ProductDto[];
          const discounted = items.filter(p => typeof p.discountPrice === 'number' && p.discountPrice! > 0 && p.discountPrice! < p.price && p.isApproved);
          setProducts(discounted);
        }
      } catch {
        if (!cancelled) setError(locale==='ar' ? 'فشل تحميل العروض' : 'Failed to load offers');
      } finally {
        if (!cancelled) setLoading(false);
        if (firstLoadRef.current && typeof (context as any)?.hideLoading === 'function') {
          (context as any).hideLoading();
          firstLoadRef.current = false;
        }
      }
    })();
    return () => { cancelled = true; };
  }, [locale]);

  return (
    <div className="min-h-screen bg-background" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <Header {...context} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{locale==='ar' ? 'العروض' : 'Offers'}</h1>
          <p className="text-muted-foreground">{locale==='ar' ? 'عقود تأجير مؤكدة من البائعين' : 'Confirmed rental offers from vendors'}</p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-6 text-muted-foreground">{locale==='ar' ? 'جارٍ التحميل...' : 'Loading...'}</CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="p-6 text-red-600">{error}</CardContent>
          </Card>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-muted-foreground">{locale==='ar' ? 'لا توجد عروض حالياً.' : 'No offers yet.'}</CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => (
              <Card key={p.id} className="group hover:shadow transition-all relative">
                <CardHeader>
                  <div className="h-40 bg-muted rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.images && p.images.length > 0 ? (
                      <img src={p.images[0].imageUrl} alt={String(locale==='ar'?p.nameAr:p.nameEn)} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                  <CardTitle className="text-base">{locale==='ar'? p.nameAr : p.nameEn}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="text-sm">
                    <span className="text-primary font-semibold">
                      {currency} {Number(p.discountPrice ?? 0).toLocaleString(locale==='ar'?'ar-EG':'en-US')}
                    </span>
                    <span className="ml-2 line-through text-muted-foreground text-xs">
                      {currency} {Number(p.price).toLocaleString(locale==='ar'?'ar-EG':'en-US')}
                    </span>
                    {typeof p.discountPrice === 'number' && p.discountPrice! < p.price && (
                      <span className="ml-2 text-green-600 text-xs">
                        -{Math.round(100 - (Number(p.discountPrice)/Number(p.price))*100)}%
                      </span>
                    )}
                  </div>
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        try { window.localStorage.setItem('selected_product_id', String(p.id)); } catch {}
                        try { (context as any)?.setSelectedProduct && (context as any).setSelectedProduct({ id: p.id }); } catch {}
                        setCurrentPage && setCurrentPage('product-details');
                      }}
                   >
                      {locale==='ar' ? 'عرض المنتج' : 'View Product'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer setCurrentPage={setCurrentPage ?? (() => {})} />
    </div>
  );
}
