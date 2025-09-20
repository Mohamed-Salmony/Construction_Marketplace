import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { useTranslation } from '../hooks/useTranslation';
import { RouteContext } from '../components/Router';
import { cn } from '../components/ui/utils';
import { Mail } from 'lucide-react';
import { validateEmail } from '../lib/validators';
import { forgotPassword as apiForgotPassword } from '@/services/auth';

interface ForgotPasswordProps extends RouteContext {}

export default function ForgotPassword({ setCurrentPage, user, setUser, cartItems }: ForgotPasswordProps) {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setError(isAr ? 'صيغة البريد الإلكتروني غير صحيحة' : 'Invalid email format');
      return;
    }
    setError(null);
    try {
      const { ok } = await apiForgotPassword(email);
      if (!ok) {
        // Keep generic success to avoid user enumeration
        setSent(true);
        return;
      }
      setSent(true);
    } catch {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950" dir={isAr ? 'rtl' : 'ltr'}>
      <Header currentPage="forgot-password" setCurrentPage={setCurrentPage} user={user} setUser={setUser} cartItems={cartItems} />
      <div className="w-full px-4 md:px-6 py-10 md:py-12">
        <div className="max-w-2xl mx-auto min-h-[70vh] flex items-center justify-center">
          <div className="w-full">
            <Card className="w-full max-w-xl mx-auto shadow-2xl border border-gray-200/70 dark:border-gray-800/70 rounded-2xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-3xl font-extrabold">
                  {isAr ? 'إعادة تعيين كلمة المرور' : 'Reset your Password'}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {isAr
                    ? 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين'
                    : "Enter your email and we'll send you a reset link."}
                </p>
              </CardHeader>
              <CardContent>
                {sent ? (
                  <div className={cn('rounded-lg p-4 border', 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-900 dark:text-green-300')}>
                    {isAr
                      ? 'تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني (إن كان مسجلاً)'
                      : "If the email exists in our system, we've sent a reset link."}
                  </div>
                ) : (
                  <form className="space-y-4" onSubmit={onSubmit}>
                    {error && (
                      <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded p-2">
                        {error}
                      </div>
                    )}
                    <div className={cn('space-y-1', isAr ? 'text-right' : 'text-left')}>
                      <Label className="font-medium" htmlFor="email">{isAr ? 'البريد الإلكتروني' : 'Email'}</Label>
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
                    <Button type="submit" className="w-full rounded-xl h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-md hover:shadow-lg hover:brightness-110 hover:-translate-y-[1px] ring-1 ring-indigo-500/30 transition">
                      {isAr ? 'إرسال رابط إعادة التعيين' : 'Send Reset Link'}
                    </Button>
                    <div className="text-sm text-muted-foreground mt-2">
                      {isAr ? 'تذكرت كلمة المرور؟' : 'Remembered your password?'}{' '}
                      <button type="button" className="text-primary underline" onClick={() => setCurrentPage && setCurrentPage('login')}>
                        {isAr ? 'العودة لتسجيل الدخول' : 'Back to Login'}
                      </button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}
