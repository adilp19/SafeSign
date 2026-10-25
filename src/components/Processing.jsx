export default function Processing({ mode, progress }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center" role="status" aria-live="polite">
      <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-line border-t-accent" />
      <p className="mt-6 font-display text-2xl font-bold">{progress || 'Reading your document…'}</p>
      <p className="mt-2 text-muted">
        {mode === 'local'
          ? '🔒 Processing on your device with Llama. Nothing is being uploaded.'
          : '☁️ Sending to open-weight gpt-oss in the cloud for this demo.'}
      </p>
      <p className="mt-6 text-xs text-muted">
        {mode === 'local'
          ? 'Long documents can take up to a minute on a laptop.'
          : 'Long documents can take a few minutes on the free cloud demo.'}
      </p>
    </div>
  );
}
