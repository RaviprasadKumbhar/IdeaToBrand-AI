/**
 * Tests for the approval state machine (T-040, architecture.md § 15).
 * Exhaustively tests every transition listed in the state machine.
 *
 * Migrated to the canonical object-event ApprovalEvent API
 * (shared/src/store/approvalStateMachine.ts via shared/src/store/approvalStateMachine).
 */
import { describe, it, expect } from 'vitest';
import {
  transition,
  IllegalStateTransitionError,
} from '../../../shared/src/store/approvalStateMachine';

describe('Approval State Machine', () => {
  describe('draft state', () => {
    it('transitions to critic_review on SUBMIT_CRITIC', () => {
      expect(transition('draft', { type: 'SUBMIT_CRITIC' })).toBe('critic_review');
    });
    it('throws on GENERATE_DRAFT from draft (only valid from failed/rejected)', () => {
      expect(() => transition('draft', { type: 'GENERATE_DRAFT' })).toThrowError(
        IllegalStateTransitionError
      );
    });
    it('transitions to failed on VALIDATION_FAILED', () => {
      expect(transition('draft', { type: 'VALIDATION_FAILED' })).toBe('failed');
    });
    it('transitions to draft on RESET_STAGE', () => {
      expect(transition('draft', { type: 'RESET_STAGE' })).toBe('draft');
    });
    it('throws IllegalStateTransitionError on unrecognised event from draft', () => {
      expect(() => transition('draft', { type: 'CRITIC_NO_FINDINGS' })).toThrowError(
        IllegalStateTransitionError
      );
    });
  });

  describe('critic_review state', () => {
    it('transitions to needs_revision on CRITIC_FINDINGS_DETECTED', () => {
      expect(transition('critic_review', { type: 'CRITIC_FINDINGS_DETECTED' })).toBe('needs_revision');
    });
    it('transitions to approved on CRITIC_NO_FINDINGS', () => {
      expect(transition('critic_review', { type: 'CRITIC_NO_FINDINGS' })).toBe('approved');
    });
    it('transitions to approved on USER_ACCEPT_DRAFT', () => {
      expect(transition('critic_review', { type: 'USER_ACCEPT_DRAFT' })).toBe('approved');
    });
    it('transitions to failed on VALIDATION_FAILED', () => {
      expect(transition('critic_review', { type: 'VALIDATION_FAILED' })).toBe('failed');
    });
    it('throws IllegalStateTransitionError on illegal event from critic_review', () => {
      expect(() => transition('critic_review', { type: 'UPSTREAM_CHANGED' })).toThrowError(
        IllegalStateTransitionError
      );
    });
  });

  describe('needs_revision state', () => {
    it('transitions to draft on REQUEST_REGENERATION', () => {
      expect(transition('needs_revision', { type: 'REQUEST_REGENERATION' })).toBe('draft');
    });
    it('transitions to approved on USER_ACCEPT_DRAFT (override)', () => {
      expect(transition('needs_revision', { type: 'USER_ACCEPT_DRAFT' })).toBe('approved');
    });
    it('transitions to failed on VALIDATION_FAILED', () => {
      expect(transition('needs_revision', { type: 'VALIDATION_FAILED' })).toBe('failed');
    });
  });

  describe('approved state', () => {
    it('transitions to needs_review on UPSTREAM_CHANGED', () => {
      expect(transition('approved', { type: 'UPSTREAM_CHANGED' })).toBe('needs_review');
    });
    it('stays approved on USER_ACCEPT_DRAFT (idempotent re-affirmation)', () => {
      expect(transition('approved', { type: 'USER_ACCEPT_DRAFT' })).toBe('approved');
    });
    it('transitions to draft on USER_EDIT', () => {
      expect(transition('approved', { type: 'USER_EDIT' })).toBe('draft');
    });
    it('transitions to draft on RESET_STAGE', () => {
      expect(transition('approved', { type: 'RESET_STAGE' })).toBe('draft');
    });
    it('throws IllegalStateTransitionError on illegal event from approved', () => {
      expect(() => transition('approved', { type: 'CRITIC_FINDINGS_DETECTED' })).toThrowError(
        IllegalStateTransitionError
      );
    });
  });

  describe('needs_review state', () => {
    it('transitions to critic_review on RECHECK_CRITIC', () => {
      expect(transition('needs_review', { type: 'RECHECK_CRITIC' })).toBe('critic_review');
    });
    it('transitions to approved on USER_ACCEPT_DRAFT', () => {
      expect(transition('needs_review', { type: 'USER_ACCEPT_DRAFT' })).toBe('approved');
    });
    it('transitions to draft on REQUEST_REGENERATION', () => {
      expect(transition('needs_review', { type: 'REQUEST_REGENERATION' })).toBe('draft');
    });
    it('transitions to failed on VALIDATION_FAILED', () => {
      expect(transition('needs_review', { type: 'VALIDATION_FAILED' })).toBe('failed');
    });
  });

  describe('failed state', () => {
    it('transitions to draft on REQUEST_REGENERATION', () => {
      expect(transition('failed', { type: 'REQUEST_REGENERATION' })).toBe('draft');
    });
    it('transitions to draft on GENERATE_DRAFT', () => {
      expect(transition('failed', { type: 'GENERATE_DRAFT' })).toBe('draft');
    });
    it('transitions to draft on RESET_STAGE', () => {
      expect(transition('failed', { type: 'RESET_STAGE' })).toBe('draft');
    });
  });

  describe('rejected state', () => {
    it('transitions to draft on REQUEST_REGENERATION', () => {
      expect(transition('rejected', { type: 'REQUEST_REGENERATION' })).toBe('draft');
    });
    it('transitions to draft on GENERATE_DRAFT', () => {
      expect(transition('rejected', { type: 'GENERATE_DRAFT' })).toBe('draft');
    });
    it('transitions to draft on RESET_STAGE', () => {
      expect(transition('rejected', { type: 'RESET_STAGE' })).toBe('draft');
    });
  });
});
