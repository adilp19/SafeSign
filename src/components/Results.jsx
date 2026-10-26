import { useMemo, useState } from 'react';
import { feeTotals, rentAmount } from '../lib/decode.js';
import AskPanel from './AskPanel.jsx';

const RISK = {
  red: { label: 'Risky', dot: 'bg-risk-red', text: 'text-risk-red', bg: 'bg-risk-red-bg' },
  yellow: { label: 'Unusual', dot: 'bg-risk-yellow', text: 'text-risk-yellow', bg: 'bg-risk-yellow-bg' },
  green: { label: 'Standard', dot: 'bg-risk-green', text: 'text-risk-green', bg: 'bg-risk-green-bg' },
};

const money = (n) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const TAG = {
  at_signing: 'At signing',
  monthly: 'Monthly',
  move_out: 'Move-out',
  conditional: 'If applicable',
};

export default function Results({ result, docText, mode, onReset }) {
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState('ask');

  const counts = useMemo(() => {
    const c = { red: 0, yellow: 0, green: 0 };
    result.clauses.forEach((x) => c[x.risk]++);
    return c;
  }, [result]);

  const [showStandard, setShowStandard] = useState(false);
  const totals = feeTotals(result.fees);
  // Standard (green) clauses are collapsed behind a button so risky ones stand out.
  const shown =
    filter !== 'all'
      ? result.clauses.filter((c) => c.risk === filter)
      : showStandard
      ? result.clauses
      : result.clauses.filter((c) => c.risk !== 'green');
  const hiddenStandard = filter === 'all' && !showStandard ? counts.green : 0;

  function jumpTo(id) {
    setFilter('all');
    setShowStandard(true);
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
    // Order on phones/narrow screens: overview → ask/questions → clauses.
    // On wide screens the ask/questions panel sits in a sticky right column.
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* Overview: summary, warnings, split, costs, risk */}
      <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-start-1">
        <section className="card p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-accent">
            {result.documentType.replace('_', ' ')}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold leading-tight sm:text-3xl">{result.title}</h1>
          <button onClick={onReset} className="mt-3 rounded-full border border-line px-4 py-1.5 text-sm font-medium hover:bg-tile">
            New document
          </button>
          <p className="mt-4 leading-relaxed text-ink/80">{result.summary}</p>
          {result.keyTerms.length > 0 && (
            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {result.keyTerms.map((k) => {
                const blank = k.value === 'Left blank';
                return (
                  <div
                    key={k.label}
                    className={`rounded-xl px-3 py-3 ${blank ? 'border border-risk-yellow/40 bg-risk-yellow-bg' : 'bg-tile'}`}
                  >
                    <dt className="text-xs text-muted">{k.label}</dt>
                    <dd className={`mt-1 text-sm font-semibold ${blank ? 'text-risk-yellow' : ''}`}>
                      {blank ? '⚠️ Left blank' : k.value}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}
        </section>

        {result.blankCount > 0 && (
          <p role="alert" className="rounded-xl border border-risk-red/30 bg-risk-red-bg px-4 py-3 text-sm font-semibold text-risk-red">
            ⚠️ {result.blankCount} blank {result.blankCount === 1 ? 'amount or date' : 'amounts or dates'} in this document —
            never sign until every blank is filled in.
          </p>
        )}

        <SplitCard result={result} totals={feeTotals(result.fees)} />

        <div className="space-y-6">
          {/* Hidden costs */}
          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold">💸 Hidden costs</h2>
            {result.fees.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No extra fees found.</p>
            ) : (
              <>
                {totals.atSigning + totals.monthly + totals.moveOut === 0 ? (
                  <p className="mt-2 text-sm">
                    <span className="font-semibold text-risk-green">✓ No guaranteed extra fees.</span>{' '}
                    <span className="text-muted">These only apply in certain situations:</span>
                  </p>
                ) : (
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    {[
                      totals.atSigning > 0 && [money(totals.atSigning), 'extra at signing'],
                      totals.monthly > 0 && [`+${money(totals.monthly)}`, 'every month on top of rent'],
                      totals.moveOut > 0 && [money(totals.moveOut), 'kept at move-out no matter what'],
                    ]
                      .filter(Boolean)
                      .map(([n, label]) => (
                        <div key={label} className="border-l-4 border-accent pl-3">
                          <p className="font-display text-2xl font-bold">{n}</p>
                          <p className="text-sm text-muted">{label}</p>
                        </div>
                      ))}
                  </div>
                )}

                {result.fees.some((f) => f.when !== 'conditional') && (
                  <ul className="mt-5 divide-y divide-line overflow-hidden rounded-xl border border-line text-sm">
                    {result.fees.filter((f) => f.when !== 'conditional').map((f, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                        <span className="flex flex-wrap items-center gap-2">
                          {f.name}
                          <span className="rounded-full bg-tile px-2 py-0.5 text-xs text-muted">{TAG[f.when]}</span>
                        </span>
                        <span className="whitespace-nowrap font-semibold">{money(f.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {result.fees.some((f) => f.when === 'conditional') && (
                  <>
                    <p className="mt-5 text-xs font-bold uppercase tracking-widest text-muted">Only if it applies to you</p>
                    <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {result.fees.filter((f) => f.when === 'conditional').map((f, i) => (
                        <li key={i} className="rounded-xl bg-tile px-3 py-3">
                          <p className="text-xs text-muted">{f.name}</p>
                          <p className="mt-1 font-semibold">{money(f.amount)}</p>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </section>

          {/* Risk overview */}
          <section className="card p-5">
            <h2 className="font-display text-lg font-bold">Risk overview</h2>
            <p className="text-xs text-muted">Tap a row to filter the clauses.</p>
            <div className="mt-3 space-y-2">
              {['red', 'yellow', 'green'].map((r) => (
                <button
                  key={r}
                  onClick={() => setFilter(filter === r ? 'all' : r)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 transition hover:bg-tile ${filter === r ? `${RISK[r].bg} border-transparent ring-2 ring-accent` : 'border-line'}`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <span className={`h-2.5 w-2.5 rounded-full ${RISK[r].dot}`} />
                    {RISK[r].label}
                  </span>
                  <span className={`font-display text-xl font-bold ${RISK[r].text}`}>{counts[r]}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

      </div>

      {/* Ask + Questions */}
      <aside className="lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
        <div className="card">
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

      <div className="min-w-0 lg:col-start-1 lg:row-start-2">
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
              <details key={c.id} id={c.id} className="card group" open={c.risk === 'red'}>
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
                  <blockquote className="mx-4 mb-4 rounded-lg border-l-4 border-accent bg-tile px-3 py-2 text-sm italic text-muted">
                    “{c.quote}”
                  </blockquote>
                )}
              </details>
            ))}
          </div>
          {filter === 'all' && hiddenStandard > 0 && (
            <button
              onClick={() => setShowStandard(true)}
              className="mt-3 w-full rounded-xl border border-dashed border-line py-3 text-sm font-semibold text-risk-green hover:bg-card"
            >
              Show {hiddenStandard} standard {hiddenStandard === 1 ? 'clause' : 'clauses'}
            </button>
          )}
        </section>
      </div>
    </div>
  );
}

// Splits rent and guaranteed costs per roommate. The lease states the total;
// how it's divided is up to the roommates, so this assumes an even split.
function SplitCard({ result, totals }) {
  const [people, setPeople] = useState(result.tenantCount || 1);
  const [typedRent, setTypedRent] = useState('');
  if (result.documentType !== 'lease') return null;

  const leaseRent = rentAmount(result.keyTerms);
  // If the lease leaves rent blank, let the person enter the amount they were quoted.
  const rent = leaseRent || Number(typedRent.replace(/[^0-9.]/g, '')) || 0;
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
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">👥 Splitting with roommates?</h2>
        <div className="flex items-center gap-1 rounded-full border border-line p-1" aria-label="Number of people splitting">
          <button
            onClick={() => setPeople((p) => Math.max(1, p - 1))}
            className="h-8 w-8 rounded-full text-lg hover:bg-tile"
            aria-label="Fewer people"
          >−</button>
          <span className="w-20 text-center text-sm font-semibold" aria-live="polite">
            {people} {people === 1 ? 'person' : 'people'}
          </span>
          <button
            onClick={() => setPeople((p) => Math.min(12, p + 1))}
            className="h-8 w-8 rounded-full text-lg hover:bg-tile"
            aria-label="More people"
          >+</button>
        </div>
      </div>

      {!leaseRent && (
        <label className="mt-3 block text-sm">
          <span className="text-muted">Rent is blank in the lease. Enter the total you were quoted:</span>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-semibold">$</span>
            <input
              inputMode="decimal"
              value={typedRent}
              onChange={(e) => setTypedRent(e.target.value)}
              placeholder="8,000"
              className="w-40 rounded-lg border border-line bg-paper px-3 py-2 outline-none focus:border-accent"
            />
            <span className="text-muted">/ month</span>
          </div>
          {rent > 0 && (
            <span className="mt-1 block text-xs text-risk-red">
              Make sure this amount is written into the lease before you sign.
            </span>
          )}
        </label>
      )}

      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Enter the rent above to see each person's share.</p>
      ) : (
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-accent-soft px-3 py-3">
              <dt className="text-xs text-muted">{label}{people > 1 ? ' (your share)' : ''}</dt>
              <dd className="mt-1 font-display text-xl font-bold">{value}</dd>
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
        <button onClick={copy} className="mt-4 w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-white">
          {copied ? 'Copied ✓' : 'Copy questions'}
        </button>
      )}
    </div>
  );
}
