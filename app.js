import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, getDoc, setDoc, doc, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { customersView, modelsView, bindScreens } from "./screens.js";
import { paymentsView, bindPayments } from "./payments.js";
import { yearOf, payYear, yearBar, bindYearBar, yearsPanel, bindYears } from "./years.js";
import { teamPanel, bindTeam } from "./team.js";
import { searchBtn, toolsPanel, bindTools, autoBackup } from "./tools.js";
import { accountPanel, customPanel, bindPrefs, applySettings } from "./prefs.js";
import { bellHtml, notesPanel, bindNotes, notesSettings, bindNotesSettings, checkSystem } from "./notes.js";

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
const st = { hide:localStorage.nasq_hide !== "0", user:null, models:[], payments:[], customers:[], years:[], members:[], invites:[], ws:null, role:null, pending:"", year:localStorage.year||String(new Date().getFullYear()), filter:"", cid:null, view:"dash", lang:localStorage.lang||"ar", theme:localStorage.theme||"light", signup:false, err:"", info:"" };
let unsubs = [];

const app = initializeApp(firebaseConfig), auth = getAuth(app), db = getFirestore(app);
const t = k => T[st.lang][k];
const V = { ar:{ vTitle:"أكّد بريدك الإلكتروني", vText:"تمت دعوتك للانضمام لفريق عمل. أكّد بريدك أولًا (راجع صندوق الوارد) ثم اضغط «تم التأكيد».", vSend:"إرسال رابط التأكيد", vDone:"تم التأكيد", sent:"اتبعت الرابط على بريدك.", still:"البريد لسه مش مؤكد.", wait:"جاري التحميل..." },
  en:{ vTitle:"Verify your email", vText:"You've been invited to a team. Verify your email first (check your inbox), then tap “I verified”.", vSend:"Send verification link", vDone:"I verified", sent:"Link sent to your email.", still:"Email is not verified yet.", wait:"Loading..." } };
const tv = k => V[st.lang][k];
const $ = s => document.querySelector(s);
const fmtR = n => new Intl.NumberFormat(st.lang==="ar"?"ar-EG-u-nu-latn":"en-US",{style:"currency",currency:(st.settings && st.settings.currency) || "EGP",maximumFractionDigits:0}).format(n||0);
const fmt = n => st.hide ? "••••" : fmtR(n);
const num = n => new Intl.NumberFormat(st.lang==="ar"?"ar-EG-u-nu-latn":"en-US").format(n);
const iso = d => d.toISOString().slice(0,10);
const ctx = () => ({ st, db, uid: st.ws, role: st.role, auth, t, fmt, fmtR, num, render, bell: c => eyeBtn() + searchBtn(c) + bellHtml(c) });

function stats() {
  const now = new Date(), today = iso(now), yr = st.year, mo = today.slice(0,7);
  const in7 = iso(new Date(now.getTime()+7*864e5));
  const live = st.models.filter(m => m.status !== "canceled" && yearOf(m) === st.year);
  const open = live.filter(m => m.status !== "delivered" && m.status !== "done");
  const by = (...s) => live.filter(m => s.includes(m.status)).length;
  const monthly = Array(12).fill(0);
  live.forEach(m => { if ((m.receivedDate||"").startsWith(yr)) monthly[+m.receivedDate.slice(5,7)-1]++; });
  const value = live.reduce((a,m)=>a+(+m.price||0),0), paid = st.payments.filter(p=>!p.void&&payYear(p)===st.year).reduce((a,p)=>a+(+p.amount||0),0);
  return { total:st.models.filter(m=>m.status!=="canceled").length, year:live.length,
    month:live.filter(m=>(m.receivedDate||"").startsWith(mo)).length,
    notStarted:by("new","scheduled"), working:by("working","edit"), waiting:by("waiting"),
    due:open.filter(m=>m.deliveryDate>=today&&m.deliveryDate<=in7).length,
    late:open.filter(m=>m.deliveryDate&&m.deliveryDate<today).length,
    value, paid, rest:value-paid, monthly };
}

function verifyView() {
  return `<div class="login">${hero()}<section class="form"><h2>${tv("vTitle")}</h2><p class="sub">${tv("vText")}</p>
  <p class="msg">${st.info}</p><div class="row"><button class="btn" id="vs">${tv("vSend")}</button><button class="btn alt" id="vd">${tv("vDone")}</button><button class="btn alt" id="out">${t("out")}</button></div></section></div>`;
}
function loginView() {
  return `<div class="login">${hero()}
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
  const card = (k, v, cls="") => `<button class="stat ${cls}" data-go="${["paid","rest"].includes(k)?"payments":"models"}" data-f="${k}"><b>${cls==="money"?fmt(v):num(v)}</b><span>${t(k)}</span></button>`;
  const pays = st.payments.filter(p=>!p.void&&payYear(p)===st.year).sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,5);
  return `<div class="top"><div><h2>${t("dash")}</h2><p class="sub">${t("hi")} ${hx(st.user.displayName||st.user.email)}</p></div></div>
  ${st.models.length?"":`<div class="empty" style="margin-bottom:22px">${t("noData")}</div>`}
  <div class="grid">${card("total",s.total)}${card("year",s.year)}${card("month",s.month)}${card("notStarted",s.notStarted)}
   ${card("working",s.working)}${card("waiting",s.waiting)}${card("due",s.due)}${card("late",s.late,"late")}</div>
  <div class="grid">${card("value",s.value,"money")}${card("paid",s.paid,"money")}${card("rest",s.rest,"money")}</div>
  ${notesPanel(ctx(),5)}<div class="panel"><h3>${t("chart")}</h3><div class="bars">${s.monthly.map((v,i)=>
   `<div class="bar"><span>${v||""}</span><i class="${v?"":"zero"}" style="height:${v/max*100}%"></i><span>${T[st.lang].months[i].slice(0,3)}</span></div>`).join("")}</div></div>
  <div class="panel"><h3>${t("lastPay")}</h3>${pays.length?`<ul class="list">${pays.map(p=>`<li><span>${p.date||""}</span><b>${fmt(p.amount)}</b></li>`).join("")}</ul>`:`<p class="sub">${t("noPay")}</p>`}</div>`;
}

function settingsView() {
  return `<div class="top"><h2>${t("settings")}</h2></div><div class="set">
  <label class="field"><span>${t("lang")}</span><select id="sl"><option value="ar" ${st.lang==="ar"?"selected":""}>العربية</option><option value="en" ${st.lang==="en"?"selected":""}>English</option></select></label>
  <label class="field"><span>${t("theme")}</span><select id="st"><option value="light" ${st.theme==="light"?"selected":""}>${t("light")}</option><option value="dark" ${st.theme==="dark"?"selected":""}>${t("dark")}</option></select></label>
  <button class="btn alt" id="out">${t("out")}</button></div>${notesSettings(ctx())}${yearsPanel(ctx())}${accountPanel(ctx())}${teamPanel(ctx())}${customPanel(ctx())}${toolsPanel(ctx())}`;
}

const hx = s => String(s).replace(/[&<>"']/g, c => "&#" + c.charCodeAt(0) + ";");
const ICON = { dash:'<rect x="3" y="3" width="7" height="9" rx="1.8"/><rect x="14" y="3" width="7" height="5" rx="1.8"/><rect x="14" y="12" width="7" height="9" rx="1.8"/><rect x="3" y="16" width="7" height="5" rx="1.8"/>',
  customers:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.5 3.2-5.5 6.5-5.5s5.9 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .6 3.2 2.3 3.5 5.2"/>',
  models:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>', payments:'<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10.5h18M7 15h3"/>',
  settings:'<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>' };
const EYE = { on:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  off:'<path d="M3 3l18 18"/><path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6A17 17 0 0 0 2 12s3.6 7 10 7c1.6 0 3-.3 4.3-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>' };
const eyeBtn = () => `<button class="bell eye" data-eye aria-pressed="${!st.hide}" title="${st.lang === "ar" ? (st.hide ? "إظهار المبالغ" : "إخفاء المبالغ") : (st.hide ? "Show amounts" : "Hide amounts")}"><svg viewBox="0 0 24 24" aria-hidden="true">${st.hide ? EYE.off : EYE.on}</svg></button>`;
let hideTimer = 0;
function setHide(v) { st.hide = v; localStorage.nasq_hide = v ? "1" : "0"; clearTimeout(hideTimer); if (!v) hideTimer = setTimeout(() => setHide(true), 60000); if (!document.querySelector("dialog[open]")) render(); }
document.addEventListener("visibilitychange", () => { if (document.hidden && !st.hide) setHide(true); });
const FEAT = { ar:["العملاء والموديلات في مكان واحد","حسابات ودفعات بدقة","سنوات مالية وتقارير جاهزة"], en:["Customers and models in one place","Accurate accounts and payments","Financial years and ready reports"] };
const hero = () => `<section class="knit"><div><h1>NAS<span>Q</span></h1><p>${t("tag")}</p><ul class="feat">${FEAT[st.lang].map(x => `<li>${x}</li>`).join("")}</ul></div></section>`;
function appView() {
  const body = st.view==="dash" ? dashView() : st.view==="settings" ? settingsView() : st.view==="customers" ? customersView(ctx()) : st.view==="models" ? modelsView(ctx()) : st.view==="payments" ? paymentsView(ctx())
    : `<div class="top"><h2>${t(st.view)}</h2></div><div class="empty">${t("soon")}</div>`;
  const nm = st.user.displayName || st.user.email || "", rl = ({ ar:{ owner:"المالك", manager:"مدير", staff:"موظف", viewer:"مشاهدة فقط" }, en:{ owner:"Owner", manager:"Manager", staff:"Staff", viewer:"Viewer" } })[st.lang][st.role] || "";
  return `<div class="shell"><nav><div class="logo">NAS<span>Q</span></div>${VIEWS.map(v=>
    `<button data-v="${v}" ${v===st.view?'aria-current="page"':""}><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[v]}</svg><span>${t(v)}</span></button>`).join("")}
  <div class="navfoot"><i>${hx(nm.trim().charAt(0).toUpperCase())}</i><div><b>${hx(nm)}</b><small>${rl}</small></div></div></nav><main>${yearBar(ctx())}${body}</main></div>`;
}

function render() {
  document.documentElement.lang = st.lang; document.documentElement.dir = st.lang==="ar"?"rtl":"ltr";
  document.documentElement.dataset.theme = st.theme;
  $("#app").innerHTML = !st.user ? loginView() : st.pending ? verifyView() : st.ws ? appView() : `<div class="empty" style="margin:60px auto;max-width:360px">${tv("wait")}</div>`;
  bind();
  document.body.classList.toggle("ro", st.role==="viewer");
  document.body.classList.toggle("nm", !!st.ws && !["owner","manager"].includes(st.role));
  if (st.role==="viewer") document.querySelectorAll("select[data-act]").forEach(s => s.disabled = true);
  if (st.ws) { checkSystem(ctx()); autoBackup(ctx()); }
}

function bind() {
  document.querySelectorAll("[data-eye]").forEach(b => b.onclick = () => setHide(!st.hide));
  const on = (s, f) => { const el = $(s); if (el) el.onclick = f; };
  const fail = e => { st.err = T[st.lang].e[e.code] || e.message; st.info = ""; render(); };
  on("#go", () => { const em=$("#em").value.trim(), pw=$("#pw").value;
    (st.signup ? createUserWithEmailAndPassword(auth,em,pw).then(r => sendEmailVerification(r.user).catch(()=>{})) : signInWithEmailAndPassword(auth,em,pw)).catch(fail); });
  on("#gg", () => signInWithPopup(auth,new GoogleAuthProvider()).catch(fail));
  on("#tg", () => { st.signup=!st.signup; st.err=st.info=""; render(); });
  on("#fp", () => { const em=$("#em").value.trim(); if(!em){st.err=t("needEmail");return render();}
    sendPasswordResetEmail(auth,em).then(()=>{st.err="";st.info=t("sent");render();}).catch(fail); });
  on("#out", () => signOut(auth));
  on("#vs", () => sendEmailVerification(auth.currentUser).then(()=>{ st.info=tv("sent"); render(); }).catch(fail));
  on("#vd", async () => { await auth.currentUser.reload(); await auth.currentUser.getIdToken(true);
    if (auth.currentUser.emailVerified) boot(auth.currentUser); else { st.info=tv("still"); render(); } });
  document.querySelectorAll("[data-v]").forEach(b => b.onclick = () => { st.view=b.dataset.v; st.filter=""; st.cid=null; render(); });
  document.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { st.view=b.dataset.go; st.filter=b.dataset.f||""; st.cid=null; render(); });
  const sl=$("#sl"), sth=$("#st");
  if (sl) sl.onchange = () => { st.lang=localStorage.lang=sl.value; render(); };
  if (sth) sth.onchange = () => { st.theme=localStorage.theme=sth.value; render(); };
  bindScreens(ctx()); bindPayments(ctx()); bindYearBar(ctx()); bindYears(ctx()); bindNotes(ctx()); bindNotesSettings(ctx()); bindTeam(ctx()); bindTools(ctx()); bindPrefs(ctx());
}

async function boot(u) {
  unsubs.forEach(f=>f()); unsubs=[];
  Object.assign(st, { models:[], payments:[], customers:[], years:[], members:[], invites:[], log:[], settings:{}, settingsLoaded:false, ready:{}, ws:null, role:null, pending:"", info:"" });
  const em = (u.email||"").toLowerCase();
  try {
    const inv = em ? await getDoc(doc(db,"invites",em)) : null;
    if (inv && inv.exists() && inv.data().ownerUid !== u.uid) {
      if (!u.emailVerified) { st.pending = "verify"; return render(); }
      const d = inv.data(), mref = doc(db,"users",d.ownerUid,"members",u.uid);
      let ms = await getDoc(mref);
      const key = "nasq_decl_" + d.ownerUid, who = d.ownerEmail || "?";
      if (!ms.exists() && (localStorage[key] || !confirm(st.lang==="ar" ? `تمت دعوتك لمساحة عمل ${who}. تقبل الانضمام؟` : `You were invited to ${who}'s workspace. Join?`))) {
        localStorage[key] = "1"; st.ws = u.uid; st.role = "owner";
      } else {
        if (!ms.exists()) { await setDoc(mref, { email:em, role:d.role, name:d.name||u.displayName||"", joined:Date.now() }); ms = await getDoc(mref); }
        st.ws = d.ownerUid; st.role = ms.data().role;
      }
    } else { st.ws = u.uid; st.role = "owner"; }
  } catch (e) { console.error(e); st.ws = u.uid; st.role = "owner"; }
  render();
  const sub = (q, key) => unsubs.push(onSnapshot(q, snap => { st.ready[key] = 1; st[key] = snap.docs.map(d => ({ id:d.id, ...d.data() })); if (!document.querySelector("dialog[open]")) render(); }, e => console.error(e)));
  ["models","payments","customers","years"].forEach(k => sub(collection(db,"users",st.ws,k), k));
  unsubs.push(onSnapshot(doc(db,"users",st.ws,"settings","main"), s => { st.settings = s.exists() ? s.data() : {}; st.settingsLoaded = true; applySettings(st.settings); if (!document.querySelector("dialog[open]")) render(); }, e => console.error(e)));
  if (["owner","manager"].includes(st.role)) sub(query(collection(db,"users",st.ws,"log"), orderBy("at","desc"), limit(50)), "log");
  if (st.role === "owner") { sub(collection(db,"users",st.ws,"members"), "members"); sub(query(collection(db,"invites"), where("ownerUid","==",st.ws)), "invites"); }
}
onAuthStateChanged(auth, u => {
  st.user = u; st.err = "";
  if (!u) { unsubs.forEach(f=>f()); unsubs=[]; Object.assign(st, { ws:null, role:null, pending:"" }); return render(); }
  boot(u);
});

render();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});
