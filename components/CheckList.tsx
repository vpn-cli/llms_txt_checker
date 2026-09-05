import type { ValidationCheck, CheckType } from '@/types/audit';

interface CheckListProps {
  checks: ValidationCheck[];
  passed: number;
  warnings: number;
  failed: number;
}

function statusIcon(status: 'pass' | 'warning' | 'fail') {
  switch (status) {
    case 'pass':
      return <span className="text-[var(--success)]">✓</span>;
    case 'warning':
      return <span className="text-[var(--warning)]">⚠</span>;
    case 'fail':
      return <span className="text-[var(--error)]">✗</span>;
  }
}

function typeBadge(type: CheckType) {
  if (type === 'proposal-required' || type === 'proposal-optional') {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] uppercase tracking-wider">
        Spec
      </span>
    );
  }
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)]/10 text-[var(--muted)] uppercase tracking-wider">
      Heuristic
    </span>
  );
}

export default function CheckList({ checks, passed, warnings, failed }: CheckListProps) {
  return (
    <div id="check-list" className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">
          Structural Checks
        </h2>
        <div className="flex gap-3 text-xs">
          <span className="text-[var(--success)]">{passed} passed</span>
          <span className="text-[var(--warning)]">{warnings} warnings</span>
          <span className="text-[var(--error)]">{failed} failed</span>
        </div>
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden">
        {checks.map((c, i) => (
          <div
            key={c.ruleId}
            className={`flex items-start gap-3 px-4 py-3 ${i > 0 ? 'border-t border-[var(--card-border)]' : ''}`}
          >
            <div className="mt-0.5 shrink-0">{statusIcon(c.status)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-medium text-[var(--foreground)]">{c.title}</span>
                {typeBadge(c.type)}
              </div>
              <p className="text-xs text-[var(--muted)] leading-relaxed">{c.message}</p>
            </div>
          </div>
        ))}

        {checks.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-[var(--muted)]">
            No structural checks to display (file may not be valid Markdown)
          </div>
        )}
      </div>
    </div>
  );
}
