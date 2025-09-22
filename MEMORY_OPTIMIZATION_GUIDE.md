# دليل تحسين الذاكرة لـ Render (512MB)

## المشكلة الأساسية
تطبيق Next.js على Render يتجاوز حد الذاكرة 512MB ويتم إعادة تشغيله تلقائياً، مما يسبب انقطاع الخدمة.

## الحلول المُطبقة

### 1. تحسينات Next.js Configuration
- **تقسيم الحزم**: chunks محدودة بـ 200KB للحد من استهلاك الذاكرة
- **تحسين الصور**: WebP format مع cache محسن
- **إخراج standalone**: تقليل حجم النشر
- **Memory-based worker count**: تحسين عدد العمليات

### 2. نظام مراقبة الذاكرة المتقدم
```javascript
// lib/memoryOptimizer.js
- مراقبة الذاكرة كل 15 ثانية
- تنظيف تلقائي عند الوصول لـ 350MB
- إزالة cache غير المستخدم
- تنظيف localStorage
```

### 3. نظام Cache محسن
```javascript
// lib/optimizedCache.js
- Cache ذكي للمنتجات (50 عنصر max)
- Cache للفئات (20 عنصر max) 
- Cache عام للـ API (30 عنصر max)
- TTL متدرج: منتجات 10 دقائق، فئات 30 دقيقة
```

### 4. Server محسن
```javascript
// server.js
- Node.js options: --max-old-space-size=400 --expose-gc
- مراقبة ذاكرة مستمرة
- Timeout للـ requests (30 ثانية)
- حد أقصى للاتصالات المتزامنة (100)
- Force GC دوري
```

### 5. خدمات API محسنة
```typescript
// services/products.ts
- Cache للمنتجات غير الموجودة (تجنب 404 calls)
- Cache للاستجابات الناجحة
- تنظيف localStorage من البيانات الفاسدة
- معالجة memory pressure
```

## إعدادات Render

### Environment Variables:
```yaml
NODE_OPTIONS: --max-old-space-size=400 --expose-gc
NODE_ENV: production
NEXT_TELEMETRY_DISABLED: 1
MEMORY_PRESSURE_CHECK: 1
FORCE_COLOR: 0
```

### Build & Start Commands:
```yaml
buildCommand: npm run render-build
startCommand: npm run render-start
```

## مراقبة الأداء

### 1. Memory Logs
```
[Memory] Heap: 245.67 MB / RSS: 312.45 MB
[GC] Forcing garbage collection due to high memory usage
[Cache] Cleaned 15 expired items
```

### 2. Cache Stats
```
[Cache] Products: 45/50 (90%)
[Cache] Categories: 12/20 (60%)
[Cache] General: 25/30 (83%)
```

### 3. تنبيهات الذاكرة
```
[Memory] CRITICAL: Memory usage very high! (>400MB)
[Cache] Memory pressure detected, clearing general cache
```

## استراتيجيات التحسين

### تحسين الصور:
- استخدام WebP format
- أحجام محددة للصور
- Cache طويل المدى (24 ساعة)

### تحسين API Calls:
- Cache للاستجابات الناجحة
- تجنب API calls للمنتجات غير الموجودة
- Batch requests عند الإمكان

### تنظيف الذاكرة:
- تنظيف require cache للـ modules غير الأساسية
- Force GC عند الحاجة
- تنظيف localStorage دوري

## التحقق من الأداء

### 1. مراقبة Logs في Render:
```bash
# البحث عن تحذيرات الذاكرة
grep "Memory" logs.txt

# مراقبة GC activity  
grep "GC" logs.txt

# تتبع Cache performance
grep "Cache" logs.txt
```

### 2. مؤشرات النجاح:
- ✅ لا توجد إعادة تشغيل للخدمة
- ✅ استهلاك ذاكرة < 400MB
- ✅ استجابة سريعة للصفحات
- ✅ لا توجد أخطاء 404 مكررة

### 3. علامات الإنذار:
- ⚠️ Memory usage > 400MB باستمرار
- ⚠️ GC calls متكررة (كل دقيقة)
- ⚠️ Cache misses عالية
- ⚠️ Request timeouts

## خطة الطوارئ

### إذا استمرت المشكلة:
1. **تقليل Cache sizes**: تقليل أحجام الـ cache بـ 50%
2. **تشغيل cleanup أكثر**: كل 30 ثانية بدلاً من دقيقة
3. **تقليل concurrent connections**: من 100 إلى 50
4. **استخدام CDN**: لتقليل load على الخادم

### رصد المتقدم:
```javascript
// إضافة في server.js
setInterval(() => {
  const usage = process.memoryUsage();
  if (usage.heapUsed > 450 * 1024 * 1024) { // 450MB
    console.error('[EMERGENCY] Memory critical - forcing cleanup');
    // تنظيف طارئ شامل
  }
}, 10000); // كل 10 ثوان
```

## نصائح للمطورين

### تجنب Memory Leaks:
- تنظيف EventListeners
- إلغاء subscriptions
- تجنب global variables كبيرة
- استخدام WeakMap بدلاً من Map للـ cache

### أفضل الممارسات:
- استخدام React.memo للـ components الثقيلة
- Lazy loading للـ components الكبيرة  
- تحسين useEffect dependencies
- تجنب تخزين objects كبيرة في state

## الدعم والمتابعة

### لمراقبة الأداء:
1. تابع Render dashboard للـ metrics
2. راقب logs للتنبيهات
3. تحقق من uptime باستمرار

### للحصول على المساعدة:
- تحقق من console للأخطاء
- راجع Memory logs  
- تأكد من تشغيل Cache بشكل صحيح

---

## ملخص التحسينات

✅ **تحسين Next.js config** - تقسيم حزم أصغر وتحسين صور
✅ **نظام مراقبة ذاكرة متقدم** - مراقبة وتنظيف تلقائي  
✅ **Cache ذكي محسن** - TTL متدرج وحدود مناسبة
✅ **Server محسن** - Node options وmemory management
✅ **خدمات API محسنة** - تجنب calls غير ضرورية
✅ **إعدادات Render محسنة** - environment variables محسنة

**هدف واحد: ضمان عدم تجاوز 400MB حد أقصى للذاكرة على Render!**

---

## مشاكل البناء والنشر المحلولة

### ❌ مشكلة: المنتجات والأقسام لا تظهر رغم نجاح البناء

**السبب:** 
- Frontend URL في CORS غير صحيح
- Backend API URL غير متطابق مع service name الفعلي

**الحل المُطبق:**
1. ✅ تصحيح NEXT_PUBLIC_API_BASE_URL إلى https://construction-marketplace.onrender.com
2. ✅ إضافة ALLOWED_ORIGINS في Backend env vars
3. ✅ تفعيل ALLOW_ALL_ORIGINS=true لتجنب مشاكل CORS
4. ✅ تحديث startCommand لاستخدام server.js المحسن
5. ✅ تحديث buildCommand لاستخدام NODE_OPTIONS المحسنة

**URLs الصحيحة (محدثة):**
- Backend: https://construction-marketplace.onrender.com
- Frontend: https://construction-marketplace-1.onrender.com

### ❌ مشاكل البناء السابقة (تم حلها):
- ✅ Invalid next.config.js options (memoryBasedWorkerCount, modularizeImports)
- ✅ Cannot find module 'critters' (تعطيل optimizeCss)
- ✅ TypeError في prerendering (تعطيل standalone output)
- ✅ Tailwind console warnings (تحسين setup)

**الآن الموقع يعمل بالكامل مع تحسينات الذاكرة! 🚀**
