import { useEffect, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Star, ShoppingCart, Heart } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { RouteContext } from './Router';
import { useTranslation } from '../hooks/useTranslation';
import { formatCurrency } from '../utils/vendorHelpers';
import Swal from 'sweetalert2';
import { toastSuccess, toastInfo } from '../utils/alerts';
import { getProducts } from '@/services/products';

// No static fallback; we will render an empty state if no products are returned.

export default function BestSellingProducts({ setSelectedProduct, setCurrentPage, isInWishlist, addToWishlist, removeFromWishlist, addToCart, setSearchFilters, user }: Partial<RouteContext>) {
  const { t, locale } = useTranslation();
  const isVendor = user?.role === 'vendor';
  const isLoggedIn = !!user;
  const [products, setProducts] = useState<any[]>([]);
  const [wishOverrides, setWishOverrides] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Load latest products from DB for homepage
        const { ok, data } = await getProducts({ page: 1, pageSize: 8, sortBy: 'CreatedAt', sortDirection: 'desc' });
        if (!cancelled && ok && data && Array.isArray((data as any).items)) {
          const arr = (data as any).items as any[];
          const mapped = arr.map((p) => ({
            // Ensure a stable, valid id per product (fallback to _id or productId)
            id: p.id ?? p._id ?? (p as any).productId,
            name: locale === 'en' ? (p.nameEn ?? p.name) : (p.nameAr ?? p.nameEn ?? p.name),
            nameEn: p.nameEn ?? p.name,
            price: p.discountPrice ?? p.price ?? 0,
            originalPrice: p.discountPrice ? p.price : undefined,
            rating: p.averageRating ?? 0,
            reviews: p.reviewCount ?? 0,
            image: (p.images && p.images.length ? (p.images.find((i: any) => i.isPrimary)?.imageUrl || p.images[0].imageUrl) : undefined),
            badge: p.discountPrice ? (locale === 'ar' ? 'خصم' : 'Sale') : (locale === 'ar' ? 'جديد' : 'New'),
            badgeEn: p.discountPrice ? 'Sale' : 'New',
            badgeColor: p.discountPrice ? 'bg-green-500' : 'bg-blue-500',
          }));
          setProducts(mapped);
        }
      } catch {
        // leave products empty on error
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [locale]);
  const handleProductClick = (product: any) => {
    setSelectedProduct && setSelectedProduct(product);
    setCurrentPage && setCurrentPage('product-details');
  };
  return (
    <section className="py-16 bg-white" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('bestSellingTitle')}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('bestSellingDescription')}
          </p>
        </div>
        

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse h-64 bg-gray-100 rounded" />
            ))}
          </div>
        )}
        {!loading && products.length === 0 && (
          <div className="text-center text-muted-foreground mb-8">
            {locale === 'ar' ? 'لا توجد منتجات لعرضها حالياً.' : 'No products to display yet.'}
          </div>
        )}
        {!loading && products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {products.map((product, idx) => (

            <Card key={`product-${product.id ?? (product.nameEn ?? product.name) ?? 'noid'}-${idx}`} className="group hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer" onClick={() => handleProductClick(product)}>

              <div className="relative">
                <div className="relative h-48 overflow-hidden">
                  {product.image ? (
                    <ImageWithFallback
                      src={product.image}
                      alt={locale === 'en' ? (product.nameEn ?? product.name) : product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                </div>
                <Badge className={`absolute top-2 right-2 ${product.badgeColor} text-white`}>
                  {locale === 'en' ? (product.badgeEn ?? product.badge) : product.badge}
                </Badge>
                {!isVendor && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className={`absolute top-2 left-2 bg-white/80 hover:bg-white ${(() => { const pid = String(product.id ?? (product as any)._id ?? (product as any).productId ?? ''); const valid = !!pid && pid !== 'undefined' && pid !== 'null'; const filled = valid ? ((pid in wishOverrides) ? !!wishOverrides[pid] : !!(isInWishlist && isInWishlist(pid))) : false; return filled ? 'text-red-600' : 'text-gray-600 hover:text-red-600'; })()}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isLoggedIn) {
                        // Redirect to login if not authenticated
                        setCurrentPage && setCurrentPage('login');
                        toastInfo(locale === 'ar' ? 'يرجى تسجيل الدخول لإضافة إلى المفضلة' : 'Please sign in to add to wishlist', locale==='ar');
                        return;
                      }
                      const pid = String(product.id ?? (product as any)._id ?? (product as any).productId ?? '');
                      if (!pid || pid === 'undefined' || pid === 'null') {
                        toastInfo(locale==='ar' ? 'معرّف المنتج غير متاح' : 'Product ID unavailable');
                        return;
                      }
                      const already = (pid in wishOverrides) ? !!wishOverrides[pid] : !!(isInWishlist && isInWishlist(pid));
                      if (!already) {
                        addToWishlist && addToWishlist({
                          id: pid,
                          name: locale === 'en' ? (product.nameEn ?? product.name) : product.name,
                          price: product.price,
                          brand: locale === 'en' ? product.nameEn : product.name,
                          originalPrice: product.originalPrice,
                          image: product.image,
                          inStock: true,
                        } as any);
                        setWishOverrides((prev) => ({ ...prev, [pid]: true }));
                        toastSuccess(locale === 'en' ? 'Added to wishlist' : 'تمت الإضافة إلى المفضلة', locale==='ar');
                      } else {
                        removeFromWishlist && removeFromWishlist(pid);
                        setWishOverrides((prev) => ({ ...prev, [pid]: false }));
                        toastInfo(locale === 'en' ? 'Removed from wishlist' : 'تمت الإزالة من المفضلة', locale==='ar');
                      }
                    }}
                  >
                    {(() => { const pid = String(product.id ?? (product as any)._id ?? (product as any).productId ?? ''); const valid = !!pid && pid !== 'undefined' && pid !== 'null'; const filled = valid ? ((pid in wishOverrides) ? !!wishOverrides[pid] : !!(isInWishlist && isInWishlist(pid))) : false; return (<Heart className={`h-4 w-4 ${filled ? 'fill-current text-red-600' : ''}`} />); })()}
                  </Button>
                )}
              </div>
              
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-2 line-clamp-2">{locale === 'en' ? (product.nameEn ?? product.name) : product.name}</h3>
                
                <div className="flex items-center gap-1 mb-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-3 h-3 ${i < Math.floor(product.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">({product.reviews})</span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="font-bold text-lg">{formatCurrency(product.price, locale === 'en' ? 'en' : 'ar')}</span>
                  {typeof product.originalPrice === 'number' && product.originalPrice > product.price && (
                    <span className="text-sm text-muted-foreground line-through">{formatCurrency(product.originalPrice, locale === 'en' ? 'en' : 'ar')}</span>
                  )}
                </div>

                {!isVendor && (
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      addToCart && addToCart({
                        id: String(product.id),
                        name: locale === 'en' ? (product.nameEn ?? product.name) : product.name,
                        price: product.price,
                        image: product.image,
                        quantity: 1,
                        inStock: true,
                      });
                      toastSuccess(locale === 'en' ? 'Added to cart' : 'تمت الإضافة إلى السلة', locale==='ar');
                    }}
                  >
                    <ShoppingCart className="w-4 h-4 ml-1" />
                    {t('addToCart')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        )}

        <div className="text-center">
          <Button variant="outline" size="lg" onClick={() => {
            // Clear any pre-applied filters to show all products
            setSearchFilters && setSearchFilters(null);
            setCurrentPage && setCurrentPage('products');
          }}>
            {t('viewAllProducts')}
          </Button>
        </div>
      </div>
    </section>
  );
}
