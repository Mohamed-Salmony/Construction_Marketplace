import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
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
import { login as apiLogin } from '@/services/auth';
import { toastInfo } from '../utils/alerts';

interface LoginProps extends RouteContext {}

export default function Login({ setCurrentPage, setUser, returnTo, setReturnTo, user, cartItems, showLoading, hideLoading }: LoginProps) {
  const { t, locale } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const isAr = locale === 'ar';
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map role to landing page
  const roleDest = (role: 'admin' | 'vendor' | 'worker' | 'customer') => {
    if (returnTo) return returnTo;
    if (role === 'admin') return 'admin-dashboard';
    if (role === 'vendor') return 'vendor-dashboard';
    if (role === 'worker') return 'home';
    return 'home';
  };

  const friendlyAuthMessage = (status?: number, serverMsg?: string | undefined) => {
    const s = String(serverMsg || '').toLowerCase();
    if (status === 400) {
      // specific backend message: password not set
      if (s.includes('password not set')) {
        return isAr
          ? 'لا توجد كلمة مرور مضبوطة لهذا الحساب. من فضلك استخدم "نسيت كلمة المرور؟" لتعيين كلمة مرور جديدة.'
          : 'No password is set for this account. Please use "Forgot password?" to set a new password.';
      }
      return isAr ? 'طلب غير صالح. تحقق من البيانات المدخلة.' : 'Bad request. Please check your input.';
    }
    if (status === 401) {
      return isAr ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'Invalid email or password.';
    }
    if (status === 403) {
      return isAr ? 'حسابك غير مخوّل للوصول.' : 'You are not authorized to access this resource.';
    }
    if (status === 404) {
      return isAr ? 'الخدمة غير متاحة حالياً.' : 'The service is currently unavailable.';
    }
    if (status === 0 || status === undefined) {
      return isAr ? 'تعذّر الاتصال بالخادم. تأكد من اتصالك وحاول مجدداً.' : 'Could not reach the server. Check your connection and try again.';
    }
    if (status && status >= 500) {
      return isAr ? 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً.' : 'Server error occurred. Please try again later.';
    }
    // fallback to server message if present
    if (serverMsg) return serverMsg;
    return isAr ? 'فشل تسجيل الدخول' : 'Login failed';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validation
    if (!validateEmail(email)) {
      setError(isAr ? 'صيغة البريد الإلكتروني غير صحيحة' : 'Invalid email format');
      return;
    }
    if (!validatePasswordMin(password, 6)) {
      setError(isAr ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }
    setError(null);

    showLoading?.(isAr ? 'جاري تسجيل الدخول...' : 'Signing you in...', isAr ? 'يرجى الانتظار قليلاً' : 'Please wait a moment');
    const { ok, data, error, status } = await apiLogin({ email, password }) as any;
    if (!ok || !data) {
      const serverMsg = (data as any)?.message || (error && (typeof error === 'string' ? error : (error?.message || '')));
      const msg = friendlyAuthMessage(status, serverMsg);
      setError(msg);
      hideLoading?.();
      return;
    }

    const apiUser = data.user || {} as any;
    const cleanName = typeof apiUser.name === 'string' ? apiUser.name.trim() : (apiUser.name ?? '');
    const role = (apiUser.role || '').toString();
    const isVerified = Boolean((apiUser as any)?.isVerified);

    // Map backend roles to frontend router roles
    const roleMap: Record<string, 'admin' | 'vendor' | 'worker' | 'customer'> = {
      'Admin': 'admin',
      'Merchant': 'vendor',
      'Technician': 'worker',
      'Worker': 'worker',
      'Customer': 'customer',
      'admin': 'admin',
      'merchant': 'vendor',
      'technician': 'worker',
      'worker': 'worker',
      'customer': 'customer',
    };
    const uiRole = roleMap[role] || 'customer';

    // If worker (technician) and not verified, inform and send to home
    if (uiRole === 'worker' && !isVerified) {
      toastInfo(
        isAr
          ? 'حسابك قيد المراجعة من الإدارة. لا يمكنك الوصول إلى لوحة التحكم حتى تتم الموافقة. يرجى الانتظار من 24 إلى 48 ساعة.'
          : 'Your account is pending admin approval. You cannot access the dashboard until approved. Please wait 24 to 48 hours.',
        isAr
      );
    }

    setUser({ id: apiUser.id, name: cleanName, email: apiUser.email, role: uiRole, isVerified });
    try {
      localStorage.setItem('mock_current_user', JSON.stringify({ id: apiUser.id, name: cleanName, email: apiUser.email, role: uiRole, isVerified }));
    } catch {}
    setReturnTo(null);
    // If unverified vendor/worker, go to home. Otherwise use role dest
    if (((uiRole === 'vendor' && !isVerified) || (uiRole === 'worker' && !isVerified))) {
      setCurrentPage('home');
    } else {
      setCurrentPage(roleDest(uiRole));
    }
    hideLoading?.();
  };

  // Removed demo quick login helpers

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <Header currentPage="login" setCurrentPage={setCurrentPage} user={user} setUser={setUser} cartItems={cartItems} />
      <div className="w-full px-4 md:px-6 py-10 md:py-12">
        <div className="max-w-2xl mx-auto min-h-[70vh] flex items-center justify-center">
          <div className="w-full">
            <Card className="w-full max-w-xl mx-auto shadow-2xl border border-gray-200/70 dark:border-gray-800/70 rounded-2xl backdrop-blur-sm">
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-extrabold">
                  {locale === 'en' ? 'Sign in to your account' : 'تسجيل الدخول إلى حسابك'}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {locale === 'en' ? 'Welcome back. Please enter your details.' : 'مرحباً بعودتك. من فضلك أدخل بياناتك.'}
                </p>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleLogin} dir={isAr ? 'rtl' : 'ltr'}>
                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded p-2">
                      {error}
                    </div>
                  )}
                  <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                    <Label className="font-medium" htmlFor="email">{locale === 'en' ? 'Email' : 'البريد الإلكتروني'}</Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className={cn('h-12 rounded-xl text-base', isAr ? 'pr-11 text-right' : 'pl-11')}
                      />
                      <Mail className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                    </div>
                  </div>
                  <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                    <Label className="font-medium" htmlFor="password">{locale === 'en' ? 'Password' : 'كلمة المرور'}</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className={cn('h-12 rounded-xl text-base pl-11 pr-11', isAr && 'text-right')}
                      />
                      <Lock className={cn('absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground', isAr ? 'right-3' : 'left-3')} />
                      <button
                        type="button"
                        aria-label={locale === 'en' ? (showPassword ? 'Hide password' : 'Show password') : (showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور')}
                        onClick={() => setShowPassword((v) => !v)}
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
                  <div className={cn('flex items-center justify-between text-sm', isAr ? 'flex-row-reverse' : 'flex-row')}>
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" className="size-4 rounded border-gray-300 dark:border-gray-700" />
                      <span className="text-muted-foreground">{locale === 'en' ? 'Remember me' : 'تذكرني'}</span>
                    </label>
                    <button type="button" className="text-primary hover:underline" onClick={() => setCurrentPage('forgot-password')}>
                      {locale === 'en' ? 'Forgot password?' : 'هل نسيت كلمة المرور؟'}
                    </button>
                  </div>
                  <Button className="w-full rounded-xl h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-md hover:shadow-lg hover:brightness-110 hover:-translate-y-[1px] ring-1 ring-indigo-500/30 transition" size="lg" type="submit">{locale === 'en' ? 'Login' : 'تسجيل الدخول'}</Button>
                </form>
                {/* Removed demo account shortcuts and info */}
                <div className="text-sm text-muted-foreground mt-4">
                  {locale === 'en' ? "Don't have an account?" : 'ليس لديك حساب؟'}{' '}
                  <button className="text-primary underline" onClick={() => setCurrentPage('register')}>
                    {locale === 'en' ? 'Create one' : 'إنشاء حساب'}
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
