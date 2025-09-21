import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Header from '../../components/Header';
import type { RouteContext } from '../../components/Router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Dialog } from '../../components/ui/dialog';
import ProductForm from '../../components/vendor/ProductForm';
import { Package, Search, Filter, Plus, Edit, Trash2, Store, Tag, ArrowRight, Clock } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { getProducts, createProduct, updateProduct, deleteProduct, getAllCategories, getProductById } from '../../services/products';
import { getPendingProducts, approveProduct as approveProductAdmin, rejectProduct as rejectProductAdmin } from '@/services/admin';
import { useFirstLoadOverlay } from '../../hooks/useFirstLoadOverlay';

interface ProductRow {
  id: number;
  backendId?: string; // Mongo _id string
  name: string;
  sku: string;
  vendor: string;
  price: number;
  stock: number;
  notes?: string;
  createdAt: string;
  imageUrl?: string;
}

export default function AdminProducts({ setCurrentPage, ...context }: Partial<RouteContext>) {
  const { t, locale } = useTranslation();
  const hideFirstOverlay = useFirstLoadOverlay(context, locale==='ar' ? 'جاري تحميل المنتجات' : 'Loading products', locale==='ar' ? 'يرجى الانتظار' : 'Please wait');
  const isAr = locale === 'ar';
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [search, setSearch] = useState('');
  // status filter disabled (no backend field). Keep UI minimal
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [selectedBackendId, setSelectedBackendId] = useState<string | null>(null);
  const [productForEdit, setProductForEdit] = useState<any | undefined>(undefined);
  const [form, setForm] = useState<Partial<ProductRow>>({ name: '', sku: '', vendor: '', price: 0, stock: 0, notes: '' });
  const [pending, setPending] = useState<any[]>([]);
  const [pendingError, setPendingError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Array<{ id: number | string; name: string }>>([]);

  useEffect(() => {
    let mounted = true;
    (async () => { 
      if (mounted) {
        await reload(); 
        hideFirstOverlay(); 
      }
    })();
    (async () => {
      try {
        const r = await getAllCategories();
        if (r.ok && Array.isArray(r.data) && mounted) {
          setCategories(r.data.map((c: any) => ({ id: c._id || c.id, name: (c.nameAr || c.nameEn || String(c._id || c.id)) })));
        } else if (mounted) { 
          setCategories([]); 
        }
      } catch { 
        if (mounted) setCategories([]); 
      }
    })();
    return () => { mounted = false; };
  }, []); // Removed hideFirstOverlay to prevent infinite loops
  const reload = async () => {
    try {
      const { ok, data } = await getProducts({ page: 1, pageSize: 200 });
      if (ok && data && Array.isArray((data as any).items)) {
        const backendRows: ProductRow[] = (data as any).items.map((p: any, idx: number) => ({
          id: Number(p.id) || Date.now() + idx,
          backendId: String(p._id || p.id || ''),
          name: p.nameAr || p.nameEn || p.name || '',
          sku: p.partNumber || '',
          vendor: p.merchantName || p.brand || '',
          price: Number(p.discountPrice ?? p.price ?? 0),
          stock: Number(p.stockQuantity ?? p.stock ?? 0),
          createdAt: p.createdAt || new Date().toISOString().slice(0,10),
          imageUrl: Array.isArray(p.images) && p.images.length ? p.images[0].imageUrl : undefined,
        }));
        setRows(backendRows);
      } else {
        setRows([]);
      }
      // Load pending products
      const pend = await getPendingProducts();
      if (pend.ok && pend.data && Array.isArray((pend.data as any).items)) {
        setPending((pend.data as any).items);
        setPendingError(null);
      } else {
        setPending([]);
        const status = (pend as any)?.status;
        setPendingError(status === 401 || status === 403 ? 'Unauthorized' : 'Failed to fetch pending products');
      }
    } catch {
      setRows([]);
      setPending([]);
      setPendingError('Failed to contact server');
    }
  };

  const filtered = rows.filter(r => {
    const s = search.trim().toLowerCase();
    const matches = !s || r.name.toLowerCase().includes(s) || r.sku.toLowerCase().includes(s) || r.vendor.toLowerCase().includes(s);
    return matches;
  });

  const openCreate = () => { setEditId(null); setProductForEdit(undefined); setForm({ name: '', sku: '', vendor: '', price: 0, stock: 0, notes: '' }); setFormOpen(true); };
  const openEdit = async (r: ProductRow) => {
    setEditId(r.id);
    setSelectedBackendId(String((r as any).backendId || r.id));
    try {
      const realId = String((r as any).backendId || r.id);
      const getByIdAny = (getProductById as unknown as (id: any) => Promise<any>);
      const resp = await getByIdAny(realId);
      if (resp?.ok && resp.data) {
        setProductForEdit(resp.data);
      } else {
        setProductForEdit({
          id: realId,
          nameAr: r.name,
          nameEn: r.name,
          price: r.price,
          stock: r.stock,
          partNumber: r.sku,
          descriptionAr: '',
          descriptionEn: '',
        });
      }
    } catch {
      setProductForEdit({
        id: (r as any).backendId || r.id,
        nameAr: r.name,
        nameEn: r.name,
        price: r.price,
        stock: r.stock,
        partNumber: r.sku,
        descriptionAr: '',
        descriptionEn: '',
      });
    }
    setFormOpen(true);
  };

  // Save handler for ProductForm: maps vendor form data to backend Create/Update DTO
  const onSaveProduct = async (data: any) => {
    // Map fields: in our app, Offers page expects price=original, discountPrice=current
    const current = Number(data.price || 0);
    const original = Number(data.originalPrice || 0);
    const payload: any = {
      nameAr: String(data.nameAr || ''),
      nameEn: String(data.nameEn || ''),
      descriptionAr: String(data.descriptionAr || ''),
      descriptionEn: String(data.descriptionEn || ''),

      // Send Mongo ObjectId as string
      categoryId: data.categoryId ? String(data.categoryId) : undefined,

      price: original > 0 ? original : current,
      discountPrice: original > 0 ? current : null,
      stockQuantity: Number(data.stock || 0),
      allowCustomDimensions: false,
      isAvailableForRent: false,
      rentPricePerDay: null,
      attributes: [],
      // Persist structured details
      specifications: data.specifications || undefined,
      compatibility: Array.isArray(data.compatibility) ? data.compatibility : undefined,
      // Installation add-on
      addonInstallation: data.addonInstallation || {
        enabled: !!data.addonInstallEnabled,
        feePerUnit: Number(data.addonInstallFee || 0),
      },
      // Identifiers
      partNumber: String(data.partNumber || ''),
      // Images: ensure array of strings with main image first
      images: (() => {
        const arr: string[] = Array.isArray(data.images) ? data.images : [];
        const main: string = data.image || arr[0] || '';
        const all = [main, ...arr].filter(Boolean);
        // de-dup while preserving order
        return Array.from(new Set(all));
      })(),
    };
    if (editId) {
      const idToUpdate = selectedBackendId || String(editId);
      await updateProduct(idToUpdate as any, payload);
    } else {
      await createProduct(payload);
    }
    setFormOpen(false); setEditId(null); await reload();
  };

  const removeRow = async (r: ProductRow) => { const realId = String((r as any).backendId || r.id); await deleteProduct(realId as any); await reload(); };

  const doApproveProduct = async (id: string) => {

    try { const r = await approveProductAdmin(id); if (r.ok) await reload(); } catch {}
  };
  const doRejectProduct = async (id: string) => {
    try { const r = await rejectProductAdmin(id, ''); if (r.ok) await reload(); } catch {}
  };

  return (
    <div className="min-h-screen bg-background">
      <Header {...context} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Button variant="outline" onClick={() => setCurrentPage && setCurrentPage('admin-dashboard')} className="mr-4">
              <ArrowRight className="ml-2 h-4 w-4" />
              {t('backToDashboard')}
            </Button>
          </div>
          <h1 className="mb-2">{t('manageProducts')}</h1>
          <p className="text-muted-foreground">{t('adminProductsSubtitle')}</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center"><Filter className="mr-2 h-5 w-5" />{t('searchAndFilterProducts')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder={isAr ? 'ابحث بالاسم ' : 'Search by name '} value={search} onChange={e=>setSearch(e.target.value)} className="pr-10" />
              </div>
              <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />{t('addProduct')}</Button>
            </div>
          </CardContent>
        </Card>

        {/* Pending products section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center"><Clock className="mr-2 h-5 w-5" />منتجات قيد الاعتماد ({pending.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingError && <div className="text-sm text-red-600 mb-2">{pendingError}</div>}
            <div className="space-y-3">
              {pending.map((p: any) => (
                <div key={String(p.id)} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg">
                  <div>
                    <div className="font-medium text-sm">{p.nameAr || p.nameEn || p.name}</div>
                    <div className="text-xs text-muted-foreground">التاجر: {p.merchantName || p.merchantId}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => doApproveProduct(String(p.id))}>اعتماد</Button>
                    <Button size="sm" variant="outline" onClick={() => doRejectProduct(String(p.id))}>رفض</Button>
                  </div>
                </div>
              ))}
              {pending.length === 0 && <div className="text-sm text-muted-foreground">لا توجد منتجات معلّقة حالياً</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Package className="mr-2 h-5 w-5" />{t('products')} ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filtered.map(r => (
                <div key={r.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4 space-x-reverse w-full min-w-0">
                    <div className="w-14 h-14 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                      {r.imageUrl ? (
                        <Image src={r.imageUrl} alt={r.name} width={56} height={56} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="h-7 w-7 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-1 min-w-0 w-full">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium break-words max-w-full leading-snug">{r.name}</h3>
                        <Badge variant={r.stock>0? 'default': 'secondary'}>
                          {r.stock>0 ? (t('inStock')||'In Stock') : (t('outOfStock')||'Out of Stock')}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center break-words">{r.sku}</div>
                        <div className="flex items-center break-words"><Store className="mr-1 h-3 w-3" />{r.vendor}</div>
                        <span className="break-words">{t('price')}: {r.price} SAR</span>
                        <span className="break-words">{t('stock')}: {r.stock}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={()=>openEdit(r)}><Edit className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline" onClick={()=>removeRow(r)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
            {filtered.length===0 && (
              <div className="text-center py-8 text-muted-foreground">{t('noResults')}</div>
            )}
          </CardContent>
        </Card>

        <Dialog open={formOpen} onOpenChange={(o: boolean)=>{ setFormOpen(o); if(!o) { setEditId(null); setProductForEdit(undefined); } }}>
          {formOpen && (
            <ProductForm
              product={productForEdit}
              categories={categories}
              onSave={onSaveProduct}
              onCancel={() => setFormOpen(false)}
            />
          )}
        </Dialog>
      </div>
    </div>
  );
}
