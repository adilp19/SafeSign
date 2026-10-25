import { useEffect, useState } from 'react';
import UploadScreen from './components/UploadScreen.jsx';
import Processing from './components/Processing.jsx';
import Results from './components/Results.jsx';
import { checkOllama } from './lib/llm.js';
import { decodeDocument } from './lib/decode.js';

export default function App() {
  const [screen, setScreen] = useState('upload'); // upload | processing | results
  const [mode, setMode] = useState('local');      // local (private) | cloud (demo)
  const [ollama, setOllama] = useState({ checked: false, running: false, hasModel: false });
  const [docText, setDocText] = useState('');
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  async function refreshOllama() {
    const s = await checkOllama();
    setOllama({ checked: true, ...s });
  }

  useEffect(() => {
    refreshOllama();
  }, []);

  async function handleDecode(text) {
    setError('');
    setDocText(text);
    setScreen('processing');
    try {
      const r = await decodeDocument(text, mode, setProgress);
      if (!r.clauses.length) throw new Error("Couldn't find any clauses. Is this a contract or lease?");
      setResult(r);
      setScreen('results');
    } catch (e) {
      setError(e.message || 'Something went wrong. Try again.');
      setScreen('upload');
    }
  }

  function reset() {
    setResult(null);
    setDocText('');
    setScreen('upload');
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <button onClick={reset} className="flex items-center gap-2 text-left">
            <img src="/favicon.svg" alt="" className="h-7 w-7" />
            <span className="font-display text-xl font-bold">SafeSign</span>
          </button>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              mode === 'local' ? 'bg-risk-green-bg text-risk-green' : 'bg-risk-yellow-bg text-risk-yellow'
            }`}
          >
            {mode === 'local' ? '🔒 Private · runs on your device' : '☁️ Cloud demo'}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {screen === 'upload' && (
          <UploadScreen
            mode={mode}
            setMode={setMode}
            ollama={ollama}
            onRecheck={refreshOllama}
            onDecode={handleDecode}
            error={error}
            setError={setError}
          />
        )}
        {screen === 'processing' && <Processing mode={mode} progress={progress} />}
        {screen === 'results' && result && (
          <Results result={result} docText={docText} mode={mode} onReset={reset} />
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-center text-xs text-muted">
        Not legal advice. SafeSign helps you know what to ask. Powered by open-weight Llama · MIT licensed.
      </footer>
    </div>
  );
}
