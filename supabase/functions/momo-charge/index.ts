/**
 * Supabase Edge Function: momo-charge
 *
 * Calls Paystack's direct /charge API so the USSD prompt goes straight
 * to the buyer's Ghana MoMo phone. The Paystack secret key lives here
 * (safe on Supabase servers, never in the app).
 *
 * The app writes the Firestore payment tracking doc itself using its
 * existing Firebase client — no firebase-admin needed here.
 *
 * Set this secret once:
 *   npx supabase secrets set PAYSTACK_SECRET_KEY=sk_live_...
 */

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
const PAYSTACK_BASE = "https://api.paystack.co";

function normalizeGhanaPhone(input: string): string {
  let s = String(input ?? "").trim().replace(/[\s\-().]/g, "");
  if (s.startsWith("+")) s = s.slice(1);
  if (s.startsWith("0")) s = "233" + s.slice(1);
  if (!/^233\d{9}$/.test(s)) {
    throw new Error("Please enter a valid Ghana mobile number (e.g. 024 123 4567).");
  }
  return "+" + s;
}

function inferProvider(e164: string): "mtn" | "vod" | "atl" {
  const local = e164.replace(/^\+233/, "0");
  if (/^0(24|54|55|59|25)/.test(local)) return "mtn";
  if (/^0(20|50)/.test(local)) return "vod";
  if (/^0(27|57|26|56)/.test(local)) return "atl";
  return "mtn"; // MTN is most common in Ghana
}

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  if (!PAYSTACK_SECRET_KEY) {
    return respond({ error: "Payment service not configured. Set PAYSTACK_SECRET_KEY." }, 500);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return respond({ error: "Invalid JSON body" }, 400);
  }

  const { amount, phone, description, shopId } = body;

  if (!amount || Number(amount) <= 0) return respond({ error: "Enter a valid amount." }, 400);
  if (!phone) return respond({ error: "Buyer phone number is required." }, 400);

  let normalizedPhone: string;
  try {
    normalizedPhone = normalizeGhanaPhone(String(phone));
  } catch (e) {
    return respond({ error: (e as Error).message }, 400);
  }

  const provider = inferProvider(normalizedPhone);
  const safeShopId = String(shopId ?? "none");
  const uuid = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const reference = `CL-${safeShopId}-${uuid}`.replace(/[^A-Za-z0-9\-_=.]/g, "_");
  const email = `${normalizedPhone.replace("+", "")}@coreledger.app`;
  const amountPesewas = Math.round(Number(amount) * 100);

  // Call Paystack /charge — this sends the USSD prompt directly to the buyer's phone
  let chargeData: Record<string, unknown>;
  try {
    const chargeRes = await fetch(`${PAYSTACK_BASE}/charge`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPesewas,
        email,
        currency: "GHS",
        reference,
        mobile_money: {
          phone: normalizedPhone, // E.164 e.g. "+233241234567"
          provider,               // "mtn" | "vod" | "atl"
        },
        metadata: {
          custom_fields: [
            { display_name: "Buyer Phone", variable_name: "phone", value: normalizedPhone },
            { display_name: "Shop ID", variable_name: "shop_id", value: safeShopId },
            { display_name: "Description", variable_name: "description", value: String(description ?? "") },
            { display_name: "App", variable_name: "app", value: "CoreLedger" },
          ],
        },
      }),
    });

    chargeData = await chargeRes.json().catch(() => ({})) as Record<string, unknown>;
    console.log("Paystack /charge:", JSON.stringify(chargeData));

    if (!chargeRes.ok || !chargeData.status) {
      const msg = String((chargeData.message as string) ?? "Paystack could not start the payment.");
      return respond({ error: msg }, 502);
    }

    const dataStatus = (chargeData.data as Record<string, unknown>)?.status;
    if (dataStatus === "failed") {
      const msg = (chargeData.data as Record<string, unknown>)?.display_text ?? "Payment was declined.";
      return respond({ error: String(msg) }, 400);
    }
  } catch (e) {
    console.error("Paystack fetch error:", e);
    return respond({ error: "Could not reach Paystack. Please try again." }, 502);
  }

  const chargeStatus = String((chargeData.data as Record<string, unknown>)?.status ?? "pending");

  // Return the Paystack reference so the app can write the Firestore doc itself
  return respond({
    reference,        // app uses this to write the Firestore payments doc
    chargeStatus,     // "pending" | "pay_offline" | "success"
    provider,
    normalizedPhone,
  });
});
