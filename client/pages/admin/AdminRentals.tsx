import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { RouteContext } from '../../components/Router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Clock, CheckCircle, XCircle, AlertTriangle, User, Eye, Calendar, Package } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
// useStableCallback removed - not needed for simple load function
import { toastSuccess, toastError } from '../../utils/alerts';
import { getAllRentals, approveRental, declineRental, removeRentalAdmin } from '@/services/rentals';
// getUserById service removed - not needed for basic functionality
interface Props extends Partial<RouteContext> {}

export default function AdminRentals({ setCurrentPage, ...rest }: Props) {
  const { locale } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [customerNames, setCustomerNames] = useState<Record<string, string>>({});
  const firstLoadRef = useRef(true);

  const getStatusInArabic = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'قيد الانتظار';
      case 'approved': return 'معتمد';
      case 'active': return 'نشط';
      case 'declined': return 'مرفوض';
      case 'completed': return 'مكتمل';
      default: return status?.toUpperCase() || 'غير محدد';
    }
  };

  const getCurrencySymbol = (currency?: string): string => {
    if (locale === 'ar') return 'ر.س';
    return currency && String(currency).trim() ? String(currency).trim() : 'SAR';
  };

  const fetchCustomerName = useCallback(async (customerId: string) => {
    if (customerNames[customerId]) return customerNames[customerId];
    
    // Simple fallback - just return the ID for now
    // TODO: Implement proper user fetching when service is available
    const displayName = `Customer ${customerId.slice(-4)}`;
    setCustomerNames(prev => ({ ...prev, [customerId]: displayName }));
    return displayName;
  }, [customerNames]);

  const load = useCallback(async () => {
    console.log('AdminRentals: Starting to load rentals...');
    setLoading(true);
    try {
      const r = await getAllRentals();
      console.log('AdminRentals: API response:', r);
      if (r.ok && Array.isArray(r.data)) {
        console.log('AdminRentals: Setting items:', r.data.length, 'rentals');
        setItems(r.data as any[]);
      } else {
        console.log('AdminRentals: No data or invalid response, setting empty array');
        setItems([]);
      }
    } catch (error) {
      console.error('AdminRentals: Failed to load rentals:', error);
      setItems([]);
    } finally { 
      setLoading(false);
      console.log('AdminRentals: Loading finished');
    }
  }, []);

  useEffect(() => { 
    let mounted = true;
    const loadData = async () => {
      if (mounted) await load();
    };
    loadData();
    return () => { mounted = false; };
  }, []); // Removed load dependency to prevent infinite loops

  useEffect(() => {
    if (selected && selected.customerId) {
      fetchCustomerName(selected.customerId);
    }
  }, [selected]); // Removed fetchCustomerName dependency to prevent loops

  const onApprove = async (id: number | string) => { 
    try {
      const result = await approveRental(String(id)); 
      if (result?.ok !== false) { // Only reload if not explicitly failed
        await load(); 
        toastSuccess(locale==='ar' ? 'تم الاعتماد بنجاح' : 'Approved successfully', locale==='ar');
      } else {
        toastError(locale==='ar' ? 'فشل في الاعتماد' : 'Failed to approve', locale==='ar');
      }
    } catch (error) {
      console.error('Approve error:', error);
      toastError(locale==='ar' ? 'خطأ في الاعتماد' : 'Approval error', locale==='ar');
    }
  };
  const onDecline = async (id: number | string) => { 
    try {
      const result = await declineRental(String(id)); 
      if (result?.ok !== false) { // Only reload if not explicitly failed
        await load(); 
        toastSuccess(locale==='ar' ? 'تم الرفض بنجاح' : 'Declined successfully', locale==='ar');
      } else {
        toastError(locale==='ar' ? 'فشل في الرفض' : 'Failed to decline', locale==='ar');
      }
    } catch (error) {
      console.error('Decline error:', error);
      toastError(locale==='ar' ? 'خطأ في الرفض' : 'Decline error', locale==='ar');
    }
  };
  const onDeleteApproved = async (id: number | string) => { 
    try {
      const result = await removeRentalAdmin(String(id)); 
      if (result?.ok !== false) { // Only reload if not explicitly failed
        await load(); 
        toastSuccess(locale==='ar' ? 'تم الحذف بنجاح' : 'Deleted successfully', locale==='ar');
      } else {
        toastError(locale==='ar' ? 'فشل في الحذف' : 'Failed to delete', locale==='ar');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toastError(locale==='ar' ? 'خطأ في الحذف' : 'Delete error', locale==='ar');
    }
  };

  // Normalize groups
  const pendingItems = items.filter(r => String(r.status || '').toLowerCase() === 'pending');
  const approvedItems = items.filter(r => {
    const s = String(r.status || '').toLowerCase();
    return s === 'approved' || s === 'active';
  });

  return (
    <div className="min-h-screen bg-background" dir={locale==='ar'?'rtl':'ltr'}>
      <Header currentPage="admin-rentals" setCurrentPage={setCurrentPage as any} {...(rest as any)} />

      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{locale==='ar'? 'كل عقود التأجير' : 'All Rental Contracts'}</h1>
            <p className="text-muted-foreground">{locale==='ar'? 'إظهار جميع العقود بما فيها الموافق عليها' : 'Showing all contracts including approved'}</p>
          </div>
          <Button variant="outline" onClick={load}>{locale==='ar'? 'تحديث' : 'Refresh'}</Button>
        </div>

        {/* Pending Rentals */}
        <Card>
          <CardHeader>
            <CardTitle>{locale==='ar'? 'عقود بانتظار الموافقة' : 'Pending Contracts'} ({pendingItems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">{locale==='ar'? 'جارٍ التحميل...' : 'Loading...'}</div>
            ) : pendingItems.length === 0 ? (
              <div className="text-sm text-muted-foreground">{locale==='ar'? 'لا توجد عقود بانتظار الموافقة' : 'No pending contracts'}</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingItems.map((r:any, idx:number)=> (
                  <Card 
                    key={String(r._id || r.id || `${r.productId}-${r.startDate}-${idx}`)} 
                    className="group transition-all duration-300 cursor-pointer"
                    onClick={() => { setSelected(r); setDetailsOpen(true); }}
                  >
                    <CardContent className="p-4">
                      <div className="relative mb-3">
                        {r.imageUrl ? (
                          <Image src={r.imageUrl} alt={String(r.productName || '')} width={400} height={160} className="w-full h-40 object-cover rounded bg-gray-100" />
                        ) : (
                          <div className="w-full h-40 bg-gray-200 rounded flex items-center justify-center text-gray-500">
                            <Package className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <div className="font-medium line-clamp-1">{r.productName || `#${r.productId}`}</div>
                      <div className="text-xs text-muted-foreground">
                        {locale==='ar' ? `الحالة: ${getStatusInArabic(r.status)}` : `Status: ${getStatusInArabic(r.status)}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {locale==='ar' ? `تاريخ الإنشاء: ${new Date(r.createdAt).toLocaleDateString('ar-EG')}` : `Created: ${new Date(r.createdAt).toLocaleDateString('en-US')}`}
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        <div className="text-xs">{locale==='ar'? 'سعر اليوم' : 'Daily Price'}</div>
                        <div className="font-medium">{r.dailyRate} {getCurrencySymbol(r?.currency)}</div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2" onClick={(e)=>e.stopPropagation()}>
                        <Button size="sm" variant="default" onClick={()=> onApprove(r._id || r.id)}>{locale==='ar'? 'اعتماد' : 'Approve'}</Button>
                        <Button size="sm" variant="destructive" onClick={()=> onDecline(r._id || r.id)}>{locale==='ar'? 'رفض' : 'Decline'}</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approved Rentals */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{locale==='ar'? 'عقود معتمدة' : 'Approved Contracts'} ({approvedItems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">{locale==='ar'? 'جارٍ التحميل...' : 'Loading...'}</div>
            ) : approvedItems.length === 0 ? (
              <div className="text-sm text-muted-foreground">{locale==='ar'? 'لا توجد عقود معتمدة' : 'No approved contracts'}</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {approvedItems.map((r:any, idx:number)=> (
                  <Card 
                    key={String(r._id || r.id || `${r.productId}-${r.startDate}-${idx}`)} 
                    className="group transition-all duration-300 cursor-pointer"
                    onClick={() => { setSelected(r); setDetailsOpen(true); }}
                  >
                    <CardContent className="p-4">
                      <div className="relative mb-3">
                        {r.imageUrl ? (
                          <Image src={r.imageUrl} alt={String(r.productName || '')} width={400} height={160} className="w-full h-40 object-cover rounded bg-gray-100" />
                        ) : (
                          <div className="w-full h-40 bg-gray-200 rounded flex items-center justify-center text-gray-500">
                            <Package className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <div className="font-medium line-clamp-1">{r.productName || `#${r.productId}`}</div>
                      <div className="text-xs text-muted-foreground">
                        {locale==='ar' ? `الحالة: ${getStatusInArabic(r.status)}` : `Status: ${getStatusInArabic(r.status)}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {locale==='ar' ? `تاريخ الإنشاء: ${new Date(r.createdAt).toLocaleDateString('ar-EG')}` : `Created: ${new Date(r.createdAt).toLocaleDateString('en-US')}`}
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        <div className="text-xs">{locale==='ar'? 'سعر اليوم' : 'Daily Price'}</div>
                        <div className="font-medium">{r.dailyRate} {getCurrencySymbol(r?.currency)}</div>
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-2" onClick={(e)=>e.stopPropagation()}>
                        <Button size="sm" variant="destructive" onClick={()=> onDeleteApproved(r._id || r.id)}>{locale==='ar'? 'حذف' : 'Delete'}</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={(o:boolean)=>{ setDetailsOpen(o); if(!o) setSelected(null); }}>
          {detailsOpen && selected && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">{locale==='ar'? 'تفاصيل عقد التأجير' : 'Rental Details'}</h3>
                  <Button variant="ghost" onClick={()=>setDetailsOpen(false)}>×</Button>
                </div>
                <div className="space-y-2 text-sm">
                  <div><span className="text-muted-foreground">{locale==='ar'? 'المنتج' : 'Product'}: </span>{selected.productName || `#${selected.productId}`}</div>
                  <div><span className="text-muted-foreground">{locale==='ar'? 'الحالة' : 'Status'}: </span>{getStatusInArabic(selected.status)}</div>
                  <div><span className="text-muted-foreground">{locale==='ar'? 'تاريخ الإنشاء' : 'Created'}: </span>
                    {locale==='ar' 
                      ? new Date(selected.createdAt).toLocaleDateString('ar-EG')
                      : new Date(selected.createdAt).toLocaleDateString('en-US')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div className="text-xs">{locale==='ar'? 'سعر اليوم' : 'Daily Price'}</div>
                    <div className="font-medium">{selected.dailyRate} {getCurrencySymbol(selected.currency)}</div>
                  </div>
                  {selected.customerId && (
                    <div><span className="text-muted-foreground">{locale==='ar'? 'العميل' : 'Customer'}: </span>{customerNames[selected.customerId] || String(selected.customerId)}</div>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={()=>setDetailsOpen(false)}>{locale==='ar'? 'إغلاق' : 'Close'}</Button>
                </div>
              </div>
            </div>
          )}
        </Dialog>
      </div>

      <Footer setCurrentPage={setCurrentPage as any} />
    </div>
  );
}
