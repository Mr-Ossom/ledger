export function getPeakDayOfWeek(transactions, opts = {}) {
  const sales = transactions.filter(t => t.type === 'sale' && typeof t.amount === 'number');
  if (sales.length === 0) return null;

  const use30d = sales.length >= 10;
  const days = opts.days || (use30d ? 30 : 7);
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days); cutoff.setHours(0,0,0,0);
  const filtered = sales.filter(t => new Date(t.created_at) >= cutoff);
  const pool = filtered.length >= 3 ? filtered : sales;

  const byWeekday = new Map();
  const byWeekdayTotal = new Map();
  for (const t of pool) {
    const d = new Date(t.created_at);
    const wd = d.toLocaleDateString('en-GH', { weekday: 'long' });
    byWeekday.set(wd, (byWeekday.get(wd) || 0) + 1);
    byWeekdayTotal.set(wd, (byWeekdayTotal.get(wd) || 0) + t.amount);
  }
  if (byWeekdayTotal.size === 0) return null;

  let peakDay = null, peakTotal = -1;
  for (const [wd, total] of byWeekdayTotal.entries()) {
    if (total > peakTotal) { peakTotal = total; peakDay = wd; }
  }
  const sorted = Array.from(byWeekdayTotal.entries()).sort((a,b) => b[1]-a[1]);
  const second = sorted[1] || null;
  const totalWeek = pool.reduce((a,t)=>a+t.amount,0);
  const avgPerSaleDay = byWeekdayTotal.size ? totalWeek / byWeekdayTotal.size : 0;

  return {
    peakDay,
    peakTotal,
    peakCount: byWeekday.get(peakDay) || 0,
    secondDay: second ? second[0] : null,
    secondTotal: second ? second[1] : 0,
    days,
    poolSize: pool.length,
    totalWeek,
    avgPerSaleDay,
  };
}

export function getWeekAvg(transactions, days = 7) {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days); cutoff.setHours(0,0,0,0);
  const sum = transactions.filter(t => t.type === 'sale' && new Date(t.created_at) >= cutoff).reduce((a,t)=>a+t.amount,0);
  return sum / days;
}

export function getTopCategory(transactions) {
  const map = new Map();
  for (const t of transactions) if (t.type === 'sale') {
    map.set(t.category, (map.get(t.category)||0)+t.amount);
  }
  let top = null, topTotal = -1;
  for (const [c,total] of map.entries()) if (total>topTotal){top=c; topTotal=total;}
  return top ? { category: top, total: topTotal } : null;
}
