import { OLLAMA_MODEL } from '../lib/llm.js';

export default function OllamaSetup({ ollama, onRecheck, onUseCloud }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const isLocalhost = /localhost|127\.0\.0\.1/.test(origin);

  return (
    <div className="mb-4 rounded-2xl border border-risk-yellow/40 bg-risk-yellow-bg p-5">
      <h2 className="font-semibold text-ink">
        {ollama.running ? `Llama model not found` : 'Private mode needs Ollama running on this computer'}
      </h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
        {!ollama.running && (
          <li>
            Install Ollama from <a className="underline" href="https://ollama.com" target="_blank" rel="noreferrer">ollama.com</a>
          </li>
        )}
        <li>
          Download the model:
          <code className="ml-1 rounded bg-card px-1.5 py-0.5">ollama pull {OLLAMA_MODEL}</code>
        </li>
        {!ollama.running && (
          <li>
            Start it{isLocalhost ? '' : ' and allow this site'}:
            <code className="mt-1 block overflow-x-auto rounded bg-card px-2 py-1">
              {isLocalhost ? 'ollama serve' : `OLLAMA_ORIGINS="${origin}" ollama serve`}
            </code>
          </li>
        )}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={onRecheck} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper">
          Check again
        </button>
        <button onClick={onUseCloud} className="rounded-lg border border-ink px-4 py-2 text-sm font-semibold">
          Use cloud demo instead
        </button>
      </div>
    </div>
  );
}
