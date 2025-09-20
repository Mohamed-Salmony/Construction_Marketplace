import { RouteContext } from '../../components/Router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Progress } from '../../components/ui/progress';
import { 
  Users, 
  Store, 
  Package, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Ban,
  Plus,
  Settings,
  BarChart3,
  PieChart,
  Activity,
  Percent
} from 'lucide-react';
import Header from '../../components/Header';
import { useTranslation } from '../../hooks/useTranslation';
import React from 'react';
import { toastSuccess, toastError } from '../../utils/alerts';
import { getPendingMerchants, approveMerchant, suspendMerchant, getUsers, getPendingProducts, approveProduct, rejectProduct, getAdminAnalyticsOverview, getAdminOption, setAdminOption, approveTechnician, suspendTechnician, AdminUser } from '@/services/admin';
import { getAdminPendingServices, approveService, rejectService } from '@/services/services';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { getProductById } from '@/services/products';

type Trend = 'up' | 'down';

export default function AdminDashboard({ setCurrentPage, ...context }: Partial<RouteContext>) {
  const { t, locale } = useTranslation();
  const isAr = locale === 'ar';

  // State
  const [pendingMerchants, setPendingMerchants] = React.useState<Array<{ id: string; email: string; name: string; companyName?: string; createdAt?: string }>>([]);
  const [pendingServices, setPendingServices] = React.useState<Array<{ id: string; title: string; description?: string; vendorId?: string; createdAt?: string }>>([]);
  const [pendingProducts, setPendingProducts] = React.useState<any[]>([]);
  const [pendingServicesError, setPendingServicesError] = React.useState<string | null>(null);
  const [pendingProductsError, setPendingProductsError] = React.useState<string | null>(null);
  const [pendingTechnicians, setPendingTechnicians] = React.useState<AdminUser[]>([]);

  // Product details dialog state
  const [productDialogOpen, setProductDialogOpen] = React.useState(false);
  const [productDialogLoading, setProductDialogLoading] = React.useState(false);
  const [productDialogData, setProductDialogData] = React.useState<any | null>(null);
  const [merchantDialogOpen, setMerchantDialogOpen] = React.useState(false);
  const [merchantDialogData, setMerchantDialogData] = React.useState<AdminUser | null>(null);
  const [techDialogOpen, setTechDialogOpen] = React.useState(false);
  const [techDialogData, setTechDialogData] = React.useState<AdminUser | null>(null);

  const [stats, setStats] = React.useState({ totalUsers: 0, activeVendors: 0, technicians: 0, pendingCount: 0 });
  const [growthPct, setGrowthPct] = React.useState<{ customers: number; merchants: number; technicians: number }>({ customers: 0, merchants: 0, technicians: 0 });
  const [sales, setSales] = React.useState<{ daily: number; weekly: number; monthly: number; yearly: number; currency: string }>({ daily: 0, weekly: 0, monthly: 0, yearly: 0, currency: 'SAR' });
  const [finance, setFinance] = React.useState<{ monthlyRevenue: number; platformCommission: number; pendingVendorPayouts: number; currency: string }>({ monthlyRevenue: 0, platformCommission: 0, pendingVendorPayouts: 0, currency: 'SAR' });
  const [commissions, setCommissions] = React.useState<{ products: number; projectsMerchants: number; servicesTechnicians: number }>({ products: 0, projectsMerchants: 0, servicesTechnicians: 0 });
  const [commDraft, setCommDraft] = React.useState<{ products: string; projectsMerchants: string; servicesTechnicians: string }>({ products: '', projectsMerchants: '', servicesTechnicians: '' });
  const [quickActions, setQuickActions] = React.useState<Array<{ page: string; labelAr: string; labelEn: string; icon?: string; enabled?: boolean }>>([]);
  const [savingKey, setSavingKey] = React.useState<string | null>(null);

  // ✅ Fixed: Remove dependencies from useCallback
  const loadAll = React.useCallback(async () => {
    try {
      // Use global loading overlay for consistent UX
      (context as any)?.showLoading?.(isAr ? 'جاري تحميل البيانات...' : 'Loading data...');
      // Auto-hide the overlay quickly to avoid blocking the page too long
      let autoHideTimer: any = null;
      try { autoHideTimer = setTimeout(() => { try { (context as any)?.hideLoading?.(); } catch {} }, 600); } catch {}
      const [mer, srv, prod, usersAll, usersActiveVendors, usersTech, overview, c1, c2, c3, qact] = await Promise.all([
        getPendingMerchants(),
        getAdminPendingServices(),
        getPendingProducts(),
        getUsers(),
        getUsers({ role: 'Merchant', status: 'active' }),
        getUsers({ role: 'Technician' }),
        getAdminAnalyticsOverview(),
        getAdminOption('commission_products'),
        getAdminOption('commission_projects_merchants'),
        getAdminOption('commission_services_technicians'),
        getAdminOption('quick_actions'),
      ]);

      let currentPendingMerchants: any[] = [];
      let currentPendingServices: any[] = [];
      let currentPendingProducts: any[] = [];

      if (mer.ok && mer.data && Array.isArray((mer.data as any).items)) {
        currentPendingMerchants = (mer.data as any).items;
        setPendingMerchants(currentPendingMerchants);
      } else {
        setPendingMerchants([]);
      }

      // Load commission settings from AdminOptions
      const parseNum = (resp: any) => {
        try { return Number(JSON.parse(String(resp?.data?.value ?? '0')) || 0); } catch { return 0; }
      };

      const productsC = parseNum(c1);
      const projectsMerchantsC = parseNum(c2);
      const servicesTechC = parseNum(c3);
      setCommissions({ products: productsC, projectsMerchants: projectsMerchantsC, servicesTechnicians: servicesTechC });
      setCommDraft({ products: String(productsC), projectsMerchants: String(projectsMerchantsC), servicesTechnicians: String(servicesTechC) });

      if (srv.ok && srv.data && Array.isArray((srv.data as any).items)) {
        currentPendingServices = (srv.data as any).items;
        setPendingServices(currentPendingServices);
        setPendingServicesError(null);
      } else {
        setPendingServices([]);
        const status = (srv as any)?.status;
        setPendingServicesError(status === 401 || status === 403 ? (isAr ? 'غير مصرح: سجل الدخول كمسؤول' : 'Unauthorized: please login as Admin') : (isAr ? 'تعذر جلب الخدمات قيد الانتظار' : 'Failed to fetch pending services'));
      }

      if (prod.ok && prod.data && Array.isArray((prod.data as any).items)) {
        currentPendingProducts = (prod.data as any).items;
        setPendingProducts(currentPendingProducts);
        setPendingProductsError(null);
      } else {
        setPendingProducts([]);
        const status = (prod as any)?.status;
        setPendingProductsError(status === 401 || status === 403 ? (isAr ? 'غير مصرح: سجل الدخول كمسؤول' : 'Unauthorized: please login as Admin') : (isAr ? 'تعذر جلب المنتجات قيد الانتظار' : 'Failed to fetch pending products'));
      }

      const allUsers = usersAll.ok && usersAll.data && Array.isArray((usersAll.data as any).items) ? (usersAll.data as any).items : [];
      
      // ✅ Set stats from overview when available, otherwise fallback to client-calculated
      if (overview.ok && overview.data) {
        const ov = overview.data as any;
        const ts = Number(ov?.stats?.totalUsers || 0);
        const cust = Number(ov?.stats?.customers || 0);
        const merch = Number(ov?.stats?.merchants || 0);
        const tech = Number(ov?.stats?.technicians || 0);
        const activeVend = Number(ov?.stats?.activeVendors || 0);
        const denom = ts > 0 ? ts : (cust + merch + tech) || 1;
        setStats({
          totalUsers: ts || allUsers.length,
          activeVendors: activeVend,
          technicians: tech,
          pendingCount: currentPendingMerchants.length + currentPendingServices.length + currentPendingProducts.length,
        });
        setGrowthPct({
          customers: Math.round((cust / denom) * 100),
          merchants: Math.round((merch / denom) * 100),
          technicians: Math.round((tech / denom) * 100),
        });
        setSales({
          daily: Number(ov?.sales?.daily || 0),
          weekly: Number(ov?.sales?.weekly || 0),
          monthly: Number(ov?.sales?.monthly || 0),
          yearly: Number(ov?.sales?.yearly || 0),
          currency: String(ov?.sales?.currency || 'SAR'),
        });
        setFinance({
          monthlyRevenue: Number(ov?.finance?.monthlyRevenue || 0),
          platformCommission: Number(ov?.finance?.platformCommission || 0),
          pendingVendorPayouts: Number(ov?.finance?.pendingVendorPayouts || 0),
          currency: String(ov?.finance?.currency || 'SAR'),
        });
      } else {
        // Fallback: compute basic distribution from allUsers if overview not available
        const total = allUsers.length || 1;
        const cust = allUsers.filter((u: any) => /customer/i.test((u.roles?.[0] || ''))).length;
        const merch = allUsers.filter((u: any) => /merchant/i.test((u.roles?.[0] || ''))).length;
        const tech = allUsers.filter((u: any) => /tech|worker/i.test((u.roles?.[0] || ''))).length;
        setStats({
          totalUsers: allUsers.length,
          activeVendors: usersActiveVendors.ok && usersActiveVendors.data ? ((usersActiveVendors.data as any).items || []).length : 0,
          technicians: usersTech.ok && usersTech.data ? ((usersTech.data as any).items || []).length : 0,
          pendingCount: currentPendingMerchants.length + currentPendingServices.length + currentPendingProducts.length,
        });
        setGrowthPct({
          customers: Math.round((cust / total) * 100),
          merchants: Math.round((merch / total) * 100),
          technicians: Math.round((tech / total) * 100),
        });
        setSales({ daily: 0, weekly: 0, monthly: 0, yearly: 0, currency: 'SAR' });
        setFinance({ monthlyRevenue: 0, platformCommission: 0, pendingVendorPayouts: 0, currency: 'SAR' });
      }
      // Derive pending technicians: not yet verified/active
      if (usersTech.ok && usersTech.data && Array.isArray((usersTech.data as any).items)) {
        const techs: AdminUser[] = ((usersTech.data as any).items) as AdminUser[];
        const pendingTechs = techs.filter(u => !u.isVerified || !u.isActive);
        setPendingTechnicians(pendingTechs);
      } else {
        setPendingTechnicians([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setPendingMerchants([]); 
      setPendingServices([]); 
      setPendingProducts([]); 
      setPendingServicesError(isAr ? 'تعذر الاتصال بالخادم' : 'Failed to contact server');
      setPendingProductsError(isAr ? 'تعذر الاتصال بالخادم' : 'Failed to contact server');
      setPendingTechnicians([]);
    } finally {
      try { /* clear quick auto-hide timer and ensure hidden */ } finally {
        try { /* clear timer */ } catch {}
      }
      try { (context as any)?.hideLoading?.(); } catch {}
    }
  }, [isAr]); // ✅ Only include stable dependencies

  // ✅ Load data once on mount
  React.useEffect(() => { 
    void loadAll(); 
  }, [loadAll]);

  const statsData: Array<{ title: string; value: string; change: string; icon: any; trend: Trend }> = [
    { title: t('totalUsers'), value: String(stats.totalUsers), change: '', icon: Users, trend: 'up' },
    { title: t('activeVendors'), value: String(stats.activeVendors), change: '', icon: Store, trend: 'up' },
    { title: t('technicians'), value: String(stats.technicians), change: '', icon: Package, trend: 'up' },
    { title: t('pendingApproval'), value: String(stats.pendingCount), change: '', icon: Clock, trend: 'up' },
  ];

  // Actions
  const doApproveMerchant = async (id: string) => { 
    try { 
      const r = await approveMerchant(id); 
      if (r.ok) { 
        toastSuccess(isAr? 'تم اعتماد التاجر':'Merchant approved', isAr); 
        await loadAll(); 
      } else {
        toastError(isAr? 'فشل اعتماد التاجر':'Failed to approve merchant', isAr);
      }
    } catch (error) { 
      console.error('Error approving merchant:', error);
      toastError(isAr? 'فشل اعتماد التاجر':'Failed to approve merchant', isAr);
    } 
  };

  const doSuspendMerchant = async (id: string) => { 
    try { 
      const r = await suspendMerchant(id); 
      if (r.ok) { 
        toastSuccess(isAr? 'تم إيقاف التاجر':'Merchant suspended', isAr); 
        await loadAll(); 
      } else {
        toastError(isAr? 'فشل إيقاف التاجر':'Failed to suspend merchant', isAr);
      }
    } catch (error) { 
      console.error('Error suspending merchant:', error);
      toastError(isAr? 'فشل إيقاف التاجر':'Failed to suspend merchant', isAr);
    } 
  };

  const doApproveService = async (id: string) => { 
    try { 
      const r = await approveService(Number(id)); 
      if (r.ok) { 
        toastSuccess(isAr? 'تم اعتماد الخدمة':'Service approved', isAr); 
        await loadAll(); 
      } else {
        toastError(isAr? 'فشل اعتماد الخدمة':'Failed to approve service', isAr);
      }
    } catch (error) { 
      console.error('Error approving service:', error);
      toastError(isAr? 'فشل اعتماد الخدمة':'Failed to approve service', isAr);
    } 
  };

  const doRejectService = async (id: string) => { 
    try { 
      const r = await rejectService(Number(id), ''); 
      if (r.ok) { 
        toastSuccess(isAr? 'تم رفض الخدمة':'Service rejected', isAr); 
        await loadAll(); 
      } else {
        toastError(isAr? 'فشل رفض الخدمة':'Failed to reject service', isAr);
      }
    } catch (error) { 
      console.error('Error rejecting service:', error);
      toastError(isAr? 'فشل رفض الخدمة':'Failed to reject service', isAr);
    } 
  };

  const doApproveProduct = async (id: string) => { 
    try { 
      const r = await approveProduct(String(id)); 
      if (r.ok) { 
        toastSuccess(isAr? 'تم اعتماد المنتج':'Product approved', isAr); 
        await loadAll(); 
      } else {
        toastError(isAr? 'فشل اعتماد المنتج':'Failed to approve product', isAr);
      }
    } catch (error) { 
      console.error('Error approving product:', error);
      toastError(isAr? 'فشل اعتماد المنتج':'Failed to approve product', isAr);
    } 
  };

  const doRejectProduct = async (id: string) => { 
    try { 
      const r = await rejectProduct(String(id), ''); 
      if (r.ok) { 
        toastSuccess(isAr? 'تم رفض المنتج':'Product rejected', isAr); 
        await loadAll(); 
      } else {
        toastError(isAr? 'فشل رفض المنتج':'Failed to reject product', isAr);
      }
    } catch (error) { 
      console.error('Error rejecting product:', error);
      toastError(isAr? 'فشل رفض المنتج':'Failed to reject product', isAr);
    } 
  };

  const openProductDetails = async (id: string) => {
    try {
      setProductDialogOpen(true);
      setProductDialogLoading(true);
      setProductDialogData(null);
      const r = await getProductById(String(id));
      if (r.ok && r.data) setProductDialogData(r.data as any);
    } catch {
      setProductDialogData(null);
    } finally {
      setProductDialogLoading(false);
    }
  };

  // Handlers for viewing user details
  const openMerchantDetails = (m: AdminUser) => {
    setMerchantDialogData(m);
    setMerchantDialogOpen(true);
  };

  const openTechDetails = (u: AdminUser) => {
    setTechDialogData(u);
    setTechDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header {...context} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2">{t('adminDashboardTitle')}</h1>
          <p className="text-muted-foreground">{t('adminDashboardSubtitle')}</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsData.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className={`flex items-center text-xs ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.trend === 'up' ? (
                    <TrendingUp className="mr-1 h-3 w-3" />
                  ) : (
                    <TrendingDown className="mr-1 h-3 w-3" />
                  )}
                  {stat.change}
                  <span className="text-muted-foreground mr-1">{t('fromLastMonth')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* Pending Approvals (Merchants + Services + Products) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                {t('pendingApproval')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingServicesError && (
                <div className="text-sm text-red-600 border rounded p-2">
                  {pendingServicesError}
                </div>
              )}
              {pendingProductsError && (
                <div className="text-sm text-red-600 border rounded p-2">
                  {pendingProductsError}
                </div>
              )}
              
              {/* Show message if no pending items */}
              {pendingMerchants.length === 0 && pendingServices.length === 0 && pendingProducts.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <CheckCircle className="mx-auto h-12 w-12 mb-2" />
                  <p>{isAr ? 'لا توجد عناصر قيد الاعتماد' : 'No pending items'}</p>
                </div>
              )}
              
              {/* Pending merchants */}
              {pendingMerchants.map((m) => (
                <div key={m.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{m.name} ({m.email})</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="secondary">{t('vendor')}</Badge>
                      <Badge variant="secondary">{m.companyName || 'N/A'}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => openMerchantDetails(m)}>
                      {locale==='ar' ? 'عرض' : 'View'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => doApproveMerchant(m.id)}>
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => doSuspendMerchant(m.id)}>
                      <Ban className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Pending products */}
              {pendingProducts.map((p: any) => (
                <div key={String(p.id)} className="flex flex-col gap-3 p-3 border rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{p.nameAr || p.nameEn || p.name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="secondary">{t('product')}</Badge>
                        <Badge variant="secondary">{p.merchantName || p.merchantId}</Badge>
                        {p.price != null && (<Badge variant="outline">{locale==='ar'?'السعر':'Price'}: {new Intl.NumberFormat(locale==='ar'?'ar-EG':'en-US').format(Number(p.price))} {locale==='ar'?'ر.س':'SAR'}</Badge>)}
                        {p.categoryName && (<Badge variant="outline">{p.categoryName}</Badge>)}
                        {p.createdAt && (<span className="text-xs text-muted-foreground">{locale==='ar'?'أُنشئ':'Created'}: {new Date(p.createdAt).toLocaleString(locale==='ar'?'ar-EG':'en-US')}</span>)}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => openProductDetails(String(p.id))}>
                        {locale==='ar' ? 'عرض' : 'View'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => doApproveProduct(String(p.id))}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => doRejectProduct(String(p.id))}>
                        <Ban className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pending technicians */}
              {pendingTechnicians.map((u) => (
                <div key={u.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{u.name || '—'} ({u.email})</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="secondary">{locale==='ar' ? 'عامل' : 'Technician'}</Badge>
                      {u.city && <Badge variant="secondary">{u.city}</Badge>}
                      {u.country && <Badge variant="secondary">{u.country}</Badge>}
                      {u.createdAt && (<span className="text-xs text-muted-foreground">{locale==='ar'?'مسجّل':'Joined'}: {new Date(u.createdAt).toLocaleDateString(locale==='ar'?'ar-EG':'en-US')}</span>)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => openTechDetails(u)}>
                      {locale==='ar' ? 'عرض' : 'View'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => approveTechnician(String(u.id))}>
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => suspendTechnician(String(u.id))}>
                      <Ban className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Pending services */}
              {pendingServices.map((s) => (
                <div key={s.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{(s.description || '').slice(0, 100)}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="secondary">{t('service')}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => doApproveService(s.id)}>
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => doRejectService(s.id)}>
                      <Ban className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>{t('quickActions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Dynamic quick actions from AdminOptions (if configured) */}
              {quickActions && quickActions.length > 0 ? (
                quickActions.map((qa, idx) => {
                  const iconMap: Record<string, any> = {
                    Users, Store, Package, Clock, Settings, BarChart3, Percent,
                  };
                  const IconCmp = iconMap[String(qa.icon || '').trim()] || Users;
                  const label = isAr ? (qa.labelAr || qa.labelEn || qa.page) : (qa.labelEn || qa.labelAr || qa.page);
                  return (
                    <Button
                      key={`${qa.page}-${idx}`}
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => setCurrentPage && setCurrentPage(qa.page)}
                    >
                      <IconCmp className="mr-2 h-4 w-4" />
                      {label}
                    </Button>
                  );
                })
              ) : (
                <>
                  <Button 
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setCurrentPage && setCurrentPage('admin-users')}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    {t('manageUsers')}
                  </Button>
                  <Button 
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setCurrentPage && setCurrentPage('admin-vendors')}
                  >
                    <Store className="mr-2 h-4 w-4" />
                    {t('manageVendors')}
                  </Button>
                  <Button 
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setCurrentPage && setCurrentPage('admin-technicians')}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    {locale==='ar' ? 'إدارة الفنيين' : 'Manage Technicians'}
                  </Button>
                  <Button 
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setCurrentPage && setCurrentPage('admin-products')}
                  >
                    <Package className="mr-2 h-4 w-4" />
                    {t('manageProducts')}
                  </Button>
                  <Button 
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setCurrentPage && setCurrentPage('admin-rentals')}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {locale==='ar'? 'إدارة عقود التأجير (اعتماد/رفض)' : 'Manage Rental Contracts (Approve/Decline)'}
                  </Button>
                  <Button 
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setCurrentPage && setCurrentPage('admin-reports')}
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    {t('reportsAndAnalytics')}
                  </Button>
                  <Button 
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setCurrentPage && setCurrentPage('admin-sections')}
                  >
                    <Package className="mr-2 h-4 w-4" />
                    الأقسام
                  </Button>
                  <Button 
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setCurrentPage && setCurrentPage('admin-project-options')}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    {isAr ? 'خيارات مشاريع (كتالوج)' : 'Project Options (Catalog)'}
                  </Button>
                  <Button 
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setCurrentPage && setCurrentPage('admin-pending-projects')}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {isAr ? 'مشاريع قيد الاعتماد' : 'Pending Projects'}
                  </Button>
                  <Button 
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setCurrentPage && setCurrentPage('admin-all-projects')}
                  >
                    <Package className="mr-2 h-4 w-4" />
                    {isAr ? 'كل المشاريع' : 'All Projects'}
                  </Button>
                  <Button 
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setCurrentPage && setCurrentPage('admin-offers')}
                  >
                    <Percent className="mr-2 h-4 w-4" />
                    {locale==='ar' ? 'إدارة العروض' : 'Manage Offers'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Detailed Tabs */}
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analytics">{t('analytics')}</TabsTrigger>
            <TabsTrigger value="financial">{t('financial')}</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('userGrowth')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>{t('customers')}</span>
                        <span>{growthPct.customers}%</span>
                      </div>
                      <Progress value={growthPct.customers} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>{t('vendors')}</span>
                        <span>{growthPct.merchants}%</span>
                      </div>
                      <Progress value={growthPct.merchants} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>{t('technicians')}</span>
                        <span>{growthPct.technicians}%</span>
                      </div>
                      <Progress value={growthPct.technicians} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('salesPerformance')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{t('dailySales')}</span>
                      <span className="font-medium">{new Intl.NumberFormat(locale==='ar'?'ar-EG':'en-US').format(sales.daily)} {sales.currency === 'SAR' ? 'ر.س' : sales.currency}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{t('weeklySales')}</span>
                      <span className="font-medium">{new Intl.NumberFormat(locale==='ar'?'ar-EG':'en-US').format(sales.weekly)} {sales.currency === 'SAR' ? 'ر.س' : sales.currency}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{t('monthlySales')}</span>
                      <span className="font-medium">{new Intl.NumberFormat(locale==='ar'?'ar-EG':'en-US').format(sales.monthly)} {sales.currency === 'SAR' ? 'ر.س' : sales.currency}</span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-4">
                      <span className="font-medium">{t('yearlyTotal')}</span>
                      <span className="font-medium text-green-600">{new Intl.NumberFormat(locale==='ar'?'ar-EG':'en-US').format(sales.yearly)} {sales.currency === 'SAR' ? 'ر.س' : sales.currency}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>الإيرادات الشهرية</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{new Intl.NumberFormat(locale==='ar'?'ar-EG':'en-US').format(finance.monthlyRevenue)} {finance.currency === 'SAR' ? 'ر.س' : finance.currency}</div>
                  <p className="text-sm text-muted-foreground">{locale==='ar' ? 'من الشهر الحالي' : 'for current month'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>عمولات المنصة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{new Intl.NumberFormat(locale==='ar'?'ar-EG':'en-US').format(finance.platformCommission)} {finance.currency === 'SAR' ? 'ر.س' : finance.currency}</div>
                  <p className="text-sm text-muted-foreground">{locale==='ar' ? '10% من إجمالي المبيعات' : '10% of total sales'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>المدفوعات المعلقة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{new Intl.NumberFormat(locale==='ar'?'ar-EG':'en-US').format(finance.pendingVendorPayouts)} {finance.currency === 'SAR' ? 'ر.س' : finance.currency}</div>
                  <p className="text-sm text-muted-foreground">{locale==='ar' ? 'للبائعين' : 'to vendors'}</p>
                </CardContent>
              </Card>
            </div>

            {/* Commission Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Products (Sales/Rentals) Commission */}
              <Card>
                <CardHeader>
                  <CardTitle>{locale==='ar' ? 'نسبة خصم على المنتجات (بيع/تأجير)' : 'Product Commission (Sales/Rentals)'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mb-2">{locale==='ar' ? 'النسبة المئوية %' : 'Percentage %'}</div>
                  <div className="flex items-center gap-2">
                    <input
                      className="border rounded px-3 py-2 w-24"
                      type="number"
                      min={0}
                      max={100}
                      value={commDraft.products}
                      onChange={(e) => setCommDraft(s=>({ ...s, products: e.target.value }))}
                    />
                    <Button
                      onClick={async ()=>{
                        setSavingKey('products');
                        try { await setAdminOption('commission_products', Number(commDraft.products||0)); setCommissions(c=>({ ...c, products: Number(commDraft.products||0) })); }
                        finally { setSavingKey(null); }
                      }}
                      disabled={savingKey==='products'}
                    >{locale==='ar'? 'حفظ' : 'Save'}</Button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">{locale==='ar'? 'القيمة الحالية: ' : 'Current: '}{commissions.products}%</div>
                </CardContent>
              </Card>

              {/* Projects commission from merchants */}
              <Card>
                <CardHeader>
                  <CardTitle>{locale==='ar' ? 'نسبة خصم من التجار في المشاريع' : 'Project Commission (Merchants)'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mb-2">{locale==='ar' ? 'النسبة المئوية %' : 'Percentage %'}</div>
                  <div className="flex items-center gap-2">
                    <input
                      className="border rounded px-3 py-2 w-24"
                      type="number"
                      min={0}
                      max={100}
                      value={commDraft.projectsMerchants}
                      onChange={(e) => setCommDraft(s=>({ ...s, projectsMerchants: e.target.value }))}
                    />
                    <Button
                      onClick={async ()=>{
                        setSavingKey('projectsMerchants');
                        try { await setAdminOption('commission_projects_merchants', Number(commDraft.projectsMerchants||0)); setCommissions(c=>({ ...c, projectsMerchants: Number(commDraft.projectsMerchants||0) })); }
                        finally { setSavingKey(null); }
                      }}
                      disabled={savingKey==='projectsMerchants'}
                    >{locale==='ar'? 'حفظ' : 'Save'}</Button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">{locale==='ar'? 'القيمة الحالية: ' : 'Current: '}{commissions.projectsMerchants}%</div>
                </CardContent>
              </Card>

              {/* Services commission from technicians */}
              <Card>
                <CardHeader>
                  <CardTitle>{locale==='ar' ? 'نسبة خصم من الفنيين (الخدمات)' : 'Service Commission (Technicians)'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mb-2">{locale==='ar' ? 'النسبة المئوية %' : 'Percentage %'}</div>
                  <div className="flex items-center gap-2">
                    <input
                      className="border rounded px-3 py-2 w-24"
                      type="number"
                      min={0}
                      max={100}
                      value={commDraft.servicesTechnicians}
                      onChange={(e) => setCommDraft(s=>({ ...s, servicesTechnicians: e.target.value }))}
                    />
                    <Button
                      onClick={async ()=>{
                        setSavingKey('servicesTechnicians');
                        try { await setAdminOption('commission_services_technicians', Number(commDraft.servicesTechnicians||0)); setCommissions(c=>({ ...c, servicesTechnicians: Number(commDraft.servicesTechnicians||0) })); }
                        finally { setSavingKey(null); }
                      }}
                      disabled={savingKey==='servicesTechnicians'}
                    >{locale==='ar'? 'حفظ' : 'Save'}</Button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">{locale==='ar'? 'القيمة الحالية: ' : 'Current: '}{commissions.servicesTechnicians}%</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

    {/* Product Details Dialog */
    /* Hide IDs, show clear labels */}
    <Dialog open={productDialogOpen} onOpenChange={(o)=> { if (!o) { setProductDialogOpen(false); setProductDialogData(null); } }}>
      {productDialogOpen && (
        <DialogContent className="max-w-3xl bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle>{locale==='ar' ? 'تفاصيل المنتج (قيد الاعتماد)' : 'Product Details (Pending Approval)'}</DialogTitle>
          </DialogHeader>
          {productDialogLoading ? (
            <div className="py-8 text-center text-muted-foreground">{locale==='ar' ? 'جاري التحميل...' : 'Loading...'}</div>
          ) : productDialogData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="w-full h-56 border rounded-md overflow-hidden bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                    {Array.isArray(productDialogData.images) && productDialogData.images.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={productDialogData.images.find((im:any)=> im?.isPrimary)?.imageUrl || productDialogData.images[0]?.imageUrl} alt="product" className="max-h-full object-contain" />
                    ) : (
                      <span className="text-xs text-muted-foreground">{locale==='ar' ? 'لا توجد صورة' : 'No image'}</span>
                    )}
                  </div>
                  {Array.isArray(productDialogData.images) && productDialogData.images.length > 1 && (
                    <div className="flex gap-2 flex-wrap">
                      {productDialogData.images.map((im:any, idx:number)=> (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={idx} src={im.imageUrl} alt={`thumb-${idx}`} className="w-14 h-14 object-cover rounded border" />
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="font-medium text-base">{productDialogData.nameAr || productDialogData.nameEn}</div>
                  <div className="text-muted-foreground">{(productDialogData.descriptionAr || productDialogData.descriptionEn || '').trim() || (locale==='ar'?'لا يوجد وصف':'No description')}</div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="secondary">{locale==='ar'?'السعر':'Price'}: {new Intl.NumberFormat(locale==='ar'?'ar-EG':'en-US').format(Number(productDialogData.price||0))} {locale==='ar'?'ر.س':'SAR'}</Badge>
                    {productDialogData.discountPrice ? (<Badge variant="secondary">{locale==='ar'?'السعر بعد الخصم':'Discount'}: {new Intl.NumberFormat(locale==='ar'?'ar-EG':'en-US').format(Number(productDialogData.discountPrice||0))}</Badge>) : null}
                    <Badge variant="secondary">{locale==='ar'?'المخزون':'Stock'}: {Number(productDialogData.stockQuantity||0)}</Badge>
                    {productDialogData.categoryName && (<Badge variant="secondary">{locale==='ar'?'القسم: ':'Category: '}{productDialogData.categoryName}</Badge>)}
                    {productDialogData.merchantName && (<Badge variant="secondary">{locale==='ar'?'التاجر: ':'Merchant: '}{productDialogData.merchantName}</Badge>)}
                  </div>
                </div>
              </div>
              {Array.isArray(productDialogData.attributes) && productDialogData.attributes.length > 0 && (
                <div>
                  <div className="font-medium mb-2">{locale==='ar' ? 'خصائص المنتج' : 'Attributes'}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {productDialogData.attributes.map((a:any)=> (
                      <div key={String(a.id)} className="flex items-center justify-between border rounded px-3 py-2">
                        <span>{a.nameAr || a.nameEn}</span>
                        <span className="text-muted-foreground">{a.valueAr || a.valueEn}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => { setProductDialogOpen(false); setProductDialogData(null); }}>{locale==='ar' ? 'إغلاق' : 'Close'}</Button>
                <Button onClick={() => { setProductDialogOpen(false); void doApproveProduct(String(productDialogData.id || productDialogData._id)); }}>{locale==='ar' ? 'اعتماد' : 'Approve'}</Button>
                <Button variant="destructive" onClick={() => { setProductDialogOpen(false); void doRejectProduct(String(productDialogData.id || productDialogData._id)); }}>{locale==='ar' ? 'رفض' : 'Reject'}</Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">{locale==='ar' ? 'تعذر جلب التفاصيل' : 'Failed to load details'}</div>
          )}
        </DialogContent>
      )}
    </Dialog>

    {/* Merchant Details Dialog */}
    <Dialog open={merchantDialogOpen} onOpenChange={(o)=> { if (!o) { setMerchantDialogOpen(false); setMerchantDialogData(null); } }}>
      {merchantDialogOpen && merchantDialogData && (
        <DialogContent className="max-w-xl bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle>{locale==='ar' ? 'تفاصيل التاجر (قيد الاعتماد)' : 'Merchant Details (Pending)'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="font-medium text-base">{merchantDialogData.name}</div>
            <div className="text-muted-foreground">{merchantDialogData.email}</div>
            <div className="flex flex-wrap gap-2">
              {merchantDialogData.companyName && (<Badge variant="secondary">{locale==='ar'?'الشركة: ':'Company: '}{merchantDialogData.companyName}</Badge>)}
              {merchantDialogData.city && (<Badge variant="secondary">{merchantDialogData.city}</Badge>)}
              {merchantDialogData.country && (<Badge variant="secondary">{merchantDialogData.country}</Badge>)}
              {merchantDialogData.createdAt && (<Badge variant="secondary">{locale==='ar'?'تاريخ التسجيل: ':'Joined: '}{new Date(merchantDialogData.createdAt).toLocaleString(locale==='ar'?'ar-EG':'en-US')}</Badge>)}
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={()=> setMerchantDialogOpen(false)}>{locale==='ar'?'إغلاق':'Close'}</Button>
              <Button onClick={()=> { setMerchantDialogOpen(false); void doApproveMerchant(String(merchantDialogData.id)); }}>{locale==='ar'?'اعتماد':'Approve'}</Button>
              <Button variant="destructive" onClick={()=> { setMerchantDialogOpen(false); void doSuspendMerchant(String(merchantDialogData.id)); }}>{locale==='ar'?'رفض':'Reject'}</Button>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>

    {/* Technician Details Dialog */}
    <Dialog open={techDialogOpen} onOpenChange={(o)=> { if (!o) { setTechDialogOpen(false); setTechDialogData(null); } }}>
      {techDialogOpen && techDialogData && (
        <DialogContent className="max-w-xl bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle>{locale==='ar' ? 'تفاصيل العامل (قيد الاعتماد)' : 'Technician Details (Pending)'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="font-medium text-base">{techDialogData.name || (locale==='ar'?'عامل':'Technician')}</div>
            <div className="text-muted-foreground">{techDialogData.email}</div>
            <div className="flex flex-wrap gap-2">
              {techDialogData.city && (<Badge variant="secondary">{techDialogData.city}</Badge>)}
              {techDialogData.country && (<Badge variant="secondary">{techDialogData.country}</Badge>)}
              {techDialogData.createdAt && (<Badge variant="secondary">{locale==='ar'?'تاريخ التسجيل: ':'Joined: '}{new Date(techDialogData.createdAt).toLocaleString(locale==='ar'?'ar-EG':'en-US')}</Badge>)}
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={()=> setTechDialogOpen(false)}>{locale==='ar'?'إغلاق':'Close'}</Button>
              <Button onClick={()=> { setTechDialogOpen(false); void approveTechnician(String(techDialogData.id)); }}>{locale==='ar'?'اعتماد':'Approve'}</Button>
              <Button variant="destructive" onClick={()=> { setTechDialogOpen(false); void suspendTechnician(String(techDialogData.id)); }}>{locale==='ar'?'رفض':'Reject'}</Button>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
      </div>
    </div>
  );
}