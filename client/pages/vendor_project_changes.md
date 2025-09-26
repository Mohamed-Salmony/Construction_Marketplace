) : (
  <div>
    {/* ملاحظة للتاجر */}
    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <p className="text-sm text-blue-800">
        {locale==='ar' 
          ? 'عرّف بنفسك واعرض خدماتك. سيتم مناقشة السعر والمدة الزمنية مباشرة مع العميل.'
          : 'Introduce yourself and showcase your services. Price and timeline will be discussed directly with the client.'
        }
      </p>
    </div>

    <div className="grid gap-2">
      <label className="text-sm">{locale==='ar' ? 'تعريف بالخدمة المقدمة' : 'Service Description'}</label>
      <Textarea
        rows={6}
        placeholder={locale==='ar' 
          ? 'عرّف بنفسك وشركتك، واذكر خبرتك في هذا النوع من المشاريع، وأعمالك السابقة، وما يمكنك تقديمه للعميل...'
          : 'Introduce yourself and your company, mention your experience in this type of projects, previous work, and what you can offer to the client...'
        }
        value={offerMessage}
        onChange={(e)=>setOfferMessage(e.target.value)}
      />
      <span className="text-xs text-muted-foreground">
        {locale==='ar'
          ? 'اكتب رسالة مفصلة تتضمن: خبرتك، أعمالك السابقة، والقيمة المضافة التي ستقدمها'
          : 'Write a detailed message including: your experience, previous work, and added value you will provide'
        }
      </span>
    </div>

    <div className="grid grid-cols-1 gap-2">
      <Button
        disabled={saving || hasSubmitted || !offerMessage.trim()}
        className="w-full"
        onClick={() => {
          (async () => {
            try {
              setSaving(true);
              if (!project) return;
              // إرسال العرض بالرسالة فقط - بدون سعر أو أيام
              const res = await createBid(String(project.id), { message: offerMessage.trim() });
              if (res.ok) {
                setOfferMessage('');
                setHasSubmitted(true);
                Swal.fire({ 
                  icon: 'success', 
                  title: locale==='ar' ? 'تم إرسال طلب التواصل' : 'Contact request sent', 
                  text: locale==='ar' ? 'سيتمكن العميل من رؤية طلبك والتواصل معك لمناقشة التفاصيل' : 'The client will be able to see your request and contact you to discuss details',
                  timer: 3000, 
                  showConfirmButton: false 
                });
              } else {
                Swal.fire({ 
                  icon: 'error', 
                  title: locale==='ar' ? 'خطأ في الإرسال' : 'Sending failed', 
                  text: locale==='ar' ? 'حدث خطأ، يرجى المحاولة مرة أخرى' : 'An error occurred, please try again'
                });
              }
            } catch (error) {
              Swal.fire({ 
                icon: 'error', 
                title: locale==='ar' ? 'خطأ في الإرسال' : 'Sending failed', 
                text: locale==='ar' ? 'حدث خطأ، يرجى المحاولة مرة أخرى' : 'An error occurred, please try again'
              });
            } finally {
              setSaving(false);
            }
          })();
        }}
      >
        <Send className="mr-2 h-4 w-4" /> 
        {saving 
          ? (locale==='ar' ? 'جارٍ الإرسال...' : 'Sending...') 
          : (locale==='ar' ? 'إرسال طلب التواصل' : 'Send Contact Request')
        }
      </Button>
    </div>
  </div>
```

## 2. إخفاء العروض عن التجار (السطر 843)

غيّر السطر من:
```tsx
) : (
  // Owner/non-vendor: view and manage received proposals
```

إلى:
```tsx
) : !isVendor ? (
  // العملاء فقط يرون العروض - التجار لا يرون عروض الآخرين
```

## 3. إضافة رسالة للتجار بدلاً من العروض (بعد السطر 955)

أضف هذا الكود قبل `</Card>` الأخيرة:
```tsx
) : (
  // للتجار: لا يرون العروض الأخرى
  <Card>
    <CardContent className="p-6 text-center space-y-4">
      <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
        <MessageCircle className="w-8 h-8 text-blue-600" />
      </div>
      <div>
        <h3 className="font-semibold mb-2">
          {locale==='ar' ? 'في انتظار رد العميل' : 'Waiting for Client Response'}
        </h3>
        <p className="text-muted-foreground text-sm">
          {locale==='ar' 
            ? 'بعد إرسال طلبك، يمكن للعميل التواصل معك مباشرة لمناقشة التفاصيل والأسعار.'
            : 'After sending your request, the client can contact you directly to discuss details and pricing.'
          }
        </p>
      </div>
    </CardContent>
  </Card>
```

## النتيجة:
- ✅ التجار لا يدخلون سعر أو مدة
- ✅ التجار لا يرون عروض التجار الآخرين  
- ✅ التجار يرسلون رسالة تعريفية فقط
- ✅ العملاء يرون جميع العروض كما هو مطلوب

## الخطوات:
1. افتح ملف `ProjectDetails.tsx`
2. طبق التغييرات المذكورة أعلاه
3. احفظ الملف
4. اختبر النتيجة
