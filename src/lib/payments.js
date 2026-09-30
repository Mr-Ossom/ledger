import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from './firebase';
import { supabase } from './supabase';

/**
 * Triggers a direct MoMo charge on the buyer's phone via Paystack.
 *
 * Flow:
 *  1. App calls Supabase Edge Function (momo-charge) — Paystack secret key lives safely there.
 *  2. Edge Function calls Paystack /charge.
 *  3. watchPayment actively polls momo-verify with the returned reference.
 */
export async function initializePayment({ amount, phone, description, category, inventoryItemId, quantityUsed }) {
  // 1. Call Supabase Edge Function
  const { data, error } = await supabase.functions.invoke('momo-charge', {
    body: { amount, phone, description },
  });

  if (error || !data?.reference) {
    const msg = data?.error || error?.message || 'Could not start the Mobile Money payment.';
    throw new Error(msg);
  }

  const { reference, chargeStatus, provider, normalizedPhone, displayText } = data;

  return {
    paymentId: reference,
    reference,
    chargeStatus,
    provider,
    normalizedPhone,
    displayText: displayText || '',
    amount,
    description,
    category,
    inventoryItemId,
    quantityUsed,
  };
}

/**
 * Submits OTP / Voucher code for charges that require send_otp / send_pin.
 */
export async function submitPaymentOtp({ reference, otp }) {
  const { data, error } = await supabase.functions.invoke('momo-submit-otp', {
    body: { reference, otp },
  });

  if (error || !data?.status) {
    const msg = data?.message || data?.error || error?.message || 'Failed to submit OTP.';
    throw new Error(msg);
  }

  return data;
}

/**
 * Subscribes to a payment tracking record and polls Paystack verify in the background.
 * Returns an unsubscribe function.
 */
export function watchPayment(paymentInfo, callback) {
  let isStopped = false;
  let pollInterval = null;

  const reference = typeof paymentInfo === 'string' ? paymentInfo : paymentInfo?.reference;

  // Listen to Firestore doc if payments collection is used
  let unsubFirestore = () => {};
  try {
    if (db && reference) {
      unsubFirestore = onSnapshot(
        doc(db, 'payments', reference),
        (snap) => {
          if (!snap.exists() || isStopped) return;
          const data = snap.data();
          if (data.status === 'completed' || data.status === 'failed') {
            stopAll();
          }
          callback(data);
        },
        () => {}, // ignore if doc does not exist
      );
    }
  } catch (e) {}

  function stopAll() {
    isStopped = true;
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  // Active polling verification directly with Paystack via momo-verify Edge Function
  const startTime = Date.now();
  pollInterval = setInterval(async () => {
    if (isStopped || Date.now() - startTime > 90000) {
      stopAll();
      return;
    }

    try {
      const { data: verifyRes, error } = await supabase.functions.invoke('momo-verify', {
        body: { reference },
      });

      if (!error && verifyRes) {
        const paystackStatus = verifyRes?.data?.status; // "success" | "failed" | "abandoned" | "pending"
        
        if (paystackStatus === 'success') {
          stopAll();

          callback({
            status: 'completed',
            paystackRef: reference,
            amount: typeof paymentInfo === 'object' ? paymentInfo.amount : undefined,
            description: typeof paymentInfo === 'object' ? paymentInfo.description : undefined,
            category: typeof paymentInfo === 'object' ? paymentInfo.category : undefined,
            inventoryItemId: typeof paymentInfo === 'object' ? paymentInfo.inventoryItemId : undefined,
            quantityUsed: typeof paymentInfo === 'object' ? paymentInfo.quantityUsed : undefined,
          });
        } else if (paystackStatus === 'failed') {
          stopAll();
          callback({ status: 'failed', paystackRef: reference });
        }
      }
    } catch (e) {
      // Polling error silently ignored for next retry
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