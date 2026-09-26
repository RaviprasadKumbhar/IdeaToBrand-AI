/**
 * Supabase Client Initialization and Authentication Services.
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from project environment.
 * Zero demo accounts, zero mock bypasses, strictly authentic Supabase session handling.
 */
import { createClient, type SupabaseClient, type Session, type User, type AuthError } from '@supabase/supabase-js';
import type { SharedContext } from '../../../shared/types';

const DEFAULT_SUPABASE_URL = 'https://zksrwnojdjfddhmvhpxm.supabase.co';
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprc3J3bm9qZGpmZGRobXZocHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MTcyODMsImV4cCI6MjEwNTk5MzI4M30.mHoOvczo4YsDCmmui257UNA7NaoFP3u789J5xSnKGsA';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseAnonKey.trim().length > 0
);

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('[Supabase Auth] Session fetch failed:', error.message);
    return null;
  }
  return data.session;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('[Supabase Auth] User fetch failed:', error.message);
    return null;
  }
  return user;
}

export async function signOutUser(): Promise<{ error: AuthError | Error | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function resetPasswordForEmail(email: string): Promise<{ error: AuthError | Error | null }> {
  const redirectUrl = `${window.location.origin}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: redirectUrl,
  });
  return { error };
}

export async function updateUserPassword(newPassword: string): Promise<{ error: AuthError | Error | null }> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { error };
}

export async function resendVerificationEmail(email: string): Promise<{ error: AuthError | Error | null }> {
  const redirectUrl = `${window.location.origin}/verify-email`;
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: redirectUrl,
    },
  });
  return { error };
}

// ─── Database Persistence Services ───────────────────────────────────────────

export interface DbProjectRecord {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  current_stage: string;
  context: SharedContext;
  ui_states: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export async function fetchUserProjects(userId: string): Promise<{ data: DbProjectRecord[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[Supabase DB] Failed to fetch projects:', error.message);
      return { data: null, error: new Error(error.message) };
    }
    return { data: data as DbProjectRecord[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Failed to load projects') };
  }
}

export async function saveProjectToDb(
  project: DbProjectRecord
): Promise<{ error: Error | null }> {
  try {
    const payload = {
      id: project.id,
      user_id: project.user_id,
      name: project.name || 'Untitled Brand',
      description: project.description || null,
      current_stage: project.current_stage || 'idea-input',
      context: project.context,
      ui_states: project.ui_states || {},
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('projects')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('[Supabase DB] Failed to save project:', error.message);
      return { error: new Error(error.message) };
    }
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Failed to save project') };
  }
}

export async function deleteProjectFromDb(
  projectId: string,
  userId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId);

    if (error) {
      console.error('[Supabase DB] Failed to delete project:', error.message);
      return { error: new Error(error.message) };
    }
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Failed to delete project') };
  }
}
