/**
 * Supabase Edge Function: momo-charge
 *
 * Calls Paystack's direct /charge API so the USSD prompt goes straight
 * to the buyer's Ghana MoMo phone.
 */

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
const PAYSTACK_BASE = "https://api.paystack.co";

function parseGhanaPhone(input: string): { local: string; e164: string } {
  let s = String(input ?? "").trim().replace(/[\s\-().]/g, "");
  if (s.startsWith("+233")) s = s.slice(4);
  else if (s.startsWith("233")) s = s.slice(3);
  else if (s.startsWith("0")) s = s.slice(1);

  if (!/^\d{9}$/.test(s)) {
    throw new Error("Please enter a valid Ghana mobile number (e.g. 024 123 4567).");
  }

  const local = "0" + s;        // e.g. "0241234567" - required by Paystack MoMo API
  const e164 = "+233" + s;      // e.g. "+233241234567"
  return { local, e164 };
}

function inferProvider(localPhone: string): "mtn" | "vod" | "atl" {
  if (/^0(24|54|55|59|25)/.test(localPhone)) return "mtn";
  if (/^0(20|50)/.test(localPhone)) return "vod";
  if (/^0(27|57|26|56)/.test(localPhone)) return "atl";
  return "mtn";
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

  let localPhone: string;
  let e164Phone: string;
  try {
    const parsed = parseGhanaPhone(String(phone));
    localPhone = parsed.local;
    e164Phone = parsed.e164;
  } catch (e) {
    return respond({ error: (e as Error).message }, 400);
  }

  const provider = inferProvider(localPhone);
  const safeShopId = String(shopId ?? "none");
  const uuid = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const reference = `CL-${safeShopId}-${uuid}`.replace(/[^A-Za-z0-9\-_=.]/g, "_");
  const email = `${localPhone}@coreledger.app`;
  const amountPesewas = Math.round(Number(amount) * 100);

  // Call Paystack /charge — Paystack Ghana expects 10-digit local format for mobile_money.phone
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
          phone: localPhone, // e.g. "0551234987" (10-digit local format required for direct USSD prompt)
          provider,          // "mtn" | "vod" | "atl"
        },
        metadata: {
          custom_fields: [
            { display_name: "Buyer Phone", variable_name: "phone", value: localPhone },
            { display_name: "Shop ID", variable_name: "shop_id", value: safeShopId },
            { display_name: "Description", variable_name: "description", value: String(description ?? "") },
            { display_name: "App", variable_name: "app", value: "CoreLedger" },
          ],
        },
      }),
    });

    chargeData = await chargeRes.json().catch(() => ({})) as Record<string, unknown>;
    console.log("Paystack /charge response:", JSON.stringify(chargeData));

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
  const displayText = String((chargeData.data as Record<string, unknown>)?.display_text ?? "");

  return respond({
    reference,
    chargeStatus,
    provider,
    normalizedPhone: localPhone,
    displayText,
  });
});
