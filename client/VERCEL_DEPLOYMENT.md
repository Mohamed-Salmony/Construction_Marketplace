# دليل نشر المشروع على Vercel

## المتطلبات الأساسية

1. **Node.js النسخة 20** (كما هو محدد في `.nvmrc`)
2. **حساب Vercel** - قم بإنشاء حساب على [vercel.com](https://vercel.com)
3. **Vercel CLI** (اختياري ولكن مُوصى به)

## طريقة النشر

### الطريقة الأولى: النشر عبر واجهة Vercel (الأسهل)

1. **تسجيل الدخول إلى Vercel**
   - اذهب إلى [vercel.com](https://vercel.com)
   - سجل دخولك باستخدام GitHub أو GitLab أو Bitbucket

2. **ربط المستودع**
   - اضغط على "New Project"
   - اختر مستودع `Construction_Front-End`
   - حدد مجلد `client` كـ Root Directory

3. **إعداد البناء**
   - Framework Preset: **Next.js**
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm ci`

4. **إعداد متغيرات البيئة**
   ```
   NEXT_PUBLIC_API_BASE_URL=https://construction-marketplace.onrender.com
   NEXT_TELEMETRY_DISABLED=1
   NODE_ENV=production
   ```

5. **النشر**
   - اضغط على "Deploy"
   - انتظر حتى اكتمال عملية البناء والنشر

### الطريقة الثانية: النشر عبر Vercel CLI

1. **تثبيت Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **تسجيل الدخول**
   ```bash
   vercel login
   ```

3. **الانتقال إلى مجلد المشروع**
   ```bash
   cd client
   ```

4. **النشر**
   ```bash
   vercel --prod
   ```

## الملفات المهمة للنشر

### 1. `vercel.json`
يحتوي على إعدادات Vercel المخصصة:
- إعادة توجيه API calls إلى البكاند
- إعدادات الأمان (Headers)
- تحسينات الأداء

### 2. `package.json`
يحتوي على:
- سكريبت `vercel-build` مخصص للنشر
- جميع التبعيات المطلوبة
- إعدادات Next.js

### 3. `next.config.js`
محسن للإنتاج مع:
- تحسينات الذاكرة
- إعدادات الصور
- تحسينات الأداء

### 4. `.nvmrc`
يحدد إصدار Node.js المطلوب (20)

## متغيرات البيئة المطلوبة

في لوحة Vercel، أضف المتغيرات التالية:

| المتغير | القيمة | الوصف |
|---------|--------|-------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://construction-marketplace.onrender.com` | رابط البكاند |
| `NEXT_TELEMETRY_DISABLED` | `1` | إيقاف تتبع Next.js |
| `NODE_ENV` | `production` | بيئة الإنتاج |

## الدومين المخصص (اختياري)

1. في لوحة Vercel، اذهب إلى Settings → Domains
2. أضف الدومين المخصص
3. اتبع التعليمات لتحديث DNS

## استكشاف الأخطاء

### خطأ في البناء
- تأكد من أن جميع التبعيات محدثة
- تحقق من وجود جميع ملفات `.env`
- راجع سجلات البناء في Vercel

### مشاكل الأداء
- الملف `vercel.json` محسن للأداء
- الصور محسنة في `next.config.js`
- المنطقة مُعينة على `iad1` للأداء الأمثل

### مشاكل API
- تحقق من رابط `NEXT_PUBLIC_API_BASE_URL`
- تأكد من أن البكاند يعمل بشكل صحيح
- راجع تكوين CORS في البكاند

## الميزات المُفعلة

✅ **تحسين الصور**: WebP format, lazy loading
✅ **الأمان**: Security headers مُعدة
✅ **الأداء**: Caching مُحسن
✅ **SEO**: Clean URLs وإعادة التوجيه
✅ **API Proxy**: لتجنب مشاكل CORS

## الدعم

إذا واجهت أي مشاكل:
1. راجع [وثائق Vercel](https://vercel.com/docs)
2. تحقق من [وثائق Next.js](https://nextjs.org/docs)
3. راجع سجلات الأخطاء في لوحة Vercel

## ملاحظة مهمة

تأكد من أن البكاند (`https://construction-marketplace.onrender.com`) يعمل بشكل صحيح قبل النشر، حيث أن الفرونت إند يعتمد عليه لجميع عمليات API.
