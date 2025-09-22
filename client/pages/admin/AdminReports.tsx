import React from 'react';
import Header from '../../components/Header';
import type { RouteContext } from '../../components/Router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Users, Package, ArrowRight, Tag, Plus, Percent } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { getAdminAnalyticsOverview, getAdminOption, setAdminOption } from '@/services/admin';
import { getPromoCodes } from '@/services/promoCodes';
import { toastSuccess, toastError } from '../../utils/alerts';
import { useFirstLoadOverlay } from '../../hooks/useFirstLoadOverlay';

export default function AdminReports({ setCurrentPage, ...context }: Partial<RouteContext>) {
  const { t, locale } = useTranslation();
  const hideFirstOverlay = useFirstLoadOverlay(context, locale==='ar' ? 'جاري تحميل التقارير' : 'Loading reports', locale==='ar' ? 'يرجى الانتظار' : 'Please wait');
  const nf = (n: number, cur: string) => `${new Intl.NumberFormat(locale==='ar'?'ar-EG':'en-US').format(n)} ${cur==='SAR'?'SAR':cur}`;

  const [stats, setStats] = React.useState<{ totalUsers: number }>({ totalUsers: 0 });
  const [sales, setSales] = React.useState<{ daily: number; weekly: number; monthly: number; yearly: number; currency: string }>({ daily: 0, weekly: 0, monthly: 0, yearly: 0, currency: 'SAR' });
  const [growthPct, setGrowthPct] = React.useState<{ customers: number; merchants: number; technicians: number }>({ customers: 0, merchants: 0, technicians: 0 });
  const [finance, setFinance] = React.useState<{ monthlyRevenue: number; platformCommission: number; pendingVendorPayouts: number; currency: string }>({ monthlyRevenue: 0, platformCommission: 0, pendingVendorPayouts: 0, currency: 'SAR' });
  const [inventory, setInventory] = React.useState<{ totalInStockItems: number; lowStockAlerts: number }>({ totalInStockItems: 0, lowStockAlerts: 0 });
  const [counts, setCounts] = React.useState<{ ordersMonth: number; rentalsMonth: number; projectsAccepted: number; servicesAccepted: number }>({ ordersMonth: 0, rentalsMonth: 0, projectsAccepted: 0, servicesAccepted: 0 });
  const [promoStats, setPromoStats] = React.useState({ total: 0, active: 0, expired: 0, totalUsages: 0 });


  React.useEffect(() => {
    (async () => {
      try {
        const [overview, promos] = await Promise.all([
          getAdminAnalyticsOverview(),
          getPromoCodes({ limit: 1 }), // Just get stats
        ]);
        if (overview.ok && overview.data) {
          const ov: any = overview.data;
          setStats({ totalUsers: Number(ov?.stats?.totalUsers || 0) });
          setSales({
            daily: Number(ov?.sales?.daily || 0),
            weekly: Number(ov?.sales?.weekly || 0),
            monthly: Number(ov?.sales?.monthly || 0),
            yearly: Number(ov?.sales?.yearly || 0),
            currency: String(ov?.sales?.currency || 'SAR'),
          });
          const ts = Number(ov?.stats?.totalUsers ?? 0);
          const cust = Number(ov?.stats?.customers ?? 0);
          const merch = Number(ov?.stats?.merchants ?? 0);
          const tech = Number(ov?.stats?.technicians ?? 0);
          const denomRaw = ts > 0 ? ts : (cust + merch + tech);
          const denom = Number.isFinite(denomRaw) && denomRaw > 0 ? denomRaw : 1;
          const pct = (value: number) => {
            const v = Number(value);
            if (!Number.isFinite(v) || !Number.isFinite(denom) || denom <= 0) return 0;
            const p = Math.round((v / denom) * 100);
            return Math.max(0, Math.min(100, Number.isFinite(p) ? p : 0));
          };
          setGrowthPct({
            customers: pct(cust),
            merchants: pct(merch),
            technicians: pct(tech),
          });
          setFinance({
            monthlyRevenue: Number(ov?.finance?.monthlyRevenue || 0),
            platformCommission: Number(ov?.finance?.platformCommission || 0),
            pendingVendorPayouts: Number(ov?.finance?.pendingVendorPayouts || 0),
            currency: String(ov?.finance?.currency || 'SAR'),
          });
          setInventory({
            totalInStockItems: Number(ov?.inventory?.totalInStockItems || 0),
            lowStockAlerts: Number(ov?.inventory?.lowStockAlerts || 0),
          });
          setCounts({
            ordersMonth: Number(ov?.counts?.ordersMonth || 0),
            rentalsMonth: Number(ov?.counts?.rentalsMonth || 0),
            projectsAccepted: Number(ov?.counts?.projectsAccepted || 0),
            servicesAccepted: Number(ov?.counts?.servicesAccepted || 0),
          });
        }

        // Load promo codes stats
        if (promos.ok && promos.data) {
          setPromoStats(promos.data.stats || { total: 0, active: 0, expired: 0, totalUsages: 0 });
        }
      } catch (e) {
        console.error('Failed to load reports data', e);
      } finally { hideFirstOverlay(); }
    })();
  }, [locale, hideFirstOverlay]);
  return (
    <div className="min-h-screen bg-background">
      <Header {...context} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Button variant="outline" onClick={() => setCurrentPage && setCurrentPage('admin-dashboard')} className="mr-4">
              <ArrowRight className="ml-2 h-4 w-4" />
              {t('backToDashboard')}
            </Button>
          </div>
          <h1 className="mb-2">{t('reportsAndAnalytics')}</h1>
          <p className="text-muted-foreground">{t('adminReportsSubtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {t('totalRevenue')} <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{nf(sales.yearly || sales.monthly, sales.currency)}</div>
              <div className="mt-4" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {locale==='ar' ? 'طلبات هذا الشهر' : 'Orders This Month'} <Package className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{new Intl.NumberFormat(locale==='ar'?'ar-EG':'en-US').format(counts.ordersMonth)}</div>
              <div className="text-xs text-muted-foreground mt-2">{locale==='ar' ? 'تأجير ضمنها: ' : 'Rentals included: '} {new Intl.NumberFormat(locale==='ar'?'ar-EG':'en-US').format(counts.rentalsMonth)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {locale==='ar' ? 'مشاريع مقبولة (هذا الشهر)' : 'Accepted Projects (This Month)'} <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{new Intl.NumberFormat(locale==='ar'?'ar-EG':'en-US').format(counts.projectsAccepted)}</div>
              <div className="text-xs text-muted-foreground mt-2">{locale==='ar' ? 'خدمات مقبولة: ' : 'Accepted services: '} {new Intl.NumberFormat(locale==='ar'?'ar-EG':'en-US').format(counts.servicesAccepted)}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><BarChart3 className="mr-2 h-5 w-5" /> {t('detailedAnalytics')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="sales" className="space-y-6">
              <TabsList>
                <TabsTrigger value="sales">{t('salesTab')}</TabsTrigger>
                <TabsTrigger value="users">{t('usersTab')}</TabsTrigger>
                <TabsTrigger value="inventory">{t('inventoryTab')}</TabsTrigger>
              </TabsList>
              <TabsContent value="sales">
                <p className="text-sm text-muted-foreground mb-4">{t('salesBreakdownDesc')}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm">{t('dailySales')}</div>
                    <div className="text-xl font-semibold">{nf(sales.daily, sales.currency)}</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm">{t('weeklySales')}</div>
                    <div className="text-xl font-semibold">{nf(sales.weekly, sales.currency)}</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm">{t('monthlySales')}</div>
                    <div className="text-xl font-semibold">{nf(sales.monthly, sales.currency)}</div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="users">
                <p className="text-sm text-muted-foreground mb-4">{t('userGrowthPerRole')}</p>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1"><span>{t('customers')}</span><span>{growthPct.customers}%</span></div>
                    <Progress value={growthPct.customers} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1"><span>{t('vendors')}</span><span>{growthPct.merchants}%</span></div>
                    <Progress value={growthPct.merchants} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1"><span>{t('technicians')}</span><span>{growthPct.technicians}%</span></div>
                    <Progress value={growthPct.technicians} className="h-2" />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="inventory">
                <p className="text-sm text-muted-foreground mb-4">{t('inventoryHealthDesc')}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm">{t('inStockItems')}</div>
                    <div className="text-xl font-semibold">{new Intl.NumberFormat(locale==='ar'?'ar-EG':'en-US').format(inventory.totalInStockItems)}</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm">{t('lowStockAlerts')}</div>
                    <div className="text-xl font-semibold text-amber-600">{new Intl.NumberFormat(locale==='ar'?'ar-EG':'en-US').format(inventory.lowStockAlerts)}</div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Finance + Commissions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card>
            <CardHeader><CardTitle>{locale==='ar'?'الإيرادات الشهرية':'Monthly Revenue'}</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{nf(finance.monthlyRevenue, finance.currency)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{locale==='ar'?'عمولات المنصة':'Platform Commission'}</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{nf(finance.platformCommission, finance.currency)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{locale==='ar'?'مدفوعات معلقة (البائعون)':'Pending Vendor Payouts'}</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{nf(finance.pendingVendorPayouts, finance.currency)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Promo Codes Management */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              {locale==='ar' ? 'إدارة رموز الخصم' : 'Promo Codes Management'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-4 border rounded-lg">
                <Tag className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold text-primary">{promoStats.total}</div>
                <div className="text-sm text-muted-foreground">{locale==='ar' ? 'إجمالي الرموز' : 'Total Codes'}</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold text-green-600">{promoStats.active}</div>
                <div className="text-sm text-muted-foreground">{locale==='ar' ? 'نشط' : 'Active'}</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Users className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                <div className="text-2xl font-bold text-orange-600">{promoStats.totalUsages}</div>
                <div className="text-sm text-muted-foreground">{locale==='ar' ? 'مرات الاستخدام' : 'Total Uses'}</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Package className="h-8 w-8 mx-auto mb-2 text-red-600" />
                <div className="text-2xl font-bold text-red-600">{promoStats.expired}</div>
                <div className="text-sm text-muted-foreground">{locale==='ar' ? 'منتهي الصلاحية' : 'Expired'}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setCurrentPage && setCurrentPage('admin-promo-codes')}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                {locale==='ar' ? 'إدارة رموز الخصم' : 'Manage Promo Codes'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">

        </div>
      </div>
    </div>
  );
}
