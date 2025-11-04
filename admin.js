/* Admin dashboard logic */
const $=(q,el=document)=>el.querySelector(q);
const ce=(t,o={})=>Object.assign(document.createElement(t),o);

async function apiGet(params){
  const url=`${window.GAS_WEB_APP_URL}?${new URLSearchParams(params)}`;
  const r=await fetch(url);
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

function switchTab(e){
  if(!e.target.classList.contains("tab")) return;
  document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
  document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
  e.target.classList.add("active");
  document.getElementById(e.target.dataset.tab).classList.add("active");
}

async function loadRequests(){
  const pin=$("#adminPin").value.trim();           // must be 2105 on backend
  const res=await apiPost("admin_list_requests",{pin});
  if(!res.ok){ alert("PIN wrong or error"); return; }
  const rows=res.rows;
  const table=ce("table");
  const head=ce("tr");
  ["When","Name","Service","Total","Status","Actions"].forEach(h=>head.appendChild(ce("th",{textContent:h})));
  table.appendChild(ce("thead")).appendChild(head);
  const tb=ce("tbody");
  rows.forEach(r=>{
    const tr=ce("tr");
    tr.appendChild(ce("td",{textContent:new Date(r.start).toLocaleString()}));
    tr.appendChild(ce("td",{textContent:`${r.name} (${r.phone})`}));
    tr.appendChild(ce("td",{textContent:`${r.service}${r.soakOff?' + Soak Off':''}`}));
    tr.appendChild(ce("td",{textContent:`$${r.total}`}));
    tr.appendChild(ce("td",{textContent:r.status}));
    const act=ce("td");
    const a=ce("button",{textContent:"Approve",className:"btn"});
    const d=ce("button",{textContent:"Deny",className:"btn"});
    const ebtn=ce("button",{textContent:"Edit Notes",className:"btn"});
    a.onclick=()=>updateReq(r.id,"Approved",pin);
    d.onclick=()=>updateReq(r.id,"Denied",pin);
    ebtn.onclick=()=>{
      const note=prompt("Admin notes:",r.adminNotes||"");
      if(note!=null) updateReq(r.id,r.status,pin,note);
    };
    act.append(a,d,ebtn);
    tr.appendChild(act);
    tb.appendChild(tr);
  });
  table.appendChild(tb);
  $("#requestsTable").innerHTML="";
  $("#requestsTable").appendChild(table);
}

async function updateReq(id,status,pin,adminNotes){
  const res=await apiPost("admin_update_request",{id,status,pin,adminNotes});
  if(res.ok){ loadRequests(); } else { alert("Update failed."); }
}

async function loadSettings(){
  const res=await apiGet({action:"get_settings"});
  if(res.ok){ $("#settingsJson").value=JSON.stringify(res.settings,null,2); }
}

async function saveSettings(){
  const pin=$("#adminPinSettings").value.trim();
  let obj;
  try{ obj=JSON.parse($("#settingsJson").value); }catch{ alert("Invalid JSON"); return; }
  const res=await apiPost("save_settings",{pin,settings:obj});
  alert(res.ok?"Saved":"Save failed");
}

async function loadGalleryAdmin(){
  const res=await apiGet({action:"get_gallery"});
  if(!res.ok) return;
  $("#galleryAdminGrid").innerHTML=res.images.map(img=>`<div><img src="${img.publicUrl}" /><div class="tiny muted">${img.caption||""}</div></div>`).join("");
}

async function uploadImage(){
  const pin=$("#adminPinGallery").value.trim();
  const file=$("#imgFile").files[0];
  if(!file){ alert("Pick an image."); return; }
  const caption=$("#imgCaption").value.trim();
  const b64=await new Promise((resolve,reject)=>{
    const fr=new FileReader();
    fr.onload=()=>resolve(fr.result);
    fr.onerror=reject;
    fr.readAsDataURL(file);
  });
  const res=await apiPost("upload_image",{pin,caption,dataUrl:b64});
  if(res.ok){ $("#imgFile").value=""; $("#imgCaption").value=""; loadGalleryAdmin(); } else { alert("Upload failed"); }
}

document.addEventListener("DOMContentLoaded",()=>{
  document.querySelector(".tabs").addEventListener("click",switchTab);
  $("#loadRequests").addEventListener("click",loadRequests);
  $("#saveSettings").addEventListener("click",saveSettings);
  $("#uploadImg").addEventListener("click",uploadImage);
  const urlPin=new URLSearchParams(location.search).get("pin");
  if(urlPin){ $("#adminPin").value=urlPin; $("#adminPinGallery").value=urlPin; $("#adminPinSettings").value=urlPin; loadRequests(); }
  loadSettings(); loadGalleryAdmin();
});
