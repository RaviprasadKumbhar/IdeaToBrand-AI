/**
 * Tests for Conversational Chat Workspace, Auth Flow, and Landing Page.
 * Verifies public landing page, Supabase auth views, chat composer, file attachments,
 * and conversational workflow integration.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { ChatWorkspace } from '../components/chat/ChatWorkspace';
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

    expect(screen.getByRole('heading', { level: 1, name: /turn your idea into a brand/i })).toBeInTheDocument();
    expect(screen.getByText(/from raw idea to a brand ready for the world/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /start building free/i })[0]).toBeInTheDocument();
  });

  it('navigates to signup on Start Building Free click', async () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      </AuthProvider>
    );

    const cta = screen.getAllByRole('button', { name: /start building free/i })[0];
    await userEvent.click(cta);
    expect(mockNavigate).toHaveBeenCalledWith('/signup');
  });

  it('renders capabilities section with 9 brand gates', () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText(/brand discovery/i)).toBeInTheDocument();
    expect(screen.getByText(/positioning matrix/i)).toBeInTheDocument();
    expect(screen.getAllByText(/consistency audit/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/brand kit export/i)).toBeInTheDocument();
  });
});

describe('Supabase Auth Pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders LoginPage with email and password fields', () => {
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

    const toggleBtn = screen.getByRole('button', { name: /show/i });
    await userEvent.click(toggleBtn);
    expect(passwordInput.type).toBe('text');

    await userEvent.click(screen.getByRole('button', { name: /hide/i }));
    expect(passwordInput.type).toBe('password');
  });

  it('renders SignupPage with validation fields', () => {
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
  });

  it('validates password mismatch on SignupPage', async () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <SignupPage />
        </MemoryRouter>
      </AuthProvider>
    );

    await userEvent.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'password123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'different123');

    const submitBtn = screen.getByRole('button', { name: /create account/i });
    await userEvent.click(submitBtn);

    expect(screen.getByRole('alert')).toHaveTextContent(/passwords do not match/i);
  });
});

describe('Conversational ChatWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders welcome state with suggestion chips and quick-start templates', () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <ChatWorkspace />
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText(/let's build your brand\./i)).toBeInTheDocument();
    expect(screen.getByText(/define brand idea/i)).toBeInTheDocument();
    expect(screen.getByText(/explore target audience/i)).toBeInTheDocument();
    expect(screen.getByText(/ecocourier \(logistics\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/chat input message/i)).toBeInTheDocument();
  });

  it('has multiline textarea composer without arbitrary 500-word limit', async () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <ChatWorkspace />
        </MemoryRouter>
      </AuthProvider>
    );

    const textarea = screen.getByLabelText(/chat input message/i);
    expect(textarea).not.toHaveAttribute('maxLength');

    // Type a conversational message
    await userEvent.type(textarea, 'Help me build a brand.');
    expect(textarea).toHaveValue('Help me build a brand.');

    const sendBtn = screen.getByRole('button', { name: /send message/i });
    expect(sendBtn).not.toBeDisabled();
  });

  it('supports document attachment selection and removal', async () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <ChatWorkspace />
        </MemoryRouter>
      </AuthProvider>
    );

    const fileInput = screen.getByLabelText(/attach documents or images/i);
    const testFile = new File(['brand research notes'], 'research.txt', { type: 'text/plain' });

    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      expect(screen.getByText(/research\.txt/i)).toBeInTheDocument();
    });

    // Remove the attachment
    const removeBtn = screen.getByRole('button', { name: /remove attachment research\.txt/i });
    await userEvent.click(removeBtn);

    expect(screen.queryByText(/research\.txt/i)).not.toBeInTheDocument();
  });

  it('rejects unsupported file formats with clear error alert', async () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <ChatWorkspace />
        </MemoryRouter>
      </AuthProvider>
    );

    const fileInput = screen.getByLabelText(/attach documents or images/i);
    const unsupportedFile = new File(['malicious script'], 'hack.exe', { type: 'application/x-msdownload' });

    fireEvent.change(fileInput, { target: { files: [unsupportedFile] } });

    await waitFor(() => {
      expect(screen.getByText(/file "hack\.exe" is not supported/i)).toBeInTheDocument();
    });
  });
});
