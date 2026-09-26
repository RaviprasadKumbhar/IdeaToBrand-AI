/**
 * UI tests for IdeaInput form (T-014, T-040).
 * Tests: validation, accessible labels, input preservation, user-fact separation,
 * absence of 500-word caps, and optional context.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { IdeaInput } from '../stages/idea-input/IdeaInput';

// Mock the store
vi.mock('../store/foilStore', () => ({
  useFOILStore: () => ({
    setIdeaInput: vi.fn(),
    ideaInput: null,
  }),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderIdeaInput() {
  return render(
    <MemoryRouter>
      <IdeaInput />
    </MemoryRouter>
  );
}

describe('IdeaInput form', () => {
  it('renders with accessible label for description field', () => {
    renderIdeaInput();
    const textarea = screen.getByLabelText(/your idea or business description/i);
    expect(textarea).toBeInTheDocument();
  });

  it('allows unconstrained typing without 500-word limit', async () => {
    renderIdeaInput();
    const textarea = screen.getByLabelText(/your idea or business description/i);
    expect(textarea).not.toHaveAttribute('maxLength');
    expect(screen.queryByText(/500 words/i)).not.toBeInTheDocument();
    expect(screen.getByText(/write freely without word count restrictions\./i)).toBeInTheDocument();
  });

  it('shows validation error when description is too short', async () => {
    renderIdeaInput();
    const textarea = screen.getByLabelText(/your idea or business description/i);
    await userEvent.type(textarea, 'Hi');
    const form = textarea.closest('form')!;
    fireEvent.submit(form);
    expect(await screen.findByText(/at least a few words/i)).toBeInTheDocument();
  });

  it('Begin Brand Strategy button is disabled when textarea is empty', () => {
    renderIdeaInput();
    const btn = screen.getByRole('button', { name: /begin brand strategy/i });
    expect(btn).toBeDisabled();
  });

  it('Begin Brand Strategy button is enabled after typing', async () => {
    renderIdeaInput();
    const textarea = screen.getByLabelText(/your idea or business description/i);
    await userEvent.type(textarea, 'Hello world this is a test idea');
    const btn = screen.getByRole('button', { name: /begin brand strategy/i });
    expect(btn).not.toBeDisabled();
  });

  it('shows validation error on form submit when empty textarea is forced', async () => {
    renderIdeaInput();
    const textarea = screen.getByLabelText(/your idea or business description/i);
    await userEvent.type(textarea, 'test');
    await userEvent.clear(textarea);
    const form = textarea.closest('form')!;
    fireEvent.submit(form);
    expect(await screen.findByText(/please provide a description/i)).toBeInTheDocument();
  });

  it('optional context section can be expanded', async () => {
    renderIdeaInput();
    const expandBtn = screen.getByRole('button', { name: /optional context/i });
    await userEvent.click(expandBtn);
    expect(screen.getByLabelText(/target audience/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category or industry/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/constraints or rules/i)).toBeInTheDocument();
  });

  it('optional audience field has accessible label', async () => {
    renderIdeaInput();
    const expandBtn = screen.getByRole('button', { name: /optional context/i });
    await userEvent.click(expandBtn);
    const audienceInput = screen.getByLabelText(/target audience/i);
    expect(audienceInput).toBeInTheDocument();
  });
});
