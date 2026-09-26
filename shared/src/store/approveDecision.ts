import type { StageName, SharedContext, RevisionLogEntry } from '../types/index.js';

/**
 * Single authoritative choke point for updating approved_decisions.
 * Guarantees that every write to approved_decisions appends exactly one revision_log entry.
 */
export function writeApprovedDecision(
  ctx: SharedContext,
  stage: StageName,
  content: Record<string, unknown>,
  cause: RevisionLogEntry['cause'],
  causeId: string
): SharedContext {
  const previous = ctx.approved_decisions[stage]?.content ?? null;
  const revisionEntry: RevisionLogEntry = {
    id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    changed_field: stage,
    previous_value: previous,
    new_value: content,
    cause,
    cause_id: causeId,
    timestamp: new Date().toISOString(),
  };

  return {
    ...ctx,
    approved_decisions: {
      ...ctx.approved_decisions,
      [stage]: {
        stage,
        content,
        approved_at: revisionEntry.timestamp,
        state: 'approved',
        source: cause,
      },
    },
    revision_log: [...ctx.revision_log, revisionEntry],
  };
}
