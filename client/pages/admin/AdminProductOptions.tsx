import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Header from '../../components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useTranslation } from '../../hooks/useTranslation';
import type { RouteContext } from '../../components/Router';
import { getAllCategories, type CategoryDto, createCategory, updateCategory, deleteCategory } from '@/services/products';
import { api } from '../../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useFirstLoadOverlay } from '../../hooks/useFirstLoadOverlay';

export default function AdminProductOptions(props: Partial<RouteContext>) {
  const { locale } = useTranslation();
  const hideFirstOverlay = useFirstLoadOverlay(props, locale==='ar' ? 'جاري تحميل الفئات' : 'Loading categories', locale==='ar' ? 'يرجى الانتظار' : 'Please wait');
  // New category inputs (Arabic and English)
  const [newCategoryAr, setNewCategoryAr] = useState('');
  const [newCategoryEn, setNewCategoryEn] = useState('');
  const [newDescriptionAr, setNewDescriptionAr] = useState('');
  const [newDescriptionEn, setNewDescriptionEn] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const newImageInputRef = useRef<HTMLInputElement | null>(null);
  const [newImageUploading, setNewImageUploading] = useState(false);
  const [itemImageUploadingId, setItemImageUploadingId] = useState<string | null>(null);
  const itemImageInputRef = useRef<HTMLInputElement | null>(null);
  const [newParentId, setNewParentId] = useState<string | ''>('');
  const [newIsActive, setNewIsActive] = useState(true);
  const [newSortOrder, setNewSortOrder] = useState<number | ''>('');
  // DB categories
  const [dbCategories, setDbCategories] = useState<CategoryDto[] | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  // Edit dialog state
  const [editing, setEditing] = useState<null | CategoryDto>(null);
  const [editNameAr, setEditNameAr] = useState('');
  const [editNameEn, setEditNameEn] = useState('');
  const [editDescAr, setEditDescAr] = useState('');
  const [editDescEn, setEditDescEn] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editParentId, setEditParentId] = useState<string | ''>('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSortOrder, setEditSortOrder] = useState<number | ''>('');
  const editImageInputRef = useRef<HTMLInputElement | null>(null);
  const [editUploading, setEditUploading] = useState(false);

  useEffect(() => {
    // Load categories from DB
    let mounted = true;
    const load = async () => {
      try {
        setDbLoading(true);
        setDbError(null);
        const { ok, data } = await getAllCategories();
        if (!mounted) return;
        if (ok && Array.isArray(data)) {
          const mapped = (data as any[]).map((c) => ({
            ...c,
            id: String((c as any).id ?? (c as any)._id),
          }));
          setDbCategories(mapped as any);
        } else {
          setDbCategories([]);
          setDbError(locale==='ar' ? 'تعذر جلب الفئات من الخادم' : 'Failed to fetch categories from server');
        }
      } catch {
        if (!mounted) return;
        setDbCategories([]);
        setDbError(locale==='ar' ? 'تعذر الاتصال بالخادم' : 'Failed to contact server');
      } finally {
        if (mounted) setDbLoading(false);
        if (mounted) hideFirstOverlay();
      }
    };
    void load();
    return () => { mounted = false; };
  }, [locale]); // Removed hideFirstOverlay to prevent infinite loops

  const handlePickNewImage = () => {
    newImageInputRef.current?.click();
  };

  const handleNewImageSelected: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setNewImageUploading(true);
      const { ok, data } = await api.uploadFile(file, 'images');
      if (ok && data?.success) {
        setNewImageUrl(data.url);
      } else {
        alert('Failed to upload image');
      }
    } finally {
      setNewImageUploading(false);
      e.target.value = '';
    }
  };

  const triggerItemImageUpload = (categoryId: string) => {
    setItemImageUploadingId(categoryId);
    itemImageInputRef.current?.click();
  };

  const handleItemImageSelected: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    const catId = itemImageUploadingId;
    if (!file || !catId) { setItemImageUploadingId(null); return; }
    try {
      const { ok, data } = await api.uploadFile(file, 'images');
      if (ok && data?.success) {
        const { ok: okUpdate } = await updateCategory(String(catId), { imageUrl: data.url } as any);
        if (okUpdate) await reload();
        else alert(locale==='ar' ? 'فشل تحديث الصورة' : 'Failed to update image');
      } else {
        alert(locale==='ar' ? 'فشل رفع الصورة' : 'Image upload failed');
      }
    } finally {
      setItemImageUploadingId(null);
      e.target.value = '';
    }
  };

  const reload = async () => {
    try {
      setDbLoading(true);
      const { ok, data } = await getAllCategories();
      if (ok && Array.isArray(data)) {
        const mapped = (data as any[]).map((c) => ({
          ...c,
          id: String((c as any).id ?? (c as any)._id),
        }));
        setDbCategories(mapped as any);
      }
    } finally {
      setDbLoading(false);
    }
  };

  const addCategory = async () => {
    const ar = newCategoryAr.trim();
    const en = newCategoryEn.trim();
    if (!ar || !en) return;
    try {
      const payload: any = {
        nameAr: ar,
        nameEn: en,
        descriptionAr: newDescriptionAr.trim() || null,
        descriptionEn: newDescriptionEn.trim() || null,
        imageUrl: newImageUrl.trim() || null,
        parentCategoryId: newParentId === '' ? null : String(newParentId),
        isActive: newIsActive,
        sortOrder: newSortOrder === '' ? undefined : Number(newSortOrder)
      };
      const result = await createCategory(payload);
      if (result?.ok !== false) {
        setNewCategoryAr('');
        setNewCategoryEn('');
        setNewDescriptionAr('');
        setNewDescriptionEn('');
        setNewImageUrl('');
        setNewParentId('');
        setNewIsActive(true);
        setNewSortOrder('');
        await reload();
        console.log('Category added successfully');
      } else {
        console.error('Create category failed:', result);
        alert(locale==='ar' ? 'فشل إضافة الفئة' : 'Failed to add category');
      }
    } catch (error) {
      console.error('Add category error:', error);
      alert(locale==='ar' ? 'خطأ في إضافة الفئة' : 'Error adding category');
    }
  };

  const removeCategory = async (id: string | number) => {
    if (!confirm(locale==='ar' ? 'هل أنت متأكد من الحذف؟' : 'Are you sure to delete?')) return;
    try {
      const result = await deleteCategory(String(id));
      if (result?.ok !== false) {
        await reload();
        console.log('Category deleted successfully');
      } else {
        console.error('Delete category failed:', result);
        alert(locale==='ar' ? 'فشل حذف الفئة' : 'Failed to delete category');
      }
    } catch (error) {
      console.error('Delete category error:', error);
      alert(locale==='ar' ? 'خطأ في حذف الفئة' : 'Error deleting category');
    }
  };

  // Open edit dialog prefilled
  const openEdit = (cat: CategoryDto) => {
    setEditing(cat);
    setEditNameAr(cat.nameAr || '');
    setEditNameEn(cat.nameEn || '');
    setEditDescAr(cat.descriptionAr || '');
    setEditDescEn(cat.descriptionEn || '');
    setEditImageUrl(cat.imageUrl || '');
    setEditParentId((cat as any).parentCategoryId ? String((cat as any).parentCategoryId) : '');
    setEditIsActive(Boolean(cat.isActive));
    setEditSortOrder(typeof cat.sortOrder === 'number' ? cat.sortOrder : '');
  };

  const handlePickEditImage = () => { editImageInputRef.current?.click(); };
  const handleEditImageSelected: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setEditUploading(true);
      const { ok, data } = await api.uploadFile(file, 'images');
      if (ok && data?.success) {
        setEditImageUrl(data.url);
      } else {
        alert(locale==='ar' ? 'فشل رفع الصورة' : 'Image upload failed');
      }
    } finally {
      setEditUploading(false);
      e.target.value = '';
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    const ar = editNameAr.trim();
    const en = editNameEn.trim();
    if (!ar || !en) return;
    const payload: any = {
      nameAr: ar,
      nameEn: en,
      descriptionAr: editDescAr.trim() || null,
      descriptionEn: editDescEn.trim() || null,
      imageUrl: editImageUrl.trim() || null,
      parentCategoryId: editParentId === '' ? undefined : String(editParentId),
      isActive: !!editIsActive,
      sortOrder: editSortOrder === '' ? undefined : Number(editSortOrder),
    };
    const { ok } = await updateCategory(String(editing.id), payload);
    if (ok) {
      setEditing(null);
      await reload();
    } else {
      alert(locale==='ar' ? 'فشل تعديل الفئة' : 'Failed to update category');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header {...props} />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">{locale==='ar' ? 'خيارات المنتجات (للوحة الأدمن)' : 'Product Options (Admin)'}</h1>
        <p className="text-muted-foreground mb-6">{locale==='ar' ? 'أدر فئات المنتجات مباشرة من قاعدة البيانات.' : 'Manage product categories directly from the database.'}</p>

        {/* DB Categories */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{locale==='ar' ? 'فئات المنتجات (من قاعدة البيانات)' : 'Product Categories (From Database)'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
              <Input
                placeholder={locale==='ar' ? 'الاسم بالعربي' : 'Name (Arabic)'}
                value={newCategoryAr}
                onChange={(e) => setNewCategoryAr(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addCategory(); } }}
              />
              <Input
                placeholder={locale==='ar' ? 'الاسم بالإنجليزي' : 'Name (English)'}
                value={newCategoryEn}
                onChange={(e) => setNewCategoryEn(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addCategory(); } }}
              />
              <Button onClick={() => void addCategory()} className="w-full md:w-auto" disabled={newImageUploading}>{locale==='ar' ? (newImageUploading ? '...جاري الرفع' : 'إضافة') : (newImageUploading ? 'Uploading...' : 'Add')}</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
              <Input
                placeholder={locale==='ar' ? 'الوصف بالعربي (اختياري)' : 'Description (Arabic) optional'}
                value={newDescriptionAr}
                onChange={(e) => setNewDescriptionAr(e.target.value)}
              />
              <Input
                placeholder={locale==='ar' ? 'الوصف بالإنجليزي (اختياري)' : 'Description (English) optional'}
                value={newDescriptionEn}
                onChange={(e) => setNewDescriptionEn(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={handlePickNewImage} disabled={newImageUploading}>
                  {newImageUploading ? (locale==='ar' ? '...جاري الرفع' : 'Uploading...') : (locale==='ar' ? 'اختيار صورة' : 'Choose Image')}
                </Button>
                {newImageUrl && (
                  <Image src={newImageUrl} alt="cat" width={40} height={40} className="h-10 w-10 object-cover rounded" />
                )}
                <input ref={newImageInputRef} type="file" accept="image/*" hidden onChange={handleNewImageSelected} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4 items-center">
              <select
                className="border rounded-md h-10 px-2"
                value={newParentId}
                onChange={(e) => setNewParentId(e.target.value === '' ? '' : String(e.target.value))}
              >
                <option value="">{locale==='ar' ? 'بدون فئة أب' : 'No parent category'}</option>
                {(dbCategories || []).map(c => (
                  <option key={c.id} value={c.id}>{locale==='ar' ? (c.nameAr || c.nameEn) : (c.nameEn || c.nameAr)}</option>
                ))}
              </select>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={newIsActive} onChange={(e) => setNewIsActive(e.target.checked)} />
                {locale==='ar' ? 'مفعّل' : 'Active'}
              </label>
              <Input
                type="number"
                placeholder={locale==='ar' ? 'ترتيب العرض (اختياري)' : 'Sort order (optional)'}
                value={newSortOrder}
                onChange={(e) => setNewSortOrder(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
            {dbLoading ? (
              <div className="text-sm text-muted-foreground">{locale==='ar' ? 'جاري التحميل...' : 'Loading...'}</div>
            ) : dbError ? (
              <div className="text-sm text-red-600">{dbError}</div>
            ) : !dbCategories || dbCategories.length === 0 ? (
              <div className="text-sm text-muted-foreground">{locale==='ar' ? 'لا توجد فئات في قاعدة البيانات.' : 'No categories in database.'}</div>
            ) : (
              <div className="space-y-2">
                {dbCategories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-3">
                      {c.imageUrl && (
                        <Image src={c.imageUrl} alt={c.nameAr || c.nameEn} width={40} height={40} className="h-10 w-10 object-cover rounded-md border" />
                      )}
                      <div>
                        <div className="font-medium">{c.nameAr}</div>
                        <div className="text-xs text-muted-foreground">{c.nameEn}</div>
                      </div>
                      {(c.descriptionAr || c.descriptionEn) && (
                        <div className="text-xs text-muted-foreground">{locale==='ar' ? (c.descriptionAr || c.descriptionEn) : (c.descriptionEn || c.descriptionAr)}</div>
                      )}
                      <div className="text-xs text-muted-foreground flex gap-2">
                        <span>{locale==='ar' ? `مفعل: ${c.isActive ? 'نعم' : 'لا'}` : `Active: ${c.isActive ? 'Yes' : 'No'}`}</span>
                        <span>{locale==='ar' ? `الترتيب: ${c.sortOrder ?? 0}` : `Order: ${c.sortOrder ?? 0}`}</span>
                        {c.parentCategoryId && <span>{locale==='ar' ? `أب: ${c.parentCategoryId}` : `Parent: ${c.parentCategoryId}`}</span>}
                      </div>
                      {c.productCount != null && (
                        <div className="text-xs text-muted-foreground">{locale==='ar' ? `عدد المنتجات: ${c.productCount}` : `Products: ${c.productCount}`}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                        {locale==='ar' ? 'تعديل' : 'Edit'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => triggerItemImageUpload(String(c.id))} disabled={String(itemImageUploadingId || '') === String(c.id)}>
                        {String(itemImageUploadingId || '') === String(c.id) ? (locale==='ar' ? '...رفع' : 'Uploading...') : (locale==='ar' ? 'تحديث صورة' : 'Update Image')}
                      </Button>
                      <Button variant="destructive" size="sm" className="bg-destructive text-white hover:bg-destructive/90" onClick={() => void removeCategory(String(c.id))}>
                        {locale==='ar' ? 'حذف' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                ))}
                <input ref={itemImageInputRef} type="file" accept="image/*" hidden onChange={handleItemImageSelected} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Category Dialog */}
        <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
          {editing && (
            <DialogContent className="max-w-2xl bg-white dark:bg-zinc-900">
              <DialogHeader>
                <DialogTitle>{locale==='ar' ? 'تعديل الفئة' : 'Edit Category'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input placeholder={locale==='ar' ? 'الاسم بالعربي' : 'Name (Arabic)'} value={editNameAr} onChange={(e)=> setEditNameAr(e.target.value)} />
                  <Input placeholder={locale==='ar' ? 'الاسم بالإنجليزي' : 'Name (English)'} value={editNameEn} onChange={(e)=> setEditNameEn(e.target.value)} />
                  <Input placeholder={locale==='ar' ? 'الوصف بالعربي (اختياري)' : 'Description (Arabic) optional'} value={editDescAr} onChange={(e)=> setEditDescAr(e.target.value)} />
                  <Input placeholder={locale==='ar' ? 'الوصف بالإنجليزي (اختياري)' : 'Description (English) optional'} value={editDescEn} onChange={(e)=> setEditDescEn(e.target.value)} />
                </div>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" onClick={handlePickEditImage} disabled={editUploading}>
                    {editUploading ? (locale==='ar' ? '...جاري الرفع' : 'Uploading...') : (locale==='ar' ? 'اختيار صورة' : 'Choose Image')}
                  </Button>
                  {editImageUrl && (<Image src={editImageUrl} alt="cat" width={48} height={48} className="h-12 w-12 object-cover rounded border" />)}
                  <Input value={editImageUrl} onChange={(e)=> setEditImageUrl(e.target.value)} placeholder={locale==='ar' ? 'أو ألصق رابط الصورة' : 'Or paste image URL'} />
                  <input ref={editImageInputRef} type="file" accept="image/*" hidden onChange={handleEditImageSelected} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                  <select
                    className="border rounded-md h-10 px-2"
                    value={editParentId}
                    onChange={(e)=> setEditParentId(e.target.value === '' ? '' : String(e.target.value))}
                  >
                    <option value="">{locale==='ar' ? 'بدون فئة أب' : 'No parent category'}</option>
                    {(dbCategories || []).filter(c => String(c.id) !== String(editing.id)).map(c => (
                      <option key={String(c.id)} value={String(c.id)}>{locale==='ar' ? (c.nameAr || c.nameEn) : (c.nameEn || c.nameAr)}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={editIsActive} onChange={(e)=> setEditIsActive(e.target.checked)} />
                    {locale==='ar' ? 'مفعّل' : 'Active'}
                  </label>
                  <Input type="number" placeholder={locale==='ar' ? 'ترتيب العرض (اختياري)' : 'Sort order (optional)'} value={editSortOrder} onChange={(e)=> setEditSortOrder(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={()=> setEditing(null)}>{locale==='ar' ? 'إلغاء' : 'Cancel'}</Button>
                  <Button onClick={()=> void saveEdit()}>{locale==='ar' ? 'حفظ' : 'Save'}</Button>
                </div>
              </div>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </div>
  );
}
