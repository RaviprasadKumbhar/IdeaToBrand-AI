import { Request, Response, Router } from 'express';
import { getAIProvider } from '../ai/factory.js';
import { BrandPlanPipelineService } from '../stages/brandPlan.js';
import { optionalAuth, requireAuth, getSupabaseForUser, type AuthenticatedRequest } from '../middleware/auth.js';

export const brandPlanRouter = Router();
const pipelineService = new BrandPlanPipelineService();

async function handleBrandPlanGeneration(req: AuthenticatedRequest, res: Response) {
  const payload = req.body || {};
  const rawIdea =
    payload.idea ||
    payload.business_description ||
    payload.idea_text ||
    payload.concept ||
    (payload.user_facts && typeof payload.user_facts === 'object'
      ? payload.user_facts.business_description
      : '');

  if (!rawIdea || typeof rawIdea !== 'string' || !rawIdea.trim()) {
    return res.status(400).json({
      error_type: 'invalid_input',
      message: 'Missing required startup idea or business description. Please provide a clear concept to generate your brand plan.',
    });
  }

  const rawFacts = Array.isArray(payload.user_facts)
    ? payload.user_facts
    : Array.isArray(payload.known_facts)
    ? payload.known_facts
    : [];

  const constraints = Array.isArray(payload.constraints) ? payload.constraints : [];

  try {
    const provider = getAIProvider();
    const result = await pipelineService.generateCompleteBrandPlan(
      {
        idea: rawIdea.trim(),
        business_description: rawIdea.trim(),
        user_facts: rawFacts,
        constraints,
        project_name: payload.project_name || payload.name,
      },
      provider
    );

    // If caller is authenticated or requested persistence, save directly to Supabase
    let supabaseSaved = false;
    const targetUserId = req.userId || payload.user_id;

    if (targetUserId && process.env.NODE_ENV !== 'test') {
      try {
        const projectName =
          payload.project_name ||
          result.brand_plan.name_suggestions[0]?.name ||
          'Untitled Brand';

        const projectPayload = {
          id: result.project_id,
          user_id: targetUserId,
          name: projectName,
          description: rawIdea.trim().slice(0, 300),
          current_stage: 'launch_prep',
          context: {
            project_id: result.project_id,
            user_facts: { business_description: rawIdea.trim() },
            ai_assumptions: {},
            approved_decisions: result.approved_decisions,
            stage_drafts: {},
            critic_findings: [],
            consistency_findings: [],
            scenario_overrides: [],
            revision_log: [],
          },
          ui_states: {
            discovery: { status: 'approved', lastSaved: new Date().toISOString() },
            positioning: { status: 'approved', lastSaved: new Date().toISOString() },
            naming_personality: { status: 'approved', lastSaved: new Date().toISOString() },
            tagline_pitch: { status: 'approved', lastSaved: new Date().toISOString() },
            visual_brief: { status: 'approved', lastSaved: new Date().toISOString() },
            voice_messaging: { status: 'approved', lastSaved: new Date().toISOString() },
            launch_prep: { status: 'approved', lastSaved: new Date().toISOString() },
            consistency_audit: { status: 'approved', lastSaved: new Date().toISOString() },
            kit_export: { status: 'ready', lastSaved: new Date().toISOString() },
          },
          updated_at: new Date().toISOString(),
        };

        const authHeader = req.headers.authorization;
        const token =
          authHeader && authHeader.startsWith('Bearer ')
            ? authHeader.slice(7).trim()
            : undefined;

        const dbClient = getSupabaseForUser(token);
        const { error: dbError } = await dbClient
          .from('projects')
          .upsert(projectPayload, { onConflict: 'id' });

        if (!dbError) {
          supabaseSaved = true;
        } else {
          console.warn('[BrandPlan API] Supabase upsert error:', dbError.message);
        }
      } catch (dbEx) {
        console.warn('[BrandPlan API] Supabase persistence exception:', dbEx);
      }
    }

    return res.status(200).json({
      status: 'success',
      project_id: result.project_id,
      brand_plan: result.brand_plan,
      approved_decisions: result.approved_decisions,
      markdown_plan: result.markdown_plan,
      supabase_saved: supabaseSaved,
    });
  } catch (err: any) {
    const status = err.message && err.message.includes('exceeds 500 words') ? 400 : 500;
    return res.status(status).json({
      error_type: err.error_type || 'generation_failed',
      message: err.message || 'Brand plan generation failed. Please try again.',
      retryable: status === 500,
    });
  }
}

// Support all standard endpoint aliases
brandPlanRouter.post('/brand-plan', optionalAuth, handleBrandPlanGeneration);
brandPlanRouter.post('/brand-plan/generate', optionalAuth, handleBrandPlanGeneration);
brandPlanRouter.post('/generate-brand', optionalAuth, handleBrandPlanGeneration);

/**
 * GET /api/projects
 * Lists all projects owned by the authenticated user from Supabase.
 */
brandPlanRouter.get('/projects', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : undefined;
  const dbClient = getSupabaseForUser(token);

  try {
    const { data, error } = await dbClient
      .from('projects')
      .select('id, name, description, current_stage, created_at, updated_at')
      .eq('user_id', req.userId!)
      .order('updated_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error_type: 'database_error', message: error.message });
    }

    return res.status(200).json({ projects: data || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error_type: 'database_error', message: msg });
  }
});

/**
 * GET /api/projects/:id
 * Retrieves a single project owned by the authenticated user from Supabase.
 */
brandPlanRouter.get('/projects/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : undefined;
  const dbClient = getSupabaseForUser(token);

  try {
    const { data, error } = await dbClient
      .from('projects')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();

    if (error || !data) {
      return res.status(404).json({ error_type: 'not_found', message: 'Project not found.' });
    }

    return res.status(200).json({ project: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error_type: 'database_error', message: msg });
  }
});

/**
 * DELETE /api/projects/:id
 * Deletes a project owned by the authenticated user from Supabase.
 */
brandPlanRouter.delete('/projects/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : undefined;
  const dbClient = getSupabaseForUser(token);

  try {
    const { error } = await dbClient
      .from('projects')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId!);

    if (error) {
      return res.status(500).json({ error_type: 'database_error', message: error.message });
    }

    return res.status(200).json({ success: true, message: 'Project deleted successfully.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error_type: 'database_error', message: msg });
  }
});
