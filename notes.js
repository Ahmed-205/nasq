import { yearOf, payYear, yearList, isLocked } from "./years.js";

const TYPES = ["draw","due","late","wait","pay","money","year"];
const L = {
  ar: { title:"التنبيهات", none:"لا توجد تنبيهات دلوقتي.", draw:"موعد رسم", drawLate:"تأخر بدء الرسم", due:"موعد تسليم", late:"متأخر عن التسليم", wait:"منتظر رد العميل",
    pay:"تم استلام دفعة", money:"مبلغ مستحق", all:"تعليم الكل كمقروء", close:"إغلاق", more:n => `+ ${n} تنبيه آخر (من الجرس)`, settings:"إعدادات التنبيهات",
    push:"تنبيهات المتصفح أثناء فتح التطبيق", pushDeny:"المتصفح لم يسمح بالتنبيهات. فعّلها من إعدادات الموقع.", pushNo:"المتصفح ده مش بيدعم التنبيهات.",
    types:{draw:"مواعيد الرسم",due:"مواعيد التسليم",late:"التأخير عن التسليم",wait:"انتظار رد العميل",pay:"الدفعات المستلمة",money:"المبالغ المستحقة",year:"السنة المالية"},
    today:"النهارده", tom:"بكره", inN:n => `بعد ${n} أيام`, ago:n => `متأخر ${n} يوم`,
    yend:y => `قرب نهاية السنة المالية ${y}. راجع الحسابات وأغلق السنة من الإعدادات.`, yopen:y => `السنة المالية ${y} لسه مفتوحة. راجعها وأغلقها من الإعدادات.` },
  en: { title:"Notifications", none:"Nothing needs your attention.", draw:"Knitting due", drawLate:"Start overdue", due:"Delivery due", late:"Overdue delivery", wait:"Waiting on client",
    pay:"Payment received", money:"Outstanding balance", all:"Mark all as read", close:"Close", more:n => `+ ${n} more (open the bell)`, settings:"Notification settings",
    push:"Browser alerts while the app is open", pushDeny:"The browser blocked notifications. Allow them in site settings.", pushNo:"This browser doesn't support notifications.",
    types:{draw:"Knitting dates",due:"Delivery dates",late:"Overdue deliveries",wait:"Waiting on client",pay:"Payments received",money:"Outstanding balances",year:"Financial year"},
    today:"today", tom:"tomorrow", inN:n => `in ${n} days`, ago:n => `${n} days late`,
    yend:y => `Financial year ${y} is ending. Review the accounts and close it from Settings.`, yopen:y => `Financial year ${y} is still open. Review and close it from Settings.` }
};
const ls = (k, d) => { try { return JSON.parse(localStorage[k]) ?? d; } catch { return d; } };
const seen = () => new Set(ls("nasq_seen", []));
const markSeen = k => { const s = seen(); s.add(k); localStorage.nasq_seen = JSON.stringify([...s].slice(-500)); };
const prefs = () => ({ off:[], push:false, ...ls("nasq_np", {}) });
const savePrefs = p => { localStorage.nasq_np = JSON.stringify(p); };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const iso = d => d.toISOString().slice(0,10);
const open = m => !["delivered","done","canceled"].includes(m.status);

export function buildNotes(c) {
  const { st } = c, l = L[st.lang], off = prefs().off, out = [], td = iso(new Date());
  const days = d => Math.round((new Date(d) - new Date(td)) / 864e5);
  const rel = n => n === 0 ? l.today : n === 1 ? l.tom : n > 1 ? l.inN(n) : l.ago(-n);
  const cname = id => (st.customers.find(x => x.id === id) || {}).name || "";
  const add = (type, key, text, nav, sev) => { if (!off.includes(type)) out.push({ type, key, text, nav, sev }); };
  st.models.filter(m => m.status !== "canceled").forEach(m => {
    const tag = `${m.number ? "#" + m.number + " " : ""}${m.name || ""} (${cname(m.customerId)})`, y = yearOf(m);
    if (["new","scheduled"].includes(m.status) && m.startDate) { const n = days(m.startDate);
      if (n < 0) add("draw", "dl:" + m.id, `${l.drawLate}: ${tag} — ${rel(n)}`, { view:"models", f:"notStarted", y }, 2);
      else if (n <= 2) add("draw", "d:" + m.id + m.startDate, `${l.draw}: ${tag} — ${rel(n)}`, { view:"models", f:"notStarted", y }, 1); }
    if (open(m) && m.deliveryDate) { const n = days(m.deliveryDate);
      if (n < 0) add("late", "l:" + m.id, `${l.late}: ${tag} — ${rel(n)}`, { view:"models", f:"late", y }, 3);
      else if (n <= 3) add("due", "u:" + m.id + m.deliveryDate, `${l.due}: ${tag} — ${rel(n)}`, { view:"models", f:"due", y }, 2); }
    if (m.status === "waiting") add("wait", "w:" + m.id, `${l.wait}: ${tag}`, { view:"models", f:"waiting", y }, 1);
  });
  st.payments.filter(p => !p.void && Date.now() - (p.created || 0) < 172800000).forEach(p =>
    add("pay", "p:" + p.id, `${l.pay}: ${c.fmt(p.amount)} — ${cname(p.customerId)}`, { view:"payments", y:payYear(p) }, 0));
  st.customers.map(cu => { const ms = st.models.filter(m => m.customerId === cu.id && m.status !== "canceled");
    const rest = ms.reduce((a,m) => a + (+m.price||0), 0) - st.payments.filter(p => p.customerId === cu.id && !p.void).reduce((a,p) => a + (+p.amount||0), 0);
    return { cu, rest, done:ms.some(m => ["done","delivered"].includes(m.status)) }; })
    .filter(x => x.rest > 0.5 && x.done).sort((a,b) => b.rest - a.rest).slice(0, 5)
    .forEach(x => add("money", "m:" + x.cu.id + ":" + Math.round(x.rest), `${l.money}: ${x.cu.name} — ${c.fmt(x.rest)}`, { view:"customers", cid:x.cu.id }, 1));
  const now = new Date(), cy = String(now.getFullYear());
  if (now.getMonth() >= 10 && !isLocked(st, cy)) add("year", "ye:" + cy, l.yend(cy), { view:"settings" }, 2);
  yearList(st).filter(y => y < cy && !isLocked(st, y) && (st.models.some(m => yearOf(m) === y))).forEach(y => add("year", "yo:" + y, l.yopen(y), { view:"settings" }, 1));
  return out.sort((a,b) => b.sev - a.sev);
}
const unread = c => { const s = seen(); return buildNotes(c).filter(n => !s.has(n.key)).length; };
const item = (n, s) => `<button class="nt s${n.sev} ${s.has(n.key) ? "rd" : ""}" data-nav data-key="${esc(n.key)}" data-view="${n.nav.view}" data-f="${n.nav.f || ""}" data-cid="${n.nav.cid || ""}" data-y="${n.nav.y || ""}">${esc(n.text)}</button>`;

export function bellHtml(c) { const n = unread(c);
  return `<button class="bell" data-bell aria-label="${L[c.st.lang].title}">🔔${n ? `<i>${n > 9 ? "9+" : n}</i>` : ""}</button>`; }
export function notesPanel(c, limit) {
  const l = L[c.st.lang], all = buildNotes(c), s = seen(), list = all.slice(0, limit);
  return `<div class="panel"><h3>${l.title}</h3>${list.length ? list.map(n => item(n, s)).join("") : `<p class="sub">${l.none}</p>`}${all.length > limit ? `<p class="sub">${l.more(all.length - limit)}</p>` : ""}</div>`;
}
function openList(c) {
  const l = L[c.st.lang], s = seen(), all = buildNotes(c), d = document.createElement("dialog");
  d.className = "nd";
  d.innerHTML = `<h3 style="margin:0 0 10px">${l.title}</h3><div style="max-height:60vh;overflow:auto">${all.length ? all.map(n => item(n, s)).join("") : `<p class="sub">${l.none}</p>`}</div>
  <div class="row" style="margin-top:14px"><button class="btn alt" data-all>${l.all}</button><button class="btn alt" data-x>${l.close}</button></div>`;
  document.body.appendChild(d); d.showModal();
  d.onclose = () => { d.remove(); c.render(); };
  d.querySelector("[data-x]").onclick = () => d.close();
  d.querySelector("[data-all]").onclick = () => { all.forEach(n => markSeen(n.key)); d.close(); };
  d.querySelectorAll("[data-nav]").forEach(b => b.onclick = () => go(c, b));
}
function go(c, b) {
  markSeen(b.dataset.key); const st = c.st;
  st.view = b.dataset.view; st.filter = b.dataset.f || ""; st.cid = b.dataset.cid || null;
  if (b.dataset.y) { st.year = b.dataset.y; localStorage.year = b.dataset.y; }
  const d = document.querySelector("dialog.nd"); if (d) d.close(); else c.render();
}
export function bindNotes(c) {
  document.querySelectorAll("#app [data-nav]").forEach(b => b.onclick = () => go(c, b));
  const bell = document.querySelector("[data-bell]"); if (bell) bell.onclick = () => openList(c);
}
export function notesSettings(c) {
  const l = L[c.st.lang], p = prefs();
  return `<div class="panel" id="nset" style="margin-top:22px"><h3>${l.settings}</h3>
  ${TYPES.map(t => `<label class="chk"><input type="checkbox" data-t="${t}" ${p.off.includes(t) ? "" : "checked"}> ${l.types[t]}</label>`).join("")}
  <label class="chk"><input type="checkbox" id="np" ${p.push ? "checked" : ""}> ${l.push}</label></div>`;
}
export function bindNotesSettings(c) {
  const root = document.querySelector("#nset"); if (!root) return; const l = L[c.st.lang];
  root.querySelectorAll("[data-t]").forEach(i => i.onchange = () => { const p = prefs(); p.off = p.off.filter(x => x !== i.dataset.t); if (!i.checked) p.off.push(i.dataset.t); savePrefs(p); c.render(); });
  root.querySelector("#np").onchange = async e => { const p = prefs();
    if (e.target.checked) { if (typeof Notification === "undefined") { e.target.checked = false; return alert(l.pushNo); }
      if ((await Notification.requestPermission()) !== "granted") { e.target.checked = false; return alert(l.pushDeny); } }
    p.push = e.target.checked; savePrefs(p); };
}
export function checkSystem(c) {
  if (!prefs().push || typeof Notification === "undefined" || Notification.permission !== "granted") return;
  if (c.st.models.length && !c.st.customers.length) return;
  const td = iso(new Date()), rec = ls("nasq_pushed", {}), done = new Set(rec.d === td ? rec.k : []), s = seen();
  buildNotes(c).filter(n => n.sev >= 2 && !s.has(n.key) && !done.has(n.key)).slice(0, 3).forEach(n => {
    done.add(n.key);
    const show = r => r ? r.showNotification("NASQ", { body:n.text, icon:"icon.svg", tag:n.key }) : new Notification("NASQ", { body:n.text });
    try { (navigator.serviceWorker ? navigator.serviceWorker.getRegistration().then(show) : Promise.resolve(show())).catch(() => {}); } catch {}
  });
  localStorage.nasq_pushed = JSON.stringify({ d:td, k:[...done] });
}
