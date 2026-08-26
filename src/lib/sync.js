import { supabase, isSupabaseConfigured } from './supabase';
import { getTransactions as getLocalTx, addTransaction as addLocalTx, getShop } from '../database';
let NetInfo = null;
try { NetInfo = require('@react-native-community/netinfo').default; } catch {}

async function isOnline() {
  if (NetInfo) try { const s = await NetInfo.fetch(); return !!s.isConnected; } catch { return true; }
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export async function pushTransaction(tx) {
  if (!isSupabaseConfigured()) return;
  if (!(await isOnline())) return;
  try {
    const shop = getShop();
    if (!shop) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: shopRow } = await supabase.from('shops').select('id').eq('owner_id', user.id).limit(1).single();
    if (!shopRow) return;
    await supabase.from('transactions').insert({
      shop_id: shopRow.id,
      owner_id: user.id,
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      category: tx.category,
      payment_method: tx.payment_method,
      is_credit: tx.is_credit ? 1 : 0,
      created_at: tx.created_at || new Date().toISOString(),
    });
  } catch {}
}

export async function pullTransactions() {
  if (!isSupabaseConfigured()) return;
  if (!(await isOnline())) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('transactions').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(200);
    if (error || !data) return;
    for (const row of data) {
      const local = getLocalTx({}).find(t => t.id === row.id);
      if (!local) {
        addLocalTx({ shop_id: 1, type: row.type, amount: row.amount, description: row.description, category: row.category, payment_method: row.payment_method, is_credit: row.is_credit });
      }
    }
  } catch {}
}

export function subscribeTransactions(cb) {
  if (!isSupabaseConfigured()) return () => {};
  try {
    const ch = supabase.channel('tx-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, cb).subscribe();
    return () => supabase.removeChannel(ch);
  } catch { return () => {}; }
}
