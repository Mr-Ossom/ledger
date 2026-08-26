import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("0")) return "233" + d.slice(1);
  if (d.startsWith("233")) return d;
  if (d.length === 9) return "233" + d;
  return d;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const action = url.pathname.endsWith("/verify") ? "verify" : url.pathname.endsWith("/send") ? "send" : null;
  const body = await req.json().catch(() => ({}));
  const phoneRaw = body.phone || body.phone_number || "";
  const phone = normalizePhone(String(phoneRaw));
  if (!phone) return new Response(JSON.stringify({ error: "phone required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const bmsKey = Deno.env.get("BMS_API_KEY") || Deno.env.get("BMS_KEY") || "";
  const bmsSender = Deno.env.get("BMS_SENDER_ID") || "Ledger";
  const bmsUrl = Deno.env.get("BMS_API_URL") || "https://api.bmsgh.com/api/v1/send";
  const supabase = createClient(supabaseUrl, serviceKey);

  if (action === "send") {
    const { data: existing } = await supabase.from("otp_codes").select("created_at").eq("phone", phone).single();
    if (existing) {
      const age = Date.now() - new Date(existing.created_at).getTime();
      if (age < 60_000) return new Response(JSON.stringify({ error: "wait 60s before resend" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const hash = await bcrypt.hash(otp);
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    await supabase.from("otp_codes").upsert({ phone, code_hash: hash, expires_at: expiresAt, attempts: 0, created_at: new Date().toISOString() }, { onConflict: "phone" });
    if (bmsKey) {
      try {
        const msg = `Your Ledger code is ${otp} (expires 5 min)`;
        await fetch(bmsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${bmsKey}` },
          body: JSON.stringify({ to: phone, recipient: phone, message: msg, msg, text: msg, sender: bmsSender, from: bmsSender }),
        });
      } catch {}
    }
    const isDev = !bmsKey;
    return new Response(JSON.stringify({ sent: true, dev_otp: isDev ? otp : undefined }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (action === "verify") {
    const code = String(body.code || body.token || body.otp || "");
    if (!code) return new Response(JSON.stringify({ error: "code required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: row } = await supabase.from("otp_codes").select("*").eq("phone", phone).single();
    if (!row) return new Response(JSON.stringify({ error: "no code sent" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (new Date(row.expires_at).getTime() < Date.now()) return new Response(JSON.stringify({ error: "expired" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (row.attempts >= 5) return new Response(JSON.stringify({ error: "too many attempts" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const ok = await bcrypt.compare(code, row.code_hash);
    if (!ok) {
      await supabase.from("otp_codes").update({ attempts: row.attempts + 1 }).eq("phone", phone);
      return new Response(JSON.stringify({ error: "invalid code" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    await supabase.from("otp_codes").delete().eq("phone", phone);
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    let user = existingUser.users.find((u) => u.phone === phone || u.phone === `+${phone}`);
    if (!user) {
      const { data: created, error } = await supabase.auth.admin.createUser({ phone: `+${phone}`, phone_confirm: true, user_metadata: { phone } });
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      user = created.user!;
    }
    const { data: link, error: linkErr } = await supabase.auth.admin.generateLink({ type: "magiclink", phone: `+${phone}` });
    if (linkErr) return new Response(JSON.stringify({ error: linkErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ user, session: link.properties }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "use /send or /verify" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
