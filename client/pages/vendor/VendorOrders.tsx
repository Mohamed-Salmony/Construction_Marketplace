'use client';
import { useState, useEffect } from 'react';
import { Package, Eye, Download, Filter, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { RouteContext } from '../../components/Router';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { getStatusColor, formatCurrency, formatDate } from '../../utils/vendorHelpers';
import { listVendorOrders as apiListVendorOrders, updateOrderStatus as apiUpdateOrderStatus } from '@/services/orders';
import { useTranslation } from '../../hooks/useTranslation';
import { useFirstLoadOverlay } from '../../hooks/useFirstLoadOverlay';

type VendorOrdersProps = Partial<RouteContext>;

type UIOrder = {
  id: string;
  customer: string;
  customerEmail: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  status: string;
  date: string;
  shippingAddress?: string;
};

export default function VendorOrders({ setCurrentPage, ...context }: VendorOrdersProps) {

  const [mounted, setMounted] = useState(false);
  const [orders, setOrders] = useState<UIOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<UIOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const { t, locale } = useTranslation();
  const isAr = locale === 'ar';
  const hideFirstOverlay = useFirstLoadOverlay(context, isAr ? 'جاري تحميل الطلبات' : 'Loading orders', isAr ? 'يرجى الانتظار' : 'Please wait');

  // Safe navigation fallback to avoid undefined setter and preserve SPA context
  const safeSetCurrentPage = setCurrentPage ?? (() => {});

  const filterOrders = () => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.id.includes(searchTerm) ||
        order.customer.includes(searchTerm) ||
        order.customerEmail.includes(searchTerm)
      );
    }

    if (selectedStatus && selectedStatus !== 'all') {
      filtered = filtered.filter(order => order.status === selectedStatus);
    }

    setFilteredOrders(filtered);
  };

  useEffect(() => {
    filterOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedStatus, orders, hideFirstOverlay]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const r = await apiUpdateOrderStatus(orderId, newStatus);
      if (r.ok) {
        setOrders(prev => prev.map(order => order.id === orderId ? { ...order, status: newStatus } : order));
      }
    } catch {}
  };

  const getOrderStats = () => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const shippedOrders = orders.filter(o => o.status === 'shipped').length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;

    return { totalOrders, pendingOrders, shippedOrders, deliveredOrders };
  };

  const stats = getOrderStats();

  useEffect(() => {
    setMounted(true);
    // Load vendor orders from backend
    (async () => {
      try {
        const { ok, data } = await apiListVendorOrders({ vendorId: 'me' });

        if (ok && Array.isArray(data)) {
          const mapped: UIOrder[] = data.map((o: any) => ({
            id: String(o.id),
            customer: o.customerName || o.customer || '-',
            customerEmail: o.customerEmail || '',
            items: Array.isArray((o as any).items) ? (o.items as any[]).map(it => ({ name: it.name || '-', quantity: Number(it.quantity||1), price: Number(it.price||0) })) : [],
            total: Number(o.total || 0),
            status: String(o.status || 'pending'),
            date: o.createdAt || new Date().toISOString(),
            shippingAddress: (o as any).shippingAddress || undefined,
          }));
          setOrders(mapped);
          setFilteredOrders(mapped);
        }
      } catch {}
      finally { hideFirstOverlay(); }
    })();
  }, [hideFirstOverlay]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header currentPage="vendor-orders" setCurrentPage={safeSetCurrentPage} {...context} />
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('vendorOrdersTitle')}</h1>
            <p className="text-muted-foreground">{t('vendorOrdersSubtitle')}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('totalOrdersLabel')}</p>
                  <h3 className="text-2xl font-bold">{stats.totalOrders}</h3>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('pendingLabel')}</p>
                  <h3 className="text-2xl font-bold">{stats.pendingOrders}</h3>
                </div>
                <Package className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('shippedLabel')}</p>
                  <h3 className="text-2xl font-bold">{stats.shippedOrders}</h3>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('deliveredLabel')}</p>
                  <h3 className="text-2xl font-bold">{stats.deliveredOrders}</h3>
                </div>
                <Package className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder={t('searchOrdersPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>
              
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('orderStatusPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatusesLabel')}</SelectItem>
                  <SelectItem value="pending">{t('pendingLabel')}</SelectItem>
                  <SelectItem value="processing">{t('processingLabel')}</SelectItem>
                  <SelectItem value="shipped">{t('shippedLabel')}</SelectItem>
                  <SelectItem value="delivered">{t('deliveredLabel')}</SelectItem>
                  <SelectItem value="cancelled">{t('cancelledLabel')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('ordersListTitle')} ({filteredOrders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredOrders.map(order => (
                <div key={order.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-medium">{t('orderNumber')} {order.id}</h3>
                      <p className="text-sm text-muted-foreground">{order.customer}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(order.date, isAr ? 'ar' : 'en')}</p>
                    </div>
                    <div className="text-left">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status === 'pending' && t('pendingLabel')}
                        {order.status === 'processing' && t('processingLabel')}
                        {order.status === 'shipped' && t('shippedLabel')}
                        {order.status === 'delivered' && t('deliveredLabel')}
                        {order.status === 'cancelled' && t('cancelledLabel')}
                      </Badge>
                      <p className="font-medium mt-1">{formatCurrency(order.total, locale === 'en' ? 'en' : 'ar')}</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">{t('productsLabel')}</h4>
                    <div className="space-y-1">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.name} × {item.quantity}</span>
                          <span>{formatCurrency(item.price * item.quantity, locale === 'en' ? 'en' : 'ar')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      {t('deliveryAddress')} {order.shippingAddress}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Package className="h-4 w-4 ml-2" />
                        {t('viewDetails')}
                      </Button>
                      {order.status === 'pending' && (
                        <Button 
                          size="sm"
                          onClick={() => updateOrderStatus(order.id, 'processing')}
                        >
                          {t('processOrder')}
                        </Button>
                      )}
                      {order.status === 'processing' && (
                        <Button 
                          size="sm"
                          onClick={() => updateOrderStatus(order.id, 'shipped')}
                        >
                          {t('shipOrder')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer setCurrentPage={safeSetCurrentPage} />
    </div>
  );
}