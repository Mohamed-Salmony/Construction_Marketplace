import { RouteContext } from "../components/Router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Package } from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { getProducts, getProductById, type ProductDto } from "../services/products";

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
      const { ok, data } = r;
      if (ok && data) {
        const items = Array.isArray((data as any).items) ? (data as any).items : (Array.isArray(data) ? data : []);
        
        // Debug: Log raw data structure
        console.log('Raw data from API:', { 
          dataType: typeof data, 
          isArray: Array.isArray(data), 
          itemsCount: items?.length || 0,
          sampleItem: items?.[0] || null
        });
        
        // Filter for items that have discount/offer prices
        const offersOnly = items.filter((item: any) => {
          const hasDiscount = item.discountPrice && Number(item.discountPrice) < Number(item.price);
          return hasDiscount;
        });
        
        // Debug: Log offers data
        console.log('Offers data:', {
          totalItems: items.length,
          offersCount: offersOnly.length,
          sampleOffer: offersOnly?.[0] ? {
            id: offersOnly[0].id,
            _id: offersOnly[0]._id,
            nameAr: offersOnly[0].nameAr,
            price: offersOnly[0].price,
            discountPrice: offersOnly[0].discountPrice
          } : null
        });
        
        setProducts(offersOnly);
      } else {
        setError('حدث خطأ في تحميل العروض');
      }
    } catch {
      setError('Failed to load offers');
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
            {products.map((p, index) => {
              const itemId = p.id || (p as any)._id || `offer-${index}`;
              return (
              <Card 
                key={itemId} 
                className="group hover:shadow-lg transition-all cursor-pointer hover:scale-105"
                onClick={async () => {
                  // ✅ Check if product has valid ID before proceeding
                  const productId = p.id || (p as any)._id;
                  if (!productId || String(productId).trim() === '' || String(productId) === 'undefined' || String(productId) === 'null') {
                    console.error('Product ID is missing or invalid:', p.id);
                    console.log('Full product data:', p);
                    
                    // Fallback: use basic product data and navigate directly
                    try {
                      (context as any)?.setSelectedProduct && (context as any).setSelectedProduct({
                        id: String(Math.random()), // temporary ID
                        name: { ar: p.nameAr || '', en: p.nameEn || '' },
                        price: p.discountPrice || p.price,
                        originalPrice: p.price,
                        description: { ar: p.descriptionAr || '', en: p.descriptionEn || '' },
                        images: p.images?.map((img: any) => img.imageUrl).filter(Boolean) || [],
                        brand: { ar: 'عام', en: 'Generic' },
                        inStock: Number(p.stockQuantity || 0) > 0,
                        stockCount: Number(p.stockQuantity || 0),
                        rating: Number(p.averageRating || 0),
                        reviewCount: Number(p.reviewCount || 0),
                        compatibility: [],
                        specifications: {},
                        features: [],
                        addonInstallation: null
                      });
                    } catch {}
                    setCurrentPage && setCurrentPage('product-details');
                    return;
                  }

                  try { window.localStorage.setItem('selected_product_id', String(productId)); } catch {}
                  
                  // Show loading state
                  if (typeof (context as any)?.showLoading === 'function') {
                    (context as any).showLoading(
                      locale==='ar' ? 'جاري تحميل تفاصيل المنتج' : 'Loading product details',
                      locale==='ar' ? 'يرجى الانتظار' : 'Please wait'
                    );
                  }
                  
                  try { 
                    // ✅ Fetch complete product details from API
                    console.log('Fetching product details for ID:', productId);
                    const productResponse = await getProductById(String(productId));
                    
                    if (productResponse.ok && productResponse.data) {
                      // Use full product data from API
                      const fullProduct = productResponse.data as any;
                      
                      // Transform the full product data
                      const imgs = Array.isArray(fullProduct.images) ? fullProduct.images : [];
                      const primaryUrl = imgs.find((im: any) => im?.isPrimary)?.imageUrl || imgs[0]?.imageUrl;
                      const basePrice = Number(p.price || 0);
                      const disc = p.discountPrice;
                      const hasValidDiscount = typeof disc === 'number' && disc > 0 && disc < basePrice;
                      const currentPrice = hasValidDiscount ? Number(disc) : basePrice;
                      
                      // Derive brand from attributes if available
                      const attrs = Array.isArray(fullProduct.attributes) ? fullProduct.attributes : [];
                      const brandAttr = attrs.find((a:any) => {
                        const nEn = String(a?.nameEn || '').toLowerCase();
                        const nAr = String(a?.nameAr || '').toLowerCase();
                        return ['brand','make','manufacturer','company'].includes(nEn) || ['العلامة التجارية','الماركة','ماركة','الشركة','الصانع'].includes(nAr);
                      });
                      const brandAr = String(brandAttr?.valueAr || brandAttr?.valueEn || '').trim();
                      const brandEn = String(brandAttr?.valueEn || brandAttr?.valueAr || '').trim();
                      
                      const productToPass = {
                        id: String(productId), // Use the same ID we used for API call
                        slug: undefined,
                        group: 'tools',
                        name: { ar: fullProduct.nameAr || '', en: fullProduct.nameEn || '' },
                        brand: { ar: brandAr || 'عام', en: brandEn || 'Generic' },
                        category: { ar: fullProduct.categoryName || '', en: fullProduct.categoryName || '' },
                        categoryId: String(fullProduct.categoryId || ''),
                        subCategory: { ar: '', en: '' },
                        price: currentPrice,
                        originalPrice: basePrice,
                        rating: Number(fullProduct.averageRating || 0),
                        reviewCount: Number(fullProduct.reviewCount || 0),
                        image: primaryUrl,
                        images: imgs.map((img: any) => img.imageUrl).filter(Boolean),
                        imageUrl: primaryUrl, // fallback
                        inStock: Number(fullProduct.stockQuantity || 0) > 0,
                        stockCount: Number(fullProduct.stockQuantity || 0),
                        isNew: false,
                        isOnSale: currentPrice < basePrice,
                        compatibility: Array.isArray(fullProduct?.compatibility) ? fullProduct.compatibility : [],
                        compatibilityBackend: Array.isArray(fullProduct?.compatibilityBackend) ? fullProduct.compatibilityBackend : (Array.isArray(fullProduct?.compatibility) ? fullProduct.compatibility : []),
                        partNumber: fullProduct.partNumber || '',
                        warranty: { ar: 'سنة', en: '1 year' },
                        description: { ar: fullProduct.descriptionAr || '', en: fullProduct.descriptionEn || '' },
                        features: Array.isArray(fullProduct?.features) ? fullProduct.features : [],
                        specifications: typeof fullProduct?.specifications === 'object' && fullProduct?.specifications !== null ? fullProduct.specifications : {},
                        installationTips: Array.isArray(fullProduct?.installationTips) ? fullProduct.installationTips : [],
                        addonInstallation: fullProduct.addonInstallation || (fullProduct.allowCustomDimensions ? { enabled: true, feePerUnit: 50 } : null)
                      };
                      
                      // Debug: Log what we're passing to setSelectedProduct
                      console.log('Product data being passed to ProductDetails:', {
                        id: productToPass.id,
                        originalApiId: productId,
                        fullProductId: fullProduct.id,
                        idForReviews: productToPass.id,
                        specificationsCount: Object.keys(productToPass.specifications || {}).length,
                        compatibilityCount: productToPass.compatibility?.length || 0,
                        compatibilityBackendCount: productToPass.compatibilityBackend?.length || 0,
                        addonInstallation: productToPass.addonInstallation
                      });
                      
                      (context as any)?.setSelectedProduct && (context as any).setSelectedProduct(productToPass); 
                    } else {
                      // Fallback to basic data if API fails
                      const imgs = Array.isArray(p.images) ? p.images : [];
                      const primaryUrl = imgs.find((im: any) => im?.isPrimary)?.imageUrl || imgs[0]?.imageUrl;
                      const basePrice = Number(p.price || 0);
                      const disc = p.discountPrice;
                      const hasValidDiscount = typeof disc === 'number' && disc > 0 && disc < basePrice;
                      const currentPrice = hasValidDiscount ? Number(disc) : basePrice;
                      
                      (context as any)?.setSelectedProduct && (context as any).setSelectedProduct({
                        id: String(productId),
                        name: { ar: p.nameAr || '', en: p.nameEn || '' },
                        price: currentPrice,
                        originalPrice: basePrice,
                        rating: Number(p.averageRating || 0),
                        reviewCount: Number(p.reviewCount || 0),
                        image: primaryUrl,
                        images: imgs.map((img: any) => img.imageUrl).filter(Boolean),
                        description: { ar: p.descriptionAr || '', en: p.descriptionEn || '' },
                        brand: { ar: 'عام', en: 'Generic' },
                        inStock: Number(p.stockQuantity || 0) > 0,
                        stockCount: Number(p.stockQuantity || 0),
                        compatibility: [],
                        specifications: {},
                        features: [],
                        addonInstallation: null
                      });
                    }
                  } catch (error) {
                    console.error('Failed to fetch product details:', error);
                    // Fallback to basic product data
                    (context as any)?.setSelectedProduct && (context as any).setSelectedProduct({
                      id: String(productId || 'temp-' + Math.random()),
                      name: { ar: p.nameAr || '', en: p.nameEn || '' },
                      price: p.discountPrice || p.price,
                      originalPrice: p.price,
                      description: { ar: p.descriptionAr || '', en: p.descriptionEn || '' },
                    });
                  } finally {
                    // Hide loading state
                    if (typeof (context as any)?.hideLoading === 'function') {
                      (context as any).hideLoading();
                    }
                  }
                  
                  setCurrentPage && setCurrentPage('product-details');
                }}
              >
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
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </div>
      <Footer setCurrentPage={setCurrentPage ?? (() => {})} />
    </div>
  );
}
