/* ============================================================
   FighTea — App Data & State  (data.js)  v4
   Changes: removed sugar options, removed all sample menu data,
   toppings/categories are now mutable (admin-editable)
   ============================================================ */
'use strict';

const App = {
  currentUser:  null,
  currentView:  'home',
  cart:         [],
  activeFilter: 'All',
  orderCounter: 0,
};

/* ── CATEGORIES (mutable — admin can add/rename/remove) ────
   'All' is always prepended dynamically; never stored here.  */
let MENU_CATEGORIES = [];  // empty by default — admin fills these in

/* ── MENU ITEMS (empty by default — admin adds their own) ── */
let MENU_ITEMS = [];
let MENU_ID_SEQ = 1;

/* ── TOPPINGS (mutable — admin can add/edit/remove) ───────── */
let TOPPINGS = [];
let TOPPING_ID_SEQ = 1;

/* ── SIZE OPTIONS (fixed, not editable in this version) ───── */
const SIZE_OPTIONS = [
  { id:'sm', label:'Small (12oz)',  priceAdd:0  },
  { id:'md', label:'Medium (16oz)', priceAdd:0  },
  { id:'lg', label:'Large (22oz)',  priceAdd:20 },
];

/* ── ICE OPTIONS (fixed) ─────────────────────────────────── */
const ICE_OPTIONS = [
  { id:'normal', label:'Normal'   },
  { id:'less',   label:'Less Ice' },
  { id:'no',     label:'No Ice'   },
  { id:'warm',   label:'Warm'     },
];

/* Sugar options REMOVED per v4 spec */

/* ── ORDERS (live — no sample data) ─────────────────────── */
let ORDERS = [];

/* ── USERS (admin only — staff/customers added by admin/signup) */
let USERS = [
  { id:1, name:'FighTea Admin', email:'admin@fightea.com', password:'Admin@FighTea2024', role:'admin' },
];
let USER_ID_SEQ = 2;

/* ── DEFAULT IMAGE ────────────────────────────────────────── */
const DEFAULT_IMG = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&q=80';

/* ── UTILS ────────────────────────────────────────────────── */
function formatCurrency(n){ return '₱'+Number(n).toLocaleString('en-PH',{minimumFractionDigits:0,maximumFractionDigits:2}); }
function generateOrderId(){ App.orderCounter++; return 'FT-'+String(App.orderCounter).padStart(4,'0'); }
function getCurrentTime(){ return new Date().toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'}); }

/** Returns categories for the filter pills — always includes 'All' first */
function getCategories(){ return ['All', ...MENU_CATEGORIES]; }

/** <img> tag with emoji fallback */
function drinkImg(item, cls='', style=''){
  const src = item.image || DEFAULT_IMG;
  const fb  = item.emoji || '🧋';
  return `<img src="${src}" alt="${item.name||''}" class="${cls}" style="${style}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" loading="lazy">` +
         `<span style="display:none;align-items:center;justify-content:center;font-size:48px;width:100%;height:100%">${fb}</span>`;
}

function saveSession(u){ App.currentUser=u; try{localStorage.setItem('fightea_user',JSON.stringify({id:u.id,name:u.name,email:u.email,role:u.role}));}catch(e){} }
function loadSession(){ try{const s=localStorage.getItem('fightea_user');if(s)App.currentUser=JSON.parse(s);}catch(e){} }
function clearSession(){ App.currentUser=null; try{localStorage.removeItem('fightea_user');}catch(e){} }

function isLoggedIn(){    return !!App.currentUser; }
function isAdmin(){       return App.currentUser&&(App.currentUser.role==='admin'||App.currentUser.role==='staff'); }
function isStrictAdmin(){ return App.currentUser&&App.currentUser.role==='admin'; }

function cartTotal(){ return App.cart.reduce((s,i)=>s+i.price*i.qty,0); }
function cartCount(){ return App.cart.reduce((s,i)=>s+i.qty,0); }

/* ── ANALYTICS (computed from live ORDERS only) ────────────── */
function getAnalytics(){
  const today      = new Date().toDateString();
  const todayOrds  = ORDERS.filter(o=>o.dateStr===today);
  const paidOrds   = ORDERS.filter(o=>o.paymentStatus==='paid');
  const totalRevenue  = paidOrds.reduce((s,o)=>s+o.total,0);
  const todayRevenue  = todayOrds.filter(o=>o.paymentStatus==='paid').reduce((s,o)=>s+o.total,0);
  const pendingRevenue= ORDERS.filter(o=>o.payment==='cash'&&o.paymentStatus==='unpaid').reduce((s,o)=>s+o.total,0);
  const byStatus={};
  ORDERS.forEach(o=>{byStatus[o.status]=(byStatus[o.status]||0)+1;});
  const gcashCount = ORDERS.filter(o=>o.payment==='gcash').length;
  const cashCount  = ORDERS.filter(o=>o.payment==='cash').length;
  const itemCounts = {};
  ORDERS.forEach(order=>{
    order.items.forEach(item=>{
      const k=item.name;
      if(!itemCounts[k]) itemCounts[k]={name:k,emoji:item.emoji,image:item.image,count:0,revenue:0};
      itemCounts[k].count  += item.qty;
      itemCounts[k].revenue+= item.price*item.qty;
    });
  });
  const topItems = Object.values(itemCounts).sort((a,b)=>b.count-a.count).slice(0,5);
  return {
    totalRevenue, todayRevenue, pendingRevenue,
    totalOrders:ORDERS.length, todayOrders:todayOrds.length,
    completedOrders:byStatus.completed||0,
    gcashCount, cashCount,
    avgOrder:ORDERS.length?(totalRevenue/ORDERS.length):0,
    topItems,
    availableItems:MENU_ITEMS.filter(i=>i.available).length,
    unavailableItems:MENU_ITEMS.filter(i=>!i.available).length,
    totalMenuItems:MENU_ITEMS.length,
    totalToppings:TOPPINGS.length,
    totalCategories:MENU_CATEGORIES.length,
    byStatus,
  };
}

function getOrderStats(){
  return {
    pending:   ORDERS.filter(o=>o.status==='pending').length,
    preparing: ORDERS.filter(o=>o.status==='preparing').length,
    ready:     ORDERS.filter(o=>o.status==='ready').length,
    total:     ORDERS.filter(o=>o.paymentStatus==='paid').reduce((s,o)=>s+o.total,0),
  };
}
