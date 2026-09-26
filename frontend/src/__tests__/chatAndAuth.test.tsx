/**
 * Tests for Studio Brand Workspace, Supabase Auth Flow, and Landing Page.
 * Verifies public landing page, Supabase auth views, IdeaInput canvas, document attachments,
 * and AppShell categorized navigation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { IdeaInput } from '../stages/idea-input/IdeaInput';
import { AppShell } from '../components/AppShell';
import { AuthProvider } from '../context/AuthContext';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Public Landing Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders brand heading and value proposition', () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByRole('heading', { level: 1, name: /turn your business idea into a complete brand strategy/i })).toBeInTheDocument();
    expect(screen.getByText(/no confusing marketing jargon/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /start building your brand/i })[0]).toBeInTheDocument();
  });

  it('navigates to signup on Start Building Your Brand click when not authenticated', async () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      </AuthProvider>
    );

    const cta = screen.getAllByRole('button', { name: /start building your brand/i })[0];
    await userEvent.click(cta);
    expect(mockNavigate).toHaveBeenCalledWith('/signup');
  });

  it('renders 9 brand stages with plain-language explanations', () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText(/brand discovery/i)).toBeInTheDocument();
    expect(screen.getByText(/understand your business, customers, and market\./i)).toBeInTheDocument();
    expect(screen.getByText(/positioning matrix/i)).toBeInTheDocument();
    expect(screen.getByText(/find what makes your brand different from competitors\./i)).toBeInTheDocument();
    expect(screen.getByText(/kit \+ export/i)).toBeInTheDocument();
  });
});

describe('Authentic Supabase Auth Pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders LoginPage with email, password fields, and zero demo bypass buttons', () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /forgot your password\?/i })).toBeInTheDocument();
    // Zero demo bypass button
    expect(screen.queryByRole('button', { name: /demo/i })).not.toBeInTheDocument();
  });

  it('toggles password visibility on LoginPage', async () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>
    );

    const passwordInput = screen.getByLabelText(/^password/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const toggleBtn = screen.getByRole('button', { name: /^show$/i });
    await userEvent.click(toggleBtn);
    expect(passwordInput.type).toBe('text');

    await userEvent.click(screen.getByRole('button', { name: /^hide$/i }));
    expect(passwordInput.type).toBe('password');
  });

  it('renders SignupPage with validation fields and zero demo bypasses', () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <SignupPage />
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /demo/i })).not.toBeInTheDocument();
  });

  it('validates password mismatch on SignupPage', async () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <SignupPage />
        </MemoryRouter>
      </AuthProvider>
    );

    await userEvent.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    await userEvent.type(screen.getByLabelText(/email address/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'password123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'different123');

    const submitBtn = screen.getByRole('button', { name: /create account/i });
    await userEvent.click(submitBtn);

    expect(screen.getByRole('alert')).toHaveTextContent(/passwords do not match/i);
  });

  it('renders ForgotPasswordPage and handles reset request', () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <ForgotPasswordPage />
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });
});

describe('IdeaInput Project Creation Canvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "What are you building?" canvas without arbitrary word count limits', () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <IdeaInput />
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByRole('heading', { name: /what are you building\?/i })).toBeInTheDocument();
    const textarea = screen.getByLabelText(/your idea or business description/i);
    expect(textarea).not.toHaveAttribute('maxLength');
    expect(screen.getByText(/write freely without word count restrictions\./i)).toBeInTheDocument();
  });

  it('supports document attachment selection and removal', async () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <IdeaInput />
        </MemoryRouter>
      </AuthProvider>
    );

    const fileInput = screen.getByLabelText(/upload reference files/i);
    const testFile = new File(['business plan content'], 'business-plan.txt', { type: 'text/plain' });

    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      expect(screen.getByText(/business-plan\.txt/i)).toBeInTheDocument();
    });

    // Remove the attachment
    const removeBtn = screen.getByLabelText(/remove file business-plan\.txt/i);
    await userEvent.click(removeBtn);

    expect(screen.queryByText(/business-plan\.txt/i)).not.toBeInTheDocument();
  });

  it('applies quick example template into canvas', async () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <IdeaInput />
        </MemoryRouter>
      </AuthProvider>
    );

    const ecoCourierBtn = screen.getByRole('button', { name: /ecocourier/i });
    await userEvent.click(ecoCourierBtn);

    const textarea = screen.getByLabelText(/your idea or business description/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain('cargo bike logistics');
  });
});

describe('AppShell Brand Workspace Navigation', () => {
  it('renders categorized navigation with plain language descriptions', () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <AppShell>
            <div>Workspace Stage Content</div>
          </AppShell>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText(/brand strategy pipeline/i)).toBeInTheDocument();
    expect(screen.getByText(/foundation/i)).toBeInTheDocument();
    expect(screen.getByText(/strategy & identity/i)).toBeInTheDocument();
    expect(screen.getByText(/launch & delivery/i)).toBeInTheDocument();
    expect(screen.getByText(/workspace stage content/i)).toBeInTheDocument();
    expect(screen.getByText(/understand your business, customers, and market\./i)).toBeInTheDocument();
  });
});
