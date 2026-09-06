import type { ScoreBreakdown } from '@/types/audit';

interface ScoreCardProps {
  score: number;
  grade: string;
  breakdown: ScoreBreakdown;
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'var(--success)';
    case 'B': return '#86efac';
    case 'C': return 'var(--warning)';
    case 'D': return '#f97316';
    case 'F': return 'var(--error)';
    default: return 'var(--muted)';
  }
}

function BreakdownBar({ label, value, max }: { label: string; value: number | 'N/A'; max: number | 'N/A' }) {
  if (value === 'N/A' || max === 'N/A') {
    return (
      <div className="flex items-center gap-3 text-sm opacity-50">
        <span className="w-28 text-[var(--muted)] shrink-0">{label}</span>
        <div className="flex-1 h-2 rounded-full bg-[var(--card-border)] overflow-hidden">
          <div className="h-full bg-[var(--muted)] w-full" />
        </div>
        <span className="w-14 text-right font-mono text-xs text-[var(--muted)]">N/A</span>
      </div>
    );
  }
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 text-[var(--muted)] shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-[var(--card-border)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--error)',
          }}
        />
      </div>
      <span className="w-14 text-right font-mono text-xs text-[var(--muted)]">
        {value}/{max}
      </span>
    </div>
  );
}

export default function ScoreCard({ score, grade, breakdown }: ScoreCardProps) {
  const gradeColor = getGradeColor(grade);

  return (
    <div id="score-card" className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center gap-6 mb-6">
        {/* Score circle */}
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--card-border)" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke={gradeColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 264} 264`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold" style={{ color: gradeColor }}>{score}</span>
            <span className="text-xs text-[var(--muted)]">/100</span>
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-4xl font-bold" style={{ color: gradeColor }}>{grade}</span>
            <span className="text-sm text-[var(--muted)]">Grade</span>
          </div>
          <p className="text-xs text-[var(--muted)]">
            {score >= 90 ? 'Excellent AI discoverability' :
             score >= 80 ? 'Good — minor improvements possible' :
             score >= 70 ? 'Acceptable — some issues to fix' :
             score >= 60 ? 'Needs work — several issues found' :
             'Critical issues — significant fixes needed'}
          </p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-3">
        <BreakdownBar label="Authenticity" value={breakdown.authenticity} max={breakdown.authenticityMax} />
        <BreakdownBar label="Structure" value={breakdown.structure} max={breakdown.structureMax} />
        <BreakdownBar label="Link Resolution" value={breakdown.linkResolution} max={breakdown.linkResolutionMax} />
        <BreakdownBar label="AI/Link Quality" value={breakdown.linkQuality} max={breakdown.linkQualityMax} />
      </div>
    </div>
  );
}
