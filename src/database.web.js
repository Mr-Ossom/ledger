const LS_SHOP = 'ledger_shop';
const LS_TX = 'ledger_tx';

function loadShop() {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(LS_SHOP) : null;
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}
function saveShop(shop) {
  try { if (typeof window !== 'undefined') window.localStorage.setItem(LS_SHOP, JSON.stringify(shop)); } catch {}
}
function loadTx() {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(LS_TX) : null;
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}
function saveTx(arr) {
  try { if (typeof window !== 'undefined') window.localStorage.setItem(LS_TX, JSON.stringify(arr)); } catch {}
}

let shopCache = loadShop();
let txCache = loadTx();

function daysAgo(d, hour) {
  const now = new Date();
  const dt = new Date(now);
  dt.setDate(now.getDate() - d);
  dt.setHours(hour, 0, 0, 0);
  return dt;
}

function seedIfNeeded() {
  if (txCache && txCache.length > 0) return;
  const shopId = (shopCache && shopCache.id) || 1;
  txCache = [
    { id: 1, shop_id: shopId, type: 'sale', amount: 47.5, description: 'Milo and bread', category: 'Groceries', payment_method: 'Cash', is_credit: 0, created_at: daysAgo(0, 9).toISOString() },
    { id: 2, shop_id: shopId, type: 'sale', amount: 120, description: 'Rice 5kg', category: 'Groceries', payment_method: 'MoMo', is_credit: 0, created_at: daysAgo(0, 11).toISOString() },
    { id: 3, shop_id: shopId, type: 'expense', amount: 30, description: 'Transport fare', category: 'Transport', payment_method: null, is_credit: 0, created_at: daysAgo(0, 8).toISOString() },
    { id: 4, shop_id: shopId, type: 'sale', amount: 15, description: 'Bottled water x6', category: 'Drinks', payment_method: 'Cash', is_credit: 0, created_at: daysAgo(1, 10).toISOString() },
    { id: 5, shop_id: shopId, type: 'expense', amount: 80, description: 'Restock drinks', category: 'Restock', payment_method: null, is_credit: 0, created_at: daysAgo(1, 9).toISOString() },
    { id: 6, shop_id: shopId, type: 'sale', amount: 200, description: 'Cooking oil', category: 'Groceries', payment_method: 'Credit', is_credit: 1, created_at: daysAgo(2, 14).toISOString() },
    { id: 7, shop_id: shopId, type: 'sale', amount: 55, description: 'Soap and detergent', category: 'Household', payment_method: 'Cash', is_credit: 0, created_at: daysAgo(3, 10).toISOString() },
    { id: 8, shop_id: shopId, type: 'expense', amount: 22, description: 'Packaging bags', category: 'Packaging', payment_method: null, is_credit: 0, created_at: daysAgo(4, 12).toISOString() },
    { id: 9, shop_id: shopId, type: 'sale', amount: 90, description: 'Sardines and milk', category: 'Groceries', payment_method: 'MoMo', is_credit: 0, created_at: daysAgo(5, 15).toISOString() },
    { id: 10, shop_id: shopId, type: 'sale', amount: 300, description: 'Wholesale order', category: 'Groceries', payment_method: 'Cash', is_credit: 0, created_at: daysAgo(6, 11).toISOString() },
  ];
  saveTx(txCache);
}

export function getDb() { return null; }

export function initDatabase() {
  if (!shopCache) {
    shopCache = { id: 1, name: "Ama's Provisions", category: 'Provisions', phone: '0240000000', starting_float: 0, daily_target: 500, created_at: new Date().toISOString() };
    saveShop(shopCache);
  } else {
    if (!shopCache.daily_target || shopCache.daily_target <= 0) {
      const migrated = shopCache.starting_float && shopCache.starting_float > 0 ? shopCache.starting_float : 500;
      shopCache = { ...shopCache, daily_target: migrated, starting_float: 0 };
      saveShop(shopCache);
    }
    if (shopCache.starting_float === undefined) { shopCache.starting_float = 0; saveShop(shopCache); }
  }
  if (!txCache) txCache = loadTx() || [];
  if (!txCache.length) seedIfNeeded();
}

export function getShop() {
  if (!shopCache) shopCache = loadShop();
  if (shopCache && (!shopCache.daily_target || shopCache.daily_target <= 0)) shopCache.daily_target = 500;
  return shopCache;
}

export function updateShop({ name, category, phone, daily_target, starting_float }) {
  const raw = daily_target !== undefined ? daily_target : starting_float;
  const val = parseFloat(raw) || 500;
  const finalTarget = val > 0 ? val : 500;
  shopCache = { ...(shopCache || { id: 1 }), name, category, phone, daily_target: finalTarget, starting_float: 0, created_at: shopCache?.created_at || new Date().toISOString() };
  saveShop(shopCache);
}

export function addTransaction({ shop_id, type, amount, description, category, payment_method, is_credit }) {
  if (!txCache) txCache = [];
  const id = txCache.length ? Math.max(...txCache.map(t => t.id)) + 1 : 1;
  txCache.unshift({ id, shop_id: shop_id ?? 1, type, amount, description, category, payment_method: payment_method ?? null, is_credit: is_credit ? 1 : 0, created_at: new Date().toISOString() });
  saveTx(txCache);
}

export function getTransactions({ type, search, dateFilter } = {}) {
  let arr = txCache ? [...txCache] : [];
  if (type && type !== 'all') arr = arr.filter(t => t.type === type);
  if (search) {
    const q = search.toLowerCase();
    arr = arr.filter(t => t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
  }
  const today = new Date().toISOString().slice(0, 10);
  if (dateFilter === 'today') arr = arr.filter(t => t.created_at.slice(0, 10) === today);
  else if (dateFilter === 'week') {
    const sixAgo = new Date(); sixAgo.setDate(sixAgo.getDate() - 6); const s = sixAgo.toISOString().slice(0, 10);
    arr = arr.filter(t => t.created_at.slice(0, 10) >= s);
  } else if (dateFilter === 'month') {
    const m = new Date().toISOString().slice(0, 7);
    arr = arr.filter(t => t.created_at.slice(0, 7) === m);
  }
  arr.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return arr;
}

export function getTodayTotals() {
  const today = new Date().toISOString().slice(0, 10);
  const todays = (txCache || []).filter(t => t.created_at.slice(0, 10) === today);
  const sales = todays.filter(t => t.type === 'sale').reduce((s, t) => s + t.amount, 0);
  const expenses = todays.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return { sales, expenses, profit: sales - expenses };
}

export function getDailyProfit(days = 7) {
  const map = new Map();
  for (const t of txCache || []) {
    const day = t.created_at.slice(0, 10);
    if (!map.has(day)) map.set(day, { sales: 0, expenses: 0 });
    const v = map.get(day);
    if (t.type === 'sale') v.sales += t.amount; else v.expenses += t.amount;
  }
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(); dt.setDate(dt.getDate() - i);
    const key = dt.toISOString().slice(0, 10);
    const v = map.get(key) || { sales: 0, expenses: 0 };
    out.push({ label: dt.toLocaleDateString('en-GH', { weekday: 'short' }).slice(0, 3), day: key, sales: v.sales, expenses: v.expenses, profit: v.sales - v.expenses });
  }
  return out;
}

export function getTopCategories() {
  const map = new Map();
  for (const t of txCache || []) if (t.type === 'sale') {
    const cur = map.get(t.category) || { category: t.category, total: 0, count: 0 };
    cur.total += t.amount; cur.count += 1; map.set(t.category, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 5);
}

export function clearAll() {
  txCache = []; shopCache = null;
  try { if (typeof window !== 'undefined') { window.localStorage.removeItem(LS_TX); window.localStorage.removeItem(LS_SHOP); window.localStorage.removeItem('ledger_has_onboarded'); } } catch {}
}
