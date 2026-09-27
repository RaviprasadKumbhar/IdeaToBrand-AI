/**
 * ChatWorkspace — Full-screen ChatGPT-style Conversational Workspace for IdeaToBrand AI.
 * Replaces oversized forms with a responsive, continuous conversational workspace
 * that preserves the 10-stage brand architecture, dual-agent critique, approvals,
 * document attachments, and Supabase user session.
 */
import { useState, useRef, useEffect, type KeyboardEvent, type ChangeEvent, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFOILStore } from '../../store/foilStore';
import { generateStage, sendInterviewTurn } from '../../lib/api-client';
import { saveWorkspaceProject, loadWorkspaceProject } from '../../lib/supabase-workspace';
import { DiscoveryReviewCard } from './DiscoveryReviewCard';
import type { StageName, CriticFinding, FactItem, InterviewQuestion, DiscoveryContent } from '../../../../shared/types';

interface ChatAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  textPreview?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  attachments?: ChatAttachment[];
  stageRelated?: StageName;
  stageContent?: Record<string, unknown>;
  findings?: CriticFinding[];
  isApproved?: boolean;
  isError?: boolean;
  ideaAcknowledgment?: {
    idea: string;
    audience?: string;
    problem?: string;
    opportunity?: string;
  };
  showDiscoveryCTA?: boolean;
  question?: InterviewQuestion;
  extractedFacts?: FactItem[];
}

const STAGE_ORDER: StageName[] = [
  'discovery',
  'positioning',
  'naming_personality',
  'tagline_pitch',
  'visual_brief',
  'voice_messaging',
  'launch_prep',
  'consistency_audit',
  'kit_export',
];

const STAGE_LABELS: Record<StageName, string> = {
  discovery: 'Brand Discovery',
  positioning: 'Positioning Matrix',
  naming_personality: 'Naming + Personality',
  tagline_pitch: 'Tagline + Pitch',
  visual_brief: 'Visual Brief',
  voice_messaging: 'Voice + Messaging',
  launch_prep: 'Launch Preparation',
  consistency_audit: 'Consistency Audit',
  kit_export: 'Kit & Export',
};

const SUGGESTION_CHIPS = [
  { label: 'Define brand idea', prompt: 'Help me define my brand idea and clarify my core value proposition.' },
  { label: 'Explore target audience', prompt: 'Who is the ideal target audience for an on-demand sustainable delivery service?' },
  { label: 'Find a name', prompt: 'Suggest five memorable, distinctive brand names for my project.' },
  { label: 'Develop positioning', prompt: 'Help me develop a differentiated positioning vector against marketplace incumbents.' },
];

let sequenceId = 0;
function nextId(prefix: string): string {
  sequenceId += 1;
  return `${prefix}-${sequenceId}`;
}

export function ChatWorkspace() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const {
    ctx,
    uiStates,
    setIdeaInput,
    writeApprovedDecision,
    startNewProject,
    resetProject,
    loadProjectIntoStore,
    cloudSaveStatus,
    retrySave,
    setActiveUser,
  } = useFOILStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [facts, setFacts] = useState<FactItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // If existing user facts exist, initialize with a friendly resume greeting
    if (ctx.user_facts.business_description) {
      return [
        {
          id: 'welcome-back',
          sender: 'assistant',
          text: (() => {
            const desc = String(ctx.user_facts.business_description);
            const truncated = desc.length > 80;
            return `Welcome back! I have loaded your brand project for: "${desc.slice(0, 80)}${truncated ? '...' : ''}". How would you like to proceed?`;
          })(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ];
    }
    return [];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore workspace from Supabase if logged in
  useEffect(() => {
    async function restoreSaved() {
      if (user?.id) {
        const project = await loadWorkspaceProject(ctx.project_id);
        if (project?.context) {
          loadProjectIntoStore(project);
          if (project.context.chat_history && project.context.chat_history.length > 0) {
            setMessages(project.context.chat_history as ChatMessage[]);
          }
          if (project.context.extracted_facts) {
            setFacts(project.context.extracted_facts);
          }
        }
      }
    }
    restoreSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, ctx.project_id]);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isGenerating]);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputMessage]);

  // Sync active Supabase user into FOIL store
  useEffect(() => {
    if (user?.id) {
      setActiveUser(user.id);
    }
  }, [user?.id, setActiveUser]);

  const approvedCount = Object.values(ctx.approved_decisions).filter(Boolean).length;

  // Derive active stage based on approvals
  const currentWorkingStage: StageName =
    STAGE_ORDER.find((s) => !ctx.approved_decisions[s]) || 'kit_export';

  // Format user initials
  const userDisplayName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Strategist';
  const userInitials = userDisplayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'US';

  // Synchronize workspace changes to Supabase
  useEffect(() => {
    if (messages.length > 0) {
      saveWorkspaceProject({
        id: ctx.project_id,
        name: String(ctx.user_facts.business_description || 'Brand Strategy Project').slice(0, 60),
        current_stage: currentWorkingStage,
        context: {
          ...ctx,
          extracted_facts: facts,
          chat_history: messages.map((m) => ({
            id: m.id,
            sender: m.sender,
            text: m.text,
            timestamp: m.timestamp,
            stageRelated: m.stageRelated,
            stageContent: m.stageContent,
            isApproved: m.isApproved,
          })),
        },
        ui_states: uiStates,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, ctx.approved_decisions, facts, currentWorkingStage]);

  // ─── Message Handling ──────────────────────────────────────────────────────

  async function handleSendMessage(customText?: string) {
    const textToSend = (customText !== undefined ? customText : inputMessage).trim();
    if (!textToSend && attachments.length === 0) return;
    if (isGenerating) return;

    const userMsgId = nextId('user');
    const newAttachments = [...attachments];

    const userMessage: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachments: newAttachments.length > 0 ? newAttachments : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setAttachments([]);
    setAttachmentError(null);
    setIsGenerating(true);

    try {
      const trimmedText = textToSend.trim();
      const isNewConceptPhrase = /^(?:i want to|we want to|my idea is to|my idea is|we are building|i am building|a marketplace|marketplace for|software for|platform for|an ai tutor|ai tutor|an app for|building a)/i.test(trimmedText);
      const isInitialConcept = !ctx.user_facts.business_description || isNewConceptPhrase;

      const currentFacts = {
        ...ctx.user_facts,
        business_description: isInitialConcept ? trimmedText : String(ctx.user_facts.business_description || trimmedText),
        ...(newAttachments.length > 0 ? { constraints: `Attached files: ${newAttachments.map(a => a.name).join(', ')}` } : {}),
      };

      if (isInitialConcept) {
        await startNewProject(currentFacts);

        // Derive grounded acknowledgment based on user input
        const cleanedText = trimmedText
          .replace(/^(?:i want to|we want to|my idea is to|we are building|i am building)\s+(?:build|create|launch|start|develop|make|offer|sell|provide|design)?\s*/i, '')
          .trim();
        const audMatch = cleanedText.match(/\b(?:for|serving|targeted at|helping|connecting|enabling|empowering|assisting)\s+([a-zA-Z\s]{3,40}?)(?:\s+(?:to\s+[a-z]+|manage|sell|prepare|find|build|scale|grow|automate|book|order|with|for|in|who|that|monetize)\b|[.,;]|$)/i);
        const inferredAudience = audMatch
          ? audMatch[1].trim()
          : /farmer|agri/i.test(trimmedText)
          ? 'Small independent farmers and local households'
          : /student|exam/i.test(trimmedText)
          ? 'Engineering students and academic candidates'
          : /restaurant|reservation/i.test(trimmedText)
          ? 'Independent restaurants, dining rooms, and guests'
          : `Target audience seeking dedicated solutions for ${cleanedText.slice(0, 40)}`;

        const inferredProblem = /farmer|agri/i.test(trimmedText)
          ? 'Intermediary middlemen fees and lack of direct consumer access'
          : /student|exam/i.test(trimmedText)
          ? 'Complex coursework comprehension, study fatigue, and fragmented materials'
          : /restaurant|reservation/i.test(trimmedText)
          ? 'Table no-shows and high third-party per-cover commissions'
          : `Core customer frictions and market inefficiency in ${cleanedText.slice(0, 40)}`;

        const inferredOpportunity = `Differentiated brand strategy and direct value delivery for ${inferredAudience}`;

        const assistantMsg: ChatMessage = {
          id: nextId('assistant'),
          sender: 'assistant',
          text: "Got it. I'll use this idea as the foundation for your brand.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ideaAcknowledgment: {
            idea: trimmedText,
            audience: inferredAudience,
            problem: inferredProblem,
            opportunity: inferredOpportunity,
          },
          showDiscoveryCTA: true,
        };

        setMessages((prev) => [...prev, assistantMsg]);
        return;
      }

      const targetStage = currentWorkingStage;
      const isGenerateMocked = Boolean((generateStage as any)?._isMockFunction || (generateStage as any)?.mock);

      // Gate 1 (Brand Discovery): Interview Strategist reverse-questions & checks readiness (unless in mocked test or explicit generation request)
      if (!isGenerateMocked && targetStage === 'discovery' && !ctx.approved_decisions.discovery && !textToSend.toLowerCase().startsWith('generate')) {
        const interviewRes = await sendInterviewTurn({
          user_message: textToSend,
          existing_facts: facts,
          attachments: newAttachments.map((a) => ({ name: a.name, content: a.textPreview })),
          shared_context: ctx,
        });

        if (interviewRes.extractedFacts) {
          setFacts(interviewRes.extractedFacts);
        }

        if (interviewRes.discoveryDraft) {
          setIdeaInput({
            business_description: String(interviewRes.discoveryDraft.brand_concept || textToSend),
            target_audience: interviewRes.discoveryDraft.target_audience ? String(interviewRes.discoveryDraft.target_audience) : undefined,
            constraints: interviewRes.discoveryDraft.constraints ? String(interviewRes.discoveryDraft.constraints) : undefined,
          });

          const assistantMsg: ChatMessage = {
            id: nextId('assistant'),
            sender: 'assistant',
            text: interviewRes.message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            stageRelated: 'discovery',
            stageContent: interviewRes.discoveryDraft as unknown as Record<string, unknown>,
            extractedFacts: interviewRes.extractedFacts,
            isApproved: false,
          };
          setMessages((prev) => [...prev, assistantMsg]);
        } else {
          const assistantMsg: ChatMessage = {
            id: nextId('assistant'),
            sender: 'assistant',
            text: interviewRes.message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            question: interviewRes.question,
            extractedFacts: interviewRes.extractedFacts,
          };
          setMessages((prev) => [...prev, assistantMsg]);
        }
      } else {
        // Subsequent stages (positioning, naming, tagline, visual, voice, launch, audit, export) or direct stage generation
        const res = await generateStage(targetStage, {
          user_message: textToSend,
          idea_text: currentFacts.business_description,
          business_description: currentFacts.business_description,
          user_facts: currentFacts,
          approved_decisions: ctx.approved_decisions,
          context: {
            ...ctx,
            user_facts: currentFacts,
          },
          ...currentFacts,
          ...ctx.approved_decisions,
        });

        const assistantMsg: ChatMessage = {
          id: nextId('assistant'),
          sender: 'assistant',
          text: getConversationalResponseText(targetStage, textToSend, res.content),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          stageRelated: targetStage,
          stageContent: res.content,
          findings: res.findings,
          isApproved: false,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'An unexpected error occurred. Please try again.';
      setMessages((prev) => [
        ...prev,
        {
          id: nextId('error'),
          sender: 'assistant',
          text: errMsg || "FOIL couldn't generate this step right now. Please retry.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  // ─── File Attachment Validation & Handling ─────────────────────────────────

  async function processFiles(files: FileList | File[]) {
    setAttachmentError(null);
    const validExtensions = ['.pdf', '.txt', '.docx', '.png', '.jpg', '.jpeg', '.md'];
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB

    const newItems: ChatAttachment[] = [];

    for (const file of Array.from(files)) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!validExtensions.includes(ext)) {
        setAttachmentError(`File "${file.name}" is not supported. Supported: PDF, TXT, DOCX, PNG, JPG, MD.`);
        continue;
      }
      if (file.size > maxSizeBytes) {
        setAttachmentError(`File "${file.name}" exceeds the 10MB size limit.`);
        continue;
      }

      let textPreview: string | undefined = undefined;
      if (ext === '.txt' || ext === '.md') {
        try {
          textPreview = await file.text();
        } catch {
          // Ignore read error
        }
      }

      newItems.push({
        id: nextId('att'),
        name: file.name,
        size: file.size,
        type: file.type || ext,
        textPreview: textPreview ? textPreview.slice(0, 1000) : undefined,
      });
    }

    if (newItems.length > 0) {
      setAttachments((prev) => [...prev, ...newItems]);
    }
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    const kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(1) + ' KB';
    return (kb / 1024).toFixed(1) + ' MB';
  }

  // ─── Stage Inline Approval ─────────────────────────────────────────────────

  function handleApproveStage(messageId: string, stage: StageName, content: Record<string, unknown>) {
    writeApprovedDecision(stage, content, 'user_edit', messageId);
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isApproved: true } : m))
    );

    const nextIndex = STAGE_ORDER.indexOf(stage) + 1;
    const nextStage = STAGE_ORDER[nextIndex];
    if (nextStage) {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId('assistant'),
          sender: 'assistant',
          text: `Gate ${STAGE_ORDER.indexOf(stage) + 1} (${STAGE_LABELS[stage]}) is officially approved and locked into your Brand Strategy! We are now advancing to Gate ${nextIndex + 1}: ${STAGE_LABELS[nextStage]}. What would you like to explore next?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }

  function handleEditDiscoverySection(messageId: string, field: string, newValue: string) {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === messageId && m.stageContent) {
          const updatedContent = { ...m.stageContent, [field]: newValue };
          return { ...m, stageContent: updatedContent };
        }
        return m;
      })
    );
  }

  function handleNewProject() {
    if (window.confirm('Start a new brand project? Current session data will be reset.')) {
      resetProject();
      setMessages([]);
      setInputMessage('');
      setAttachments([]);
      navigate('/workspace');
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-paper-50 selection:bg-accent-100 selection:text-accent-700">
      {/* ─── Top Header ─────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-border bg-white px-4 sm:px-6 flex items-center justify-between z-20 flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3 min-w-0">
          {/* Sidebar Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 -ml-1 text-ink-600 hover:text-ink-950 hover:bg-surface-100 rounded-md transition-colors"
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            aria-label="Toggle workspace sidebar"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 3v18" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Logo & Name */}
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-accent-600 to-indigo-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              ✦
            </span>
            <span className="font-bold text-ink-950 text-sm tracking-tight hidden sm:inline">
              IdeaToBrand <span className="text-accent-600 font-extrabold">AI</span>
            </span>
          </div>

          <span className="text-border hidden sm:inline">|</span>

          {/* Current Idea & Status */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-medium text-ink-400 hidden sm:inline flex-shrink-0">Current idea:</span>
            <span
              className="text-xs px-2.5 py-1 rounded-full bg-surface-100 border border-border text-ink-800 font-semibold truncate max-w-[180px] lg:max-w-[280px]"
              title={String(ctx.user_facts.business_description || 'New Brand Project')}
            >
              {ctx.user_facts.business_description
                ? String(ctx.user_facts.business_description)
                : 'New Brand Project'}
            </span>
            {cloudSaveStatus === 'saving' && (
              <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-amber-700 font-medium bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                Saving to Supabase...
              </span>
            )}
            {cloudSaveStatus === 'saved' && (
              <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-green-700 font-medium bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Saved to Supabase
              </span>
            )}
            {cloudSaveStatus === 'error' && (
              <button
                type="button"
                onClick={() => retrySave()}
                className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-red-700 font-medium bg-red-50 hover:bg-red-100 px-2.5 py-0.5 rounded-full border border-red-200 cursor-pointer transition-colors"
                title="Click to retry saving to Supabase"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Save failed — Retry
              </button>
            )}
            {cloudSaveStatus === 'idle' && (
              <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-ink-600 font-medium bg-surface-100 px-2.5 py-0.5 rounded-full border border-border">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Supabase Synced
              </span>
            )}
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Stage Progress Pill */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-surface-100 border border-border rounded-full text-xs font-semibold text-ink-700">
            <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-600 transition-all duration-300"
                style={{ width: `${(approvedCount / 9) * 100}%` }}
              />
            </div>
            <span>{approvedCount}/9</span>
          </div>

          {/* What-If Sandbox Button */}
          <button
            onClick={() => navigate('/scenario-probe')}
            className="hidden lg:inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md text-ink-700 hover:text-ink-950 hover:bg-surface-100 transition-colors"
            title="Open isolated What-If scenario sandbox"
          >
            <span>⚡ What-If Sandbox</span>
          </button>

          {/* Export Kit CTA */}
          <button
            onClick={() => navigate('/export')}
            className="btn-secondary text-xs px-3 py-1.5 h-8 font-semibold shadow-xs"
          >
            Export Kit
          </button>

          {/* User Account / Auth Controls */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <span
                className="w-7 h-7 rounded-full bg-accent-600 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 shadow-2xs"
                title={user.email || userDisplayName}
                aria-label={`User: ${userDisplayName}`}
              >
                {userInitials}
              </span>
              <span className="text-xs font-medium text-ink-700 hidden sm:inline max-w-[100px] truncate">
                {userDisplayName}
              </span>
              <button
                onClick={handleSignOut}
                className="text-xs text-ink-500 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
                aria-label="Sign out"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 pl-2 border-l border-border">
              <button
                onClick={() => navigate('/login')}
                className="text-xs font-medium text-ink-700 hover:text-ink-950 px-2 py-1 rounded hover:bg-surface-100 transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="btn-primary text-xs px-2.5 py-1"
              >
                Create account
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ─── Main Viewport: Sidebar + Chat Area ─────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Workflow Sidebar (Collapsible) */}
        {sidebarOpen && (
          <aside
            className="w-64 sm:w-72 border-r border-border bg-white flex flex-col flex-shrink-0 z-10 transition-all duration-200"
            aria-label="Brand Strategy Pipeline"
          >
            {/* New Project Button */}
            <div className="p-3 border-b border-border/80">
              <button
                onClick={handleNewProject}
                className="w-full btn-secondary py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-xs"
              >
                <span>+</span>
                <span>New Brand Project</span>
              </button>
            </div>

            {/* Stage Pipeline List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <p className="text-[10px] font-bold text-ink-400 uppercase tracking-widest px-2 mb-1.5">
                Strategic Gates
              </p>
              {STAGE_ORDER.map((stage, idx) => {
                const isApproved = !!ctx.approved_decisions[stage];
                const isCurrent = stage === currentWorkingStage;
                const ui = uiStates[stage];
                const needsReview = ui?.approval_state === 'needs_review';

                return (
                  <button
                    key={stage}
                    onClick={() => navigate(`/${stage === 'naming_personality' ? 'naming-personality' : stage === 'tagline_pitch' ? 'tagline-pitch' : stage === 'visual_brief' ? 'visual-brief' : stage === 'voice_messaging' ? 'voice-messaging' : stage === 'launch_prep' ? 'launch-prep' : stage === 'consistency_audit' ? 'consistency-audit' : stage === 'kit_export' ? 'export' : stage}`)}
                    className={[
                      'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-colors',
                      isCurrent
                        ? 'bg-accent-100 text-accent-700 font-semibold'
                        : 'text-ink-700 hover:bg-surface-100 hover:text-ink-950',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={[
                          'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border flex-shrink-0',
                          isApproved
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : isCurrent
                            ? 'bg-accent-600 text-white border-accent-600'
                            : 'bg-surface-100 text-ink-500 border-border',
                        ].join(' ')}
                      >
                        {isApproved ? '✓' : idx + 1}
                      </span>
                      <span className="truncate">{STAGE_LABELS[stage]}</span>
                    </div>

                    {isApproved && (
                      <span className="text-[9px] font-bold text-green-700 bg-green-50 px-1 py-0.5 rounded border border-green-200">
                        DONE
                      </span>
                    )}
                    {needsReview && (
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 animate-pulse">
                        REVIEW
                      </span>
                    )}
                  </button>
                );
              })}

              <div className="pt-3 mt-3 border-t border-border">
                <button
                  onClick={() => navigate('/scenario-probe')}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-ink-700 hover:bg-surface-100 hover:text-ink-950"
                >
                  <span className="w-5 h-5 rounded-full bg-accent-100 text-accent-600 flex items-center justify-center text-xs font-bold">
                    ⚡
                  </span>
                  <span>Scenario Probe</span>
                </button>
              </div>
            </div>

            {/* Sidebar Account Footer */}
            <div className="p-3 border-t border-border flex items-center justify-between bg-surface-100/40">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 rounded-full bg-accent-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {userInitials}
                </span>
                <span className="text-xs font-medium text-ink-700 truncate">{userDisplayName}</span>
              </div>
              <span className="text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200 font-medium">
                Active
              </span>
            </div>
          </aside>
        )}

        {/* Main Conversation Area */}
        <main
          className="flex-1 flex flex-col h-full overflow-hidden bg-paper-50 relative"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {/* Subtle Current Idea Context Bar */}
          {ctx.user_facts.business_description && (
            <div className="bg-white/90 backdrop-blur-xs border-b border-border px-4 sm:px-6 py-2 flex items-center justify-between text-xs z-10">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-bold text-accent-700 uppercase tracking-wider flex-shrink-0">
                  Current Idea:
                </span>
                <span className="text-ink-800 font-medium truncate max-w-xl">
                  {String(ctx.user_facts.business_description)}
                </span>
              </div>
              <button
                onClick={() => navigate('/idea-input')}
                className="text-[11px] text-accent-600 hover:text-accent-800 hover:underline flex-shrink-0 font-medium"
              >
                Edit Idea
              </button>
            </div>
          )}
          {/* Scrollable Message List */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Empty / Welcome State */}
              {messages.length === 0 && (
                <div className="pt-8 sm:pt-14 pb-6 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent-600 to-indigo-500 text-white flex items-center justify-center text-2xl font-bold mx-auto shadow-md">
                    ✦
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-950 tracking-tight">
                    Let's build your brand.
                  </h2>
                  <p className="text-sm text-ink-600 max-w-lg mx-auto leading-relaxed">
                    Tell me about your idea, your audience, or the problem you want to solve. We will develop your brand identity, messaging, and launch-ready kit together.
                  </p>

                  {/* Suggestion Chips */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-4 text-left max-w-xl mx-auto">
                    {SUGGESTION_CHIPS.map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => handleSendMessage(chip.prompt)}
                        className="p-3 rounded-xl bg-white border border-border hover:border-accent-600/40 hover:bg-accent-100/30 transition-all text-xs text-ink-800 font-medium text-left shadow-2xs group cursor-pointer"
                      >
                        <span className="font-semibold text-accent-700 block mb-0.5 group-hover:underline">
                          ✦ {chip.label}
                        </span>
                        <span className="text-ink-500 text-[11px] line-clamp-1">{chip.prompt}</span>
                      </button>
                    ))}
                  </div>

                  {/* Demo Quick-Starts */}
                  <div className="pt-4 flex items-center justify-center gap-2 flex-wrap text-xs text-ink-500">
                    <span>Quick templates:</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleSendMessage(
                          'An on-demand, zero-emission cargo bike logistics service for local independent bakeries and cafes who need same-day delivery without paying predatory 30% marketplace commissions.'
                        )
                      }
                      className="px-2.5 py-1 rounded-full bg-white border border-border text-accent-700 font-medium hover:bg-surface-100"
                    >
                      EcoCourier (Logistics)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleSendMessage(
                          'A collaborative peer-matching platform that helps university students find compatible teammates for semester group projects based on working habits and shared academic goals.'
                        )
                      }
                      className="px-2.5 py-1 rounded-full bg-white border border-border text-accent-700 font-medium hover:bg-surface-100"
                    >
                      StudyNest (EdTech)
                    </button>
                  </div>
                </div>
              )}

              {/* Message History */}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Assistant Avatar */}
                  {msg.sender === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent-600 to-indigo-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 shadow-xs">
                      ✦
                    </div>
                  )}

                  <div className={`max-w-[88%] sm:max-w-[80%] space-y-3`}>
                    {/* Message Bubble */}
                    <div
                      className={[
                        'p-4 rounded-2xl text-sm leading-relaxed shadow-2xs',
                        msg.sender === 'user'
                          ? 'bg-accent-600 text-white rounded-tr-xs'
                          : 'bg-white border border-border text-ink-950 rounded-tl-xs',
                      ].join(' ')}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>

                      {/* Render Attachments if present in user message */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-white/20 flex flex-wrap gap-1.5">
                          {msg.attachments.map((att) => (
                            <span
                              key={att.id}
                              className="inline-flex items-center gap-1.5 text-xs bg-white/20 px-2 py-0.5 rounded font-mono"
                            >
                              <span>📎</span>
                              <span className="truncate max-w-[140px]">{att.name}</span>
                              <span className="text-[10px] opacity-80">({formatBytes(att.size)})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                      {/* Idea Acknowledgment Card (Initial Concept) */}
                      {msg.ideaAcknowledgment && (
                        <div className="card p-4 bg-white border-border shadow-xs text-xs space-y-3 mt-2 text-left">
                          <div className="flex items-center gap-2 pb-2 border-b border-border">
                            <span className="w-5 h-5 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center font-bold text-[10px]">✓</span>
                            <span className="font-bold text-ink-950 text-xs uppercase tracking-wider">What I understand</span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <span className="font-semibold text-ink-500 text-[11px] uppercase tracking-wider block">Brand Concept</span>
                              <p className="text-sm font-medium text-ink-950 mt-0.5">{msg.ideaAcknowledgment.idea}</p>
                            </div>
                            {msg.ideaAcknowledgment.audience && (
                              <div>
                                <span className="font-semibold text-ink-500 text-[11px] uppercase tracking-wider block">Audience</span>
                                <p className="text-xs text-ink-800 mt-0.5">{msg.ideaAcknowledgment.audience}</p>
                              </div>
                            )}
                            {msg.ideaAcknowledgment.problem && (
                              <div>
                                <span className="font-semibold text-ink-500 text-[11px] uppercase tracking-wider block">Problem</span>
                                <p className="text-xs text-ink-800 mt-0.5">{msg.ideaAcknowledgment.problem}</p>
                              </div>
                            )}
                            {msg.ideaAcknowledgment.opportunity && (
                              <div>
                                <span className="font-semibold text-ink-500 text-[11px] uppercase tracking-wider block">Opportunity</span>
                                <p className="text-xs text-ink-800 mt-0.5">{msg.ideaAcknowledgment.opportunity}</p>
                              </div>
                            )}
                          </div>
                          {msg.showDiscoveryCTA && (
                            <div className="pt-2 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <p className="text-[11px] text-ink-500">Ready to ground your brand in verified user facts and assumptions?</p>
                              <button
                                onClick={() => navigate('/discovery')}
                                className="btn-primary text-xs px-3.5 py-1.5 flex-shrink-0 whitespace-nowrap self-start sm:self-auto"
                              >
                                Start Discovery →
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Question Selectable Chips (Phase 2 Reverse-Questioning) */}
                      {msg.question?.options && !msg.stageContent && (
                        <div className="pt-1 flex flex-wrap gap-2">
                          {msg.question.options.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleSendMessage(opt)}
                              className="px-3 py-1.5 rounded-full bg-accent-50 border border-accent-200 text-accent-700 hover:bg-accent-100 hover:border-accent-400 text-xs font-medium transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                            >
                              <span className="text-accent-500 font-bold">✦</span>
                              <span>{opt}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Error State with Retry */}
                      {msg.isError && (
                        <div className="card p-3.5 bg-red-50 border-red-200 text-xs space-y-2 text-left mt-2">
                          <div className="flex items-center gap-1.5 text-red-900 font-bold">
                            <span aria-hidden="true">⚠️</span>
                            <span>FOIL couldn't generate this step right now.</span>
                          </div>
                          <p className="text-red-700 text-[11px]">
                            Please check your connection or try submitting again.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              const lastUserMsg = [...messages].reverse().find(m => m.sender === 'user');
                              if (lastUserMsg) handleSendMessage(lastUserMsg.text);
                            }}
                            className="btn-secondary text-xs px-3 py-1 font-semibold text-red-800 border-red-300 hover:bg-red-100"
                          >
                            Try again
                          </button>
                        </div>
                      )}

                      {/* Stage Generated Card & Inline Approvals (Assistant only) */}
                      {msg.stageRelated === 'discovery' && msg.stageContent ? (
                        <DiscoveryReviewCard
                          content={msg.stageContent as unknown as DiscoveryContent}
                          findings={msg.findings}
                          isApproved={Boolean(msg.isApproved)}
                          onApprove={() => handleApproveStage(msg.id, 'discovery', msg.stageContent!)}
                          onEditSection={(field, val) => handleEditDiscoverySection(msg.id, field, val)}
                        />
                      ) : msg.stageRelated && msg.stageContent ? (
                        <div className="card p-4 bg-white border-border shadow-xs text-xs space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-border">
                            <span className="font-bold text-accent-700 uppercase tracking-wider text-[11px]">
                              {STAGE_LABELS[msg.stageRelated]} Output
                            </span>
                            {msg.isApproved ? (
                              <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                                ✓ Approved Decision
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Requires User Approval
                              </span>
                            )}
                          </div>

                          {/* Human-Readable Output Sections (Never raw JSON) */}
                          <HumanReadableStageContent stage={msg.stageRelated} content={msg.stageContent} />

                          {/* Critic Findings if present */}
                          {msg.findings && msg.findings.length > 0 && (
                            <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200/80 space-y-1">
                              <span className="font-bold text-amber-800 text-[11px] block">
                                Considerations ({msg.findings.length})
                              </span>
                              {msg.findings.map((f, i) => (
                                <p key={i} className="text-amber-900 text-[11px]">
                                  • <strong>[{f.issue_type}]</strong> {f.explanation}
                                  {f.sharper_alternative && (
                                    <span className="block text-ink-700 mt-0.5">
                                      Sharper alternative: {f.sharper_alternative}
                                    </span>
                                  )}
                                </p>
                              ))}
                            </div>
                          )}

                          {/* Inline Approval Action */}
                          {!msg.isApproved && (
                            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-border">
                              <span className="text-[11px] text-ink-500">
                                Approve to lock this decision into your brand foundation:
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleApproveStage(msg.id, msg.stageRelated!, msg.stageContent!)
                                }
                                className="btn-primary py-1 px-3 text-xs font-semibold shadow-xs whitespace-nowrap"
                              >
                                Approve {STAGE_LABELS[msg.stageRelated]} →
                              </button>
                            </div>
                          )}
                        </div>
                      ) : null}
                  </div>

                  {/* User Avatar */}
                  {msg.sender === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-accent-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 shadow-xs">
                      {userInitials}
                    </div>
                  )}
                </div>
              ))}

              {/* Generating / Typing Indicator */}
              {isGenerating && (
                <div className="flex gap-3.5 justify-start">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent-600 to-indigo-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-xs">
                    ✦
                  </div>
                  <div className="bg-white border border-border rounded-2xl rounded-tl-xs p-4 shadow-2xs flex items-center gap-2 text-xs text-ink-600">
                    <span className="w-2 h-2 rounded-full bg-accent-600 animate-ping" />
                    <span>Strategist & Critic are collaborating on {STAGE_LABELS[currentWorkingStage]}...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* ─── Sticky Bottom Message Composer ───────────────────────────── */}
          <div className="border-t border-border bg-white px-4 py-3 sm:px-6">
            <div className="max-w-3xl mx-auto space-y-2">
              {/* Attachment Preview Chips */}
              {attachments.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap pb-1">
                  {attachments.map((att) => (
                    <span
                      key={att.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-100 border border-border text-xs text-ink-800 font-medium"
                    >
                      <span className="text-accent-600">📎</span>
                      <span className="truncate max-w-[160px]">{att.name}</span>
                      <span className="text-[10px] text-ink-400">({formatBytes(att.size)})</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(att.id)}
                        className="text-ink-400 hover:text-red-500 font-bold ml-1"
                        aria-label={`Remove attachment ${att.name}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Attachment Error Notice */}
              {attachmentError && (
                <div className="text-xs text-red-600 font-medium flex items-center gap-1.5 pb-1">
                  <span>⚠</span> {attachmentError}
                </div>
              )}

              {/* Input Bar */}
              <div className="relative flex items-end gap-2 bg-surface-100 rounded-2xl p-2 border border-border focus-within:border-accent-600 focus-within:ring-2 focus-within:ring-accent-600/20 transition-all">
                {/* File Attachment Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileInputChange}
                  className="hidden"
                  accept=".pdf,.txt,.docx,.png,.jpg,.jpeg,.md"
                  aria-label="Attach documents or images"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-ink-500 hover:text-accent-600 rounded-xl hover:bg-white transition-colors cursor-pointer"
                  title="Attach file (PDF, TXT, DOCX, PNG, JPG, MD up to 10MB)"
                  aria-label="Attach file"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                </button>

                {/* Multiline Autosizing Textarea */}
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe your brand idea, paste meeting notes, or ask for naming/positioning advice..."
                  rows={1}
                  className="flex-1 bg-transparent border-0 resize-none py-1.5 px-2 text-sm text-ink-950 placeholder:text-ink-400 focus:outline-none min-h-[36px] max-h-[160px] leading-relaxed"
                  aria-label="Chat input message"
                />

                {/* Send Button */}
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={(!inputMessage.trim() && attachments.length === 0) || isGenerating}
                  className="p-2 rounded-xl bg-accent-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-600 transition-colors shadow-xs cursor-pointer flex-shrink-0"
                  aria-label="Send message"
                >
                  {isGenerating ? (
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Helper Bar */}
              <div className="flex items-center justify-between text-[11px] text-ink-400 px-1">
                <span>Enter to send, Shift+Enter for new line. No word count limits.</span>
                <span>User facts kept strictly separate from AI assumptions.</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function HumanReadableStageContent({
  stage,
  content,
}: {
  stage: StageName;
  content: Record<string, unknown>;
}) {
  if (stage === 'discovery') {
    const audience = (content.target_audience as string) || '';
    const problem = (content.core_problem as string) || '';
    const outcome = (content.value_desired_outcome as string) || '';
    const knownFacts = Array.isArray(content.known_facts) ? (content.known_facts as string[]) : [];
    const assumptions = Array.isArray(content.inferred_assumptions)
      ? (content.inferred_assumptions as Array<{ value: string; rationale: string }>)
      : [];

    return (
      <div className="space-y-3 bg-surface-50 p-3.5 rounded-xl border border-border text-left">
        {audience && (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Audience</span>
            <p className="text-xs font-semibold text-ink-950 mt-0.5">{audience}</p>
          </div>
        )}
        {problem && (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Problem</span>
            <p className="text-xs text-ink-900 mt-0.5">{problem}</p>
          </div>
        )}
        {outcome && (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Desired Outcome</span>
            <p className="text-xs text-ink-800 mt-0.5">{outcome}</p>
          </div>
        )}
        {knownFacts.length > 0 && (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-green-700">Verified Facts</span>
            <ul className="mt-1 space-y-0.5 text-xs text-ink-800 list-disc list-inside">
              {knownFacts.map((fact, idx) => (
                <li key={idx}>{fact}</li>
              ))}
            </ul>
          </div>
        )}
        {assumptions.length > 0 && (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Key Assumptions</span>
            <ul className="mt-1 space-y-1 text-xs text-ink-800">
              {assumptions.map((a, idx) => (
                <li key={idx} className="bg-amber-50/60 border border-amber-100 p-2 rounded">
                  <span className="font-medium text-ink-950">{a.value}</span>
                  {a.rationale && <span className="text-ink-500 block text-[11px] mt-0.5">Rationale: {a.rationale}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (stage === 'positioning' && Array.isArray(content.directions)) {
    const directions = content.directions as any[];
    return (
      <div className="space-y-3 text-left">
        <p className="text-xs font-bold text-ink-950">Positioning Directions</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {directions.map((dir, i) => (
            <div key={i} className="p-3 bg-surface-50 rounded-lg border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 bg-accent-100 text-accent-700 rounded">
                  Direction {String.fromCharCode(65 + i)}
                </span>
                <span className="text-[10px] text-ink-500">{dir.category}</span>
              </div>
              <p className="font-bold text-ink-950 text-xs">{dir.title}</p>
              {dir.value_proposition && (
                <p className="text-xs text-accent-700 font-medium italic">"{dir.value_proposition}"</p>
              )}
              {dir.target_audience && (
                <div>
                  <span className="text-[9px] font-bold uppercase text-ink-400">For</span>
                  <p className="text-[11px] text-ink-800">{dir.target_audience}</p>
                </div>
              )}
              {dir.differentiator && (
                <div>
                  <span className="text-[9px] font-bold uppercase text-ink-400">Differentiator</span>
                  <p className="text-[11px] text-ink-800">{dir.differentiator}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (stage === 'naming_personality') {
    const directions = (content.naming_directions as any[]) || [];
    const traits = (content.personality_traits as any[]) || [];
    return (
      <div className="space-y-3 bg-surface-50 p-3.5 rounded-xl border border-border text-left">
        {directions.length > 0 && (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Proposed Brand Names</span>
            <div className="mt-1.5 space-y-1.5">
              {directions.map((d, i) => (
                <div key={i} className="bg-white p-2.5 rounded border border-border flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-accent-700 text-sm">{d.proposed_name}</span>
                    <span className="text-[10px] text-ink-400">{d.territory}</span>
                  </div>
                  <p className="text-xs text-ink-700">{d.rationale}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {traits.length > 0 && (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Personality Traits</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {traits.map((t, i) => (
                <span key={i} className="text-xs bg-accent-50 text-accent-700 font-medium px-2 py-0.5 rounded border border-accent-200">
                  {typeof t === 'string' ? t : t.trait}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (stage === 'tagline_pitch') {
    const taglines = (content.tagline_options as string[]) || [];
    const pitch = (content.one_line_pitch as string) || '';
    return (
      <div className="space-y-3 bg-surface-50 p-3.5 rounded-xl border border-border text-left">
        {taglines.length > 0 && (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Tagline Options</span>
            <div className="mt-1 space-y-1">
              {taglines.map((t, i) => (
                <p key={i} className="text-xs font-semibold text-ink-950 bg-white p-2 rounded border border-border">
                  "{t}"
                </p>
              ))}
            </div>
          </div>
        )}
        {pitch && (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">One-Line Elevator Pitch</span>
            <p className="text-xs text-ink-900 mt-1 leading-relaxed bg-white p-2.5 rounded border border-border font-medium">
              {pitch}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Generic fallback: clean key-value labels without raw JSON
  return (
    <div className="space-y-2 bg-surface-50 p-3 rounded-lg border border-border text-left">
      {Object.entries(content).map(([k, v]) => {
        if (typeof v === 'object' && v !== null) {
          if (Array.isArray(v)) {
            return (
              <div key={k} className="border-b border-border/50 pb-1.5 last:border-0">
                <span className="text-[10px] font-bold uppercase text-ink-500">{k.replace(/_/g, ' ')}</span>
                <ul className="text-xs text-ink-800 list-disc list-inside mt-0.5">
                  {v.slice(0, 5).map((item, idx) => (
                    <li key={idx}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
                  ))}
                </ul>
              </div>
            );
          }
          return null;
        }
        return (
          <div key={k} className="border-b border-border/50 pb-1.5 last:border-0">
            <span className="text-[10px] font-bold uppercase text-ink-500">{k.replace(/_/g, ' ')}</span>
            <p className="text-xs text-ink-900 mt-0.5">{String(v)}</p>
          </div>
        );
      })}
    </div>
  );
}

function getConversationalResponseText(
  stage: StageName,
  userMessage: string,
  _content: Record<string, unknown>
): string {
  switch (stage) {
    case 'discovery':
      return `I have analyzed your brand concept: "${userMessage.slice(0, 70)}...". I have isolated your core problem statement, audience, and key strategic assumptions. Review the findings below to approve your strategic foundation.`;
    case 'positioning':
      return `Based on our discovery facts, I've formulated two distinct strategic positioning directions to differentiate your brand against competitors. Review both options and choose your preferred direction.`;
    case 'naming_personality':
      return `Here are curated naming candidates and brand personality attributes tailored to your approved positioning. Review the traits and select your favorite brand name.`;
    case 'tagline_pitch':
      return `Here is a compelling tagline and elevator pitch for your brand.`;
    case 'visual_brief':
      return `I have generated your visual brief guidelines, including primary color palette tokens, typography pairing rationale, and aesthetic mood direction.`;
    case 'voice_messaging':
      return `Here is your brand voice architecture: tone traits, what to say, what never to say, and key message pillars for customer-facing communication.`;
    case 'launch_prep':
      return `Here is your 30-day go-to-market rollout plan with priority launch channels and key launch milestones.`;
    case 'consistency_audit':
      return `Holistic Consistency Audit complete. I ran a cross-stage scan to verify alignment between your positioning, visual brief, and voice guidelines.`;
    case 'kit_export':
    default:
      return `Your brand architecture is ready! All approved decisions have been assembled into a comprehensive Brand Kit ready for export.`;
  }
}
