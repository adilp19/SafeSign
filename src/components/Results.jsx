import { useMemo, useState } from 'react';
import { feeTotals, rentAmount } from '../lib/decode.js';
import AskPanel from './AskPanel.jsx';

const RISK = {
  red: { label: 'Risky', dot: 'bg-risk-red', text: 'text-risk-red', bg: 'bg-risk-red-bg' },
  yellow: { label: 'Unusual', dot: 'bg-risk-yellow', text: 'text-risk-yellow', bg: 'bg-risk-yellow-bg' },
  green: { label: 'Standard', dot: 'bg-risk-green', text: 'text-risk-green', bg: 'bg-risk-green-bg' },
};

const money = (n) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const WHEN = {
  at_signing: 'at signing',
  monthly: '/ month',
  move_out: 'at move-out',
  conditional: 'if applicable',
};

export default function Results({ result, docText, mode, onReset }) {
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState('ask');

  const counts = useMemo(() => {
    const c = { red: 0, yellow: 0, green: 0 };
    result.clauses.forEach((x) => c[x.risk]++);
    return c;
  }, [result]);

  const totals = feeTotals(result.fees);
  const shown = filter === 'all' ? result.clauses : result.clauses.filter((c) => c.risk === filter);

  function jumpTo(id) {
    setFilter('all');
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.open = true;
      el.classList.remove('flash');
      void el.offsetWidth;
      el.classList.add('flash');
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* Left: summary + clauses */}
      <div className="min-w-0 space-y-6">
        <section className="rounded-2xl border border-line bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {result.documentType.replace('_', ' ')}
              </p>
              <h1 className="font-display text-2xl font-bold">{result.title}</h1>
            </div>
            <button onClick={onReset} className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-paper">
              New document
            </button>
          </div>
          <p className="mt-3 text-lg leading-relaxed">{result.summary}</p>
          {result.keyTerms.length > 0 && (
            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {result.keyTerms.map((k) => (
                <div key={k.label} className="rounded-xl bg-paper px-3 py-2">
                  <dt className="text-xs text-muted">{k.label}</dt>
                  <dd className={`font-semibold ${k.value === 'Left blank' ? 'text-risk-red' : ''}`}>
                    {k.value === 'Left blank' ? '⚠️ Left blank' : k.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        {result.blankCount > 0 && (
          <section role="alert" className="rounded-2xl border border-risk-red/30 bg-risk-red-bg p-5">
            <h2 className="font-semibold text-risk-red">
              ⚠️ {result.blankCount} blank {result.blankCount === 1 ? 'amount or date' : 'amounts or dates'} in this document
            </h2>
            <p className="mt-1 text-sm">
              Never sign until every blank is filled in. Anything left blank can be filled in later
              by someone else, and SafeSign can only analyze what's actually written.
            </p>
          </section>
        )}

        <SplitCard result={result} totals={feeTotals(result.fees)} />

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Hidden costs */}
          <section className="rounded-2xl border border-line bg-card p-5">
            <h2 className="font-semibold">Hidden costs</h2>
            {result.fees.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No extra fees found.</p>
            ) : (
              <>
                <div className="mt-2 space-y-1">
                  {totals.atSigning > 0 && (
                    <p><span className="font-display text-3xl font-bold">{money(totals.atSigning)}</span> <span className="text-sm text-muted">extra at signing</span></p>
                  )}
                  {totals.monthly > 0 && (
                    <p><span className="font-display text-3xl font-bold">+{money(totals.monthly)}</span> <span className="text-sm text-muted">every month on top of rent</span></p>
                  )}
                  {totals.moveOut > 0 && (
                    <p><span className="font-display text-xl font-bold">{money(totals.moveOut)}</span> <span className="text-sm text-muted">kept at move-out no matter what</span></p>
                  )}
                </div>
                <ul className="mt-3 space-y-1 text-sm">
                  {result.fees.filter((f) => f.when !== 'conditional').map((f, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span className="text-muted">{f.name}</span>
                      <span className="whitespace-nowrap font-medium">{money(f.amount)} {WHEN[f.when]}</span>
                    </li>
                  ))}
                </ul>
                {result.fees.some((f) => f.when === 'conditional') && (
                  <>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Only if it applies to you</p>
                    <ul className="mt-1 space-y-1 text-sm">
                      {result.fees.filter((f) => f.when === 'conditional').map((f, i) => (
                        <li key={i} className="flex justify-between gap-3">
                          <span className="text-muted">{f.name}</span>
                          <span className="whitespace-nowrap font-medium">{money(f.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </section>

          {/* Risk overview */}
          <section className="rounded-2xl border border-line bg-card p-5">
            <h2 className="font-semibold">Risk overview</h2>
            <div className="mt-3 space-y-2">
              {['red', 'yellow', 'green'].map((r) => (
                <button
                  key={r}
                  onClick={() => setFilter(filter === r ? 'all' : r)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 ${RISK[r].bg} ${filter === r ? 'ring-2 ring-ink' : ''}`}
                >
                  <span className={`flex items-center gap-2 font-medium ${RISK[r].text}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${RISK[r].dot}`} />
                    {RISK[r].label}
                  </span>
                  <span className="font-display text-xl font-bold">{counts[r]}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Clause list */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Clause by clause</h2>
            {filter !== 'all' && (
              <button onClick={() => setFilter('all')} className="text-sm underline">Show all</button>
            )}
          </div>
          <div className="space-y-3">
            {shown.map((c) => (
              <details key={c.id} id={c.id} className="group rounded-xl border border-line bg-card" open={c.risk === 'red'}>
                <summary className="flex cursor-pointer list-none items-start gap-3 p-4">
                  <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${RISK[c.risk].bg} ${RISK[c.risk].text}`}>
                    {RISK[c.risk].label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{c.title}</p>
                    <p className="text-sm text-muted">{c.explanation}</p>
                    {c.ruleFlag && (
                      <p className="mt-1 text-xs font-medium text-risk-red">⚑ Rule check: {c.ruleFlag}</p>
                    )}
                  </div>
                  <span className="text-muted transition group-open:rotate-180">▾</span>
                </summary>
                {c.quote && (
                  <blockquote className="mx-4 mb-4 border-l-4 border-line pl-3 text-sm italic text-muted">
                    “{c.quote}”
                  </blockquote>
                )}
              </details>
            ))}
          </div>
        </section>
      </div>

      {/* Right: Ask + Questions */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-line bg-card">
          <div className="grid grid-cols-2 border-b border-line" role="tablist">
            {[
              { id: 'ask', label: 'Ask the document' },
              { id: 'questions', label: 'Before you sign' },
            ].map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-sm font-semibold ${tab === t.id ? 'border-b-2 border-accent text-accent' : 'text-muted'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'ask' ? (
            <AskPanel docText={docText} clauses={result.clauses} mode={mode} onCite={jumpTo} />
          ) : (
            <QuestionsPanel questions={result.questions} />
          )}
        </div>
      </aside>
    </div>
  );
}

// Splits rent and guaranteed costs per roommate. The lease states the total;
// how it's divided is up to the roommates, so this assumes an even split.
function SplitCard({ result, totals }) {
  const [people, setPeople] = useState(result.tenantCount || 1);
  if (result.documentType !== 'lease') return null;

  const rent = rentAmount(result.keyTerms);
  const depositTerm = result.keyTerms.find((k) => /deposit/i.test(k.label));
  const deposit = depositTerm ? Number(String(depositTerm.value).replace(/[^0-9.]/g, '')) || 0 : 0;
  const per = (n) => money(Math.round((n / people) * 100) / 100);

  const rows = [
    rent > 0 && ['Rent', `${per(rent)} / month`],
    totals.monthly > 0 && ['Monthly extras', `${per(totals.monthly)} / month`],
    rent > 0 && ['Total each month', `${per(rent + totals.monthly)} / month`],
    totals.atSigning > 0 && ['Extra fees at signing', per(totals.atSigning)],
    deposit > 0 && ['Security deposit', per(deposit)],
  ].filter(Boolean);

  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Splitting with roommates?</h2>
        <div className="flex items-center gap-2" aria-label="Number of people splitting">
          <button
            onClick={() => setPeople((p) => Math.max(1, p - 1))}
            className="h-9 w-9 rounded-lg border border-line text-lg hover:bg-paper"
            aria-label="Fewer people"
          >−</button>
          <span className="w-24 text-center font-semibold" aria-live="polite">
            {people} {people === 1 ? 'person' : 'people'}
          </span>
          <button
            onClick={() => setPeople((p) => Math.min(12, p + 1))}
            className="h-9 w-9 rounded-lg border border-line text-lg hover:bg-paper"
            aria-label="More people"
          >+</button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">The rent amount is left blank, so there's nothing to split yet.</p>
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-paper px-3 py-2">
              <dt className="text-xs text-muted">{label}{people > 1 ? ' (your share)' : ''}</dt>
              <dd className="font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {people > 1 && (
        <p className="mt-3 text-xs text-muted">
          Assumes an even split. The lease lists the total; check whether it makes each of you
          responsible for the full amount (look for "jointly and severally").
        </p>
      )}
    </section>
  );
}

function QuestionsPanel({ questions }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(questions.map((q, i) => `${i + 1}. ${q}`).join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked */ }
  }
  return (
    <div className="p-5">
      <p className="text-sm text-muted">Questions to ask before you sign:</p>
      <ol className="mt-3 list-decimal space-y-2 pl-5">
        {questions.map((q, i) => <li key={i}>{q}</li>)}
      </ol>
      {questions.length > 0 && (
        <button onClick={copy} className="mt-4 w-full rounded-lg bg-ink py-2 text-sm font-semibold text-paper">
          {copied ? 'Copied ✓' : 'Copy questions'}
        </button>
      )}
    </div>
  );
}
