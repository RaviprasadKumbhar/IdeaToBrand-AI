/**
 * Re-export writeApprovedDecision from revisionHistory to maintain compatibility
 * with architecture.md Section 7 while using Member 3's authoritative implementation.
 */
export { writeApprovedDecision, generateId } from './revisionHistory.js';
