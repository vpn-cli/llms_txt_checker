'use client';

import { useState } from 'react';
import AuditForm from '@/components/AuditForm';
import ScoreCard from '@/components/ScoreCard';
import FileStatus from '@/components/FileStatus';
import CheckList from '@/components/CheckList';
import FixList from '@/components/FixList';
import LinkTable from '@/components/LinkTable';
import type { AuditResult } from '@/types/audit';

type AppState = 'idle' | 'loading' | 'results' | 'error';

export default function Home() {
  const [state, setState] = useState<AppState>('idle');
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string>('');

  const handleAudit = async (url: string) => {
    setState('loading');
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        setState('error');
        setError(data.error || `Server error: ${res.status}`);
        return;
      }

      setResult(data);
      setState('results');
    } catch (err) {
      setState('error');
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to connect to the audit service. Please try again.'
      );
    }
  };

  return (
    <main className="flex-1">
      {/* Header */}
      <div className="text-center pt-16 pb-8 px-4">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--foreground)] mb-3 tracking-tight">
          LLMS.TXT Checker
        </h1>
        <p className="text-sm text-[var(--muted)] max-w-lg mx-auto leading-relaxed">
          Audit your site&apos;s <code className="text-[var(--accent)] font-mono">/llms.txt</code> for
          AI discoverability. Checks file existence, authenticity, structure, linked URL health,
          and generates a score with actionable fixes.
        </p>
      </div>

      {/* Audit Form */}
      <div className="px-4 mb-8">
        <AuditForm onSubmit={handleAudit} isLoading={state === 'loading'} />
      </div>

      {/* Loading State */}
      {state === 'loading' && (
        <div className="max-w-3xl mx-auto px-4 space-y-4">
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="skeleton w-24 h-24 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-8 w-20" />
                <div className="skeleton h-4 w-48" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-3/4" />
              <div className="skeleton h-3 w-full" />
            </div>
          </div>
          <p className="text-center text-xs text-[var(--muted)] animate-pulse">
            Fetching, analyzing, and crawling links — this may take 10–30 seconds…
          </p>
        </div>
      )}

      {/* Error State */}
      {state === 'error' && (
        <div className="max-w-xl mx-auto px-4">
          <div className="bg-[var(--critical-bg)] border border-[var(--error)]/20 rounded-xl p-4 text-center">
            <p className="text-sm text-[var(--error)] font-medium mb-1">Audit Failed</p>
            <p className="text-xs text-[var(--muted)]">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {state === 'results' && result && (
        <div className="max-w-3xl mx-auto px-4 pb-16 space-y-6">
          {/* Domain header */}
          <div className="text-center mb-2">
            <p className="text-xs text-[var(--muted)]">
              Results for{' '}
              <span className="font-mono text-[var(--foreground)]">{result.domain}</span>
              <span className="text-[var(--muted)]"> • {new Date(result.timestamp).toLocaleString()}</span>
            </p>
          </div>

          <ScoreCard
            score={result.score}
            grade={result.grade}
            breakdown={result.scoreBreakdown}
          />

          <FileStatus
            llmsTxt={result.files.llmsTxt}
            llmsFullTxt={result.files.llmsFullTxt}
          />

          <CheckList
            checks={result.files.llmsTxt.checks}
            passed={result.summary.passed}
            warnings={result.summary.warnings}
            failed={result.summary.failed}
          />

          {result.links.length > 0 && <LinkTable links={result.links} />}

          <FixList fixes={result.fixes} />
        </div>
      )}

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-[var(--muted)] border-t border-[var(--card-border)] mt-auto">
        Built to audit AI discoverability •{' '}
        <a
          href="https://llmstxt.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent)] hover:underline"
        >
          llms.txt spec
        </a>
      </footer>
    </main>
  );
}
