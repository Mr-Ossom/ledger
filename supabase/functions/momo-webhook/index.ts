import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-paystack-signature",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature") || "";

    if (PAYSTACK_SECRET_KEY && signature) {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(PAYSTACK_SECRET_KEY);
      const msgData = encoder.encode(rawBody);

      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-512" },
        false,
        ["sign"]
      );

      const signatureBytes = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
      const hashArray = Array.from(new Uint8Array(signatureBytes));
      const calculatedSignature = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      if (calculatedSignature !== signature) {
        console.warn("Invalid Paystack signature");
        return new Response("Invalid signature", { status: 401 });
      }
    }

    const event = JSON.parse(rawBody);
    console.log("Paystack webhook event received:", event?.event, event?.data?.reference);

    // Paystack requires a 200 OK response
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return new Response("OK", { status: 200 });
  }
});
