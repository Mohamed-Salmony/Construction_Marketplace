import React from 'react';
import Header from '../../components/Header';
import type { RouteContext } from '../../components/routerTypes';
import { useTranslation } from '../../hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Eye, CheckCircle, XCircle, Users, Clock, MapPin } from 'lucide-react';
import { useFirstLoadOverlay } from '../../hooks/useFirstLoadOverlay';
import { toastError, toastSuccess } from '../../utils/alerts';

// Mock services data - replace with real API calls
const mockServices = [
  {
    id: '1',
    titleAr: 'خدمة سباكة',
    titleEn: 'Plumbing Service',
    descriptionAr: 'إصلاح وتركيب الأنابيب والصنابير',
    descriptionEn: 'Pipe and faucet repair and installation',
    vendorName: 'أحمد المقاول',
    vendorId: 'vendor1',
    serviceType: { ar: 'سباك', en: 'Plumber' },
    location: 'الرياض',
    price: 150,
    status: 'pending',
    createdAt: '2024-01-15T10:00:00Z',
    applicants: [
      { id: 'tech1', name: 'محمد الفني', phone: '966501234567', appliedAt: '2024-01-16T09:00:00Z' },
      { id: 'tech2', name: 'علي العامل', phone: '966507654321', appliedAt: '2024-01-16T11:00:00Z' }
    ]
  },
  {
    id: '2',
    titleAr: 'خدمة كهربائية',
    titleEn: 'Electrical Service',
    descriptionAr: 'تركيب وصيانة الأنظمة الكهربائية',
    descriptionEn: 'Installation and maintenance of electrical systems',
    vendorName: 'سارة المقاولة',
    vendorId: 'vendor2',
    serviceType: { ar: 'كهربائي', en: 'Electrician' },
    location: 'جدة',
    price: 200,
    status: 'approved',
    createdAt: '2024-01-10T14:00:00Z',
    applicants: [
      { id: 'tech3', name: 'خالد الكهربائي', phone: '966502345678', appliedAt: '2024-01-11T08:00:00Z' }
    ]
  }
];

export default function AdminServices({ setCurrentPage, ...rest }: Partial<RouteContext>) {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';
  const hideFirstOverlay = useFirstLoadOverlay(rest, isAr ? 'جاري تحميل الخدمات' : 'Loading services', isAr ? 'يرجى الانتظار' : 'Please wait');
  const [services, setServices] = React.useState(mockServices);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [selectedService, setSelectedService] = React.useState<any | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      // TODO: Replace with real API call
      // const r = await getAdminServices();
      // if (r.ok && r.data && Array.isArray(r.data.items)) setServices(r.data.items);
      // else setServices([]);
      setServices(mockServices);
    } catch {
      setServices([]);
      toastError(isAr ? 'تعذر جلب الخدمات' : 'Failed to fetch services', isAr);
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  React.useEffect(() => { 
    (async () => { 
      await load(); 
      hideFirstOverlay(); 
    })(); 
  }, []); // No dependencies to prevent infinite loops

  const doApprove = async (id: string) => {
    try {
      // TODO: Replace with real API call
      // const r = await approveService(id);
      // if (r.ok) { 
      //   toastSuccess(isAr ? 'تم اعتماد الخدمة' : 'Service approved', isAr); 
      //   await load(); 
      // } else {
      //   toastError(isAr ? 'فشل اعتماد الخدمة' : 'Failed to approve service', isAr);
      // }
      
      // Mock approval
      setServices(prev => prev.map(s => s.id === id ? { ...s, status: 'approved' } : s));
      toastSuccess(isAr ? 'تم اعتماد الخدمة' : 'Service approved', isAr); 
    } catch { 
      toastError(isAr ? 'فشل اعتماد الخدمة' : 'Failed to approve service', isAr); 
    }
  };

  const doReject = async (id: string) => {
    try {
      // TODO: Replace with real API call
      // const r = await rejectService(id, '');
      // if (r.ok) { 
      //   toastSuccess(isAr ? 'تم رفض الخدمة' : 'Service rejected', isAr); 
      //   await load(); 
      // } else {
      //   toastError(isAr ? 'فشل رفض الخدمة' : 'Failed to reject service', isAr);
      // }
      
      // Mock rejection
      setServices(prev => prev.map(s => s.id === id ? { ...s, status: 'rejected' } : s));
      toastSuccess(isAr ? 'تم رفض الخدمة' : 'Service rejected', isAr); 
    } catch { 
      toastError(isAr ? 'فشل رفض الخدمة' : 'Failed to reject service', isAr); 
    }
  };

  const openDetails = (service: any) => {
    setSelectedService(service);
    setDetailsOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "default";
      case "rejected": return "destructive";
      case "pending": return "secondary";
      default: return "outline";
    }
  };

  const getStatusText = (status: string) => {
    if (isAr) {
      switch (status) {
        case "approved": return "معتمدة";
        case "rejected": return "مرفوضة";
        case "pending": return "قيد الانتظار";
        default: return status;
      }
    }
    switch (status) {
      case "approved": return "Approved";
      case "rejected": return "Rejected";
      case "pending": return "Pending";
      default: return status;
    }
  };

  const pendingServices = services.filter(s => s.status === 'pending');
  const approvedServices = services.filter(s => s.status === 'approved');
  const rejectedServices = services.filter(s => s.status === 'rejected');

  return (
    <div className="min-h-screen bg-background">
      <Header {...(rest as any)} />
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{isAr ? 'إدارة الخدمات' : 'Services Management'}</h1>
            <p className="text-muted-foreground">{isAr ? 'إدارة الخدمات المقدمة من التجار والطلبات المتقدمة من الفنيين' : 'Manage services provided by vendors and applications from technicians'}</p>
          </div>
          <Button variant="outline" onClick={load}>{isAr ? 'تحديث' : 'Refresh'}</Button>
        </div>

        {/* Pending Services */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {isAr ? 'الخدمات قيد الانتظار' : 'Pending Services'} ({pendingServices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingServices.length === 0 && (
              <div className="text-sm text-muted-foreground">{loading ? (isAr ? 'جاري التحميل...' : 'Loading...') : (isAr ? 'لا توجد خدمات قيد الانتظار' : 'No pending services')}</div>
            )}
            {pendingServices.map((service) => (
              <div key={service.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{isAr ? service.titleAr : service.titleEn}</span>
                    <Badge variant="secondary">{service.serviceType[isAr ? 'ar' : 'en']}</Badge>
                    <Badge variant={getStatusColor(service.status)}>{getStatusText(service.status)}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{isAr ? service.descriptionAr : service.descriptionEn}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <span>{isAr ? 'التاجر:' : 'Vendor:'} {service.vendorName}</span>
                    <span className="mx-2">•</span>
                    <span>{isAr ? 'الموقع:' : 'Location:'} {service.location}</span>
                    <span className="mx-2">•</span>
                    <span>{isAr ? 'السعر:' : 'Price:'} {service.price} {isAr ? 'ر.س' : 'SAR'}</span>
                    <span className="mx-2">•</span>
                    <span>{isAr ? 'المتقدمين:' : 'Applicants:'} {service.applicants.length}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => openDetails(service)}>
                    <Eye className="w-4 h-4 mr-1" /> {isAr ? 'تفاصيل' : 'Details'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => doApprove(service.id)}>
                    <CheckCircle className="w-4 h-4 mr-1" /> {isAr ? 'اعتماد' : 'Approve'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => doReject(service.id)}>
                    <XCircle className="w-4 h-4 mr-1" /> {isAr ? 'رفض' : 'Reject'}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Approved Services */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              {isAr ? 'الخدمات المعتمدة' : 'Approved Services'} ({approvedServices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {approvedServices.length === 0 && (
              <div className="text-sm text-muted-foreground">{isAr ? 'لا توجد خدمات معتمدة' : 'No approved services'}</div>
            )}
            {approvedServices.map((service) => (
              <div key={service.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{isAr ? service.titleAr : service.titleEn}</span>
                    <Badge variant="secondary">{service.serviceType[isAr ? 'ar' : 'en']}</Badge>
                    <Badge variant={getStatusColor(service.status)}>{getStatusText(service.status)}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{isAr ? service.descriptionAr : service.descriptionEn}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <span>{isAr ? 'التاجر:' : 'Vendor:'} {service.vendorName}</span>
                    <span className="mx-2">•</span>
                    <span>{isAr ? 'الموقع:' : 'Location:'} {service.location}</span>
                    <span className="mx-2">•</span>
                    <span>{isAr ? 'السعر:' : 'Price:'} {service.price} {isAr ? 'ر.س' : 'SAR'}</span>
                    <span className="mx-2">•</span>
                    <span>{isAr ? 'المتقدمين:' : 'Applicants:'} {service.applicants.length}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => openDetails(service)}>
                    <Eye className="w-4 h-4 mr-1" /> {isAr ? 'تفاصيل' : 'Details'}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="mt-4">
          <Button variant="outline" onClick={() => setCurrentPage && setCurrentPage('admin-dashboard')}>{isAr ? 'رجوع' : 'Back'}</Button>
        </div>

        {/* Service Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-3xl bg-white/95 backdrop-blur-sm border border-white/20">
            <DialogHeader>
              <DialogTitle>{isAr ? 'تفاصيل الخدمة' : 'Service Details'}</DialogTitle>
            </DialogHeader>
            {selectedService && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium mb-2">{isAr ? 'معلومات الخدمة' : 'Service Information'}</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-muted-foreground">{isAr ? 'العنوان:' : 'Title:'}</span> {isAr ? selectedService.titleAr : selectedService.titleEn}</div>
                      <div><span className="text-muted-foreground">{isAr ? 'النوع:' : 'Type:'}</span> {selectedService.serviceType[isAr ? 'ar' : 'en']}</div>
                      <div><span className="text-muted-foreground">{isAr ? 'السعر:' : 'Price:'}</span> {selectedService.price} {isAr ? 'ر.س' : 'SAR'}</div>
                      <div><span className="text-muted-foreground">{isAr ? 'الموقع:' : 'Location:'}</span> {selectedService.location}</div>
                      <div><span className="text-muted-foreground">{isAr ? 'الحالة:' : 'Status:'}</span> <Badge variant={getStatusColor(selectedService.status)}>{getStatusText(selectedService.status)}</Badge></div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">{isAr ? 'معلومات التاجر' : 'Vendor Information'}</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-muted-foreground">{isAr ? 'الاسم:' : 'Name:'}</span> {selectedService.vendorName}</div>
                      <div><span className="text-muted-foreground">{isAr ? 'تاريخ الإنشاء:' : 'Created:'}</span> {new Date(selectedService.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">{isAr ? 'الوصف' : 'Description'}</h3>
                  <p className="text-sm text-muted-foreground">{isAr ? selectedService.descriptionAr : selectedService.descriptionEn}</p>
                </div>

                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {isAr ? 'الفنيين المتقدمين' : 'Applied Technicians'} ({selectedService.applicants.length})
                  </h3>
                  {selectedService.applicants.length === 0 ? (
                    <div className="text-sm text-muted-foreground">{isAr ? 'لا يوجد فنيين متقدمين' : 'No technicians applied'}</div>
                  ) : (
                    <div className="space-y-2">
                      {selectedService.applicants.map((applicant: any) => (
                        <div key={applicant.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{applicant.name}</div>
                            <div className="text-sm text-muted-foreground">{applicant.phone}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {isAr ? 'تاريخ التقديم:' : 'Applied:'} {new Date(applicant.appliedAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
