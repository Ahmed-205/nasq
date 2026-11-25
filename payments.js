import { collection, addDoc, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { payYear, isLocked, lockMsg } from "./years.js";
export const METHODS = ["cash","vodafone","instapay","bank","other"];
export const L = {
  ar: { add:"إضافة دفعة", edit:"تعديل", cancel:"إلغاء", save:"حفظ", search:"بحث باسم العميل...", customer:"العميل", amount:"المبلغ", date:"التاريخ", method:"طريقة الدفع",
    notes:"ملاحظات", alloc:"توزيع الدفعة على الموديلات (اختياري)", left:"المتبقي", auto:"توزيع تلقائي", unalloc:"غير موزّع (على الحساب)", noM:"لا توجد موديلات عليها مبالغ مستحقة.",
    needC:"أضف عميل أولًا من شاشة العملاء.", needCust:"اختر العميل.", needAmt:"اكتب مبلغ أكبر من صفر.", overA:"مجموع التوزيع أكبر من مبلغ الدفعة.",
    overR:"أحد المبالغ الموزّعة أكبر من المتبقي على الموديل.", sureV:"إلغاء الدفعة؟ هتفضل ظاهرة في السجل لكن مش هتتحسب.", err:"حصل خطأ في الحفظ. حاول تاني.",
    none:"لا توجد دفعات بعد.", other:n => `فيه ${n} دفعة في سنوات مالية تانية. غيّر السنة من القائمة اللي فوق.`, voided:"ملغاة", rc:"إيصال", vd:"إلغاء", onAcct:"على الحساب", stmt:"كشف حساب", model:"الموديل", price:"السعر", paid:"المدفوع", rest:"المتبقي",
    total:"الإجمالي", rcTitle:"إيصال دفع", rcNo:"رقم الإيصال", print:"طباعة", popup:"المتصفح منع النافذة. اسمح بالنوافذ المنبثقة وجرّب تاني.", cnt:"موديل",
    m:{cash:"نقدًا",vodafone:"Vodafone Cash",instapay:"InstaPay",bank:"تحويل بنكي",other:"أخرى"} },
  en: { add:"Add payment", edit:"Edit", cancel:"Cancel", save:"Save", search:"Search by customer...", customer:"Customer", amount:"Amount", date:"Date", method:"Method",
    notes:"Notes", alloc:"Split across models (optional)", left:"Left", auto:"Auto-split", unalloc:"Unallocated (on account)", noM:"No models with an outstanding balance.",
    needC:"Add a customer first from the Customers screen.", needCust:"Choose a customer.", needAmt:"Enter an amount above zero.", overA:"Split total is more than the payment.",
    overR:"A split amount is more than what's left on that model.", sureV:"Void this payment? It stays in the log but won't be counted.", err:"Couldn't save. Try again.",
    none:"No payments yet.", other:n => `${n} payment(s) belong to other financial years. Change the year from the menu above.`, voided:"Voided", rc:"Receipt", vd:"Void", onAcct:"On account", stmt:"Account statement", model:"Model", price:"Price", paid:"Paid", rest:"Outstanding",
    total:"Total", rcTitle:"Payment receipt", rcNo:"Receipt no.", print:"Print", popup:"The browser blocked the window. Allow pop-ups and try again.", cnt:"models",
    m:{cash:"Cash",vodafone:"Vodafone Cash",instapay:"InstaPay",bank:"Bank transfer",other:"Other"} }
};
let pq = "", pf = { cu:"", df:"", dt:"" };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const iso = d => d.toISOString().slice(0,10);
const col = (c, k) => collection(c.db, "users", c.uid, k);
const cname = (c, id) => (c.st.customers.find(x => x.id === id) || {}).name || "";
export const paidOf = (c, mid) => c.st.payments.filter(p => !p.void).reduce((a,p) => a + (+(p.alloc||{})[mid] || 0), 0);

function printWin(c, title, body) {
  const l = L[c.st.lang], w = window.open("", "_blank"); if (!w) return alert(l.popup);
  w.document.write(`<!doctype html><html dir="${c.st.lang==="ar"?"rtl":"ltr"}"><head><meta charset="utf-8"><title>${title}</title><style>
  body{font-family:system-ui,Arial,sans-serif;padding:32px;max-width:760px;margin:auto;color:#1d2b4a}h1{margin:0}table{width:100%;border-collapse:collapse;margin:14px 0}
  td,th{border-bottom:1px solid #ccc;padding:8px;text-align:start}.big{font-size:22px;font-weight:700}@media print{button{display:none}}</style></head>
  <body>${body}<p><button onclick="print()">${l.print}</button></p></body></html>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 400);
}
function printReceipt(c, p) {
  const l = L[c.st.lang], ms = Object.keys(p.alloc||{}).map(id => c.st.models.find(m => m.id === id)).filter(Boolean);
  printWin(c, l.rcTitle, `<h1>NASQ</h1><h2>${l.rcTitle}</h2><p>${l.rcNo}: <b>${p.id.slice(0,6).toUpperCase()}</b><br>${l.date}: ${p.date||""}<br>${l.customer}: <b>${esc(cname(c,p.customerId))}</b><br>${l.method}: ${l.m[p.method]||""}</p>
  <p class="big">${l.amount}: ${c.fmtR(p.amount)}</p>${ms.length ? `<table>${ms.map(m=>`<tr><td>${esc(m.name)}</td><td>${c.fmtR(p.alloc[m.id])}</td></tr>`).join("")}</table>` : `<p>${l.onAcct}</p>`}${p.notes?`<p>${esc(p.notes)}</p>`:""}`);
}
export function printStatement(c, cid) {
  const l = L[c.st.lang], x = c.st.customers.find(y => y.id === cid); if (!x) return;
  const ms = c.st.models.filter(m => m.customerId === cid && m.status !== "canceled").sort((a,b) => (+a.number||0) - (+b.number||0));
  const ps = c.st.payments.filter(p => p.customerId === cid && !p.void).sort((a,b) => (a.date||"").localeCompare(b.date||""));
  const total = ms.reduce((a,m) => a + (+m.price||0), 0), paid = ps.reduce((a,p) => a + (+p.amount||0), 0);
  printWin(c, l.stmt, `<h1>NASQ</h1><h2>${l.stmt}</h2><p><b>${esc(x.name)}</b> ${esc(x.phone)}<br>${iso(new Date())}</p>
  <table><tr><th>#</th><th>${l.model}</th><th>${l.price}</th><th>${l.paid}</th><th>${l.left}</th></tr>${ms.map(m=>{const pd=paidOf(c,m.id);return `<tr><td>${m.number||""}</td><td>${esc(m.name)}</td><td>${c.fmtR(m.price)}</td><td>${c.fmtR(pd)}</td><td>${c.fmtR((+m.price||0)-pd)}</td></tr>`;}).join("")}</table>
  <table><tr><th>${l.date}</th><th>${l.method}</th><th>${l.amount}</th></tr>${ps.map(p=>`<tr><td>${p.date||""}</td><td>${l.m[p.method]||""}</td><td>${c.fmtR(p.amount)}</td></tr>`).join("")}</table>
  <p class="big">${l.total}: ${c.fmtR(total)} | ${l.paid}: ${c.fmtR(paid)} | ${l.rest}: ${c.fmtR(total-paid)}</p>`);
}

function payRows(c) {
  const l = L[c.st.lang], q = pq.toLowerCase();
  const list = c.st.payments.filter(p => payYear(p) === c.st.year && cname(c,p.customerId).toLowerCase().includes(q) && (!pf.cu || p.customerId === pf.cu) && (!pf.df || (p.date || "") >= pf.df) && (!pf.dt || ((p.date || "") !== "" && p.date <= pf.dt))).sort((a,b) => (b.date||"").localeCompare(a.date||"") || (b.created||0) - (a.created||0));
  if (!list.length) { const o = c.st.payments.filter(p => payYear(p) !== c.st.year).length; return `<tr><td colspan="6" class="sub">${l.none}${o ? " — " + l.other(o) : ""}</td></tr>`; }
  return list.map(p => { const n = Object.keys(p.alloc||{}).length;
    return `<tr class="${p.void?"void-r":""}"><td>${p.date||""}</td><td>${esc(cname(c,p.customerId))}</td><td>${l.m[p.method]||""}</td><td>${c.fmt(p.amount)}</td><td>${n?`${c.num(n)} ${l.cnt}`:l.onAcct}</td>
    <td>${p.void?`<span class="chip">${l.voided}</span>`:`<button class="ib" data-act="rc" data-id="${p.id}">${l.rc}</button><button class="ib" data-act="edit" data-id="${p.id}">${l.edit}</button><button class="ib d" data-act="void" data-id="${p.id}">${l.vd}</button>`}</td></tr>`; }).join("");
}
export function paymentsView(c) {
  const l = L[c.st.lang];
  return `<div id="pay"><div class="top"><h2>${c.t("payments")}</h2></div><div class="tools"><input id="q" type="search" placeholder="${l.search}" value="${esc(pq)}"><button class="btn" id="add">${l.add}</button></div>
  <div class="tools"><select id="pc"><option value="">${c.st.lang === "ar" ? "كل العملاء" : "All customers"}</option>${[...c.st.customers].sort((a, b) => (a.name || "").localeCompare(b.name || "")).map(x => `<option value="${x.id}" ${pf.cu === x.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select>
  <input id="pdf" type="date" value="${pf.df}"><input id="pdt" type="date" value="${pf.dt}"></div>
  <div class="tw"><table><thead><tr><th>${l.date}</th><th>${l.customer}</th><th>${l.method}</th><th>${l.amount}</th><th>${l.alloc.split(" (")[0]}</th><th></th></tr></thead><tbody id="rows">${payRows(c)}</tbody></table></div></div>`;
}

function openPay(c, item) {
  const l = L[c.st.lang], { st } = c;
  if (!st.customers.length) return alert(l.needC);
  if (item && isLocked(st, payYear(item))) return alert(lockMsg(st.lang));
  const cy = String(new Date().getFullYear()), dd = st.year === cy ? iso(new Date()) : st.year < cy ? st.year + "-12-31" : st.year + "-01-01";
  const b = item || { date:dd, method:"cash", alloc:{} };
  const d = document.createElement("dialog");
  d.innerHTML = `<h3 style="margin:0 0 14px">${item?l.edit:l.add}</h3><div class="fg">
  <label class="field full"><span>${l.customer}</span><select data-k="customerId" ${item?"disabled":""}><option value=""></option>${st.customers.map(x=>`<option value="${x.id}" ${b.customerId===x.id?"selected":""}>${esc(x.name)}</option>`).join("")}</select></label>
  <label class="field"><span>${l.amount}</span><input data-k="amount" type="number" min="0" step="any" dir="ltr" value="${b.amount??""}"></label>
  <label class="field"><span>${l.date}</span><input data-k="date" type="date" value="${b.date||""}"></label>
  <label class="field full"><span>${l.method}</span><select data-k="method">${METHODS.map(m=>`<option value="${m}" ${b.method===m?"selected":""}>${l.m[m]}</option>`).join("")}</select></label>
  <div class="full" id="al"></div>
  <label class="field full"><span>${l.notes}</span><textarea data-k="notes">${esc(b.notes)}</textarea></label></div>
  <p class="err" role="alert"></p><div class="row"><button class="btn" data-s>${l.save}</button><button class="btn alt" data-x>${l.cancel}</button></div>`;
  document.body.appendChild(d); d.showModal();
  d.onclose = () => { d.remove(); c.render(); };
  const val = k => d.querySelector(`[data-k="${k}"]`).value, err = d.querySelector(".err");
  const remain = m => (+m.price||0) - (paidOf(c, m.id) - (+(b.alloc||{})[m.id] || 0));
  const upd = () => { const un = d.querySelector("#un"); if (!un) return; let s = 0; d.querySelectorAll("[data-m]").forEach(i => s += +i.value || 0);
    const r = (+val("amount") || 0) - s; un.textContent = `${l.unalloc}: ${c.fmt(r)}`; un.style.color = r < 0 ? "var(--accent)" : ""; };
  const draw = () => { const cid = item ? item.customerId : val("customerId");
    const ms = st.models.filter(m => m.customerId === cid && m.status !== "canceled" && (remain(m) > 0.001 || (b.alloc||{})[m.id])).sort((x,y) => (+x.number||0) - (+y.number||0));
    d.querySelector("#al").innerHTML = cid ? `<div class="field"><span>${l.alloc}</span></div>${ms.length ? ms.map(m=>`<label class="al"><span>${c.num(+m.number||0)} ${esc(m.name)} - ${l.left} ${c.fmt(remain(m))}</span><input data-m="${m.id}" data-r="${remain(m)}" type="number" min="0" step="any" dir="ltr" value="${(b.alloc||{})[m.id]||""}"></label>`).join("") : `<p class="sub">${l.noM}</p>`}
      <div class="row" style="margin-top:8px"><button class="btn alt" data-auto type="button">${l.auto}</button><span class="sub" id="un"></span></div>` : "";
    const au = d.querySelector("[data-auto]"); if (au) au.onclick = () => { let a = +val("amount") || 0;
      d.querySelectorAll("[data-m]").forEach(i => { const v = Math.max(0, Math.min(a, +i.dataset.r)); i.value = v || ""; a -= v; }); upd(); };
    upd(); };
  d.querySelector('[data-k="customerId"]').onchange = draw; d.addEventListener("input", upd); draw();
  d.querySelector("[data-x]").onclick = () => d.close();
  d.querySelector("[data-s]").onclick = async () => {
    const data = { customerId:item ? item.customerId : val("customerId"), amount:+val("amount") || 0, date:val("date"), method:val("method"), notes:val("notes").trim(), alloc:{} };
    let sum = 0, over = false;
    d.querySelectorAll("[data-m]").forEach(i => { const v = +i.value || 0; if (v > 0) { if (v > +i.dataset.r + 0.001) over = true; data.alloc[i.dataset.m] = v; sum += v; } });
    if (!data.customerId) return (err.textContent = l.needCust);
    if (data.amount <= 0) return (err.textContent = l.needAmt);
    if (isLocked(st, payYear(data))) return (err.textContent = lockMsg(st.lang));
    if (sum > data.amount + 0.001) return (err.textContent = l.overA);
    if (over) return (err.textContent = l.overR);
    try {
      if (item) { const { id, ...rest } = item;
        await setDoc(doc(col(c,"payments"), id), { ...rest, ...data });
        await addDoc(col(c,"log"), { type:"payment.edit", ref:id, before:rest, after:data, at:Date.now(), by:c.st.user.email });
      } else { const r = await addDoc(col(c,"payments"), { ...data, void:false, created:Date.now() });
        await addDoc(col(c,"log"), { type:"payment.create", ref:r.id, after:data, at:Date.now(), by:c.st.user.email }); }
      if (payYear(data) !== st.year) { st.year = payYear(data); localStorage.year = st.year; }
      d.close();
    } catch (e) { console.error(e); err.textContent = l.err; }
  };
}

export function bindPayments(c) {
  const root = document.querySelector("#pay"); if (!root) return;
  const l = L[c.st.lang];
  const q = root.querySelector("#q"); q.oninput = () => { pq = q.value; root.querySelector("#rows").innerHTML = payRows(c); };
  [["#pc","cu"],["#pdf","df"],["#pdt","dt"]].forEach(([s, k]) => { const el = root.querySelector(s); if (el) el.onchange = () => { pf[k] = el.value; root.querySelector("#rows").innerHTML = payRows(c); }; });
  root.querySelector("#add").onclick = () => openPay(c, null);
  root.onclick = async e => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const p = c.st.payments.find(x => x.id === b.dataset.id); if (!p) return;
    if (b.dataset.act === "rc") printReceipt(c, p);
    else if (b.dataset.act === "edit") openPay(c, p);
    else if (b.dataset.act === "void") {
      if (isLocked(c.st, payYear(p))) return alert(lockMsg(c.st.lang));
      if (!confirm(l.sureV)) return;
      await setDoc(doc(col(c,"payments"), p.id), { void:true, voidedAt:Date.now() }, { merge:true });
      await addDoc(col(c,"log"), { type:"payment.void", ref:p.id, at:Date.now(), by:c.st.user.email });
    }
  };
}
