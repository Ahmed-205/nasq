import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { updateProfile, sendPasswordResetEmail, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { L as SL, STATUS } from "./screens.js";
import { L as PL, METHODS } from "./payments.js";
import { L as TL } from "./tools.js";

const BASE = [...METHODS];
const DEF = { s:{ ar:{ ...SL.ar.s }, en:{ ...SL.en.s } }, ts:{ ar:{ ...TL.ar.s }, en:{ ...TL.en.s } }, m:{ ar:{ ...PL.ar.m }, en:{ ...PL.en.m } }, tm:{ ar:{ ...TL.ar.m }, en:{ ...TL.en.m } } };
const CUR = { EGP:{ ar:"جنيه مصري", en:"Egyptian pound" }, USD:{ ar:"دولار أمريكي", en:"US dollar" }, SAR:{ ar:"ريال سعودي", en:"Saudi riyal" }, AED:{ ar:"درهم إماراتي", en:"UAE dirham" }, KWD:{ ar:"دينار كويتي", en:"Kuwaiti dinar" }, EUR:{ ar:"يورو", en:"Euro" } };
const L = {
  ar: { acct:"حسابي والأمان", name:"الاسم", saveN:"حفظ الاسم", role:"صلاحيتك", roles:{ owner:"المالك", manager:"مدير", staff:"موظف", viewer:"مشاهدة فقط" }, unver:"بريدك لسه مش مفعّل.", sendV:"إرسال رابط التفعيل",
    pw:"تغيير كلمة المرور (رابط على بريدك)", sent:"أرسلنا الرابط إلى بريدك.", err:"حصل خطأ. حاول تاني.", sec:"المصادقة الثنائية والتحقق برقم الهاتف (SMS) محتاجين ترقية مشروع Firebase لخطة مدفوعة، فمش متاحين دلوقتي.",
    cust:"تخصيص النظام", cur:"العملة", stt:"أسماء حالات الموديلات (للغة الحالية)", saveS:"حفظ الأسماء", resetS:"الأسماء الأصلية", meth:"طرق دفع إضافية", addM:"إضافة", mph:"اسم طريقة الدفع", rm:"حذف", inUse:"الطريقة دي مستخدمة في دفعات، مينفعش تتحذف." },
  en: { acct:"My account & security", name:"Name", saveN:"Save name", role:"Your role", roles:{ owner:"Owner", manager:"Manager", staff:"Staff", viewer:"Viewer" }, unver:"Your email isn't verified yet.", sendV:"Send verification link",
    pw:"Change password (link by email)", sent:"We sent the link to your email.", err:"Something went wrong. Try again.", sec:"Two-factor sign-in and phone (SMS) verification need the Firebase project upgraded to a paid plan, so they aren't available right now.",
    cust:"Customize", cur:"Currency", stt:"Model status names (current language)", saveS:"Save names", resetS:"Original names", meth:"Extra payment methods", addM:"Add", mph:"Method name", rm:"Delete", inUse:"This method is used by payments and can't be deleted." }
};
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

export function applySettings(s) {
  s = s || {};
  ["ar","en"].forEach(g => {
    SL[g].s = { ...DEF.s[g] }; TL[g].s = { ...DEF.ts[g] }; PL[g].m = { ...DEF.m[g] }; TL[g].m = { ...DEF.tm[g] };
    const o = (s.statusLabels || {})[g] || {}; STATUS.forEach(k => { if (o[k]) { SL[g].s[k] = o[k]; TL[g].s[k] = o[k]; } });
  });
  METHODS.length = 0; METHODS.push(...BASE);
  (s.methods || []).forEach(m => { METHODS.push(m.key); ["ar","en"].forEach(g => { PL[g].m[m.key] = m.label; TL[g].m[m.key] = m.label; }); });
}
export function accountPanel(c) {
  const { st } = c, l = L[st.lang], u = st.user;
  return `<div class="panel" id="acct" style="margin-top:22px"><h3>${l.acct}</h3><p>${esc(u.email)} — ${l.role}: <b>${l.roles[st.role] || ""}</b></p>
  <div class="tools"><input id="dn" placeholder="${l.name}" value="${esc(u.displayName || "")}"><button class="btn alt" data-a="name">${l.saveN}</button></div>
  ${u.emailVerified ? "" : `<p class="err">${l.unver} <button class="link" data-a="verify">${l.sendV}</button></p>`}
  <button class="btn alt" data-a="pw">${l.pw}</button><p class="sub" style="margin-top:10px">${l.sec}</p></div>`;
}
export function customPanel(c) {
  const { st } = c, l = L[st.lang], g = st.lang; if (!["owner","manager"].includes(st.role)) return "";
  const cur = (st.settings && st.settings.currency) || "EGP", ms = (st.settings && st.settings.methods) || [];
  return `<div class="panel" id="cust" style="margin-top:22px"><h3>${l.cust}</h3>
  <label class="field" style="max-width:320px"><span>${l.cur}</span><select id="cur">${Object.keys(CUR).map(k => `<option value="${k}" ${k === cur ? "selected" : ""}>${k} — ${CUR[k][g]}</option>`).join("")}</select></label>
  <h3 style="margin-top:14px">${l.stt}</h3><div class="fg">${STATUS.map(k => `<label class="field"><span>${esc(DEF.s[g][k])}</span><input data-sk="${k}" value="${esc(SL[g].s[k])}"></label>`).join("")}</div>
  <div class="row"><button class="btn alt" data-a="ss">${l.saveS}</button><button class="btn alt" data-a="rs">${l.resetS}</button></div>
  <h3 style="margin-top:14px">${l.meth}</h3>${ms.map(m => `<div class="row" style="align-items:center;margin-bottom:6px"><span>${esc(m.label)}</span><button class="ib d" data-a="dm" data-k="${m.key}">${l.rm}</button></div>`).join("")}
  <div class="tools"><input id="mn" placeholder="${l.mph}"><button class="btn alt" data-a="am">${l.addM}</button></div></div>`;
}
export function bindPrefs(c) {
  const { st } = c, l = L[st.lang], sd = () => doc(c.db, "users", c.uid, "settings", "main");
  const ac = document.querySelector("#acct");
  if (ac) ac.onclick = async e => { const a = e.target.dataset.a; if (!a) return;
    try { if (a === "name") { await updateProfile(c.auth.currentUser, { displayName:ac.querySelector("#dn").value.trim() }); c.render(); }
      else if (a === "verify") { await sendEmailVerification(c.auth.currentUser); alert(l.sent); }
      else if (a === "pw") { await sendPasswordResetEmail(c.auth, st.user.email); alert(l.sent); } } catch (x) { console.error(x); alert(l.err); } };
  const cp = document.querySelector("#cust"); if (!cp) return;
  const save = o => setDoc(sd(), o, { merge:true }).catch(x => { console.error(x); alert(l.err); });
  const cur = cp.querySelector("#cur"); cur.onchange = () => save({ currency:cur.value });
  cp.onclick = async e => { const b = e.target.closest("[data-a]"); if (!b) return; const a = b.dataset.a;
    if (a === "ss") { const o = {}; cp.querySelectorAll("[data-sk]").forEach(i => { o[i.dataset.sk] = i.value.trim(); }); await save({ statusLabels:{ [st.lang]: o } }); }
    else if (a === "rs") { const o = {}; STATUS.forEach(k => o[k] = ""); await save({ statusLabels:{ [st.lang]: o } }); }
    else if (a === "am") { const v = cp.querySelector("#mn").value.trim(); if (!v) return; await save({ methods:[...((st.settings && st.settings.methods) || []), { key:"c" + Date.now().toString(36), label:v }] }); }
    else if (a === "dm") { const k = b.dataset.k; if (st.payments.some(p => p.method === k)) return alert(l.inUse); await save({ methods:((st.settings && st.settings.methods) || []).filter(m => m.key !== k) }); } };
}
