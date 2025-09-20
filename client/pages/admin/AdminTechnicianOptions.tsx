import { useEffect, useState } from 'react';
import Header from '../../components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useTranslation } from '../../hooks/useTranslation';
import type { RouteContext } from '../../components/Router';
import { getAdminOption, setAdminOption } from '@/services/admin';
import { useFirstLoadOverlay } from '../../hooks/useFirstLoadOverlay';

export default function AdminTechnicianOptions(props: Partial<RouteContext>) {
  const { locale } = useTranslation();
  const hideFirstOverlay = useFirstLoadOverlay(props, locale==='ar' ? 'جاري تحميل خيارات الفنيين' : 'Loading technician options', locale==='ar' ? 'يرجى الانتظار' : 'Please wait');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await getAdminOption('technician_specialties');
        if (!cancelled && r.ok && r.data) {
          try {
            const arr = JSON.parse(String((r.data as any).value || '[]'));
            if (Array.isArray(arr)) setSpecialties(arr.map((x:any)=>String(x)).filter(Boolean));
          } catch {
            setSpecialties([]);
          }
        }
      } catch {
        if (!cancelled) setSpecialties([]);
      } finally { if (!cancelled) hideFirstOverlay(); }
    })();
    return () => { cancelled = true; };
  }, []);

  const addItem = () => {
    const v = newItem.trim();
    if (!v) return;
    const next = Array.from(new Set([v, ...specialties]));
    setSpecialties(next);
    void setAdminOption('technician_specialties', next);
    setNewItem('');
  };

  const removeItem = (name: string) => {
    const next = specialties.filter(c => c !== name);
    setSpecialties(next);
    void setAdminOption('technician_specialties', next);
  };

  const editItem = (oldName: string) => {
    const input = window.prompt(locale==='ar' ? 'تعديل الاسم' : 'Edit name', oldName);
    if (input == null) return;
    const newName = input.trim();
    if (!newName || newName === oldName) return;
    const next = Array.from(new Set(specialties.map(c => (c === oldName ? newName : c))));
    setSpecialties(next);
    void setAdminOption('technician_specialties', next);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header {...props} />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">{locale==='ar' ? 'خيارات الفنيين (للوحة الأدمن)' : 'Technician Options (Admin)'}</h1>
        <p className="text-muted-foreground mb-6">{locale==='ar' ? 'أضف/احذف تخصصات الفنيين' : 'Add/remove technician specialties'}</p>

        <Card>
          <CardHeader>
            <CardTitle>{locale==='ar' ? 'تخصصات الفنيين' : 'Technician Specialties'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder={locale==='ar' ? 'أدخل التخصص (عربي)' : 'Enter specialty (Arabic label)'}
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
              />
              <Button onClick={addItem}>{locale==='ar' ? 'إضافة' : 'Add'}</Button>
            </div>

            {specialties.length === 0 ? (
              <div className="text-sm text-muted-foreground">{locale==='ar' ? 'لا توجد عناصر بعد.' : 'No items yet.'}</div>
            ) : (
              <div className="space-y-2">
                {specialties.map((c) => (
                  <div key={c} className="flex items-center justify-between p-3 border rounded-md">
                    <span>{c}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => editItem(c)}>
                        {locale==='ar' ? 'تعديل' : 'Edit'}
                      </Button>
                      <Button variant="destructive" size="sm" className="bg-destructive text-white hover:bg-destructive/90" onClick={() => removeItem(c)}>
                        {locale==='ar' ? 'حذف' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
