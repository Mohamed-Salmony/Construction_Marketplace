import { RouteContext } from "../components/Router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Package } from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { getProducts, type ProductDto } from "../services/products";

export default function Offers({ setCurrentPage, ...context }: Partial<RouteContext>) {
  const { t, locale } = useTranslation();
  const currency = locale === 'ar' ? 'ر.س' : 'SAR';
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const firstLoadRef = useRef(true);

  // ✅ Load data function (stable)
  const loadOffers = useCallback(async () => {
    try {
      setLoading(true);
      if (firstLoadRef.current && typeof (context as any)?.showLoading === 'function') {
        (context as any).showLoading(
          locale==='ar' ? 'جاري تحميل العروض' : 'Loading offers',
          locale==='ar' ? 'يرجى الانتظار' : 'Please wait'
        );
      }
      const r = await getProducts({ page: 1, pageSize: 500, sortBy: 'CreatedAt', sortDirection: 'desc' as any });
      const items = ((r.data as any)?.items ?? (r.data as any)?.Items ?? []) as ProductDto[];
      const discounted = items.filter(p => typeof p.discountPrice === 'number' && p.discountPrice! > 0 && p.discountPrice! < p.price && p.isApproved);
      setProducts(discounted);
    } catch {
      setError(locale==='ar' ? 'فشل تحميل العروض' : 'Failed to load offers');
    } finally {
      setLoading(false);
      if (firstLoadRef.current && typeof (context as any)?.hideLoading === 'function') {
        (context as any).hideLoading();
        firstLoadRef.current = false;
      }
    }
  }, [locale]); // Only depend on locale

  // ✅ Load data once on mount
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (mounted) {
        await loadOffers();
      }
    };
    load();
    return () => { mounted = false; };
  }, [loadOffers]);

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
                    {p.images && p.images.length > 0 ? (
                      <Image src={p.images[0].imageUrl} alt={String(locale==='ar'?p.nameAr:p.nameEn)} width={640} height={160} className="w-full h-full object-cover" />
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
                        try { 
                          (context as any)?.setSelectedProduct && (context as any).setSelectedProduct({
                            id: p.id,
                            name: { ar: p.nameAr, en: p.nameEn },
                            price: p.discountPrice || p.price,
                            originalPrice: p.price,
                            images: p.images?.map((img: any) => img.imageUrl) || [],
                            description: { ar: p.descriptionAr, en: p.descriptionEn },
                            brand: { ar: 'عام', en: 'Generic' },
                            inStock: true,
                            stockCount: p.stockQuantity || 99,
                            rating: 4.5,
                            reviewCount: 0,
                            features: [],
                            partNumber: '',
                            warranty: { ar: 'سنة', en: '1 year' },
                            specifications: {},
                            compatibility: [],
                            addonInstallation: null

                          }); 
                        } catch {}
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
