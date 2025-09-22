import { Home, Package, ShoppingCart, User, Truck, FileText, HelpCircle, Store, BarChart3, Settings, Users, TrendingUp, Shield, Tag, Globe, Percent, Phone, Bell, Heart } from 'lucide-react';

// Define RouteConfig interface
interface RouteConfig {
  component: React.ComponentType<any>;
  title: string;
  icon: React.ComponentType<any>;
  requiresAuth?: boolean;
  allowedRoles?: string[];
}

// Import page components
import Homepage from '../pages/Homepage';
import CategoriesPage from '../pages/Categories';
import ProductListing from '../pages/ProductListing';
import ProductDetails from '../pages/ProductDetails';
import Cart from '../pages/Cart';
import UserProfile from '../pages/UserProfile';
import TrackOrder from '../pages/TrackOrder';
import MyOrders from '../pages/MyOrders';
import About from '../pages/About';
import FAQ from '../pages/FAQ';
import Projects from '../pages/Projects';
import Rentals from '../pages/Rentals';
import RentalDetails from '../pages/RentalDetails';
import RentalContract from '../pages/RentalContract';
import ProjectsBuilder from '../pages/ProjectsBuilder';
import ProjectDetails from '../pages/ProjectDetails';
import ProjectChat from '../pages/ProjectChat';
import Favorites from '../pages/Favorites';
import AddService from '../pages/AddService';
import ServiceDetails from '../pages/ServiceDetails';
import Support from '../pages/Support';
import Checkout from '../pages/Checkout';
import Offers from '../pages/Offers';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import NotificationsPage from '../pages/Notifications';
import ChatInbox from '../pages/ChatInbox';
import RentalChat from '../pages/RentalChat';

// Import vendor dashboard components
import VendorDashboard from '../pages/vendor/VendorDashboard';
import VendorProducts from '../pages/vendor/VendorProducts';
import VendorOrders from '../pages/vendor/VendorOrders';
import VendorAnalytics from '../pages/vendor/VendorAnalytics';
import VendorAccounting from '../pages/vendor/VendorAccounting';
import VendorProjects from '../pages/vendor/VendorProjects';
import VendorServices from '../pages/vendor/VendorServices';
import VendorRentals from '../pages/vendor/VendorRentals';
import VendorProjectDetails from '../pages/vendor/VendorProjectDetails';
import VendorServiceApplicants from '../pages/vendor/VendorServiceApplicants';
import VendorChat from '../pages/vendor/VendorChat';

// Import admin dashboard components
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminUsers from '../pages/admin/AdminUsers';
import AdminVendors from '../pages/admin/AdminVendors';
import AdminProducts from '../pages/admin/AdminProducts';
import AdminReports from '../pages/admin/AdminReports';
import AdminSections from '../pages/admin/AdminSections';
import AdminProductOptions from '../pages/admin/AdminProductOptions';
import AdminRentalOptions from '../pages/admin/AdminRentalOptions';
import AdminTechnicianOptions from '../pages/admin/AdminTechnicianOptions';
import AdminTechnicians from '../pages/admin/AdminTechnicians';
import AdminProjectOptions from '../pages/admin/AdminProjectOptions';
import AdminPendingProjects from '../pages/admin/AdminPendingProjects';
import AdminAllProjects from '../pages/admin/AdminAllProjects';
import AdminProjectDetails from '../pages/admin/AdminProjectDetails';
import AdminRentals from '../pages/admin/AdminRentals';
import AdminOffers from '../pages/admin/AdminOffers';
import AdminServices from '../pages/admin/AdminServices';
import AdminPromoCodes from '../pages/admin/AdminPromoCodes';

// Technician pages
import TechnicianServices from '../pages/technician/TechnicianServices';
import TechnicianProjects from '../pages/technician/TechnicianProjects';
import TechnicianProjectDetails from '../pages/technician/TechnicianProjectDetails';
import TechnicianServiceDetails from '../pages/technician/TechnicianServiceDetails';
import TechnicianChat from '../pages/technician/TechnicianChat';

export const routes: Record<string, RouteConfig> = {
  // Public routes
  home: { component: Homepage, title: 'الرئيسية', icon: Home },
  categories: { component: CategoriesPage, title: 'الفئات', icon: Tag },
  products: { component: ProductListing, title: 'المنتجات', icon: Package },
  'product-details': { component: ProductDetails, title: 'تفاصيل المنتج', icon: Package },
  cart: { component: Cart, title: 'السلة', icon: ShoppingCart },
  favorites: { component: Favorites, title: 'المفضلة', icon: Heart as any },
  checkout: { component: Checkout, title: 'إتمام الطلب', icon: ShoppingCart },
  login: { component: Login, title: 'تسجيل الدخول', icon: User },
  register: { component: Register, title: 'إنشاء حساب', icon: User },
  'forgot-password': { component: ForgotPassword, title: 'إعادة تعيين كلمة المرور', icon: User },
  offers: { component: Offers, title: 'العروض والخصومات', icon: Percent },
  about: { component: About, title: 'من نحن', icon: Globe },
  faq: { component: FAQ, title: 'الأسئلة الشائعة', icon: HelpCircle },
  projects: { component: Projects, title: 'المشاريع', icon: Tag },
  rentals: { component: Rentals, title: 'التأجير', icon: Tag },
  'rental-details': { component: RentalDetails, title: 'تفاصيل التأجير', icon: Tag },
  'rental-contract': { component: RentalContract, title: 'عقد تأجير', icon: Tag },
  'add-service': { component: AddService, title: 'إضافة خدمة', icon: Tag },
  'service-details': { component: ServiceDetails, title: 'تفاصيل الخدمة', icon: Tag },
  'projects-builder': { component: ProjectsBuilder, title: 'إضافة مشروع', icon: Tag, requiresAuth: true },
  'project-details': { component: ProjectDetails, title: 'تفاصيل المشروع', icon: Tag },
  'project-chat': { component: ProjectChat, title: 'محادثة المشروع', icon: Users, requiresAuth: true, allowedRoles: ['customer','vendor','admin'] },
  support: { component: Support, title: 'الدعم الفني', icon: Phone },

  // User routes (require authentication)
  profile: { component: UserProfile, title: 'الملف الشخصي', icon: User, requiresAuth: true },
  'track-order': { component: TrackOrder, title: 'تتبع الطلب', icon: Truck, requiresAuth: true },
  'my-orders': { component: MyOrders, title: 'طلباتي', icon: FileText, requiresAuth: true },
  notifications: { component: NotificationsPage, title: 'التنبيهات', icon: Bell, requiresAuth: true, allowedRoles: ['customer', 'vendor', 'admin', 'worker'] },
  'chat-inbox': { component: ChatInbox, title: 'الدردشة', icon: Users, requiresAuth: true, allowedRoles: ['customer','vendor','worker','admin'] },
  'rental-chat': { component: RentalChat, title: 'محادثة التأجير', icon: Users, requiresAuth: true, allowedRoles: ['customer','vendor','admin'] },

  // Vendor routes (require vendor role)
  'vendor-dashboard': { component: VendorDashboard, title: 'لوحة التحكم', icon: BarChart3, requiresAuth: true, allowedRoles: ['vendor'] },
  'vendor-products': { component: VendorProducts, title: 'منتجاتي', icon: Package, requiresAuth: true, allowedRoles: ['vendor'] },
  'vendor-orders': { component: VendorOrders, title: 'الطلبات', icon: FileText, requiresAuth: true, allowedRoles: ['vendor'] },
  'vendor-analytics': { component: VendorAnalytics, title: 'التحليلات', icon: TrendingUp, requiresAuth: true, allowedRoles: ['vendor'] },
  'vendor-accounting': { component: VendorAccounting, title: 'النظام المحاسبي', icon: TrendingUp, requiresAuth: true, allowedRoles: ['vendor'] },
  'vendor-projects': { component: VendorProjects, title: 'مشاريعي', icon: Tag, requiresAuth: true, allowedRoles: ['vendor'] },
  'vendor-project-details': { component: VendorProjectDetails, title: 'تفاصيل مشروع', icon: Tag, requiresAuth: true, allowedRoles: ['vendor'] },
  'vendor-services': { component: VendorServices, title: 'خدماتي', icon: Tag, requiresAuth: true, allowedRoles: ['vendor'] },
  'vendor-rentals': { component: VendorRentals, title: 'التأجير', icon: Tag, requiresAuth: true, allowedRoles: ['vendor'] },
  'vendor-service-applicants': { component: VendorServiceApplicants, title: 'المتقدمون على الخدمات', icon: Users, requiresAuth: true, allowedRoles: ['vendor'] },
  'vendor-chat': { component: VendorChat, title: 'مراسلة الفني', icon: Users, requiresAuth: true, allowedRoles: ['vendor'] },

  // Admin routes (require admin role)
  'admin-dashboard': { component: AdminDashboard, title: 'لوحة التحكم الإدارية', icon: Shield, requiresAuth: true, allowedRoles: ['admin'] },
  'admin-users': { component: AdminUsers, title: 'إدارة المستخدمين', icon: Users, requiresAuth: true, allowedRoles: ['admin'] },
  'admin-vendors': { component: AdminVendors, title: 'إدارة المتاجر', icon: Store, requiresAuth: true, allowedRoles: ['admin'] },
  'admin-products': { component: AdminProducts, title: 'إدارة المنتجات', icon: Package, requiresAuth: true, allowedRoles: ['admin'] },
  'admin-reports': { component: AdminReports, title: 'Reports & Analytics', icon: BarChart3, requiresAuth: true, allowedRoles: ['admin'] },
  'admin-sections': { component: AdminSections, title: 'الأقسام', icon: Package, requiresAuth: true, allowedRoles: ['admin'] },
  'admin-sections-products': { component: AdminProductOptions, title: 'خيارات المنتجات', icon: Package, requiresAuth: true, allowedRoles: ['admin'] },
  'admin-sections-rentals': { component: AdminRentalOptions, title: 'أقسام التأجير', icon: Tag, requiresAuth: true, allowedRoles: ['admin'] },
  'admin-sections-technicians': { component: AdminTechnicianOptions, title: 'خيارات العمال', icon: Users, requiresAuth: true, allowedRoles: ['admin'] },
  // Admin project management
  'admin-project-options': { component: AdminProjectOptions, title: 'خيارات مشاريع (كتالوج)', icon: Settings, requiresAuth: true, allowedRoles: ['admin'] },
  'admin-pending-projects': { component: AdminPendingProjects, title: 'مشاريع قيد الاعتماد', icon: Shield, requiresAuth: true, allowedRoles: ['admin'] },
  'admin-all-projects': { component: AdminAllProjects, title: 'كل المشاريع المعتمدة', icon: Shield, requiresAuth: true, allowedRoles: ['admin'] },
  'admin-project-details': { component: AdminProjectDetails, title: 'تفاصيل مشروع (أدمن)', icon: Shield, requiresAuth: true, allowedRoles: ['admin'] },
  'admin-rentals': { component: AdminRentals, title: 'عقود التأجير (إدارة)', icon: FileText, requiresAuth: true, allowedRoles: ['admin'] },
  'admin-offers': { component: AdminOffers, title: 'إدارة العروض', icon: Percent, requiresAuth: true, allowedRoles: ['admin'] },
  'admin-services': { component: AdminServices, title: 'إدارة الخدمات', icon: Settings, requiresAuth: true, allowedRoles: ['admin'] },
  'admin-technicians': { component: AdminTechnicians, title: 'إدارة الفنيين', icon: Users, requiresAuth: true, allowedRoles: ['admin'] },
  'admin-promo-codes': { component: AdminPromoCodes, title: 'إدارة رموز الخصم', icon: Tag, requiresAuth: true, allowedRoles: ['admin'] },
  // Worker (technician) routes (require worker role)
  'technician-services': { component: TechnicianServices, title: 'الخدمات', icon: Tag, requiresAuth: true, allowedRoles: ['worker'] },
  'technician-service-details': { component: TechnicianServiceDetails, title: 'تفاصيل خدمة', icon: Tag, requiresAuth: true, allowedRoles: ['worker'] },
  'technician-chat': { component: TechnicianChat, title: 'الدردشة', icon: Tag, requiresAuth: true, allowedRoles: ['worker'] },
  'technician-projects': { component: TechnicianProjects, title: 'المشاريع', icon: Tag, requiresAuth: true, allowedRoles: ['worker'] },
  'technician-project-details': { component: TechnicianProjectDetails, title: 'تفاصيل مشروع', icon: Tag, requiresAuth: true, allowedRoles: ['worker'] },
};