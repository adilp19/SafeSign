import { useRef, useState } from 'react';
import { extractText } from '../lib/pdf.js';
import OllamaSetup from './OllamaSetup.jsx';

export default function UploadScreen({ mode, setMode, ollama, onRecheck, onDecode, error, setError }) {
  const [dragging, setDragging] = useState(false);
  const [pasted, setPasted] = useState('');
  const [reading, setReading] = useState(false);
  const inputRef = useRef(null);

  const localReady = ollama.running && ollama.hasModel;
  const blocked = mode === 'local' && !localReady;

  async function handleFile(file) {
    if (!file) return;
    setError('');
    setReading(true);
    try {
      const text = await extractText(file);
      onDecode(text);
    } catch (e) {
      setError(e.message);
    } finally {
      setReading(false);
    }
  }

  function handlePaste() {
    const t = pasted.trim();
    if (t.length < 80) return setError('Paste a bit more of the document so there is something to decode.');
    onDecode(t);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <section className="mb-8 text-center">
        <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
          Know what you're signing.
          <br />
          <span className="text-accent">Privately.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
          Drop in a lease, job offer, or terms of service. Open-source Llama flags the risky clauses,
          adds up hidden fees, and tells you what to ask, without your document leaving your laptop.
        </p>
      </section>

      {/* Mode toggle */}
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-line bg-card p-1">
        {[
          { id: 'local', label: '🔒 Private mode', sub: 'Llama on your device' },
          { id: 'cloud', label: '☁️ Cloud demo', sub: 'Document is sent to the cloud' },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`rounded-lg px-4 py-3 text-left transition ${
              mode === m.id ? 'bg-ink text-paper' : 'hover:bg-paper'
            }`}
            aria-pressed={mode === m.id}
          >
            <div className="font-semibold">{m.label}</div>
            <div className={`text-xs ${mode === m.id ? 'text-paper/70' : 'text-muted'}`}>{m.sub}</div>
          </button>
        ))}
      </div>

      {mode === 'local' && ollama.checked && !localReady && (
        <OllamaSetup ollama={ollama} onRecheck={onRecheck} onUseCloud={() => setMode('cloud')} />
      )}

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-risk-red/30 bg-risk-red-bg px-4 py-3 text-risk-red">
          {error}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!blocked) handleFile(e.dataTransfer.files[0]);
        }}
        className={`rounded-2xl border-2 border-dashed p-10 text-center transition ${
          dragging ? 'border-accent bg-risk-green-bg' : 'border-line bg-card'
        } ${blocked ? 'opacity-50' : ''}`}
      >
        <div className="text-4xl">📄</div>
        <p className="mt-3 text-lg font-semibold">
          {reading ? 'Reading your file…' : 'Drag a PDF here'}
        </p>
        <p className="text-sm text-muted">Text is extracted in your browser. The file is never uploaded.</p>
        <button
          disabled={blocked || reading}
          onClick={() => inputRef.current?.click()}
          className="mt-5 rounded-lg bg-accent px-5 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Choose a file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      {/* Paste option */}
      <details className="mt-4 rounded-2xl border border-line bg-card p-4">
        <summary className="cursor-pointer font-semibold">Or paste the text</summary>
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          rows={8}
          placeholder="Paste your lease, offer letter, or terms of service…"
          className="mt-3 w-full rounded-lg border border-line bg-paper p-3 text-sm outline-none focus:border-accent"
        />
        <button
          disabled={blocked}
          onClick={handlePaste}
          className="mt-2 rounded-lg bg-ink px-4 py-2 font-semibold text-paper disabled:opacity-50"
        >
          Decode text
        </button>
      </details>
    </div>
  );
}
