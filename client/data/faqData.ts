import { HelpCircle, Package, Truck, CreditCard, Shield, RefreshCw } from 'lucide-react';

export const faqCategories = [
  { id: 'general', name: 'أسئلة عامة', icon: HelpCircle, color: 'bg-blue-100 text-blue-700' },
  { id: 'orders', name: 'الطلبات', icon: Package, color: 'bg-green-100 text-green-700' },
  { id: 'shipping', name: 'الشحن والتوصيل', icon: Truck, color: 'bg-purple-100 text-purple-700' },
  { id: 'payment', name: 'الدفع', icon: CreditCard, color: 'bg-orange-100 text-orange-700' },
  { id: 'returns', name: 'الإرجاع والاستبدال', icon: RefreshCw, color: 'bg-red-100 text-red-700' },
  { id: 'security', name: 'الأمان والخصوصية', icon: Shield, color: 'bg-gray-100 text-gray-700' }
];

export const faqs = [
  // General Questions
  {
    id: 1,
    category: 'general',
    question: 'ما هي منصة العارف؟',
    answer: 'منصة العارف هي متجر إلكتروني متخصص في بيع قطع غيار السيارات الأصلية والبديلة. نحن نربط بين العملاء والبائعين المتخصصين لتوفير أفضل المنتجات بأسعار تنافسية.',
    popular: true
  },
  {
    id: 2,
    category: 'general',
    question: 'كيف يمكنني العثور على القطعة المناسبة لسيارتي؟',
    answer: 'يمكنك البحث باستخدام رقم القطعة، نوع السيارة، أو تصفح الفئات المختلفة. كما يمكنك استخدام فلتر السيارات لإظهار القطع المتوافقة مع سيارتك فقط.',
    popular: true
  },
  {
    id: 3,
    category: 'general',
    question: 'هل جميع القطع المعروضة أصلية؟',
    answer: 'نحن نقدم مزيج من القطع الأصلية والبديلة عالية الجودة. جميع المنتجات موضح نوعها بوضوح، ونضمن جودة جميع القطع البديلة التي نبيعها.',
    popular: false
  },
  {
    id: 4,
    category: 'general',
    question: 'هل يمكنني طلب قطعة غير متوفرة في الموقع؟',
    answer: 'نعم، يمكنك التواصل معنا عبر خدمة العملاء وسنبحث عن القطعة المطلوبة لك من خلال شبكة الموردين لدينا.',
    popular: false
  },

  // Orders
  {
    id: 5,
    category: 'orders',
    question: 'كيف يمكنني تتبع طلبي؟',
    answer: 'بعد تأكيد الطلب، ستحصل على رقم تتبع عبر البريد الإلكتروني أو الرسائل النصية. يمكنك استخدام هذا الرقم في صفحة "تتبع الطلب" لمعرفة حالة الشحنة.',
    popular: true
  },
  {
    id: 6,
    category: 'orders',
    question: 'كم من الوقت يستغرق تجهيز الطلب؟',
    answer: 'عادة ما يتم تجهيز الطلبات خلال 1-2 يوم عمل. قد تحتاج بعض القطع الخاصة وقت أطول وسيتم إبلاغك بذلك.',
    popular: true
  },
  {
    id: 7,
    category: 'orders',
    question: 'هل يمكنني تعديل أو إلغاء طلبي؟',
    answer: 'يمكنك تعديل أو إلغاء طلبك خلال 30 دقيقة من تقديمه. بعد ذلك، يرجى التواصل مع خدمة العملاء لمساعدتك.',
    popular: false
  },
  {
    id: 8,
    category: 'orders',
    question: 'ماذا لو وصلتني قطعة خاطئة؟',
    answer: 'في حالة وصول قطعة خاطئة، يرجى التواصل معنا ��لال 48 ساعة من الاستلام وسنقوم بترتيب الاستبدال مجاناً.',
    popular: false
  },

  // Shipping
  {
    id: 9,
    category: 'shipping',
    question: 'ما هي تكلفة الشحن؟',
    answer: 'الشحن مجاني للطلبات التي تزيد عن 200 ريال. للطلبات الأقل من ذلك، تكلفة الشحن العادي 25 ريال والشحن السريع 35 ريال.',
    popular: true
  },
  {
    id: 10,
    category: 'shipping',
    question: 'كم يستغرق وصول الطلب؟',
    answer: 'الشحن العادي يستغرق 3-5 أيام عمل، والشحن السريع يستغرق 1-2 يوم عمل. قد تختلف المدة حسب المنطقة.',
    popular: true
  },
  {
    id: 11,
    category: 'shipping',
    question: 'هل تشحنون لجميع مناطق المملكة؟',
    answer: 'نعم، نقوم بالشحن لجميع مناطق المملكة العربية السعودية. قد تختلف أوقات التوصيل حسب المنطقة.',
    popular: false
  },
  {
    id: 12,
    category: 'shipping',
    question: 'هل يمكنني تحديد موعد التوصيل؟',
    answer: 'نعم، يمكنك اختيار الفترة المفضلة للتوصيل (صباحية أو مسائية) عند إتمام الطلب.',
    popular: false
  },

  // Payment
  {
    id: 13,
    category: 'payment',
    question: 'ما هي طرق الدفع المتاحة؟',
    answer: 'نقبل الدفع بالبطاقات الائتمانية (فيزا، ماستركارد)، مدى، والدفع عند الاستلام، والتحويل البنكي.',
    popular: true
  },
  {
    id: 14,
    category: 'payment',
    question: 'هل الدفع آمن؟',
    answer: 'نعم، نستخدم تقنيات التشفير المتقدمة لحماية بياناتك المالية. جميع المعاملات محمية بطبقات أمان متعددة.',
    popular: true
  },
  {
    id: 15,
    category: 'payment',
    question: 'هل هناك رسوم إضافية على الدفع عند الاستلام؟',
    answer: 'نعم، هناك رسوم قدرها 15 ريال للدفع عند الاستلام لتغطية تكاليف الخدمة.',
    popular: false
  },

  // Returns
  {
    id: 16,
    category: 'returns',
    question: 'ما هي سياسة الإرجاع؟',
    answer: 'يمكنك إرجاع المنتجات خلال 30 يوم من تاريخ الاستلام، شرط أن تكون في حالتها الأصلية مع التغليف.',
    popular: true
  },
  {
    id: 17,
    category: 'returns',
    question: 'كيف يمكنني طلب إرجاع؟',
    answer: 'يمكنك طلب الإرجاع من خلال حسابك على الموقع أو التواصل مع خدمة العملاء. سنرسل لك مندوب لاستلام المنتج.',
    popular: false
  },
  {
    id: 18,
    category: 'returns',
    question: 'متى سأحصل على المبلغ المسترد؟',
    answer: 'يتم استرداد المبلغ خلال 3-7 أيام عمل بعد استلام المنتج المرتجع وفحصه.',
    popular: false
  },

  // Security
  {
    id: 19,
    category: 'security',
    question: 'كيف تحمون بياناتي الشخصية؟',
    answer: 'نحن ملتزمون بحماية خصوصيتك ونستخدم أحدث تقنيات الأمان لحماية بياناتك. لا نشارك معلوماتك مع أطراف ثالثة.',
    popular: true
  },
  {
    id: 20,
    category: 'security',
    question: 'هل يمكنني حذف حسابي؟',
    answer: 'نعم، يمكنك طلب حذف حسابك بالتواصل مع خدمة العملاء. سيتم حذف جميع بياناتك خلال 30 يوم.',
    popular: false
  }
];