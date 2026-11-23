# NASQ | نَسَق — المرحلة 1 (هيكل + دخول + داشبورد)

## 1) Firebase
1. ادخل https://console.firebase.google.com وأنشئ مشروع.
2. Build > Authentication > Get started > فعّل **Email/Password** و **Google**.
3. Build > Firestore Database > Create database.
4. Firestore > Rules والصق:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```
5. Project settings > Your apps > Web (</>) وانسخ `firebaseConfig` داخل `firebase-config.js`.
6. Authentication > Settings > Authorized domains: أضف `USERNAME.github.io`.

## 2) GitHub Pages
1. أنشئ repository جديد وارفع كل الملفات في الجذر.
2. Settings > Pages > Source: Deploy from a branch > `main` / root.
3. افتح الرابط `https://USERNAME.github.io/REPO/`.

## 3) تثبيت كتطبيق
- Windows/Android (Chrome/Edge): زر Install في شريط العنوان أو القائمة.
- iPhone (Safari): Share > Add to Home Screen.

## تجربة سريعة للأرقام
من Firestore أضف Document داخل `users/{uid}/models` بالحقول:
`status` (new/scheduled/working/waiting/edit/done/delivered/canceled)، `price` (رقم)،
`receivedDate` و`deliveryDate` بصيغة `2026-11-23`. وفي `payments`: `amount` و`date`.
