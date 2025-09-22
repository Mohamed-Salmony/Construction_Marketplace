import { RouteContext } from '../../components/Router';
import Header from '../../components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useTranslation } from '../../hooks/useTranslation';
import { Package, Users, Calendar } from 'lucide-react';

export default function AdminSections(props: Partial<RouteContext>) {
  const { locale } = useTranslation();

  const sections = [
    { key: 'products', labelAr: 'قسم المنتجات', labelEn: 'Products Section', icon: Package },
    { key: 'rentals', labelAr: 'قسم التأجير', labelEn: 'Rentals Section', icon: Calendar },
    { key: 'technicians', labelAr: 'قسم الفنيين', labelEn: 'Technicians Section', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header {...props} />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{locale==='ar' ? 'الأقسام' : 'Sections'}</h1>
          <p className="text-muted-foreground">{locale==='ar' ? 'اختر أحد الأقسام التالية' : 'Choose one of the following sections'}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <Card
                key={s.key}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  if (s.key === 'products') {
                    props.setCurrentPage && props.setCurrentPage('admin-sections-products');
                  } else if (s.key === 'rentals') {
                    props.setCurrentPage && props.setCurrentPage('admin-sections-rentals');
                  } else if (s.key === 'technicians') {
                    props.setCurrentPage && props.setCurrentPage('admin-sections-technicians');
                  }
                }}
              >
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="p-2 rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">
                    {locale==='ar' ? s.labelAr : s.labelEn}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {locale==='ar' ? 'إدارة هذا القسم' : 'Manage this section'}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
