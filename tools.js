import { collection, doc, writeBatch, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { yearOf, payYear } from "./years.js";
import { paidOf } from "./payments.js";

export const L = {
  ar: { search:"بحث شامل (Ctrl+K)", sph:"ابحث في العملاء والموديلات والدفعات...", shint:"اكتب اسم عميل أو رقم هاتف أو اسم موديل أو مبلغ.", noRes:"مفيش نتائج.", close:"إغلاق",
    cust:"العملاء", mods:"الموديلات", pays:"الدفعات", more:n => `+ ${n} نتيجة أخرى`, voided:"ملغاة",
    title:"التقارير والنسخ الاحتياطي", exportHint:y => `التصدير بيشمل العملاء، وموديلات ودفعات السنة المالية ${y}.`, xlsx:"تصدير Excel", pdf:"تقرير PDF (طباعة)",
    noLib:"تعذّر تحميل مكتبة Excel. تأكد من الإنترنت وجرّب تاني.", popup:"المتصفح منع النافذة. اسمح بالنوافذ المنبثقة وجرّب تاني.",
    backup:"النسخ الاحتياطي", doBackup:"تنزيل نسخة احتياطية", doRestore:"استرجاع من نسخة", never:"لم تُنزّل أي نسخة احتياطية بعد.", last:d => `آخر نسخة: ${d}`, stale:"مرّ أكتر من 7 أيام. نزّل نسخة جديدة.",
    autoNote:"النسخة بتتنزّل كملف على جهازك. احتفظ بيها في مكان آمن (Drive مثلًا).", badFile:"الملف ده مش نسخة NASQ صحيحة.", err:"حصل خطأ. حاول تاني.", restored:"تم الاسترجاع.",
    sureRestore:n => `هيتم استرجاع ${n} سجل. السجلات بنفس الرقم هتتستبدل. متأكد؟`,
    log:"سجل النشاط (آخر 50)", time:"الوقت", by:"المستخدم", act:"العملية", item:"التفاصيل",
    types:{"customer.create":"إضافة عميل","customer.edit":"تعديل عميل","customer.delete":"حذف عميل","model.create":"إضافة موديل","model.edit":"تعديل موديل","model.delete":"حذف موديل","model.status":"تغيير حالة موديل",
      "payment.create":"تسجيل دفعة","payment.edit":"تعديل دفعة","payment.void":"إلغاء دفعة","year.close":"إغلاق سنة","year.reopen":"إعادة فتح سنة","year.price":"تغيير سعر سنة"},
    sCust:"العملاء", sMod:"الموديلات", sPay:"الدفعات", rep:"تقرير السنة المالية",
    hC:["الاسم","الهاتف","الموديلات","الحساب","المدفوع","المتبقي","الثقة","ملاحظات"], hM:["الرقم","الاسم","العميل","الماكينة","الجوج","الاستلام","بدء الرسم","التسليم","السعر","المدفوع","الحالة","ملاحظات"], hP:["التاريخ","العميل","الطريقة","المبلغ","ملاحظات"],
    s:{new:"لم يبدأ العمل",scheduled:"مجدول للرسم",working:"جاري العمل",waiting:"منتظر رد العميل",edit:"مطلوب تعديل",done:"تم الانتهاء",delivered:"تم التسليم",canceled:"تم الإلغاء"},
    m:{cash:"نقدًا",vodafone:"Vodafone Cash",instapay:"InstaPay",bank:"تحويل بنكي",other:"أخرى"}, print:"طباعة" },
  en: { search:"Search everything (Ctrl+K)", sph:"Search customers, models and payments...", shint:"Type a customer name, phone, model name or amount.", noRes:"No results.", close:"Close",
    cust:"Customers", mods:"Models", pays:"Payments", more:n => `+ ${n} more`, voided:"Voided",
    title:"Reports & backup", exportHint:y => `Export covers all customers plus models and payments of financial year ${y}.`, xlsx:"Export Excel", pdf:"PDF report (print)",
    noLib:"Couldn't load the Excel library. Check your connection and try again.", popup:"The browser blocked the window. Allow pop-ups and try again.",
    backup:"Backup", doBackup:"Download a backup", doRestore:"Restore from a backup", never:"No backup downloaded yet.", last:d => `Last backup: ${d}`, stale:"More than 7 days ago. Download a new one.",
    autoNote:"The backup downloads as a file to your device. Keep it somewhere safe (e.g. Drive).", badFile:"That isn't a valid NASQ backup.", err:"Something went wrong. Try again.", restored:"Restored.",
    sureRestore:n => `${n} records will be restored. Records with the same ID are replaced. Continue?`,
    log:"Activity log (last 50)", time:"Time", by:"User", act:"Action", item:"Details",
    types:{"customer.create":"Customer added","customer.edit":"Customer edited","customer.delete":"Customer deleted","model.create":"Model added","model.edit":"Model edited","model.delete":"Model deleted","model.status":"Model status changed",
      "payment.create":"Payment recorded","payment.edit":"Payment edited","payment.void":"Payment voided","year.close":"Year closed","year.reopen":"Year reopened","year.price":"Year price changed"},
    sCust:"Customers", sMod:"Models", sPay:"Payments", rep:"Financial year report",
    hC:["Name","Phone","Models","Total","Paid","Outstanding","Trust","Notes"], hM:["No.","Name","Customer","Machine","Gauge","Received","Start","Delivery","Price","Paid","Status","Notes"], hP:["Date","Customer","Method","Amount","Notes"],
    s:{new:"Not started",scheduled:"Scheduled",working:"In progress",waiting:"Waiting on client",edit:"Needs changes",done:"Finished",delivered:"Delivered",canceled:"Canceled"},
    m:{cash:"Cash",vodafone:"Vodafone Cash",instapay:"InstaPay",bank:"Bank transfer",other:"Other"}, print:"Print" }
};
let cur = null;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nz = s => String(s ?? "").toLowerCase().replace(/[\u064B-\u065F\u0640]/g,"").replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
const iso = d => d.toISOString().slice(0,10);
const download = (name, blob) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
const cn = (c, id) => (c.st.customers.find(x => x.id === id) || {}).name || "";

export const searchBtn = c => `<button class="bell" data-search aria-label="${L[c.st.lang].search}" title="${L[c.st.lang].search}">🔍</button>`;

function openSearch(c) {
  if (document.querySelector("dialog[open]")) return;
  const { st } = c, l = L[st.lang], d = document.createElement("dialog"); d.className = "nd";
  d.innerHTML = `<input id="sq" type="search" placeholder="${l.sph}" style="width:100%"><div id="sr" style="max-height:55vh;overflow:auto;margin-top:10px"><p class="sub">${l.shint}</p></div><div class="row" style="margin-top:12px"><button class="btn alt" data-x>${l.close}</button></div>`;
  document.body.appendChild(d); d.showModal(); d.onclose = () => { d.remove(); c.render(); };
  d.querySelector("[data-x]").onclick = () => d.close();
  const sq = d.querySelector("#sq"), sr = d.querySelector("#sr");
  const grp = (title, rows) => rows.length ? `<h4 style="margin:12px 0 4px">${title}</h4>${rows.slice(0, 8).join("")}${rows.length > 8 ? `<p class="sub">${l.more(rows.length - 8)}</p>` : ""}` : "";
  sq.oninput = () => { const q = nz(sq.value.trim()); if (!q) { sr.innerHTML = `<p class="sub">${l.shint}</p>`; return; }
    const cs = st.customers.filter(x => nz(`${x.name} ${x.phone} ${x.notes}`).includes(q)).map(x => `<button class="nt" data-t="c" data-id="${x.id}">${esc(x.name)} <span class="sub" dir="ltr">${esc(x.phone)}</span></button>`);
    const ms = st.models.filter(m => nz(`${m.number} ${m.name} ${m.machine} ${m.gauge} ${m.notes} ${cn(c, m.customerId)}`).includes(q)).map(m => `<button class="nt" data-t="m" data-id="${m.id}">#${m.number || ""} ${esc(m.name)} — ${esc(cn(c, m.customerId))} <span class="sub">${l.s[m.status] || ""} · ${yearOf(m)}</span></button>`);
    const ps = st.payments.filter(p => nz(`${cn(c, p.customerId)} ${p.amount} ${p.date} ${p.notes}`).includes(q)).map(p => `<button class="nt" data-t="p" data-id="${p.id}">${p.date || ""} — ${esc(cn(c, p.customerId))} — ${c.fmt(p.amount)}${p.void ? ` <span class="sub">(${l.voided})</span>` : ""}</button>`);
    sr.innerHTML = grp(l.cust, cs) + grp(l.mods, ms) + grp(l.pays, ps) || `<p class="sub">${l.noRes}</p>`; };
  sr.onclick = e => { const b = e.target.closest("[data-t]"); if (!b) return; const t = b.dataset.t, id = b.dataset.id;
    const setY = y => { st.year = String(y); localStorage.year = String(y); };
    st.filter = ""; st.cid = null;
    if (t === "c") { st.view = "customers"; st.cid = id; }
    else if (t === "m") { const m = st.models.find(x => x.id === id); if (m) { setY(yearOf(m)); st.view = "customers"; st.cid = m.customerId; } }
    else { const p = st.payments.find(x => x.id === id); if (p) setY(payYear(p)); st.view = "payments"; }
    d.close(); };
  sq.focus();
}

function tables(c) {
  const { st } = c, y = st.year, l = L[st.lang];
  const ms = st.models.filter(m => yearOf(m) === y).sort((a, b) => (+a.number || 0) - (+b.number || 0));
  const ps = st.payments.filter(p => !p.void && payYear(p) === y).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const cust = st.customers.map(cu => { const mm = st.models.filter(m => m.customerId === cu.id && m.status !== "canceled");
    const total = mm.reduce((a, m) => a + (+m.price || 0), 0), paid = st.payments.filter(p => p.customerId === cu.id && !p.void).reduce((a, p) => a + (+p.amount || 0), 0);
    return [cu.name || "", cu.phone || "", mm.length, total, paid, total - paid, cu.trust || 3, cu.notes || ""]; });
  return { y, total:ms.filter(m => m.status !== "canceled").reduce((a, m) => a + (+m.price || 0), 0), paid:ps.reduce((a, p) => a + (+p.amount || 0), 0),
    C:{ h:l.hC, r:cust, m:[3,4,5] },
    M:{ h:l.hM, r:ms.map(m => [m.number || "", m.name || "", cn(c, m.customerId), m.machine || "", m.gauge || "", m.receivedDate || "", m.startDate || "", m.deliveryDate || "", +m.price || 0, paidOf(c, m.id), l.s[m.status] || "", m.notes || ""]), m:[8,9] },
    P:{ h:l.hP, r:ps.map(p => [p.date || "", cn(c, p.customerId), l.m[p.method] || "", +p.amount || 0, p.notes || ""]), m:[3] } };
}
const loadX = () => window.XLSX ? Promise.resolve(window.XLSX) : new Promise((res, rej) => { const s = document.createElement("script");
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; s.onload = () => res(window.XLSX); s.onerror = rej; document.head.appendChild(s); });
async function exportXlsx(c) {
  const l = L[c.st.lang]; let X; try { X = await loadX(); } catch { return alert(l.noLib); }
  const t = tables(c), wb = X.utils.book_new();
  [[l.sCust, t.C], [l.sMod + " " + t.y, t.M], [l.sPay + " " + t.y, t.P]].forEach(([n, s]) => X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([s.h, ...s.r]), n.slice(0, 31)));
  if (c.st.lang === "ar") wb.Workbook = { Views:[{ RTL:true }] };
  X.writeFile(wb, `nasq-${t.y}.xlsx`);
}
function exportPdf(c) {
  const l = L[c.st.lang], t = tables(c), w = window.open("", "_blank"); if (!w) return alert(l.popup);
  const tb = s => `<table><tr>${s.h.map(h => `<th>${h}</th>`).join("")}</tr>${s.r.map(r => `<tr>${r.map((v, i) => `<td>${s.m.includes(i) ? c.fmt(v) : esc(v)}</td>`).join("")}</tr>`).join("")}</table>`;
  w.document.write(`<!doctype html><html dir="${c.st.lang === "ar" ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>NASQ ${t.y}</title><style>body{font-family:system-ui,Arial,sans-serif;padding:24px;color:#1d2b4a}
  table{width:100%;border-collapse:collapse;margin:10px 0 22px;font-size:12px}td,th{border-bottom:1px solid #ccc;padding:6px;text-align:start}h1{margin:0}@media print{button{display:none}}</style></head>
  <body><h1>NASQ</h1><h2>${l.rep} ${t.y}</h2><p><b>${l.hC[3]}: ${c.fmt(t.total)} | ${l.hC[4]}: ${c.fmt(t.paid)}</b></p>
  <h3>${l.sMod}</h3>${tb(t.M)}<h3>${l.sPay}</h3>${tb(t.P)}<h3>${l.sCust}</h3>${tb(t.C)}<button onclick="print()">${l.print}</button></body></html>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 500);
}
const COLS = ["models","customers","payments","years"];
function backup(c) {
  const data = {}; COLS.forEach(k => data[k] = c.st[k] || []);
  download(`nasq-backup-${iso(new Date())}.json`, new Blob([JSON.stringify({ app:"nasq", version:1, at:Date.now(), by:c.st.user.email, data })], { type:"application/json" }));
  localStorage.nasq_lastbackup = iso(new Date()); c.render();
}
const AL = { ar:{ auto:"نسخ احتياطي تلقائي يومي داخل Firebase (آخر 14 يوم)", last:d => `آخر نسخة تلقائية: ${d}`, none:"لسه ماتعملتش نسخة تلقائية.", pick:"استرجاع من النسخة المختارة", big:"البيانات كبيرة على النسخ التلقائي. استخدم النسخة اليدوية." },
  en:{ auto:"Automatic daily backup inside Firebase (last 14 days)", last:d => `Last automatic backup: ${d}`, none:"No automatic backup yet.", pick:"Restore the selected backup", big:"Data is too large for automatic backup. Use manual backup." } };
const bcol = (c, id) => doc(c.db, "users", c.uid, "backups", id);
const sdoc = c => doc(c.db, "users", c.uid, "settings", "main");
let running = false, failedDay = "";
export async function autoBackup(c) {
  const { st } = c, today = iso(new Date());
  if (st.role !== "owner" || running || failedDay === today || !st.settingsLoaded) return;
  if (!["models","payments","customers","years"].every(k => st.ready && st.ready[k])) return;
  if (st.settings.autoBackup === false || st.settings.lastAuto === today) return;
  running = true;
  try {
    const parts = COLS.map(k => [k, JSON.stringify(st[k])]);
    if (parts.some(([, j]) => j.length > 900000)) { await setDoc(sdoc(c), { lastAuto:today, autoErr:"big" }, { merge:true }); return; }
    for (const [k, j] of parts) await setDoc(bcol(c, `${today}_${k}`), { json:j, col:k, date:today, at:Date.now() });
    const dates = [...new Set([...(st.settings.autoDates || []), today])].sort();
    for (const d of dates.slice(0, -14)) for (const k of COLS) await deleteDoc(bcol(c, `${d}_${k}`));
    await setDoc(sdoc(c), { lastAuto:today, autoDates:dates.slice(-14), autoErr:"" }, { merge:true });
  } catch (e) { console.error(e); failedDay = today; } finally { running = false; }
}
const rowsOf = j => { const rows = []; COLS.forEach(k => (j.data[k] || []).forEach(r => { if (r && r.id) { const { id, ...rest } = r; rows.push([k, String(id), rest]); } })); return rows; };
async function applyRows(c, rows) {
  const l = L[c.st.lang]; if (!rows.length) return alert(l.badFile); if (!confirm(l.sureRestore(rows.length))) return;
  try { for (let i = 0; i < rows.length; i += 400) { const b = writeBatch(c.db); rows.slice(i, i + 400).forEach(([k, id, r]) => b.set(doc(collection(c.db, "users", c.uid, k), id), r)); await b.commit(); } alert(l.restored); }
  catch (e) { console.error(e); alert(l.err); }
}
async function restore(c, file) {
  let j; try { j = JSON.parse(await file.text()); } catch { return alert(L[c.st.lang].badFile); }
  if (!j || j.app !== "nasq" || !j.data) return alert(L[c.st.lang].badFile);
  return applyRows(c, rowsOf(j));
}
async function restoreAuto(c, date) {
  if (!date) return;
  try { const data = {}; for (const k of COLS) { const s = await getDoc(bcol(c, `${date}_${k}`)); data[k] = s.exists() ? JSON.parse(s.data().json) : []; } await applyRows(c, rowsOf({ data })); }
  catch (e) { console.error(e); alert(L[c.st.lang].err); }
}
function autoUi(c) {
  const { st } = c, a = AL[st.lang], s = st.settings || {}, ds = [...(s.autoDates || [])].reverse();
  return `<label class="chk"><input type="checkbox" id="ab" ${s.autoBackup === false ? "" : "checked"}> ${a.auto}</label><p class="sub">${s.lastAuto ? a.last(s.lastAuto) : a.none}${s.autoErr === "big" ? " — " + a.big : ""}</p>
  ${ds.length ? `<div class="row"><select id="ad">${ds.map(d => `<option>${d}</option>`).join("")}</select><button class="btn alt" data-tool="restoreauto">${a.pick}</button></div>` : ""}`;
}
export function toolsPanel(c) {
  const { st } = c, l = L[st.lang], own = st.role === "owner", adm = own || st.role === "manager", lb = localStorage.nasq_lastbackup || "";
  const stale = !lb || Date.now() - new Date(lb) > 7 * 864e5;
  const rows = (st.log || []).map(x => `<tr><td>${new Date(x.at).toLocaleString(st.lang === "ar" ? "ar-EG-u-nu-latn" : "en-US")}</td><td dir="ltr">${esc(x.by || "")}</td><td>${l.types[x.type] || esc(x.type)}</td>
    <td>${esc(x.label || (x.after && x.after.amount != null ? c.fmt(x.after.amount) : x.ref || ""))}${x.to ? ` → ${l.s[x.to] || ""}` : ""}</td></tr>`).join("");
  return `<div class="panel" id="tools" style="margin-top:22px"><h3>${l.title}</h3><p class="sub">${l.exportHint(st.year)}</p>
  <div class="row"><button class="btn alt" data-tool="xlsx">${l.xlsx}</button><button class="btn alt" data-tool="pdf">${l.pdf}</button></div>
  ${adm ? `<h3 style="margin-top:18px">${l.backup}</h3><p class="${stale ? "err" : "sub"}">${lb ? l.last(lb) + (stale ? " — " + l.stale : "") : l.never}</p>
  <div class="row"><button class="btn" data-tool="backup">${l.doBackup}</button>${own ? `<button class="btn alt" data-tool="restore">${l.doRestore}</button><input type="file" id="rf" accept=".json,application/json" hidden>` : ""}</div><p class="sub">${l.autoNote}</p>${own ? autoUi(c) : ""}
  <h3 style="margin-top:18px">${l.log}</h3><div class="tw"><table><thead><tr><th>${l.time}</th><th>${l.by}</th><th>${l.act}</th><th>${l.item}</th></tr></thead><tbody>${rows}</tbody></table></div>` : ""}</div>`;
}
export function bindTools(c) {
  cur = c;
  if (!window.__nasqK) { window.__nasqK = 1; addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && cur && cur.st.user && cur.uid) { e.preventDefault(); openSearch(cur); } }); }
  document.querySelectorAll("[data-search]").forEach(b => b.onclick = () => openSearch(c));
  const root = document.querySelector("#tools"); if (!root) return;
  const rf = root.querySelector("#rf"); if (rf) rf.onchange = () => { if (rf.files[0]) restore(c, rf.files[0]); rf.value = ""; };
  const ab = root.querySelector("#ab"); if (ab) ab.onchange = () => setDoc(sdoc(c), { autoBackup:ab.checked }, { merge:true });
  root.onclick = e => { const b = e.target.closest("[data-tool]"); if (!b) return; const a = b.dataset.tool;
    if (a === "xlsx") exportXlsx(c); else if (a === "pdf") exportPdf(c); else if (a === "backup") backup(c); else if (a === "restore" && rf) rf.click(); else if (a === "restoreauto") restoreAuto(c, root.querySelector("#ad").value); };
}
