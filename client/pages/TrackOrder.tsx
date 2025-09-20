import { useEffect, useMemo, useState } from 'react';
import { RouteContext } from '../components/Router';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useTranslation } from '../hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Truck, Package, CheckCircle, Clock } from 'lucide-react';
import { getOrderById, listMyOrders, type OrderDto } from '@/services/orders';

type OrderStatus = 'delivered' | 'shipped' | 'processing' | string;

export default function TrackOrder({ user, setCurrentPage, goBack }: RouteContext) {
  const { locale } = useTranslation();
  const [recentOrders, setRecentOrders] = useState<OrderDto[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) { setRecentOrders([]); return; }
      setLoadingRecent(true);
      try {
        const { ok, data } = await listMyOrders();
        if (!cancelled) setRecentOrders(ok && Array.isArray(data) ? data! : []);
      } finally {
        if (!cancelled) setLoadingRecent(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  useEffect(() => {
    const id = (selectedId || query).trim();
    let cancelled = false;
    const run = async () => {
      if (!id) { setOrder(null); return; }
      setLoadingOrder(true);
      try {
        const { ok, data } = await getOrderById(id);
        if (!cancelled) setOrder(ok ? (data as any) : null);
      } finally {
        if (!cancelled) setLoadingOrder(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [query, selectedId]);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'shipped': return 'bg-blue-100 text-blue-700';
      case 'processing': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  const getStatusText = (status: OrderStatus) => {
    const map: Record<string, { ar: string; en: string }> = {
      delivered: { ar: 'تم التوصيل', en: 'Delivered' },
      shipped: { ar: 'في الطريق', en: 'Shipped' },
      processing: { ar: 'قيد المعالجة', en: 'Processing' }
    };
    const entry = map[status];
    return locale === 'en' ? entry.en : entry.ar;
  };

  const steps: { key: OrderStatus; labelAr: string; labelEn: string; icon: React.ReactNode }[] = [
    { key: 'processing', labelAr: 'قيد المعالجة', labelEn: 'Processing', icon: <Clock className="h-4 w-4" /> },
    { key: 'shipped', labelAr: 'في الطريق', labelEn: 'Shipped', icon: <Truck className="h-4 w-4" /> },
    { key: 'delivered', labelAr: 'تم التوصيل', labelEn: 'Delivered', icon: <CheckCircle className="h-4 w-4" /> },
  ];

  const activeIndex = order ? steps.findIndex(s => s.key === (order.status as any)) : -1;

  return (
    <div className="min-h-screen bg-background" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <Header currentPage="track-order" setCurrentPage={setCurrentPage} user={user} goBack={goBack} />
      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Search / Picker */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>{locale==='en'?'Track Order':'تتبع الطلب'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="orderId">{locale==='en'?'Order ID':'رقم الطلب'}</Label>
                  <Input id="orderId" value={query} onChange={e=>setQuery(e.target.value)} placeholder={locale==='en'?'e.g. ORD-001':'مثال: ORD-001'} />
                  <p className="text-xs text-muted-foreground mt-1">{locale==='en'?'Enter your order ID to track status':'أدخل رقم الطلب لتتبع حالته'}</p>
                </div>
                <div>
                  <Label>{locale==='en'?'Recent Orders':'الطلبات الأخيرة'}</Label>
                  <div className="mt-2 space-y-2 max-h-60 overflow-auto">
                    {loadingRecent ? (
                      <div className="text-xs text-muted-foreground">{locale==='en'?'Loading...':'جاري التحميل...'}</div>
                    ) : recentOrders.length === 0 ? (
                      <div className="text-xs text-muted-foreground">{locale==='en'?'No recent orders':'لا توجد طلبات'}</div>
                    ) : (
                      recentOrders.map(o => (
                        <div key={String(o.id)} className={`p-3 border rounded-lg flex items-center justify-between cursor-pointer ${selectedId===String(o.id)?'border-primary ring-1 ring-primary/30':''}`} onClick={()=>setSelectedId(String(o.id))}>
                          <div>
                            <div className="font-medium">{String(o.id)}</div>
                            <div className="text-xs text-muted-foreground">{o.createdAt || ''}{(o as any).itemsCount ? ` • ${(o as any).itemsCount} ${locale==='en'?'item(s)':'منتج'}`:''}</div>
                          </div>
                          <Badge className={getStatusColor((o.status as any) as OrderStatus)}>{getStatusText((o.status as any) as OrderStatus)}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{order ? `${locale==='en'?'Order':'طلب'} # ${String(order.id)}` : (locale==='en'?'Enter or select an order':'أدخل أو اختر طلباً')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {loadingOrder ? (
                  <div className="text-center text-muted-foreground py-10">{locale==='en'?'Loading order...':'جاري تحميل الطلب...'}</div>
                ) : !order ? (
                  <div className="text-center text-muted-foreground py-10">
                    {locale==='en'?'No order selected':'لم يتم اختيار طلب'}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <Badge className={getStatusColor((order.status as any) as OrderStatus)}>{getStatusText((order.status as any) as OrderStatus)}</Badge>
                      <div className="text-sm text-muted-foreground">{order.createdAt || ''}</div>
                      {(order as any).itemsCount ? (
                        <div className="text-sm text-muted-foreground">{(order as any).itemsCount} {locale==='en'?'item(s)':'منتج'}</div>
                      ) : null}
                      {typeof order.total === 'number' && (
                        <div className="font-medium ms-auto">{order.total} {locale==='en'?'SAR':'ر.س'}</div>
                      )}
                    </div>

                    {/* Timeline */}
                    <div className="relative">
                      <div className="flex items-center justify-between">
                        {steps.map((s, idx) => {
                          const active = idx <= activeIndex;
                          return (
                            <div key={s.key} className="flex-1 flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${active? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{s.icon}</div>
                              <div className="text-xs mt-2">{locale==='en'?s.labelEn:s.labelAr}</div>
                              {idx < steps.length-1 && (
                                <div className={`h-1 w-full ${activeIndex>idx? 'bg-primary' : 'bg-muted'}`}></div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={()=>setCurrentPage('my-orders')}>{locale==='en'?'Back to My Orders':'العودة لطلباتي'}</Button>
                      <Button onClick={()=>setCurrentPage('support')} variant="ghost"><Package className="h-4 w-4 ml-2" />{locale==='en'?'Need Help?':'تحتاج مساعدة؟'}</Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}