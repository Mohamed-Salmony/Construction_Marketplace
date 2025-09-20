import { useEffect, useState } from "react";
import Header from "../../components/Header";
import { RouteContext } from "../../components/Router";
import { useTranslation } from "../../hooks/useTranslation";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { success } from "../../utils/alerts";
import { useFirstLoadOverlay } from "../../hooks/useFirstLoadOverlay";

export default function VendorAccounting({ setCurrentPage, ...context }: Partial<RouteContext>) {
  const { t, locale } = useTranslation();
  const vendorId = (context as any)?.user?.id || "guest";
  const [sub, setSub] = useState<any | null>(null);
  const hideFirstOverlay = useFirstLoadOverlay(
    context,
    locale === 'ar' ? 'جاري تحميل النظام المحاسبي' : 'Loading accounting system',
    locale === 'ar' ? 'يرجى الانتظار' : 'Please wait'
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("vendor_accounting_subscription");
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed.vendorId === vendorId) setSub(parsed);
    } catch {}
    finally {
      try { hideFirstOverlay(); } catch {}
    }
  }, [vendorId, hideFirstOverlay]);

  const active = !!sub?.active;
  const currency = locale === "ar" ? "ر.س" : "SAR";

  const subscribe = async () => {
    try {
      const payload = {
        vendorId,
        plan: "monthly",
        active: true,
        startedAt: new Date().toISOString(),
        price: 99,
      };
      window.localStorage.setItem("vendor_accounting_subscription", JSON.stringify(payload));
      setSub(payload);
      await success(locale === 'ar' ? 'تم تفعيل الاشتراك الشهري.' : 'Monthly subscription activated.', locale === 'ar');
    } catch {}
  };
  const cancel = async () => {
    try {
      const payload = { ...(sub || {}), active: false, cancelledAt: new Date().toISOString() };
      window.localStorage.setItem("vendor_accounting_subscription", JSON.stringify(payload));
      setSub(payload);
      await success(locale === 'ar' ? 'تم إلغاء الاشتراك.' : 'Subscription cancelled.', locale === 'ar');
    } catch {}
  };

  return (
    <div className="min-h-screen bg-background">
      <Header {...context} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{locale === 'ar' ? 'النظام المحاسبي' : 'Accounting System'}</span>
                <Badge variant={active ? 'default' : 'secondary'}>
                  {active ? (locale === 'ar' ? 'نشط' : 'Active') : (locale === 'ar' ? 'غير مشترك' : 'Not Subscribed')}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>{locale === 'ar' ? 'الخطة الشهرية' : 'Monthly Plan'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li>• {locale === 'ar' ? 'تتبع الفواتير والمصروفات' : 'Track invoices and expenses'}</li>
                      <li>• {locale === 'ar' ? 'تقارير أرباح شهرية' : 'Monthly profit reports'}</li>
                      <li>• {locale === 'ar' ? 'تصدير CSV' : 'CSV export'}</li>
                    </ul>
                    <div className="flex items-end justify-between mt-4">
                      <div>
                        <div className="text-3xl font-bold">{currency} 99</div>
                        <div className="text-xs text-muted-foreground">{locale === 'ar' ? 'للشهر' : 'per month'}</div>
                      </div>
                      {active ? (
                        <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={cancel}>
                          {locale === 'ar' ? 'إلغاء الاشتراك' : 'Cancel Subscription'}
                        </Button>
                      ) : (
                        <Button onClick={subscribe}>{locale === 'ar' ? 'اشترك الآن' : 'Subscribe Now'}</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{locale === 'ar' ? 'حالة الاشتراك' : 'Subscription Status'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      <div className="mb-1">{locale === 'ar' ? 'الخطة' : 'Plan'}: {locale === 'ar' ? 'شهري' : 'Monthly'}</div>
                      <div className="mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}: {active ? (locale === 'ar' ? 'نشط' : 'Active') : (locale === 'ar' ? 'غير نشط' : 'Inactive')}</div>
                      {!!sub?.startedAt && (
                        <div className="mb-1">{locale === 'ar' ? 'تاريخ البدء' : 'Started'}: {new Date(sub.startedAt).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}</div>
                      )}
                      {!!sub?.cancelledAt && (
                        <div className="mb-1">{locale === 'ar' ? 'تاريخ الإلغاء' : 'Cancelled'}: {new Date(sub.cancelledAt).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6">
                <Tabs defaultValue="invoices">
                  <TabsList>
                    <TabsTrigger value="invoices">{locale === 'ar' ? 'الفواتير' : 'Invoices'}</TabsTrigger>
                    <TabsTrigger value="expenses">{locale === 'ar' ? 'المصروفات' : 'Expenses'}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="invoices">
                    <div className="text-sm text-muted-foreground">
                      {locale === 'ar' ? 'لا توجد فواتير بعد. سيتم تفعيل هذه الميزة بعد الاشتراك.' : 'No invoices yet. This feature activates after subscription.'}
                    </div>
                  </TabsContent>
                  <TabsContent value="expenses">
                    <div className="text-sm text-muted-foreground">
                      {locale === 'ar' ? 'لا توجد مصروفات بعد. سيتم تفعيل هذه الميزة بعد الاشتراك.' : 'No expenses yet. This feature activates after subscription.'}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
