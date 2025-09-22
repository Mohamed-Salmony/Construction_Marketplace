import { useEffect, useState } from 'react';
import Header from '../../components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { useTranslation } from '../../hooks/useTranslation';
import type { RouteContext } from '../../components/Router';
import { getAdminOption, setAdminOption } from '@/services/admin';
import { useFirstLoadOverlay } from '../../hooks/useFirstLoadOverlay';

interface TechnicianSpecialty {
  name: string;
  dailyRate: number;
}

export default function AdminTechnicianOptions(props: Partial<RouteContext>) {
  const { locale } = useTranslation();
  const hideFirstOverlay = useFirstLoadOverlay(props, locale==='ar' ? 'جاري تحميل خيارات الفنيين' : 'Loading technician options', locale==='ar' ? 'يرجى الانتظار' : 'Please wait');
  const [specialties, setSpecialties] = useState<TechnicianSpecialty[]>([]);
  const [newName, setNewName] = useState('');
  const [newRate, setNewRate] = useState('');
  
  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TechnicianSpecialty | null>(null);
  const [editName, setEditName] = useState('');
  const [editRate, setEditRate] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await getAdminOption('technician_specialties');
        if (!cancelled && r.ok && r.data) {
          try {
            const arr = JSON.parse(String((r.data as any).value || '[]'));
            if (Array.isArray(arr)) {
              // Support both old format (strings) and new format (objects)
              const converted = arr.map((x: any) => {
                if (typeof x === 'string') {
                  return { name: x, dailyRate: 0 } as TechnicianSpecialty;
                } else if (x && typeof x === 'object' && x.name) {
                  return { name: String(x.name), dailyRate: Number(x.dailyRate) || 0 } as TechnicianSpecialty;
                }
                return null;
              }).filter(Boolean) as TechnicianSpecialty[];
              setSpecialties(converted);
            }
          } catch {
            setSpecialties([]);
          }
        }
      } catch {
        if (!cancelled) setSpecialties([]);
      } finally { if (!cancelled) hideFirstOverlay(); }
    })();
    return () => { cancelled = true; };
  }, [hideFirstOverlay]);

  const addItem = () => {
    const name = newName.trim();
    const rate = Number(newRate) || 0;
    if (!name) return;
    
    // Check if specialty already exists
    const exists = specialties.some(s => s.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      alert(locale==='ar' ? 'هذا التخصص موجود بالفعل' : 'This specialty already exists');
      return;
    }
    
    const newSpecialty: TechnicianSpecialty = { name, dailyRate: rate };
    const next = [...specialties, newSpecialty];
    setSpecialties(next);
    void setAdminOption('technician_specialties', next);
    setNewName('');
    setNewRate('');
  };

  const removeItem = (name: string) => {
    const next = specialties.filter(s => s.name !== name);
    setSpecialties(next);
    void setAdminOption('technician_specialties', next);
  };

  const openEditDialog = (item: TechnicianSpecialty) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditRate(String(item.dailyRate));
    setEditOpen(true);
  };

  const saveEdit = () => {
    if (!editingItem) return;
    const name = editName.trim();
    const rate = Number(editRate) || 0;
    if (!name) return;
    
    // Check if new name conflicts with existing (except current item)
    const exists = specialties.some(s => s.name.toLowerCase() === name.toLowerCase() && s.name !== editingItem.name);
    if (exists) {
      alert(locale==='ar' ? 'هذا التخصص موجود بالفعل' : 'This specialty already exists');
      return;
    }
    
    const next = specialties.map(s => 
      s.name === editingItem.name 
        ? { name, dailyRate: rate }
        : s
    );
    setSpecialties(next);
    void setAdminOption('technician_specialties', next);
    setEditOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header {...props} />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">{locale==='ar' ? 'تخصصات الفنيين' : 'Technician Specialties'}</h1>
        <p className="text-muted-foreground mb-4">{locale==='ar' ? 'أضف/احذف تخصصات الفنيين مع السعر اليومي المقترح لكل تخصص' : 'Add/remove technician specialties with suggested daily rate for each specialty'}</p>

        <Card>
          <CardHeader>
            <CardTitle>{locale==='ar' ? 'تخصصات الفنيين' : 'Technician Specialties'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="newName">{locale==='ar' ? 'التخصص' : 'Specialty'}</Label>
                  <Input
                    id="newName"
                    placeholder={locale==='ar' ? 'أدخل التخصص (مثل: كهربائي، سباك...)' : 'Enter specialty (e.g., electrician, plumber...)'}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="newRate">{locale==='ar' ? 'السعر اليومي المقترح (ريال)' : 'Suggested Daily Rate (SAR)'}</Label>
                  <Input
                    id="newRate"
                    type="number"
                    placeholder={locale==='ar' ? 'السعر اليومي بالريال' : 'Daily rate in SAR'}
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    min="0"
                    step="50"
                  />
                </div>
              </div>
              <Button 
                onClick={addItem}
                disabled={!newName.trim()}
                className="w-full md:w-auto"
              >
                {locale==='ar' ? 'إضافة التخصص' : 'Add Specialty'}
              </Button>
            </div>

            {specialties.length === 0 ? (
              <div className="text-sm text-muted-foreground">{locale==='ar' ? 'لا توجد تخصصات بعد.' : 'No specialties yet.'}</div>
            ) : (
              <div className="space-y-3">
                {specialties.map((specialty) => (
                  <div key={specialty.name} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg bg-muted/20">
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{specialty.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {locale==='ar' ? 'السعر اليومي المقترح:' : 'Suggested daily rate:'} 
                        <span className="font-medium text-blue-600 ml-1">
                          {specialty.dailyRate ? `${specialty.dailyRate.toLocaleString()} ${locale==='ar' ? 'ريال' : 'SAR'}` : (locale==='ar' ? 'غير محدد' : 'Not set')}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 sm:mt-0">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(specialty)}>
                        {locale==='ar' ? 'تعديل' : 'Edit'}
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => removeItem(specialty.name)}>
                        {locale==='ar' ? 'حذف' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{locale==='ar' ? 'تعديل التخصص' : 'Edit Specialty'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editName">{locale==='ar' ? 'التخصص' : 'Specialty'}</Label>
                <Input
                  id="editName"
                  placeholder={locale==='ar' ? 'أدخل التخصص' : 'Enter specialty'}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="editRate">{locale==='ar' ? 'السعر اليومي المقترح (ريال)' : 'Suggested Daily Rate (SAR)'}</Label>
                <Input
                  id="editRate"
                  type="number"
                  placeholder={locale==='ar' ? 'السعر اليومي بالريال' : 'Daily rate in SAR'}
                  value={editRate}
                  onChange={(e) => setEditRate(e.target.value)}
                  min="0"
                  step="50"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                {locale==='ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button onClick={saveEdit} disabled={!editName.trim()}>
                {locale==='ar' ? 'حفظ' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
