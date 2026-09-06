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
    TOO_LARGE: { bg: 'rgba(234,179,8,0.12)', text: 'var(--warning)', label: 'Too Large' },
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

function FileStatusBadge({ status }: { status: import('@/types/audit').FileStatus }) {
  const isOk = status === 'Valid';
  const isErr = status === 'Not Found' || status === 'Misconfigured';
  const color = isOk ? 'var(--success)' : status === 'Misconfigured' ? 'var(--warning)' : 'var(--error)';
  const bg = isOk ? 'rgba(34,197,94,0.12)' : status === 'Misconfigured' ? 'rgba(234,179,8,0.12)' : 'rgba(239,68,68,0.12)';
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium" style={{ backgroundColor: bg, color }}>
      Status: {status}
    </span>
  );
}

function FileCard({ file, label }: { file: FileAuditResult; label: string }) {
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <code className="text-sm font-mono text-[var(--foreground)]">{label}</code>
        <div className="flex gap-2">
          {classificationBadge(file.classification.classification)}
          <FileStatusBadge status={file.fileStatus} />
        </div>
      </div>

      <div className="space-y-1.5 text-xs text-[var(--muted)] flex-1">
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
      
      {llmsTxt.fileStatus === 'Not Found' && (
        <div className="bg-[var(--critical-bg)] border border-red-500/20 rounded-xl p-4 text-sm text-[var(--foreground)]">
          <p className="mb-1 text-[var(--error)] font-medium">No llms.txt file found.</p>
          <p className="text-[var(--muted)]">The site does not currently expose an llms.txt file. As a result, the site is missing a structured discovery path for AI agents.</p>
        </div>
      )}

      {llmsTxt.fileStatus === 'Misconfigured' && (
        <div className="bg-[var(--medium-bg)] border border-orange-500/20 rounded-xl p-4 text-sm text-[var(--foreground)]">
          <p className="mb-1 text-[var(--warning)] font-medium">Endpoint Misconfigured</p>
          <p className="text-[var(--muted)]">The requested /llms.txt endpoint exists at the HTTP level but is not serving a real Markdown llms.txt file. This is often worse than a genuine 404 because the owner may believe the endpoint is working correctly.</p>
        </div>
      )}

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

      {llmsTxt.generatedDraft && (
        <div className="mt-6 space-y-2">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Generated llms.txt Draft</h3>
          <p className="text-xs text-[var(--muted)]">This draft was auto-generated from the site's current publicly accessible metadata and pages via its sitemap. It should be reviewed before production use.</p>
          <div className="relative">
            <pre className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 overflow-x-auto text-xs font-mono text-[var(--foreground)]">
              <code>{llmsTxt.generatedDraft}</code>
            </pre>
            <button
              onClick={() => navigator.clipboard.writeText(llmsTxt.generatedDraft!)}
              className="absolute top-2 right-2 px-2 py-1 bg-[var(--background)] border border-[var(--card-border)] rounded text-xs text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)] transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
