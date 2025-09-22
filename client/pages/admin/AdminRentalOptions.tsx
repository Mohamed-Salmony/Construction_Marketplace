import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Header from '../../components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useTranslation } from '../../hooks/useTranslation';
import type { RouteContext } from '../../components/Router';
import { 
  getAllRentalCategories, 
  getRootRentalCategories,
  type RentalCategoryDto, 
  createRentalCategory, 
  updateRentalCategory, 
  deleteRentalCategory 
} from '@/services/rentalCategories';
import { api } from '../../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useFirstLoadOverlay } from '../../hooks/useFirstLoadOverlay';
import { getToken } from '../../services/auth';

export default function AdminRentalOptions(props: Partial<RouteContext>) {
  const { locale } = useTranslation();
  const hideFirstOverlay = useFirstLoadOverlay(props, locale==='ar' ? 'جاري تحميل أقسام التأجير' : 'Loading rental categories', locale==='ar' ? 'يرجى الانتظار' : 'Please wait');
  
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
  const [dbCategories, setDbCategories] = useState<RentalCategoryDto[] | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  
  // Debug authentication
  const [authDebug, setAuthDebug] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  
  // Edit dialog state
  const [editing, setEditing] = useState<null | RentalCategoryDto>(null);
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
        
        
        // Try direct API call first (try both ports 3000 and 4000)
        let result;
        try {
          let response = await fetch('http://localhost:3000/api/RentalCategories', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          // If 3000 fails, try 4000 (backend default port)
          if (!response.ok) {
            response = await fetch('http://localhost:4000/api/RentalCategories', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              }
            });
          }
          
          if (response.ok) {
            const jsonData = await response.json();
            result = { ok: true, data: jsonData.data || jsonData };
          } else {
            // Fallback to service API
            result = await getAllRentalCategories();
          }
        } catch (directError) {
          // Fallback to service API
          result = await getAllRentalCategories();
        }
        
        // If service API also fails with 403, try public API
        if (!result.ok && result.status === 403) {
          result = await getRootRentalCategories();
        }
        
        if (!mounted) return;
        
        if (result.ok && result.data) {
          const dataArray = Array.isArray(result.data) ? result.data : [result.data];
          const mapped = dataArray.map((c: any) => ({
            ...c,
            id: String(c.id ?? c._id),
          }));
          setDbCategories(mapped as any);
        } else {
          setDbCategories([]);
          const errorMsg = result.status === 403 
            ? (locale==='ar' ? 'ليس لديك صلاحية للوصول - يرجى تسجيل الدخول كأدمن' : 'Access denied - please login as admin')
            : (locale==='ar' ? `تعذر جلب أقسام التأجير من الخادم (Status: ${result.status || 'unknown'})` : `Failed to fetch rental categories from server (Status: ${result.status || 'unknown'})`);
          setDbError(errorMsg);
        }
      } catch (error) {
        if (!mounted) return;
        setDbCategories([]);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setDbError(locale==='ar' ? `تعذر الاتصال بالخادم: ${errorMessage}` : `Failed to contact server: ${errorMessage}`);
      } finally {
        if (mounted) setDbLoading(false);
        if (mounted) hideFirstOverlay();
      }
    };
    void load();
    return () => { mounted = false; };
  }, [locale]);

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
        const { ok: okUpdate } = await updateRentalCategory(String(catId), { imageUrl: data.url } as any);
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
      setDbError(null);
      
      
      // Try direct API call first (try both ports 3000 and 4000)
      let result;
      try {
        let response = await fetch('http://localhost:3000/api/RentalCategories', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        // If 3000 fails, try 4000 (backend default port)
        if (!response.ok) {
          response = await fetch('http://localhost:4000/api/RentalCategories', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });
        }
        
        if (response.ok) {
          const jsonData = await response.json();
          result = { ok: true, data: jsonData.data || jsonData };
        } else {
          // Fallback to service API
          result = await getAllRentalCategories();
        }
      } catch (directError) {
        // Fallback to service API
        result = await getAllRentalCategories();
      }
      
      // If service API also fails with 403, try public API
      if (!result.ok && result.status === 403) {
        result = await getRootRentalCategories();
      }
      
      if (result.ok && result.data) {
        const dataArray = Array.isArray(result.data) ? result.data : [result.data];
        const mapped = dataArray.map((c: any) => ({
          ...c,
          id: String(c.id ?? c._id),
        }));
        setDbCategories(mapped as any);
      } else {
        setDbCategories([]);
        const errorMsg = result.status === 403 
          ? (locale==='ar' ? 'ليس لديك صلاحية للوصول - يرجى تسجيل الدخول كأدمن' : 'Access denied - please login as admin')
          : (locale==='ar' ? `تعذر جلب أقسام التأجير من الخادم (Status: ${result.status || 'unknown'})` : `Failed to fetch rental categories from server (Status: ${result.status || 'unknown'})`);
        setDbError(errorMsg);
      }
    } catch (error) {
      setDbCategories([]);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setDbError(locale==='ar' ? `تعذر الاتصال بالخادم: ${errorMessage}` : `Failed to contact server: ${errorMessage}`);
    } finally {
      setDbLoading(false);
    }
  };

  const addCategory = async () => {
    const ar = newCategoryAr.trim();
    const en = newCategoryEn.trim();
    if (!ar || !en) return;
    try {
      const token = getToken();
      
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
      
      const result = await createRentalCategory(payload);
      
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
      } else {
        let errorMsg = locale==='ar' ? 'فشل إضافة قسم التأجير' : 'Failed to add rental category';
        
        if (result?.status === 403) {
          errorMsg = locale==='ar' 
            ? 'ليس لديك صلاحية إضافة قسم تأجير. يرجى الضغط على "Check Authentication Status" لفحص التوكن، ثم "تسجيل دخول كمدير" للحل' 
            : 'You do not have permission to add rental categories. Please click "Check Authentication Status" to verify token, then "Login as Admin" to fix';
        } else if (result?.error?.message) {
          errorMsg = result.error.message;
        }
        
        alert(errorMsg);
      }
    } catch (error) {
      alert(locale==='ar' ? 'خطأ في إضافة قسم التأجير' : 'Error adding rental category');
    }
  };

  const removeCategory = async (id: string | number) => {
    if (!confirm(locale==='ar' ? 'هل أنت متأكد من الحذف؟' : 'Are you sure to delete?')) return;
    try {
      const result = await deleteRentalCategory(String(id));
      if (result?.ok !== false) {
        await reload();
      } else {
        alert(locale==='ar' ? 'فشل حذف قسم التأجير' : 'Failed to delete rental category');
      }
    } catch (error) {
      alert(locale==='ar' ? 'خطأ في حذف قسم التأجير' : 'Error deleting rental category');
    }
  };

  // Open edit dialog prefilled
  const openEdit = (cat: RentalCategoryDto) => {
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

  // Debug authentication status
  const checkAuth = async () => {
    const token = getToken();
    
    // Decode JWT to check user info
    let decodedToken = null;
    if (token) {
      try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        decodedToken = decoded;
      } catch (e) {
        // Token decode failed
      }
    }
    
    const debugInfo: any = {
      localStorageToken: token,
      decodedToken: decodedToken,
      localStorage: typeof window !== 'undefined' ? {
        auth_token: localStorage.getItem('auth_token'),
        token: localStorage.getItem('token'),
        mock_current_user: localStorage.getItem('mock_current_user')
      } : null,
      cookies: typeof document !== 'undefined' ? document.cookie : null
    };
    
    try {
      // Test public debug endpoint
      const publicResult = await api.get('/api/RentalCategories/debug-public');
      debugInfo.publicEndpoint = publicResult;
      
      // Test authenticated debug endpoint
      const authResult = await api.get('/api/RentalCategories/debug');
      debugInfo.authEndpoint = authResult;
      
      // Test direct API call to see what's in headers
      const testResult = await fetch('/api/RentalCategories/debug', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      debugInfo.directFetch = {
        ok: testResult.ok,
        status: testResult.status,
        headers: Object.fromEntries(testResult.headers.entries()),
        body: testResult.ok ? await testResult.json() : null
      };
    } catch (error) {
      debugInfo.error = error;
    }
    
    setAuthDebug(debugInfo);
  };

  // Create admin user (temporary solution)
  const createAdminUser = async () => {
    try {
      const result = await api.post('/api/RentalCategories/create-admin-user', {});
      if (result.ok && result.data) {
        const data = result.data as any;
        alert(locale==='ar' 
          ? `تم إنشاء مدير بنجاح!\nالإيميل: ${data.user?.email || 'admin@construction-marketplace.com'}\nكلمة المرور: admin123` 
          : `Admin user created successfully!\nEmail: ${data.user?.email || 'admin@construction-marketplace.com'}\nPassword: admin123`);
      } else {
        const errorData = result.data as any;
        alert(errorData?.message || 'Failed to create admin user');
      }
    } catch (error) {
      alert('Error creating admin user');
    }
  };

  // Quick login as admin (temporary solution)
  const quickAdminLogin = async () => {
    try {
      const { login } = await import('../../services/auth');
      const result = await login({
        email: 'admin@construction-marketplace.com',
        password: 'admin123'
      });
      
      if (result.ok && result.data) {
        alert(locale==='ar' 
          ? 'تم تسجيل الدخول كمدير بنجاح! جرب إضافة قسم تأجير الآن.' 
          : 'Successfully logged in as admin! Try adding a rental category now.');
        // Reload the page to reflect the new login state
        setTimeout(() => window.location.reload(), 1000);
      } else {
        alert('Failed to login as admin. Make sure admin user exists.');
      }
    } catch (error) {
      alert('Error logging in as admin');
    }
  };
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
    const { ok } = await updateRentalCategory(String(editing.id), payload);
    if (ok) {
      setEditing(null);
      await reload();
    } else {
      alert(locale==='ar' ? 'فشل تعديل قسم التأجير' : 'Failed to update rental category');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header {...props} />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">{locale==='ar' ? 'أقسام التأجير (للوحة الأدمن)' : 'Rental Categories (Admin)'}</h1>
        <p className="text-muted-foreground mb-6">{locale==='ar' ? 'أدر أقسام التأجير مباشرة من قاعدة البيانات.' : 'Manage rental categories directly from the database.'}</p>


        {/* DB Categories */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{locale==='ar' ? 'أقسام التأجير (من قاعدة البيانات)' : 'Rental Categories (From Database)'}</CardTitle>
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
                <option value="">{locale==='ar' ? 'بدون قسم أب' : 'No parent category'}</option>
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
              <div className="text-sm text-muted-foreground">{locale==='ar' ? 'لا توجد أقسام تأجير في قاعدة البيانات.' : 'No rental categories in database.'}</div>
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
                <DialogTitle>{locale==='ar' ? 'تعديل قسم التأجير' : 'Edit Rental Category'}</DialogTitle>
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
                    <option value="">{locale==='ar' ? 'بدون قسم أب' : 'No parent category'}</option>
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
