import type { Fix, Severity } from '@/types/audit';

interface FixListProps {
  fixes: Fix[];
}

function severityBadge(severity: Severity) {
  const styles: Record<Severity, { bg: string; text: string }> = {
    critical: { bg: 'var(--critical-bg)', text: 'var(--error)' },
    high: { bg: 'var(--high-bg)', text: '#f97316' },
    medium: { bg: 'var(--medium-bg)', text: 'var(--warning)' },
    low: { bg: 'var(--low-bg)', text: 'var(--accent)' },
  };

  const s = styles[severity];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {severity}
    </span>
  );
}

export default function FixList({ fixes }: FixListProps) {
  if (fixes.length === 0) return null;

  return (
    <div id="fix-list" className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
      <h2 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider mb-3">
        Ranked Fixes ({fixes.length})
      </h2>

      <div className="space-y-3">
        {fixes.map((fix, i) => (
          <div
            key={fix.ruleId + i}
            className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-[var(--muted)] font-mono w-5">{i + 1}.</span>
              {severityBadge(fix.severity)}
              <span className="text-sm font-medium text-[var(--foreground)]">{fix.title}</span>
              <span className="ml-auto text-xs text-[var(--muted)] font-mono">
                −{fix.pointsImpact} pts
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] leading-relaxed ml-5 mb-2">
              {fix.explanation}
            </p>
            <div className="ml-5 text-xs text-[var(--accent)] bg-[var(--accent)]/5 rounded-lg px-3 py-2">
              💡 {fix.recommendation}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
