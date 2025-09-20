"use client";
import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Eye, ShoppingCart, DollarSign, Users, Calendar, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
// Recharts must be client-only in pages/ during prerender/export
// We'll require it after mount and gate rendering until it's available
import { RouteContext } from '../../components/Router';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useTranslation } from '../../hooks/useTranslation';
import { getPerformanceSummary, getPerformanceSeries, getCustomersSummary, getCustomersSeries, getTopProducts, getCategorySales, type PerformanceSummary, type PerformanceSeriesPoint, type CustomersSummary, type CustomersSeriesPoint, type TopProduct, type CategorySales } from '@/services/vendorAnalytics';
import { useFirstLoadOverlay } from '../../hooks/useFirstLoadOverlay';

type VendorAnalyticsProps = Partial<RouteContext>;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function VendorAnalytics({ setCurrentPage, ...context }: VendorAnalyticsProps) {

  const [mounted, setMounted] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const { t, locale } = useTranslation();
  const safeSetCurrentPage = setCurrentPage ?? (() => {});
  const hideFirstOverlay = useFirstLoadOverlay(context, locale==='ar'?'جاري تحميل التحليلات':'Loading analytics', locale==='ar'?'يرجى الانتظار':'Please wait');

  const [perfSummary, setPerfSummary] = useState<PerformanceSummary | null>(null);
  const [perfSeries, setPerfSeries] = useState<PerformanceSeriesPoint[]>([]);
  const [custSummary, setCustSummary] = useState<CustomersSummary | null>(null);
  const [custSeries, setCustSeries] = useState<CustomersSeriesPoint[]>([]);
  const [topProds, setTopProds] = useState<TopProduct[]>([]);
  const [catSales, setCatSales] = useState<CategorySales[]>([]);
  const [loading, setLoading] = useState(true);

  const salesData = useMemo(() => {
    const monthName = (key: string) => {
      const [y, m] = key.split('-').map(Number);
      const d = new Date(y, (m || 1) - 1, 1);
      return d.toLocaleDateString(locale === 'en' ? 'en' : 'ar', { month: 'long' });
    };
    return (perfSeries || []).map(p => ({
      month: monthName(p.key),
      sales: Number(p.sales || 0),
      orders: Number(p.orders || 0),
      views: Number(p.orders || 0),
      customers: 0,
    }));
  }, [perfSeries, locale]);

  const customerData = useMemo(() => {
    const monthName = (key: string) => {
      const [y, m] = key.split('-').map(Number);
      const d = new Date(y, (m || 1) - 1, 1);
      return d.toLocaleDateString(locale === 'en' ? 'en' : 'ar', { month: 'long' });
    };
    return (custSeries || []).map(c => ({
      month: monthName(c.key),
      new: Number((c as any).new || 0),
      returning: Number(c.returning || 0),
      total: Number(c.total || 0),
    }));
  }, [custSeries, locale]);

  const totalSales = useMemo(() => salesData.reduce((sum, i) => sum + Number(i.sales || 0), 0), [salesData]);
  const totalOrders = useMemo(() => salesData.reduce((sum, i) => sum + Number(i.orders || 0), 0), [salesData]);
  const totalViews = useMemo(() => salesData.reduce((sum, i) => sum + Number(i.views || 0), 0), [salesData]);
  const averageOrderValue = totalOrders > 0 ? (totalSales / totalOrders) : 0;
  const conversionRate = totalViews > 0 ? ((totalOrders / totalViews) * 100) : 0;

  const getGrowthPercentage = (data: any[], key: string) => {
    if (data.length < 2) return 0;
    const current = Number(data[data.length - 1][key] || 0);
    const previous = Number(data[data.length - 2][key] || 0);
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const salesGrowth = getGrowthPercentage(salesData, 'sales');
  const ordersGrowth = getGrowthPercentage(salesData, 'orders');
  const viewsGrowth = getGrowthPercentage(salesData, 'views');

  // Load recharts on client only
  const [R, setR] = useState<any>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let active = true;
      import('recharts')
        .then((mod) => { if (active) setR(mod as any); })
        .catch(() => {});
      return () => { active = false; };
    }
  }, [hideFirstOverlay]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ps, pser, cs, cser, tp, cats] = await Promise.all([
          getPerformanceSummary(),
          getPerformanceSeries(6),
          getCustomersSummary(),
          getCustomersSeries(6),
          getTopProducts(10),
          getCategorySales(),
        ]);
        if (!cancelled) {
          if (ps.ok) setPerfSummary(ps.data as PerformanceSummary);
          if (pser.ok) setPerfSeries(pser.data as PerformanceSeriesPoint[]);
          if (cs.ok) setCustSummary(cs.data as CustomersSummary);
          if (cser.ok) setCustSeries(cser.data as CustomersSeriesPoint[]);
          if (tp.ok) setTopProds(tp.data as TopProduct[]);
          if (cats.ok) setCatSales(cats.data as CategorySales[]);
        }
      } catch {}
      if (!cancelled) { setMounted(true); setLoading(false); hideFirstOverlay(); }
    })();
    return () => { cancelled = false; };
  }, [hideFirstOverlay]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header currentPage="vendor-analytics" setCurrentPage={setCurrentPage} {...context} />
      
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('vendorAnalyticsTitle')}</h1>
            <p className="text-muted-foreground">{t('vendorAnalyticsSubtitle')}</p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('vaTotalSales')}</p>
                  <h3 className="text-2xl font-bold">{totalSales.toLocaleString(locale === 'en' ? 'en' : 'ar')} {locale === 'en' ? 'SAR' : 'ر.س'}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    {salesGrowth >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={`text-xs ${salesGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {salesGrowth >= 0 ? '+' : ''}{salesGrowth.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('vaTotalOrders')}</p>
                  <h3 className="text-2xl font-bold">{totalOrders}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    {ordersGrowth >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={`text-xs ${ordersGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {ordersGrowth >= 0 ? '+' : ''}{ordersGrowth.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <ShoppingCart className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('vaTotalViews')}</p>
                  <h3 className="text-2xl font-bold">{totalViews.toLocaleString(locale === 'en' ? 'en' : 'ar')}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    {viewsGrowth >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={`text-xs ${viewsGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {viewsGrowth >= 0 ? '+' : ''}{viewsGrowth.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('vaAvgOrderValue')}</p>
                  <h3 className="text-2xl font-bold">{Math.round(averageOrderValue).toLocaleString(locale === 'en' ? 'en' : 'ar')} {locale === 'en' ? 'SAR' : 'ر.س'}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{t('vaPerOrder')}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('vaConversionRate')}</p>
                  <h3 className="text-2xl font-bold">{conversionRate.toFixed(1)}%</h3>
                  <p className="text-xs text-muted-foreground mt-1">{t('vaFromViews')}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="sales" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sales">{t('vaTabSales')}</TabsTrigger>
            <TabsTrigger value="products">{t('vaTabProducts')}</TabsTrigger>
            <TabsTrigger value="customers">{t('vaTabCustomers')}</TabsTrigger>
            <TabsTrigger value="categories">{t('vaTabCategories')}</TabsTrigger>
          </TabsList>

          {/* Sales tab: Area + Line charts */}
          <TabsContent value="sales" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('vaSalesTrend')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {R && (
                    <R.ResponsiveContainer width="100%" height={300}>
                      <R.AreaChart data={salesData}>
                        <R.CartesianGrid strokeDasharray="3 3" />
                        <R.XAxis dataKey="month" />
                        <R.YAxis />
                        <R.Tooltip />
                        <R.Area type="monotone" dataKey="sales" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                      </R.AreaChart>
                    </R.ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('vaOrdersAndViews')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {R && (
                    <R.ResponsiveContainer width="100%" height={300}>
                      <R.LineChart data={salesData}>
                        <R.CartesianGrid strokeDasharray="3 3" />
                        <R.XAxis dataKey="month" />
                        <R.YAxis />
                        <R.Tooltip />
                        <R.Line type="monotone" dataKey="orders" stroke="#82ca9d" strokeWidth={2} name={t('vaOrdersLabel')} />
                        <R.Line type="monotone" dataKey="views" stroke="#ffc658" strokeWidth={2} name={t('vaViewsLabel')} />
                      </R.LineChart>
                    </R.ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Products tab: list */}
          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('vaTopProductsPerformance')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(topProds.length ? topProds : []).map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{product.name}</h4>
                        <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">{t('vaOrdersLabel')}: </span>
                            <span className="font-medium">{Number(product.orders||0).toLocaleString(locale === 'en' ? 'en' : 'ar')}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('vaRevenueLabel')}: </span>
                            <span className="font-medium text-primary">{Number(product.revenue||0).toLocaleString(locale === 'en' ? 'en' : 'ar')} {locale === 'en' ? 'SAR' : 'ر.س'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!loading && topProds.length === 0) && (
                    <div className="text-sm text-muted-foreground">{locale==='ar'?'لا توجد بيانات منتجات بعد':'No product data yet'}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customers tab: bar chart */}
          <TabsContent value="customers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('vaCustomersStats')}</CardTitle>
              </CardHeader>
              <CardContent>
                {R && (
                  <R.ResponsiveContainer width="100%" height={300}>
                    <R.BarChart data={customerData}>
                      <R.CartesianGrid strokeDasharray="3 3" />
                      <R.XAxis dataKey="month" />
                      <R.YAxis />
                      <R.Tooltip />
                      <R.Bar dataKey="new" fill="#8884d8" name={locale === 'en' ? 'New Customers' : 'عملاء جدد'} />
                      <R.Bar dataKey="returning" fill="#82ca9d" name={locale === 'en' ? 'Returning Customers' : 'عملاء عائدون'} />
                    </R.BarChart>
                  </R.ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories tab: pie + legend list */}
          <TabsContent value="categories" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('vaSalesByCategory')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {R && (
                    <R.ResponsiveContainer width="100%" height={300}>
                      <R.PieChart>
                        <R.Pie
                          data={catSales}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {catSales.map((entry, index) => (
                            <R.Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </R.Pie>
                        <R.Tooltip />
                      </R.PieChart>
                    </R.ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('vaRevenueByCategory')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {catSales.map((category, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span>{category.name}</span>
                        </div>
                        <div className="text-left">
                          <div className="font-medium">{Number(category.sales||0).toLocaleString(locale === 'en' ? 'en' : 'ar')} {locale === 'en' ? 'SAR' : 'ر.س'}</div>
                          <div className="text-sm text-muted-foreground">{Number(category.value||0)}% {t('vaOfSales')}</div>
                        </div>
                      </div>
                    ))}
                    {(!loading && catSales.length === 0) && (
                      <div className="text-sm text-muted-foreground">{locale==='ar'?'لا توجد بيانات فئات بعد':'No category data yet'}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <Footer setCurrentPage={safeSetCurrentPage} />
      </div>
    </div>
  );
}