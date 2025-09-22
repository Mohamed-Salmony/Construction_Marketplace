import { useState } from 'react';
import { Minus, Plus, Trash2, ShoppingBag, Truck, CreditCard, Shield, Tag } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RouteContext } from '../components/Router';
import { useTranslation } from '../hooks/useTranslation';
import { error as errorDialog, success as successDialog } from '../utils/alerts';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { validatePromoCode } from '../services/promoCodes';

interface CartProps extends RouteContext {}

export default function Cart({ setCurrentPage, cartItems, updateCartQty, removeFromCart, clearCart, user, setUser }: CartProps) {
  const { t, locale } = useTranslation();
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountAmount: number; discountType: string; discountValue: number } | null>(null);
  const [applyingPromo, setApplyingPromo] = useState(false);
  // Fallbacks for SSG/SSR where context props may be undefined
  const items = cartItems ?? [];
  const go = setCurrentPage ?? (() => {});
  const updateQtySafe = updateCartQty ?? (() => {});
  const removeSafe = removeFromCart ?? (() => {});
  const clearSafe = clearCart ?? (() => {});

  const updateQuantity = (id: string, newQuantity: number) => updateQtySafe(id, newQuantity);

  const removeItem = (id: string) => removeSafe(id);

  const applyPromoCode = async () => {
    if (!promoCode.trim()) return;
    if (!user) {
      await errorDialog(locale === 'ar' ? 'يجب تسجيل الدخول لاستخدام البرومو كود' : 'Please login to use promo code', locale === 'ar');
      return;
    }

    setApplyingPromo(true);
    try {
      const response = await validatePromoCode(promoCode.trim(), subtotal);
      
      if (response.ok && response.data && response.data.data) {
        const promoData = response.data.data;
        setAppliedPromo({
          code: promoData.code,
          discountAmount: promoData.discountAmount,
          discountType: promoData.discountType,
          discountValue: promoData.discountValue
        });
        setPromoCode('');
        await successDialog(
          locale === 'ar' 
            ? `تم تطبيق البرومو كود ${promoData.code} بنجاح!`
            : `Promo code ${promoData.code} applied successfully!`,
          locale === 'ar'
        );
      } else {
        await errorDialog(
          response.data?.message || (locale === 'ar' ? 'البرومو كود غير صحيح' : 'Invalid promo code'),
          locale === 'ar'
        );
      }
    } catch (error) {
      console.error('Promo code error:', error);
      await errorDialog(
        locale === 'ar' ? 'خطأ في تطبيق البرومو كود' : 'Error applying promo code',
        locale === 'ar'
      );
    } finally {
      setApplyingPromo(false);
    }
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const savings = items.reduce((sum, item) => {
    if (item.originalPrice) {
      return sum + ((item.originalPrice - item.price) * item.quantity);
    }
    return sum;
  }, 0);
  
  const promoDiscount = appliedPromo ? appliedPromo.discountAmount : 0;
  const shippingCost = subtotal >= 200 ? 0 : 25;
  const total = subtotal - promoDiscount + shippingCost;

  const handleCheckout = () => {
    // Redirect to checkout page
    setCurrentPage('checkout');
  };

  const continueShopping = () => {
    setCurrentPage('products');
  };

  const hasUnavailable = items.some(item => item.inStock === false);
  const removeUnavailable = () => {
    items.forEach(item => {
      if (item.inStock === false) removeItem(item.id);
    });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header currentPage="cart" setCurrentPage={setCurrentPage} user={user} setUser={setUser} cartItems={items} />
        
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto text-center p-8">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-medium mb-2">{t('cartEmptyTitle')}</h2>
            <p className="text-muted-foreground mb-6">{t('cartEmptyDesc')}</p>
            <Button onClick={continueShopping} className="w-full">
              {t('cartShopNow')}
            </Button>
          </Card>
        </div>
        
        <Footer setCurrentPage={setCurrentPage} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header currentPage="cart" setCurrentPage={setCurrentPage} user={user} setUser={setUser} cartItems={items} />
      
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">{`${t('cartTitle')} (${items.length} ${t('cartItemsCount')})`}</h1>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item, idx) => (
              <Card key={`${item.id}-${idx}`}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="relative">
                      <ImageWithFallback
                        src={item.image}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      {item.inStock === false && (
                        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                          <span className="text-white text-xs">{t('outOfStockBadge')}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium">{item.name}</h3>
                          <p className="text-sm text-muted-foreground">{item.brand}</p>
                          <p className="text-xs text-muted-foreground">{t('cartPartNumber')}: {item.partNumber}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-primary">{item.price} {t('cartCurrency')}</span>
                          {item.originalPrice && item.originalPrice > item.price && (
                            <span className="text-sm text-muted-foreground line-through">
                              {item.originalPrice} {t('cartCurrency')}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="flex items-center border rounded-lg">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="px-3 py-1 text-sm min-w-[40px] text-center">
                              {item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={item.quantity >= (item.maxQuantity ?? 99) || item.inStock === false}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {item.inStock === false && (
                        <p className="text-sm text-destructive mt-2">
                          {t('cartRemoveUnavailableBeforeContinue')}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <div className="flex justify-between items-center pt-4">
              <Button variant="outline" onClick={continueShopping}>
                {t('cartContinueShopping')}
              </Button>
              <Button
                variant="outline"
                onClick={() => clearSafe()}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 ml-2" />
                {t('cartClearCart')}
              </Button>
            </div>
          </div>
          
          {/* Order Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>{t('cartOrderSummary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>{t('cartSubtotal')}</span>
                  <span>{subtotal.toFixed(2)} {t('cartCurrency')}</span>
                </div>
                
                {savings > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>{t('cartYouSaved')}</span>
                    <span>-{savings.toFixed(2)} {t('cartCurrency')}</span>
                  </div>
                )}
                
                {appliedPromo && (
                  <div className="flex justify-between text-green-600">
                    <span>{`${t('cartDiscount')} (${appliedPromo.code})`}</span>
                    <div className="flex items-center gap-2">
                      <span>-{promoDiscount.toFixed(2)} {t('cartCurrency')}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={removePromoCode}
                        className="h-auto p-0 text-destructive"
                      >
                        {t('cartRemove') ?? t('cartApply')}
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span>{t('cartShipping')}</span>
                  <span className={shippingCost === 0 ? 'text-green-600' : ''}>
                    {shippingCost === 0 ? t('cartFree') : `${shippingCost} ${t('cartCurrency')}`}
                  </span>
                </div>
                
                {shippingCost > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t('cartAddMoreForFreeShipping').replace('{{amount}}', `${(200 - subtotal).toFixed(2)} ${t('cartCurrency')}`)}
                  </p>
                )}
                
                <Separator />
                
                <div className="flex justify-between font-medium text-lg">
                  <span>{t('totalLabel')}</span>
                  <span className="text-primary">{total.toFixed(2)} {t('cartCurrency')}</span>
                </div>
                
                {/* Promo Code */}
                {!appliedPromo && (
                  <div className="space-y-2">
                    <Label htmlFor="promo" className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      {t('cartPromoCode')}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="promo"
                        placeholder={t('cartPromoPlaceholder')}
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        disabled={applyingPromo}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            applyPromoCode();
                          }
                        }}
                      />
                      <Button 
                        onClick={applyPromoCode} 
                        variant="outline"
                        disabled={!promoCode.trim() || applyingPromo}
                      >
                        {applyingPromo ? (locale === 'ar' ? 'جاري التطبيق...' : 'Applying...') : t('cartApply')}
                      </Button>
                    </div>
                    {user && (
                      <p className="text-xs text-muted-foreground">
                        {locale === 'ar' 
                          ? 'أدخل رمز الخصم واضغط Enter أو زر التطبيق'
                          : 'Enter discount code and press Enter or Apply button'
                        }
                      </p>
                    )}
                    {!user && (
                      <p className="text-xs text-orange-600">
                        {locale === 'ar' 
                          ? 'يجب تسجيل الدخول أولاً لاستخدام رموز الخصم'
                          : 'Please login first to use discount codes'
                        }
                      </p>
                    )}
                  </div>
                )}
                
                <Button
                  className="w-full"
                  onClick={handleCheckout}
                  disabled={hasUnavailable}
                >
                  <CreditCard className="h-4 w-4 ml-2" />
                  {t('cartProceedToCheckout')}
                </Button>
                
                {hasUnavailable && (
                  <div className="space-y-2 text-center">
                    <p className="text-sm text-destructive">
                      {t('cartRemoveUnavailableBeforeContinue')}
                    </p>
                    <Button variant="outline" size="sm" onClick={removeUnavailable}>
                      {t('cartRemove')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Security Features */}
            <Card className="mt-4">
              <CardContent className="p-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span>{t('cartSecurePayment')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-blue-600" />
                    <span>{t('cartFastDelivery')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-purple-600" />
                    <span>{t('cartAllPaymentsSupported')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}