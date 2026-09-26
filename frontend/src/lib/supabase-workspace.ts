/**
 * Supabase Workspace & Project Persistence Service (Phase 6).
 * Manages user-isolated project workspaces, stage approvals, chat history,
 * and fact provenance with Row Level Security (RLS).
 */
import { supabase, isSupabaseConfigured } from './supabase';
import type { SharedContext, StageName, StageUIState, FactItem } from '../../../shared/types';

export interface WorkspaceProjectData {
  id: string;
  name: string;
  description?: string;
  current_stage: StageName | 'idea-input';
  context: SharedContext & {
    extracted_facts?: FactItem[];
    chat_history?: Array<{
      id: string;
      sender: 'user' | 'assistant';
      text: string;
      timestamp: string;
      stageRelated?: StageName;
      stageContent?: Record<string, unknown>;
      isApproved?: boolean;
    }>;
  };
  ui_states: Record<StageName, StageUIState>;
  updated_at?: string;
}

const LOCAL_STORAGE_PROJECTS_KEY = 'foil_local_projects';

export async function saveWorkspaceProject(project: WorkspaceProjectData): Promise<{ success: boolean; error?: string }> {
  // Always update local cache for offline/refresh resilience
  try {
    const local = loadLocalProjects();
    local[project.id] = project;
    localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(local));
  } catch {
    // LocalStorage quota or unavailable
  }

  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      // Unauthenticated user — local storage serves as session state
      return { success: true };
    }

    const payload = {
      id: project.id,
      user_id: user.id,
      name: project.name || 'Untitled Brand Project',
      description: project.description || '',
      current_stage: project.current_stage,
      context: project.context,
      ui_states: project.ui_states,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('projects')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase Workspace] Upsert failed:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[Supabase Workspace] Save exception:', msg);
    return { success: false, error: msg };
  }
}

export async function loadWorkspaceProject(projectId: string): Promise<WorkspaceProjectData | null> {
  if (isSupabaseConfigured) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (!error && data) {
          return {
            id: data.id,
            name: data.name,
            description: data.description,
            current_stage: data.current_stage,
            context: data.context,
            ui_states: data.ui_states,
            updated_at: data.updated_at,
          };
        }
      }
    } catch {
      // Fall through to local cache
    }
  }

  const local = loadLocalProjects();
  return local[projectId] || null;
}

export async function listUserProjects(): Promise<Array<{ id: string; name: string; updated_at?: string; current_stage: string }>> {
  if (isSupabaseConfigured) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, updated_at, current_stage')
          .order('updated_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          return data;
        }
      }
    } catch {
      // Fall through
    }
  }

  const local = loadLocalProjects();
  return Object.values(local).map((p) => ({
    id: p.id,
    name: p.name,
    updated_at: p.updated_at,
    current_stage: p.current_stage,
  }));
}

function loadLocalProjects(): Record<string, WorkspaceProjectData> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
