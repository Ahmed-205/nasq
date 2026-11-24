import { doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const ROLES = ["manager","staff","viewer"];
const L = {
  ar: { title:"المستخدمون والصلاحيات", hint:"المالك (أنت) له كل الصلاحيات. المدير: يعدّل ويحذف ويغلق السنوات ويضبط الأسعار. الموظف: يضيف ويعدّل بدون حذف أو إغلاق سنوات. المشاهدة: قراءة فقط.",
    invite:"دعوة مستخدم", email:"البريد الإلكتروني", name:"الاسم", role:"الصلاحية", pending:"دعوة معلّقة", remove:"إزالة", cancelInv:"إلغاء الدعوة", save:"إرسال الدعوة", cancel:"إلغاء",
    sure:"إزالة المستخدم؟ هيفقد الوصول فورًا.", done:"اتسجلت الدعوة. ابعت للمستخدم رابط الموقع ليسجّل بنفس البريد ويأكّد بريده.", bad:"بريد غير صحيح.", err:"حصل خطأ. حاول تاني.", you:"أنت",
    r:{owner:"المالك",manager:"مدير",staff:"موظف",viewer:"مشاهدة فقط"} },
  en: { title:"Users & permissions", hint:"The owner (you) has full access. Manager: edit, delete, close years and set prices. Staff: add and edit, but no deleting or closing years. Viewer: read only.",
    invite:"Invite user", email:"Email", name:"Name", role:"Role", pending:"Invite pending", remove:"Remove", cancelInv:"Cancel invite", save:"Send invite", cancel:"Cancel",
    sure:"Remove this user? They lose access immediately.", done:"Invite saved. Send them the site link; they sign up with the same email and verify it.", bad:"Invalid email.", err:"Something went wrong. Try again.", you:"You",
    r:{owner:"Owner",manager:"Manager",staff:"Staff",viewer:"Viewer"} }
};
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const opts = (l, cur) => ROLES.map(r => `<option value="${r}" ${r === cur ? "selected" : ""}>${l.r[r]}</option>`).join("");

export function teamPanel(c) {
  const { st } = c, l = L[st.lang]; if (st.role !== "owner") return "";
  const pend = st.invites.filter(i => !st.members.some(m => m.email === i.id));
  const rows = [`<tr><td>${esc(st.user.email)} <span class="sub">(${l.you})</span></td><td>${l.r.owner}</td><td></td></tr>`,
    ...st.members.map(m => `<tr><td>${esc(m.name)} <span class="sub" dir="ltr">${esc(m.email)}</span></td><td><select data-tr data-id="${m.id}" data-email="${esc(m.email)}">${opts(l, m.role)}</select></td><td><button class="ib d" data-ta="rm" data-id="${m.id}" data-email="${esc(m.email)}">${l.remove}</button></td></tr>`),
    ...pend.map(i => `<tr><td>${esc(i.name)} <span class="sub" dir="ltr">${esc(i.id)}</span> <span class="chip">${l.pending}</span></td><td><select data-tr data-email="${esc(i.id)}">${opts(l, i.role)}</select></td><td><button class="ib d" data-ta="rmi" data-email="${esc(i.id)}">${l.cancelInv}</button></td></tr>`)].join("");
  return `<div id="team" class="panel" style="margin-top:22px"><h3>${l.title}</h3><p class="sub">${l.hint}</p><div class="tw"><table><tbody>${rows}</tbody></table></div>
  <div class="row" style="margin-top:12px"><button class="btn" data-ta="inv">${l.invite}</button></div></div>`;
}
function openInvite(c) {
  const l = L[c.st.lang], d = document.createElement("dialog");
  d.innerHTML = `<h3 style="margin:0 0 14px">${l.invite}</h3><div class="fg"><label class="field full"><span>${l.email}</span><input id="ie" type="email" dir="ltr"></label>
  <label class="field"><span>${l.name}</span><input id="in" type="text"></label><label class="field"><span>${l.role}</span><select id="ir">${opts(l, "staff")}</select></label></div>
  <p class="err" role="alert"></p><div class="row"><button class="btn" data-s>${l.save}</button><button class="btn alt" data-x>${l.cancel}</button></div>`;
  document.body.appendChild(d); d.showModal();
  d.onclose = () => { d.remove(); c.render(); };
  d.querySelector("[data-x]").onclick = () => d.close();
  d.querySelector("[data-s]").onclick = async () => {
    const em = d.querySelector("#ie").value.trim().toLowerCase(), err = d.querySelector(".err");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return (err.textContent = l.bad);
    try { await setDoc(doc(c.db, "invites", em), { ownerUid:c.uid, role:d.querySelector("#ir").value, name:d.querySelector("#in").value.trim(), ownerEmail:c.st.user.email, created:Date.now() });
      d.close(); alert(l.done); } catch (e) { console.error(e); err.textContent = l.err; }
  };
}
export function bindTeam(c) {
  const root = document.querySelector("#team"); if (!root) return; const l = L[c.st.lang];
  const inv = e => doc(c.db, "invites", e), mem = id => doc(c.db, "users", c.uid, "members", id);
  root.onchange = async e => { const s = e.target; if (!("tr" in s.dataset)) return;
    try { if (s.dataset.id) await setDoc(mem(s.dataset.id), { role:s.value }, { merge:true }); await setDoc(inv(s.dataset.email), { role:s.value }, { merge:true }); }
    catch (err) { console.error(err); alert(l.err); } };
  root.onclick = async e => { const b = e.target.closest("[data-ta]"); if (!b) return; const a = b.dataset.ta;
    try { if (a === "inv") openInvite(c);
      else if (a === "rm" && confirm(l.sure)) { await deleteDoc(mem(b.dataset.id)); await deleteDoc(inv(b.dataset.email)); }
      else if (a === "rmi") await deleteDoc(inv(b.dataset.email));
    } catch (err) { console.error(err); alert(l.err); } };
}
