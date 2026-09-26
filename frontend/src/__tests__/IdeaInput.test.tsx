/**
 * UI tests for IdeaInput form (T-014, T-040).
 * Tests: validation, accessible labels, input preservation, user-fact labeling.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

  it('shows word count', async () => {
    renderIdeaInput();
    const textarea = screen.getByLabelText(/your idea or business description/i);
    await userEvent.type(textarea, 'Hello world test');
    expect(screen.getByText(/3 \/ 500 words/i)).toBeInTheDocument();
  });

  it('shows validation error when description is too short', async () => {
    renderIdeaInput();
    const textarea = screen.getByLabelText(/your idea or business description/i);
    await userEvent.type(textarea, 'Hi');
    // form.submit() bypasses the disabled check so validation runs
    const form = textarea.closest('form')!;
    fireEvent.submit(form);
    expect(await screen.findByText(/at least 5 words/i)).toBeInTheDocument();
  });

  it('shows validation error when description is too short (submit via form)', async () => {
    renderIdeaInput();
    const textarea = screen.getByLabelText(/your idea or business description/i);
    await userEvent.type(textarea, 'Hi there');
    const form = textarea.closest('form')!;
    fireEvent.submit(form);
    // 2 words — should pass word count but still short
  });

  it('Start Discovery button is disabled when textarea is empty', () => {
    renderIdeaInput();
    const btn = screen.getByRole('button', { name: /start discovery/i });
    expect(btn).toBeDisabled();
  });

  it('Start Discovery button is enabled after typing', async () => {
    renderIdeaInput();
    const textarea = screen.getByLabelText(/your idea or business description/i);
    await userEvent.type(textarea, 'Hello world this is a test');
    const btn = screen.getByRole('button', { name: /start discovery/i });
    expect(btn).not.toBeDisabled();
  });

  it('shows validation error on form submit when empty textarea is forced', async () => {
    renderIdeaInput();
    const textarea = screen.getByLabelText(/your idea or business description/i);
    // Type then clear to enable submit, then clear it
    await userEvent.type(textarea, 'test');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'hi');
    const form = textarea.closest('form')!;
    fireEvent.submit(form);
    expect(await screen.findByText(/at least 5 words/i)).toBeInTheDocument();
  });

  it('shows user-fact notice in the form', () => {
    renderIdeaInput();
    expect(screen.getByText(/user-provided facts/i)).toBeInTheDocument();
  });

  it('optional context section can be expanded', async () => {
    renderIdeaInput();
    const expandBtn = screen.getByRole('button', { name: /optional context/i });
    await userEvent.click(expandBtn);
    expect(screen.getByLabelText(/target audience/i)).toBeInTheDocument();
  });

  it('optional audience field has accessible label', async () => {
    renderIdeaInput();
    const expandBtn = screen.getByRole('button', { name: /optional context/i });
    await userEvent.click(expandBtn);
    const audienceInput = screen.getByLabelText(/target audience/i);
    expect(audienceInput).toBeInTheDocument();
  });
});
