import { useEffect, useState, useCallback } from 'react';

import Swal from 'sweetalert2';
import { RouteContext } from '../components/Router';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useTranslation } from '../hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { listMyOrders, updateOrderStatus, type OrderDto } from '@/services/orders';

type OrderStatus = 'delivered' | 'shipped' | 'processing' | string;

export default function MyOrders({ user, setCurrentPage, goBack, showLoading, hideLoading }: RouteContext) {

  const { locale } = useTranslation();
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      showLoading?.(locale==='ar' ? 'جاري تحميل الطلبات...' : 'Loading orders...');
      const { ok, data } = await listMyOrders();
      setOrders(ok && Array.isArray(data) ? data! : []);
    } finally {
      hideLoading?.();
      setLoading(false);
    }
  }, [hideLoading, locale, showLoading]); // Include dependencies as indicated by ESLint

  useEffect(() => { reload(); }, [reload]);

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

  const cancelOrder = async (id: string | number) => {
    const o = orders.find(x=>String(x.id)===String(id)); if (!o) return;
    const go = await Swal.fire({ title: locale==='en'?'Cancel order?':'إلغاء الطلب؟', icon: 'warning', showCancelButton: true, confirmButtonText: locale==='en'?'Cancel Order':'إلغاء الطلب', cancelButtonText: locale==='en'?'Back':'رجوع' });
    if (!go.isConfirmed) return;
    try { await updateOrderStatus(id, 'Cancelled'); } catch {}
    await reload();
  };
  const confirmDelivered = async (id: string | number) => {
    const o = orders.find(x=>String(x.id)===String(id)); if (!o) return;
    try { await updateOrderStatus(id, 'Delivered'); } catch {}
    await reload();
  };

  return (
    <div className="min-h-screen bg-background" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <Header currentPage="my-orders" setCurrentPage={setCurrentPage} user={user} goBack={goBack} />
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>{locale === 'en' ? 'My Orders' : 'طلباتي'}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-10 text-muted-foreground">
                {locale==='en'? 'Loading orders...' : 'جاري تحميل الطلبات...'}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                {locale === 'en' ? 'No orders yet.' : 'لا توجد طلبات بعد.'}
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={String(order.id)} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{locale === 'en' ? 'Order #' : 'طلب رقم '} {String(order.id)}</h3>
                      <p className="text-sm text-muted-foreground">{order.createdAt || ''}</p>
                      {typeof (order as any).itemsCount === 'number' && (
                        <p className="text-sm text-muted-foreground">{(order as any).itemsCount} {locale === 'en' ? 'item(s)' : 'منتج'}</p>
                      )}
                    </div>
                    <div className="text-left">
                      <Badge className={getStatusColor((order.status as any) as OrderStatus)}>
                        {getStatusText((order.status as any) as OrderStatus)}
                      </Badge>
                      {typeof order.total === 'number' && (
                        <p className="font-medium mt-2">{order.total} {locale === 'en' ? 'SAR' : 'ر.س'}</p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={() => confirmDelivered(order.id as any)}>{locale==='en'?'Confirm Delivery':'تأكيد الاستلام'}</Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => cancelOrder(order.id as any)}>{locale==='en'?'Cancel':'إلغاء'}</Button>
                        <Button size="sm" onClick={() => setCurrentPage('track-order')}>{locale==='en'?'Track Order':'تتبع الطلب'}</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}