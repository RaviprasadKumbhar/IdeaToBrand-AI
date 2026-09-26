/**
 * Approval state machine — pure function (architecture.md § 15).
 * Unit-tested exhaustively in __tests__/stateMachine.test.ts.
 */
import type { ApprovalState, ApprovalEvent } from './types';

const TRANSITIONS: Record<ApprovalState, Partial<Record<ApprovalEvent, ApprovalState>>> = {
  draft: {
    critic_pass: 'critic_review',
    critic_flag: 'needs_revision',
    schema_fail: 'failed',
  },
  critic_review: {
    critic_flag: 'needs_revision',
    critic_pass: 'approved',
    schema_fail: 'failed',
  },
  needs_revision: {
    regenerate: 'draft',
    user_approve: 'approved',
    schema_fail: 'failed',
  },
  approved: {
    upstream_changed: 'needs_review',
    user_edit: 'draft',
  },
  needs_review: {
    critic_pass: 'approved',
    critic_flag: 'needs_revision',
    regenerate: 'draft',
    schema_fail: 'failed',
  },
  rejected: {
    regenerate: 'draft',
  },
  failed: {
    regenerate: 'draft',
  },
};

export function transition(current: ApprovalState, event: ApprovalEvent): ApprovalState {
  return TRANSITIONS[current]?.[event] ?? current;
}
