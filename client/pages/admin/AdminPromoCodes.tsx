import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Tag, Calendar, Users, TrendingUp } from 'lucide-react';
import Header from '../../components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { useTranslation } from '../../hooks/useTranslation';
import { useFirstLoadOverlay } from '../../hooks/useFirstLoadOverlay';
import type { RouteContext } from '../../components/Router';
import { 
  getPromoCodes, 
  createPromoCode, 
  updatePromoCode, 
  deletePromoCode,
  type PromoCode,
  type PromoCodeStats 
} from '../../services/promoCodes';
import { toastSuccess, toastError } from '../../utils/alerts';

interface AdminPromoCodesProps extends Partial<RouteContext> {}

export default function AdminPromoCodes(props: AdminPromoCodesProps) {
  const { locale } = useTranslation();
  const hideFirstOverlay = useFirstLoadOverlay(
    props,
    locale === 'ar' ? 'جاري تحميل رموز الخصم' : 'Loading promo codes',
    locale === 'ar' ? 'يرجى الانتظار' : 'Please wait'
  );

  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [stats, setStats] = useState<PromoCodeStats>({ total: 0, active: 0, expired: 0, totalUsages: 0 });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: '',
    maxUses: '',
    maxUsesPerUser: '1',
    minOrderAmount: '0',
    startDate: '',
    endDate: '',
    isActive: true
  });

  const loadPromoCodes = async () => {
    setLoading(true);
    try {
      const response = await getPromoCodes({
        search: searchTerm || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter
      });

      if (response.ok && response.data) {
        setPromoCodes(response.data.data);
        setStats(response.data.stats);
      } else {
        toastError(locale === 'ar' ? 'فشل تحميل رموز الخصم' : 'Failed to load promo codes');
      }
    } catch (error) {
      console.error('Load promo codes error:', error);
      toastError(locale === 'ar' ? 'خطأ في تحميل البيانات' : 'Error loading data');
    } finally {
      setLoading(false);
      hideFirstOverlay();
    }
  };

  useEffect(() => {
    loadPromoCodes();
  }, [searchTerm, statusFilter]);

  const resetForm = () => {
    setFormData({
      code: '',
      discountType: 'percentage',
      discountValue: '',
      maxUses: '',
      maxUsesPerUser: '1',
      minOrderAmount: '0',
      startDate: '',
      endDate: '',
      isActive: true
    });
    setEditingPromo(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (promo: PromoCode) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue.toString(),
      maxUses: promo.maxUses?.toString() || '',
      maxUsesPerUser: promo.maxUsesPerUser.toString(),
      minOrderAmount: promo.minOrderAmount.toString(),
      startDate: new Date(promo.startDate).toISOString().split('T')[0],
      endDate: promo.endDate ? new Date(promo.endDate).toISOString().split('T')[0] : '',
      isActive: promo.isActive
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.code.trim() || !formData.discountValue) {
      toastError(locale === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    setSaving(true);
    try {
      const data = {
        code: formData.code.trim().toUpperCase(),
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        maxUses: formData.maxUses ? Number(formData.maxUses) : undefined,
        maxUsesPerUser: Number(formData.maxUsesPerUser),
        minOrderAmount: Number(formData.minOrderAmount),
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
        isActive: formData.isActive
      };

      const response = editingPromo 
        ? await updatePromoCode(editingPromo._id, data)
        : await createPromoCode(data);

      if (response.ok) {
        toastSuccess(
          editingPromo 
            ? (locale === 'ar' ? 'تم تحديث رمز الخصم بنجاح' : 'Promo code updated successfully')
            : (locale === 'ar' ? 'تم إنشاء رمز الخصم بنجاح' : 'Promo code created successfully')
        );
        setDialogOpen(false);
        resetForm();
        loadPromoCodes();
      } else {
        toastError(response.message || (locale === 'ar' ? 'فشلت العملية' : 'Operation failed'));
      }
    } catch (error) {
      console.error('Save promo code error:', error);
      toastError(locale === 'ar' ? 'خطأ في الحفظ' : 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (promo: PromoCode) => {
    if (!confirm(locale === 'ar' ? 'هل أنت متأكد من حذف هذا الرمز؟' : 'Are you sure you want to delete this code?')) {
      return;
    }

    try {
      const response = await deletePromoCode(promo._id);
      if (response.ok) {
        toastSuccess(locale === 'ar' ? 'تم حذف رمز الخصم' : 'Promo code deleted');
        loadPromoCodes();
      } else {
        toastError(response.message || (locale === 'ar' ? 'فشل الحذف' : 'Delete failed'));
      }
    } catch (error) {
      console.error('Delete promo code error:', error);
      toastError(locale === 'ar' ? 'خطأ في الحذف' : 'Error deleting');  
    }
  };

  const getStatusBadge = (promo: PromoCode) => {
    const now = new Date();
    const startDate = new Date(promo.startDate);
    const endDate = promo.endDate ? new Date(promo.endDate) : null;
    
    if (!promo.isActive) {
      return <Badge variant="secondary">{locale === 'ar' ? 'معطل' : 'Inactive'}</Badge>;
    }
    
    if (now < startDate) {
      return <Badge variant="outline">{locale === 'ar' ? 'مجدول' : 'Scheduled'}</Badge>;
    }
    
    if (endDate && now > endDate) {
      return <Badge variant="destructive">{locale === 'ar' ? 'منتهي' : 'Expired'}</Badge>;
    }
    
    if (promo.maxUses && promo.currentUses >= promo.maxUses) {
      return <Badge variant="destructive">{locale === 'ar' ? 'مستنفد' : 'Used Up'}</Badge>;
    }
    
    return <Badge variant="default">{locale === 'ar' ? 'نشط' : 'Active'}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header {...props} />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{locale === 'ar' ? 'إدارة رموز الخصم' : 'Promo Codes Management'}</h1>
            <p className="text-muted-foreground">
              {locale === 'ar' ? 'إنشاء وإدارة رموز الخصم للعملاء' : 'Create and manage discount codes for customers'}
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            {locale === 'ar' ? 'رمز خصم جديد' : 'New Promo Code'}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Tag className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">{locale === 'ar' ? 'إجمالي الرموز' : 'Total Codes'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-sm text-muted-foreground">{locale === 'ar' ? 'نشط' : 'Active'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <div className="text-2xl font-bold text-orange-600">{stats.expired}</div>
              <div className="text-sm text-muted-foreground">{locale === 'ar' ? 'منتهي الصلاحية' : 'Expired'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold text-blue-600">{stats.totalUsages}</div>
              <div className="text-sm text-muted-foreground">{locale === 'ar' ? 'مرات الاستخدام' : 'Total Uses'}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">{locale === 'ar' ? 'البحث' : 'Search'}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder={locale === 'ar' ? 'ابحث عن رمز الخصم...' : 'Search promo codes...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label>{locale === 'ar' ? 'الحالة' : 'Status'}</Label>
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{locale === 'ar' ? 'جميع الحالات' : 'All Status'}</SelectItem>
                    <SelectItem value="active">{locale === 'ar' ? 'نشط' : 'Active'}</SelectItem>
                    <SelectItem value="inactive">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Promo Codes List */}
        <Card>
          <CardHeader>
            <CardTitle>{locale === 'ar' ? 'رموز الخصم' : 'Promo Codes'}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
              </div>
            ) : promoCodes.length === 0 ? (
              <div className="text-center py-8">
                <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <div className="text-muted-foreground">{locale === 'ar' ? 'لا توجد رموز خصم' : 'No promo codes found'}</div>
              </div>
            ) : (
              <div className="space-y-4">
                {promoCodes.map((promo) => (
                  <div key={promo._id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <code className="font-mono text-lg font-bold">{promo.code}</code>
                        {getStatusBadge(promo)}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>
                          {locale === 'ar' ? 'نوع الخصم:' : 'Discount:'} {' '}
                          <span className="font-medium">
                            {promo.discountType === 'percentage' 
                              ? `${promo.discountValue}%`
                              : `${promo.discountValue} ${locale === 'ar' ? 'ريال' : 'SAR'}`
                            }
                          </span>
                        </div>
                        <div>
                          {locale === 'ar' ? 'الاستخدام:' : 'Usage:'} {' '}
                          <span className="font-medium">
                            {promo.currentUses} / {promo.maxUses || '∞'}
                          </span>
                        </div>
                        {promo.minOrderAmount > 0 && (
                          <div>
                            {locale === 'ar' ? 'الحد الأدنى:' : 'Min order:'} {' '}
                            <span className="font-medium">{promo.minOrderAmount} {locale === 'ar' ? 'ريال' : 'SAR'}</span>
                          </div>
                        )}
                        {promo.endDate && (
                          <div>
                            {locale === 'ar' ? 'ينتهي:' : 'Expires:'} {' '}
                            <span className="font-medium">
                              {new Date(promo.endDate).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(promo)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(promo)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingPromo 
                  ? (locale === 'ar' ? 'تعديل رمز الخصم' : 'Edit Promo Code')
                  : (locale === 'ar' ? 'رمز خصم جديد' : 'New Promo Code')
                }
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="code">{locale === 'ar' ? 'رمز الخصم' : 'Promo Code'} *</Label>
                <Input
                  id="code"
                  placeholder={locale === 'ar' ? 'مثل: WELCOME10' : 'e.g., WELCOME10'}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  disabled={!!editingPromo}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{locale === 'ar' ? 'نوع الخصم' : 'Discount Type'}</Label>
                  <Select 
                    value={formData.discountType} 
                    onValueChange={(value: any) => setFormData({ ...formData, discountType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">{locale === 'ar' ? 'نسبة مئوية' : 'Percentage'}</SelectItem>
                      <SelectItem value="fixed">{locale === 'ar' ? 'قيمة ثابتة' : 'Fixed Amount'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="discountValue">
                    {formData.discountType === 'percentage' 
                      ? (locale === 'ar' ? 'النسبة %' : 'Percentage %')
                      : (locale === 'ar' ? 'المبلغ (ريال)' : 'Amount (SAR)')
                    } *
                  </Label>
                  <Input
                    id="discountValue"
                    type="number"
                    min="0"
                    max={formData.discountType === 'percentage' ? "100" : undefined}
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxUses">{locale === 'ar' ? 'عدد الاستخدامات' : 'Max Uses'}</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    min="1"
                    placeholder={locale === 'ar' ? 'غير محدود' : 'Unlimited'}
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="maxUsesPerUser">{locale === 'ar' ? 'لكل مستخدم' : 'Per User'}</Label>
                  <Input
                    id="maxUsesPerUser"
                    type="number"
                    min="1"
                    value={formData.maxUsesPerUser}
                    onChange={(e) => setFormData({ ...formData, maxUsesPerUser: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="minOrderAmount">{locale === 'ar' ? 'الحد الأدنى للطلب' : 'Min Order Amount'}</Label>
                <Input
                  id="minOrderAmount"
                  type="number"
                  min="0"
                  value={formData.minOrderAmount}
                  onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">{locale === 'ar' ? 'تاريخ البداية' : 'Start Date'}</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">{locale === 'ar' ? 'تاريخ النهاية' : 'End Date'}</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">{locale === 'ar' ? 'تفعيل الرمز' : 'Activate Code'}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (locale === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (locale === 'ar' ? 'حفظ' : 'Save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
