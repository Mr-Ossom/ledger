import { auth, db, isFirebaseConfigured } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  deleteDoc,
  increment,
} from 'firebase/firestore';


let fallbackShop = null;
let fallbackTx = [];

function isFirebase() { return isFirebaseConfigured() && !!auth?.currentUser; }

/** Waits up to ~2s for Firebase auth to resolve a current user. */
async function getAuthUid() {
  if (!isFirebaseConfigured() || !auth) return null;
  if (auth.currentUser) return auth.currentUser.uid;
  // Auth state may still be loading — wait for it
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user?.uid || null);
    });
    // Safety timeout
    setTimeout(() => { unsub(); resolve(null); }, 2000);
  });
}

export async function initDatabase() {
  if (!isFirebaseConfigured()) return;
}

export async function getShop() {
  const uid = await getAuthUid();
  if (uid && isFirebaseConfigured()) {
    try {
      const q = query(collection(db, 'shops'), where('ownerId', '==', uid), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0].data();
        return { id: snap.docs[0].id, name: d.name, category: d.category, phone: d.phone, daily_target: d.daily_target || 500, created_at: d.created_at?.toDate?.()?.toISOString?.() || new Date().toISOString() };
      }
    } catch (err) {
      console.error('[Firestore getShop Error]:', err);
    }
    return null;
  }
  return fallbackShop;
}

export async function updateShop({ name, category, phone, daily_target }) {
  const val = parseFloat(daily_target) || 500;
  const target = val > 0 ? val : 500;
  const uid = await getAuthUid();
  if (uid && isFirebaseConfigured()) {
    try {
      const q = query(collection(db, 'shops'), where('ownerId', '==', uid), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await setDoc(doc(db, 'shops', snap.docs[0].id), { name: name.trim() || 'My Shop', category, phone, daily_target: target, ownerId: uid, updatedAt: serverTimestamp() }, { merge: true });
      } else {
        await addDoc(collection(db, 'shops'), { ownerId: uid, name: name.trim() || 'My Shop', category, phone, daily_target: target, created_at: serverTimestamp() });
      }
      fallbackShop = { id: 'fb', name, category, phone, daily_target: target };
      return;
    } catch (err) {
      console.error('[Firestore updateShop Error]:', err);
      throw err;
    }
  }
  fallbackShop = { id: 1, name: name.trim() || 'My Shop', category, phone, daily_target: target, created_at: new Date().toISOString() };
}

export async function addTransaction({ type, amount, description, category, payment_method, is_credit, inventoryItemId, quantityUsed }) {
  const tx = { type, amount, description, category, payment_method: payment_method || null, is_credit: is_credit ? 1 : 0, created_at: new Date().toISOString() };
  fallbackTx.unshift({ id: Date.now().toString(), shop_id: 1, ...tx });
  const uid = await getAuthUid();
  if (uid && isFirebaseConfigured()) {
    try {
      const shop = await getShop();
      const shopId = shop?.id || 'none';
      await addDoc(collection(db, 'transactions'), { ...tx, shopId, ownerId: uid, createdAt: serverTimestamp() });
      // Auto-deduct inventory if an item was linked
      if (type === 'sale' && inventoryItemId && quantityUsed > 0) {
        try {
          await updateDoc(doc(db, 'inventory', inventoryItemId), {
            quantity: increment(-quantityUsed),
            updatedAt: serverTimestamp(),
          });
        } catch (invErr) {
          console.error('[Firestore inventory deduct Error]:', invErr);
        }
      }
    } catch (err) {
      console.error('[Firestore addTransaction Error]:', err);
      throw err;
    }
  }
}

export async function getTransactions({ type, search, dateFilter } = {}) {
  const uid = await getAuthUid();
  if (uid && isFirebaseConfigured()) {
    try {
      const q = query(collection(db, 'transactions'), where('ownerId', '==', uid), limit(200));
      const snap = await getDocs(q);
      let arr = snap.docs.map(d => {
        const v = d.data();
        return {
          id: d.id,
          shop_id: v.shopId,
          type: v.type,
          amount: v.amount,
          description: v.description,
          category: v.category,
          payment_method: v.payment_method,
          is_credit: v.is_credit,
          created_at: v.createdAt?.toDate?.()?.toISOString?.() || v.created_at || new Date().toISOString(),
        };
      });
      if (type && type !== 'all') arr = arr.filter(t => t.type === type);
      if (search) { const ql = search.toLowerCase(); arr = arr.filter(t => t.description.toLowerCase().includes(ql) || t.category.toLowerCase().includes(ql)); }
      const today = new Date().toISOString().slice(0,10);
      if (dateFilter === 'today') arr = arr.filter(t => t.created_at.slice(0,10) === today);
      else if (dateFilter === 'week') { const s = new Date(); s.setDate(s.getDate()-6); const sd = s.toISOString().slice(0,10); arr = arr.filter(t => t.created_at.slice(0,10) >= sd); }
      else if (dateFilter === 'month') { const m = new Date().toISOString().slice(0,7); arr = arr.filter(t => t.created_at.slice(0,7) === m); }
      arr.sort((a,b) => b.created_at.localeCompare(a.created_at));
      return arr;
    } catch (err) {
      console.error('[Firestore getTransactions Error]:', err);
      return [...fallbackTx];
    }
  }
  let arr = [...fallbackTx];
  if (type && type !== 'all') arr = arr.filter(t => t.type === type);
  if (search) { const q = search.toLowerCase(); arr = arr.filter(t => t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)); }
  const today = new Date().toISOString().slice(0,10);
  if (dateFilter === 'today') arr = arr.filter(t => t.created_at.slice(0,10) === today);
  else if (dateFilter === 'week') { const s = new Date(); s.setDate(s.getDate()-6); const sd = s.toISOString().slice(0,10); arr = arr.filter(t => t.created_at.slice(0,10) >= sd); }
  else if (dateFilter === 'month') { const m = new Date().toISOString().slice(0,7); arr = arr.filter(t => t.created_at.slice(0,7) === m); }
  arr.sort((a,b)=> b.created_at.localeCompare(a.created_at));
  return arr;
}

export async function getTodayTotals() {
  const txs = await getTransactions({});
  const today = new Date().toISOString().slice(0,10);
  const todays = txs.filter(t => t.created_at.slice(0,10) === today);
  const sales = todays.filter(t => t.type==='sale').reduce((s,t)=>s+t.amount,0);
  const expenses = todays.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  return { sales, expenses, profit: sales - expenses };
}

export async function getDailyProfit(days = 7) {
  const txs = await getTransactions({});
  const map = new Map();
  for (const t of txs) {
    const day = t.created_at.slice(0,10);
    if (!map.has(day)) map.set(day, { sales:0, expenses:0 });
    const v = map.get(day);
    if (t.type==='sale') v.sales+=t.amount; else v.expenses+=t.amount;
  }
  const out = [];
  for (let i=days-1;i>=0;i--) {
    const dt = new Date(); dt.setDate(dt.getDate()-i);
    const key = dt.toISOString().slice(0,10);
    const v = map.get(key) || { sales:0, expenses:0 };
    out.push({ label: dt.toLocaleDateString('en-GH',{weekday:'short'}).slice(0,3), day:key, sales:v.sales, expenses:v.expenses, profit: v.sales - v.expenses });
  }
  return out;
}

export async function getTopCategories() {
  const txs = await getTransactions({});
  const map = new Map();
  for (const t of txs) if (t.type==='sale') {
    const cur = map.get(t.category) || { category:t.category, total:0, count:0 };
    cur.total+=t.amount; cur.count+=1; map.set(t.category, cur);
  }
  return Array.from(map.values()).sort((a,b)=>b.total-a.total).slice(0,5);
}

export async function clearAll() {
  fallbackTx = []; fallbackShop = null;
  const uid = await getAuthUid();
  if (uid && isFirebaseConfigured()) {
    try {
      const q = query(collection(db, 'transactions'), where('ownerId','==',uid));
      const snap = await getDocs(q);
      for (const d of snap.docs) { await deleteDoc(d.ref); }
    } catch (err) {
      console.error('[Firestore clearAll Error]:', err);
    }
  }
}
export function getDb() { return null; }

// ── Inventory ────────────────────────────────────────────────────────────────

export async function getInventory() {
  const uid = await getAuthUid();
  if (uid && isFirebaseConfigured()) {
    try {
      // Query by ownerId without compound orderBy to avoid requiring composite indexes
      const q = query(collection(db, 'inventory'), where('ownerId', '==', uid));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => {
        const v = d.data();
        return {
          id: d.id,
          name: v.name,
          category: v.category || '',
          quantity: v.quantity ?? 0,
          unit: v.unit || 'pcs',
          costPrice: v.costPrice ?? 0,
          sellingPrice: v.sellingPrice ?? 0,
          lowStockThreshold: v.lowStockThreshold ?? 5,
          ownerId: v.ownerId,
        };
      });
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      return list;
    } catch (err) {
      console.error('[Firestore getInventory Error]:', err);
      return [];
    }
  }
  return [];
}

export async function saveInventoryItem(item) {
  const uid = await getAuthUid();
  if (!uid || !isFirebaseConfigured()) {
    console.warn('[saveInventoryItem]: Firebase not configured or no auth UID found.');
    return null;
  }
  const payload = {
    name: item.name?.trim() || 'Item',
    category: item.category || '',
    quantity: parseFloat(item.quantity) || 0,
    unit: item.unit || 'pcs',
    costPrice: parseFloat(item.costPrice) || 0,
    sellingPrice: parseFloat(item.sellingPrice) || 0,
    lowStockThreshold: parseFloat(item.lowStockThreshold) || 5,
    ownerId: uid,
    updatedAt: serverTimestamp(),
  };
  try {
    if (item.id) {
      await setDoc(doc(db, 'inventory', item.id), payload, { merge: true });
      return item.id;
    } else {
      payload.createdAt = serverTimestamp();
      const ref = await addDoc(collection(db, 'inventory'), payload);
      return ref.id;
    }
  } catch (err) {
    console.error('[Firestore saveInventoryItem Error]:', err);
    throw err;
  }
}

export async function deleteInventoryItem(id) {
  if (!isFirebaseConfigured()) return;
  try {
    await deleteDoc(doc(db, 'inventory', id));
  } catch (err) {
    console.error('[Firestore deleteInventoryItem Error]:', err);
  }
}
