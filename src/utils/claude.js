const GROQ_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';
const ANTHROPIC_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';
const GROQ_MODEL = process.env.EXPO_PUBLIC_GROQ_MODEL || 'llama-3.3-70b-versatile';

async function callGroq({ system, user, maxTokens = 300, json = false }) {
  if (!GROQ_KEY) throw new Error('no groq key');
  const body = {
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_tokens: maxTokens,
    temperature: 0.2,
  };
  if (json) body.response_format = { type: 'json_object' };
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`groq ${res.status} ${t.slice(0, 200)}`);
  }
  const j = await res.json();
  return j.choices?.[0]?.message?.content || '';
}

async function callClaude(system, user, maxTokens = 300) {
  if (!ANTHROPIC_KEY) throw new Error('no anthropic key');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: 'claude-3-haiku-20240307', max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
  });
  if (!res.ok) throw new Error('claude ' + res.status);
  const j = await res.json();
  return j.content?.[0]?.text || '';
}

async function callAI(system, user, maxTokens, json = false) {
  if (GROQ_KEY) return callGroq({ system, user, maxTokens, json });
  if (ANTHROPIC_KEY) return callClaude(system, user, maxTokens);
  throw new Error('no key');
}

export async function parseTransactionText(text) {
  const fallback = mockParse(text);
  const hasKey = !!(GROQ_KEY || ANTHROPIC_KEY);
  if (!hasKey) return fallback;
  try {
    const out = await callAI(
      'You parse free-text bookkeeping entries into JSON. Return ONLY valid JSON with keys amount (number), description (string), category, type, payment_method.',
      `Parse "${text}" into JSON with keys: amount (number), description (string), category (one of Groceries, Drinks, Snacks, Household, Restock, Transport, Utilities, Packaging, Staff, Other), type ("sale" or "expense"), payment_method ("Cash","MoMo","Credit" or null). Example: "47.50 for milo and bread" -> {"amount":47.5,"description":"Milo and bread","category":"Groceries","type":"sale","payment_method":"Cash"}. If expense words like transport/fare/fuel/restock appear, type is expense. Return ONLY JSON.`,
      250,
      true
    );
    const m = out.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : fallback;
  } catch {
    return fallback;
  }
}

export async function generateInsight(transactions, opts = {}) {
  const hasKey = !!(GROQ_KEY || ANTHROPIC_KEY);
  const target = opts.target;
  const todayIncome = opts.todayIncome;
  const buildPeakFallback = () => {
    try {
      const { getPeakDayOfWeek, getTopCategory } = require('./analytics');
      const peak = getPeakDayOfWeek(transactions);
      const top = getTopCategory(transactions);
      if (!peak) {
        if (transactions.filter(t=>t.type==='sale').length === 0) return "No sales yet — record a few sales to see your peak day and get personalized tips.";
        return `You have ${transactions.filter(t=>t.type==='sale').length} sales. Keep recording to find your peak day — add 3 more sales for a clearer pattern.`;
      }
      const topStr = top ? ` Top category: ${top.category} (GHS ${top.total.toFixed(0)}).` : '';
      const secondStr = peak.secondDay ? ` Next: ${peak.secondDay}s.` : '';
      return `Your sales peak on ${peak.peakDay}s (GHS ${peak.peakTotal.toFixed(0)} over ${peak.days}d).${topStr}${secondStr} Try stocking extra before ${peak.peakDay} to capture more demand.`;
    } catch { return "Your sales peak will appear after a few more sales — keep recording."; }
  };
  const fallbackBase = buildPeakFallback();
  if (!hasKey) {
    if (target !== undefined && todayIncome !== undefined) {
      const pct = target > 0 ? Math.round((todayIncome / target) * 100) : 0;
      const remaining = Math.max(0, target - todayIncome);
      const targetLine = todayIncome >= target ? `🎉 You hit your GHS ${target.toFixed(0)} target today (${pct}%)!` : `You are at GHS ${todayIncome.toFixed(0)} / ${target.toFixed(0)} (${pct}%, GHS ${remaining.toFixed(0)} to go).`;
      return `${fallbackBase} ${targetLine}`;
    }
    return fallbackBase;
  }
  try {
    const { getPeakDayOfWeek, getTopCategory } = require('./analytics');
    const peak = getPeakDayOfWeek(transactions);
    const top = getTopCategory(transactions);
    const summary = transactions.slice(0, 30).map((t) => `${t.created_at.slice(0, 10)} ${t.type} ${t.amount} ${t.description} ${t.category}`).join('\n');
    let extra = '';
    if (peak) extra += `\nAuto analysis: Peak day is ${peak.peakDay}s (GHS ${peak.peakTotal.toFixed(0)} over ${peak.days}d, ${peak.poolSize} sales)${peak.secondDay ? `, second is ${peak.secondDay}s` : ''}. Top category: ${top ? `${top.category} GHS ${top.total.toFixed(0)}` : 'none'}. Use this — do not hardcode Saturday.`;
    if (target !== undefined && todayIncome !== undefined) {
      const pct = target > 0 ? Math.round((todayIncome / target) * 100) : 0;
      const remaining = Math.max(0, target - todayIncome);
      extra += `\nShop daily target: GHS ${target.toFixed(2)}, today's income (sales): GHS ${todayIncome.toFixed(2)} (${pct}%, ${remaining.toFixed(2)} to go). If behind target, give ONE specific tactic to close the gap today (restock top seller, push MoMo discount, extend hours). If target is hit, celebrate and suggest a stretch goal.`;
    }
    const out = await callAI(
      'You are a helpful bookkeeping assistant for Ghanaian informal retailers. Be concise, friendly, 2-3 sentences, max 60 words. Use the provided auto analysis — do not default to Saturday.',
      `Given these transactions:\n${summary}${extra}\n\nWrite a short daily/weekly insight: mention the true peak day from auto analysis, total trend, top category, one actionable tip.` + (extra ? ' Incorporate the target status.' : ''),
      220,
      false
    );
    return out.trim() || `${fallbackBase} ${target !== undefined ? (todayIncome >= target ? 'Target hit — great job!' : 'Keep pushing to hit target.') : ''}`;
  } catch {
    return fallbackBase;
  }
}

function mockParse(text) {
  const lower = text.toLowerCase();
  const amountMatch = lower.match(/(\d+(?:\.\d+)?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
  const isExpense = /(transport|fare|fuel|restock|buy|bought|expense|pay|paid|rent|light|water|electric)/.test(lower);
  const type = isExpense ? 'expense' : 'sale';
  let payment_method = 'Cash';
  if (/momo|mobile money/.test(lower)) payment_method = 'MoMo';
  else if (/credit|owe|on credit/.test(lower)) payment_method = 'Credit';
  let category = type === 'expense' ? 'Other' : 'Groceries';
  if (/milo|bread|rice|oil|milk|sardine|grocery|provisions/.test(lower)) category = 'Groceries';
  else if (/water|drink|coke|fanta|beer/.test(lower)) category = 'Drinks';
  else if (/transport|tro|fare/.test(lower)) category = 'Transport';
  else if (/restock|stock/.test(lower)) category = 'Restock';
  const description = text.replace(/^\d+(\.\d+)?\s*(for|on)?\s*/i, '').trim() || text;
  return { amount, description: description.charAt(0).toUpperCase() + description.slice(1), category, type, payment_method: type === 'expense' ? null : payment_method };
}
