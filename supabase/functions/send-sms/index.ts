// // Follow this setup guide to integrate the Deno language server with your editor:
// // https://deno.land/manual/getting_started/setup_your_environment
// // This enables autocomplete, go to definition, etc.

// // Setup type definitions for built-in Supabase Runtime APIs
// import "@supabase/functions-js/edge-runtime.d.ts";
// import { withSupabase } from "@supabase/server";

// console.log("Hello from Functions!");

// // This endpoint uses 'publishable' | 'secret' access, apiKey is required.
// // Use publishable for Client-facing, key-validated endpoints
// // Use secret for Server-to-server, internal calls
// export default {
//   fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req, ctx) => {
//     // Called by another service with a secret key
//     // ctx.supabaseAdmin bypasses RLS — use for privileged operations
//     /*
//     if (ctx.authMode === "secret") {
//       const { user_id } = await req.json();
//       const { data } = await ctx.supabaseAdmin.auth.admin.getUserById(user_id);

//       return Response.json({
//         email: data?.user?.email,
//       });
//     }
//     */

//     const { name } = await req.json();

//     return Response.json({
//       message: `Hello ${name}!`,
//     });
//   }),
// };

// /* To invoke locally:

//   1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
//   2. Make an HTTP request:

//   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-sms' \
//     --header 'apiKey: sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH' \
//     --data '{"name":"Functions"}'

// */

const BMS_API_KEY = Deno.env.get("BMS_API_KEY");
const BMS_API_URL =
  Deno.env.get("BMS_API_URL") ||
  "https://api.mnotify.com/api/sms/quick";
const BMS_SENDER_ID =
  Deno.env.get("BMS_SENDER_ID") || "CoreLedger";

Deno.serve(async (req) => {
  try {
    // Supabase Auth sends the hook event as JSON
    const event = await req.json();

    const phone = event?.user?.phone;
    const otp = event?.sms?.otp;

    console.log("Send SMS hook received:", {
      phone,
      hasOtp: Boolean(otp),
    });

    if (!phone || !otp) {
      return new Response(
        JSON.stringify({
          error: "Missing phone number or OTP",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (!BMS_API_KEY) {
      console.error("BMS_API_KEY is not configured");

      return new Response(
        JSON.stringify({
          error: "BMS API key is not configured",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    const message = `Your CoreLedger verification code is ${otp}. It expires shortly. Do not share this code with anyone.`;

    const response = await fetch(
      `${BMS_API_URL}?key=${encodeURIComponent(BMS_API_KEY)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: [phone],
          sender: BMS_SENDER_ID,
          message,
          is_schedule: false,
          schedule_date: "",
          sms_type: "otp",
        }),
      },
    );

    const result = await response.json();

    console.log("BMS response:", result);

    if (!response.ok || result?.status !== "success") {
      return new Response(
        JSON.stringify({
          error: "BMS failed to send SMS",
          details: result,
        }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Supabase Auth expects a successful 2xx response.
    return new Response(null, {
      status: 200,
    });
  } catch (error) {
    console.error("Send SMS error:", error);

    return new Response(
      JSON.stringify({
        error: "Unexpected error sending SMS",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
});