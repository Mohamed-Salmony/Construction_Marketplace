import React from 'react';
import Header from '../../components/Header';
import type { RouteContext } from '../../components/routerTypes';
import { useTranslation } from '../../hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Eye, CheckCircle, XCircle, Users, Clock, MapPin, User } from 'lucide-react';
import { useFirstLoadOverlay } from '../../hooks/useFirstLoadOverlay';
import { toastError, toastSuccess } from '../../utils/alerts';
import UserAvatar from '../../components/UserAvatar';
import { getAdminPendingServices, getAdminAllServices, approveService, rejectService } from '../../services/services';
import { approveService as approveServiceAdmin, rejectService as rejectServiceAdmin, getUserById, getAdminProjectById } from '../../services/admin';
import { getAdminOption } from '../../services/admin';

// Types for services data
type ServiceData = {
  id: string | number;
  title: string;
  titleAr?: string;
  titleEn?: string;
  description?: string;
  merchantId?: string;
  payRate?: number;
  costPerDay?: number;
  dailyWage?: number;
  currency?: string;
  createdAt: string;
  status?: string;
  vendorName?: string;
  vendorEmail?: string;
  vendorProfilePicture?: string;
  projectId?: string | number;
  projectData?: {
    id?: string | number;
    title?: string;
    customerId?: string;
    productName?: string;
    materials?: string;
    [key: string]: any;
  };
  customerData?: {
    id?: string;
    name?: string;
    email?: string;
    profilePicture?: string;
    [key: string]: any;
  };
  specialtyName?: string;
  days?: number;
  totalCost?: number;
  total?: number;
};

export default function AdminServices({ setCurrentPage, ...rest }: Partial<RouteContext>) {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';
  const hideFirstOverlay = useFirstLoadOverlay(rest, isAr ? 'جاري تحميل الخدمات' : 'Loading services', isAr ? 'يرجى الانتظار' : 'Please wait');
  const [services, setServices] = React.useState<ServiceData[]>([]);
  const [allServices, setAllServices] = React.useState<ServiceData[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [selectedService, setSelectedService] = React.useState<any | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      // Try to get all services first, fallback to pending if not available
      let r: any = await getAdminAllServices();
      
      // Fallback: if getAdminAllServices fails, use pending services only
      if (!r.ok || !r.data || !Array.isArray(r.data.items)) {
        r = await getAdminPendingServices();
      }
      
      if (r.ok && r.data && Array.isArray(r.data.items)) {
        const servicesWithDetails = await Promise.all(
          r.data.items.map(async (service: any, index: number) => {
            let enhancedService = {
              ...service,
              // Ensure basic fields are present
              title: service.title || service.type || 'خدمة',
              description: service.description || '',
              status: service.status || (service.isApproved ? 'approved' : 'pending'),
              // Ensure IDs are properly set
              merchantId: service.merchantId || service.vendorId,
              projectId: service.projectId
            };

            try {
              // Get vendor details
              if (service.merchantId || service.vendorId) {
                const vendorId = service.merchantId || service.vendorId;
                const vendorResult = await getUserById(vendorId);
                if (vendorResult.ok && vendorResult.data?.item) {
                  const vendor = vendorResult.data.item;
                  enhancedService.vendorName = vendor.name || vendor.firstName + ' ' + (vendor.lastName || '') || 'غير محدد';
                  enhancedService.vendorEmail = vendor.email;
                  enhancedService.vendorProfilePicture = vendor.profilePicture;
                } else {
                }
              }

              // Extract project ID from description if not in projectId field
              let projectId = service.projectId;
              if (!projectId && service.description) {
                const projectIdMatch = service.description.match(/(?:مرتبط بالمشروع:|linked to project:)\s*([a-f0-9]{24})/i);
                if (projectIdMatch) {
                  projectId = projectIdMatch[1];
                }
              }

              // Get project details if linked
              if (projectId) {
                const projectResult = await getAdminProjectById(projectId);
                if (projectResult.ok && projectResult.data) {
                  const projectData = projectResult.data as any;

                  enhancedService.projectData = {
                    id: projectData.id || projectData._id,
                    title: projectData.title || projectData.name,
                    productName: projectData.productName || projectData.selectedProduct?.nameAr || projectData.selectedProduct?.nameEn,
                    productType: projectData.productType || projectData.selectedProduct?.type,
                    materials: projectData.materials || projectData.selectedMaterials,
                    customerId: projectData.customerId || projectData.userId || projectData.clientId
                  };

                  // Get customer details
                  const customerId = projectData.customerId || projectData.userId || projectData.clientId;
                  if (customerId) {
                    const customerResult = await getUserById(customerId);
                    if (customerResult.ok && customerResult.data?.item) {
                      const customer = customerResult.data.item;
                      enhancedService.customerData = {
                        id: customer.id,
                        name: customer.name || customer.firstName + ' ' + (customer.lastName || ''),
                        email: customer.email,
                        profilePicture: customer.profilePicture
                      };
                    } else {
                    }
                  }
                } else {
                }
              }

              // Get specialty name and calculate cost
              await enrichServiceWithSpecialtyAndCost(enhancedService);

            } catch (error) {
            }

            return enhancedService;
          })
        );

        const pendingServices = servicesWithDetails.filter(s => s.status !== 'approved' && s.status !== 'rejected');
        const approvedServices = servicesWithDetails.filter(s => s.status === 'approved');

        setServices([...pendingServices, ...approvedServices]);
        setAllServices(servicesWithDetails);
      } else {
        setServices([]);
        setAllServices([]);
      }
    } catch (error) {
      console.error('Error loading services:', error);
      setServices([]);
      setAllServices([]);
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

  // Function to enrich service with specialty and cost calculation
  const enrichServiceWithSpecialtyAndCost = async (service: any) => {
    try {

      // Get technician specialties from AdminOptions
      const specialtiesResult = await getAdminOption('technician_specialties');
      if (specialtiesResult.ok && specialtiesResult.data?.value) {
        let specialties;
        try {
          specialties = JSON.parse(specialtiesResult.data.value);
        } catch {
          // Fallback for old format (array of strings)
          specialties = specialtiesResult.data.value;
        }

        if (Array.isArray(specialties)) {
          const specialty = specialties.find(s => {
            if (typeof s === 'string') {
              return s.toLowerCase() === service.title?.toLowerCase();
            }
            return s.name?.toLowerCase() === service.title?.toLowerCase();
          });


          if (specialty) {
            service.specialtyName = typeof specialty === 'string' ? specialty : specialty.name;
            service.costPerDay = typeof specialty === 'object' ? specialty.costPerDay : (service.dailyWage || service.payRate || 0);
          }
        }
      }

      // Use dailyWage from service data or calculated costPerDay
      const costPerDay = service.costPerDay || service.dailyWage || service.payRate || 0;
      const days = service.days || service.durationDays || service.duration || service.estimatedDays || 1;
      

      if (costPerDay > 0) {
        service.days = days;
        service.costPerDay = costPerDay;
        service.totalCost = days * costPerDay;
      }
    } catch (error) {
      // Error handling
    }
  };

  const doApprove = async (id: string | number) => {
    try {
      const r = await approveServiceAdmin(String(id));
      if (r.ok) {
        toastSuccess(isAr ? 'تم اعتماد الخدمة' : 'Service approved', isAr);
        await load();
      } else {
        toastError(isAr ? 'فشل اعتماد الخدمة' : 'Failed to approve service', isAr);
      }
    } catch (error) {
      console.error('Error approving service:', error);
      toastError(isAr ? 'فشل اعتماد الخدمة' : 'Failed to approve service', isAr);
    }
  };

  const doReject = async (id: string | number) => {
    try {
      const r = await rejectServiceAdmin(String(id), '');
      if (r.ok) {
        toastSuccess(isAr ? 'تم رفض الخدمة' : 'Service rejected', isAr);
        await load();
      } else {
        toastError(isAr ? 'فشل رفض الخدمة' : 'Failed to reject service', isAr);
      }
    } catch (error) {
      console.error('Error rejecting service:', error);
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

  const pendingServices = services.filter(s => s.status !== 'approved' && s.status !== 'rejected');
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
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? (isAr ? 'جاري التحميل...' : 'Loading...') : (isAr ? 'تحديث' : 'Refresh')}
          </Button>
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
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {service.specialtyName && <Badge variant="secondary">{service.specialtyName}</Badge>}
                    <Badge variant={getStatusColor(service.status || 'pending')}>{getStatusText(service.status || 'pending')}</Badge>
                  </div>

                  {/* Vendor Information */}
                  <div className="flex items-center gap-3 mb-2">
                    <UserAvatar
                      src={service.vendorProfilePicture}
                      name={service.vendorName || 'تاجر'}
                      size="sm"
                    />
                    <div className="text-sm">
                      <div className="font-medium">{service.vendorName || (isAr ? 'غير محدد' : 'Not specified')}</div>
                      {service.vendorEmail && (
                        <div className="text-xs text-muted-foreground">{service.vendorEmail}</div>
                      )}
                    </div>
                  </div>

                  {service.description && (
                    <div className="text-sm text-muted-foreground mb-1">
                      {/* Remove project ID reference from description */}
                      {service.description.replace(/\(مرتبط بالمشروع: [^)]+\)/, '').replace(/\(linked to project: [^)]+\)/i, '').trim()}
                    </div>
                  )}

                  {/* Project Owner Name */}
                  {service.customerData && (
                    <div className="text-sm font-medium text-blue-600 mb-1">
                      {isAr ? 'صاحب المشروع:' : 'Project Owner:'} {service.customerData.name}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    {service.payRate && (
                      <>
                        <span>{isAr ? 'الأجرة:' : 'Pay Rate:'} {service.payRate} {service.currency || (isAr ? 'ر.س' : 'SAR')}</span>
                        <span className="mx-2">•</span>
                      </>
                    )}
                    {service.days && (
                      <>
                        <span>{isAr ? 'المدة:' : 'Duration:'} {service.days} {isAr ? 'يوم' : 'days'}</span>
                        <span className="mx-2">•</span>
                      </>
                    )}
                    {service.totalCost && (
                      <>
                        <span>{isAr ? 'الإجمالي:' : 'Total:'} {service.totalCost} {service.currency || (isAr ? 'ر.س' : 'SAR')}</span>
                        <span className="mx-2">•</span>
                      </>
                    )}
                    <span>{isAr ? 'تاريخ الإنشاء:' : 'Created:'} {new Date(service.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => openDetails(service)}>
                    <Eye className="w-4 h-4 mr-1" /> {isAr ? 'عرض' : 'View'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => doApprove(service.id)}>
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => doReject(service.id)}>
                    <XCircle className="w-4 h-4" />
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
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {service.specialtyName && <Badge variant="secondary">{service.specialtyName}</Badge>}
                    <Badge variant={getStatusColor(service.status || 'approved')}>{getStatusText(service.status || 'approved')}</Badge>
                  </div>

                  {/* Vendor Information */}
                  <div className="flex items-center gap-3 mb-2">
                    <UserAvatar
                      src={service.vendorProfilePicture}
                      name={service.vendorName || 'تاجر'}
                      size="sm"
                    />
                    <div className="text-sm">
                      <div className="font-medium">{service.vendorName || (isAr ? 'غير محدد' : 'Not specified')}</div>
                      {service.vendorEmail && (
                        <div className="text-xs text-muted-foreground">{service.vendorEmail}</div>
                      )}
                    </div>
                  </div>

                  {service.description && (
                    <div className="text-sm text-muted-foreground mb-1">
                      {/* Remove project ID reference from description */}
                      {String(service.description).replace(/\(مرتبط بالمشروع: [^)]+\)/, '').replace(/\(linked to project: [^)]+\)/i, '').trim()}
                    </div>
                  )}

                  {/* Project Owner Name */}
                  {service.customerData && (
                    <div className="text-sm font-medium text-blue-600 mb-1">
                      {isAr ? 'صاحب المشروع:' : 'Project Owner:'} {service.customerData.name}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    {(service.costPerDay || service.payRate || service.dailyWage) && (
                      <>
                        <span>{isAr ? 'الأجرة:' : 'Rate:'} {service.costPerDay || service.payRate || service.dailyWage} {service.currency || (isAr ? 'ر.س' : 'SAR')}</span>
                        <span className="mx-2">•</span>
                      </>
                    )}
                    {service.days && (
                      <>
                        <span>{isAr ? 'المدة:' : 'Duration:'} {service.days} {isAr ? 'يوم' : 'days'}</span>
                        <span className="mx-2">•</span>
                      </>
                    )}
                    {(service.totalCost || service.total) && (
                      <>
                        <span>{isAr ? 'الإجمالي:' : 'Total:'} {service.totalCost || service.total} {service.currency || (isAr ? 'ر.س' : 'SAR')}</span>
                        <span className="mx-2">•</span>
                      </>
                    )}
                    <span>{isAr ? 'تاريخ الإنشاء:' : 'Created:'} {new Date(service.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => openDetails(service)}>
                    <Eye className="w-4 h-4 mr-1" /> {isAr ? 'عرض' : 'View'}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>


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
                      {selectedService.specialtyName && (
                        <div><span className="text-muted-foreground">{isAr ? 'التخصص:' : 'Specialty:'}</span> {selectedService.specialtyName}</div>
                      )}
                      {selectedService.payRate && (
                        <div><span className="text-muted-foreground">{isAr ? 'الأجرة اليومية:' : 'Daily Rate:'}</span> {selectedService.payRate} {selectedService.currency || (isAr ? 'ر.س' : 'SAR')}</div>
                      )}
                      {selectedService.days && (
                        <div><span className="text-muted-foreground">{isAr ? 'مدة العمل:' : 'Duration:'}</span> {selectedService.days} {isAr ? 'يوم' : 'days'}</div>
                      )}
                      {selectedService.totalCost && (
                        <div><span className="text-muted-foreground">{isAr ? 'التكلفة الإجمالية:' : 'Total Cost:'}</span> <span className="font-medium text-green-600">{selectedService.totalCost} {selectedService.currency || (isAr ? 'ر.س' : 'SAR')}</span></div>
                      )}
                      <div><span className="text-muted-foreground">{isAr ? 'الحالة:' : 'Status:'}</span> <Badge variant={getStatusColor(selectedService.status || 'pending')}>{getStatusText(selectedService.status || 'pending')}</Badge></div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {isAr ? 'معلومات التاجر' : 'Vendor Information'}
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={selectedService.vendorProfilePicture}
                          name={selectedService.vendorName}
                          size="md"
                        />
                        <div>
                          <div className="font-medium">{selectedService.vendorName || (isAr ? 'غير محدد' : 'Not specified')}</div>
                          {selectedService.vendorEmail && (
                            <div className="text-xs text-muted-foreground">{selectedService.vendorEmail}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-sm">
                        <div><span className="text-muted-foreground">{isAr ? 'تاريخ الإنشاء:' : 'Created:'}</span> {new Date(selectedService.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Project Information if linked */}
                {(selectedService.projectData || selectedService.projectId) && (
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">
                      {isAr ? '  المشروع' : 'Project '}
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2">
                      {selectedService.projectData ? (
                        <>
                          {selectedService.projectData.materials && (
                            <div className="text-sm">
                              <span className="font-medium">{isAr ? 'الخامة:' : 'Material:'}</span> {selectedService.projectData.materials}
                            </div>
                          )}
                          {selectedService.projectData.productName && (
                            <div className="text-sm">
                              <span className="font-medium">{isAr ? 'المنتج:' : 'Product:'}</span> {selectedService.projectData.productName}
                            </div>
                          )}
                          {selectedService.projectData.productType && (
                            <div className="text-sm">
                              <span className="font-medium">{isAr ? 'نوع المنتج:' : 'Product Type:'}</span> {selectedService.projectData.productType}
                            </div>
                          )}
                          {selectedService.projectData.materials && (
                            <div className="text-sm">
                              <span className="font-medium">{isAr ? 'الخامات:' : 'Materials:'}</span> {selectedService.projectData.materials}
                            </div>
                          )}

                          {/* Customer Information */}
                          {selectedService.customerData && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                              <div className="text-sm font-medium mb-2">{isAr ? 'صاحب المشروع:' : 'Project Owner:'}</div>
                              <div className="flex items-center gap-3">
                                <UserAvatar
                                  src={selectedService.customerData.profilePicture}
                                  name={selectedService.customerData.name}
                                  size="sm"
                                />
                                <div>
                                  <div className="text-sm font-medium">{selectedService.customerData.name || (isAr ? 'عميل' : 'Customer')}</div>
                                  {selectedService.customerData.email && (
                                    <div className="text-xs text-muted-foreground">{selectedService.customerData.email}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {isAr ? 'جاري تحميل بيانات المشروع...' : 'Loading project details...'}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Service Description - separate from project info */}
                <div>
                  <h3 className="font-medium mb-2">{isAr ? 'وصف الخدمة' : 'Service Description'}</h3>
                  {selectedService.description && selectedService.description.trim() ? (
                    <p className="text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800 rounded p-3">
                      {/* Remove project ID reference from description if present */}
                      {selectedService.description.replace(/\(مرتبط بالمشروع: [^)]+\)/, '').replace(/\(linked to project: [^)]+\)/i, '').trim() || (isAr ? 'لا يوجد وصف' : 'No description')}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">{isAr ? 'لا يوجد وصف للخدمة' : 'No service description available'}</p>
                  )}
                </div>

                {/* Action Buttons */}
                {selectedService.status === 'pending' || !selectedService.status && (
                  <div className="border-t pt-4">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                        {isAr ? 'إغلاق' : 'Close'}
                      </Button>
                      <Button onClick={() => {
                        setDetailsOpen(false);
                        doApprove(selectedService.id);
                      }}>
                        {isAr ? 'اعتماد' : 'Approve'}
                      </Button>
                      <Button variant="destructive" onClick={() => {
                        setDetailsOpen(false);
                        doReject(selectedService.id);
                      }}>
                        {isAr ? 'رفض' : 'Reject'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
