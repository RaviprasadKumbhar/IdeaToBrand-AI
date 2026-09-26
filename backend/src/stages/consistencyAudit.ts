import type {
  StageName,
  SharedContext,
  ApprovedDecision,
  ConsistencyFinding,
} from '@foil/shared';
import {
  writeApprovedDecision,
  REQUIRED_GENERATIVE_STAGES,
} from '@foil/shared';
import type { AIProvider } from '../ai/provider.js';
import { CriticEngine } from '../critic/index.js';

export interface AuditEligibilityResult {
  eligible: boolean;
  missingStage?: StageName;
  message?: string;
}

export class ConsistencyAuditError extends Error {
  public statusCode: number;
  public missingStage?: StageName;

  constructor(message: string, statusCode = 409, missingStage?: StageName) {
    super(message);
    this.name = 'ConsistencyAuditError';
    this.statusCode = statusCode;
    this.missingStage = missingStage;
  }
}

export class ConsistencyAuditService {
  private criticEngine: CriticEngine;

  constructor(criticEngine = new CriticEngine()) {
    this.criticEngine = criticEngine;
  }

  /**
   * Validates whether the approved context is eligible for a Holistic Consistency Audit.
   * Architecture Section 18: Triggered ONLY after approved_decisions.launch_prep exists and is approved.
   * All 7 generative stages must be approved.
   */
  validateAuditEligibility(
    approvedDecisions: Partial<Record<StageName, ApprovedDecision>>
  ): AuditEligibilityResult {
    // 1. Check all required generative stages up to launch_prep
    for (const stage of REQUIRED_GENERATIVE_STAGES) {
      const decision = approvedDecisions[stage];
      if (!decision || decision.state !== 'approved' || !decision.content) {
        return {
          eligible: false,
          missingStage: stage,
          message:
            stage === 'launch_prep'
              ? 'Holistic Consistency Audit requires approved decisions through Launch Prep. Launch Prep has not been approved.'
              : `Holistic Consistency Audit requires an approved decision for upstream stage "${stage}".`,
        };
      }
    }

    return { eligible: true };
  }

  /**
   * T-031 Holistic Consistency Audit:
   * Examines the complete approved brand system:
   * - name (naming_personality)
   * - positioning (positioning)
   * - personality & principles (naming_personality)
   * - tagline & one-line pitch (tagline_pitch)
   * - visual direction (visual_brief)
   * - voice & tone (voice_messaging)
   * - sample messages (voice_messaging)
   * - launch headline & social post (launch_prep)
   *
   * Enforces:
   * 1. 409 Gate: Throws if Launch Prep or any preceding stage is missing/unapproved.
   * 2. Single whole-system snapshot in prompt (no 3rd agent, reuses Critic).
   * 3. Validates against ConsistencyFindingsArraySchema (each finding has ID, fields_in_conflict, issue_type, evidence, why_it_matters, sharper_alternative, user_action).
   * 4. Empty array is valid when system is fully consistent.
   * 5. Does NOT silently rewrite approved decisions.
   */
  async runAudit(
    approvedDecisions: Partial<Record<StageName, ApprovedDecision>>,
    provider: AIProvider
  ): Promise<ConsistencyFinding[]> {
    const gate = this.validateAuditEligibility(approvedDecisions);
    if (!gate.eligible) {
      throw new ConsistencyAuditError(
        gate.message || 'Audit eligibility check failed.',
        409,
        gate.missingStage
      );
    }

    // Single prompt evaluating the entire approved decisions snapshot
    const findings = await this.criticEngine.auditWholeSystem(approvedDecisions, provider);

    // Ensure all findings initially have user_action: null
    return findings.map((f) => ({
      ...f,
      user_action: f.user_action ?? null,
    }));
  }

  /**
   * Resolves a consistency finding through an explicit user action ('accept' | 'reject' | 'edit').
   *
   * Rules (Architecture Section 18):
   * - 'accept': updates target field with sharper_alternative via writeApprovedDecision (cause: 'consistency_finding_accept')
   * - 'reject': no write to approved_decisions; finding is marked user_action: 'reject'
   * - 'edit': updates target field with user-edited content via writeApprovedDecision
   * - Invariant: Never mutates approved_decisions without explicit user direction.
   */
  resolveFinding(
    ctx: SharedContext,
    consistencyFindings: ConsistencyFinding[],
    findingId: string,
    action: 'accept' | 'reject' | 'edit',
    resolution?: {
      targetStage?: StageName;
      editedContent?: Record<string, unknown>;
    }
  ): {
    updatedContext: SharedContext;
    updatedFindings: ConsistencyFinding[];
  } {
    const findingIndex = consistencyFindings.findIndex((f) => f.id === findingId);
    if (findingIndex === -1) {
      throw new Error(`Consistency finding with id "${findingId}" not found.`);
    }

    const finding = consistencyFindings[findingIndex];
    let updatedContext = { ...ctx };

    if (action === 'accept') {
      const targetStage =
        resolution?.targetStage ||
        (finding.fields_in_conflict[0]?.split('.')[0] as StageName);

      if (targetStage && updatedContext.approved_decisions[targetStage]) {
        const existingContent = updatedContext.approved_decisions[targetStage]?.content || {};
        const fieldName = finding.fields_in_conflict[0]?.split('.')[1] || 'resolution';

        const existingFieldValue = existingContent[fieldName];
        const newFieldValue = Array.isArray(existingFieldValue)
          ? [finding.sharper_alternative, ...existingFieldValue.slice(1)]
          : finding.sharper_alternative;

        const updatedStageContent = {
          ...existingContent,
          [fieldName]: newFieldValue,
          audit_resolved_alternative: finding.sharper_alternative,
        };

        updatedContext = writeApprovedDecision(
          updatedContext,
          targetStage,
          updatedStageContent,
          'consistency_finding_accept',
          findingId
        );
      }
    } else if (action === 'edit') {
      const targetStage =
        resolution?.targetStage ||
        (finding.fields_in_conflict[0]?.split('.')[0] as StageName);

      if (!resolution?.editedContent) {
        throw new Error('Edit resolution requires editedContent.');
      }

      if (targetStage) {
        updatedContext = writeApprovedDecision(
          updatedContext,
          targetStage,
          resolution.editedContent,
          'consistency_finding_accept',
          findingId
        );
      }
    }

    // Mark finding with user_action
    const updatedFindings = [...consistencyFindings];
    updatedFindings[findingIndex] = {
      ...finding,
      user_action: action,
    };

    return {
      updatedContext,
      updatedFindings,
    };
  }

  /**
   * Returns all unresolved findings (user_action === null).
   * Unresolved findings will block export.
   */
  getUnresolvedFindings(findings: ConsistencyFinding[]): ConsistencyFinding[] {
    return findings.filter((f) => f.user_action === null);
  }
}
