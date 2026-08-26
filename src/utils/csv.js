export function toCSV(transactions) {
  const header = ['date','type','amount','description','category','payment_method','is_credit'];
  const rows = transactions.map(t => [t.created_at, t.type, t.amount, `"${String(t.description).replace(/"/g,'""')}"`, t.category, t.payment_method || '', t.is_credit ? '1' : '0']);
  return [header.join(','), ...rows.map(r => r.join(','))].join('\n');
}
