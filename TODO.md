# TODO: Cleanup Automation Changes (Keep Profile Upload)

## ✅ الاحتفاظ بهذه التغييرات فقط
- [x] `/api/upload-profile-image` endpoint
- [x] Multer + uploads static serving

## ❌ احذف هذه التغييرات
```
git checkout HEAD~1 -- pages/AdminDashboard.tsx
git checkout HEAD~1 -- server.ts  
git checkout HEAD~1 -- services/automation/googleSync.ts
git checkout HEAD~1 -- services/automation/tools/quick-upload-backend.ts
git rm TODO.md
git checkout package.json
npm i
```

## 🔄 أوامر التنظيف:
```
git checkout -- pages/AdminDashboard.tsx server.ts services/automation/googleSync.ts services/automation/tools/quick-upload-backend.ts TODO.md
rm -rf services/automation/tools/quick-upload-backend.ts
git checkout package.json package-lock.json services/automation/tools/kakao-downloader/package*.json yarn.lock
npm i
```

**بعد التنظيف: `npm run dev` → كل شيء يعمل كما كان + Profile upload ✅**

