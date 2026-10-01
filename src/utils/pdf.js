import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtMoney(n) {
  return 'GHS ' + (Number(n) || 0).toFixed(2);
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${MONTHS[d.getMonth()]} ${d.getFullYear()} · ${hh}:${mm}`;
}

export function buildReportHtml(transactions, shopName = 'My Shop') {
  const sales = transactions.filter(t => t.type === 'sale');
  const expenses = transactions.filter(t => t.type === 'expense');
  const totalSales = sales.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalExpenses = expenses.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const net = totalSales - totalExpenses;

  const rows = transactions.map((t) => {
    const isSale = t.type === 'sale';
    const credit = t.is_credit ? ' · Credit' : '';
    const amount = isSale ? `+${fmtMoney(t.amount)}` : `−${fmtMoney(t.amount)}`;
    return `
      <tr class="${isSale ? 'row-sale' : 'row-expense'}">
        <td class="td-date">${esc(fmtDate(t.created_at))}</td>
        <td><span class="badge ${isSale ? 'badge-sale' : 'badge-expense'}">${isSale ? 'Sale' : 'Expense'}</span></td>
        <td>${esc(t.description)}</td>
        <td>${esc(t.category)}</td>
        <td>${esc(!isSale ? '—' : t.payment_method || 'Cash')}${credit}</td>
        <td class="td-money amount-${isSale ? 'sale' : 'expense'}">${amount}</td>
      </tr>`;
  }).join('\n');

  const now = new Date();
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: Helvetica, Arial, sans-serif; color: #1B2E4A; margin: 0; padding: 24px; }
  .header { background: #1B2E4A; color: #F6F1E4; border-radius: 10px; padding: 18px 20px; }
  .brand { font-size: 13px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #D9A527; }
  .shop { font-size: 20px; font-weight: 800; margin-top: 6px; }
  .sub { font-size: 11px; color: #F6F1E4; opacity: 0.8; margin-top: 4px; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 1px; margin: 22px 0 10px; }
  .summary-tbl { width: 100%; border-collapse: separate; border-spacing: 8px 0; margin-top: 12px; table-layout: fixed; }
  .summary-tbl td { border: none; }
  .sum-card { background: #F6F1E4; border-radius: 10px; padding: 12px; border-top: 3px solid #1B2E4A; }
  .sum-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #6B7A90; }
  .sum-value { font-size: 15px; font-weight: 800; margin-top: 6px; font-family: "Courier New", monospace; }
  .sum-sales { border-top-color: #1F6F5C; } .sum-sales .sum-value { color: #1F6F5C; }
  .sum-expenses { border-top-color: #B5423A; } .sum-expenses .sum-value { color: #B5423A; }
  .sum-net { border-top-color: #D9A527; }
  .sum-count { border-top-color: #1B2E4A; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
  th { background: #1B2E4A; color: #F6F1E4; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; }
  td { padding: 8px 10px; border-bottom: 1px solid #E8E0D0; vertical-align: top; }
  tr.row-sale:nth-child(odd) { background: #F6F1E4; }
  .td-date { white-space: nowrap; color: #6B7A90; font-size: 10px; }
  .td-money { text-align: right; white-space: nowrap; font-weight: 800; font-family: "Courier New", monospace; }
  .amount-sale { color: #1F6F5C; }
  .amount-expense { color: #B5423A; }
  .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; }
  .badge-sale { background: #1F6F5C; color: #fff; }
  .badge-expense { background: #B5423A; color: #fff; }
  .footer { margin-top: 20px; font-size: 10px; color: #6B7A90; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">CoreLedger</div>
    <div class="shop">${esc(shopName)}</div>
    <div class="sub">Business Report · Generated ${fmtDate(now.toISOString())} · ${transactions.length} transactions</div>
  </div>

  <h2>Summary</h2>
  <table class="summary-tbl">
    <tr>
      <td class="sum-card sum-sales"><div class="sum-label">Total Sales</div><div class="sum-value">${fmtMoney(totalSales)}</div></td>
      <td class="sum-card sum-expenses"><div class="sum-label">Total Expenses</div><div class="sum-value">${fmtMoney(totalExpenses)}</div></td>
      <td class="sum-card sum-net"><div class="sum-label">Net Income</div><div class="sum-value">${fmtMoney(net)}</div></td>
      <td class="sum-card sum-count"><div class="sum-label">Transactions</div><div class="sum-value">${transactions.length}</div></td>
    </tr>
  </table>

  <h2>Transactions</h2>
  <table>
    <thead>
      <tr><th>Date</th><th>Type</th><th>Description</th><th>Category</th><th>Payment</th><th style="text-align:right">Amount</th></tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="footer">Generated by CoreLedger · Offline-first bookkeeping for Ghana</div>
</body>
</html>`;
}

export async function exportToPDF(transactions, shopName = 'My Shop') {
  if (!transactions || transactions.length === 0) {
    throw new Error('No transactions to export.');
  }
  const html = buildReportHtml(transactions, shopName);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return null;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Share Ledger Report',
    UTI: 'com.adobe.pdf',
  });
  return uri;
}