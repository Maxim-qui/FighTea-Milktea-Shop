/* ============================================================
   FighTea — Main Application Logic  (app.js)  v4
   Changes: removed sugar from customize modal & cart,
   menu/toppings start empty, responsive mobile nav
   ============================================================ */
'use strict';

/* ── TOAST ───────────────────────────────────────────────── */
function showToast(msg, type='info'){
  const c=document.getElementById('toast-container');
  if(!c) return;
  const t=document.createElement('div');
  t.className=`toast ${type}`;
  t.textContent=msg;
  c.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateX(20px)'; t.style.transition='all .3s'; setTimeout(()=>t.remove(),300); }, 3200);
}

/* ── VIEW ROUTING ────────────────────────────────────────── */
function showView(v){
  document.querySelectorAll('.view').forEach(el=>el.classList.remove('active'));
  const target=document.getElementById('view-'+v);
  if(target){ target.classList.add('active'); App.currentView=v; window.scrollTo({top:0,behavior:'smooth'}); }
  updateNavState();
  closeMobileNav();
  if(v==='menu')  renderMenuPage();
  if(v==='home')  renderBestsellers();
  if(v==='admin') renderAdminDashboard();
}

function updateNavState(){
  const area=document.getElementById('nav-auth-area');
  if(!area) return;
  if(isLoggedIn()){
    const first=App.currentUser.name.split(',')[0].split(' ')[0];
    area.innerHTML=`
      <span style="font-size:13px;color:var(--brown-light)">Hi, ${first}</span>
      ${isAdmin()?`<button class="btn btn-outline btn-sm" onclick="showView('admin')">Dashboard</button>`:''}
      <button class="btn btn-ghost btn-sm" onclick="logout()">Sign Out</button>`;
  } else {
    area.innerHTML=`
      <button class="navbar-link" onclick="showView('auth')">Sign In</button>
      <button class="btn btn-primary btn-sm" onclick="showView('auth')">Get Started</button>`;
  }
}

/* ── MOBILE NAV ──────────────────────────────────────────── */
function toggleMobileNav(){
  const nav=document.getElementById('mobile-nav');
  const ham=document.getElementById('hamburger-btn');
  const isOpen=nav.classList.toggle('open');
  ham.classList.toggle('open', isOpen);
  document.body.style.overflow=isOpen?'hidden':'';
  if(isOpen){
    const mAuth=document.getElementById('mobile-auth-btns');
    if(mAuth){
      if(isLoggedIn()){
        const first=App.currentUser.name.split(',')[0].split(' ')[0];
        mAuth.innerHTML=`
          <span style="font-size:13px;color:var(--brown-light);padding:8px 16px">Hi, ${first}</span>
          ${isAdmin()?`<button class="mobile-nav-link" onclick="showView('admin')">📊 Dashboard</button>`:''}
          <button class="mobile-nav-link" onclick="logout()" style="color:#C62828">🚪 Sign Out</button>`;
      } else {
        mAuth.innerHTML=`
          <button class="btn btn-outline btn-full" onclick="showView('auth')">Sign In</button>
          <button class="btn btn-primary btn-full" onclick="showView('auth')">Get Started</button>`;
      }
    }
  }
}
function closeMobileNav(){
  document.getElementById('mobile-nav')?.classList.remove('open');
  document.getElementById('hamburger-btn')?.classList.remove('open');
  document.body.style.overflow='';
}

/* ── ADMIN MOBILE DRAWER ─────────────────────────────────── */
function toggleAdminMobileMenu(){
  document.getElementById('admin-mobile-drawer')?.classList.toggle('open');
  document.getElementById('admin-mobile-backdrop')?.classList.toggle('open');
}
function closeAdminMobileMenu(){
  document.getElementById('admin-mobile-drawer')?.classList.remove('open');
  document.getElementById('admin-mobile-backdrop')?.classList.remove('open');
}

/* ── AUTH ────────────────────────────────────────────────── */
function initAuth(){
  document.getElementById('login-form')?.addEventListener('submit', function(e){
    e.preventDefault();
    const email=this.querySelector('[name="email"]').value.trim();
    const pass =this.querySelector('[name="password"]').value;
    const user =USERS.find(u=>u.email===email && u.password===pass);
    if(user){
      saveSession(user);
      showToast(`Welcome back, ${user.name.split(',')[0]}! ☕`, 'success');
      setTimeout(()=>isAdmin()?showView('admin'):showView('home'), 500);
    } else {
      showToast('Invalid email or password.', 'error');
    }
  });
  document.getElementById('signup-form')?.addEventListener('submit', function(e){
    e.preventDefault();
    const name =this.querySelector('[name="name"]').value.trim();
    const email=this.querySelector('[name="email"]').value.trim();
    const phone=this.querySelector('[name="phone"]').value.trim();
    const pass =this.querySelector('[name="password"]').value;
    const conf =this.querySelector('[name="confirm"]').value;
    if(pass!==conf){ showToast('Passwords do not match.','error'); return; }
    if(USERS.find(u=>u.email===email)){ showToast('Email already registered.','error'); return; }
    const newUser={ id:USER_ID_SEQ++, name, email, phone, password:pass, role:'customer' };
    USERS.push(newUser);
    saveSession(newUser);
    showToast(`Welcome to FighTea, ${name.split(' ')[0]}! 🧋`, 'success');
    setTimeout(()=>showView('home'), 600);
  });
}

function logout(){
  clearSession(); App.cart=[]; updateCartBadge(); showView('home');
  showToast('You have been signed out.','info');
}
function switchAuthTab(tab){
  document.querySelectorAll('.auth-tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===tab));
  document.getElementById('login-form').style.display =tab==='login' ?'block':'none';
  document.getElementById('signup-form').style.display=tab==='signup'?'block':'none';
}

/* ── MENU RENDERING ──────────────────────────────────────── */
function renderBestsellers(){
  const el=document.getElementById('bestsellers-grid');
  if(!el) return;
  const items=MENU_ITEMS.filter(i=>i.bestseller && i.available);
  if(items.length===0){
    el.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon" style="font-size:40px;opacity:.35">🧋</div><p style="color:#BBA882">No featured drinks yet — check back soon!</p></div>`;
  } else {
    el.innerHTML=items.map(menuCardHTML).join('');
  }
}

function renderMenuPage(filterCat){
  const cat=filterCat||App.activeFilter||'All';
  App.activeFilter=cat;
  const allCats=getCategories();

  const pillsEl=document.getElementById('menu-cat-pills');
  if(pillsEl) pillsEl.innerHTML=allCats.map(c=>
    `<button class="cat-pill${c===cat?' active':''}" onclick="renderMenuPage('${c}')">${c}</button>`
  ).join('');

  const gridEl=document.getElementById('menu-items-grid');
  if(!gridEl) return;

  const items=cat==='All' ? MENU_ITEMS : MENU_ITEMS.filter(i=>i.cat===cat);
  if(MENU_ITEMS.length===0){
    gridEl.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">🧋</div><h4>Menu coming soon!</h4><p>Our team is setting up the menu. Check back shortly.</p></div>`;
  } else if(items.length===0){
    gridEl.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">🧋</div><h4>No drinks in this category yet.</h4></div>`;
  } else {
    gridEl.innerHTML=items.map(menuCardHTML).join('');
  }
}

function menuCardHTML(item){
  return `<div class="menu-card animate-in${!item.available?' unavailable':''}" onclick="${item.available?`openCustomize(${item.id})`:''}">
    <div class="menu-card-thumb">
      ${item.bestseller?'<span class="bestseller-ribbon">⭐ Best Seller</span>':''}
      ${!item.available?'<span class="unavail-tag">Unavailable</span>':''}
      ${drinkImg(item,'','width:100%;height:100%;object-fit:cover')}
    </div>
    <div class="menu-card-body">
      <h4>${item.name}</h4>
      <p>${item.desc||''}</p>
      <div class="menu-card-footer">
        <span class="menu-price">${formatCurrency(item.price)}</span>
        <button class="menu-add-btn" ${!item.available?'disabled':''} onclick="event.stopPropagation();${item.available?`openCustomize(${item.id})`:''}" aria-label="Add ${item.name}">+</button>
      </div>
    </div>
  </div>`;
}

/* ── CUSTOMIZE MODAL (no sugar) ──────────────────────────── */
let customState = {};

function openCustomize(itemId){
  if(!isLoggedIn()){ showToast('Please sign in to place an order.','info'); showView('auth'); return; }
  const item=MENU_ITEMS.find(i=>i.id===itemId);
  if(!item||!item.available) return;

  // Fresh state — toppings always start empty for each new item
  customState = { item, size:SIZE_OPTIONS[1], ice:ICE_OPTIONS[0], toppings:[], qty:1 };

  // Header image + name
  const headerEl=document.getElementById('modal-drink-header');
  if(headerEl){
    headerEl.innerHTML=`
      <div class="modal-drink-thumb">
        ${drinkImg(item,'','width:100%;height:100%;object-fit:cover')}
      </div>
      <div>
        <h3>${item.name}</h3>
        <p style="font-size:13px;color:#9A7A5A;margin-top:3px">Base: <span id="modal-base-price">${formatCurrency(item.price)}</span></p>
        <p style="font-size:12px;color:#BBA882;margin-top:2px">${item.cat}</p>
      </div>`;
  }

  // Size chips
  document.getElementById('modal-sizes').innerHTML=
    SIZE_OPTIONS.map(s=>
      `<button class="opt-chip${s.id==='md'?' active':''}" data-group="cust-size" onclick="selectOption(this,'size','${s.id}')">${s.label}${s.priceAdd?' +₱'+s.priceAdd:''}</button>`
    ).join('');

  // Ice chips
  document.getElementById('modal-ice').innerHTML=
    ICE_OPTIONS.map(s=>
      `<button class="opt-chip${s.id==='normal'?' active':''}" data-group="cust-ice" onclick="selectOption(this,'ice','${s.id}')">${s.label}</button>`
    ).join('');

  // Toppings — rendered fresh; show message if none configured yet
  const topEl=document.getElementById('modal-toppings');
  if(TOPPINGS.length===0){
    topEl.innerHTML=`<p style="font-size:13px;color:#BBA882;grid-column:1/-1">No toppings available yet.</p>`;
  } else {
    topEl.innerHTML=TOPPINGS.map(t=>
      `<button class="topping-chip" data-topping-id="${t.id}" onclick="toggleTopping(this,${t.id})">${t.emoji||'•'} ${t.name}<span style="margin-left:auto;font-size:11px;opacity:.6">+₱${t.price}</span></button>`
    ).join('');
  }

  document.getElementById('modal-qty').textContent='1';
  updateModalPrice();
  openModal('customize-modal');
}

function selectOption(btn, group, id){
  document.querySelectorAll(`[data-group="cust-${group}"]`).forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(group==='size') customState.size=SIZE_OPTIONS.find(s=>s.id===id);
  if(group==='ice')  customState.ice =ICE_OPTIONS.find(s=>s.id===id);
  updateModalPrice();
}

// toggleTopping only affects current item's customState — no cross-item bleed
function toggleTopping(btn, toppingId){
  btn.classList.toggle('active');
  const t=TOPPINGS.find(t=>t.id===toppingId);
  const idx=customState.toppings.findIndex(x=>x.id===toppingId);
  if(idx>-1) customState.toppings.splice(idx,1);
  else        customState.toppings.push({...t});
  updateModalPrice();
}

function changeQty(delta){
  customState.qty=Math.max(1, customState.qty+delta);
  document.getElementById('modal-qty').textContent=customState.qty;
  updateModalPrice();
}

function updateModalPrice(){
  const base=customState.item.price + (customState.size?.priceAdd||0) + customState.toppings.reduce((s,t)=>s+t.price,0);
  const total=base*customState.qty;
  const el=document.getElementById('modal-total');
  if(el) el.textContent=formatCurrency(total);
  return total;
}

function addToCartFromModal(){
  const base=customState.item.price + (customState.size?.priceAdd||0) + customState.toppings.reduce((s,t)=>s+t.price,0);
  App.cart.push({
    id:     Date.now()+Math.random(),
    itemId: customState.item.id,
    name:   customState.item.name,
    emoji:  customState.item.emoji,
    image:  customState.item.image,
    size:   customState.size.label,
    ice:    customState.ice.label,
    toppings: customState.toppings.map(t=>t.name),
    qty:   customState.qty,
    price: base,
  });
  updateCartBadge();
  closeModal('customize-modal');
  showToast(`${customState.item.name} added to cart! 🧋`, 'success');
  customState={};
}

/* ── CART ────────────────────────────────────────────────── */
function updateCartBadge(){
  const n=cartCount();
  document.querySelectorAll('.cart-count').forEach(el=>el.textContent=n);
}

function openCart(){  renderCart(); document.getElementById('cart-drawer').classList.add('open'); document.getElementById('cart-backdrop').classList.add('open'); }
function closeCart(){ document.getElementById('cart-drawer').classList.remove('open'); document.getElementById('cart-backdrop').classList.remove('open'); }

function renderCart(){
  const listEl =document.getElementById('cart-items');
  const totalEl=document.getElementById('cart-grand-total');
  if(!listEl) return;
  if(App.cart.length===0){
    listEl.innerHTML=`<div class="empty-state"><div class="empty-state-icon">🧋</div><h4>Your cart is empty</h4><p>Browse our menu and add some drinks!</p></div>`;
  } else {
    listEl.innerHTML=App.cart.map(item=>`
      <div class="cart-item">
        <div class="cart-item-img">
          <img src="${item.image||DEFAULT_IMG}" alt="${item.name}"
               style="width:100%;height:100%;object-fit:cover"
               onerror="this.parentElement.innerHTML='<span style=\\"display:flex;align-items:center;justify-content:center;font-size:24px;width:100%;height:100%\\">${item.emoji||'🧋'}</span>'"
               loading="lazy">
        </div>
        <div class="cart-item-info">
          <h5>${item.name} × ${item.qty}</h5>
          <p>${item.size} · ${item.ice}${item.toppings.length?' · '+item.toppings.join(', '):''}</p>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
          <span class="cart-item-price">${formatCurrency(item.price*item.qty)}</span>
          <button class="cart-remove-btn" onclick="removeFromCart(${item.id})">✕</button>
        </div>
      </div>`).join('');
  }
  if(totalEl) totalEl.textContent=formatCurrency(cartTotal());
}

function removeFromCart(id){
  App.cart=App.cart.filter(i=>i.id!==id);
  updateCartBadge(); renderCart();
  showToast('Item removed.','info');
}

/* ── CHECKOUT ────────────────────────────────────────────── */
let selectedPayment='cash';

function openCheckout(){
  if(App.cart.length===0){ showToast('Your cart is empty!','error'); return; }
  closeCart();
  document.getElementById('checkout-total').textContent=formatCurrency(cartTotal());
  selectPaymentMethod('cash');
  openModal('checkout-modal');
}

function selectPaymentMethod(method){
  selectedPayment=method;
  document.querySelectorAll('.payment-card').forEach(c=>c.classList.toggle('active', c.dataset.method===method));
  const gcash=document.getElementById('gcash-fields');
  if(gcash) gcash.style.display=method==='gcash'?'block':'none';
}

function openGCashApp(){
  const total=cartTotal();
  const deepLink=`gcash://pay?amount=${total}&merchant=${encodeURIComponent('FighTea')}&note=${encodeURIComponent('FighTea Order')}`;
  const start=Date.now();
  window.location=deepLink;
  setTimeout(()=>{
    if(Date.now()-start<2000){
      showToast('GCash app not found. Please send payment manually.','info');
      document.getElementById('gcash-manual-section').style.display='block';
    }
  },1500);
}

function placeOrder(){
  if(App.cart.length===0){ showToast('Your cart is empty!','error'); return; }
  if(!isLoggedIn()){ showToast('Please sign in first.','info'); showView('auth'); return; }
  const gcashRef=selectedPayment==='gcash'?document.getElementById('gcash-ref-input')?.value.trim():null;
  if(selectedPayment==='gcash'&&!gcashRef){ showToast('Please enter your GCash reference number.','error'); return; }
  const order={
    id:            generateOrderId(),
    num:           App.orderCounter,
    customer:      App.currentUser.name,
    phone:         App.currentUser.phone||'',
    items:         App.cart.map(i=>({ name:i.name, emoji:i.emoji, image:i.image, size:i.size, ice:i.ice, toppings:[...i.toppings], qty:i.qty, price:i.price })),
    status:        'pending',
    payment:       selectedPayment,
    paymentStatus: selectedPayment==='gcash'?'paid':'unpaid',
    gcashRef:      gcashRef||null,
    total:         cartTotal(),
    time:          getCurrentTime(),
    dateStr:       new Date().toDateString(),
    notes:         document.getElementById('order-notes')?.value||'',
  };
  ORDERS.unshift(order);
  App.cart=[]; updateCartBadge(); closeModal('checkout-modal');
  showOrderConfirmation(order);
}

function showOrderConfirmation(order){
  document.getElementById('confirm-order-id').textContent    = order.id;
  document.getElementById('confirm-order-total').textContent = formatCurrency(order.total);
  document.getElementById('confirm-payment').textContent     = order.payment==='gcash'?`GCash — Ref: ${order.gcashRef}`:'Cash on pickup';
  openModal('order-confirm-modal');
}

/* ── MODALS ──────────────────────────────────────────────── */
function openModal(id){  document.getElementById(id)?.classList.add('open'); }
function closeModal(id){ document.getElementById(id)?.classList.remove('open'); }

/* ── INIT ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', ()=>{
  loadSession(); updateNavState(); renderBestsellers(); initAuth();

  document.querySelectorAll('.modal-overlay').forEach(o=>{
    o.addEventListener('click', function(e){ if(e.target===this) this.classList.remove('open'); });
  });
  document.getElementById('cart-backdrop')?.addEventListener('click', closeCart);
  document.querySelectorAll('.auth-tab').forEach(tab=>{
    tab.addEventListener('click', ()=>switchAuthTab(tab.dataset.tab));
  });
  selectPaymentMethod('cash');

  window.addEventListener('resize', ()=>{ if(window.innerWidth>767) closeMobileNav(); });
});
