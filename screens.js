import { collection, addDoc, setDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export const STATUS = ["new","scheduled","working","waiting","edit","done","delivered","canceled"];
const L = {
  ar: { add:"إضافة", edit:"تعديل", del:"حذف", save:"حفظ", cancel:"إلغاء", search:"بحث...", name:"الاسم", phone:"الهاتف", trust:"درجة الثقة", notes:"ملاحظات",
    count:"الموديلات", total:"الحساب", paid:"المدفوع", rest:"المتبقي", number:"الرقم", mname:"اسم الموديل", customer:"العميل", machine:"نوع الماكينة", gauge:"الجوج",
    received:"تاريخ الاستلام", start:"بدء الرسم", delivery:"التسليم", price:"السعر", status:"الحالة", all:"كل الحالات", back:"رجوع", none:"لا توجد بيانات بعد.",
    newC:"عميل جديد", editC:"تعديل عميل", newM:"موديل جديد", editM:"تعديل موديل", needC:"أضف عميل أولًا من شاشة العملاء.", needName:"الاسم مطلوب.",
    needCust:"اختر العميل.", hasM:"لا يمكن حذف عميل له موديلات.", sure:"متأكد من الحذف؟", err:"حصل خطأ في الحفظ. حاول تاني.",
    s:{new:"لم يبدأ العمل",scheduled:"مجدول للرسم",working:"جاري العمل",waiting:"منتظر رد العميل",edit:"مطلوب تعديل",done:"تم الانتهاء",delivered:"تم التسليم",canceled:"تم الإلغاء"} },
  en: { add:"Add", edit:"Edit", del:"Delete", save:"Save", cancel:"Cancel", search:"Search...", name:"Name", phone:"Phone", trust:"Trust", notes:"Notes",
    count:"Models", total:"Total", paid:"Paid", rest:"Outstanding", number:"No.", mname:"Model name", customer:"Customer", machine:"Machine", gauge:"Gauge",
    received:"Received", start:"Start date", delivery:"Delivery", price:"Price", status:"Status", all:"All statuses", back:"Back", none:"Nothing here yet.",
    newC:"New customer", editC:"Edit customer", newM:"New model", editM:"Edit model", needC:"Add a customer first from the Customers screen.", needName:"Name is required.",
    needCust:"Choose a customer.", hasM:"A customer with models can't be deleted.", sure:"Delete this item?", err:"Couldn't save. Try again.",
    s:{new:"Not started",scheduled:"Scheduled",working:"In progress",waiting:"Waiting on client",edit:"Needs changes",done:"Finished",delivered:"Delivered",canceled:"Canceled"} }
};
const CF = [{k:"name",l:"name",y:"text",f:1},{k:"phone",l:"phone",y:"tel"},{k:"trust",l:"trust",y:"trust"},{k:"notes",l:"notes",y:"area",f:1}];
const MF = [{k:"number",l:"number",y:"number"},{k:"name",l:"mname",y:"text"},{k:"customerId",l:"customer",y:"cust",f:1},{k:"machine",l:"machine",y:"text"},{k:"gauge",l:"gauge",y:"text"},
  {k:"receivedDate",l:"received",y:"date"},{k:"startDate",l:"start",y:"date"},{k:"deliveryDate",l:"delivery",y:"date"},{k:"price",l:"price",y:"number"},
  {k:"status",l:"status",y:"status",f:1},{k:"notes",l:"notes",y:"area",f:1}];
const ui = { k:"", q:"", s:"" };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const sync = k => { if (ui.k !== k) { ui.k = k; ui.q = ""; ui.s = ""; } };
const iso = d => d.toISOString().slice(0,10);
const op = m => !["delivered","done","canceled"].includes(m.status);
const keys = () => { const n = new Date(), td = iso(n), in7 = iso(new Date(n.getTime()+7*864e5));
  return { total:()=>true, year:m=>(m.receivedDate||"").startsWith(td.slice(0,4)), month:m=>(m.receivedDate||"").startsWith(td.slice(0,7)),
    notStarted:m=>["new","scheduled"].includes(m.status), working:m=>["working","edit"].includes(m.status), waiting:m=>m.status==="waiting",
    due:m=>op(m)&&m.deliveryDate>=td&&m.deliveryDate<=in7, late:m=>op(m)&&!!m.deliveryDate&&m.deliveryDate<td }; };
const col = (c, k) => collection(c.db, "users", c.uid, k);
const cname = (c, id) => (c.st.customers.find(x => x.id === id) || {}).name || "";

function acct(c, cu) {
  const ms = c.st.models.filter(m => m.customerId === cu.id && m.status !== "canceled");
  const total = ms.reduce((a,m) => a + (+m.price||0), 0);
  const paid = c.st.payments.filter(p => p.customerId === cu.id).reduce((a,p) => a + (+p.amount||0), 0);
  return { n:ms.length, total, paid, rest:total-paid, ms };
}
const acts = (l, id) => `<button class="ib" data-act="edit" data-id="${id}">${l.edit}</button><button class="ib d" data-act="del" data-id="${id}">${l.del}</button>`;

function custRows(c) {
  const l = L[c.st.lang], q = ui.q.toLowerCase();
  const list = c.st.customers.filter(x => ((x.name||"")+" "+(x.phone||"")).toLowerCase().includes(q)).sort((a,b) => (a.name||"").localeCompare(b.name||""));
  if (!list.length) return `<tr><td colspan="8" class="sub">${l.none}</td></tr>`;
  return list.map(x => { const s = acct(c, x);
    return `<tr><td><button class="nm" data-act="view" data-id="${x.id}">${esc(x.name)}</button></td><td dir="ltr">${esc(x.phone)}</td><td>${c.num(s.n)}</td><td>${c.fmt(s.total)}</td><td>${c.fmt(s.paid)}</td><td>${c.fmt(s.rest)}</td><td>${"★".repeat(x.trust||3)}</td><td>${acts(l,x.id)}</td></tr>`; }).join("");
}
function modelRows(c) {
  const { st } = c, l = L[st.lang], q = ui.q.toLowerCase(), K = keys(), td = iso(new Date());
  const list = st.models.filter(m => (!K[st.filter] || (m.status !== "canceled" && K[st.filter](m))) && (!ui.s || m.status === ui.s)
    && ((m.name||"")+" "+(m.number||"")+" "+cname(c,m.customerId)).toLowerCase().includes(q)).sort((a,b) => (+b.number||0) - (+a.number||0));
  if (!list.length) return `<tr><td colspan="8" class="sub">${l.none}</td></tr>`;
  return list.map(m => `<tr><td>${c.num(+m.number||0)}</td><td>${esc(m.name)}</td><td>${esc(cname(c,m.customerId))}</td><td>${esc(m.machine)} ${esc(m.gauge)}</td>
    <td class="${op(m)&&m.deliveryDate&&m.deliveryDate<td?"late-d":""}">${m.deliveryDate||""}</td><td>${c.fmt(m.price)}</td>
    <td><select data-act="st" data-id="${m.id}">${STATUS.map(s=>`<option value="${s}" ${m.status===s?"selected":""}>${l.s[s]}</option>`).join("")}</select></td><td>${acts(l,m.id)}</td></tr>`).join("");
}
const tools = (c, label, extra="") => { const l = L[c.st.lang];
  return `<div class="tools"><input id="q" type="search" placeholder="${l.search}" value="${esc(ui.q)}">${extra}<button class="btn" id="add">${l.add} ${label}</button></div>`; };

export function customersView(c) {
  sync("c"); const { st } = c, l = L[st.lang];
  const x = st.customers.find(y => y.id === st.cid);
  if (x) { const s = acct(c, x);
    return `<div id="scr" data-k="c"><div class="top"><div><h2>${esc(x.name)}</h2><p class="sub" dir="ltr">${esc(x.phone)} ${"★".repeat(x.trust||3)}</p></div>
    <div class="row"><button class="btn alt" data-act="edit" data-id="${x.id}">${l.edit}</button><button class="btn alt" data-act="back">${l.back}</button></div></div>
    <div class="grid"><div class="stat money"><b>${c.fmt(s.total)}</b><span>${l.total}</span></div><div class="stat money"><b>${c.fmt(s.paid)}</b><span>${l.paid}</span></div><div class="stat money"><b>${c.fmt(s.rest)}</b><span>${l.rest}</span></div></div>
    <div class="panel"><h3>${c.t("models")}</h3>${s.ms.length ? `<ul class="list">${s.ms.map(m=>`<li><span>${c.num(+m.number||0)} - ${esc(m.name)} (${l.s[m.status]||""})</span><b>${c.fmt(m.price)}</b></li>`).join("")}</ul>` : `<p class="sub">${l.none}</p>`}</div>
    ${x.notes ? `<div class="panel"><h3>${l.notes}</h3><p>${esc(x.notes)}</p></div>` : ""}</div>`; }
  return `<div id="scr" data-k="c"><div class="top"><h2>${c.t("customers")}</h2></div>${tools(c, l.customer)}
  <div class="tw"><table><thead><tr><th>${l.name}</th><th>${l.phone}</th><th>${l.count}</th><th>${l.total}</th><th>${l.paid}</th><th>${l.rest}</th><th>${l.trust}</th><th></th></tr></thead><tbody id="rows">${custRows(c)}</tbody></table></div></div>`;
}
export function modelsView(c) {
  sync("m"); const { st } = c, l = L[st.lang];
  const chip = keys()[st.filter] && st.filter !== "total" ? `<button class="chip" data-act="clr">${c.t(st.filter)} ✕</button>` : "";
  const sel = `<select id="fs"><option value="">${l.all}</option>${STATUS.map(s=>`<option value="${s}" ${ui.s===s?"selected":""}>${l.s[s]}</option>`).join("")}</select>`;
  return `<div id="scr" data-k="m"><div class="top"><h2>${c.t("models")}</h2>${chip}</div>${tools(c, l.mname, sel)}
  <div class="tw"><table><thead><tr><th>${l.number}</th><th>${l.mname}</th><th>${l.customer}</th><th>${l.machine}</th><th>${l.delivery}</th><th>${l.price}</th><th>${l.status}</th><th></th></tr></thead><tbody id="rows">${modelRows(c)}</tbody></table></div></div>`;
}

function fieldHtml(c, f, v) {
  const l = L[c.st.lang]; let el;
  if (f.y === "area") el = `<textarea data-k="${f.k}">${esc(v)}</textarea>`;
  else if (f.y === "trust") el = `<select data-k="trust">${[1,2,3,4,5].map(n=>`<option value="${n}" ${+v===n?"selected":""}>${"★".repeat(n)}</option>`).join("")}</select>`;
  else if (f.y === "status") el = `<select data-k="status">${STATUS.map(s=>`<option value="${s}" ${v===s?"selected":""}>${l.s[s]}</option>`).join("")}</select>`;
  else if (f.y === "cust") el = `<select data-k="customerId"><option value=""></option>${c.st.customers.map(x=>`<option value="${x.id}" ${v===x.id?"selected":""}>${esc(x.name)}</option>`).join("")}</select>`;
  else el = `<input data-k="${f.k}" type="${f.y}" value="${esc(v)}" ${f.y==="number"?'min="0" step="any" dir="ltr"':""}>`;
  return `<label class="field ${f.f?"full":""}"><span>${l[f.l]}</span>${el}</label>`;
}
function openForm(c, kind, item) {
  const l = L[c.st.lang];
  if (kind === "m" && !c.st.customers.length) return alert(l.needC);
  const base = item || (kind === "c" ? { trust:3 } : { status:"new", number:Math.max(0, ...c.st.models.map(m => +m.number||0)) + 1, receivedDate:iso(new Date()) });
  const d = document.createElement("dialog");
  d.innerHTML = `<h3 style="margin:0 0 14px">${l[(item?"edit":"new") + (kind==="c"?"C":"M")]}</h3><div class="fg">${(kind==="c"?CF:MF).map(f => fieldHtml(c, f, base[f.k] ?? "")).join("")}</div>
    <p class="err" role="alert"></p><div class="row"><button class="btn" data-s>${l.save}</button><button class="btn alt" data-x>${l.cancel}</button></div>`;
  document.body.appendChild(d); d.showModal();
  d.onclose = () => { d.remove(); c.render(); };
  d.querySelector("[data-x]").onclick = () => d.close();
  d.querySelector("[data-s]").onclick = async () => {
    const data = {}, err = d.querySelector(".err");
    d.querySelectorAll("[data-k]").forEach(e => { data[e.dataset.k] = e.type === "number" ? (e.value === "" ? 0 : +e.value) : e.value.trim(); });
    if (kind === "c") data.trust = +data.trust || 3;
    if (!data.name) return (err.textContent = l.needName);
    if (kind === "m" && !data.customerId) return (err.textContent = l.needCust);
    try { const cl = col(c, kind === "c" ? "customers" : "models");
      if (item) await setDoc(doc(cl, item.id), data, { merge:true }); else await addDoc(cl, { ...data, created:Date.now() });
      d.close();
    } catch (e) { console.error(e); err.textContent = l.err; }
  };
}

export function bindScreens(c) {
  const root = document.querySelector("#scr"); if (!root) return;
  const kind = root.dataset.k, l = L[c.st.lang];
  const refresh = () => { const r = root.querySelector("#rows"); if (r) r.innerHTML = kind === "c" ? custRows(c) : modelRows(c); };
  const q = root.querySelector("#q"); if (q) q.oninput = () => { ui.q = q.value; refresh(); };
  const fs = root.querySelector("#fs"); if (fs) fs.onchange = () => { ui.s = fs.value; refresh(); };
  const add = root.querySelector("#add"); if (add) add.onclick = () => openForm(c, kind, null);
  root.onchange = e => { if (e.target.dataset.act === "st") setDoc(doc(col(c, "models"), e.target.dataset.id), { status:e.target.value }, { merge:true }); };
  root.onclick = async e => {
    const b = e.target.closest("[data-act]"); if (!b || b.tagName === "SELECT") return;
    const id = b.dataset.id, a = b.dataset.act, items = kind === "c" ? c.st.customers : c.st.models;
    if (a === "view") { c.st.cid = id; c.render(); }
    else if (a === "back") { c.st.cid = null; c.render(); }
    else if (a === "clr") { c.st.filter = ""; c.render(); }
    else if (a === "edit") openForm(c, kind, items.find(x => x.id === id));
    else if (a === "del") {
      if (kind === "c" && c.st.models.some(m => m.customerId === id)) return alert(l.hasM);
      if (confirm(l.sure)) await deleteDoc(doc(col(c, kind === "c" ? "customers" : "models"), id));
    }
  };
}
