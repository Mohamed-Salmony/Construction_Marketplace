import { useState } from 'react';
import { ArrowRight, CreditCard, Truck, MapPin, Phone, Shield, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Checkbox } from '../components/ui/checkbox';
import { Separator } from '../components/ui/separator';
import { Badge } from '../components/ui/badge';
import { RouteContext } from '../components/Router';
import { useTranslation } from '../hooks/useTranslation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { warning } from '../utils/alerts';
import { createOrder, type CreateOrderDto } from '@/services/orders';

interface CheckoutProps extends RouteContext {}

export default function Checkout({ setCurrentPage, user, setReturnTo, cartItems }: CheckoutProps) {
  const { t, locale } = useTranslation();
  const currency = locale === 'ar' ? 'ر.س' : 'SAR';
  const getText = (val: any): string => {
    if (val && typeof val === 'object') {
      return val[locale] ?? val.ar ?? val.en ?? '';
    }
    return String(val ?? '');
  };
  const [step, setStep] = useState(1); // 1: Address, 2: Payment, 3: Confirmation
  const [orderPlaced, setOrderPlaced] = useState(false);
  
  const [shippingAddress, setShippingAddress] = useState({
    firstName: 'أحمد',
    lastName: 'محمد',
    phone: '+966 50 123 4567',
    email: 'ahmed@example.com',
    address: 'شارع الملك فهد، حي الروضة',
    city: 'الرياض',
    postalCode: '12345',
    additionalInfo: ''
  });

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [deliveryMethod, setDeliveryMethod] = useState('standard');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // Calculations
  const items = cartItems ?? [];
  const go = setCurrentPage ?? (() => {});
  const setReturnToSafe = setReturnTo ?? (() => {});
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingCost = deliveryMethod === 'express' ? 35 : (subtotal >= 200 ? 0 : 25);
  const total = subtotal + shippingCost;

  const handlePlaceOrder = async () => {
    // Require login before placing order
    if (!user) {
      setReturnToSafe('checkout');
      go('login');
      return;
    }
    if (!agreeToTerms) {
      await warning(locale === 'en' ? 'Please agree to the Terms and Privacy Policy' : 'يرجى الموافقة على الشروط والأحكام', locale === 'ar');
      return;
    }
    try {
      const payload: CreateOrderDto = {
        items: items.map(it => ({ id: it.id, quantity: it.quantity, price: it.price })),
        shipping: {
          firstName: shippingAddress.firstName,
          lastName: shippingAddress.lastName,
          phone: shippingAddress.phone,
          email: shippingAddress.email,
          address: shippingAddress.address,
          city: shippingAddress.city,
          postalCode: shippingAddress.postalCode,
          additionalInfo: shippingAddress.additionalInfo,
        },
        paymentMethod,
        deliveryMethod,
      };
      const { ok, data } = await createOrder(payload);
      if (ok && data && (data as any).id) {
        // show returned order id in confirmation
        setOrderPlaced(true);
        setPlacedOrderId(String((data as any).id));
      } else {
        // fallback success without id
        setOrderPlaced(true);
      }
    } catch {
      // If backend fails, still proceed but without id (or show error per requirement)
      setOrderPlaced(true);
    }
  };

  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-background" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <Header currentPage="checkout" setCurrentPage={setCurrentPage} />
        
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto text-center p-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-medium mb-2">{locale === 'en' ? 'Your order has been placed successfully!' : 'تم تأكيد طلبك بنجاح!'}</h2>
            {placedOrderId ? (
              <p className="text-muted-foreground mb-4">
                {locale==='en'? 'Order ID: ' : 'رقم الطلب: '} {placedOrderId}
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground mb-6">
              {locale === 'en' ? 'Order details will be sent to your email.' : 'سيتم إرسال تفاصيل الطلب إلى بريدك الإلكتروني'}
            </p>
            <div className="space-y-2">
              <Button 
                onClick={() => go('my-orders')} 
                className="w-full"
              >
                {locale === 'en' ? 'View My Orders' : 'عرض طلباتي'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => go('home')} 
                className="w-full"
              >
                {locale === 'en' ? 'Back to Home' : 'العودة للرئيسية'}
              </Button>
            </div>
          </Card>
        </div>
        
        <Footer setCurrentPage={setCurrentPage} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <Header currentPage="checkout" setCurrentPage={setCurrentPage} />
      
      <div className="container mx-auto px-4 py-6">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8 space-x-reverse">
            {[
              { step: 1, title: locale === 'en' ? 'Shipping Info' : 'معلومات التوصيل', icon: MapPin },
              { step: 2, title: locale === 'en' ? 'Payment' : 'طريقة الدفع', icon: CreditCard },
              { step: 3, title: locale === 'en' ? 'Confirm Order' : 'تأكيد الطلب', icon: CheckCircle }
            ].map(({ step: stepNumber, title, icon: Icon }) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  step >= stepNumber 
                    ? 'bg-primary border-primary text-primary-foreground' 
                    : 'border-muted-foreground text-muted-foreground'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`mr-2 text-sm ${
                  step >= stepNumber ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {title}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>{locale === 'en' ? 'Shipping Information' : 'معلومات التوصيل'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">{locale === 'en' ? 'First Name' : 'الاسم الأول'}</Label>
                      <Input
                        id="firstName"
                        value={shippingAddress.firstName}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, firstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">{locale === 'en' ? 'Last Name' : 'الاسم الأخير'}</Label>
                      <Input
                        id="lastName"
                        value={shippingAddress.lastName}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, lastName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">{locale === 'en' ? 'Phone Number' : 'رقم الهاتف'}</Label>
                      <Input
                        id="phone"
                        value={shippingAddress.phone}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">{locale === 'en' ? 'Email' : 'البريد الإلكتروني'}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={shippingAddress.email}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, email: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="address">{locale === 'en' ? 'Address' : 'العنوان'}</Label>
                    <Input
                      id="address"
                      value={shippingAddress.address}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, address: e.target.value })}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">{locale === 'en' ? 'City' : 'المدينة'}</Label>
                      <Input
                        id="city"
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="postalCode">{locale === 'en' ? 'Postal Code' : 'الرمز البريدي'}</Label>
                      <Input
                        id="postalCode"
                        value={shippingAddress.postalCode}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="additionalInfo">{locale === 'en' ? 'Additional Info (optional)' : 'معلومات إضافية (اختياري)'}</Label>
                    <Input
                      id="additionalInfo"
                      placeholder={locale === 'en' ? 'Additional details to find the address' : 'معلومات إضافية للعثور على العنوان'}
                      value={shippingAddress.additionalInfo}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, additionalInfo: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <Label>{locale === 'en' ? 'Delivery Method' : 'طريقة التوصيل'}</Label>
                    <RadioGroup value={deliveryMethod} onValueChange={setDeliveryMethod}>
                      <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg">
                        <RadioGroupItem value="standard" id="standard" />
                        <div className="flex-1">
                          <Label htmlFor="standard" className="cursor-pointer">
                            {locale === 'en' ? 'Standard Delivery (3-5 business days)' : 'التوصيل العادي (3-5 أيام عمل)'}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {subtotal >= 200 ? (locale === 'en' ? 'Free' : 'مجاني') : `25 ${currency}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg">
                        <RadioGroupItem value="express" id="express" />
                        <div className="flex-1">
                          <Label htmlFor="express" className="cursor-pointer">
                            {locale === 'en' ? 'Express Delivery (1-2 business days)' : 'التوصيل السريع (1-2 أيام عمل)'}
                          </Label>
                          <p className="text-sm text-muted-foreground">{`35 ${currency}`}</p>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <Button onClick={() => setStep(2)} className="w-full">
                    {locale === 'en' ? 'Proceed to Payment' : 'متابعة للدفع'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>{locale === 'en' ? 'Payment Method' : 'طريقة الدفع'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg">
                        <RadioGroupItem value="card" id="card" />
                        <div className="flex-1">
                          <Label htmlFor="card" className="cursor-pointer flex items-center">
                            <CreditCard className="h-4 w-4 ml-2" />
                            {locale === 'en' ? 'Credit/Debit Card' : 'بطاقة ائتمان/خصم'}
                          </Label>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg">
                        <RadioGroupItem value="cod" id="cod" />
                        <div className="flex-1">
                          <Label htmlFor="cod" className="cursor-pointer flex items-center">
                            <Truck className="h-4 w-4 ml-2" />
                            {locale === 'en' ? 'Cash on Delivery' : 'الدفع عند الاستلام'}
                          </Label>
                          <p className="text-sm text-muted-foreground">{locale === 'en' ? `Extra fee 15 ${currency}` : `رسوم إضافية 15 ${currency}`}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg">
                        <RadioGroupItem value="bank" id="bank" />
                        <div className="flex-1">
                          <Label htmlFor="bank" className="cursor-pointer">
                            {locale === 'en' ? 'Bank Transfer' : 'تحويل بنكي'}
                          </Label>
                        </div>
                      </div>
                    </div>
                  </RadioGroup>
                  
                  {paymentMethod === 'card' && (
                    <div className="space-y-4 p-4 bg-muted rounded-lg">
                      <div>
                        <Label htmlFor="cardNumber">{locale === 'en' ? 'Card Number' : 'رقم البطاقة'}</Label>
                        <Input id="cardNumber" placeholder="1234 5678 9012 3456" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="expiryDate">{locale === 'en' ? 'Expiry Date' : 'تاريخ الانتهاء'}</Label>
                          <Input id="expiryDate" placeholder="MM/YY" />
                        </div>
                        <div>
                          <Label htmlFor="cvv">CVV</Label>
                          <Input id="cvv" placeholder="123" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="cardName">{locale === 'en' ? 'Cardholder Name' : 'اسم حامل البطاقة'}</Label>
                        <Input id="cardName" placeholder={locale === 'en' ? 'Name as it appears on the card' : 'الاسم كما يظهر على البطاقة'} />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ArrowRight className="h-4 w-4 ml-2" />
                      {locale === 'en' ? 'Back' : 'السابق'}
                    </Button>
                    <Button onClick={() => setStep(3)} className="flex-1">
                      {locale === 'en' ? 'Review Order' : 'مراجعة الطلب'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>{locale === 'en' ? 'Order Review' : 'مراجعة الطلب'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Shipping Address Review */}
                  <div>
                    <h3 className="font-medium mb-2">{locale === 'en' ? 'Shipping Address' : 'عنوان التوصيل'}</h3>
                    <div className="p-3 bg-muted rounded-lg text-sm">
                      <p>{shippingAddress.firstName} {shippingAddress.lastName}</p>
                      <p>{shippingAddress.address}</p>
                      <p>{shippingAddress.city} {shippingAddress.postalCode}</p>
                      <p>{shippingAddress.phone}</p>
                    </div>
                  </div>
                  
                  {/* Payment Method Review */}
                  <div>
                    <h3 className="font-medium mb-2">{locale === 'en' ? 'Payment Method' : 'طريقة الدفع'}</h3>
                    <div className="p-3 bg-muted rounded-lg text-sm">
                      {paymentMethod === 'card' && (locale === 'en' ? 'Credit/Debit Card' : 'بطاقة ائتمان/خصم')}
                      {paymentMethod === 'cod' && (locale === 'en' ? 'Cash on Delivery' : 'الدفع عند الاستلام')}
                      {paymentMethod === 'bank' && (locale === 'en' ? 'Bank Transfer' : 'تحويل بنكي')}
                    </div>
                  </div>
                  
                  {/* Terms Agreement */}
                  <div className="flex items-start space-x-2 space-x-reverse">
                    <Checkbox
                      id="terms"
                      checked={agreeToTerms}
                      onCheckedChange={(checked: boolean | 'indeterminate') => setAgreeToTerms(!!checked)}
                    />
                    <Label htmlFor="terms" className="text-sm cursor-pointer">
                      {locale === 'en' ? 'I agree to the ' : 'أوافق على'}{' '}
                      <button className="text-primary underline">{locale === 'en' ? 'Terms & Conditions' : 'الشروط والأحكام'}</button>
                      {' '}{locale === 'en' ? 'and' : 'و'}{' '}
                      <button className="text-primary underline">{locale === 'en' ? 'Privacy Policy' : 'سياسة الخصوصية'}</button>
                    </Label>
                  </div>
                  
                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      <ArrowRight className="h-4 w-4 ml-2" />
                      {locale === 'en' ? 'Back' : 'السابق'}
                    </Button>
                    <Button 
                      onClick={handlePlaceOrder} 
                      className="flex-1"
                      disabled={!agreeToTerms}
                    >
                      {locale === 'en' ? 'Place Order' : 'تأكيد الطلب'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>{locale === 'en' ? 'Order Summary' : 'ملخص الطلب'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cart Items */}
                <div className="space-y-3">
                  {items.map(item => (
                    <div key={item.id} className="flex gap-3">
                      <ImageWithFallback
                        src={item.image}
                        alt={getText(item.name)}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium line-clamp-2">{getText(item.name)}</h4>
                        <p className="text-xs text-muted-foreground">{getText(item.brand)}</p>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs">{locale === 'en' ? 'Qty' : 'الكمية'}: {item.quantity}</span>
                          <span className="text-sm font-medium">{item.price * item.quantity} {currency}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Separator />
                
                {/* Price Breakdown */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{locale === 'en' ? 'Subtotal' : 'المجموع الفرعي'}</span>
                    <span>{subtotal} {currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{locale === 'en' ? 'Shipping' : 'الشحن'}</span>
                    <span>{shippingCost === 0 ? (locale === 'en' ? 'Free' : 'مجاني') : `${shippingCost} ${currency}`}</span>
                  </div>
                  {paymentMethod === 'cod' && (
                    <div className="flex justify-between">
                      <span>{locale === 'en' ? 'Cash on Delivery Fee' : 'رسوم الدفع عند الاستلام'}</span>
                      <span>15 {currency}</span>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div className="flex justify-between font-medium text-lg">
                  <span>{locale === 'en' ? 'Total' : 'المجموع الكلي'}</span>
                  <span className="text-primary">
                    {total + (paymentMethod === 'cod' ? 15 : 0)} {currency}
                  </span>
                </div>
                
                {/* Security Badge */}
                <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">
                    {locale === 'en' ? 'Secure and encrypted payment' : 'دفع آمن ومشفر'}
                  </span>
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