import { useEffect, useMemo, useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useTranslation } from '../../hooks/useTranslation';
import type { RouteContext } from '../../components/Router';
import { getTechnicianOffers, type OfferDto } from '@/services/offers';
import { listServiceTypes } from '@/services/servicesCatalog';

interface TechnicianMyOffersProps extends Partial<RouteContext> {}

export default function TechnicianMyOffers(props: TechnicianMyOffersProps) {
  const { user, setCurrentPage } = props;
  const { locale } = useTranslation();
  const [offers, setOffers] = useState<OfferDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!user?.id) { setOffers([]); return; }
        const r = await getTechnicianOffers(String(user.id));
        if (r.ok && Array.isArray(r.data)) setOffers(r.data as any);
        else setOffers([]);
      } catch { setOffers([]); }
      finally { setLoading(false); }
    })();
  }, [user?.id]);

  // Map id -> label for nicer type names if available
  const [typeMap, setTypeMap] = useState<Record<string, { ar: string; en: string }>>({});
  useEffect(() => {
    (async () => {
      try {
        const r = await listServiceTypes();
        if (r.ok && Array.isArray(r.data)) {
          const map: Record<string, { ar: string; en: string }> = {};
          for (const it of r.data as any[]) {
            map[String((it as any).id)] = { ar: (it as any).ar || String((it as any).id), en: (it as any).en || String((it as any).id) };
          }
          setTypeMap(map);
        }
      } catch {}
    })();
  }, []);

  const grouped = useMemo(() => {
    const g: Record<string, OfferDto[]> = { pending: [], accepted: [], rejected: [] } as any;
    for (const o of offers) {
      const s = (o.status || 'pending').toLowerCase();
      if (s === 'accepted') g.accepted.push(o);
      else if (s === 'rejected') g.rejected.push(o);
      else g.pending.push(o);
    }
    return g;
  }, [offers]);

  const openAcceptedDetails = (o: OfferDto) => {
    // Navigate to service or project details pages created for technicians
    if (o.targetType === 'service' && o.serviceId) {
      try { const url = new URL(window.location.href); url.searchParams.set('serviceId', String(o.serviceId)); window.history.replaceState({}, '', url.toString()); } catch {}
      setCurrentPage && setCurrentPage('technician-service-details');
      return;
    }
    if (o.targetType === 'project' && o.projectId) {
      try { const url = new URL(window.location.href); url.searchParams.set('projectId', String(o.projectId)); window.history.replaceState({}, '', url.toString()); } catch {}
      setCurrentPage && setCurrentPage('technician-project-details');
      return;
    }
  };

  const Section = ({ title, items, empty }: { title: string; items: OfferDto[]; empty: string }) => (
    <Card>
      <CardHeader>
        <CardTitle>{title} <Badge variant="outline" className="ml-2">{items.length}</Badge></CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">{locale==='ar' ? 'جاري التحميل...' : 'Loading...'}</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">{empty}</div>
        ) : (
          <div className="space-y-3">
            {items.map((o, idx) => (
              <div key={o.id || `${o.targetType}-${String(o.serviceId||o.projectId||'')}-${idx}`} className="p-3 border rounded-md flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-medium">
                    {o.targetType === 'service' ? (locale==='ar' ? 'خدمة' : 'Service') : (locale==='ar' ? 'مشروع' : 'Project')} #{String(o.serviceId || o.projectId)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {(locale==='ar' ? 'السعر: ' : 'Price: ') + Number(o.price||0).toLocaleString(locale==='ar'?'ar-EG':'en-US')}
                    {' • '}
                    {(locale==='ar' ? 'الأيام: ' : 'Days: ') + Number(o.days||0)}
                  </div>
                  {o.message && (
                    <div className="text-xs text-muted-foreground">{o.message}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={o.status==='accepted' ? 'default' : (o.status==='rejected' ? 'destructive' : 'secondary')}>
                    {o.status === 'accepted' ? (locale==='ar' ? 'مقبول' : 'Accepted') : o.status === 'rejected' ? (locale==='ar' ? 'مرفوض' : 'Rejected') : (locale==='ar' ? 'قيد الانتظار' : 'Pending')}
                  </Badge>
                  {o.status === 'accepted' && (
                    <Button size="sm" onClick={() => openAcceptedDetails(o)}>
                      {locale==='ar' ? 'تفاصيل' : 'Details'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background" dir={locale==='ar' ? 'rtl' : 'ltr'}>
      <Header currentPage="technician-offers" setCurrentPage={setCurrentPage as any} {...(props as any)} />
      <div className="container mx-auto px-4 py-6">
        <h1 className={`text-2xl font-bold mb-4 ${locale==='ar' ? 'text-right' : ''}`}>{locale==='ar' ? 'عروضي كفني' : 'My Offers (Technician)'}</h1>
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className={locale==='ar' ? 'justify-end' : ''}>
            <TabsTrigger value="pending">{locale==='ar' ? 'قيد الانتظار' : 'Pending'}</TabsTrigger>
            <TabsTrigger value="accepted">{locale==='ar' ? 'المقبولة' : 'Accepted'}</TabsTrigger>
            <TabsTrigger value="rejected">{locale==='ar' ? 'المرفوضة' : 'Rejected'}</TabsTrigger>
          </TabsList>
          <TabsContent value="pending">
            <Section title={locale==='ar' ? 'العروض قيد الانتظار' : 'Pending Offers'} items={grouped.pending} empty={locale==='ar' ? 'لا توجد عروض حالياً' : 'No offers yet'} />
          </TabsContent>
          <TabsContent value="accepted">
            <Section title={locale==='ar' ? 'العروض المقبولة' : 'Accepted Offers'} items={grouped.accepted} empty={locale==='ar' ? 'لا توجد عروض مقبولة' : 'No accepted offers'} />
          </TabsContent>
          <TabsContent value="rejected">
            <Section title={locale==='ar' ? 'العروض المرفوضة' : 'Rejected Offers'} items={grouped.rejected} empty={locale==='ar' ? 'لا توجد عروض مرفوضة' : 'No rejected offers'} />
          </TabsContent>
        </Tabs>
      </div>
      <Footer setCurrentPage={setCurrentPage as any} />
    </div>
  );
}
