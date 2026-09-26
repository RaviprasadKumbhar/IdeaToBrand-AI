import { useState } from 'react';
import { useFOILStore } from '../../store/foilStore';
import { runScenarioProbe } from '../../lib/api-client';
import type { ScenarioProbeResult, ScenarioBranchField } from '../../lib/api-client';
import type { StageName, CriticFinding } from '../../../../shared/types';
import { LoadingState } from '../../components/LoadingState';
import { CriticFindingCard } from '../../components/CriticFindingCard';
import { v4 as uuid } from 'uuid';

const STAGE_LABELS: Partial<Record<StageName, string>> = {
  discovery: 'Discovery',
  positioning: 'Positioning',
  naming_personality: 'Naming + Personality',
  tagline_pitch: 'Tagline + Pitch',
  visual_brief: 'Visual Brief',
  voice_messaging: 'Voice + Messaging',
  launch_prep: 'Launch Prep',
};

function BranchFieldRow({ field }: { field: ScenarioBranchField }) {
  return (
    <div
      className="border border-border rounded-md overflow-hidden"
      aria-label={`Changed field: ${field.field_name} in ${STAGE_LABELS[field.stage] ?? field.stage}`}
    >
      <div className="px-4 py-2 bg-surface-100 border-b border-border flex items-center gap-2">
        <span className="section-label">{STAGE_LABELS[field.stage] ?? field.stage}</span>
        <span className="text-xs font-mono text-ink-500">→</span>
        <span className="text-xs font-semibold text-ink-700">{field.field_name.replace(/_/g, ' ')}</span>
      </div>
      <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
        <div className="p-4" aria-label="Original value">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400 mb-1.5">Original</p>
          <p className="text-sm text-ink-700 leading-relaxed">{field.original_value}</p>
        </div>
        <div className="p-4 bg-accent-100/40" aria-label="Branch value">
          <p className="text-[10px] font-bold uppercase tracking-wider text-accent-600 mb-1.5">Branch (What-if)</p>
          <p className="text-sm text-ink-950 font-medium leading-relaxed">{field.branch_value}</p>
        </div>
      </div>
    </div>
  );
}

type ProbePhase = 'input' | 'loading' | 'results' | 'error';

export function ScenarioProbePage() {
  const store = useFOILStore();

  const [phase, setPhase] = useState<ProbePhase>('input');
  const [whatIfInput, setWhatIfInput] = useState('');
  const [triggeredFrom, setTriggeredFrom] = useState<StageName>('positioning');
  const [result, setResult] = useState<ScenarioProbeResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [branchFindings, setBranchFindings] = useState<CriticFinding[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [kept, setKept] = useState(false);

  const approvedStages = Object.keys(store.ctx.approved_decisions) as StageName[];
  const inputTooShort = whatIfInput.trim().length < 10;

  async function handleRunProbe() {
    if (inputTooShort) return;
    setPhase('loading');
    setErrorMsg(null);
    setResult(null);
    setAccepted(false);
    setKept(false);
    try {
      const probeResult = await runScenarioProbe(
        triggeredFrom,
        whatIfInput.trim(),
        store.ctx.approved_decisions as Record<string, unknown>
      );
      setResult(probeResult);
      setBranchFindings(probeResult.branch_critic_findings.map(f => ({ ...f, id: f.id ?? uuid() })));
      setPhase('results');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Scenario Probe failed. Your original decisions are unchanged.');
      setPhase('error');
    }
  }

  function handleAcceptBranch() {
    if (!result || accepted) return;
    const causeId = uuid();

    result.changed_fields.forEach(field => {
      const stageApproved = store.ctx.approved_decisions[field.stage];
      if (!stageApproved) return;
      const updatedContent = { ...stageApproved.content, [field.field_name]: field.branch_value };
      store.writeApprovedDecision(field.stage, updatedContent, 'scenario_accept', causeId);
    });

    store.addScenarioOverride({
      id: result.scenario_id,
      triggered_from_stage: result.triggered_from_stage,
      what_if_input: result.what_if_input,
      affected_fields: result.affected_stages,
      branch_drafts: [],
      decision: 'accept_branch',
      created_at: new Date().toISOString(),
    });

    store.resolveScenarioOverride(result.scenario_id, 'accept_branch');
    setAccepted(true);
  }

  function handleKeepOriginal() {
    if (!result || kept) return;
    store.addScenarioOverride({
      id: result.scenario_id,
      triggered_from_stage: result.triggered_from_stage,
      what_if_input: result.what_if_input,
      affected_fields: result.affected_stages,
      branch_drafts: [],
      decision: 'keep_original',
      created_at: new Date().toISOString(),
    });
    store.resolveScenarioOverride(result.scenario_id, 'keep_original');
    setKept(true);
  }

  function handleNewProbe() {
    setPhase('input');
    setResult(null);
    setWhatIfInput('');
    setAccepted(false);
    setKept(false);
    setErrorMsg(null);
    setBranchFindings([]);
  }

  const isDecided = accepted || kept;

  return (
    <article aria-labelledby="probe-heading" className="space-y-6">
      <header>
        <p className="section-label mb-1">Scenario Probe</p>
        <h1 id="probe-heading" className="text-h1 font-bold text-ink-950">What-If Scenario</h1>
        <p className="text-body text-ink-500 mt-1.5">
          Explore how a strategic change would ripple through your brand system.
          The original is never modified until you explicitly accept the branch.
        </p>
      </header>

      <div
        role="note"
        className="flex items-start gap-2 px-4 py-3 bg-accent-100 border border-accent-600/20 rounded-md text-xs text-accent-600"
      >
        <span aria-hidden="true">ℹ</span>
        <span>
          The branch runs in isolation. Your approved decisions remain unchanged unless you explicitly click <strong>Accept Branch</strong>.
        </span>
      </div>

      {phase === 'input' && (
        <div className="card p-6 space-y-5">
          <div className="space-y-2">
            <label htmlFor="probe-trigger-stage" className="section-label block">
              Trigger from stage
            </label>
            <select
              id="probe-trigger-stage"
              value={triggeredFrom}
              onChange={e => setTriggeredFrom(e.target.value as StageName)}
              className="w-full rounded border border-border px-3 py-2 text-sm text-ink-950 focus:outline-none focus:ring-2 focus:ring-accent-600"
              aria-label="Stage to trigger scenario probe from"
            >
              {approvedStages.filter(s => s !== 'consistency_audit' && s !== 'kit_export').map(stage => (
                <option key={stage} value={stage}>
                  {STAGE_LABELS[stage] ?? stage}
                </option>
              ))}
              {approvedStages.length === 0 && (
                <option value="positioning">Positioning (no approvals yet)</option>
              )}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="probe-whatif" className="section-label block">
              What-if scenario
              <span className="ml-1 text-red-500" aria-hidden="true">*</span>
            </label>
            <textarea
              id="probe-whatif"
              value={whatIfInput}
              onChange={e => setWhatIfInput(e.target.value)}
              rows={4}
              placeholder="e.g. What if we shifted the target audience from undergraduates to graduate researchers?"
              className="w-full rounded border border-border px-3 py-2 text-sm text-ink-950 focus:outline-none focus:ring-2 focus:ring-accent-600 resize-y"
              aria-required="true"
              aria-describedby="probe-whatif-hint"
            />
            <p id="probe-whatif-hint" className="text-xs text-ink-500">
              Minimum 10 characters. Describe one strategic change.
            </p>
          </div>

          <button
            id="btn-run-probe"
            onClick={handleRunProbe}
            disabled={inputTooShort}
            className="btn-primary"
            aria-label="Run Scenario Probe"
            aria-disabled={inputTooShort}
          >
            Run Scenario Probe
          </button>
        </div>
      )}

      {phase === 'loading' && (
        <div className="space-y-4">
          <div className="card p-4 bg-surface-100 text-sm text-ink-500">
            <strong>Probe input:</strong> "{whatIfInput}"
          </div>
          <LoadingState stage="discovery" />
          <p className="text-xs text-center text-ink-500">
            Running isolated branch — your original decisions are unchanged.
          </p>
        </div>
      )}

      {phase === 'error' && (
        <div className="card border-red-200 p-6 space-y-4" role="alert">
          <p className="text-red-700 font-semibold">Scenario Probe failed</p>
          <p className="text-sm text-ink-700">{errorMsg}</p>
          <p className="text-xs text-ink-500">Your original approved decisions are unchanged.</p>
          <button onClick={handleNewProbe} className="btn-primary">Try Again</button>
        </div>
      )}

      {phase === 'results' && result && (
        <div className="space-y-6">
          <div className="card p-4 flex items-start gap-3">
            <span className="text-accent-600 text-lg mt-0.5" aria-hidden="true">✦</span>
            <div>
              <p className="section-label mb-0.5">What-if scenario</p>
              <p className="text-sm text-ink-950">"{result.what_if_input}"</p>
              <p className="text-xs text-ink-500 mt-1">
                Triggered from <strong>{STAGE_LABELS[result.triggered_from_stage]}</strong> ·{' '}
                {result.affected_stages.length} stage{result.affected_stages.length !== 1 ? 's' : ''} affected
              </p>
            </div>
          </div>

          {isDecided && (
            <div
              className={`flex items-center gap-3 p-4 rounded-md border ${accepted ? 'bg-green-50 border-green-200' : 'bg-surface-100 border-border'}`}
              role="status"
              aria-live="polite"
            >
              <span className={accepted ? 'text-green-600 font-bold' : 'text-ink-500'}>
                {accepted ? '✓ Branch accepted — approved decisions updated' : 'Original kept — no changes made'}
              </span>
              <button onClick={handleNewProbe} className="btn-secondary text-xs ml-auto">
                New Scenario
              </button>
            </div>
          )}

          <section aria-labelledby="changed-fields-heading">
            <h2 id="changed-fields-heading" className="text-h3 font-semibold text-ink-950 mb-3">
              Changed Fields ({result.changed_fields.length})
            </h2>
            {result.changed_fields.length > 0 ? (
              <div className="space-y-3">
                {result.changed_fields.map((field, i) => (
                  <BranchFieldRow key={i} field={field} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-500">No field changes detected in this branch.</p>
            )}
          </section>

          {result.affected_stages.length > 0 && (
            <section aria-labelledby="affected-stages-heading">
              <h2 id="affected-stages-heading" className="text-h3 font-semibold text-ink-950 mb-2">
                Downstream Stages Affected
              </h2>
              <div className="flex flex-wrap gap-2" role="list" aria-label="Affected downstream stages">
                {result.affected_stages.map(stage => (
                  <span key={stage} className="badge-needs-review" role="listitem">
                    {STAGE_LABELS[stage] ?? stage}
                  </span>
                ))}
              </div>
              <p className="text-xs text-ink-500 mt-2">
                These stages will be marked for review if you accept the branch.
              </p>
            </section>
          )}

          {branchFindings.length > 0 && (
            <section aria-labelledby="branch-critic-heading">
              <h2 id="branch-critic-heading" className="text-h3 font-semibold text-ink-950 mb-3">
                Critic Findings for Branch
              </h2>
              <div className="space-y-3">
                {branchFindings.map(finding => (
                  <CriticFindingCard
                    key={finding.id}
                    finding={finding}
                    onAction={(action) => {
                      setBranchFindings(prev =>
                        prev.map(f => f.id === finding.id ? { ...f, user_action: action } : f)
                      );
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {!isDecided && (
            <section
              role="region"
              aria-label="Branch decision panel"
              className="border border-border rounded-md p-5 bg-surface-100 space-y-4"
            >
              <p className="section-label">Branch Decision</p>
              <p className="text-sm text-ink-700">
                Choose whether to accept the branch into your approved decisions, or keep the original unchanged.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  id="btn-accept-branch"
                  onClick={handleAcceptBranch}
                  className="btn-primary"
                  aria-label="Accept branch — apply what-if changes to approved decisions"
                >
                  ✓ Accept Branch
                </button>
                <button
                  id="btn-keep-original"
                  onClick={handleKeepOriginal}
                  className="btn-secondary"
                  aria-label="Keep original — discard branch, no changes"
                >
                  Keep Original
                </button>
                <button
                  id="btn-edit-probe"
                  onClick={handleNewProbe}
                  className="btn-secondary"
                  aria-label="Edit scenario — go back and modify the what-if input"
                >
                  Edit Scenario
                </button>
              </div>
              <p className="text-xs text-ink-500">
                Accepting creates a revision log entry. Your original is preserved until you click Accept.
              </p>
            </section>
          )}
        </div>
      )}
    </article>
  );
}
