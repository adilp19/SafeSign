import { useState } from 'react';
import { askDocument } from '../lib/decode.js';

const SUGGESTIONS = ['Can I have a pet?', 'What if I move out early?', 'When do I get my deposit back?'];

export default function AskPanel({ docText, clauses, mode, onCite }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  async function ask(q) {
    const question = (q ?? input).trim();
    if (!question || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setBusy(true);
    try {
      const { answer, clauseId } = await askDocument(docText, clauses, question, mode);
      setMessages((m) => [...m, { role: 'ai', text: answer, clauseId }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'ai', text: `Sorry, that failed: ${e.message}` }]);
    } finally {
      setBusy(false);
    }
  }

  const clauseTitle = (id) => clauses.find((c) => c.id === id)?.title;

  return (
    <div className="flex h-[460px] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted">Ask anything about this document. Answers cite the clause.</p>
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => ask(s)} className="block w-full rounded-lg border border-line px-3 py-2 text-left text-sm hover:bg-paper">
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <div className={`inline-block max-w-[90%] rounded-2xl px-3 py-2 text-left text-sm ${m.role === 'user' ? 'bg-ink text-paper' : 'bg-paper'}`}>
              {m.text}
              {m.clauseId && clauseTitle(m.clauseId) && (
                <button onClick={() => onCite(m.clauseId)} className="mt-1 block text-xs font-semibold text-accent underline">
                  See clause: {clauseTitle(m.clauseId)} →
                </button>
              )}
            </div>
          </div>
        ))}
        {busy && <p className="text-sm text-muted">Reading the document…</p>}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); ask(); }}
        className="flex gap-2 border-t border-line p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Can I sublet?"
          aria-label="Ask a question about the document"
          className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button disabled={busy} className="rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50">
          Ask
        </button>
      </form>
    </div>
  );
}
