import type { Guardrail, Proposal, Evidence } from "@/lib/api";
import ConfidenceBadge from "./ConfidenceBadge";

export default function ExplainDrawer({
  proposal,
  guardrail,
  evidence,
  finalAction,
}: {
  proposal: Proposal;
  guardrail: Guardrail;
  evidence: Evidence[];
  finalAction: string;
}) {
  return (
    <section aria-label="AI explainability" className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50">AI ne ye kyun kaha? 🤖</h2>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <ConfidenceBadge value={proposal.confidence} />
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {proposal.proposed_category}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300">{proposal.rationale}</p>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 font-bold text-zinc-500">Merchant</dt>
          <dd className="text-zinc-800 dark:text-zinc-200">{proposal.proposed_merchant}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 font-bold text-zinc-500">Action</dt>
          <dd className="text-zinc-800 dark:text-zinc-200">{proposal.recommended_action} → <strong>{finalAction}</strong></dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 font-bold text-zinc-500">Guardrail</dt>
          <dd>
            {guardrail.safe_to_post ? (
              <span className="font-bold text-emerald-700 dark:text-emerald-400">✓ Safe to post</span>
            ) : (
              <span className="font-bold text-red-700 dark:text-red-400">✋ Human review zaroori</span>
            )}
            {guardrail.violations.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-xs text-zinc-600 dark:text-zinc-400">
                {guardrail.violations.map((v) => (
                  <li key={v}><code>{v}</code></li>
                ))}
              </ul>
            )}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 font-bold text-zinc-500">Evidence</dt>
          <dd className="text-zinc-800 dark:text-zinc-200">
            {evidence.length === 0 ? (
              <span className="text-sm">Koi receipt nahi mili — isliye confidence low hai.</span>
            ) : (
              <ul className="space-y-1">
                {evidence.map((e) => (
                  <li key={e.id} className="rounded-lg bg-zinc-50 p-2 text-xs dark:bg-zinc-800">
                    <strong>{e.id}</strong> · {e.redacted_summary} · match {Math.round(e.match_score * 100)}%
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}
