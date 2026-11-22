const CATEGORIES = {
  expense: ["Food & groceries","Transport","Housing & rent","Utilities","Shopping","Health","Education","Entertainment","Family","Debt payment","Other"],
  income: ["Salary","Business","Freelance","Investment","Gift","Other"]
};
const COLORS = ["#20b987","#f18a7b","#8c7be8","#f0b45d","#5b9ee6","#df78a9","#55b9c7","#9aa7b8","#b3a06a","#6e8f82"];
const KEY = "nexabudget_v1";
let data = loadData(), activeType = "expense", simpleMode = "";
const $ = id => document.getElementById(id);
const money = n => "KSh " + Number(n||0).toLocaleString("en-KE",{minimumFractionDigits:2,maximumFractionDigits:2});
const dateISO = () => new Date().toISOString().slice(0,10);
const monthNow = () => dateISO().slice(0,7);
function loadData(){try{return JSON.parse(localStorage.getItem(KEY))||{transactions:[],budgets:[],goals:[]}}catch{return {transactions:[],budgets:[],goals:[]}}}
function save(){localStorage.setItem(KEY,JSON.stringify(data));renderAll()}
function toast(msg){$("toast").textContent=msg;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2400)}
function sum(items,type){return items.filter(t=>!type||t.type===type).reduce((a,t)=>a+Number(t.amount),0)}
function selectedMonth(){return $("monthFilter").value||monthNow()}
function monthTransactions(){return data.transactions.filter(t=>t.date.slice(0,7)===selectedMonth())}
function categoryColor(cat){const all=[...CATEGORIES.expense,...CATEGORIES.income];return COLORS[Math.max(0,all.indexOf(cat))%COLORS.length]}
function iconFor(cat){return ({"Food & groceries":"🛒","Transport":"🚕","Housing & rent":"🏠","Utilities":"💡","Shopping":"🛍️","Health":"⚕️","Education":"📚","Entertainment":"🎬","Family":"❤️","Debt payment":"↘","Salary":"💼","Business":"🏪","Freelance":"💻","Investment":"📈","Gift":"🎁","Other":"✦"})[cat]||"✦"}
function renderAll(){renderOverview();renderTransactions();renderBudgets();renderGoals();renderReports();fillCategoryFilter()}
function renderOverview(){
 const tx=monthTransactions(),inc=sum(tx,"income"),exp=sum(tx,"expense"),balance=sum(data.transactions,"income")-sum(data.transactions,"expense");
 $("totalBalance").textContent=money(balance);$("totalIncome").textContent=money(inc);$("totalExpense").textContent=money(exp);$("savingsRate").textContent=(inc?Math.round((inc-exp)/inc*100):0)+"%";
 $("donutTotal").textContent=money(exp).replace(".00","");
 const groups={};tx.filter(t=>t.type==="expense").forEach(t=>groups[t.category]=(groups[t.category]||0)+Number(t.amount));
 const entries=Object.entries(groups).sort((a,b)=>b[1]-a[1]);let total=entries.reduce((s,x)=>s+x[1],0),angle=0,stops=[];
 entries.forEach(([cat,val])=>{let next=angle+(total?val/total*360:0);stops.push(`${categoryColor(cat)} ${angle}deg ${next}deg`);angle=next});
 $("spendingDonut").style.background=stops.length?`conic-gradient(${stops.join(",")})`:"conic-gradient(#e9edf1 0 100%)";
 $("categoryLegend").innerHTML=entries.length?entries.slice(0,5).map(([cat,val])=>`<div class="legend-row"><i class="legend-color" style="background:${categoryColor(cat)}"></i>${esc(cat)}<strong>${money(val)}</strong></div>`).join(""):'<div class="empty-state">Your categories will appear here.</div>';
 renderCashflow();
 const latest=[...data.transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
 $("recentRows").innerHTML=latest.length?latest.map(rowHTML).join(""):'<tr><td colspan="5"><div class="empty-state">No transactions yet. Add your first transaction to get started.</div></td></tr>';
}
function renderCashflow(target="cashflowChart",report=false){
 const months=report?lastMonths(6):[selectedMonth()];
 const totals=months.map(m=>{const a=data.transactions.filter(t=>t.date.slice(0,7)===m);return {m,inc:sum(a,"income"),exp:sum(a,"expense")}});
 const max=Math.max(1,...totals.flatMap(x=>[x.inc,x.exp]));
 $(target).innerHTML=totals.map(x=>`<div class="bar-group"><div class="bar income" style="height:${x.inc/max*100}%"></div><div class="bar expense" style="height:${x.exp/max*100}%"></div><span class="bar-label">${new Date(x.m+"-01T00:00:00").toLocaleDateString("en",{month:"short"})}</span></div>`).join("");
}
function lastMonths(n){const out=[];const d=new Date();for(let i=n-1;i>=0;i--){let x=new Date(d.getFullYear(),d.getMonth()-i,1);out.push(x.toISOString().slice(0,7))}return out}
function rowHTML(t,withActions=false){return `<tr><td><div class="description-cell"><span class="transaction-icon">${iconFor(t.category)}</span>${esc(t.description)}</div></td><td><span class="tag">${esc(t.category)}</span></td><td>${formatDate(t.date)}</td><td>${t.type==="income"?"<span class='positive'>Income</span>":"Expense"}</td><td class="align-right amount ${t.type==="income"?"income-text":"expense-text"}">${t.type==="income"?"+":"−"}${money(t.amount)}</td>${withActions?`<td class="row-actions"><button data-delete="${t.id}" title="Delete">✕</button></td>`:""}</tr>`}
function formatDate(s){return new Date(s+"T00:00:00").toLocaleDateString("en-KE",{day:"numeric",month:"short",year:"numeric"})}
function renderTransactions(){
 const q=$("searchTransactions").value.toLowerCase(),type=$("typeFilter").value,cat=$("categoryFilter").value;
 const list=[...data.transactions].sort((a,b)=>b.date.localeCompare(a.date)).filter(t=>(type==="all"||t.type===type)&&(cat==="all"||t.category===cat)&&(`${t.description} ${t.category}`.toLowerCase().includes(q)));
 $("transactionRows").innerHTML=list.length?list.map(t=>rowHTML(t,true)).join(""):'<tr><td colspan="6"><div class="empty-state">No matching transactions found.</div></td></tr>';
}
function fillCategoryFilter(){const s=$("categoryFilter");if(!s)return;const old=s.value;const all=[...new Set([...CATEGORIES.expense,...CATEGORIES.income])];s.innerHTML='<option value="all">All categories</option>'+all.map(x=>`<option>${esc(x)}</option>`).join("");s.value=old||"all"}
function renderBudgets(){
 const tx=monthTransactions().filter(t=>t.type==="expense"),spent=sum(tx),limit=data.budgets.reduce((a,b)=>a+Number(b.limit),0);
 $("budgetSummary").innerHTML=`<div class="summary-mini"><span>Total budget</span><b>${money(limit)}</b></div><div class="summary-mini"><span>Spent this month</span><b>${money(spent)}</b></div><div class="summary-mini"><span>Remaining</span><b>${money(limit-spent)}</b></div>`;
 $("budgetGrid").innerHTML=data.budgets.length?data.budgets.map(b=>{const used=sum(tx.filter(t=>t.category===b.category)),pct=Math.round(used/Number(b.limit)*100)||0;return `<article class="budget-card"><div class="budget-card-head"><span class="budget-symbol">${iconFor(b.category)}</span><div><h3>${esc(b.category)}</h3><small>${pct}% of budget used</small></div></div><div class="budget-amount">${money(used)} <small style="font-size:10px;color:#98a2af;font-weight:400">of ${money(b.limit)}</small></div><div class="progress"><span class="${pct>100?"over":""}" style="width:${Math.min(100,pct)}%"></span></div><div class="budget-meta"><span>${money(Math.max(0,b.limit-used))} left</span><span>${pct>100?"Over budget": "Monthly limit"}</span></div><div class="card-actions"><button data-edit-budget="${b.id}">Edit</button><button data-delete-budget="${b.id}">Remove</button></div></article>`}).join(""):'<div class="panel empty-state">No budgets yet. Create a category budget to start planning.</div>';
}
function renderGoals(){
 $("goalGrid").innerHTML=data.goals.length?data.goals.map(g=>{const pct=Math.min(100,Math.round(g.saved/g.target*100));return `<article class="goal-card"><div class="goal-head"><span class="budget-symbol">🎯</span><div><h3>${esc(g.name)}</h3><small>${g.deadline?`Target date: ${formatDate(g.deadline)}`:"No target date"}</small></div></div><div class="goal-target">${money(g.saved)} <small style="font-size:10px;color:#98a2af;font-weight:400">saved of ${money(g.target)}</small></div><div class="progress"><span style="width:${pct}%"></span></div><div class="budget-meta"><span>${pct}% complete</span><span>${money(Math.max(0,g.target-g.saved))} to go</span></div><div class="goal-add"><input type="number" min=".01" step=".01" placeholder="Add amount" id="deposit-${g.id}"><button data-deposit="${g.id}">＋ Deposit</button></div><div class="card-actions"><button data-delete-goal="${g.id}">Remove goal</button></div></article>`}).join(""):'<div class="panel empty-state">No savings goals yet. Create one for something you’re working towards.</div>';
}
function renderReports(){
 const inc=sum(data.transactions,"income"),exp=sum(data.transactions,"expense");
 $("reportIncome").textContent=money(inc);$("reportExpense").textContent=money(exp);$("reportNet").textContent=money(inc-exp);$("reportCount").textContent=data.transactions.length;
 renderCashflow("reportChart",true);
 const groups={};data.transactions.filter(t=>t.type==="expense").forEach(t=>groups[t.category]=(groups[t.category]||0)+Number(t.amount));
 const entries=Object.entries(groups).sort((a,b)=>b[1]-a[1]);
 $("reportCategories").innerHTML=entries.length?entries.map(([cat,val])=>`<div class="legend-row"><i class="legend-color" style="background:${categoryColor(cat)}"></i>${esc(cat)}<strong>${money(val)}</strong></div>`).join(""):'<div class="empty-state">No spending data available yet.</div>';
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function openTransaction(){activeType="expense";$("transactionType").value=activeType;document.querySelectorAll(".type-toggle button").forEach(b=>b.classList.toggle("selected",b.dataset.type===activeType));fillCategories();$("transactionForm").reset();$("date").value=dateISO();$("transactionType").value=activeType;$("modalBackdrop").classList.add("show")}
function fillCategories(){const s=$("category");s.innerHTML=CATEGORIES[activeType].map(c=>`<option>${esc(c)}</option>`).join("")}
function closeTransaction(){$("modalBackdrop").classList.remove("show")}
function openSimple(title,fields,mode){simpleMode=mode;$("simpleTitle").textContent=title;$("simpleFields").innerHTML=fields;$("simpleBackdrop").classList.add("show")}
function closeSimple(){$("simpleBackdrop").classList.remove("show")}
function downloadCSV(){const header=["Date","Description","Type","Category","Amount","Payment method","Recurring"];const lines=[header,...data.transactions.map(t=>[t.date,t.description,t.type,t.category,t.amount,t.payment,t.recurring?"Yes":"No"])].map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(","));const blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="nexabudget-transactions.csv";a.click();URL.revokeObjectURL(url);toast("Your CSV export is ready")}
function navigate(page){document.querySelectorAll(".page").forEach(p=>p.classList.remove("active-page"));$(page+"Page").classList.add("active-page");document.querySelectorAll(".nav-item[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===page));$("pageCrumb").textContent=page[0].toUpperCase()+page.slice(1);$("sidebar").classList.remove("open")}
document.querySelectorAll(".nav-item[data-page]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.page)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.go)));
$("addTopBtn").onclick=$("addTransactionBtn").onclick=openTransaction;
$("closeModal").onclick=$("cancelModal").onclick=closeTransaction;
$("closeSimple").onclick=$("cancelSimple").onclick=closeSimple;
$("modalBackdrop").addEventListener("click",e=>{if(e.target===$("modalBackdrop"))closeTransaction()});
$("simpleBackdrop").addEventListener("click",e=>{if(e.target===$("simpleBackdrop"))closeSimple()});
document.querySelectorAll(".type-toggle button").forEach(b=>b.onclick=()=>{activeType=b.dataset.type;$("transactionType").value=activeType;document.querySelectorAll(".type-toggle button").forEach(x=>x.classList.toggle("selected",x===b));fillCategories()});
$("transactionForm").onsubmit=e=>{e.preventDefault();const amount=Number($("amount").value);if(!Number.isFinite(amount)||amount<=0)return toast("Enter an amount greater than zero.");data.transactions.push({id:crypto.randomUUID(),description:$("description").value.trim(),amount,type:activeType,category:$("category").value,date:$("date").value,payment:$("payment").value,recurring:$("recurring").checked});save();closeTransaction();toast("Transaction saved successfully")};
$("monthFilter").value=monthNow();$("monthFilter").onchange=renderAll;
["searchTransactions","typeFilter","categoryFilter"].forEach(id=>$(id).addEventListener(id==="searchTransactions"?"input":"change",renderTransactions));
$("addBudgetBtn").onclick=()=>openSimple("Set a monthly budget",`<label>Category<select id="simpleCategory">${CATEGORIES.expense.map(c=>`<option>${esc(c)}</option>`).join("")}</select></label><label>Monthly limit (KSh)<input id="simpleLimit" type="number" min=".01" step=".01" required placeholder="e.g. 15000"></label>`,"budget");
$("addGoalBtn").onclick=()=>openSimple("Create a savings goal",`<label>Goal name<input id="goalName" required placeholder="e.g. New laptop"></label><div class="form-row"><label>Target amount (KSh)<input id="goalTarget" type="number" min=".01" step=".01" required></label><label>Starting savings (KSh)<input id="goalSaved" type="number" min="0" step=".01" value="0"></label></div><label>Target date (optional)<input id="goalDeadline" type="date"></label>`,"goal");
$("simpleForm").onsubmit=e=>{e.preventDefault();if(simpleMode==="budget"){const category=$("simpleCategory").value,limit=Number($("simpleLimit").value);if(limit<=0)return toast("Enter a valid budget.");const existing=data.budgets.find(b=>b.category===category);if(existing)existing.limit=limit;else data.budgets.push({id:crypto.randomUUID(),category,limit})}else if(simpleMode==="goal"){const target=Number($("goalTarget").value),saved=Number($("goalSaved").value||0);if(target<=0||saved<0)return toast("Enter valid goal amounts.");data.goals.push({id:crypto.randomUUID(),name:$("goalName").value.trim(),target,saved,deadline:$("goalDeadline").value})}save();closeSimple();toast(simpleMode==="budget"?"Budget saved":"Savings goal created")};
document.body.addEventListener("click",e=>{
 const d=e.target.closest("[data-delete]");if(d){data.transactions=data.transactions.filter(t=>t.id!==d.dataset.delete);save();toast("Transaction deleted")}
 const eb=e.target.closest("[data-edit-budget]");if(eb){const b=data.budgets.find(x=>x.id===eb.dataset.editBudget);openSimple("Edit budget",`<label>Category<input value="${esc(b.category)}" disabled></label><label>Monthly limit (KSh)<input id="simpleLimit" type="number" min=".01" step=".01" required value="${b.limit}"></label>`,"editbudget:"+b.id)}
 const db=e.target.closest("[data-delete-budget]");if(db){data.budgets=data.budgets.filter(x=>x.id!==db.dataset.deleteBudget);save();toast("Budget removed")}
 const dg=e.target.closest("[data-delete-goal]");if(dg){data.goals=data.goals.filter(x=>x.id!==dg.dataset.deleteGoal);save();toast("Goal removed")}
 const dep=e.target.closest("[data-deposit]");if(dep){const input=$("deposit-"+dep.dataset.deposit),v=Number(input.value),g=data.goals.find(x=>x.id===dep.dataset.deposit);if(v<=0)return toast("Enter a deposit amount.");g.saved+=v;save();toast("Savings deposit added")}
});
const oldSimpleSubmit=$("simpleForm").onsubmit;
$("simpleForm").onsubmit=e=>{e.preventDefault();if(simpleMode.startsWith("editbudget:")){const b=data.budgets.find(x=>x.id===simpleMode.split(":")[1]);const v=Number($("simpleLimit").value);if(v<=0)return toast("Enter a valid amount.");b.limit=v;save();closeSimple();toast("Budget updated");return}if(simpleMode==="settings"){closeSimple();return}if(simpleMode==="budget"){const category=$("simpleCategory").value,limit=Number($("simpleLimit").value);if(limit<=0)return toast("Enter a valid budget.");const existing=data.budgets.find(b=>b.category===category);if(existing)existing.limit=limit;else data.budgets.push({id:crypto.randomUUID(),category,limit})}else{const target=Number($("goalTarget").value),saved=Number($("goalSaved").value||0);if(target<=0||saved<0)return toast("Enter valid goal amounts.");data.goals.push({id:crypto.randomUUID(),name:$("goalName").value.trim(),target,saved,deadline:$("goalDeadline").value})}save();closeSimple();toast(simpleMode==="budget"?"Budget saved":"Savings goal created")};
$("exportBtn").onclick=$("reportExportBtn").onclick=downloadCSV;
$("menuBtn").onclick=()=>$("sidebar").classList.toggle("open");
$("settingsBtn").onclick=()=>openSimple("Workspace settings",`<p class="muted">Your data is stored locally in this browser. Export your transactions regularly to keep a backup.</p><button type="button" class="outline-btn" id="clearAllBtn">Clear all app data</button>`,"settings");
$("simpleFields").addEventListener("click",e=>{if(e.target.id==="clearAllBtn"&&confirm("Delete all NexaBudget data from this browser?")){data={transactions:[],budgets:[],goals:[]};save();closeSimple();toast("All local data cleared")}});
$("todayLabel").textContent=new Date().toLocaleDateString("en-KE",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
renderAll();
