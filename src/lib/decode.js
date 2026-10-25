import { chatJSON } from './llm.js';
import { DECODE_SYSTEM, decodeUser, ASK_SYSTEM, askUser } from './prompts.js';

const CHUNK_CHARS = 10000;
const RISK_ORDER = { red: 0, yellow: 1, green: 2 };

function splitIntoChunks(text) {
  if (text.length <= CHUNK_CHARS) return [text];
  // Split on blank lines, then hard-split any paragraph that is still too long.
  const paras = text.split(/\n\s*\n/).flatMap((p) => {
    const out = [];
    for (let i = 0; i < p.length; i += CHUNK_CHARS) out.push(p.slice(i, i + CHUNK_CHARS));
    return out;
  });
  const chunks = [];
  let cur = '';
  for (const p of paras) {
    if ((cur + p).length > CHUNK_CHARS && cur) {
      chunks.push(cur);
      cur = '';
    }
    cur += p + '\n\n';
  }
  if (cur.trim()) chunks.push(cur);
  return chunks;
}

const str = (v, d = '') => (typeof v === 'string' ? v.trim() : d);
const arr = (v) => (Array.isArray(v) ? v : []);

function normalize(raw) {
  const risk = (r) => {
    const v = str(r).toLowerCase();
    return v in RISK_ORDER ? v : 'yellow';
  };
  // Map the model's "when" (or older "frequency" wording) to our 4 buckets.
  // Anything unclear is treated as conditional so it never inflates the totals.
  const when = (f) => {
    const v = str(f?.when || f?.frequency).toLowerCase();
    if (['at_signing', 'monthly', 'move_out', 'conditional'].includes(v)) return v;
    if (v === 'one_time') return 'at_signing';
    return 'conditional';
  };

  return {
    documentType: str(raw.documentType, 'other'),
    title: str(raw.title, 'Your document'),
    summary: str(raw.summary),
    keyTerms: arr(raw.keyTerms)
      .filter((k) => k && k.label && k.value)
      .map((k) => ({ label: str(k.label), value: String(k.value) })),
    clauses: arr(raw.clauses)
      .filter((c) => c && (c.title || c.explanation))
      .map((c) => ({
        title: str(c.title, 'Clause'),
        quote: str(c.quote),
        risk: risk(c.risk),
        explanation: str(c.explanation),
      })),
    fees: arr(raw.fees)
      .map((f) => ({
        name: str(f?.name, 'Fee'),
        amount: Number(String(f?.amount ?? '').replace(/[^0-9.]/g, '')) || 0,
        when: when(f),
        note: str(f?.note),
      }))
      .filter((f) => f.amount > 0),
    questions: arr(raw.questions).map((q) => str(q)).filter(Boolean),
  };
}

// ---- Rule-based safety net --------------------------------------------------
// Small local models are inconsistent on edge cases. These deterministic checks
// run after the model and only ever make results MORE cautious, never less.

const RED_RULES = [
  { re: /automatic(ally)?\s+renew/i, why: 'auto-renewal' },
  { re: /regardless of (the )?condition/i, why: 'deposit kept no matter what' },
  { re: /repairs? under \$|responsible for (all )?(the )?repairs|pay for (all )?repairs/i, why: 'tenant pays repairs' },
  { re: /(with or )?without notice/i, why: 'no notice required' },
  { re: /\bwaive/i, why: 'waives your rights' },
  { re: /arbitration|class action/i, why: 'forced arbitration' },
  { re: /non-?refundable/i, why: 'non-refundable money' },
  { re: /termination fee|months?'? rent/i, why: 'early-termination penalty' },
];

const CONDITIONAL_FEE = /pet|late|terminat|break|additional|extra|parking|guest|lock|key|replace|returned|bounced|nsf/i;

const toNumber = (s) => Number(String(s).replace(/[^0-9.]/g, '')) || 0;

function applySafetyNet(result) {
  const rentTerm = result.keyTerms.find((k) => /rent/i.test(k.label) && !/pet/i.test(k.label));
  const rent = rentTerm ? toNumber(rentTerm.value) : 0;

  // 1. Bump clauses to red when they match a known red-flag pattern.
  result.clauses = result.clauses.map((c) => {
    if (c.risk === 'red') return c;
    const text = `${c.title} ${c.quote} ${c.explanation}`;
    const hit = RED_RULES.find((r) => r.re.test(text));
    return hit ? { ...c, risk: 'red', ruleFlag: hit.why } : c;
  });

  // 2. Fix fee buckets and amounts.
  result.fees = result.fees.map((f) => {
    let { amount, when } = f;
    const label = `${f.name} ${f.note}`;
    // "3 months' rent" came back as 3 → convert to dollars.
    if (/terminat|break/i.test(label) && amount > 0 && amount < 13 && rent) amount = amount * rent;
    // Optional or event-based fees never count toward the guaranteed totals.
    if (CONDITIONAL_FEE.test(f.name)) when = 'conditional';
    return { ...f, amount, when };
  });

  // 3. Leases: catch required monthly charges the model mentioned in a clause but left out of fees.
  if (result.documentType === 'lease') {
    const known = new Set(result.fees.map((f) => f.amount));
    for (const c of result.clauses) {
      const text = `${c.quote} ${c.explanation}`;
      if (!/month/i.test(text)) continue;
      for (const m of text.matchAll(/\$\s?([\d,]+(?:\.\d{1,2})?)/g)) {
        const amount = toNumber(m[1]);
        if (!amount || amount === rent || known.has(amount)) continue;
        known.add(amount);
        result.fees.push({
          name: `${c.title} – extra charge`,
          amount,
          when: CONDITIONAL_FEE.test(c.title) ? 'conditional' : 'monthly',
          note: 'found in clause',
        });
      }
    }
  }
  return result;
}

function merge(parts) {
  const first = parts[0];
  const seenQ = new Set();
  const seenFee = new Set();
  const result = {
    ...first,
    keyTerms: first.keyTerms,
    clauses: parts.flatMap((p) => p.clauses),
    fees: parts.flatMap((p) => p.fees).filter((f) => {
      const key = `${f.name.toLowerCase()}-${f.amount}`;
      if (seenFee.has(key)) return false;
      seenFee.add(key);
      return true;
    }),
    questions: parts.flatMap((p) => p.questions).filter((q) => {
      const key = q.toLowerCase();
      if (seenQ.has(key)) return false;
      seenQ.add(key);
      return true;
    }).slice(0, 8),
  };
  applySafetyNet(result);
  result.clauses = result.clauses
    .sort((a, b) => RISK_ORDER[a.risk] - RISK_ORDER[b.risk])
    .map((c, i) => ({ ...c, id: `c${i + 1}` }));
  return result;
}

export async function decodeDocument(text, mode, onProgress = () => {}) {
  const chunks = splitIntoChunks(text);
  const parts = [];
  for (let i = 0; i < chunks.length; i++) {
    onProgress(
      chunks.length > 1 ? `Reading part ${i + 1} of ${chunks.length}…` : 'Reading every clause…'
    );
    const raw = await chatJSON(
      [
        { role: 'system', content: DECODE_SYSTEM },
        { role: 'user', content: decodeUser(chunks[i], i + 1, chunks.length) },
      ],
      { mode }
    );
    parts.push(normalize(raw));
  }
  onProgress('Adding up the fees…');
  return merge(parts);
}

export async function askDocument(text, clauses, question, mode) {
  const raw = await chatJSON(
    [
      { role: 'system', content: ASK_SYSTEM },
      { role: 'user', content: askUser(text, clauses, question) },
    ],
    { mode }
  );
  const clauseId = clauses.some((c) => c.id === raw.clauseId) ? raw.clauseId : null;
  return { answer: str(raw.answer, "I couldn't find that in the document."), clauseId };
}

export function feeTotals(fees) {
  const sum = (w) => fees.filter((x) => x.when === w).reduce((s, x) => s + x.amount, 0);
  return { atSigning: sum('at_signing'), monthly: sum('monthly'), moveOut: sum('move_out') };
}
