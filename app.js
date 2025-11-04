/* Front-end booking logic */
const $=(q,el=document)=>el.querySelector(q);
const $$=(q,el=document)=>[...el.querySelectorAll(q)];
const fmtMoney=n=>`$${Number(n).toFixed(0)}`;

let settings={
  services:[
    {group:"Acrylic", name:"Short Full Set", price:45},
    {group:"Acrylic", name:"Medium Full Set", price:50},
    {group:"Acrylic", name:"Long Full Set", price:55},
    {group:"Builder", name:"Short — Soft Gel", price:50},
    {group:"Builder", name:"Medium — Soft Gel", price:55},
    {group:"Builder", name:"Long — Soft Gel", price:60}
  ],
  extras:[{key:"Soak Off", price:10}],
  theme:{blush:"#f6d7d9", mocha:"#6b4f3f", cream:"#f8f4f2"}
};

let basePriceSel=0;

function renderServices(){
  const acrylic=settings.services.filter(s=>s.group==="Acrylic");
  const builder=settings.services.filter(s=>s.group==="Builder");
  $("#service-acrylic").innerHTML=acrylic.map(s=>`<div class="item"><div class="label">${s.name} — ${fmtMoney(s.price)}</div></div>`).join("");
  $("#service-builder").innerHTML=builder.map(s=>`<div class="item"><div class="label">${s.name} — ${fmtMoney(s.price)}</div></div>`).join("");
  const sel=$("#serviceSelect");
  sel.innerHTML=`<option value="">Select a service…</option>`+settings.services.map((s,i)=>`<option value="${i}">${s.group} • ${s.name} — ${fmtMoney(s.price)}</option>`).join("");
}

function updatePrice(){
  const i=$("#serviceSelect").value;
  basePriceSel=i===""?0:settings.services[Number(i)].price;
  $("#basePrice").value=fmtMoney(basePriceSel+($("#soakToggle").checked?10:0));
}

async function apiGet(params){
  const url=`${window.GAS_WEB_APP_URL}?${new URLSearchParams(params)}`;
  const r=await fetch(url,{method:"GET"});
  return r.json();
}
async function apiPost(action,body){
  const r=await fetch(window.GAS_WEB_APP_URL+`?action=${encodeURIComponent(action)}`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
  return r.json();
}

async function loadSettings(){
  try{
    const res=await apiGet({action:"get_settings"});
    if(res.ok){ settings=res.settings; renderServices(); }
  }catch{ renderServices(); }
}

async function loadGallery(){
  try{
    const res=await apiGet({action:"get_gallery"});
    if(!res.ok) return;
    $("#galleryGrid").innerHTML=res.images.map(img=>`<img src="${img.publicUrl}" alt="${img.caption||'nails'}">`).join("");
  }catch{}
}

async function refreshSlots(){
  const date=$("#dateInput").value;
  const i=$("#serviceSelect").value;
  if(!date||i===""){ alert("Select service and date first."); return; }
  $("#timeSelect").innerHTML=`<option>Loading…</option>`;
  const res=await apiGet({action:"get_availability",from:date,to:date});
  if(!res.ok){ $("#timeSelect").innerHTML=`<option>Error loading times</option>`; return; }
  const opts=res.slots.map(s=>`<option value="${s.id}|${s.start}|${s.end}">${new Date(s.start).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})} – ${new Date(s.end).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</option>`);
  $("#timeSelect").innerHTML=opts.length?`<option value="">Select a time…</option>`+opts.join(""):`<option>No times on this day.</option>`;
}

async function submitBooking(e){
  e.preventDefault();
  const name=$("input[name=name]").value.trim();
  const phone=$("input[name=phone]").value.trim();
  const instagram=$("input[name=instagram]").value.trim();
  const notes=$("#notes").value.trim();
  const serviceIdx=$("#serviceSelect").value;
  const soak=$("#soakToggle").checked;
  const timeVal=$("#timeSelect").value;
  const date=$("#dateInput").value;
  if(!name||!phone||!serviceIdx||!timeVal){ alert("Please complete the form."); return; }

  const [slotId,start,end]=timeVal.split("|");
  const svc=settings.services[Number(serviceIdx)];
  const total=svc.price+(soak?10:0);

  $("#statusLine").textContent="Sending request…";
  const res=await apiPost("submit_request",{name,phone,instagram,service:`${svc.group} — ${svc.name}`,basePrice:svc.price,soakOff:soak,total,date,start,end,notes,slotId});
  if(res.ok){
    $("#statusLine").textContent="Request sent. Status: Pending approval.";
    (e.target).reset(); updatePrice();
  }else{
    $("#statusLine").textContent="Error. Please try again.";
  }
}

function adminEntry(){
  const modal=$("#pinModal");
  modal.classList.remove("hidden");
  $("#pinInput").focus();
  $("#pinCancel").onclick=()=>modal.classList.add("hidden");
  $("#pinOK").onclick=()=>{
    const pin=$("#pinInput").value.trim();
    if(pin.length!==4){ alert("Enter 4 digits"); return; }
    sessionStorage.setItem("dx_pin",pin);
    window.location.href="./admin.html?pin="+encodeURIComponent(pin);
  };
}

document.addEventListener("DOMContentLoaded",()=>{
  $("#year").textContent=new Date().getFullYear();
  $("#brand").addEventListener("click",adminEntry);
  $("#serviceSelect").addEventListener("change",updatePrice);
  $("#soakToggle").addEventListener("change",updatePrice);
  $("#refreshBtn").addEventListener("click",refreshSlots);
  $("#bookingForm").addEventListener("submit",submitBooking);
  loadSettings(); loadGallery();
});
