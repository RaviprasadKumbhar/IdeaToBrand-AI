/**
 * Supabase Client Initialization and Authentication Services.
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from project environment.
 * Zero demo accounts, zero mock bypasses, strictly authentic Supabase session handling.
 */
import { createClient, type SupabaseClient, type Session, type AuthError } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zksrwnojdjfddhmvhpxm.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseAnonKey.trim().length > 0
);

// Fallback anon placeholder prevents module parse crashes if VITE_SUPABASE_ANON_KEY is not yet populated
const clientKey = isSupabaseConfigured ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key';

export const supabase: SupabaseClient = createClient(supabaseUrl, clientKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export async function getCurrentSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) {
    return null;
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('[Supabase Auth] Session fetch failed:', error.message);
    return null;
  }
  return data.session;
}

export async function signOutUser(): Promise<{ error: AuthError | Error | null }> {
  if (!isSupabaseConfigured) {
    return { error: null };
  }
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function resetPasswordForEmail(email: string): Promise<{ error: AuthError | Error | null }> {
  if (!isSupabaseConfigured) {
    return { error: new Error('Authentication service is temporarily unavailable. Please try again later.') };
  }
  const redirectUrl = `${window.location.origin}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });
  return { error };
}

export async function updateUserPassword(newPassword: string): Promise<{ error: AuthError | Error | null }> {
  if (!isSupabaseConfigured) {
    return { error: new Error('Supabase environment not configured.') };
  }
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { error };
}
