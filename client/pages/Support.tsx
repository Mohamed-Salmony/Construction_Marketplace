import { useEffect, useMemo, useRef, useState } from 'react';
import type { RouteContext } from '../components/routerTypes';
import { useTranslation } from '../hooks/useTranslation';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Phone, Send, MessageSquare, Circle, User as UserIcon } from 'lucide-react';

type Msg = { id: string; from: 'bot' | 'user'; text: string; ts: number };

export default function Support({ setCurrentPage }: Partial<RouteContext>) {
  const { locale } = useTranslation();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [pending, setPending] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const WHATSAPP = '0555555555'; // TODO: replace with your official WhatsApp number

  const faqs = useMemo(() => [
    {
      keys: ['الدفع', 'طرق الدفع', 'pay', 'payment', 'methods'],
      ar: 'نقبل الدفع عبر مدى، فيزا، ماستركارد، وآبل باي. للطلبات الكبيرة يمكن ترتيب تحويل بنكي.',
      en: 'We accept Mada, Visa, MasterCard, and Apple Pay. For large orders, bank transfer can be arranged.'
    },
    {
      keys: ['شحن', 'توصيل', 'shipping', 'delivery'],
      ar: 'نوفر شحن داخل المملكة. المدة عادة 2-5 أيام عمل حسب المدينة.',
      en: 'We ship within KSA. Delivery typically takes 2-5 business days depending on the city.'
    },
    {
      keys: ['ضمان', 'رجوع', 'إرجاع', 'return', 'warranty'],
      ar: 'الضمان يشمل عيوب التصنيع. سياسة الإرجاع خلال 7 أيام من الاستلام للحالات المؤهلة.',
      en: 'Warranty covers manufacturing defects. Returns within 7 days of delivery for eligible cases.'
    },
    {
      keys: ['مشروع', 'سعر', 'تسعير', 'project', 'quote', 'price'],
      ar: 'للحصول على تسعير دقيق، استخدم صفحة المشاريع وأضف المقاسات والملحقات، أو أرسل لنا تفاصيلك.',
      en: 'For accurate pricing, use the Projects builder to add sizes and accessories, or send us your details.'
    },
    {
      keys: ['تواصل', 'واتساب', 'whatsapp', 'contact'],
      ar: `يمكنك التواصل المباشر عبر واتساب على الرقم ${WHATSAPP}.`,
      en: `You can reach us on WhatsApp at ${WHATSAPP}.`
    },
    {
      keys: ['تكلفة الشحن', 'سعر الشحن', 'shipping cost', 'delivery fees'],
      ar: 'تكلفة الشحن تعتمد على الوزن والمدينة. تظهر الرسوم التقديرية في صفحة السلة قبل الدفع.',
      en: 'Shipping cost depends on weight and destination. An estimate appears in the cart before checkout.'
    },
    {
      keys: ['تركيب', 'installation', 'install'],
      ar: 'نوفر خدمة التركيب في مدن محددة. تواصل معنا لتأكيد التوفر والتسعير.',
      en: 'We offer installation in selected cities. Contact us to confirm availability and pricing.'
    },
    {
      keys: ['الخامات', 'مواد', 'material', 'materials'],
      ar: 'نوفر عدة خامات بحسب المنتج (مثل ألمنيوم، ستانلس، زجاج). التفاصيل تظهر في صفحة البناء وفي مواصفات المنتج.',
      en: 'Available materials vary by product (e.g., aluminum, stainless, glass). See the builder and product specs.'
    },
    {
      keys: ['مقاس', 'حجم', 'size', 'dimensions', 'limits'],
      ar: 'أدخل المقاسات بالسنتيمتر في صفحة المشاريع. قد تنطبق حدود قصوى على الأبعاد الكبيرة.',
      en: 'Enter dimensions in cm in the Projects page. Maximum limits may apply to very large sizes.'
    },
    {
      keys: ['حالة الطلب', 'تتبع', 'order status', 'track'],
      ar: 'يمكنك تتبع الطلب من صفحة "تتبع الطلب" باستخدام رقم الطلب.',
      en: 'Track your order from the "Track Order" page using your order number.'
    },
    {
      keys: ['إلغاء', 'تعديل', 'cancel', 'modify', 'change order'],
      ar: 'يمكن إلغاء أو تعديل الطلب قبل المعالجة. الرجاء التواصل سريعًا بخدمة العملاء.',
      en: 'Orders can be cancelled or modified before processing. Please contact support promptly.'
    },
    {
      keys: ['دوام', 'مواعيد العمل', 'working hours', 'hours'],
      ar: 'ساعات العمل: الأحد-الخميس 8ص-10م، الجمعة-السبت 2م-10م.',
      en: 'Working hours: Sun-Thu 8am-10pm, Fri-Sat 2pm-10pm.'
    },
    {
      keys: ['كيفية الإرجاع', 'طريقة الإرجاع', 'return steps', 'how to return'],
      ar: 'لإرجاع منتج: تواصل معنا خلال 7 أيام، أرفق رقم الطلب وصور الحالة لنساعدك بالإجراءات.',
      en: 'To return an item: contact us within 7 days with your order number and photos; we will guide the process.'
    },
    {
      keys: ['ملحقات', 'توافق', 'accessories', 'compatibility'],
      ar: 'يمكن إضافة الملحقات من صفحة البناء. التوافق يعتمد على نوع المنتج والمقاس.',
      en: 'Accessories can be added in the builder. Compatibility depends on product type and size.'
    },
    {
      keys: ['خصم', 'كميات', 'جملة', 'bulk', 'discount'],
      ar: 'لطلبات الجملة والكميات الكبيرة نوفر خصومات خاصة. راسلنا بالتفاصيل للحصول على عرض.',
      en: 'We provide special discounts for bulk orders. Send us your details for a custom quote.'
    }
  ], [WHATSAPP]);

  const welcome = locale==='ar'
    ? 'مرحباً! أنا مساعد الدعم. اسألني عن الدفع، الشحن، الضمان، أو المشاريع.'
    : "Hi! I'm the support assistant. Ask me about payments, shipping, warranty, or projects.";

  const fallback = locale==='ar'
    ? `لم أتمكن من إيجاد إجابة دقيقة. تواصل معنا عبر واتساب: ${WHATSAPP}`
    : `I couldn't find an exact answer. You can contact us on WhatsApp at ${WHATSAPP}.`;

  useEffect(() => {
    setMessages([
      { id: 'm1', from: 'bot', text: welcome, ts: Date.now() }
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const findAnswer = (q: string) => {
    const low = q.toLowerCase();
    const hit = faqs.find(f => f.keys.some(k => low.includes(k.toLowerCase())));
    if (hit) return locale==='ar' ? hit.ar : hit.en;
    return fallback;
  };

  const send = () => {
    const trimmed = pending.trim();
    if (!trimmed) return;
    const userMsg: Msg = { id: `u-${Date.now()}`, from: 'user', text: trimmed, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setPending('');
    setIsTyping(true);
    setTimeout(() => {
      const reply = findAnswer(trimmed);
      setMessages(prev => [...prev, { id: `b-${Date.now()}`, from: 'bot', text: reply, ts: Date.now() }]);
      setIsTyping(false);
    }, 300);
  };

  const quickQuestions = useMemo(() => (
    locale==='ar'
      ? [
          'ما هي طرق الدفع؟',
          'كم مدة الشحن؟',
          'هل يوجد ضمان؟',
          'كيف أسعر مشروع؟',
          'كم تكلفة الشحن؟',
          'هل توفرون تركيب؟',
          'ما هي الخامات المتاحة؟',
          'هل هناك حدود للمقاسات؟',
          'كيف أتتبع طلبي؟',
          'هل أقدر ألغى أو أعدل الطلب؟'
        ]
      : [
          'What payment methods?',
          'How long is shipping?',
          'Any warranty?',
          'How to price a project?',
          'What is shipping cost?',
          'Do you offer installation?',
          'What materials are available?',
          'Any size limits?',
          'How to track my order?',
          'Can I cancel or modify order?'
        ]
  ), [locale]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-10 max-w-3xl flex-1">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">{locale==='ar' ? 'المساعدة والدعم' : 'Help & Support'}</h1>
          <p className="text-muted-foreground mt-1">{locale==='ar' ? 'نسعد بخدمتك والإجابة على استفساراتك' : "We're happy to help and answer your questions."}</p>
        </div>

        <Card className="rounded-2xl shadow-xl border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
          <CardContent className="p-0">
            {/* Header */}
            <div className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-slate-900/60 border-b px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold">{locale==='ar' ? 'مساعد الموقع' : 'Site Assistant'}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Circle className="w-2 h-2 fill-green-500 text-green-500" /> {locale==='ar' ? 'متصل الآن' : 'Online'}
                  </div>
                </div>
              </div>
              <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                WhatsApp
              </a>
            </div>

            {/* Messages */}
            <div ref={listRef} className="h-[520px] overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-background to-muted/40">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.from==='user' ? (locale==='ar' ? 'justify-start' : 'justify-end') : (locale==='ar' ? 'justify-end' : 'justify-start')}`}>
                  <div className={`flex items-end gap-2 max-w-[85%]`}>
                    {/* Bot avatar */}
                    {m.from==='bot' && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                    )}

                    {/* Message bubble */}
                    <div className={`relative group ${m.from==='user' ? '' : ''}`}>
                      <div className={`rounded-2xl px-3.5 py-2.5 text-[0.95rem] leading-relaxed shadow font-medium ${m.from==='user' 
                          ? 'bg-slate-800 text-white ring-1 ring-slate-900/20 dark:bg-slate-100 dark:text-slate-900 dark:ring-slate-300'
                          : 'bg-white dark:bg-slate-900 border'} ${locale==='ar' ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
                        {m.text}
                      </div>
                      {/* Tail for user bubble (light) */}
                      {m.from==='user' && (
                        <>
                          <div className={`dark:hidden ${locale==='ar' ? 'absolute left-[-6px]' : 'absolute right-[-6px]'} bottom-2 w-0 h-0 border-t-[8px] border-b-[8px] ${locale==='ar' ? 'border-l-[8px] border-l-slate-800' : 'border-r-[8px] border-r-slate-800'} border-t-transparent border-b-transparent`} />
                          <div className={`hidden dark:block ${locale==='ar' ? 'absolute left-[-6px]' : 'absolute right-[-6px]'} bottom-2 w-0 h-0 border-t-[8px] border-b-[8px] ${locale==='ar' ? 'border-l-[8px] border-l-slate-100' : 'border-r-[8px] border-r-slate-100'} border-t-transparent border-b-transparent`} />
                        </>
                      )}
                    </div>

                    {/* User avatar */}
                    {m.from==='user' && (
                      <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className={`flex ${locale==='ar' ? 'justify-end' : 'justify-start'}`}>
                  <div className="rounded-2xl px-3 py-2 text-sm bg-white dark:bg-slate-900 border shadow flex items-center gap-2">
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.2s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></span>
                    </span>
                    <span className="text-muted-foreground">{locale==='ar' ? 'يكتب...' : 'Typing...'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="p-4 border-t bg-background">
              <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => { setPending(q); setTimeout(send, 0); }}
                    className="px-3 py-1.5 rounded-full bg-muted hover:bg-muted/70 text-sm whitespace-nowrap border"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-full border bg-white dark:bg-slate-900 px-3 py-1.5 shadow-sm">
                  <Input
                    value={pending}
                    onChange={(e) => setPending(e.target.value)}
                    placeholder={locale==='ar' ? 'اكتب سؤالك هنا...' : 'Type your question...'}
                    onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                    className="border-0 focus-visible:ring-0 bg-transparent"
                  />
                </div>
                <Button onClick={send} className="rounded-full h-10 w-10 p-0 grid place-items-center" aria-label={locale==='ar' ? 'إرسال' : 'Send'}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground mt-3 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" /> {locale==='ar' ? 'في حال لم تجد إجابة مناسبة، سيتضمن الرد رقم الواتساب للتواصل.' : "If we can't find an exact answer, the reply will include our WhatsApp number."}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => setCurrentPage && setCurrentPage('home')}>
            {locale==='ar' ? 'العودة للصفحة الرئيسية' : 'Back to Home'}
          </Button>
        </div>
      </div>
    </div>
  );
}