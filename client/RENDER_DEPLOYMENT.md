# نشر تطبيق الفرونت إند على Render

## الخطوات المطلوبة للنشر

### 1. إعداد Repository
تأكد من أن الـ repository مُحدث مع جميع التغييرات:
```bash
git add .
git commit -m "Prepare frontend for Render deployment"
git push origin main
```

### 2. إنشاء خدمة جديدة على Render
1. اذهب إلى [Render Dashboard](https://dashboard.render.com/)
2. اضغط على "New +" واختر "Web Service"
3. اربط الـ repository الخاص بك
4. استخدم الإعدادات التالية:

**إعدادات أساسية:**
- **Name:** `construction-marketplace-frontend`
- **Root Directory:** `client`
- **Environment:** `Node`
- **Region:** اختر الأقرب لك
- **Branch:** `main`

**Build & Deploy:**
- **Build Command:** `npm ci && npm run build`
- **Start Command:** `node server.js`

### 3. متغيرات البيئة
أضف هذه المتغيرات في قسم Environment Variables:

```
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
NEXT_PUBLIC_API_BASE_URL=https://construction-marketplace-backend.onrender.com
```

### 4. الملفات المُضافة للـ deployment

#### ملفات الإعداد:
- ✅ `render.yaml` - إعداد شامل للخدمات
- ✅ `.env.render` - متغيرات البيئة لـ Render
- ✅ `render.json` - إعدادات متقدمة
- ✅ `render-build.sh` - سكريبت البناء المحسن

#### التعديلات المُطبقة:
- ✅ إزالة dependencies خاصة بـ Vercel
- ✅ تحديث URLs للإشارة للـ backend على Render
- ✅ تنظيف next.config.js من إعدادات Vercel
- ✅ تحديث متغيرات البيئة

### 5. التحقق من النشر

بعد النشر الناجح، التطبيق سيكون متاح على:
`https://construction-marketplace-frontend.onrender.com`

### 6. استكشاف الأخطاء

**مشاكل شائعة:**
- **Build timeout:** زيادة timeout في إعدادات Render
- **Memory issues:** ترقية الخطة أو تحسين الـ build
- **API connection:** التأكد من صحة NEXT_PUBLIC_API_BASE_URL

**لمراقبة الـ logs:**
```bash
# في Render Dashboard
# اذهب إلى Service > Logs
```

### 7. النشر التلقائي
الخدمة مُعدة للنشر التلقائي عند push للـ branch الرئيسي.

---

## ملاحظات مهمة

- تأكد من أن الـ backend يعمل على `construction-marketplace-backend.onrender.com`
- Free tier على Render قد يكون بطيء في البداية
- للحصول على أداء أفضل، فكر في الترقية للخطة المدفوعة

## الدعم
في حالة مواجهة مشاكل، راجع:
- [Render Documentation](https://render.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
