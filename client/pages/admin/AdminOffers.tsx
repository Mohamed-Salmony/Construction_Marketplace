import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { RouteContext } from '../../components/Router';
import Header from '../../components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useTranslation } from '../../hooks/useTranslation';
import { getProducts, getAllCategories, type ProductDto } from '../../services/products';
import { useFirstLoadOverlay } from '../../hooks/useFirstLoadOverlay';
import { adminGetProducts, adminUpdateProduct, adminSetProductDiscount, approveProduct } from '@/services/admin';
import { api } from '@/lib/api';

export default function AdminOffers({ setCurrentPage, ...context }: Partial<RouteContext>) {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';
  const currency = isAr ? 'ر.س' : 'SAR';
  const hideFirstOverlay = useFirstLoadOverlay(context, isAr ? 'جاري تحميل العروض' : 'Loading offers', isAr ? 'يرجى الانتظار' : 'Please wait');

  const [items, setItems] = useState<ProductDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);

  const [onlyOffers, setOnlyOffers] = useState<boolean>(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      // Test admin endpoint first
      try {
        const testRes = await api.get('/api/Admin/test', { auth: true });
        console.log('Admin test endpoint response:', testRes);
      } catch (testError) {
        console.error('Admin test endpoint failed:', testError);
      }
      
      // Load products and categories in parallel
      let productsRes;
      try {
        productsRes = await adminGetProducts({ page: 1, pageSize: 500 });
        console.log('Admin products response:', productsRes);
      } catch (adminError) {
        console.warn('Admin products failed, trying public endpoint:', adminError);
        productsRes = await getProducts({ page: 1, pageSize: 500 });
        console.log('Public products response:', productsRes);
      }
      
      const categoriesRes = await getAllCategories();
      
      const listAny = (productsRes.data as any) || {};
      const raw = Array.isArray(listAny.items) ? listAny.items : (Array.isArray(listAny.Items) ? listAny.Items : []);
      
      // Map MongoDB _id to id for frontend compatibility and ensure all required fields
      const list = raw.map((item: any, index: number) => {
        console.log(`Processing item ${index}:`, item);
        
        const mappedItem = {
          ...item,
          id: item.id || item._id || String(item._id),
          merchantId: String(item.merchantId?._id || item.merchantId),
          categoryId: String(item.categoryId?._id || item.categoryId),
          merchantName: item.merchantName || item.merchant?.name || null,
          categoryName: item.categoryName || item.category?.nameEn || item.category?.nameAr || null,
        };
        
        console.log(`Mapped item ${index}:`, mappedItem);
        return mappedItem;
      }) as ProductDto[];
      
      console.log('Raw response:', productsRes);
      console.log('Processed list:', list);
      console.log('Loaded products:', list.length, 'First product:', list[0]);
      setItems(list);
      
      // Set categories for Arabic display
      const categoriesData = categoriesRes.data || [];
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      
      setError(null);
    } catch {
      setError(isAr ? 'تعذر جلب المنتجات' : 'Failed to fetch products');
      setItems([]);
    } finally { setLoading(false); }
  }, [isAr]); // Removed loading to prevent infinite loops

  useEffect(() => { 
    let mounted = true;
    const loadData = async () => {
      if (mounted) {
        await load(); 
        hideFirstOverlay();
      }
    };
    loadData();
    return () => { mounted = false; };
  }, []); // Removed dependencies to prevent infinite loops

  const setDiscount = async (p: ProductDto, newDiscount: number | null) => {
    try {
      // Validate product ID
      console.log('Product object:', p);
      console.log('Product ID:', p.id, 'Type:', typeof p.id);
      console.log('Product _id:', (p as any)._id);
      
      if (!p.id || p.id === 'undefined' || p.id === 'null') {
        console.error('Invalid product ID detected:', p);
        throw new Error(isAr ? 'معرف المنتج غير صالح' : 'Invalid product ID');
      }
      
      setSavingId(p.id);
      setError(null); // Clear any previous errors
      console.log('Setting discount for product:', p.id, 'New discount:', newDiscount, 'Product:', p);
      
      // Validate discount value
      if (newDiscount !== null && (newDiscount < 0 || newDiscount >= p.price)) {
        throw new Error(isAr ? 'سعر الخصم يجب أن يكون أقل من السعر الأصلي وأكبر من صفر' : 'Discount price must be less than original price and greater than zero');
      }
      
      const res = await adminSetProductDiscount(p.id, newDiscount);
      console.log('Discount API response:', res);
      
      if (!res.ok) {
        console.log('Discount API failed, trying fallback method. Status:', res.status, 'Response:', res);
        // Fallback: full update via adminUpdateProduct if discount endpoint missing on server
        const payload: any = {
          nameEn: p.nameEn,
          nameAr: p.nameAr,
          descriptionEn: p.descriptionEn ?? '',
          descriptionAr: p.descriptionAr ?? '',
          categoryId: p.categoryId,
          price: p.price,
          discountPrice: newDiscount,
          stockQuantity: p.stockQuantity,
          allowCustomDimensions: p.allowCustomDimensions,
          isAvailableForRent: p.isAvailableForRent,
          rentPricePerDay: p.rentPricePerDay ?? null,
          attributes: (p.attributes || []).map(a => ({ nameEn: a.nameEn, nameAr: a.nameAr, valueEn: a.valueEn, valueAr: a.valueAr })),
        };
        console.log('Fallback payload:', payload);
        const updateRes = await adminUpdateProduct(p.id, payload);
        console.log('Update product response:', updateRes);
        
        if (!updateRes.ok) {
          throw new Error(`Failed to update product: ${updateRes.status} ${updateRes.error || 'Unknown error'}`);
        }
        
        if (!p.isApproved) { 
          try { 
            await approveProduct(p.id);
            console.log('Product approved successfully');
          } catch (approveError) {
            console.error('Failed to approve product:', approveError);
          }
        }
      }
      
      // Show success message
      console.log('Discount saved successfully');
      await load();
      console.log('Data reloaded after discount save');
      
    } catch (error: any) {
      console.error('Error setting discount:', error);
      const errorMessage = error.message || (isAr ? 'فشل في حفظ سعر الخصم' : 'Failed to save discount price');
      setError(errorMessage);
      
      // Show error for 5 seconds then clear
      setTimeout(() => setError(null), 5000);
    } finally { 
      setSavingId(null); 
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header {...context} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{isAr ? 'إدارة العروض' : 'Manage Offers'}</h1>
          <p className="text-muted-foreground">{isAr ? 'عيّن سعر الخصم لأي منتج ليظهر في صفحة العروض.' : 'Set discount price for any product to show it on Offers page.'}</p>
          <div className="mt-3">
            <Button variant={onlyOffers? 'default':'outline'} size="sm" onClick={()=>setOnlyOffers(o=>!o)}>
              {onlyOffers ? (isAr? 'عرض كل المنتجات' : 'Show All Products') : (isAr? 'إظهار التي عليها عروض فقط' : 'Show Only With Offers')}
            </Button>
          </div>
        </div>

        {loading ? (
          <Card><CardContent className="p-6 text-muted-foreground">{isAr ? 'جارٍ التحميل...' : 'Loading...'}</CardContent></Card>
        ) : error ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-red-600 mb-2">{error}</div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setError(null);
                  void load();
                }}
              >
                {isAr ? 'إعادة المحاولة' : 'Retry'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {(() => {
              const filteredItems = onlyOffers 
                ? items.filter(p => typeof p.discountPrice==='number' && (p.discountPrice as number) > 0 && (p.discountPrice as number) < p.price) 
                : items;
              
              if (filteredItems.length === 0) {
                return (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      {onlyOffers 
                        ? (isAr ? 'لا توجد منتجات عليها عروض حالياً' : 'No products with offers currently')
                        : (isAr ? 'لا توجد منتجات' : 'No products found')
                      }
                    </CardContent>
                  </Card>
                );
              }
              
              return filteredItems.map((p) => {
              const discounted = typeof p.discountPrice === 'number' && p.discountPrice! > 0 && p.discountPrice! < p.price;
              return (
                <Card key={p.id}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="truncate max-w-[60%]" title={(isAr ? p.nameAr : p.nameEn) || ''}>
                        {isAr ? p.nameAr : p.nameEn}
                      </span>
                      <div className="flex items-center gap-2 text-sm">
                        {discounted ? (
                          <React.Fragment key={`price-${p.id}`}>
                            <span key={`discount-${p.id}`} className="text-primary font-semibold">
                              {currency} {Number(p.discountPrice).toLocaleString(isAr?'ar-EG':'en-US')}
                            </span>
                            <span key={`original-${p.id}`} className="line-through text-muted-foreground">
                              {currency} {Number(p.price).toLocaleString(isAr?'ar-EG':'en-US')}
                            </span>
                            <span key={`percentage-${p.id}`} className="text-green-600 text-xs">
                              -{Math.round(100 - (Number(p.discountPrice!)/Number(p.price))*100)}%
                            </span>
                          </React.Fragment>
                        ) : (
                          <span key={`regular-price-${p.id}`} className="text-muted-foreground">{currency} {Number(p.price).toLocaleString(isAr?'ar-EG':'en-US')}</span>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                        {Array.isArray(p.images) && p.images.length > 0 ? (
                          <Image src={p.images[0].imageUrl} alt={(isAr?p.nameAr:p.nameEn) || ''} width={80} height={80} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-muted-foreground">{isAr? 'لا صورة' : 'No image'}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="text-sm text-muted-foreground flex flex-wrap gap-3">
                          <span key={`category-${p.id}`}>{isAr? 'الفئة:' : 'Category:'} {
                            (() => {
                              // First try populated data from backend
                              if (isAr && (p as any).categoryNameAr) return (p as any).categoryNameAr;
                              if (!isAr && p.categoryName) return p.categoryName;
                              
                              // Fallback to categories list
                              const category = categories.find(c => c.id === p.categoryId);
                              if (category) return isAr ? category.nameAr : category.nameEn;
                              
                              // Final fallback
                              return p.categoryName || (isAr ? 'غير محدد' : 'Unknown');
                            })()
                          }</span>
                          <span key={`stock-${p.id}`}>{isAr? 'المخزون:' : 'Stock:'} {p.stockQuantity}</span>
                          <span key={`merchant-${p.id}`}>{isAr? 'التاجر:' : 'Merchant:'} {
                            p.merchantName && p.merchantName.trim() !== '' && p.merchantName !== p.merchantId 
                              ? p.merchantName 
                              : (isAr ? 'غير محدد' : 'Unknown')
                          }</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="any"
                            key={`discount-${p.id}-${p.discountPrice || 'none'}`}
                            defaultValue={discounted ? String(p.discountPrice) : ''}
                            placeholder={isAr ? 'سعر الخصم' : 'Discount price'}
                            onChange={(e)=>{ (p as any)._newDiscount = e.target.value; }}
                            className="max-w-[200px]"
                          />
                          <Button
                            disabled={savingId===p.id}
                            onClick={() => {
                              const raw = (p as any)._newDiscount as string | undefined;
                              const val = raw && raw.trim()!=='' ? Number(raw) : null;
                              void setDiscount(p, val);
                            }}
                          >
                            {savingId===p.id ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ' : 'Save')}
                          </Button>
                          {discounted && (
                            <Button variant="outline" disabled={savingId===p.id} onClick={() => void setDiscount(p, null)}>
                              {isAr ? 'إلغاء العرض' : 'Remove Offer'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
              });
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
