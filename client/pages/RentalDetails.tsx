import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Star,
  ShoppingCart,
  Heart,
  Share2,
  Truck,
  Shield,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Check,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
import { RouteContext } from '../components/Router';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { useTranslation } from '../hooks/useTranslation';
import { WishlistItem } from '../components/Router';
import { getRentalById } from '@/services/rentals';
import { getProductById } from '../services/products';
import { toastSuccess, toastInfo } from '../utils/alerts';

interface RentalDetailsProps {
  currentPage?: string;
  setCurrentPage?: (page: string) => void;
  selectedProduct?: any;
  addToCart?: (item: any) => void;
  isInWishlist?: (id: string) => boolean;
  addToWishlist?: (item: WishlistItem) => void;
  removeFromWishlist?: (id: string) => void;
}

export default function RentalDetails({
  currentPage,
  setCurrentPage,
  selectedProduct,
  addToCart,
  isInWishlist,
  addToWishlist,
  removeFromWishlist,
  ...rest
}: RentalDetailsProps & Partial<RouteContext>) {
  const { t, locale } = useTranslation();
  const isVendor = ((rest as any)?.user?.role) === 'vendor';
  const currency = locale === 'ar' ? 'ر.س' : 'SAR';
  const getText = (val: any): string => {
    if (val && typeof val === 'object') {
      return val[locale] ?? val.ar ?? val.en ?? '';
    }
    return String(val ?? '');
  };
  const [quantity, setQuantity] = useState(1);
  const [installSelected, setInstallSelected] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [userComment, setUserComment] = useState('');

  // isWishlisted will be computed after prodToUse is defined
  let isWishlisted = false;

  const [rental, setRental] = useState<any | null>(null);
  // On mount, try to read selected_rental and fetch latest from backend (with robust image fallback)
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      const qId = Number(url.searchParams.get('id') || '');
      const raw = window.localStorage.getItem('selected_rental');
      const parsed = raw ? JSON.parse(raw) : null;
      const rid = Number(qId || parsed?.id || parsed?.rentalId);
      if (!rid) return;
      (async () => {
        try {
          const res = await getRentalById(rid);
          if (res.ok && res.data) {
            const apiData:any = res.data as any;
            let merged:any = { ...(parsed || {}), ...apiData };
            if (!merged.imageUrl) {
              if (parsed?.imageUrl) merged.imageUrl = parsed.imageUrl;
              // last resort: fetch product to get its first image
              if (!merged.imageUrl && merged.productId) {
                try {
                  const p = await getProductById(Number(merged.productId));
                  if (p.ok && p.data) {
                    const first = Array.isArray((p.data as any).images) ? ((p.data as any).images.map((im:any)=> im?.imageUrl).filter(Boolean)[0]) : ((p.data as any).imageUrl || '');
                    if (first) merged.imageUrl = first;
                  }
                } catch {}
              }
            }
            setRental(merged);
          } else if (parsed) {
            setRental(parsed);
          }
        } catch {
          if (parsed) setRental(parsed);
        }
      })();
    } catch {}
  }, []);

  // If we have a rental, map it to product-like object for display
  const mappedProduct = rental ? {
    id: rental.productId,
    name: rental.productName || 'Rental',
    brand: '',
    category: 'Rental',
    subCategory: '',
    price: Number(rental.dailyRate || 0),
    originalPrice: Number(rental.totalAmount || 0),
    images: rental.imageUrl ? [rental.imageUrl] : [],
    inStock: true,
    stockCount: rental.rentalDays || 1,
    isNew: false,
    isOnSale: false,
    compatibility: [],
    partNumber: `R-${rental.id}`,
    warranty: '',
    description: '',
    specifications: {},
    features: [],
    installationTips: [],
  } : null;

  const prodToUse:any = mappedProduct || { id: 'r-unknown', name: locale==='ar'?'عقد تأجير':'Rental', brand: '', category: 'Rental', subCategory: '', price: 0, originalPrice: 0, images: [''], inStock: true, stockCount: 1 };
  // Wishlist state from Router context (after prodToUse available)
  isWishlisted = (isInWishlist && prodToUse?.id)
    ? !!isInWishlist(String(prodToUse.id))
    : false;
  const images = (Array.isArray(prodToUse.images) && prodToUse.images.length > 0) ? prodToUse.images : [''];
  const discountPercentage =
    (prodToUse.originalPrice > prodToUse.price)
      ? Math.round(((prodToUse.originalPrice - prodToUse.price) / prodToUse.originalPrice) * 100)
      : 0;

  const normalizedInStock = prodToUse.inStock !== false && ((prodToUse.stockCount ?? 1) > 0);
  const normalizedStockCount = prodToUse.stockCount ?? 99;

  const textName = getText(prodToUse?.name || '').toLowerCase();
  const textCat = getText(prodToUse?.category || '').toLowerCase();
  const textSub = getText(prodToUse?.subCategory || '').toLowerCase();
  const isDoorLike = /باب|door/.test(textName) || /باب|door/.test(textCat) || /باب|door/.test(textSub);
  const isWindowLike = /شباك|نافذة|window/.test(textName) || /شباك|نافذة|window/.test(textCat) || /شباك|نافذة|window/.test(textSub);
  const doorWindowIds = new Set(['wd-1','mw-1','aw-1']);
  const vendorInstallEnabled = !!(prodToUse as any)?.addonInstallation?.enabled;
  const vendorInstallFee = Number((prodToUse as any)?.addonInstallation?.feePerUnit ?? 50);
  const fallbackInstall = doorWindowIds.has(String(prodToUse?.id || '')) || isDoorLike || isWindowLike;
  const showInstallOption = vendorInstallEnabled ? true : fallbackInstall;
  const INSTALL_FEE_PER_UNIT = vendorInstallEnabled ? vendorInstallFee : 50;
  const priceWithAddon = prodToUse.price + (showInstallOption && installSelected ? INSTALL_FEE_PER_UNIT : 0);
  const subtotal = priceWithAddon * quantity;

  const handleAddToCart = () => {
    if (addToCart) {
      addToCart({
        id: prodToUse.id,
        name: getText(prodToUse.name),
        price: priceWithAddon,
        image: images[0],
        partNumber: prodToUse.partNumber,
        quantity,
        inStock: normalizedInStock,
        maxQuantity: normalizedStockCount,
        originalPrice: prodToUse.originalPrice,
        brand: getText(prodToUse.brand),
        // rental metadata to preserve context in cart
        rental: rental ? {
          id: rental.id,
          productId: rental.productId,
          startDate: rental.startDate,
          endDate: rental.endDate,
          rentalDays: rental.rentalDays,
          dailyRate: rental.dailyRate,
          totalAmount: rental.totalAmount,
        } : undefined,
        addonInstallation: showInstallOption && installSelected ? {
          enabled: true,
          feePerUnit: INSTALL_FEE_PER_UNIT,
          totalFee: INSTALL_FEE_PER_UNIT * quantity,
          label: locale === 'ar' ? 'خدمة تركيب مع ضمان جودة' : 'Installation service with quality guarantee'
        } : { enabled: false }
      });
    }
    if (setCurrentPage) setCurrentPage('cart');
  };

  const handleBuyNow = () => {
    if (addToCart) {
      addToCart({
        id: prodToUse.id,
        name: getText(prodToUse.name),
        price: priceWithAddon,
        image: images[0],
        partNumber: prodToUse.partNumber,
        quantity,
        inStock: normalizedInStock,
        maxQuantity: normalizedStockCount,
        originalPrice: prodToUse.originalPrice,
        brand: getText(prodToUse.brand),
        addonInstallation: showInstallOption && installSelected ? {
          enabled: true,
          feePerUnit: INSTALL_FEE_PER_UNIT,
          totalFee: INSTALL_FEE_PER_UNIT * quantity,
          label: locale === 'ar' ? 'خدمة تركيب مع ضمان جودة' : 'Installation service with quality guarantee'
        } : { enabled: false }
      });
    }
    if (setCurrentPage) setCurrentPage('checkout');
  };

  return (
    <div className="min-h-screen bg-background" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <Header currentPage="rental-details" setCurrentPage={setCurrentPage!} {...(rest as any)} />

      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb mirrors product but goes to rentals */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <button onClick={() => setCurrentPage && setCurrentPage('home')} className="hover:text-primary">
            {t('home')}
          </button>
          <ChevronLeft className="h-4 w-4" />
          <button onClick={() => setCurrentPage && setCurrentPage('rentals')} className="hover:text-primary">
            {locale === 'ar' ? 'التأجير' : 'Rentals'}
          </button>
          <ChevronLeft className="h-4 w-4" />
          <span>{locale==='ar' ? 'عقد تأجير' : 'Rental'}</span>
          <ChevronLeft className="h-4 w-4" />
          <span className="text-foreground">{getText(prodToUse.name)}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Images */}
          <div className="space-y-4">
            <div className="relative">
              <ImageWithFallback
                src={images[selectedImageIndex]}
                alt={getText(prodToUse.name)}
                className="w-full h-96 object-cover rounded-lg"
              />
              {prodToUse.isNew && (
                <Badge className="absolute top-4 right-4 bg-green-500">{locale === 'en' ? 'New' : 'جديد'}</Badge>
              )}
              {prodToUse.isOnSale && (
                <Badge className="absolute top-4 left-4 bg-red-500">
                  {locale === 'en' ? 'Discount' : 'خصم'} {discountPercentage}%
                </Badge>
              )}
              {images.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/90"
                    onClick={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
                    disabled={selectedImageIndex === 0}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/90"
                    onClick={() => setSelectedImageIndex(Math.min(images.length - 1, selectedImageIndex + 1))}
                    disabled={selectedImageIndex === images.length - 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 border-2 rounded-lg overflow-hidden ${index === selectedImageIndex ? 'border-primary' : 'border-gray-200'}`}
                    aria-label={`thumbnail-${index + 1}`}
                  >
                    <ImageWithFallback src={img} alt={`${getText(prodToUse.name)} - ${index + 1}`} className="w-20 h-20 object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">{getText(prodToUse.name)}</h1>
              <p className="text-muted-foreground mb-4">
                {locale === 'en' ? 'Brand' : 'العلامة التجارية'}: {getText(prodToUse.brand)}
              </p>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < Math.floor(prodToUse.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  ))}
                </div>
                <span className="text-sm">{prodToUse.rating || 0}</span>
                <span className="text-sm text-muted-foreground">({prodToUse.reviewCount || 0} Reviews)</span>
              </div>
              <div className="flex items-center gap-4 mb-6">
                <span className="text-3xl font-bold text-primary">{prodToUse.price} {currency}</span>
                {prodToUse.originalPrice > prodToUse.price && (
                  <span className="text-xl text-muted-foreground line-through">{prodToUse.originalPrice} {currency}</span>
                )}
              </div>
              {rental && (
                <div className="grid grid-cols-3 gap-3 text-sm bg-muted/30 rounded p-3 mb-4">
                  <div>
                    <div className="text-xs text-muted-foreground">{locale==='ar'? 'من' : 'From'}</div>
                    <div>{String(rental.startDate).slice(0,10)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{locale==='ar'? 'إلى' : 'To'}</div>
                    <div>{String(rental.endDate).slice(0,10)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{locale==='ar'? 'الأيام' : 'Days'}</div>
                    <div>{rental.rentalDays}</div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 mb-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${normalizedInStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {normalizedInStock ? `${t('available')} (${normalizedStockCount})` : t('outOfStock')}
                </span>
                <span className="text-sm text-muted-foreground">{t('partNumber')}: {prodToUse.partNumber}</span>
              </div>
            </div>

            {/* Quantity and actions */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">{t('quantity')}:</label>
                <div className="flex items-center border rounded-lg">
                  <Button variant="ghost" size="sm" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="px-4 py-2 min-w-[60px] text-center">{quantity}</span>
                  <Button variant="ghost" size="sm" onClick={() => setQuantity(quantity + 1)} disabled={quantity >= normalizedStockCount}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {showInstallOption && (
                <div className="flex items-start gap-3 rounded-md border p-3 bg-muted/40">
                  <input id="install-addon" type="checkbox" className="mt-1" checked={installSelected} onChange={(e) => setInstallSelected(e.target.checked)} />
                  <label htmlFor="install-addon" className="text-sm cursor-pointer">
                    <span className="font-medium">{locale === 'ar' ? 'خدمة تركيب احترافية' : 'Professional installation service'}</span>
                    <span className="mx-1">•</span>
                    <span className="text-primary font-semibold">{INSTALL_FEE_PER_UNIT} {currency}</span>
                    <div className="text-xs text-muted-foreground mt-1">{locale === 'ar' ? 'تقديم الخدمة بمعايير عالية مع ضمان جودة الخدمة.' : 'Delivered with high standards and a quality guarantee.'}</div>
                    {installSelected && (
                      <div className="text-xs mt-1">
                        {locale === 'ar' ? `إجمالي خدمة التركيب: ${INSTALL_FEE_PER_UNIT * quantity} ${currency} ( ${quantity} × ${INSTALL_FEE_PER_UNIT} )` : `Installation total: ${INSTALL_FEE_PER_UNIT * quantity} ${currency} ( ${quantity} × ${INSTALL_FEE_PER_UNIT} )`}
                      </div>
                    )}
                  </label>
                </div>
              )}

              <div className="flex items-center justify-between text-sm bg-muted/30 rounded-md px-3 py-2">
                <span className="text-muted-foreground">{locale === 'ar' ? 'الإجمالي (يشمل التركيب إن وجد)' : 'Subtotal (incl. installation if selected)'}</span>
                <span className="font-semibold text-primary">{subtotal} {currency}</span>
              </div>

              <div className="flex gap-4">
                {!isVendor && (
                  <Button className="flex-1" onClick={handleAddToCart} disabled={!normalizedInStock}>
                    <ShoppingCart className="h-4 w-4 ml-2" />
                    {t('addToCart')}
                  </Button>
                )}
                {!isVendor && (
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const pid = String(prodToUse?.id || '');
                      if (!pid) return;
                      if (!isWishlisted) {
                        addToWishlist && addToWishlist({
                          id: pid,
                          name: getText(prodToUse?.name),
                          price: Number(prodToUse?.price || 0),
                          brand: getText(prodToUse?.brand),
                          originalPrice: Number(prodToUse?.originalPrice || 0),
                          image: images[0] || '',
                          inStock: true,
                        } as any);
                        toastSuccess(locale === 'en' ? 'Added to wishlist' : 'تمت الإضافة إلى المفضلة', locale==='ar');
                      } else {
                        removeFromWishlist && removeFromWishlist(pid);
                        toastInfo(locale === 'en' ? 'Removed from wishlist' : 'تمت الإزالة من المفضلة', locale==='ar');
                      }
                    }}
                    className={isWishlisted ? 'text-red-500 border-red-500' : ''}
                    title={locale==='ar'?'مفضلة':'Favorite'}
                  >
                    <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
                  </Button>
                )}
                <Button variant="outline">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              <Button variant="secondary" className="w-full" onClick={handleBuyNow} disabled={!normalizedInStock}>
                {t('buyNow')}
              </Button>
            </div>

            {/* Info meta (generic) */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="flex flex-col items-center">
                    <Truck className="h-8 w-8 text-primary mb-2" />
                    <span className="text-sm">{locale === 'ar' ? 'توصيل متاح' : 'Delivery available'}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Shield className="h-8 w-8 text-primary mb-2" />
                    <span className="text-sm">{locale === 'ar' ? 'عقد موثّق' : 'Verified contract'}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <RotateCcw className="h-8 w-8 text-primary mb-2" />
                    <span className="text-sm">{locale === 'ar' ? 'سياسة الإرجاع حسب العقد' : 'Return policy per contract'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs removed for now; details are driven by rental only */}
      </div>

      <Footer setCurrentPage={setCurrentPage as any} />
    </div>
  );
}
