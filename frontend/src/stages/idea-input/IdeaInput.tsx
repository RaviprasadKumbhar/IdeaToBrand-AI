/**
 * IdeaInput — Clean Project Creation Canvas for IdeaToBrand AI.
 * Redesigned for founders, students, and business owners.
 * No arbitrary 500-word limit. Supports drag-and-drop document attachments.
 */
import { useState, useRef, type FormEvent, type ChangeEvent, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFOILStore } from '../../store/foilStore';
import type { IdeaInput as IdeaInputType } from '../../../../shared/types';

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  textPreview?: string;
}

const SAMPLE_TEMPLATES = [
  {
    label: 'EcoCourier',
    category: 'Logistics',
    desc: 'An on-demand, zero-emission cargo bike logistics service for local independent merchants, cafes, and bakeries in dense urban neighborhoods who need same-day delivery without paying predatory marketplace commissions.',
    audience: 'Urban independent merchants, artisan bakeries, boutique retail, and local shoppers.',
    industry: 'Sustainable Urban Logistics & Last-Mile Delivery',
    constraints: 'Zero-emission cargo bikes only, same-day delivery within 5-mile radius, merchant-first pricing.',
  },
  {
    label: 'StudyNest',
    category: 'EdTech',
    desc: 'A collaborative peer-matching platform that helps university students find compatible teammates for semester group projects based on working habits, schedule compatibility, and shared academic goals.',
    audience: 'Undergraduate and graduate university students aged 18–26.',
    industry: 'EdTech & Student Collaboration',
    constraints: 'Must integrate with university SSO; completely free for student organizations.',
  },
];

export function IdeaInput() {
  const navigate = useNavigate();
  const { setIdeaInput, ideaInput } = useFOILStore();

  const [description, setDescription] = useState(ideaInput?.business_description ?? '');
  const [audience, setAudience] = useState(ideaInput?.target_audience ?? '');
  const [category, setCategory] = useState(ideaInput?.category ?? '');
  const [constraints, setConstraints] = useState(ideaInput?.constraints ?? '');
  const [showDetails, setShowDetails] = useState(
    Boolean(ideaInput?.target_audience || ideaInput?.category || ideaInput?.constraints)
  );

  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    const kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(1) + ' KB';
    return (kb / 1024).toFixed(1) + ' MB';
  }

  function handleApplyTemplate(tmpl: typeof SAMPLE_TEMPLATES[0]) {
    if (description.trim() && description.trim() !== tmpl.desc) {
      if (!window.confirm('Replace your current description with this example?')) {
        return;
      }
    }
    setDescription(tmpl.desc);
    setAudience(tmpl.audience);
    setCategory(tmpl.industry);
    setConstraints(tmpl.constraints);
    setShowDetails(true);
    setError(null);
  }

  async function processFiles(incoming: FileList | File[]) {
    setFileError(null);
    const validExtensions = ['.pdf', '.txt', '.docx', '.png', '.jpg', '.jpeg', '.md'];
    const maxBytes = 10 * 1024 * 1024; // 10MB

    const added: AttachedFile[] = [];

    for (const file of Array.from(incoming)) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!validExtensions.includes(ext)) {
        setFileError(`"${file.name}" is not supported. Please attach PDF, TXT, DOCX, PNG, JPG, or MD.`);
        continue;
      }
      if (file.size > maxBytes) {
        setFileError(`"${file.name}" exceeds the 10MB limit.`);
        continue;
      }

      let textPreview: string | undefined = undefined;
      if (ext === '.txt' || ext === '.md') {
        try {
          textPreview = await file.text();
        } catch {
          // ignore read error
        }
      }

      added.push({
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        size: file.size,
        type: file.type || ext,
        textPreview: textPreview ? textPreview.slice(0, 1000) : undefined,
      });
    }

    if (added.length > 0) {
      setFiles((prev) => [...prev, ...added]);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  }

  function handleRemoveFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cleanDesc = description.trim();
    if (!cleanDesc) {
      setError('Please provide a description of your idea or business to start.');
      return;
    }

    const words = cleanDesc.split(/\s+/).filter(Boolean).length;
    if (words < 3) {
      setError('Please provide at least a few words describing your business.');
      return;
    }

    // Build context with attached file summaries
    const combinedConstraints = [
      constraints.trim(),
      files.length > 0 ? `Reference documents attached: ${files.map((f) => f.name).join(', ')}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    const payload: IdeaInputType = {
      business_description: cleanDesc,
      ...(audience.trim() ? { target_audience: audience.trim() } : {}),
      ...(category.trim() ? { category: category.trim() } : {}),
      ...(combinedConstraints ? { constraints: combinedConstraints } : {}),
    };

    setIdeaInput(payload);
    navigate('/discovery');
  }

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-6">
      {/* ─── Canvas Header ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-100 text-accent-700 text-xs font-semibold uppercase tracking-wider mb-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-600" />
          Brand Strategy Canvas
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-950 tracking-tight">
          What are you building?
        </h1>
        <p className="mt-2 text-sm sm:text-base text-ink-600 max-w-2xl leading-relaxed">
          Describe your business, product, or idea in plain language. IdeaToBrand AI will guide you step-by-step through discovery, positioning, identity, voice, and launch.
        </p>

        {/* Example Presets */}
        <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 flex-wrap text-xs">
          <span className="text-ink-500 font-medium">Quick examples:</span>
          {SAMPLE_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.label}
              type="button"
              onClick={() => handleApplyTemplate(tmpl)}
              className="px-3 py-1 rounded-full bg-white border border-border text-ink-800 hover:border-accent-600 hover:text-accent-700 transition-colors font-medium cursor-pointer shadow-2xs"
            >
              ✦ {tmpl.label} <span className="text-ink-400">({tmpl.category})</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Project Creation Form ─────────────────────────────────────── */}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Main Idea Description Box */}
        <div className="card p-6 sm:p-7 bg-white border-border shadow-card space-y-4">
          <div>
            <label
              htmlFor="idea-description"
              className="block text-sm font-bold text-ink-950 mb-1"
            >
              Your idea or business description
              <span className="text-red-500 ml-1" aria-hidden="true">*</span>
            </label>
            <p className="text-xs text-ink-500 mb-3" id="idea-description-hint">
              Explain what you do, who it is for, and the main problem you solve. Write freely without word count restrictions.
            </p>

            <textarea
              id="idea-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (error) setError(null);
              }}
              rows={6}
              placeholder="e.g. We are building an on-demand, zero-emission cargo bike logistics network for independent bakeries and cafes who need reliable local delivery without paying 30% marketplace fees..."
              className={[
                'w-full rounded-xl border p-4 text-sm text-ink-950 placeholder:text-ink-400 resize-y leading-relaxed font-sans min-h-[160px]',
                'focus:outline-none focus:ring-2 focus:ring-accent-600/20 focus:border-accent-600 transition-all',
                error ? 'border-red-400 bg-red-50/20' : 'border-border bg-white',
              ].join(' ')}
              aria-describedby="idea-description-hint"
              aria-required="true"
            />

            {error && (
              <p role="alert" className="mt-2 text-xs font-semibold text-red-600 flex items-center gap-1.5">
                <span>⚠</span> {error}
              </p>
            )}
          </div>

          {/* ─── Document Attachments Area ──────────────────────────────── */}
          <div className="pt-3 border-t border-border/80">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-xs font-bold text-ink-800 uppercase tracking-wider block">
                  Reference Documents & Notes
                </span>
                <p className="text-xs text-ink-500 mt-0.5">
                  Add a business plan, product brief, research document, or notes. These files can help provide context for your brand strategy.
                </p>
              </div>
            </div>

            {/* Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={[
                'border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-150',
                isDragging
                  ? 'border-accent-600 bg-accent-100/40'
                  : 'border-border hover:border-ink-400 hover:bg-surface-100/60 bg-paper-50/50',
              ].join(' ')}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.txt,.docx,.png,.jpg,.jpeg,.md"
                onChange={handleFileChange}
                className="hidden"
                aria-label="Upload reference files"
              />
              <div className="flex flex-col items-center justify-center gap-1.5 text-xs text-ink-600">
                <span className="text-xl">📎</span>
                <span className="font-semibold text-ink-800">
                  Click to browse or drag and drop files here
                </span>
                <span className="text-[11px] text-ink-400">
                  Supports PDF, TXT, DOCX, PNG, JPG, MD (Max 10MB)
                </span>
              </div>
            </div>

            {fileError && (
              <p className="mt-2 text-xs font-semibold text-red-600 flex items-center gap-1">
                <span>⚠</span> {fileError}
              </p>
            )}

            {/* Attached Files List */}
            {files.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-surface-100 border border-border text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-accent-600 font-bold">📄</span>
                      <span className="font-medium text-ink-950 truncate max-w-[260px] sm:max-w-md">
                        {file.name}
                      </span>
                      <span className="text-[10px] text-ink-400">({formatBytes(file.size)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(file.id);
                      }}
                      className="text-ink-400 hover:text-red-600 font-bold px-2 py-0.5 rounded hover:bg-white"
                      title="Remove attachment"
                      aria-label={`Remove file ${file.name}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Optional Context Accordion ──────────────────────────────── */}
        <div className="card p-5 sm:p-6 bg-white border-border shadow-card">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between text-left group cursor-pointer focus-visible:outline-none"
            aria-expanded={showDetails}
            aria-label="Optional context"
          >
            <div>
              <span className="text-sm font-bold text-ink-950 group-hover:text-accent-600 transition-colors">
                Additional context {showDetails ? '(Expanded)' : '(Optional)'}
              </span>
              <p className="text-xs text-ink-500 font-normal mt-0.5">
                Specify your target customers, industry category, or business boundaries.
              </p>
            </div>
            <span className="text-xs font-semibold text-accent-600">
              {showDetails ? 'Hide' : 'Add details +'}
            </span>
          </button>

          {showDetails && (
            <div className="mt-5 pt-5 border-t border-border space-y-4">
              <div>
                <label htmlFor="idea-audience" className="block text-xs font-bold text-ink-700 uppercase tracking-wider mb-1.5">
                  Target audience
                </label>
                <input
                  id="idea-audience"
                  type="text"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="e.g. Independent bakery owners, urban cafes, and boutique retailers"
                  className="input-text text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="idea-category" className="block text-xs font-bold text-ink-700 uppercase tracking-wider mb-1.5">
                    Category or industry
                  </label>
                  <input
                    id="idea-category"
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Sustainable Urban Logistics"
                    className="input-text text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="idea-constraints" className="block text-xs font-bold text-ink-700 uppercase tracking-wider mb-1.5">
                    Constraints or rules
                  </label>
                  <input
                    id="idea-constraints"
                    type="text"
                    value={constraints}
                    onChange={(e) => setConstraints(e.target.value)}
                    placeholder="e.g. Zero-emission vehicles only, same-day delivery"
                    className="input-text text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Submit Action Bar ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <p className="text-xs text-ink-500">
            Step 1 of 9: Initializes your core brand facts before starting strategic discovery.
          </p>
          <button
            type="submit"
            disabled={!description.trim()}
            className="btn-primary w-full sm:w-auto px-7 py-3 text-sm font-semibold tracking-wide disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span>Begin Brand Strategy</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
