/**
 * Tests for ApprovalBar — T-013, T-040.
 * Approval button is only active after findings are resolved.
 * Success must never appear before operation succeeds.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApprovalBar } from '../components/ApprovalBar';

describe('ApprovalBar', () => {
  const defaultProps = {
    approvalState: 'draft' as const,
    hasBlockingFindings: false,
    approveDisabled: false,
    onApprove: vi.fn(),
    onReject: vi.fn(),
    onRegenerate: vi.fn(),
    onEdit: vi.fn(),
  };

  it('renders Approve, Edit, Regenerate, Reject buttons', () => {
    render(<ApprovalBar {...defaultProps} />);
    expect(screen.getByRole('button', { name: /approve this draft/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit the current draft/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
  });

  it('Approve button is disabled when there are blocking findings', () => {
    render(<ApprovalBar {...defaultProps} hasBlockingFindings={true} />);
    // When blocking findings exist, aria-label changes to 'Resolve findings before approving'
    const approveBtn = screen.getByRole('button', { name: /resolve findings before approving/i });
    expect(approveBtn).toBeDisabled();
  });

  it('shows findings warning when there are blocking findings', () => {
    render(<ApprovalBar {...defaultProps} hasBlockingFindings={true} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/resolve all critic findings/i);
  });

  it('shows "Approve Anyway" button when there are blocking findings', () => {
    render(<ApprovalBar {...defaultProps} hasBlockingFindings={true} />);
    // Match on visible text content instead of full aria-label
    expect(screen.getByText(/approve anyway/i)).toBeInTheDocument();
  });

  it('Approve button is enabled when no blocking findings', () => {
    render(<ApprovalBar {...defaultProps} hasBlockingFindings={false} />);
    const approveBtn = screen.getByRole('button', { name: /approve this draft/i });
    expect(approveBtn).not.toBeDisabled();
  });

  it('calls onApprove when Approve button is clicked', async () => {
    const onApprove = vi.fn();
    render(<ApprovalBar {...defaultProps} onApprove={onApprove} />);
    await userEvent.click(screen.getByRole('button', { name: /approve this draft/i }));
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('calls onReject when Reject button is clicked', async () => {
    const onReject = vi.fn();
    render(<ApprovalBar {...defaultProps} onReject={onReject} />);
    await userEvent.click(screen.getByRole('button', { name: /reject/i }));
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('calls onRegenerate when Regenerate button is clicked', async () => {
    const onRegenerate = vi.fn();
    render(<ApprovalBar {...defaultProps} onRegenerate={onRegenerate} />);
    await userEvent.click(screen.getByRole('button', { name: /regenerate/i }));
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  it('shows needs_review message for needs_review state', () => {
    render(<ApprovalBar {...defaultProps} approvalState="needs_review" />);
    expect(screen.getByText(/upstream change/i)).toBeInTheDocument();
  });
});
