import React from 'react';
import Header from '../../components/Header';
import type { RouteContext } from '../../components/Router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Users, Package, ArrowRight } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { getAdminAnalyticsOverview, getAdminOption, setAdminOption } from '@/services/admin';
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
  const [commissions, setCommissions] = React.useState<{ products: number; projectsMerchants: number; servicesTechnicians: number; currency: string; rates?: { products: number; projectsMerchants: number; servicesTechnicians: number } }>({ products: 0, projectsMerchants: 0, servicesTechnicians: 0, currency: 'SAR' });
  const [counts, setCounts] = React.useState<{ ordersMonth: number; rentalsMonth: number; projectsAccepted: number; servicesAccepted: number }>({ ordersMonth: 0, rentalsMonth: 0, projectsAccepted: 0, servicesAccepted: 0 });
  const [commDraft, setCommDraft] = React.useState<{ products: string; projectsMerchants: string; servicesTechnicians: string }>({ products: '', projectsMerchants: '', servicesTechnicians: '' });
  const [savingKey, setSavingKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const [overview, c1, c2, c3] = await Promise.all([
          getAdminAnalyticsOverview(),
          getAdminOption('commission_products'),
          getAdminOption('commission_projects_merchants'),
          getAdminOption('commission_services_technicians'),
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
          setCommissions({
            products: Number(ov?.commissions?.products || 0),
            projectsMerchants: Number(ov?.commissions?.projectsMerchants || 0),
            servicesTechnicians: Number(ov?.commissions?.servicesTechnicians || 0),
            currency: String(ov?.commissions?.currency || 'SAR'),
            rates: {
              products: Number(ov?.commissions?.rates?.products || 0),
              projectsMerchants: Number(ov?.commissions?.rates?.projectsMerchants || 0),
              servicesTechnicians: Number(ov?.commissions?.rates?.servicesTechnicians || 0),
            }
          });
          setCounts({
            ordersMonth: Number(ov?.counts?.ordersMonth || 0),
            rentalsMonth: Number(ov?.counts?.rentalsMonth || 0),
            projectsAccepted: Number(ov?.counts?.projectsAccepted || 0),
            servicesAccepted: Number(ov?.counts?.servicesAccepted || 0),
          });
        }
        const parseNum = (resp: any) => {
          try {
            const raw = JSON.parse(String(resp?.data?.value ?? '0'));
            const n = typeof raw === 'number' ? raw : Number(raw ?? 0);
            return Number.isFinite(n) ? n : 0;
          } catch {
            return 0;
          }
        };
        const p = parseNum(c1); const pm = parseNum(c2); const st = parseNum(c3);
        setCommDraft({
          products: String(Number.isFinite(p) ? p : 0),
          projectsMerchants: String(Number.isFinite(pm) ? pm : 0),
          servicesTechnicians: String(Number.isFinite(st) ? st : 0)
        });
      } catch (e) {
        console.error('Failed to load reports data', e);
      } finally { hideFirstOverlay(); }
    })();
  }, [locale]);
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <Card>
            <CardHeader><CardTitle>{locale==='ar'?'خصم المنتجات (بيع/تأجير)':'Products Commission (Sales/Rentals)'}</CardTitle></CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">{locale==='ar'?'القيمة الشهرية':'Monthly amount'}</div>
              <div className="text-xl font-bold mb-2">{nf(commissions.products, commissions.currency)}</div>
              <div className="flex items-center gap-2">
                <input className="border rounded px-3 py-2 w-24" type="number" min={0} max={100} value={commDraft.products} onChange={(e)=>setCommDraft(s=>({...s,products:e.target.value}))} />
                <Button
                  disabled={savingKey==='cp'}
                  onClick={async ()=>{
                    setSavingKey('cp');
                    try{
                      const v = Number(commDraft.products);
                      const safe = Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0;
                      await setAdminOption('commission_products', safe);
                      setCommDraft(s=>({...s, products: String(safe)}));
                    } finally{ setSavingKey(null);} }
                  }
                > {locale==='ar'?'حفظ':'Save'} </Button>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{locale==='ar'?'النسبة:':'Rate:'} {commissions.rates?.products ?? 0}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{locale==='ar'?'خصم التجار (المشاريع)':'Merchants Commission (Projects)'}</CardTitle></CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">{locale==='ar'?'القيمة الشهرية':'Monthly amount'}</div>
              <div className="text-xl font-bold mb-2">{nf(commissions.projectsMerchants, commissions.currency)}</div>
              <div className="flex items-center gap-2">
                <input className="border rounded px-3 py-2 w-24" type="number" min={0} max={100} value={commDraft.projectsMerchants} onChange={(e)=>setCommDraft(s=>({...s,projectsMerchants:e.target.value}))} />
                <Button
                  disabled={savingKey==='cm'}
                  onClick={async ()=>{
                    setSavingKey('cm');
                    try{
                      const v = Number(commDraft.projectsMerchants);
                      const safe = Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0;
                      await setAdminOption('commission_projects_merchants', safe);
                      setCommDraft(s=>({...s, projectsMerchants: String(safe)}));
                    } finally{ setSavingKey(null);} }
                  }
                >{locale==='ar'?'حفظ':'Save'}</Button>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{locale==='ar'?'النسبة:':'Rate:'} {commissions.rates?.projectsMerchants ?? 0}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{locale==='ar'?'خصم الفنيين (الخدمات)':'Technicians Commission (Services)'}</CardTitle></CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">{locale==='ar'?'القيمة الشهرية':'Monthly amount'}</div>
              <div className="text-xl font-bold mb-2">{nf(commissions.servicesTechnicians, commissions.currency)}</div>
              <div className="flex items-center gap-2">
                <input className="border rounded px-3 py-2 w-24" type="number" min={0} max={100} value={commDraft.servicesTechnicians} onChange={(e)=>setCommDraft(s=>({...s,servicesTechnicians:e.target.value}))} />
                <Button
                  disabled={savingKey==='cs'}
                  onClick={async ()=>{
                    setSavingKey('cs');
                    try{
                      const v = Number(commDraft.servicesTechnicians);
                      const safe = Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0;
                      await setAdminOption('commission_services_technicians', safe);
                      setCommDraft(s=>({...s, servicesTechnicians: String(safe)}));
                    } finally{ setSavingKey(null);} }
                  }
                >{locale==='ar'?'حفظ':'Save'}</Button>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{locale==='ar'?'النسبة:':'Rate:'} {commissions.rates?.servicesTechnicians ?? 0}%</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
