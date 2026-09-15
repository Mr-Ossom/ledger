import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from './firebase';

const SERVER_URL = (process.env.EXPO_PUBLIC_PAYSTACK_SERVER_URL || '').replace(/\/+$/, '');

/**
 * Calls the payment server (Express, hosted on Vercel/Render) which initializes
 * a Paystack Mobile Money charge and writes a `payments` doc to Firestore.
 * Authenticates with the current user's Firebase ID token.
 * Returns `{ paymentId }` — the Firestore id used to track the charge until the
 * buyer completes it on their phone.
 */
export async function initializePayment({ amount, phone, description, category, inventoryItemId, quantityUsed }) {
  if (!SERVER_URL) {
    throw new Error('Payment server is not configured. Set EXPO_PUBLIC_PAYSTACK_SERVER_URL.');
  }
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : '';

  const res = await fetch(`${SERVER_URL}/api/initialize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ amount, phone, description, category, inventoryItemId, quantityUsed }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || 'Could not start the Mobile Money payment.');
  }
  return json;
}

/**
 * Subscribes to a `payments` doc. Returns an unsubscribe function.
 * Statuses: 'pending' → 'completed' | 'failed'.
 */
export function watchPayment(paymentId, callback) {
  return onSnapshot(
    doc(db, 'payments', paymentId),
    (snap) => {
      if (snap.exists()) callback(snap.data());
    },
    (err) => console.error('[watchPayment error]', err)
  );
}

export function formatPhone(phone) {
  if (!phone) return '';
  const p = phone.replace(/[^\d]/g, '');
  if (p.startsWith('233') && p.length === 12) return '0' + p.slice(3);
  return phone;
}