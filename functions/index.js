const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ region: 'us-central1' });

const PAYSTACK_SECRET = defineSecret('PAYSTACK_SECRET_KEY');
const PAYSTACK_BASE = 'https://api.paystack.co';

// ─── helpers ──────────────────────────────────────────────────────────────────

function normalizeGhanaPhone(input) {
  let s = String(input ?? '').trim().replace(/[\s\-().]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('0')) s = '233' + s.slice(1);
  if (!/^233\d{9}$/.test(s)) {
    throw new Error('Please enter a valid Ghana mobile number (e.g. 024 123 4567).');
  }
  return '+' + s;
}

function inferProvider(e164) {
  const local = e164.replace(/^\+233/, '0');
  if (/^0(24|54|55|59|25)/.test(local)) return 'mtn';
  if (/^0(20|50)/.test(local)) return 'vod';
  if (/^0(27|57|26|56)/.test(local)) return 'atl';
  return 'mtn';
}

function deny(res, msg, status = 400) {
  return res.status(status).json({ error: msg });
}

// ─── momoCharge ───────────────────────────────────────────────────────────────
/**
 * Called by the app when the seller taps "Send MoMo Request".
 * Calls Paystack /charge → USSD prompt fires on buyer's phone immediately.
 * App then writes the Firestore tracking doc directly using the Firebase
 * client it already has — no admin SDK needed for that part.
 *
 * Set the secret once:
 *   firebase functions:secrets:set PAYSTACK_SECRET_KEY
 */
exports.momoCharge = onRequest(
  { secrets: [PAYSTACK_SECRET], cors: true },
  async (req, res) => {
    if (req.method !== 'POST') return deny(res, 'Method not allowed', 405);

    const { amount, phone, description, shopId } = req.body ?? {};

    if (!amount || Number(amount) <= 0) return deny(res, 'Enter a valid amount.');
    if (!phone) return deny(res, 'Buyer phone number is required.');

    const key = PAYSTACK_SECRET.value();
    if (!key) return deny(res, 'Payment service not configured.', 500);

    let normalizedPhone;
    try {
      normalizedPhone = normalizeGhanaPhone(String(phone));
    } catch (e) {
      return deny(res, e.message);
    }

    const provider = inferProvider(normalizedPhone);
    const safeShopId = String(shopId ?? 'none');
    const reference = `CL-${safeShopId}-${crypto.randomUUID().slice(0, 12)}`.replace(/[^A-Za-z0-9\-_=.]/g, '_');
    const email = `${normalizedPhone.replace('+', '')}@coreledger.app`;
    const amountPesewas = Math.round(Number(amount) * 100);

    // Send USSD prompt directly to buyer's phone
    let chargeData;
    try {
      const chargeRes = await fetch(`${PAYSTACK_BASE}/charge`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountPesewas,
          email,
          currency: 'GHS',
          reference,
          mobile_money: { phone: normalizedPhone, provider },
          metadata: {
            custom_fields: [
              { display_name: 'Buyer Phone', variable_name: 'phone', value: normalizedPhone },
              { display_name: 'Shop ID', variable_name: 'shop_id', value: safeShopId },
              { display_name: 'Description', variable_name: 'description', value: String(description ?? '') },
              { display_name: 'App', variable_name: 'app', value: 'CoreLedger' },
            ],
          },
        }),
      });

      chargeData = await chargeRes.json().catch(() => ({}));
      console.log('Paystack /charge response:', JSON.stringify(chargeData));

      if (!chargeRes.ok || !chargeData.status) {
        return deny(res, chargeData.message ?? 'Paystack could not start the payment.', 502);
      }

      if (chargeData.data?.status === 'failed') {
        return deny(res, chargeData.data?.display_text ?? 'Payment was declined.', 400);
      }
    } catch (e) {
      console.error('Paystack error:', e);
      return deny(res, 'Could not reach Paystack. Try again.', 502);
    }

    const chargeStatus = chargeData.data?.status ?? 'pending';

    // Return reference so the app can write its own Firestore doc
    return res.json({ reference, chargeStatus, provider, normalizedPhone });
  },
);

// ─── momoWebhook ──────────────────────────────────────────────────────────────
/**
 * Paystack calls this when a payment succeeds or fails.
 * It updates the matching Firestore payments doc → app's watchPayment fires.
 *
 * Add this URL in Paystack Dashboard → Settings → Webhooks:
 *   https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/momoWebhook
 */
exports.momoWebhook = onRequest(
  { secrets: [PAYSTACK_SECRET] },
  async (req, res) => {
    const key = PAYSTACK_SECRET.value();

    // Verify Paystack HMAC signature
    if (key) {
      const sig = req.get('x-paystack-signature') ?? '';
      const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
      const hash = crypto.createHmac('sha512', key).update(rawBody).digest('hex');
      if (hash !== sig) return res.status(401).send('Invalid signature');
    }

    const event = req.body;
    const reference = event?.data?.reference;
    if (!reference) return res.status(200).send('ignored');

    const snap = await db.collection('payments').where('paystackRef', '==', reference).limit(1).get();
    if (snap.empty) return res.status(200).send('unknown reference');

    const payRef = snap.docs[0].ref;
    const ts = admin.firestore.FieldValue.serverTimestamp();

    if (event.event === 'charge.success') {
      await payRef.update({
        status: 'completed',
        paystackTransactionId: event.data.id ? String(event.data.id) : null,
        paidAt: event.data.paid_at ?? null,
        updatedAt: ts,
      });
    } else if (['charge.failed', 'charge.unknown'].includes(event.event)) {
      await payRef.update({ status: 'failed', updatedAt: ts });
    }

    res.status(200).send('OK');
  },
);
