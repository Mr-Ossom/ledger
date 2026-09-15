const express = require('express');
const crypto = require('crypto');
const firebase = require('firebase-admin');

const SVC_ACCOUNT_B64 = process.env.FIREBASE_SERVICE_ACCOUNT || '';
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_BASE = 'https://api.paystack.co';

if (!SVC_ACCOUNT_B64) {
  console.warn('FIREBASE_SERVICE_ACCOUNT is not set — falling back to applicationDefault().');
}
firebase.initializeApp({
  credential: SVC_ACCOUNT_B64
    ? firebase.credential.cert(JSON.parse(Buffer.from(SVC_ACCOUNT_B64, 'base64').toString('utf8')))
    : firebase.applicationDefault(),
});

const db = firebase.firestore();

function normalizeGhanaPhone(input) {
  let s = String(input || '').trim().replace(/[\s\-().]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('0')) s = '233' + s.slice(1);
  if (!/^233\d{9}$/.test(s)) {
    throw new Error('Please enter a valid Ghana mobile number (e.g. 024 123 4567).');
  }
  return '+' + s;
}

function deny(res, message) {
  return res.status(400).json({ error: message });
}

async function requireAuth(req, res) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return null;
  }
  try {
    return await firebase.auth().verifyIdToken(token);
  } catch (e) {
    console.error('Token verification failed', e.message);
    res.status(401).json({ error: 'Invalid session token.' });
    return null;
  }
}

const app = express();

app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(
  express.json({
    limit: '1mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

/**
 * POST /api/initialize
 * Body: { amount, phone, description, category, inventoryItemId, quantityUsed }
 * Auth: Bearer <Firebase ID token> (verifies the logged-in shop owner)
 * Returns: { paymentId }
 */
app.post('/api/initialize', async (req, res) => {
  const decoded = await requireAuth(req, res);
  if (!decoded) return;
  const uid = decoded.uid;
  const body = req.body || {};

  const amount = Number(body.amount);
  const description = String(body.description || '').trim();
  const category = String(body.category || 'Other');

  if (!amount || amount <= 0) return deny(res, 'Enter a valid amount.');

  let phone;
  try {
    phone = normalizeGhanaPhone(body.phone);
  } catch (e) {
    return deny(res, e.message);
  }

  let shopId = 'none';
  try {
    const snap = await db.collection('shops').where('ownerId', '==', uid).limit(1).get();
    if (!snap.empty) shopId = snap.docs[0].id;
  } catch (e) {
    console.error('Shop lookup failed', e);
  }

  const amountPesewas = Math.round(amount * 100);
  const reference = `CL-${shopId}-${crypto.randomUUID().slice(0, 12)}`.replace(/[^A-Za-z0-9\-_=.]/g, '_');
  const email = `${phone.replace('+', '')}@coreledger.app`;

  let initRes;
  try {
    initRes = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPesewas,
        email,
        currency: 'GHS',
        reference,
        channels: ['mobile_money'],
        metadata: JSON.stringify({
          custom_fields: [
            { display_name: 'Buyer Phone', variable_name: 'phone', value: phone },
            { display_name: 'Shop ID', variable_name: 'shop_id', value: shopId },
            { display_name: 'App', variable_name: 'app', value: 'CoreLedger' },
          ],
        }),
      }),
    });
  } catch (e) {
    console.error('Paystack initialize error', e.message);
    return res.status(502).json({ error: 'Could not reach Paystack. Please try again.' });
  }

  const paystackData = await initRes.json().catch(() => ({}));
  if (!initRes.ok || !paystackData.status || !paystackData.data) {
    const msg = paystackData.message || 'Paystack could not start the payment.';
    console.error('Paystack error', msg);
    return res.status(502).json({ error: msg });
  }

  const payRef = db.collection('payments').doc();
  await payRef.set({
    ownerId: uid,
    shopId,
    amount,
    phone,
    description,
    category,
    payment_method: 'MoMo',
    inventoryItemId: body.inventoryItemId || null,
    quantityUsed: Number(body.quantityUsed) || 0,
    status: 'pending',
    paystackRef: reference,
    paystackAccessCode: paystackData.data.access_code || null,
    channel: 'mobile_money',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  res.json({ paymentId: payRef.id });
});

/**
 * POST /api/webhook — Paystack calls this. Verify HMAC SHA-512, then update
 * the matching `payments` doc. No auth (Paystack signs requests instead).
 */
app.post('/api/webhook', async (req, res) => {
  try {
    const signature = req.get('x-paystack-signature') || '';
    if (PAYSTACK_SECRET_KEY) {
      const rawBody = (req.rawBody || Buffer.from(JSON.stringify(req.body))).toString('utf8');
      const hash = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
      if (hash !== signature) return res.status(401).send('Invalid signature');
    }

    const event = req.body;
    const reference = event?.data?.reference;
    if (!reference) return res.status(200).send('ignored');

    const snap = await db.collection('payments').where('paystackRef', '==', reference).limit(1).get();
    if (snap.empty) return res.status(200).send('unknown reference');

    const payRef = snap.docs[0].ref;
    const ts = firebase.firestore.FieldValue.serverTimestamp();

    if (event.event === 'charge.success') {
      await payRef.update({
        status: 'completed',
        paystackTransactionId: event.data.id ? String(event.data.id) : null,
        paidAt: event.data.paid_at || null,
        updatedAt: ts,
      });
    } else if (event.event === 'charge.failed' || event.event === 'charge.unknown') {
      await payRef.update({ status: 'failed', updatedAt: ts });
    }

    res.status(200).send('OK');
  } catch (e) {
    console.error('Webhook error', e);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/', (req, res) => res.json({ ok: true, service: 'coreledger-paystack' }));

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`CoreLedger Paystack server on :${port}`));
}

module.exports = app;