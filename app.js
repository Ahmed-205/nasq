import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { customersView, modelsView, bindScreens } from "./screens.js";

const T = {
  ar: { dash:"الرئيسية", customers:"العملاء", models:"الموديلات", payments:"الدفعات", settings:"الإعدادات",
    email:"البريد الإلكتروني", pass:"كلمة المرور", login:"دخول", signup:"إنشاء حساب", google:"الدخول بحساب Google",
    forgot:"نسيت كلمة المرور؟", sent:"أرسلنا رابط استعادة كلمة المرور إلى بريدك.", needEmail:"اكتب بريدك أولًا.",
    have:"عندي حساب", none:"مفيش حساب؟ أنشئ واحد", tag:"إدارة شغل التريكو في مكان واحد", or:"أو",
    total:"إجمالي الموديلات", year:"موديلات السنة", month:"موديلات الشهر", notStarted:"لم يبدأ العمل", working:"جاري التنفيذ",
    waiting:"منتظر رد العميل", due:"تسليم خلال 7 أيام", late:"متأخر عن التسليم", value:"إجمالي قيمة الأعمال", paid:"المحصّل",
    rest:"المتبقي", chart:"حركة الموديلات خلال السنة", lastPay:"آخر الدفعات", noPay:"لا توجد دفعات بعد.",
    noData:"لسه مفيش موديلات. أول ما تضيف موديل هتظهر الأرقام هنا.", soon:"الشاشة دي تتفعّل في المرحلة الجاية.",
    lang:"اللغة", theme:"المظهر", light:"فاتح", dark:"داكن", out:"تسجيل الخروج", hi:"أهلًا", cur:"EGP",
    months:["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"],
    e:{"auth/invalid-credential":"البريد أو كلمة المرور غير صحيحة.","auth/email-already-in-use":"البريد ده مسجّل قبل كده.",
      "auth/weak-password":"كلمة المرور لازم تكون 6 حروف على الأقل.","auth/invalid-email":"البريد غير صحيح.",
      "auth/popup-closed-by-user":"اتقفلت نافذة الدخول قبل ما تكمل.","auth/api-key-not-valid":"إعدادات Firebase ناقصة. راجع firebase-config.js."} },
  en: { dash:"Home", customers:"Customers", models:"Models", payments:"Payments", settings:"Settings",
    email:"Email", pass:"Password", login:"Sign in", signup:"Create account", google:"Continue with Google",
    forgot:"Forgot password?", sent:"We sent a reset link to your email.", needEmail:"Enter your email first.",
    have:"I have an account", none:"No account? Create one", tag:"Run your knitwear business in one place", or:"or",
    total:"Total models", year:"This year", month:"This month", notStarted:"Not started", working:"In progress",
    waiting:"Waiting on client", due:"Due in 7 days", late:"Overdue", value:"Total value", paid:"Collected",
    rest:"Outstanding", chart:"Models per month", lastPay:"Latest payments", noPay:"No payments yet.",
    noData:"No models yet. Numbers will appear here once you add one.", soon:"This screen arrives in the next phase.",
    lang:"Language", theme:"Theme", light:"Light", dark:"Dark", out:"Sign out", hi:"Hello", cur:"EGP",
    months:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    e:{"auth/invalid-credential":"Wrong email or password.","auth/email-already-in-use":"This email is already registered.",
      "auth/weak-password":"Password must be at least 6 characters.","auth/invalid-email":"Invalid email.",
      "auth/popup-closed-by-user":"Sign-in window was closed.","auth/api-key-not-valid":"Firebase config is missing. Check firebase-config.js."} }
};
const VIEWS = ["dash","customers","models","payments","settings"];
const st = { user:null, models:[], payments:[], customers:[], filter:"", cid:null, view:"dash", lang:localStorage.lang||"ar", theme:localStorage.theme||"light", signup:false, err:"", info:"" };
let unsubs = [];

const app = initializeApp(firebaseConfig), auth = getAuth(app), db = getFirestore(app);
const t = k => T[st.lang][k];
const $ = s => document.querySelector(s);
const fmt = n => new Intl.NumberFormat(st.lang==="ar"?"ar-EG-u-nu-latn":"en-US",{style:"currency",currency:"EGP",maximumFractionDigits:0}).format(n||0);
const num = n => new Intl.NumberFormat(st.lang==="ar"?"ar-EG-u-nu-latn":"en-US").format(n);
const iso = d => d.toISOString().slice(0,10);
const ctx = () => ({ st, db, uid: st.user.uid, t, fmt, num, render });

function stats() {
  const now = new Date(), today = iso(now), yr = String(now.getFullYear()), mo = today.slice(0,7);
  const in7 = iso(new Date(now.getTime()+7*864e5));
  const live = st.models.filter(m => m.status !== "canceled");
  const open = live.filter(m => m.status !== "delivered" && m.status !== "done");
  const by = (...s) => live.filter(m => s.includes(m.status)).length;
  const monthly = Array(12).fill(0);
  live.forEach(m => { if ((m.receivedDate||"").startsWith(yr)) monthly[+m.receivedDate.slice(5,7)-1]++; });
  const value = live.reduce((a,m)=>a+(+m.price||0),0), paid = st.payments.reduce((a,p)=>a+(+p.amount||0),0);
  return { total:live.length, year:live.filter(m=>(m.receivedDate||"").startsWith(yr)).length,
    month:live.filter(m=>(m.receivedDate||"").startsWith(mo)).length,
    notStarted:by("new","scheduled"), working:by("working","edit"), waiting:by("waiting"),
    due:open.filter(m=>m.deliveryDate>=today&&m.deliveryDate<=in7).length,
    late:open.filter(m=>m.deliveryDate&&m.deliveryDate<today).length,
    value, paid, rest:value-paid, monthly };
}

function loginView() {
  return `<div class="login"><section class="knit"><h1>NAS<span>Q</span></h1><p>${t("tag")}</p></section>
  <section class="form"><h2>${st.signup?t("signup"):t("login")}</h2>
  <label class="field"><span>${t("email")}</span><input id="em" type="email" autocomplete="email" dir="ltr"></label>
  <label class="field"><span>${t("pass")}</span><input id="pw" type="password" autocomplete="${st.signup?"new-password":"current-password"}" dir="ltr"></label>
  <p class="err" role="alert">${st.err}</p><p class="msg">${st.info}</p>
  <button class="btn" id="go">${st.signup?t("signup"):t("login")}</button>
  <div class="sep">${t("or")}</div>
  <button class="btn alt" id="gg">${t("google")}</button>
  <div class="row" style="margin-top:14px;justify-content:space-between">
   <button class="link" id="tg">${st.signup?t("have"):t("none")}</button>
   ${st.signup?"":`<button class="link" id="fp">${t("forgot")}</button>`}</div></section></div>`;
}

function dashView() {
  const s = stats(), max = Math.max(1, ...s.monthly);
  const card = (k, v, cls="") => `<button class="stat ${cls}" data-go="models" data-f="${k}"><b>${cls==="money"?fmt(v):num(v)}</b><span>${t(k)}</span></button>`;
  const pays = [...st.payments].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,5);
  return `<div class="top"><div><h2>${t("dash")}</h2><p class="sub">${t("hi")} ${st.user.displayName||st.user.email}</p></div></div>
  ${st.models.length?"":`<div class="empty" style="margin-bottom:22px">${t("noData")}</div>`}
  <div class="grid">${card("total",s.total)}${card("year",s.year)}${card("month",s.month)}${card("notStarted",s.notStarted)}
   ${card("working",s.working)}${card("waiting",s.waiting)}${card("due",s.due)}${card("late",s.late,"late")}</div>
  <div class="grid">${card("value",s.value,"money")}${card("paid",s.paid,"money")}${card("rest",s.rest,"money")}</div>
  <div class="panel"><h3>${t("chart")}</h3><div class="bars">${s.monthly.map((v,i)=>
   `<div class="bar"><span>${v||""}</span><i class="${v?"":"zero"}" style="height:${v/max*100}%"></i><span>${T[st.lang].months[i].slice(0,3)}</span></div>`).join("")}</div></div>
  <div class="panel"><h3>${t("lastPay")}</h3>${pays.length?`<ul class="list">${pays.map(p=>`<li><span>${p.date||""}</span><b>${fmt(p.amount)}</b></li>`).join("")}</ul>`:`<p class="sub">${t("noPay")}</p>`}</div>`;
}

function settingsView() {
  return `<div class="top"><h2>${t("settings")}</h2></div><div class="set">
  <label class="field"><span>${t("lang")}</span><select id="sl"><option value="ar" ${st.lang==="ar"?"selected":""}>العربية</option><option value="en" ${st.lang==="en"?"selected":""}>English</option></select></label>
  <label class="field"><span>${t("theme")}</span><select id="st"><option value="light" ${st.theme==="light"?"selected":""}>${t("light")}</option><option value="dark" ${st.theme==="dark"?"selected":""}>${t("dark")}</option></select></label>
  <button class="btn alt" id="out">${t("out")}</button></div>`;
}

function appView() {
  const body = st.view==="dash" ? dashView() : st.view==="settings" ? settingsView() : st.view==="customers" ? customersView(ctx()) : st.view==="models" ? modelsView(ctx())
    : `<div class="top"><h2>${t(st.view)}</h2></div><div class="empty">${t("soon")}</div>`;
  return `<div class="shell"><nav><div class="logo">NAS<span>Q</span></div>${VIEWS.map(v=>
    `<button data-v="${v}" ${v===st.view?'aria-current="page"':""}>${t(v)}</button>`).join("")}</nav><main>${body}</main></div>`;
}

function render() {
  document.documentElement.lang = st.lang; document.documentElement.dir = st.lang==="ar"?"rtl":"ltr";
  document.documentElement.dataset.theme = st.theme;
  $("#app").innerHTML = st.user ? appView() : loginView();
  bind();
}

function bind() {
  const on = (s, f) => { const el = $(s); if (el) el.onclick = f; };
  const fail = e => { st.err = T[st.lang].e[e.code] || e.message; st.info = ""; render(); };
  on("#go", () => { const em=$("#em").value.trim(), pw=$("#pw").value;
    (st.signup ? createUserWithEmailAndPassword(auth,em,pw) : signInWithEmailAndPassword(auth,em,pw)).catch(fail); });
  on("#gg", () => signInWithPopup(auth,new GoogleAuthProvider()).catch(fail));
  on("#tg", () => { st.signup=!st.signup; st.err=st.info=""; render(); });
  on("#fp", () => { const em=$("#em").value.trim(); if(!em){st.err=t("needEmail");return render();}
    sendPasswordResetEmail(auth,em).then(()=>{st.err="";st.info=t("sent");render();}).catch(fail); });
  on("#out", () => signOut(auth));
  document.querySelectorAll("[data-v]").forEach(b => b.onclick = () => { st.view=b.dataset.v; st.filter=""; st.cid=null; render(); });
  document.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { st.view=b.dataset.go; st.filter=b.dataset.f||""; st.cid=null; render(); });
  const sl=$("#sl"), sth=$("#st");
  if (sl) sl.onchange = () => { st.lang=localStorage.lang=sl.value; render(); };
  if (sth) sth.onchange = () => { st.theme=localStorage.theme=sth.value; render(); };
  bindScreens(ctx());
}

onAuthStateChanged(auth, u => {
  unsubs.forEach(f=>f()); unsubs=[]; st.user=u; st.models=[]; st.payments=[]; st.customers=[]; st.err=""; render();
  if (!u) return;
  // كل مستخدم له بياناته الخاصة: users/{uid}/models و users/{uid}/payments
  ["models","payments","customers"].forEach(c => unsubs.push(onSnapshot(collection(db,"users",u.uid,c),
    snap => { st[c]=snap.docs.map(d=>({id:d.id,...d.data()})); if(!document.querySelector("dialog[open]")) render(); },
    e => console.error(e))));
});

render();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});
