import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, User, Phone, Calendar, MapPin, Building, FileText, CreditCard, Store } from 'lucide-react';
import { cn } from '../components/ui/utils';
import { RouteContext } from '../components/Router';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { useTranslation } from '../hooks/useTranslation';
import { validateEmail, validatePasswordMin } from '../lib/validators';
type Role = 'admin' | 'customer' | 'vendor' | 'worker';
import { register as apiRegister } from '@/services/auth';
import { toastInfo } from '../utils/alerts';

interface RegisterProps extends RouteContext {}

export default function Register({ setCurrentPage, setUser, returnTo, setReturnTo, user, cartItems, showLoading, hideLoading }: RegisterProps) {
  const { t, locale } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [showVendorPassword, setShowVendorPassword] = useState<boolean>(false);
  const [showVendorConfirmPassword, setShowVendorConfirmPassword] = useState<boolean>(false);
  const isAr = locale === 'ar';
  const [role, setRole] = useState<Role>('customer');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [profession, setProfession] = useState<'plumber' | 'electrician' | 'carpenter' | 'painter' | 'gypsum' | 'marble' | ''>('');
  const [techAddress, setTechAddress] = useState('');
  const [techCity, setTechCity] = useState('');
  const [techPostal, setTechPostal] = useState('');
  const [techIdFile, setTechIdFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Vendor specific state
  const [vFirstName, setVFirstName] = useState('');
  const [vMiddleName, setVMiddleName] = useState('');
  const [vLastName, setVLastName] = useState('');
  const [vPhone2, setVPhone2] = useState('');
  const [vBuilding, setVBuilding] = useState('');
  const [vStreet, setVStreet] = useState('');
  const [vCity, setVCity] = useState('');
  const [vPostal, setVPostal] = useState('');
  const [vTax, setVTax] = useState('');
  const [vRegistryNumber, setVRegistryNumber] = useState('');
  const [vStoreName, setVStoreName] = useState('');
  const [vCommercialRegistry, setVCommercialRegistry] = useState<File | null>(null);
  const [vLicense, setVLicense] = useState<File | null>(null);
  const [vAdditionalDoc, setVAdditionalDoc] = useState<File | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validation
    // Require first/last name for all roles
    if (role !== 'vendor') {
      if (!firstName.trim() || !lastName.trim()) {
        setError(isAr ? 'الاسم الأول واسم العائلة مطلوبان' : 'First and last name are required');
        return;
      }
    }
    if (!validateEmail(email)) {
      setError(isAr ? 'صيغة البريد الإلكتروني غير صحيحة' : 'Invalid email format');
      return;
    }
    if (!validatePasswordMin(password, 6)) {
      setError(isAr ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError(isAr ? 'تأكيد كلمة المرور غير متطابق' : 'Password confirmation does not match');
      return;
    }
    if (role === 'worker') {
      if (!phone.trim()) { setError(isAr ? 'رقم الهاتف مطلوب' : 'Phone number is required'); return; }
      if (!dob.trim()) { setError(isAr ? 'تاريخ الميلاد مطلوب' : 'Date of birth is required'); return; }
      if (!profession) { setError(isAr ? 'اختر المهنة' : 'Please select a profession'); return; }
      if (!techAddress.trim()) { setError(isAr ? 'العنوان مطلوب' : 'Address is required'); return; }
      if (!techPostal.trim()) { setError(isAr ? 'الرمز البريدي مطلوب' : 'Postal code is required'); return; }
      
      // File size validation (15MB max per file)
      const maxFileSize = 15 * 1024 * 1024; // 15MB
      if (techIdFile && techIdFile.size > maxFileSize) {
        setError(isAr ? 'حجم ملف الهوية كبير جداً. الحد الأقصى 15 ميجابايت' : 'ID file is too large. Maximum 15MB');
        return;
      }
    }
    if (role === 'customer') {
      if (!phone.trim()) { setError(isAr ? 'رقم الهاتف مطلوب' : 'Phone number is required'); return; }
      if (!dob.trim()) { setError(isAr ? 'تاريخ الميلاد مطلوب' : 'Date of birth is required'); return; }
    }
    if (role === 'vendor') {
      // Basic vendor validations
      if (!phone.trim()) { setError(isAr ? 'رقم الهاتف الأساسي مطلوب' : 'Primary phone is required'); return; }
      if (!vFirstName.trim() || !vLastName.trim()) { setError(isAr ? 'الاسم الأول واسم العائلة مطلوبان' : 'First and last name are required'); return; }
      if (!vBuilding.trim() || !vStreet.trim() || !vCity.trim() || !vPostal.trim()) { setError(isAr ? 'العنوان الكامل مطلوب (رقم المبنى، الشارع، المدينة، الرمز البريدي)' : 'Full address is required (building, street, city, postal code)'); return; }
      if (!vRegistryNumber.trim()) { setError(isAr ? 'رقم السجل التجاري مطلوب' : 'Registry number is required'); return; }
      if (!vStoreName.trim()) { setError(isAr ? 'اسم المتجر مطلوب' : 'Store name is required'); return; }
      
      // File size validation (15MB max per file)
      const maxFileSize = 15 * 1024 * 1024; // 15MB
      const filesToCheck = [
        { file: vCommercialRegistry, name: isAr ? 'السجل التجاري' : 'Commercial Registry' },
        { file: vLicense, name: isAr ? 'الرخصة' : 'License' },
        { file: vAdditionalDoc, name: isAr ? 'المستند الإضافي' : 'Additional Document' }
      ];
      
      for (const { file, name } of filesToCheck) {
        if (file && file.size > maxFileSize) {
          setError(isAr ? `حجم ملف ${name} كبير جداً. الحد الأقصى 15 ميجابايت` : `${name} file is too large. Maximum 15MB`);
          return;
        }
      }
    }

    const effectiveName = role === 'vendor' ? ((firstName + ' ' + lastName).trim() || (email.includes('@') ? email.split('@')[0] : 'Merchant')) : (firstName + ' ' + lastName).trim();
    const base = { name: effectiveName, email: email.trim(), password, role } as any;
    // Backend requires ConfirmPassword and separate FirstName/LastName
    base.confirmPassword = confirmPassword;
    if (role === 'worker') {
      base.phoneNumber = phone.trim();
      base.dob = dob.trim();
      base.profession = profession;
      base.firstName = firstName.trim();
      base.middleName = middleName.trim() || undefined;
      base.lastName = lastName.trim();
      base.address = techAddress.trim();
      if (techCity.trim()) base.city = techCity.trim();
      base.postalCode = techPostal.trim();
      if (techIdFile) base.documentFile = techIdFile;
    }
    if (role === 'vendor') {
      base.phoneNumber = phone.trim();
      base.phoneSecondary = vPhone2.trim() || undefined;
      base.firstName = vFirstName.trim();
      base.middleName = vMiddleName.trim() || undefined;
      base.lastName = vLastName.trim();
      base.buildingNumber = vBuilding.trim();
      base.streetName = vStreet.trim();
      base.cityName = vCity.trim();
      base.postalCode = vPostal.trim();
      base.taxNumber = vTax.trim() || undefined;
      base.registryNumber = vRegistryNumber.trim();
      base.storeName = vStoreName.trim();
      if (dob.trim()) base.dateOfBirth = dob.trim();
      if (vCommercialRegistry) base.commercialRegistryFile = vCommercialRegistry;
      if (vLicense) base.licenseFile = vLicense;
      if (vAdditionalDoc) base.additionalDocumentFile = vAdditionalDoc;
    }
    if (role !== 'vendor' && role !== 'worker') {
      // Customer or others: use separate fields
      base.firstName = firstName.trim() || 'User';
      base.middleName = middleName.trim() || undefined;
      base.lastName = lastName.trim() || 'User';
      if (role === 'customer') {
        base.phoneNumber = phone.trim();
        base.dateOfBirth = dob.trim();
      }
    }
    setError(null);

    showLoading?.(isAr ? 'جاري إنشاء الحساب...' : 'Creating your account...', isAr ? 'يرجى الانتظار قليلاً' : 'Please wait a moment');
    const { ok, data, error, status } = await apiRegister(base) as any;
    if (!ok || !data) {
      const friendlyRegisterMessage = (status?: number, payload?: any) => {
        const serverMsg = (payload as any)?.message || (typeof error === 'string' ? error : (error?.message || ''));
        // express-validator style errors
        const validations: Array<{ msg?: string; path?: string; param?: string }> = (payload as any)?.errors || [];
        const mapValidation = (arr: typeof validations) => {
          if (!Array.isArray(arr) || arr.length === 0) return '';
          const msgs = arr.map((e) => e.msg || e.param || e.path).filter(Boolean) as string[];
          return msgs.join(' | ');
        };
        if (status === 409) {
          return isAr ? 'هذا البريد الإلكتروني مسجّل بالفعل.' : 'This email is already registered.';
        }
        if (status === 413) {
          return isAr ? 'حجم الملف كبير جداً. من فضلك قلل الحجم أو اختر ملفات أصغر.' : 'Uploaded file is too large. Please reduce size or choose smaller files.';
        }
        if (status === 400) {
          const v = mapValidation(validations);
          if (v) return v;
          // common fields
          if (serverMsg) return serverMsg;
          return isAr ? 'بيانات غير صالحة. تحقق من الحقول المطلوبة.' : 'Invalid data. Please check required fields.';
        }
        if (status === 422) {
          const v = mapValidation(validations);
          if (v) return v;
          return isAr ? 'فشل التحقق من صحة البيانات.' : 'Validation failed.';
        }
        if (status === 408 || (status === 0 && serverMsg && serverMsg.includes('timeout'))) {
          return isAr ? 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.' : 'Request timeout. Please try again.';
        }
        if (status === 0 || status === undefined) {
          return isAr ? 'تعذّر الاتصال بالخادم. تأكد من اتصالك وحاول مجدداً.' : 'Could not reach the server. Check your connection and try again.';
        }
        if (status && status >= 500) {
          return isAr ? 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً.' : 'Server error occurred. Please try again later.';
        }
        return serverMsg || (isAr ? 'فشل إنشاء الحساب' : 'Registration failed');
      };

      const msg = friendlyRegisterMessage(status, data);
      setError(msg);
      hideLoading?.();
      return;
    }

    const apiUser = (data as any)?.user || {} as any;
    const roleStr = (apiUser.role || role || 'customer').toString();
    // Normalize to router roles
    const roleMap: Record<string, 'customer'|'vendor'|'worker'|'admin'> = {
      'Customer':'customer','Merchant':'vendor','Technician':'worker','Worker':'worker','Admin':'admin',
      'customer':'customer','vendor':'vendor','technician':'worker','worker':'worker','admin':'admin'
    };
    const uiRole = roleMap[roleStr] || 'customer';
    const uiRoleStr = String(uiRole);

    // For vendor: no pre-login message; allow normal login/home flow. Pending message will show when accessing dashboard.

    if (uiRoleStr === 'worker') {
      toastInfo(
        isAr ? 'تم استلام طلب تسجيلك كعامل وهو قيد المراجعة من الإدارة. لا يمكنك الوصول إلى لوحة التحكم حتى تتم الموافقة. يرجى الانتظار من 24 إلى 48 ساعة.' : 'Your worker registration is pending admin approval. You cannot access the dashboard until approved. Please wait 24 to 48 hours.',
        isAr
      );
      setReturnTo(null);
      setCurrentPage('login');
      hideLoading?.();
      return;
    }

    // Auto-login non-vendor if backend returned user info
    if (apiUser) {
      const payload: any = { id: apiUser.id, name: apiUser.name, email: apiUser.email, role: uiRole };
      if (uiRole === 'worker') {
        payload.phone = (apiUser as any).phone || phone;
        payload.dob = (apiUser as any).dob || dob;
        payload.birthdate = (apiUser as any).dob || dob;
        payload.profession = (apiUser as any).profession || profession;
        payload.technicianType = (apiUser as any).profession || profession;
      }
      setUser(payload);
      try { localStorage.setItem('mock_current_user', JSON.stringify(payload)); } catch {}
    }
    const dest = returnTo || 'home';
    setReturnTo(null);
    setCurrentPage(dest);
    hideLoading?.();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <Header currentPage="register" setCurrentPage={setCurrentPage} user={user} setUser={setUser} cartItems={cartItems} />
      <div className="w-full px-4 md:px-6 py-10 md:py-12">
        <div className="max-w-2xl mx-auto min-h-[70vh] flex items-center justify-center">
          <div className="w-full">
            <Card className="w-full max-w-xl mx-auto shadow-2xl border border-gray-200/70 dark:border-gray-800/70 rounded-2xl backdrop-blur-sm">
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-extrabold">{locale === 'en' ? 'Create your account' : 'إنشاء حساب جديد'}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {locale === 'en' ? 'Fill in your details to get started.' : 'أدخل بياناتك للبدء.'}
                </p>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleRegister} dir={isAr ? 'rtl' : 'ltr'}>
                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded p-2">
                      {error}
                    </div>
                  )}
                  
                  {/* Role selection - Fixed at the top */}
                  <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                    <Label className="font-medium" htmlFor="role">{isAr ? 'الدور' : 'Role'}</Label>
                    <select
                      id="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value as Role)}
                      className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base"
                    >
                      <option value="customer">{isAr ? 'مستخدم' : 'Customer'}</option>
                      <option value="vendor">{isAr ? 'تاجر' : 'Vendor'}</option>
                      <option value="worker">{isAr ? 'عامل' : 'Worker'}</option>
                    </select>
                  </div>
                  {/* Email and passwords at the bottom for non-vendor only */}
                  {role !== 'vendor' && (
                  <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                    <Label className="font-medium" htmlFor="email">{locale === 'en' ? 'Email' : 'البريد الإلكتروني'}</Label>
                    <div className="relative">
                        <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="off"
                        data-lpignore="true"
                        data-form-type="other"
                        className={cn('h-12 rounded-xl text-base', isAr ? 'pr-11 text-right' : 'pl-11')}
                      />
                      <Mail className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                    </div>
                  </div>
                  )}
                  {role !== 'vendor' && (
                  <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                    <Label className="font-medium" htmlFor="password">{locale === 'en' ? 'Password' : 'كلمة المرور'}</Label>
                    <div className="relative">
                        <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        data-lpignore="true"
                        data-form-type="other"
                        className={cn('h-12 rounded-xl text-base pl-11 pr-11', isAr && 'text-right')}
                      />
                      <Lock className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                      <button
                        type="button"
                        aria-label={locale === 'en' ? (showPassword ? 'Hide password' : 'Show password') : (showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور')}
                        onClick={() => setShowPassword((v: boolean) => !v)}
                        className={cn('absolute top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted/50 transition', isAr ? 'left-2' : 'right-2')}
                      >
                        {showPassword ? (
                          <EyeOff className="size-4 text-muted-foreground" />
                        ) : (
                          <Eye className="size-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>
                  )}
                  {role !== 'vendor' && (
                  <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                    <Label className="font-medium" htmlFor="confirmPassword">{isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        data-lpignore="true"
                        data-form-type="other"
                        className={cn('h-12 rounded-xl text-base pl-11 pr-11', isAr && 'text-right')}
                      />
                      <Lock className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                      <button
                        type="button"
                        aria-label={locale === 'en' ? (showConfirmPassword ? 'Hide password' : 'Show password') : (showConfirmPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور')}
                        onClick={() => setShowConfirmPassword((v: boolean) => !v)}
                        className={cn('absolute top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted/50 transition', isAr ? 'left-2' : 'right-2')}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="size-4 text-muted-foreground" />
                        ) : (
                          <Eye className="size-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>
                  )}
                  {role !== 'vendor' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                        <Label className="font-medium" htmlFor="firstName">{isAr ? 'الاسم الأول' : 'First Name'}</Label>
                        <div className="relative">
                          <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoComplete="off" data-lpignore="true" className={cn('h-12 rounded-xl text-base', isAr ? 'pr-11 text-right' : 'pl-11')} />
                          <User className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                        </div>
                      </div>
                      <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                        <Label className="font-medium" htmlFor="middleName">{isAr ? 'الاسم الأوسط (اختياري)' : 'Middle Name (optional)'}</Label>
                        <div className="relative">
                          <Input id="middleName" value={middleName} onChange={(e) => setMiddleName(e.target.value)} autoComplete="off" data-lpignore="true" className={cn('h-12 rounded-xl text-base', isAr ? 'pr-11 text-right' : 'pl-11')} />
                          <User className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                        </div>
                      </div>
                      <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                        <Label className="font-medium" htmlFor="lastName">{isAr ? 'اسم العائلة' : 'Last Name'}</Label>
                        <div className="relative">
                          <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required autoComplete="off" data-lpignore="true" className={cn('h-12 rounded-xl text-base', isAr ? 'pr-11 text-right' : 'pl-11')} />
                          <User className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Customer phone & DOB */}
                  {role === 'customer' && (
                    <>
                      <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                        <Label className="font-medium" htmlFor="custPhone">{isAr ? 'رقم الهاتف' : 'Phone Number'}</Label>
                        <div className="relative">
                          <Input id="custPhone" value={phone} onChange={(e) => setPhone(e.target.value)} required className={cn('h-12 rounded-xl text-base', isAr ? 'pr-11 text-right' : 'pl-11')} />
                          <Phone className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                        </div>
                      </div>
                      <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                        <Label className="font-medium" htmlFor="custDob">{isAr ? 'تاريخ الميلاد' : 'Date of Birth'}</Label>
                        <Input id="custDob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required className={cn('h-12 rounded-xl text-base', isAr ? 'text-right' : '')} />
                      </div>
                    </>
                  )}
                  {role === 'vendor' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                          <Label className="font-medium" htmlFor="firstName">{isAr ? 'الاسم الأول' : 'First Name'}</Label>
                          <div className="relative">
                            <Input id="firstName" value={vFirstName} onChange={(e)=> setVFirstName(e.target.value)} required autoComplete="off" data-lpignore="true" className={cn('h-12 rounded-xl text-base', isAr ? 'pr-11 text-right' : 'pl-11')} />
                            <User className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                          </div>
                        </div>
                        <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                          <Label className="font-medium" htmlFor="middleName">{isAr ? 'الاسم الأوسط' : 'Middle Name'}</Label>
                          <div className="relative">
                            <Input id="middleName" value={vMiddleName} onChange={(e)=> setVMiddleName(e.target.value)} autoComplete="off" data-lpignore="true" className={cn('h-12 rounded-xl text-base', isAr ? 'pr-11 text-right' : 'pl-11')} />
                            <User className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                          </div>
                        </div>
                        <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                          <Label className="font-medium" htmlFor="lastName">{isAr ? 'اسم العائلة' : 'Last Name'}</Label>
                          <div className="relative">
                            <Input id="lastName" value={vLastName} onChange={(e)=> setVLastName(e.target.value)} required autoComplete="off" data-lpignore="true" className={cn('h-12 rounded-xl text-base', isAr ? 'pr-11 text-right' : 'pl-11')} />
                            <User className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                          <Label className="font-medium" htmlFor="emailTop">{locale === 'en' ? 'Email' : 'البريد الإلكتروني'}</Label>
                          <div className="relative">
                            <Input id="emailTop" type="email" value={email} onChange={(e)=> setEmail(e.target.value)} required autoComplete="off" data-lpignore="true" data-form-type="other" className={cn('h-12 rounded-xl text-base', isAr ? 'pr-11 text-right' : 'pl-11')} />
                            <Mail className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                          </div>
                        </div>
                        <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                          <Label className="font-medium" htmlFor="passwordTop">{locale === 'en' ? 'Password' : 'كلمة المرور'}</Label>
                          <div className="relative">
                            <Input id="passwordTop" type={showVendorPassword ? 'text' : 'password'} value={password} onChange={(e)=> setPassword(e.target.value)} required autoComplete="new-password" data-lpignore="true" data-form-type="other" className={cn('h-12 rounded-xl text-base pl-11 pr-11', isAr && 'text-right')} />
                            <Lock className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                            <button
                              type="button"
                              aria-label={locale === 'en' ? (showVendorPassword ? 'Hide password' : 'Show password') : (showVendorPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور')}
                              onClick={() => setShowVendorPassword((v: boolean) => !v)}
                              className={cn('absolute top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted/50 transition', isAr ? 'left-2' : 'right-2')}
                            >
                              {showVendorPassword ? (
                                <EyeOff className="size-4 text-muted-foreground" />
                              ) : (
                                <Eye className="size-4 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                          <Label className="font-medium" htmlFor="confirmTop">{isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}</Label>
                          <div className="relative">
                            <Input id="confirmTop" type={showVendorConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e)=> setConfirmPassword(e.target.value)} required autoComplete="new-password" data-lpignore="true" data-form-type="other" className={cn('h-12 rounded-xl text-base pl-11 pr-11', isAr && 'text-right')} />
                            <Lock className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                            <button
                              type="button"
                              aria-label={locale === 'en' ? (showVendorConfirmPassword ? 'Hide password' : 'Show password') : (showVendorConfirmPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور')}
                              onClick={() => setShowVendorConfirmPassword((v: boolean) => !v)}
                              className={cn('absolute top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted/50 transition', isAr ? 'left-2' : 'right-2')}
                            >
                              {showVendorConfirmPassword ? (
                                <EyeOff className="size-4 text-muted-foreground" />
                              ) : (
                                <Eye className="size-4 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                          <Label className="font-medium" htmlFor="phone1">{isAr ? 'رقم الهاتف الأساسي' : 'Primary Phone'}</Label>
                          <div className="relative">
                            <Input id="phone1" value={phone} onChange={(e)=> setPhone(e.target.value)} required autoComplete="off" data-lpignore="true" className={cn('h-12 rounded-xl text-base', isAr ? 'pr-11 text-right' : 'pl-11')} />
                            <Phone className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                          </div>
                        </div>
                        <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                          <Label className="font-medium" htmlFor="phone2">{isAr ? 'رقم هاتف إضافي (اختياري)' : 'Secondary Phone (optional)'}</Label>
                          <div className="relative">
                            <Input id="phone2" value={vPhone2} onChange={(e)=> setVPhone2(e.target.value)} autoComplete="off" data-lpignore="true" className={cn('h-12 rounded-xl text-base', isAr ? 'pr-11 text-right' : 'pl-11')} />
                            <Phone className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                          <Label className="font-medium" htmlFor="building">{isAr ? 'رقم المبنى' : 'Building Number'}</Label>
                          <div className="relative">
                            <Input id="building" value={vBuilding} onChange={(e)=> setVBuilding(e.target.value)} autoComplete="off" data-lpignore="true" className={cn('h-12 rounded-xl text-base', isAr ? 'pr-11 text-right' : 'pl-11')} />
                            <Building className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                          </div>
                        </div>
                        <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                          <Label className="font-medium" htmlFor="street">{isAr ? 'اسم الشارع' : 'Street Name'}</Label>
                          <div className="relative">
                            <Input id="street" value={vStreet} onChange={(e)=> setVStreet(e.target.value)} autoComplete="off" data-lpignore="true" className={cn('h-12 rounded-xl text-base', isAr ? 'pr-11 text-right' : 'pl-11')} />
                            <MapPin className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                          </div>
                        </div>
                        <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                          <Label className="font-medium" htmlFor="city">{isAr ? 'اسم المدينة' : 'City'}</Label>
                          <div className="relative">
                            <Input id="city" value={vCity} onChange={(e)=> setVCity(e.target.value)} autoComplete="off" data-lpignore="true" className={cn('h-12 rounded-xl text-base', isAr ? 'pr-11 text-right' : 'pl-11')} />
                            <MapPin className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                          </div>
                        </div>
                        <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                          <Label className="font-medium" htmlFor="postal">{isAr ? 'الرمز البريدي' : 'Postal Code'}</Label>
                          <div className="relative">
                            <Input id="postal" value={vPostal} onChange={(e)=> setVPostal(e.target.value)} autoComplete="off" data-lpignore="true" className={cn('h-12 rounded-xl text-base', isAr ? 'pr-11 text-right' : 'pl-11')} />
                            <FileText className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                          <Label className="font-medium" htmlFor="registryNumber">{isAr ? 'رقم السجل التجاري' : 'Commercial Registry Number'}</Label>
                          <div className="relative">
                            <Input 
                              id="registryNumber" 
                              value={vRegistryNumber} 
                              onChange={(e)=> setVRegistryNumber(e.target.value)} 
                              required
                              autoComplete="off"
                              data-lpignore="true"
                              className={cn('h-12 rounded-xl text-base', isAr ? 'pr-11 text-right' : 'pl-11')}
                            />
                            <FileText className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                          </div>
                        </div>
                        <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                          <Label className="font-medium" htmlFor="storeName">{isAr ? 'اسم المتجر' : 'Store Name'}</Label>
                          <div className="relative">
                            <Input 
                              id="storeName" 
                              value={vStoreName} 
                              onChange={(e)=> setVStoreName(e.target.value)} 
                              required
                              autoComplete="off"
                              data-lpignore="true"
                              className={cn('h-12 rounded-xl text-base', isAr ? 'pr-11 text-right' : 'pl-11')}
                            />
                            <Store className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                          </div>
                        </div>
                        <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                          <Label className="font-medium" htmlFor="vDob">{isAr ? 'تاريخ الميلاد' : 'Date of Birth'}</Label>
                          <Input 
                            id="vDob"
                            type="date" 
                            value={dob} 
                            onChange={(e)=> setDob(e.target.value)} 
                            autoComplete="off"
                            data-lpignore="true"
                            className={cn('h-12 rounded-xl text-base', isAr ? 'text-right' : '')}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                          <Label className="font-medium" htmlFor="tax">{isAr ? 'الرقم الضريبي (اختياري)' : 'Tax Number (optional)'}</Label>
                          <div className="relative">
                            <Input 
                              id="tax" 
                              value={vTax} 
                              onChange={(e)=> setVTax(e.target.value)} 
                              autoComplete="off"
                              data-lpignore="true"
                              className={cn('h-12 rounded-xl text-base', isAr ? 'pr-11 text-right' : 'pl-11')}
                            />
                            <CreditCard className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                          <Label className="font-medium" htmlFor="commercialRegistry">{isAr ? 'السجل التجاري (صورة، PDF، Word - حتى 15 ميجا)' : 'Commercial Registry (Image, PDF, Word - Max 15MB)'}</Label>
                          <Input 
                            id="commercialRegistry" 
                            type="file" 
                            accept="image/*,.pdf,.doc,.docx,.txt" 
                            onChange={(e)=> setVCommercialRegistry(e.target.files?.[0] || null)} 
                            className="h-12 rounded-xl text-base" 
                          />
                        </div>
                        <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                          <Label className="font-medium" htmlFor="license">{isAr ? 'الرخصة (صورة، PDF، Word - حتى 15 ميجا)' : 'License (Image, PDF, Word - Max 15MB)'}</Label>
                          <Input 
                            id="license" 
                            type="file" 
                            accept="image/*,.pdf,.doc,.docx,.txt" 
                            onChange={(e)=> setVLicense(e.target.files?.[0] || null)} 
                            className="h-12 rounded-xl text-base" 
                          />
                        </div>
                        <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                          <Label className="font-medium" htmlFor="additionalDoc">{isAr ? 'مستند إضافي (صورة، PDF، Word - حتى 15 ميجا) (اختياري)' : 'Additional Document (Image, PDF, Word - Max 15MB) (optional)'}</Label>
                          <Input 
                            id="additionalDoc" 
                            type="file" 
                            accept="image/*,.pdf,.doc,.docx,.txt" 
                            onChange={(e)=> setVAdditionalDoc(e.target.files?.[0] || null)} 
                            className="h-12 rounded-xl text-base" 
                          />
                        </div>
                      </div>
                    </>
                  )}
                  {role === 'worker' && (
                    <>
                      <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                        <Label className="font-medium" htmlFor="phone">{isAr ? 'رقم الهاتف' : 'Phone Number'}</Label>
                        <div className="relative">
                          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required className={cn('h-12 rounded-xl text-base', isAr ? 'pr-11 text-right' : 'pl-11')} />
                          <Phone className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                        </div>
                      </div>
                      <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                        <Label className="font-medium" htmlFor="dob">{isAr ? 'تاريخ الميلاد' : 'Date of Birth'}</Label>
                        <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required className={cn('h-12 rounded-xl text-base', isAr ? 'text-right' : '')} />
                      </div>
                      <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                        <Label className="font-medium" htmlFor="taddress">{isAr ? 'العنوان' : 'Address'}</Label>
                        <div className="relative">
                          <Input id="taddress" value={techAddress} onChange={(e) => setTechAddress(e.target.value)} required className={cn('h-12 rounded-xl text-base', isAr ? 'pr-11 text-right' : 'pl-11')} />
                          <MapPin className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                          <Label className="font-medium" htmlFor="tcity">{isAr ? 'المدينة' : 'City'}</Label>
                          <div className="relative">
                            <Input id="tcity" value={techCity} onChange={(e) => setTechCity(e.target.value)} className={cn('h-12 rounded-xl text-base', isAr ? 'pr-11 text-right' : 'pl-11')} />
                            <MapPin className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                          </div>
                        </div>
                        <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                          <Label className="font-medium" htmlFor="tpostal">{isAr ? 'الرمز البريدي' : 'Postal Code'}</Label>
                          <div className="relative">
                            <Input id="tpostal" value={techPostal} onChange={(e) => setTechPostal(e.target.value)} required className={cn('h-12 rounded-xl text-base', isAr ? 'pr-11 text-right' : 'pl-11')} />
                            <FileText className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                          </div>
                        </div>
                      </div>
                      <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                        <Label className="font-medium" htmlFor="tidfile">{isAr ? 'هوية/إقامة (صورة، PDF، Word - حتى 15 ميجا)' : 'ID/Residence (Image, PDF, Word - Max 15MB)'}</Label>
                        <Input id="tidfile" type="file" accept="image/*,.pdf,.doc,.docx" onChange={(e) => setTechIdFile(e.target.files?.[0] || null)} className="h-12 rounded-xl text-base" />
                      </div>
                      <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                        <Label className="font-medium" htmlFor="profession">{isAr ? 'المهنة' : 'Profession'}</Label>
                        <select
                          id="profession"
                          value={profession}
                          onChange={(e) => setProfession(e.target.value as any)}
                          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base"
                        >
                          <option value="">{isAr ? 'اختر المهنة' : 'Select profession'}</option>
                          <option value="plumber">{isAr ? 'سباك' : 'Plumber'}</option>
                          <option value="electrician">{isAr ? 'كهربائي' : 'Electrician'}</option>
                          <option value="carpenter">{isAr ? 'نجار' : 'Carpenter'}</option>
                          <option value="painter">{isAr ? 'دهان' : 'Painter'}</option>
                          <option value="gypsum">{isAr ? 'فني جبس' : 'Gypsum Installer'}</option>
                          <option value="marble">{isAr ? 'فني رخام' : 'Marble Installer'}</option>
                        </select>
                      </div>
                    </>
                  )}
                  <Button className="w-full rounded-xl h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-md hover:shadow-lg hover:brightness-110 hover:-translate-y-[1px] ring-1 ring-indigo-500/30 transition" size="lg" type="submit">{locale === 'en' ? 'Register' : 'تسجيل'}</Button>
                </form>
                <div className="my-4 border-t border-gray-200 dark:border-gray-800" />
                <div className="text-sm text-muted-foreground">
                  {locale === 'en' ? 'Already have an account?' : 'لديك حساب بالفعل؟'}{' '}
                  <button className="text-primary underline" onClick={() => setCurrentPage('login')}>
                    {locale === 'en' ? 'Login' : 'تسجيل الدخول'}
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}
