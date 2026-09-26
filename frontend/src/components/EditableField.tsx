import { useState, useId } from 'react';

interface EditableFieldProps {
  label: string;
  value: string;
  multiline?: boolean;
  onSave: (newValue: string) => void;
  disabled?: boolean;
}

export function EditableField({ label, value, multiline = false, onSave, disabled = false }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState('');
  const id = useId();

  function handleEdit() {
    setDraft(value);
    setError('');
    setEditing(true);
  }

  function handleSave() {
    if (!draft.trim()) {
      setError('This field cannot be empty.');
      return;
    }
    onSave(draft.trim());
    setEditing(false);
  }

  function handleCancel() {
    setDraft(value);
    setError('');
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') handleCancel();
    if (e.key === 'Enter' && !multiline) { e.preventDefault(); handleSave(); }
  }

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="section-label">{label}</label>
        {!editing && !disabled && (
          <button
            onClick={handleEdit}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-xs text-accent-600 hover:underline transition-opacity"
            aria-label={`Edit ${label}`}
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          {multiline ? (
            <textarea
              id={id}
              value={draft}
              onChange={e => { setDraft(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              rows={4}
              className="w-full rounded border border-border px-3 py-2 text-sm text-ink-950 focus:outline-none focus:ring-2 focus:ring-accent-600 resize-y"
              aria-label={label}
              aria-invalid={!!error}
              aria-describedby={error ? `${id}-error` : undefined}
              autoFocus
            />
          ) : (
            <input
              id={id}
              type="text"
              value={draft}
              onChange={e => { setDraft(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              className="w-full rounded border border-border px-3 py-2 text-sm text-ink-950 focus:outline-none focus:ring-2 focus:ring-accent-600"
              aria-label={label}
              aria-invalid={!!error}
              aria-describedby={error ? `${id}-error` : undefined}
              autoFocus
            />
          )}
          {error && (
            <p id={`${id}-error`} role="alert" className="text-xs text-red-600">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="btn-primary text-xs px-3 py-1.5"
              aria-label={`Save ${label}`}
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="btn-secondary text-xs px-3 py-1.5"
              aria-label="Cancel edit"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink-950 whitespace-pre-wrap">{value || <span className="text-ink-500 italic">—</span>}</p>
      )}
    </div>
  );
}
