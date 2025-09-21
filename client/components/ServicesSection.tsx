import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { useTranslation } from '../hooks/useTranslation';
import { getPublicServices, type ServiceItem } from '@/services/services';

export default function ServicesSection() {
  const { locale } = useTranslation();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { ok, data } = await getPublicServices();
        if (!cancelled && ok && Array.isArray(data)) {
          setServices(data as ServiceItem[]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (status === 'all') return services;
    if (status === 'completed') return services.filter(s => s.status?.toLowerCase() === 'completed');
    // pending: consider Open or InProgress as pending
    return services.filter(s => {
      const st = (s.status || '').toLowerCase();
      return st === 'open' || st === 'inprogress';
    });
  }, [services, status]);

  return (
    <section className="py-16 bg-white" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-1">{locale==='ar' ? 'الخدمات' : 'Services'}</h2>
            <p className="text-muted-foreground">{locale==='ar' ? 'تصفية حسب الحالة: الكل، قيد الانتظار، مكتملة' : 'Filter by status: All, Pending, Completed'}</p>
          </div>
          <div className="flex gap-2">
            <Button variant={status==='all' ? 'default' : 'outline'} onClick={() => setStatus('all')}>
              {locale==='ar' ? 'الكل' : 'All'}
            </Button>
            <Button variant={status==='pending' ? 'default' : 'outline'} onClick={() => setStatus('pending')}>
              {locale==='ar' ? 'قيد الانتظار' : 'Pending'}
            </Button>
            <Button variant={status==='completed' ? 'default' : 'outline'} onClick={() => setStatus('completed')}>
              {locale==='ar' ? 'مكتملة' : 'Completed'}
            </Button>
          </div>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (<div key={i} className="h-32 rounded bg-gray-100 animate-pulse" />))}
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center text-muted-foreground">
            {locale==='ar' ? 'لا توجد خدمات. جرّب تغيير الفلتر.' : 'No services. Try a different filter.'}
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s) => {
              const mapType = (t?: string) => {
                const key = String(t || '').toLowerCase();
                switch (key) {
                  case 'plumber': return locale==='ar' ? 'سباك' : 'Plumber';
                  case 'electrician': return locale==='ar' ? 'كهربائي' : 'Electrician';
                  case 'carpenter': return locale==='ar' ? 'نجار' : 'Carpenter';
                  case 'painter': return locale==='ar' ? 'دهان' : 'Painter';
                  case 'gypsum':
                  case 'gypsum_installer': return locale==='ar' ? 'جبس' : 'Gypsum Installer';
                  case 'marble':
                  case 'marble_installer': return locale==='ar' ? 'رخام' : 'Marble Installer';
                  default: return locale==='ar' ? 'الخدمة' : 'Service';
                }
              };
              return (
              <Card key={s.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-muted-foreground">
                      {s.isApproved !== false ? mapType((s as any).technicianType || (s as any).requiredSkills || s.type) : (locale==='ar' ? 'في انتظار الموافقة' : 'Pending approval')}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded ${s.status.toLowerCase()==='completed' ? 'bg-green-100 text-green-700' : s.status.toLowerCase()==='inprogress' || s.status.toLowerCase()==='open' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                      {locale==='ar' ? (s.status.toLowerCase()==='completed' ? 'مكتملة' : (s.status.toLowerCase()==='open' || s.status.toLowerCase()==='inprogress' ? 'قيد الانتظار' : s.status)) : s.status}
                    </div>
                  </div>
                  <h3 className="font-semibold mb-1 line-clamp-2">{s.description}</h3>
                  <div className="text-sm text-muted-foreground">
                    {locale==='ar' ? 'الأجر اليومي' : 'Daily Wage'}: {s.dailyWage}
                    {s.days != null && <span> · {locale==='ar' ? 'أيام' : 'Days'}: {s.days}</span>}
                    {s.total != null && <span> · {locale==='ar' ? 'الإجمالي' : 'Total'}: {s.total}</span>}
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
