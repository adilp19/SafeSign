// Vercel serverless function for "Cloud demo" mode.
// Calls an open-weight model on Groq (default: gpt-oss-120b; override with GROQ_MODEL). The API key lives in Vercel env vars, never in the browser.
// Nothing is stored: the request is forwarded and the answer returned.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(500).json({ error: 'Cloud mode is not configured (missing GROQ_API_KEY).' });

  const { messages, json = true } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages is required' });
  }
  const size = JSON.stringify(messages).length;
  if (size > 60000) return res.status(413).json({ error: 'Document is too long for cloud mode.' });

  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
  const isReasoning = model.startsWith('openai/gpt-oss');

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        // gpt-oss "thinks" before answering; keep it short to stay under free-tier token limits.
        ...(isReasoning ? { reasoning_effort: 'low' } : {}),
        ...(json ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    const data = await r.json();
    if (r.status === 429) {
      return res.status(429).json({ error: 'The free cloud demo is busy. Wait about a minute and try again.' });
    }
    if (!r.ok) return res.status(r.status).json({ error: data.error?.message || 'Groq request failed' });
    return res.status(200).json({ content: data.choices?.[0]?.message?.content ?? '' });
  } catch (e) {
    return res.status(502).json({ error: 'Could not reach the cloud model.' });
  }
}
