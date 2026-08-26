import * as SQLite from 'expo-sqlite';

let db = null;

export function getDb() {
  if (!db) db = SQLite.openDatabaseSync('ledger.db');
  return db;
}

export function initDatabase() {
  const d = getDb();
  d.execSync(`
    CREATE TABLE IF NOT EXISTS shops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      phone TEXT,
      starting_float REAL NOT NULL DEFAULT 0,
      daily_target REAL NOT NULL DEFAULT 500,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('sale','expense')),
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      payment_method TEXT,
      is_credit INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (shop_id) REFERENCES shops(id)
    );
  `);
  try {
    const cols = d.getAllSync('PRAGMA table_info(shops)');
    const hasTarget = cols.some(c => c.name === 'daily_target');
    if (!hasTarget) d.execSync('ALTER TABLE shops ADD COLUMN daily_target REAL NOT NULL DEFAULT 500');
  } catch {}
  const shops = d.getAllSync('SELECT * FROM shops LIMIT 1');
  if (shops.length === 0) {
    d.runSync('INSERT INTO shops (name, category, phone, starting_float, daily_target) VALUES (?,?,?,?,?)', ["Ama's Provisions", 'Provisions', '0240000000', 0, 500]);
  } else {
    const s = shops[0];
    if (!s.daily_target || s.daily_target <= 0) d.runSync('UPDATE shops SET daily_target=? WHERE id=?', [500, s.id]);
  }
}

export function getShop() {
  const s = getDb().getFirstSync('SELECT * FROM shops LIMIT 1');
  if (s && (!s.daily_target || s.daily_target <= 0)) s.daily_target = 500;
  return s;
}
export function updateShop({ name, category, phone, daily_target, starting_float }) {
  const target = daily_target !== undefined ? daily_target : starting_float;
  const val = parseFloat(target) || 500;
  const finalTarget = val > 0 ? val : 500;
  getDb().runSync('UPDATE shops SET name=?, category=?, phone=?, daily_target=?, starting_float=? WHERE id=1', [name, category, phone, finalTarget, 0]);
}
export function addTransaction({ shop_id, type, amount, description, category, payment_method, is_credit }) {
  const d = getDb();
  d.runSync('INSERT INTO transactions (shop_id,type,amount,description,category,payment_method,is_credit,created_at) VALUES (?,?,?,?,?,?,?,?)', [shop_id ?? 1, type, amount, description, category, payment_method ?? null, is_credit ? 1 : 0, new Date().toISOString()]);
}
export function getTransactions({ type, search, dateFilter } = {}) {
  let sql = 'SELECT * FROM transactions WHERE 1=1';
  const params = [];
  if (type && type !== 'all') { sql += ' AND type=?'; params.push(type); }
  if (search) { sql += ' AND description LIKE ?'; params.push(`%${search}%`); }
  if (dateFilter === 'today') sql += " AND date(created_at)=date('now','localtime')";
  else if (dateFilter === 'week') sql += " AND date(created_at) >= date('now','-6 days','localtime')";
  else if (dateFilter === 'month') sql += " AND strftime('%Y-%m',created_at)=strftime('%Y-%m','now','localtime')";
  sql += ' ORDER BY datetime(created_at) DESC';
  return getDb().getAllSync(sql, params);
}
export function getTodayTotals() {
  const d = getDb();
  const sales = d.getFirstSync("SELECT COALESCE(SUM(amount),0) as s FROM transactions WHERE type='sale' AND date(created_at)=date('now','localtime')");
  const expenses = d.getFirstSync("SELECT COALESCE(SUM(amount),0) as s FROM transactions WHERE type='expense' AND date(created_at)=date('now','localtime')");
  return { sales: sales.s, expenses: expenses.s, profit: sales.s - expenses.s };
}
export function getDailyProfit(days = 7) {
  const d = getDb();
  const rows = d.getAllSync(`
    SELECT date(created_at) as day,
      COALESCE(SUM(CASE WHEN type='sale' THEN amount ELSE 0 END),0) as sales,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as expenses
    FROM transactions
    WHERE date(created_at) >= date('now', ?)
    GROUP BY date(created_at) ORDER BY day ASC
  `, [`-${days - 1} days`]);
  const map = new Map(rows.map(r => [r.day, r]));
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(); dt.setDate(dt.getDate() - i);
    const key = dt.toISOString().slice(0, 10);
    const r = map.get(key);
    const profit = r ? r.sales - r.expenses : 0;
    out.push({ label: dt.toLocaleDateString('en-GH', { weekday: 'short' }).slice(0, 3), day: key, sales: r ? r.sales : 0, expenses: r ? r.expenses : 0, profit });
  }
  return out;
}
export function getTopCategories() {
  return getDb().getAllSync("SELECT category, SUM(amount) as total, COUNT(*) as count FROM transactions WHERE type='sale' GROUP BY category ORDER BY total DESC LIMIT 5");
}
export function clearAll() {
  const d = getDb();
  d.execSync('DELETE FROM transactions; DELETE FROM shops;');
}
