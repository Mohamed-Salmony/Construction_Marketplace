import { useState } from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { getAdminRentalOptions } from '../../lib/adminOptions';
import { DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';

interface RentalFormProps {
  product?: any;
  onSave: (product: any) => void;
  onCancel: () => void;
}

// Rental category options are now admin-managed with a fallback to previous defaults
const FALLBACK_RENTAL_CATEGORY_OPTIONS = [
  'أدوات بناء',
  'ادوات صيانه',
  'ادوات تشطيب',
] as const;

export default function RentalForm({ product, onSave, onCancel }: RentalFormProps) {
  const adminRentalCats = getAdminRentalOptions().categories;
  const RENTAL_CATEGORY_OPTIONS = (Array.isArray(adminRentalCats) && adminRentalCats.length) ? adminRentalCats : FALLBACK_RENTAL_CATEGORY_OPTIONS;
  const [formData, setFormData] = useState<any>({
    nameAr: product?.nameAr || product?.name || '',
    nameEn: product?.nameEn || '',
    category: product?.category || '',
    price: product?.price ?? '',
    // interpret stock as rental days in UI
    stock: product?.stock ?? 1,
    descriptionAr: product?.descriptionAr || '',
    descriptionEn: product?.descriptionEn || '',
    image: product?.image || '',
    images: (product as any)?.images || (product?.image ? [product.image] : []),
    specificationsEntries: Object.entries(((product as any)?.specifications) || {}).map(([key, value]: [string, any]) => ({
      key,
      value: typeof value === 'object' && value !== null ? (value.ar ?? value.en ?? String(value)) : String(value)
    })),
    compatibilityList: Array.isArray((product as any)?.compatibility)
      ? ((product as any)?.compatibility as any[]).map((c: any) => (typeof c === 'object' && c !== null ? (c.ar ?? c.en ?? '') : String(c)))
      : [],
    isActive: product?.isActive || product?.status === 'active' || false,
    // Vendor-defined installation option (same as ProductForm)
    addonInstallEnabled: product?.addonInstallEnabled || (product as any)?.addonInstallation?.enabled || false,
    addonInstallFee: (product?.addonInstallFee ?? (product as any)?.addonInstallation?.feePerUnit) ?? 50,
    ...product,
  });

  // no predefined name options; vendor types the name manually

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = Number(String(formData.price || '').replace(/[^0-9]/g, '')) || 0;
    const daysNum = Number(String(formData.stock || '').replace(/[^0-9]/g, '')) || 1;
    const imgs: string[] = Array.isArray((formData as any).images) ? (formData as any).images : [];
    const main = formData.image || imgs[0] || '';
    const uniqueImages = Array.from(new Set([main, ...imgs.filter(Boolean)]));
    const specsObj = Array.isArray((formData as any).specificationsEntries)
      ? (formData as any).specificationsEntries.reduce((acc: Record<string, string>, item: any) => {
          const k = String(item?.key || '').trim();
          if (k) acc[k] = String(item?.value ?? '');
          return acc;
        }, {})
      : {};
    const compatibilityArr = Array.isArray((formData as any).compatibilityList)
      ? (formData as any).compatibilityList.map((s: any) => String(s || '').trim()).filter(Boolean)
      : [];

    onSave({
      ...formData,
      name: formData.nameAr || formData.nameEn,
      price: priceNum,
      stock: daysNum,
      image: main,
      images: uniqueImages,
      status: formData.isActive ? 'active' : 'draft',
      specifications: specsObj,
      compatibility: compatibilityArr,
      // normalize addon object as well (same shape as ProductForm)
      addonInstallation: { enabled: !!formData.addonInstallEnabled, feePerUnit: Number(formData.addonInstallFee || 0) },
      id: product?.id || Date.now().toString(),
    });
  };

  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white dark:bg-zinc-900 border shadow-xl">
      <DialogHeader>
        <DialogTitle>{product ? 'تعديل التأجير' : 'إضافة تأجير جديد'}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Name (free text) */}
        <div>
          <Label htmlFor="nameAr">اسم المنتج للتأجير</Label>
          <Input id="nameAr" value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} placeholder="اكتب اسم المنتج" required />
        </div>

        {/* Category (restricted select) */}
        <div>
          <Label>الفئة</Label>
          <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
            <SelectTrigger>
              <SelectValue placeholder="اختر الفئة" />
            </SelectTrigger>
            <SelectContent>
              {RENTAL_CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Price (single) */}
        <div>
          <Label htmlFor="price">السعر</Label>
          <Input
            id="price"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value.replace(/[^0-9]/g, '') })}
            required
          />
        </div>

        {/* Rental days instead of stock */}
        <div>
          <Label htmlFor="rentalDays">عدد أيام التأجير</Label>
          <Input
            id="rentalDays"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={formData.stock}
            onChange={(e) => setFormData({ ...formData, stock: e.target.value.replace(/[^0-9]/g, '') })}
            required
          />
        </div>

        {/* Images / Documents */}
        <div className="md:col-span-2">
          <Label htmlFor="imageFile">الصور / المستندات</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
            <div>
              <Label htmlFor="imageFile" className="text-sm text-muted-foreground">ارفع صور أو مستندات من جهازك</Label>
              <div className="relative inline-block">
                <Input
                  id="imageFile"
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  multiple
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    const readers = files.map((file) => new Promise<string>((resolve) => {
                      const r = new FileReader();
                      r.onload = () => resolve(String(r.result || ''));
                      r.readAsDataURL(file);
                    }));
                    Promise.all(readers).then((base64s) => {
                      const newImages = [...(formData.images as string[] || []), ...base64s];
                      const main = formData.image || base64s[0] || '';
                      setFormData({ ...formData, image: main, images: newImages });
                    });
                  }}
                />
                <Button type="button" variant="outline">اختيار صور</Button>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {(formData.images as string[]).length > 0 ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                    {(formData.images as string[]).length} صورة محددة
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">لا توجد صور محددة</span>
                )}
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">الصورة الرئيسية (ستظهر في القائمة والتفاصيل)</Label>
              <div className="mt-2 w-full h-44 rounded-md border overflow-hidden bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {formData.image ? (
                  <Image src={formData.image} alt="preview" className="max-h-full object-contain" width={200} height={176} />
                ) : (
                  <span className="text-xs text-muted-foreground">لا توجد صورة بعد</span>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Thumbnails */}
        <div className="mt-3">
          <Label className="text-sm text-muted-foreground">صور إضافية</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {(formData.images as string[] || []).map((src, idx) => (
              <div key={idx} className={`relative w-16 h-16 border rounded overflow-hidden bg-white dark:bg-gray-800 ${formData.image===src ? 'ring-2 ring-primary' : ''}`}>
                <button
                  type="button"
                  className="absolute -top-1 -right-1 z-10 bg-white/90 dark:bg-gray-900/90 border rounded-full p-0.5 shadow"
                  aria-label="حذف الصورة"
                  title="حذف الصورة"
                  onClick={() => {
                    const arr = [...(formData.images as string[] || [])];
                    arr.splice(idx, 1);
                    const isMain = formData.image === src;
                    const newMain = isMain ? (arr[0] || '') : formData.image;
                    setFormData({ ...formData, images: arr, image: newMain });
                  }}
                >
                  <X className="w-3 h-3 text-red-600" />
                </button>
                <button
                  type="button"
                  className="w-full h-full flex items-center justify-center"
                  onClick={() => setFormData({ ...formData, image: src })}
                  title={formData.image===src ? 'الصورة الرئيسية' : 'تعيين كصورة رئيسية'}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`thumb-${idx}`} className="max-h-full object-contain" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Descriptions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="descriptionAr">الوصف (عربي)</Label>
            <Textarea id="descriptionAr" value={formData.descriptionAr} onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })} rows={4} />
          </div>
          <div>
            <Label htmlFor="descriptionEn">الوصف (إنجليزي)</Label>
            <Textarea id="descriptionEn" value={formData.descriptionEn} onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })} rows={4} />
          </div>
        </div>

        {/* Specifications */}
        <div className="space-y-3">
          <Label>المواصفات</Label>
          <div className="space-y-2">
            {((formData as any).specificationsEntries as Array<{ key: string; value: string }>)?.map((row, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <div className="md:col-span-2">
                  <Input
                    placeholder="العنوان (مثال: القدرة)"
                    value={row.key}
                    onChange={(e) => {
                      const arr = [ ...((formData as any).specificationsEntries || []) ];
                      arr[idx] = { ...arr[idx], key: e.target.value };
                      setFormData({ ...formData, specificationsEntries: arr });
                    }}
                  />
                </div>
                <div className="md:col-span-3">
                  <Input
                    placeholder="القيمة (مثال: 5kW)"
                    value={row.value}
                    onChange={(e) => {
                      const arr = [ ...((formData as any).specificationsEntries || []) ];
                      arr[idx] = { ...arr[idx], value: e.target.value };
                      setFormData({ ...formData, specificationsEntries: arr });
                    }}
                  />
                </div>
                <div className="md:col-span-5 flex justify-end">
                  <Button type="button" variant="destructive" size="sm" onClick={() => {
                    const arr = [ ...((formData as any).specificationsEntries || []) ];
                    arr.splice(idx, 1);
                    setFormData({ ...formData, specificationsEntries: arr });
                  }}>
                    حذف السطر
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFormData({
              ...formData,
              specificationsEntries: [ ...((formData as any).specificationsEntries || []), { key: '', value: '' } ]
            })}
          >
            إضافة مواصفة
          </Button>
        </div>

        {/* Compatibility */}
        <div className="space-y-3">
          <Label>التوافق</Label>
          <div className="space-y-2">
            {((formData as any).compatibilityList as string[])?.map((val, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <div className="md:col-span-4">
                  <Input
                    placeholder="مثال: متوافق مع موديلات معينة"
                    value={val}
                    onChange={(e) => {
                      const arr = [ ...((formData as any).compatibilityList || []) ];
                      arr[idx] = e.target.value;
                      setFormData({ ...formData, compatibilityList: arr });
                    }}
                  />
                </div>
                <div className="md:col-span-1 flex">
                  <Button type="button" variant="destructive" size="sm" className="w-full" onClick={() => {
                    const arr = [ ...((formData as any).compatibilityList || []) ];
                    arr.splice(idx, 1);
                    setFormData({ ...formData, compatibilityList: arr });
                  }}>
                    حذف
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFormData({
              ...formData,
              compatibilityList: [ ...((formData as any).compatibilityList || []), '' ]
            })}
          >
            إضافة سطر توافق
          </Button>
        </div>

        {/* Installation option controlled by vendor (same as ProductForm) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="addonInstallEnabled"
              checked={!!formData.addonInstallEnabled}
              onCheckedChange={(checked) => setFormData({ ...formData, addonInstallEnabled: !!checked })}
            />
            <Label htmlFor="addonInstallEnabled">يقدم خدمة التركيب</Label>
          </div>
          {formData.addonInstallEnabled && (
            <div>
              <Label htmlFor="addonInstallFee">رسوم خدمة التركيب لكل قطعة (ريال)</Label>
              <Input
                id="addonInstallFee"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={String(formData.addonInstallFee ?? '')}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, '');
                  setFormData({ ...formData, addonInstallFee: v });
                }}
              />
            </div>
          )}
        </div>

        <div className="flex gap-4 pt-4">
          <Button type="submit" className="flex-1">
            {product ? 'حفظ التغييرات' : 'إضافة التأجير'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
