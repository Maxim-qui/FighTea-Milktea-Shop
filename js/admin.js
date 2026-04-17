/* ============================================================
   FighTea — Admin Dashboard Logic  (admin.js)  v4
   New: full toppings CRUD, full categories CRUD,
   sugar removed from order editing, menu starts empty
   ============================================================ */
'use strict';

/* ── PERMISSION HELPERS ──────────────────────────────────── */
function canManageMenu(){  return isStrictAdmin(); }
function canEditOrders(){  return isAdmin(); }
function canManageUsers(){ return isStrictAdmin(); }

/* ── DASHBOARD INIT ──────────────────────────────────────── */
function renderAdminDashboard(){
  if(!isAdmin()){ showToast('Access denied.','error'); showView('home'); return; }
  document.querySelectorAll('.admin-nav-item[data-tab="menu"]').forEach(el=>el.classList.toggle('locked',!canManageMenu()));
  document.querySelectorAll('.admin-nav-item[data-tab="users"]').forEach(el=>el.classList.toggle('locked',!canManageUsers()));
  const lbl=document.getElementById('admin-user-label');
  if(lbl) lbl.textContent=`${App.currentUser.name} (${capitalise(App.currentUser.role)})`;
  adminTab('queue');
}

function adminTab(tab){
  if((tab==='menu'&&!canManageMenu())||(tab==='users'&&!canManageUsers())){
    showToast('Admin access required for this section.','error'); return;
  }
  document.querySelectorAll('.admin-tab-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.admin-nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('admin-'+tab)?.classList.add('active');
  document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
  const titles={ queue:'Order Queue', menu:'Menu Manager', analytics:'Analytics', users:'User Management', settings:'Settings' };
  const el=document.getElementById('admin-page-title');
  if(el) el.textContent=titles[tab]||'Dashboard';
  if(tab==='queue')     renderQueue();
  if(tab==='analytics') renderAnalytics();
  if(tab==='menu')      renderMenuManager();
  if(tab==='users')     renderUsersTable();
}

/* ── ORDER QUEUE ─────────────────────────────────────────── */
function renderQueue(filterStatus){
  const f=filterStatus||'active';
  const stats=getOrderStats();
  document.getElementById('stat-pending').textContent   = stats.pending;
  document.getElementById('stat-preparing').textContent = stats.preparing;
  document.getElementById('stat-ready').textContent     = stats.ready;
  document.getElementById('stat-revenue').textContent   = formatCurrency(stats.total);
  document.querySelectorAll('.queue-filter').forEach(b=>b.classList.toggle('active', b.dataset.filter===f));
  let orders;
  if(f==='active')   orders=ORDERS.filter(o=>!['completed','cancelled'].includes(o.status));
  else if(f==='all') orders=ORDERS;
  else               orders=ORDERS.filter(o=>o.status===f);
  const gridEl=document.getElementById('queue-grid');
  if(!gridEl) return;
  if(orders.length===0){
    gridEl.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">✅</div><h4>No orders here</h4><p>All clear!</p></div>`;
    return;
  }
  gridEl.innerHTML=orders.map(orderCardHTML).join('');
}

function orderCardHTML(order){
  const actions={
    pending:   `<button class="act-btn act-prepare" onclick="updateOrderStatus('${order.id}','preparing')">Start Prep</button>
                <button class="act-btn act-cancel"  onclick="updateOrderStatus('${order.id}','cancelled')">Cancel</button>
                <button class="act-btn act-edit"    onclick="openEditOrder('${order.id}')">Edit</button>`,
    preparing: `<button class="act-btn act-ready"   onclick="updateOrderStatus('${order.id}','ready')">Mark Ready</button>
                <button class="act-btn act-edit"    onclick="openEditOrder('${order.id}')">Edit</button>`,
    ready:     `<button class="act-btn act-complete" onclick="updateOrderStatus('${order.id}','completed')">Complete</button>
                <button class="act-btn act-edit"     onclick="openEditOrder('${order.id}')">Edit</button>`,
    completed: `<span style="font-size:12px;color:var(--teal)">✓ Completed</span>`,
    cancelled: `<span style="font-size:12px;color:#C62828">✕ Cancelled</span>`,
  };
  const payBadge=order.payment==='gcash'
    ?`<span class="gcash-badge">💙 GCash${order.gcashRef?' · '+order.gcashRef:''}</span>`
    :`<span class="cash-badge">💵 Cash</span>`;
  const itemsList=order.items.map(i=>{
    const tops=i.toppings?.length?` + ${i.toppings.join(', ')}` :'';
    return `${i.emoji||'🧋'} ${i.name} ×${i.qty} (${i.size}, ${i.ice}${tops})`;
  }).join('\n');
  return `<div class="order-card" id="ocard-${order.id}">
    <div class="order-card-head"><span class="order-card-num">${order.id}</span><span class="order-card-time">${order.time}</span></div>
    <div class="order-card-name">${order.customer}</div>
    <div style="margin:4px 0">${payBadge}</div>
    <div class="order-card-items" style="white-space:pre-line">${itemsList||'No items'}</div>
    <div style="display:flex;align-items:center;justify-content:space-between">
      <span class="badge badge-${order.status}">${capitalise(order.status)}</span>
      <span class="order-card-total">${formatCurrency(order.total)}</span>
    </div>
    ${order.notes?`<div style="font-size:11px;color:#9A7A5A;padding:6px 8px;background:var(--cream);border-radius:6px">📝 ${order.notes}</div>`:''}
    <div class="order-card-actions">${actions[order.status]||''}</div>
  </div>`;
}

function updateOrderStatus(orderId, newStatus){
  const order=ORDERS.find(o=>o.id===orderId);
  if(!order) return;
  order.status=newStatus;
  if(newStatus==='completed'&&order.payment==='cash') order.paymentStatus='paid';
  renderQueue(document.querySelector('.queue-filter.active')?.dataset.filter||'active');
  const msgs={ preparing:`Order ${orderId} is being prepared.`, ready:`Order ${orderId} is ready! 🎉`, completed:`Order ${orderId} completed.`, cancelled:`Order ${orderId} cancelled.` };
  showToast(msgs[newStatus]||`Status: ${newStatus}`, newStatus==='cancelled'?'error':'success');
}

/* ── EDIT ORDER ──────────────────────────────────────────── */
let editingOrderId=null;
function openEditOrder(orderId){
  const order=ORDERS.find(o=>o.id===orderId);
  if(!order) return;
  if(!canEditOrders()){ showToast('You do not have permission to edit orders.','error'); return; }
  editingOrderId=orderId;
  document.getElementById('edit-order-id').textContent = order.id;
  document.getElementById('edit-customer').value = order.customer;
  document.getElementById('edit-notes').value    = order.notes||'';
  document.getElementById('edit-payment').value  = order.payment;
  const itemsEl=document.getElementById('edit-items-list');
  itemsEl.innerHTML=order.items.map((item,idx)=>`
    <div style="border:1px solid var(--beige);border-radius:var(--r-sm);padding:14px;margin-bottom:10px">
      <div style="font-weight:500;margin-bottom:10px">${item.emoji||'🧋'} ${item.name} ×${item.qty}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div><label class="form-label">Size</label>
          <select class="form-select" style="width:100%" id="edit-size-${idx}">
            ${SIZE_OPTIONS.map(s=>`<option value="${s.id}" ${item.size===s.label?'selected':''}>${s.label}${s.priceAdd?' +₱'+s.priceAdd:''}</option>`).join('')}
          </select></div>
        <div><label class="form-label">Ice</label>
          <select class="form-select" style="width:100%" id="edit-ice-${idx}">
            ${ICE_OPTIONS.map(s=>`<option value="${s.id}" ${item.ice===s.label?'selected':''}>${s.label}</option>`).join('')}
          </select></div>
      </div>
      ${TOPPINGS.length?`
      <div style="margin-top:10px"><label class="form-label">Toppings</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
          ${TOPPINGS.map(t=>`<button type="button" class="topping-chip${item.toppings?.includes(t.name)?' active':''}"
            onclick="toggleEditTopping(this,'${orderId}',${idx},'${t.name}')" style="padding:6px 10px;font-size:12px">
            ${t.emoji||'•'} ${t.name}</button>`).join('')}
        </div></div>`:''}
    </div>`).join('');
  openModal('edit-order-modal');
}

function toggleEditTopping(btn, orderId, itemIdx, name){
  btn.classList.toggle('active');
  const order=ORDERS.find(o=>o.id===orderId);
  if(!order) return;
  const item=order.items[itemIdx];
  if(!item.toppings) item.toppings=[];
  const idx=item.toppings.indexOf(name);
  if(idx>-1) item.toppings.splice(idx,1); else item.toppings.push(name);
}

function saveEditOrder(){
  const order=ORDERS.find(o=>o.id===editingOrderId);
  if(!order) return;
  order.customer = document.getElementById('edit-customer').value.trim();
  order.notes    = document.getElementById('edit-notes').value.trim();
  order.payment  = document.getElementById('edit-payment').value;
  order.items.forEach((item,idx)=>{
    const sid=document.getElementById(`edit-size-${idx}`)?.value;
    const iid=document.getElementById(`edit-ice-${idx}`)?.value;
    if(sid){ const s=SIZE_OPTIONS.find(x=>x.id===sid); if(s) item.size=s.label; }
    if(iid){ const s=ICE_OPTIONS.find(x=>x.id===iid);  if(s) item.ice =s.label; }
  });
  order.total=order.items.reduce((sum,item)=>{
    const sizeAdd=SIZE_OPTIONS.find(s=>s.label===item.size)?.priceAdd||0;
    const topsAdd=(item.toppings?.length||0)*15;
    const base=MENU_ITEMS.find(m=>m.name===item.name)?.price||item.price;
    return sum+(base+sizeAdd+topsAdd)*item.qty;
  },0);
  closeModal('edit-order-modal');
  renderQueue(document.querySelector('.queue-filter.active')?.dataset.filter||'active');
  showToast(`Order ${editingOrderId} updated.`,'success');
}

/* ══════════════════════════════════════════════════════════
   MENU MANAGER
   ════════════════════════════════════════════════════════ */
function renderMenuManager(){
  if(!canManageMenu()){
    document.getElementById('admin-menu').innerHTML=`<div class="perm-notice">⚠️ Only Admins can manage the menu. Staff can only edit orders in the queue.</div>`;
    return;
  }
  renderMenuGrid();
  renderCategoriesPanel();
  renderToppingsPanel();
}

/* ── MENU GRID ───────────────────────────────────────────── */
function renderMenuGrid(filter=''){
  const grid=document.getElementById('admin-menu-grid');
  if(!grid) return;
  const q=filter.toLowerCase();
  const items=q ? MENU_ITEMS.filter(i=>i.name.toLowerCase().includes(q)||i.cat.toLowerCase().includes(q)) : MENU_ITEMS;
  if(items.length===0){
    grid.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">🧋</div><h4>No drinks yet</h4><p>Click "+ Add Drink" to add your first item.</p></div>`;
    return;
  }
  grid.innerHTML=items.map(item=>`
    <div class="product-admin-card" id="pcard-${item.id}">
      <div class="product-admin-thumb">
        ${drinkImg(item,'','width:100%;height:100%;object-fit:cover')}
      </div>
      <div class="product-admin-body">
        <h4>${item.name}</h4>
        <p style="font-size:11px;color:#9A7A5A;margin:3px 0 6px">${item.cat}</p>
        <div class="price">${formatCurrency(item.price)}</div>
        <label class="availability-toggle">
          <label class="toggle-switch">
            <input type="checkbox" ${item.available?'checked':''} onchange="toggleItemAvailability(${item.id},this.checked)">
            <span class="toggle-track"></span><span class="toggle-thumb"></span>
          </label>
          <span id="avail-label-${item.id}">${item.available?'Available':'Unavailable'}</span>
        </label>
        <div class="product-admin-actions">
          <button class="act-btn act-edit"   style="padding:7px 10px;font-size:12px" onclick="openEditItem(${item.id})">✏️ Edit</button>
          <button class="act-btn act-cancel" style="padding:7px 10px;font-size:12px" onclick="confirmRemoveItem(${item.id})">🗑 Remove</button>
        </div>
      </div>
    </div>`).join('');
}

/* ── CATEGORIES PANEL ────────────────────────────────────── */
function renderCategoriesPanel(){
  const el=document.getElementById('admin-categories-list');
  if(!el) return;
  if(MENU_CATEGORIES.length===0){
    el.innerHTML=`<p style="font-size:13px;color:#BBA882;padding:12px 0">No categories yet. Add one to start building your menu.</p>`;
    return;
  }
  el.innerHTML=MENU_CATEGORIES.map((cat,idx)=>`
    <div class="manage-row" id="cat-row-${idx}">
      <span class="manage-row-name">${cat}</span>
      <div class="manage-row-actions">
        <button class="act-btn act-edit" style="padding:5px 10px;font-size:12px" onclick="openEditCategory(${idx})">✏️</button>
        <button class="act-btn act-cancel" style="padding:5px 10px;font-size:12px" onclick="confirmRemoveCategory(${idx})">🗑</button>
      </div>
    </div>`).join('');
}

/* ── TOPPINGS PANEL ──────────────────────────────────────── */
function renderToppingsPanel(){
  const el=document.getElementById('admin-toppings-list');
  if(!el) return;
  if(TOPPINGS.length===0){
    el.innerHTML=`<p style="font-size:13px;color:#BBA882;padding:12px 0">No toppings yet. Add toppings to offer customizations.</p>`;
    return;
  }
  el.innerHTML=TOPPINGS.map(t=>`
    <div class="manage-row" id="topping-row-${t.id}">
      <span class="manage-row-emoji">${t.emoji||'•'}</span>
      <span class="manage-row-name">${t.name}</span>
      <span class="manage-row-price">₱${t.price}</span>
      <div class="manage-row-actions">
        <button class="act-btn act-edit" style="padding:5px 10px;font-size:12px" onclick="openEditTopping(${t.id})">✏️</button>
        <button class="act-btn act-cancel" style="padding:5px 10px;font-size:12px" onclick="confirmRemoveTopping(${t.id})">🗑</button>
      </div>
    </div>`).join('');
}

/* ── CATEGORY CRUD ───────────────────────────────────────── */
let editingCatIdx=null;
function openAddCategory(){
  editingCatIdx=null;
  document.getElementById('cat-modal-title').textContent='Add Category';
  document.getElementById('cat-form-name').value='';
  openModal('cat-modal');
}
function openEditCategory(idx){
  editingCatIdx=idx;
  document.getElementById('cat-modal-title').textContent='Edit Category';
  document.getElementById('cat-form-name').value=MENU_CATEGORIES[idx]||'';
  openModal('cat-modal');
}
function saveCategoryForm(){
  const name=document.getElementById('cat-form-name').value.trim();
  if(!name){ showToast('Category name is required.','error'); return; }
  if(editingCatIdx!==null){
    const old=MENU_CATEGORIES[editingCatIdx];
    MENU_CATEGORIES[editingCatIdx]=name;
    // Update existing menu items that used the old name
    MENU_ITEMS.forEach(i=>{ if(i.cat===old) i.cat=name; });
    showToast(`Category renamed to "${name}".`,'success');
  } else {
    if(MENU_CATEGORIES.includes(name)){ showToast('Category already exists.','error'); return; }
    MENU_CATEGORIES.push(name);
    showToast(`Category "${name}" added.`,'success');
  }
  closeModal('cat-modal');
  renderMenuManager();
  if(App.currentView==='menu') renderMenuPage(App.activeFilter);
}
function confirmRemoveCategory(idx){
  const name=MENU_CATEGORIES[idx];
  const inUse=MENU_ITEMS.some(i=>i.cat===name);
  if(inUse){ showToast(`Cannot remove "${name}" — it has drinks assigned to it. Re-assign or remove those drinks first.`,'error'); return; }
  if(!confirm(`Remove category "${name}"?`)) return;
  MENU_CATEGORIES.splice(idx,1);
  showToast(`Category "${name}" removed.`,'info');
  renderMenuManager();
  if(App.currentView==='menu') renderMenuPage('All');
}

/* ── TOPPING CRUD ────────────────────────────────────────── */
let editingToppingId=null;
function openAddTopping(){
  editingToppingId=null;
  document.getElementById('topping-modal-title').textContent='Add Topping';
  document.getElementById('topping-form-name').value='';
  document.getElementById('topping-form-emoji').value='';
  document.getElementById('topping-form-price').value='15';
  openModal('topping-modal');
}
function openEditTopping(id){
  const t=TOPPINGS.find(t=>t.id===id);
  if(!t) return;
  editingToppingId=id;
  document.getElementById('topping-modal-title').textContent='Edit Topping';
  document.getElementById('topping-form-name').value =t.name;
  document.getElementById('topping-form-emoji').value=t.emoji||'';
  document.getElementById('topping-form-price').value=t.price;
  openModal('topping-modal');
}
function saveToppingForm(){
  const name =document.getElementById('topping-form-name').value.trim();
  const emoji=document.getElementById('topping-form-emoji').value.trim()||'•';
  const price=parseFloat(document.getElementById('topping-form-price').value);
  if(!name||isNaN(price)||price<0){ showToast('Name and a valid price are required.','error'); return; }
  if(editingToppingId!==null){
    const t=TOPPINGS.find(t=>t.id===editingToppingId);
    if(t) Object.assign(t,{name,emoji,price});
    showToast(`${name} updated.`,'success');
  } else {
    TOPPINGS.push({ id:TOPPING_ID_SEQ++, name, emoji, price });
    showToast(`${name} added.`,'success');
  }
  closeModal('topping-modal');
  renderToppingsPanel();
}
function confirmRemoveTopping(id){
  const t=TOPPINGS.find(t=>t.id===id);
  if(!t) return;
  if(!confirm(`Remove topping "${t.name}"?`)) return;
  TOPPINGS=TOPPINGS.filter(t=>t.id!==id);
  showToast(`${t.name} removed.`,'info');
  renderToppingsPanel();
}

/* ── MENU ITEM AVAILABILITY ──────────────────────────────── */
function toggleItemAvailability(id, val){
  const item=MENU_ITEMS.find(i=>i.id===id);
  if(item){ item.available=val; const lbl=document.getElementById(`avail-label-${id}`); if(lbl) lbl.textContent=val?'Available':'Unavailable'; }
  showToast(`${item?.name} marked as ${val?'available':'unavailable'}.`, val?'success':'info');
  if(App.currentView==='menu') renderMenuPage(App.activeFilter);
  if(App.currentView==='home') renderBestsellers();
}

/* ── IMAGE UPLOAD ────────────────────────────────────────── */
let pendingImageDataUrl=null;
function initImageUpload(){
  const input  =document.getElementById('item-form-image-file');
  const preview=document.getElementById('item-form-image-preview');
  const urlInp =document.getElementById('item-form-image-url');
  if(!input) return;
  input.addEventListener('change',function(){
    const file=this.files[0];
    if(!file) return;
    if(!file.type.startsWith('image/')){ showToast('Please select an image file.','error'); return; }
    if(file.size>5*1024*1024){ showToast('Image must be under 5MB.','error'); return; }
    const reader=new FileReader();
    reader.onload=function(e){
      pendingImageDataUrl=e.target.result;
      if(preview){ preview.src=e.target.result; preview.style.display='block'; }
      if(urlInp) urlInp.value='';
      showToast('Image ready — click Save Drink.','success');
    };
    reader.readAsDataURL(file);
  });
  urlInp?.addEventListener('input',function(){
    if(this.value.trim()){
      pendingImageDataUrl=null;
      if(preview){ preview.src=this.value.trim(); preview.style.display='block'; }
    }
  });
}

/* ── ADD / EDIT MENU ITEM ────────────────────────────────── */
function openAddItem(){
  if(MENU_CATEGORIES.length===0){ showToast('Please add at least one category first.','error'); return; }
  pendingImageDataUrl=null;
  document.getElementById('item-modal-title').textContent='Add New Drink';
  document.getElementById('item-form-id').value='';
  document.getElementById('item-form-name').value='';
  document.getElementById('item-form-price').value='';
  document.getElementById('item-form-desc').value='';
  document.getElementById('item-form-bestseller').checked=false;
  document.getElementById('item-form-image-url').value='';
  const preview=document.getElementById('item-form-image-preview');
  if(preview) preview.style.display='none';
  // Populate category dropdown
  const sel=document.getElementById('item-form-cat');
  sel.innerHTML=MENU_CATEGORIES.map(c=>`<option>${c}</option>`).join('');
  openModal('item-modal');
}

function openEditItem(id){
  if(MENU_CATEGORIES.length===0){ showToast('Please add at least one category first.','error'); return; }
  const item=MENU_ITEMS.find(i=>i.id===id);
  if(!item) return;
  pendingImageDataUrl=null;
  document.getElementById('item-modal-title').textContent='Edit Drink';
  document.getElementById('item-form-id').value   =item.id;
  document.getElementById('item-form-name').value =item.name;
  document.getElementById('item-form-price').value=item.price;
  document.getElementById('item-form-desc').value =item.desc||'';
  document.getElementById('item-form-bestseller').checked=!!item.bestseller;
  document.getElementById('item-form-image-url').value=item.image||'';
  // Populate + select current category
  const sel=document.getElementById('item-form-cat');
  sel.innerHTML=MENU_CATEGORIES.map(c=>`<option${c===item.cat?' selected':''}>${c}</option>`).join('');
  const preview=document.getElementById('item-form-image-preview');
  if(preview&&item.image){ preview.src=item.image; preview.style.display='block'; }
  else if(preview){ preview.style.display='none'; }
  openModal('item-modal');
}

function saveItemForm(){
  const idVal =document.getElementById('item-form-id').value;
  const name  =document.getElementById('item-form-name').value.trim();
  const cat   =document.getElementById('item-form-cat').value;
  const price =parseFloat(document.getElementById('item-form-price').value);
  const desc  =document.getElementById('item-form-desc').value.trim();
  const best  =document.getElementById('item-form-bestseller').checked;
  const urlVal=document.getElementById('item-form-image-url').value.trim();
  const image =pendingImageDataUrl||urlVal||DEFAULT_IMG;
  if(!name||!price||isNaN(price)){ showToast('Name and valid price are required.','error'); return; }
  if(idVal){
    const item=MENU_ITEMS.find(i=>i.id===parseInt(idVal));
    if(item) Object.assign(item,{name,cat,price,desc,bestseller:best,image});
    showToast(`${name} updated.`,'success');
  } else {
    MENU_ITEMS.push({ id:MENU_ID_SEQ++, cat, name, emoji:'🧋', desc, price, bestseller:best, available:true, image });
    showToast(`${name} added to menu!`,'success');
  }
  pendingImageDataUrl=null;
  closeModal('item-modal');
  renderMenuManager();
  if(App.currentView==='menu') renderMenuPage(App.activeFilter);
  if(App.currentView==='home') renderBestsellers();
}

function confirmRemoveItem(id){
  const item=MENU_ITEMS.find(i=>i.id===id);
  if(!item) return;
  if(!confirm(`Remove "${item.name}" from the menu?`)) return;
  MENU_ITEMS.splice(MENU_ITEMS.findIndex(i=>i.id===id),1);
  showToast(`${item.name} removed.`,'info');
  renderMenuManager();
  if(App.currentView==='menu') renderMenuPage(App.activeFilter);
  if(App.currentView==='home') renderBestsellers();
}

/* ── USER MANAGEMENT ─────────────────────────────────────── */
let editingUserId=null;
function renderUsersTable(){
  if(!canManageUsers()){
    document.getElementById('admin-users').innerHTML=`<div class="perm-notice">⚠️ Only Admins can manage users.</div>`;
    return;
  }
  const tbody=document.getElementById('users-table-body');
  if(!tbody) return;
  tbody.innerHTML=USERS.map(u=>`
    <tr>
      <td style="font-size:12px;color:#9A7A5A">#${u.id}</td>
      <td><strong>${u.name}</strong></td>
      <td style="color:var(--brown-light)">${u.email}</td>
      <td>${u.phone||'—'}</td>
      <td><span class="badge badge-${u.role}">${capitalise(u.role)}</span></td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="act-btn act-edit"   style="padding:5px 12px;font-size:12px" onclick="openEditUser(${u.id})">Edit</button>
          ${u.role!=='admin'?`<button class="act-btn act-cancel" style="padding:5px 12px;font-size:12px" onclick="removeUser(${u.id})">Remove</button>`:''}
        </div>
      </td>
    </tr>`).join('');
}

function openAddUser(){
  editingUserId=null;
  document.getElementById('user-modal-title').textContent='Add User';
  ['user-form-name','user-form-email','user-form-phone','user-form-pass'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('user-form-role').value='customer';
  document.getElementById('pass-hint').style.display='none';
  openModal('user-modal');
}
function openEditUser(id){
  const user=USERS.find(u=>u.id===id);
  if(!user) return;
  editingUserId=id;
  document.getElementById('user-modal-title').textContent='Edit User';
  document.getElementById('user-form-name').value =user.name;
  document.getElementById('user-form-email').value=user.email;
  document.getElementById('user-form-phone').value=user.phone||'';
  document.getElementById('user-form-role').value =user.role;
  document.getElementById('user-form-pass').value ='';
  document.getElementById('pass-hint').style.display='inline';
  openModal('user-modal');
}
function saveUserForm(){
  const name =document.getElementById('user-form-name').value.trim();
  const email=document.getElementById('user-form-email').value.trim();
  const phone=document.getElementById('user-form-phone').value.trim();
  const role =document.getElementById('user-form-role').value;
  const pass =document.getElementById('user-form-pass').value;
  if(!name||!email){ showToast('Name and email are required.','error'); return; }
  if(editingUserId!==null){
    const user=USERS.find(u=>u.id===editingUserId);
    if(user){ user.name=name; user.email=email; user.phone=phone; user.role=role; if(pass) user.password=pass; }
    showToast(`${name} updated.`,'success');
  } else {
    if(!pass){ showToast('Password is required for new users.','error'); return; }
    if(USERS.find(u=>u.email===email)){ showToast('Email already exists.','error'); return; }
    USERS.push({ id:USER_ID_SEQ++, name, email, phone, password:pass, role });
    showToast(`${name} added as ${role}.`,'success');
  }
  closeModal('user-modal');
  renderUsersTable();
}
function removeUser(id){
  const user=USERS.find(u=>u.id===id);
  if(!user) return;
  if(user.role==='admin'){ showToast('Cannot remove admin accounts.','error'); return; }
  if(!confirm(`Remove user "${user.name}"?`)) return;
  USERS=USERS.filter(u=>u.id!==id);
  showToast(`${user.name} removed.`,'info');
  renderUsersTable();
}

/* ── ANALYTICS ───────────────────────────────────────────── */
function renderAnalytics(){
  const a=getAnalytics();
  const el=document.getElementById('analytics-content');
  if(!el) return;
  el.innerHTML=`
    ${ORDERS.length===0?`<div class="perm-notice">📊 No orders yet. Analytics will populate as real orders are placed.</div>`:''}
    <div class="stats-grid" style="margin-bottom:24px">
      <div class="stat-card accent"><div class="stat-label">Total Revenue (Paid)</div><div class="stat-value">${formatCurrency(a.totalRevenue)}</div><div class="stat-sub">All time</div></div>
      <div class="stat-card"><div class="stat-label">Today's Revenue</div><div class="stat-value">${formatCurrency(a.todayRevenue)}</div><div class="stat-sub">${a.todayOrders} orders today</div></div>
      <div class="stat-card"><div class="stat-label">Total Orders</div><div class="stat-value">${a.totalOrders}</div><div class="stat-sub">${a.completedOrders} completed</div></div>
      <div class="stat-card"><div class="stat-label">Avg Order Value</div><div class="stat-value">${formatCurrency(a.avgOrder)}</div><div class="stat-sub">per transaction</div></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:24px">
      <div class="stat-card"><div class="stat-label">GCash Orders</div><div class="stat-value">${a.gcashCount}</div><div class="stat-sub">${a.cashCount} cash</div></div>
      <div class="stat-card"><div class="stat-label">Pending Cash</div><div class="stat-value">${formatCurrency(a.pendingRevenue)}</div><div class="stat-sub">unpaid</div></div>
      <div class="stat-card"><div class="stat-label">Menu Items</div><div class="stat-value">${a.totalMenuItems}</div><div class="stat-sub">${a.unavailableItems} unavailable</div></div>
      <div class="stat-card"><div class="stat-label">Toppings</div><div class="stat-value">${a.totalToppings}</div><div class="stat-sub">configured</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="table-wrapper" style="padding:20px">
        <h4 style="margin-bottom:16px;font-family:var(--font-display)">Top Selling Drinks</h4>
        ${a.topItems.length
          ?`<ul class="top-items-list">${a.topItems.map((i,idx)=>`
            <li class="top-item">
              <div class="top-item-rank ${idx===0?'gold':''}">${idx+1}</div>
              <span class="top-item-name">${i.emoji||'🧋'} ${i.name}</span>
              <div style="text-align:right"><div class="top-item-count">${i.count} sold</div><div style="font-size:11px;color:#9A7A5A">${formatCurrency(i.revenue)}</div></div>
            </li>`).join('')}</ul>`
          :`<div class="empty-state" style="padding:20px 0"><p style="color:#BBA882;font-size:13px">No sales data yet.</p></div>`}
      </div>
      <div class="table-wrapper" style="padding:20px">
        <h4 style="margin-bottom:16px;font-family:var(--font-display)">Order Status</h4>
        ${renderStatusBreakdown(a.byStatus)}
        <h4 style="margin:20px 0 12px;font-family:var(--font-display)">Recent Orders</h4>
        ${ORDERS.length
          ?`<table class="data-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>${ORDERS.slice(0,6).map(o=>`
                <tr>
                  <td style="font-size:12px"><code>${o.id}</code></td>
                  <td style="font-size:13px">${o.customer}</td>
                  <td style="font-size:13px;font-weight:500">${formatCurrency(o.total)}</td>
                  <td><span class="badge badge-${o.status}">${capitalise(o.status)}</span></td>
                </tr>`).join('')}</tbody>
            </table>`
          :`<p style="color:#BBA882;font-size:13px">No orders yet.</p>`}
      </div>
    </div>`;
}

function renderStatusBreakdown(byStatus){
  const statuses=['pending','preparing','ready','completed','cancelled'];
  const colors={ pending:'#E65100', preparing:'#1565C0', ready:'#2E7D32', completed:'#6A1B9A', cancelled:'#C62828' };
  const total=ORDERS.length||1;
  return `<div style="display:flex;flex-direction:column;gap:8px">${statuses.map(s=>{
    const n=byStatus[s]||0;
    const pct=Math.round(n/total*100);
    return `<div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span>${capitalise(s)}</span><span style="font-weight:600">${n}</span></div>
      <div style="background:var(--beige);border-radius:4px;height:6px"><div style="background:${colors[s]};width:${pct}%;height:100%;border-radius:4px;transition:width .5s"></div></div></div>`;
  }).join('')}</div>`;
}

/* ── HELPER ──────────────────────────────────────────────── */
function capitalise(s){ return s?s.charAt(0).toUpperCase()+s.slice(1):''; }
