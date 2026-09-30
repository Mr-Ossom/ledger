import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
const PAYSTACK_BASE = "https://api.paystack.co";

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

serve(async (req: Request) => {
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
    return respond({ error: "PAYSTACK_SECRET_KEY not set" }, 500);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { reference, otp } = body;

    if (!reference || !otp) {
      return respond({ error: "Both reference and OTP are required" }, 400);
    }

    const res = await fetch(`${PAYSTACK_BASE}/charge/submit_otp`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reference, otp: String(otp).trim() }),
    });

    const data = await res.json();
    return respond(data, res.status);
  } catch (err) {
    return respond({ error: (err as Error).message }, 500);
  }
});
