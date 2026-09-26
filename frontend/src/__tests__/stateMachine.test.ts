/**
 * Tests for the approval state machine (T-040, architecture.md § 15).
 * Exhaustively tests every transition listed in the state machine.
 */
import { describe, it, expect } from 'vitest';
import { transition } from '../../../shared/state-machine';

describe('Approval State Machine', () => {
  describe('draft state', () => {
    it('transitions to critic_review on critic_pass', () => {
      expect(transition('draft', 'critic_pass')).toBe('critic_review');
    });
    it('transitions to needs_revision on critic_flag', () => {
      expect(transition('draft', 'critic_flag')).toBe('needs_revision');
    });
    it('transitions to failed on schema_fail', () => {
      expect(transition('draft', 'schema_fail')).toBe('failed');
    });
    it('stays draft on unrecognised event', () => {
      expect(transition('draft', 'user_approve')).toBe('draft');
    });
  });

  describe('critic_review state', () => {
    it('transitions to needs_revision on critic_flag', () => {
      expect(transition('critic_review', 'critic_flag')).toBe('needs_revision');
    });
    it('transitions to approved on critic_pass', () => {
      expect(transition('critic_review', 'critic_pass')).toBe('approved');
    });
    it('transitions to failed on schema_fail', () => {
      expect(transition('critic_review', 'schema_fail')).toBe('failed');
    });
  });

  describe('needs_revision state', () => {
    it('transitions to draft on regenerate', () => {
      expect(transition('needs_revision', 'regenerate')).toBe('draft');
    });
    it('transitions to approved on user_approve (override)', () => {
      expect(transition('needs_revision', 'user_approve')).toBe('approved');
    });
  });

  describe('approved state', () => {
    it('transitions to needs_review on upstream_changed', () => {
      expect(transition('approved', 'upstream_changed')).toBe('needs_review');
    });
    it('transitions to draft on user_edit', () => {
      expect(transition('approved', 'user_edit')).toBe('draft');
    });
    it('stays approved on unrelated events', () => {
      expect(transition('approved', 'critic_flag')).toBe('approved');
    });
  });

  describe('needs_review state', () => {
    it('transitions to approved on critic_pass', () => {
      expect(transition('needs_review', 'critic_pass')).toBe('approved');
    });
    it('transitions to needs_revision on critic_flag', () => {
      expect(transition('needs_review', 'critic_flag')).toBe('needs_revision');
    });
    it('transitions to draft on regenerate', () => {
      expect(transition('needs_review', 'regenerate')).toBe('draft');
    });
  });

  describe('failed state', () => {
    it('transitions to draft on regenerate', () => {
      expect(transition('failed', 'regenerate')).toBe('draft');
    });
    it('stays failed on other events', () => {
      expect(transition('failed', 'user_approve')).toBe('failed');
    });
  });

  describe('rejected state', () => {
    it('transitions to draft on regenerate', () => {
      expect(transition('rejected', 'regenerate')).toBe('draft');
    });
  });
});
