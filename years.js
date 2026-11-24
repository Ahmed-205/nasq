import { collection, doc, setDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const L = {
  ar: { yr:"السنة المالية", locked:"مغلقة", open:"مفتوحة", title:"السنوات المالية", price:"سعر الموديل", savep:"حفظ", close:"إغلاق السنة", reopen:"إعادة فتح", newy:"سنة مالية جديدة",
    n:"الموديلات", value:"القيمة", paid:"المحصّل", rest:"المتبقي", status:"الحالة", create:"إنشاء", cancel:"إلغاء", exists:"السنة دي موجودة بالفعل.", bad:"اكتب سنة صحيحة.",
    sureC:"إغلاق السنة؟ أرقامها هتتأرشف ومش هينفع التعديل فيها إلا بإعادة فتحها (صلاحية مدير).", sureR:"إعادة فتح السنة المغلقة للتعديل؟", err:"حصل خطأ. حاول تاني.",
    lockMsg:"السنة المالية دي مغلقة. افتحها من الإعدادات (صلاحية مدير) لو عاوز تعدّل.", hint:"سعر الموديل بيتكتب تلقائيًا عند إضافة موديل جديد في السنة. المتبقي = قيمة أعمال السنة − المحصّل فيها." },
  en: { yr:"Financial year", locked:"Closed", open:"Open", title:"Financial years", price:"Model price", savep:"Save", close:"Close year", reopen:"Reopen", newy:"New financial year",
    n:"Models", value:"Value", paid:"Collected", rest:"Outstanding", status:"Status", create:"Create", cancel:"Cancel", exists:"That year already exists.", bad:"Enter a valid year.",
    sureC:"Close this year? Its figures are archived and it can't be edited unless reopened (manager permission).", sureR:"Reopen this closed year for editing?", err:"Something went wrong. Try again.",
    lockMsg:"This financial year is closed. Reopen it from Settings (manager permission) to edit.", hint:"The price fills in automatically when you add a model in that year. Outstanding = the year's value − what was collected in it." }
};
export const lockMsg = lang => L[lang].lockMsg;
export const yearOf = m => String(m.year || (m.receivedDate || "").slice(0,4) || new Date().getFullYear());
export const payYear = p => String((p.date || "").slice(0,4) || new Date().getFullYear());
export const yrDoc = (st, y) => st.years.find(x => x.id === String(y)) || { id:String(y), closed:false, defaultPrice:0 };
export const isLocked = (st, y) => !!yrDoc(st, y).closed;
export const yearList = st => [...new Set([...st.years.map(y => y.id), ...st.models.map(yearOf), ...st.payments.map(payYear), String(new Date().getFullYear()), st.year])].sort().reverse();

function yearStats(c, y) {
  const ms = c.st.models.filter(m => m.status !== "canceled" && yearOf(m) === y);
  return { n:ms.length, value:ms.reduce((a,m) => a + (+m.price||0), 0),
    paid:c.st.payments.filter(p => !p.void && payYear(p) === y).reduce((a,p) => a + (+p.amount||0), 0) };
}
export function yearBar(c) {
  const { st } = c, l = L[st.lang];
  return `<div class="yr">${c.bell ? c.bell(c) : ""}<label>${l.yr} <select id="ys">${yearList(st).map(y => `<option ${y===st.year?"selected":""}>${y}</option>`).join("")}</select></label>${isLocked(st, st.year) ? `<span class="lock">🔒 ${l.locked}</span>` : ""}</div>`;
}
export function bindYearBar(c) {
  const s = document.querySelector("#ys");
  if (s) s.onchange = () => { c.st.year = s.value; localStorage.year = s.value; c.st.cid = null; c.render(); };
}
export function yearsPanel(c) {
  const { st } = c, l = L[st.lang];
  const rows = yearList(st).map(y => { const d = yrDoc(st, y), s = d.closed && d.summary ? d.summary : yearStats(c, y);
    return `<tr><td><b>${y}</b></td><td>${d.closed ? `<span class="lock">🔒 ${l.locked}</span>` : l.open}</td><td>${c.num(s.n)}</td><td>${c.fmt(s.value)}</td><td>${c.fmt(s.paid)}</td><td>${c.fmt(s.value - s.paid)}</td>
    <td>${d.closed ? `<span class="sub">${c.fmt(d.defaultPrice)}</span>` : `<input data-p="${y}" type="number" min="0" step="any" dir="ltr" value="${d.defaultPrice || ""}" style="width:90px"><button class="ib" data-ya="save" data-y="${y}">${l.savep}</button>`}</td>
    <td>${d.closed ? `<button class="ib" data-ya="reopen" data-y="${y}">${l.reopen}</button>` : `<button class="ib d" data-ya="close" data-y="${y}">${l.close}</button>`}</td></tr>`; }).join("");
  return `<div id="yrs" class="panel" style="margin-top:22px"><h3>${l.title}</h3><p class="sub">${l.hint}</p>
  <div class="tw"><table><thead><tr><th>${l.yr}</th><th>${l.status}</th><th>${l.n}</th><th>${l.value}</th><th>${l.paid}</th><th>${l.rest}</th><th>${l.price}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
  <div class="row" style="margin-top:12px"><button class="btn" data-ya="new">${l.newy}</button></div></div>`;
}
function openNew(c) {
  const { st } = c, l = L[st.lang], list = yearList(st);
  const d = document.createElement("dialog");
  d.innerHTML = `<h3 style="margin:0 0 14px">${l.newy}</h3><div class="fg">
  <label class="field"><span>${l.yr}</span><input id="ny" type="number" dir="ltr" value="${+list[0] + 1}"></label>
  <label class="field"><span>${l.price}</span><input id="np" type="number" min="0" step="any" dir="ltr" value="${yrDoc(st, list[0]).defaultPrice || ""}"></label></div>
  <p class="err" role="alert"></p><div class="row"><button class="btn" data-s>${l.create}</button><button class="btn alt" data-x>${l.cancel}</button></div>`;
  document.body.appendChild(d); d.showModal();
  d.onclose = () => { d.remove(); c.render(); };
  d.querySelector("[data-x]").onclick = () => d.close();
  d.querySelector("[data-s]").onclick = async () => {
    const y = d.querySelector("#ny").value.trim(), err = d.querySelector(".err");
    if (!/^20\d\d$/.test(y)) return (err.textContent = l.bad);
    if (st.years.some(x => x.id === y)) return (err.textContent = l.exists);
    try { await setDoc(doc(collection(c.db, "users", c.uid, "years"), y), { year:+y, closed:false, defaultPrice:+d.querySelector("#np").value || 0 });
      st.year = y; localStorage.year = y; d.close();
    } catch (e) { console.error(e); err.textContent = l.err; }
  };
}
export function bindYears(c) {
  const root = document.querySelector("#yrs"); if (!root) return;
  const l = L[c.st.lang], yc = () => collection(c.db, "users", c.uid, "years");
  const log = o => addDoc(collection(c.db, "users", c.uid, "log"), { ...o, at:Date.now(), by:c.st.user.email });
  root.onclick = async e => {
    const b = e.target.closest("[data-ya]"); if (!b) return;
    const a = b.dataset.ya, y = b.dataset.y;
    try {
      if (a === "save") { const v = +root.querySelector(`[data-p="${y}"]`).value || 0; await setDoc(doc(yc(), y), { year:+y, defaultPrice:v }, { merge:true }); await log({ type:"year.price", ref:y, price:v }); }
      else if (a === "close") { if (!confirm(l.sureC)) return; await setDoc(doc(yc(), y), { year:+y, closed:true, closedAt:Date.now(), summary:yearStats(c, y) }, { merge:true }); await log({ type:"year.close", ref:y }); }
      else if (a === "reopen") { if (!confirm(l.sureR)) return; await setDoc(doc(yc(), y), { closed:false, reopenedAt:Date.now() }, { merge:true }); await log({ type:"year.reopen", ref:y }); }
      else if (a === "new") openNew(c);
    } catch (err) { console.error(err); alert(l.err); }
  };
}
