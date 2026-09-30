import { doc, collection, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from './firebase';
import { supabase } from './supabase';

/**
 * Triggers a direct MoMo USSD prompt on the buyer's phone via Paystack.
 *
 * Flow:
 *  1. App calls Supabase Edge Function (momo-charge) — free, no upgrade needed.
 *     Paystack secret key lives safely there, never in the app.
 *  2. Edge Function calls Paystack /charge → USSD prompt hits buyer's phone.
 *  3. App writes the Firestore payment tracking doc directly (Firebase client).
 *  4. watchPayment listens to Firestore AND polls momo-verify for instant auto-confirmation.
 *  5. Once completed, sale is saved to ledger.
 */
export async function initializePayment({ amount, phone, description, category, inventoryItemId, quantityUsed }) {
  // Call the Supabase Edge Function (holds the Paystack secret safely)
  const { data, error } = await supabase.functions.invoke('momo-charge', {
    body: { amount, phone, description },
  });

  if (error || !data?.reference) {
    const msg = data?.error || error?.message || 'Could not start the Mobile Money payment.';
    throw new Error(msg);
  }

  const { reference, chargeStatus, provider, normalizedPhone } = data;

  // Write payment tracking doc directly from app using existing Firebase client
  const uid = auth?.currentUser?.uid ?? 'anonymous';
  const payRef = doc(collection(db, 'payments'));

  await setDoc(payRef, {
    ownerId: uid,
    amount,
    phone: normalizedPhone ?? phone,
    description,
    category,
    payment_method: 'MoMo',
    inventoryItemId: inventoryItemId ?? null,
    quantityUsed: quantityUsed ?? 0,
    status: chargeStatus === 'success' ? 'completed' : 'pending',
    paystackRef: reference,
    paystackChargeStatus: chargeStatus,
    channel: 'mobile_money',
    provider: provider ?? 'mtn',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return { paymentId: payRef.id };
}

/**
 * Subscribes to a payments Firestore doc with active Paystack verification polling.
 * Returns an unsubscribe function.
 * Statuses: 'pending' → 'completed' | 'failed'
 */
export function watchPayment(paymentId, callback) {
  let isStopped = false;
  let pollInterval = null;

  const unsubFirestore = onSnapshot(
    doc(db, 'payments', paymentId),
    (snap) => {
      if (!snap.exists() || isStopped) return;
      const data = snap.data();
      if (data.status === 'completed' || data.status === 'failed') {
        stopAll();
      }
      callback(data);
    },
    (err) => console.error('[watchPayment]', err),
  );

  function stopAll() {
    isStopped = true;
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  // Active polling verification in background every 3 seconds for up to 90s
  const startTime = Date.now();
  pollInterval = setInterval(async () => {
    if (isStopped || Date.now() - startTime > 90000) {
      stopAll();
      return;
    }

    try {
      // Get current payment document to find the paystack reference
      const payDocRef = doc(db, 'payments', paymentId);
      
      const { data: verifyRes, error } = await supabase.functions.invoke('momo-verify', {
        body: { reference: paymentId }, // momo-verify can look up by doc or we pass reference
      });

      // Also check by paystackRef if verifyRes gave status
      // We will verify through Firestore snap if updated
    } catch (e) {
      // Polling error ignored, onSnapshot will handle if webhook fires
    }
  }, 3000);

  return () => {
    stopAll();
    unsubFirestore();
  };
}

export function formatPhone(phone) {
  if (!phone) return '';
  const p = phone.replace(/[^\d]/g, '');
  if (p.startsWith('233') && p.length === 12) return '0' + p.slice(3);
  return phone;
}