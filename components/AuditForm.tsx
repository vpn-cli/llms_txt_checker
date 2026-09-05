'use client';

import { useState, FormEvent } from 'react';

interface AuditFormProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export default function AuditForm({ onSubmit, isLoading }: AuditFormProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (url.trim() && !isLoading) {
      onSubmit(url.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto">
      <div className="flex gap-3">
        <input
          id="domain-input"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="example.com"
          disabled={isLoading}
          autoFocus
          className="flex-1 px-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all font-mono text-sm"
        />
        <button
          id="audit-button"
          type="submit"
          disabled={isLoading || !url.trim()}
          className="px-6 py-3 rounded-xl bg-[var(--accent)] text-white font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm whitespace-nowrap"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Auditing…
            </span>
          ) : (
            'Audit'
          )}
        </button>
      </div>
    </form>
  );
}
