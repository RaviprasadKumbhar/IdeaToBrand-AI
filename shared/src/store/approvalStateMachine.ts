import { ApprovalEvent, ApprovalState } from "../types/index.js";

/**
 * Custom error thrown when an illegal approval state transition is attempted.
 */
export class IllegalStateTransitionError extends Error {
  constructor(
    public readonly currentState: ApprovalState,
    public readonly event: ApprovalEvent
  ) {
    super(
      `Illegal approval state transition: Cannot transition from '${currentState}' with event '${event.type}'.`
    );
    this.name = "IllegalStateTransitionError";
  }
}

/**
 * Pure state machine transition function implementing docs/architecture.md Section 15.
 * Task T-009: Approval State Management.
 *
 * Rules:
 * - Only explicit user action or Critic verification can advance to 'approved'.
 * - Upstream changes only set 'needs_review', never trigger blind regeneration.
 * - Failed validation always transitions to 'failed'.
 */
export function transition(current: ApprovalState, event: ApprovalEvent): ApprovalState {
  // Global event: validation failed always transitions to 'failed'
  if (event.type === "VALIDATION_FAILED") {
    return "failed";
  }

  // Global event: reset stage to draft
  if (event.type === "RESET_STAGE") {
    return "draft";
  }

  switch (current) {
    case "draft":
      if (event.type === "SUBMIT_CRITIC") {
        return "critic_review";
      }
      break;

    case "critic_review":
      if (event.type === "CRITIC_FINDINGS_DETECTED") {
        return "needs_revision";
      }
      if (event.type === "CRITIC_NO_FINDINGS") {
        return "approved";
      }
      break;

    case "needs_revision":
      if (event.type === "REQUEST_REGENERATION") {
        return "draft";
      }
      if (event.type === "USER_ACCEPT_DRAFT") {
        return "approved";
      }
      break;

    case "approved":
      if (event.type === "UPSTREAM_CHANGED") {
        return "needs_review";
      }
      if (event.type === "USER_ACCEPT_DRAFT") {
        return "approved"; // Idempotent re-affirmation
      }
      break;

    case "needs_review":
      if (event.type === "RECHECK_CRITIC") {
        return "critic_review";
      }
      if (event.type === "USER_ACCEPT_DRAFT") {
        return "approved"; // User re-confirms without regeneration
      }
      if (event.type === "REQUEST_REGENERATION") {
        return "draft";
      }
      break;

    case "failed":
    case "rejected":
      if (event.type === "REQUEST_REGENERATION" || event.type === "GENERATE_DRAFT") {
        return "draft";
      }
      break;
  }

  throw new IllegalStateTransitionError(current, event);
}
