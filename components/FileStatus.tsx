import type { FileAuditResult, FileClassification } from '@/types/audit';

interface FileStatusProps {
  llmsTxt: FileAuditResult;
  llmsFullTxt: FileAuditResult | null;
}

function classificationBadge(classification: FileClassification) {
  const styles: Record<FileClassification, { bg: string; text: string; label: string }> = {
    REAL_MARKDOWN: { bg: 'rgba(34,197,94,0.12)', text: 'var(--success)', label: 'Real Markdown' },
    NOT_FOUND: { bg: 'rgba(239,68,68,0.12)', text: 'var(--error)', label: '404 Not Found' },
    SOFT_404: { bg: 'rgba(249,115,22,0.12)', text: '#f97316', label: 'Soft 404' },
    SPA_SHELL: { bg: 'rgba(234,179,8,0.12)', text: 'var(--warning)', label: 'SPA Shell' },
    HTML_PAGE: { bg: 'rgba(234,179,8,0.12)', text: 'var(--warning)', label: 'HTML Page' },
    UNREACHABLE: { bg: 'rgba(239,68,68,0.12)', text: 'var(--error)', label: 'Unreachable' },
    INVALID_CONTENT: { bg: 'rgba(239,68,68,0.12)', text: 'var(--error)', label: 'Invalid' },
  };

  const s = styles[classification];
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}

function FileCard({ file, label }: { file: FileAuditResult; label: string }) {
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <code className="text-sm font-mono text-[var(--foreground)]">{label}</code>
        {classificationBadge(file.classification.classification)}
      </div>

      <div className="space-y-1.5 text-xs text-[var(--muted)]">
        {file.httpStatus !== null && (
          <div className="flex justify-between">
            <span>HTTP Status</span>
            <span className="font-mono">{file.httpStatus}</span>
          </div>
        )}
        {file.contentType && (
          <div className="flex justify-between">
            <span>Content-Type</span>
            <span className="font-mono truncate ml-4 max-w-[200px]">{file.contentType}</span>
          </div>
        )}
        {file.size > 0 && (
          <div className="flex justify-between">
            <span>Size</span>
            <span className="font-mono">{(file.size / 1024).toFixed(1)} KB</span>
          </div>
        )}
        {file.finalUrl && (
          <div className="flex justify-between">
            <span>Redirected to</span>
            <span className="font-mono truncate ml-4 max-w-[200px]">{file.finalUrl}</span>
          </div>
        )}
      </div>

      {file.classification.reasons.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--card-border)]">
          <p className="text-xs text-[var(--muted)] mb-1">Classification reasons:</p>
          <ul className="text-xs text-[var(--muted)] space-y-0.5">
            {file.classification.reasons.map((r, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="shrink-0">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function FileStatus({ llmsTxt, llmsFullTxt }: FileStatusProps) {
  return (
    <div id="file-status" className="space-y-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
      <h2 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">File Status</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FileCard file={llmsTxt} label="/llms.txt" />
        {llmsFullTxt ? (
          <FileCard file={llmsFullTxt} label="/llms-full.txt" />
        ) : (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 flex items-center justify-center">
            <span className="text-xs text-[var(--muted)]">/llms-full.txt not found (optional)</span>
          </div>
        )}
      </div>
    </div>
  );
}
