// One function for both modes:
//   local  → Ollama on the user's own computer (private, nothing leaves the device)
//   cloud  → our Vercel function /api/decode, which calls open-weight gpt-oss on Groq (key stays server-side)

export const OLLAMA_URL = 'http://localhost:11434';
export const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.1:8b';

export async function checkOllama() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return { running: false, hasModel: false };
    const data = await res.json();
    const names = (data.models || []).map((m) => m.name);
    const base = OLLAMA_MODEL.split(':')[0];
    return { running: true, hasModel: names.some((n) => n === OLLAMA_MODEL || n.startsWith(base)) };
  } catch {
    return { running: false, hasModel: false };
  }
}

export async function chat(messages, { mode, json = true }) {
  if (mode === 'local') {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        ...(json ? { format: 'json' } : {}),
        options: { temperature: 0.2, num_ctx: 8192 },
      }),
    });
    if (!res.ok) throw new Error(`Ollama error (${res.status}). Is "${OLLAMA_MODEL}" pulled?`);
    const data = await res.json();
    return data.message?.content ?? '';
  }

  // Free cloud tier allows ~8K tokens per minute. Long documents send several parts,
  // so when the limit is hit we wait and retry instead of failing.
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('/api/decode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, json }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 429 && attempt < 4) {
      await new Promise((r) => setTimeout(r, 20000));
      continue;
    }
    if (!res.ok) throw new Error(data.error || `Cloud request failed (${res.status})`);
    return data.content ?? '';
  }
}

// Ask for JSON, parse it, retry once if the model returns something broken.
export async function chatJSON(messages, opts) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await chat(messages, { ...opts, json: true });
    try {
      return JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch { /* retry */ }
      }
    }
  }
  throw new Error('The model returned an unreadable answer. Try again.');
}
