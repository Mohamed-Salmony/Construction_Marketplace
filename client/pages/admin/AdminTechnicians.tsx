import React, { useEffect, useMemo, useState } from 'react';
import Header from '../../components/Header';
import type { RouteContext } from '../../components/Router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Users, Search, Filter, Eye, CheckCircle, Ban, ArrowRight, Pencil } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import UserAvatar from '../../components/UserAvatar';
import { getUsers as adminGetUsers } from '@/services/admin';
import { approveTechnician, suspendTechnician } from '@/services/admin';
import { getAdminUserById, type AdminUserDetails } from '@/services/adminUsers';
import { useFirstLoadOverlay } from '../../hooks/useFirstLoadOverlay';

interface Row {
  id: string;
  name: string;
  email: string;
  phone: string;
  city?: string;
  country?: string;
  createdAt?: string;
  status: 'active' | 'pending' | 'suspended';
  profilePicture?: string;
}

export default function AdminTechnicians({ setCurrentPage, ...context }: Partial<RouteContext>) {
  const { t, locale } = useTranslation();
  const isAr = locale === 'ar';
  const hideFirstOverlay = useFirstLoadOverlay(context, isAr ? 'جاري تحميل الفنيين' : 'Loading technicians', isAr ? 'يرجى الانتظار' : 'Please wait');

  // Map common profession values to Arabic for display
  const mapProfessionAr = (val?: string | null) => {
    if (!val) return '—';
    const s = String(val).trim().toLowerCase();
    const dict: Record<string, string> = {
      electrician: 'كهربائي',
      plumber: 'سباك',
      carpenter: 'نجار',
      painter: 'دهّان',
      welder: 'لحّام',
      mechanic: 'ميكانيكي',
      mason: 'بنّاء',
      tiler: 'فني بلاط',
      roofer: 'سقّاف',
      hvac: 'فني تكييف',
      'hvac technician': 'فني تكييف',
      technician: 'فني',
    };
    return dict[s] || val;
  };

  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | Row['status']>('all');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<Row | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewUser, setViewUser] = useState<AdminUserDetails | null>(null);
  
  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUserDetails | null>(null);
  const [editDailyRate, setEditDailyRate] = useState<string>('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const load = async () => {
    try {
      const r = await adminGetUsers({ role: 'Technician' });
      if (r.ok && r.data && Array.isArray((r.data as any).items)) {
        const list = (r.data as any).items.map((u: any) => ({
          id: String(u.id),
          name: u.name || '',
          email: u.email || '',
          phone: u.phoneNumber || '',
          city: u.city,
          country: u.country,
          createdAt: u.createdAt,
          status: (u.isActive ? 'active' : (!u.isVerified ? 'pending' : 'suspended')) as Row['status'],
          profilePicture: u.profilePicture || ''
        })) as Row[];
        setRows(list);
      } else setRows([]);
    } catch { setRows([]); }
  };

  const openView = async (userId: string) => {
    setViewOpen(true); setViewLoading(true); setViewError(null); setViewUser(null);
    try {
      const res = await getAdminUserById(userId);
      if (res.ok && res.data && (res.data as any).item) setViewUser((res.data as any).item as AdminUserDetails);
      else setViewError(isAr ? 'فشل تحميل المستخدم' : 'Failed to load user');
    } catch { setViewError(isAr ? 'فشل تحميل المستخدم' : 'Failed to load user'); }
    finally { setViewLoading(false); }
  };

  useEffect(() => { (async () => { await load(); hideFirstOverlay(); })(); }, [hideFirstOverlay]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter(r => {
      const matches = !s || r.name.toLowerCase().includes(s) || r.email.toLowerCase().includes(s) || r.phone.toLowerCase().includes(s);
      const st = status === 'all' || r.status === status;
      return matches && st;
    });
  }, [rows, search, status]);

  const approve = async (u: Row) => {
    try {
      const r = await approveTechnician(u.id);
      if (r.ok) await load();
    } catch { }
  };
  const suspend = async (u: Row) => {
    try {
      const r = await suspendTechnician(u.id);
      if (r.ok) await load();
    } catch { }
  };

  const openEdit = async (userId: string) => {
    try {
      setEditLoading(true);
      setEditError(null);
      const r = await getAdminUserById(userId);
      if (r.ok && r.data && (r.data as any).item) {
        const user = (r.data as any).item as AdminUserDetails;
        setEditUser(user);
        setEditDailyRate(String(user.dailyRate || 0));
        setEditOpen(true);
      } else {
        setEditError(isAr ? 'فشل في تحميل بيانات المستخدم' : 'Failed to load user data');
      }
    } catch (error) {
      setEditError(isAr ? 'خطأ في تحميل البيانات' : 'Error loading data');
    } finally {
      setEditLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!editUser) return;
    try {
      setEditLoading(true);
      const { updateAdminUser } = await import('@/services/adminUsers');
      const result = await updateAdminUser(editUser.id, {
        dailyRate: Number(editDailyRate) || 0
      });
      
      if (result.ok) {
        setEditOpen(false);
        // Update view if it's open for the same user
        if (viewUser && viewUser.id === editUser.id) {
          await openView(editUser.id);
        }
      } else {
        alert(isAr ? 'فشل في حفظ التغييرات' : 'Failed to save changes');
      }
    } catch (error) {
      alert(isAr ? 'خطأ في الحفظ' : 'Error saving');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header {...context} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Button variant="outline" onClick={() => setCurrentPage && setCurrentPage('admin-dashboard')} className="mr-4">
              <ArrowRight className="ml-2 h-4 w-4" />
              {isAr ? 'العودة للوحة التحكم' : 'Back to Dashboard'}
            </Button>
          </div>
          <h1 className="mb-2">{isAr ? 'إدارة الفنيين' : 'Manage Technicians'}</h1>
          <p className="text-muted-foreground">{isAr ? 'عرض جميع الفنيين (المعتمدين وقيد المراجعة) مع مراجعة بيانات التسجيل قبل الموافقة.' : 'View all technicians (approved and pending) and review registration data before approval.'}</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center"><Filter className="mr-2 h-5 w-5" />{isAr ? 'بحث وتصفية' : 'Search & Filter'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder={isAr ? 'ابحث بالاسم أو البريد أو الهاتف' : 'Search by name, email or phone'} value={search} onChange={e => setSearch(e.target.value)} className="pr-10" />
              </div>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger><SelectValue placeholder={isAr ? 'الحالة' : 'Status'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="active">{isAr ? 'نشط' : 'Active'}</SelectItem>
                  <SelectItem value="pending">{isAr ? 'قيد المراجعة' : 'Pending'}</SelectItem>
                  <SelectItem value="suspended">{isAr ? 'معلق' : 'Suspended'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5" />{isAr ? 'الفنيون' : 'Technicians'} ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filtered.map(u => (
                <div key={u.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4 space-x-reverse w-full min-w-0">
                    <UserAvatar 
                      src={u.profilePicture} 
                      name={u.name} 
                      size="lg"
                      className="shrink-0"
                    />
                    <div className="space-y-1 w-full min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium break-words max-w-full leading-snug">{u.name}</h3>
                        <Badge variant={u.status === 'active' ? 'default' : u.status === 'pending' ? 'secondary' : 'destructive'}>
                          {u.status === 'active' ? (isAr ? 'نشط' : 'Active') : u.status === 'pending' ? (isAr ? 'قيد المراجعة' : 'Pending') : (isAr ? 'معلق' : 'Suspended')}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <div className="break-words">{u.email}</div>
                        <div className="break-words">{u.phone}</div>
                        {(u.city || u.country) && (<div className="break-words">{u.city} {u.country}</div>)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => openView(u.id)}><Eye className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(u.id)}><Pencil className="h-4 w-4" /></Button>
                    {u.status === 'active' ? (
                      <Button size="sm" variant="outline" onClick={() => suspend(u)}><Ban className="h-4 w-4" /></Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => approve(u)}><CheckCircle className="h-4 w-4" /></Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">{isAr ? 'لا توجد نتائج' : 'No results'}</div>
            )}
          </CardContent>
        </Card>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{isAr ? 'تفاصيل التسجيل' : 'Registration Details'}</DialogTitle>
            </DialogHeader>
            {detail && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-muted-foreground">{isAr ? 'الاسم' : 'Name'}</Label>
                  <div>{detail.name}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <div>{detail.email}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">{isAr ? 'الهاتف' : 'Phone'}</Label>
                  <div>{detail.phone}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">{isAr ? 'المدينة' : 'City'}</Label>
                  <div>{detail.city || '-'}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">{isAr ? 'الدولة' : 'Country'}</Label>
                  <div>{detail.country || '-'}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">{isAr ? 'تاريخ الإنشاء' : 'Created at'}</Label>
                  <div>{detail.createdAt ? String(detail.createdAt).replace('T', ' ').slice(0, 16) : '-'}</div>
                </div>
                <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setDetailOpen(false)}>{isAr ? 'إغلاق' : 'Close'}</Button>
                  <Button onClick={() => { if (detail) approve(detail); setDetailOpen(false); }}>{isAr ? 'موافقة' : 'Approve'}</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Full user view */}
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="w-[95vw] sm:w-[640px] md:w-[800px] lg:w-[960px] xl:w-[1024px] max-w-none max-h-[90vh] overflow-y-auto">
            <DialogHeader className="text-center">
              <DialogTitle className="w-full text-center">{t('technicianDetails') || (isAr ? 'تفاصيل الفني' : 'Technician Details')}</DialogTitle>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto pr-1">
              {viewLoading && (<div className="text-sm text-muted-foreground">{isAr ? 'جارٍ التحميل...' : 'Loading...'}</div>)}
              {viewError && (<div className="text-sm text-red-600">{viewError}</div>)}
              {viewUser && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
                  <div className="lg:col-span-1 space-y-4">
                    <div>
                      <Label className="text-muted-foreground">{isAr ? 'الهوية' : 'ID'}</Label>
                      <div className="mt-2 w-full h-56 rounded-md border overflow-hidden bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                        {(() => {
                          const url = (viewUser.licenseImagePath || viewUser.documentPath || '').toLowerCase();
                          const isImg = /(\.png|\.jpg|\.jpeg|\.webp|\.gif)$/i.test(url);
                          if ((viewUser.licenseImagePath || viewUser.documentPath) && isImg) {
                            // eslint-disable-next-line @next/next/no-img-element
                            return <img src={(viewUser.licenseImagePath || viewUser.documentPath)!} alt="doc" className="max-h-full max-w-full object-contain" />;
                          }
                          if (viewUser.licenseImagePath || viewUser.documentPath) {
                            return <a className="text-primary underline" href={(viewUser.licenseImagePath || viewUser.documentPath)!} target="_blank" rel="noreferrer">{isAr ? 'عرض/تنزيل' : 'Open/Download'}</a>;
                          }
                          return <span className="text-xs text-muted-foreground">—</span>;
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">{isAr ? 'الاسم' : 'Name'}</Label>
                      <div className="font-medium">{viewUser.name}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <div>{viewUser.email}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{isAr ? 'الهاتف' : 'Phone'}</Label>
                      <div>{viewUser.phoneNumber}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{isAr?'المهنة':'Profession'}</Label>
                      <div>{isAr ? mapProfessionAr(viewUser.profession) : (viewUser.profession || '—')}</div>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-muted-foreground">{isAr ? 'العنوان' : 'Address'}</Label>
                      <div>{viewUser.address || '—'}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{isAr ? 'السعر اليومي' : 'Daily Rate'}</Label>
                      <div>{viewUser.dailyRate ? `${viewUser.dailyRate} ${isAr ? 'ريال' : 'SAR'}` : '—'}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">IBAN</Label>
                      <div dir="ltr">{viewUser.iban || '—'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{isAr ? 'تعديل بيانات الفني' : 'Edit Technician'}</DialogTitle>
            </DialogHeader>
            {editLoading && (<div className="text-sm text-muted-foreground">{isAr ? 'جارٍ التحميل...' : 'Loading...'}</div>)}
            {editError && (<div className="text-sm text-red-600">{editError}</div>)}
            {editUser && (
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">{isAr ? 'الاسم' : 'Name'}</Label>
                  <div className="font-medium">{editUser.name}</div>
                </div>
                <div>
                  <Label htmlFor="dailyRate">{isAr ? 'السعر اليومي (ريال سعودي)' : 'Daily Rate (SAR)'}</Label>
                  <Input
                    id="dailyRate"
                    type="number"
                    value={editDailyRate}
                    onChange={(e) => setEditDailyRate(e.target.value)}
                    placeholder={isAr ? 'أدخل السعر اليومي' : 'Enter daily rate'}
                    min="0"
                    step="1"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editLoading}>
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button onClick={saveEdit} disabled={editLoading}>
                    {editLoading ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ' : 'Save')}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
