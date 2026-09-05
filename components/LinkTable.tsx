import type { LinkCheckResult, LinkClassification } from '@/types/audit';

interface LinkTableProps {
  links: LinkCheckResult[];
}

function statusBadge(status: LinkClassification) {
  const styles: Record<LinkClassification, { bg: string; text: string; label: string }> = {
    HTML_CONTENT: { bg: 'rgba(34,197,94,0.12)', text: 'var(--success)', label: 'HTML' },
    MARKDOWN_CONTENT: { bg: 'rgba(16,185,129,0.12)', text: '#10b981', label: 'Markdown' },
    OTHER_NON_HTML: { bg: 'rgba(99,102,241,0.12)', text: 'var(--accent)', label: 'Other' },
    EMPTY_HTML: { bg: 'rgba(249,115,22,0.12)', text: '#f97316', label: 'Empty' },
    BROKEN: { bg: 'rgba(239,68,68,0.12)', text: 'var(--error)', label: 'Broken' },
    SERVER_ERROR: { bg: 'rgba(239,68,68,0.12)', text: 'var(--error)', label: 'Server Error' },
    SPA_SHELL: { bg: 'rgba(234,179,8,0.12)', text: 'var(--warning)', label: 'SPA Shell' },
  };

  const s = styles[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}

export default function LinkTable({ links }: LinkTableProps) {
  if (links.length === 0) return null;

  const healthy = links.filter((l) => l.status === 'HTML_CONTENT' || l.status === 'MARKDOWN_CONTENT').length;
  const broken = links.filter((l) => l.status === 'BROKEN' || l.status === 'SERVER_ERROR').length;

  return (
    <div id="link-table" className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">
          Linked URLs ({links.length})
        </h2>
        <div className="flex gap-3 text-xs">
          <span className="text-[var(--success)]">{healthy} healthy</span>
          <span className="text-[var(--error)]">{broken} broken</span>
        </div>
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--card-border)]">
                <th className="text-left px-4 py-2.5 text-[var(--muted)] font-medium">Title</th>
                <th className="text-left px-4 py-2.5 text-[var(--muted)] font-medium">URL</th>
                <th className="text-left px-4 py-2.5 text-[var(--muted)] font-medium">Status</th>
                <th className="text-left px-4 py-2.5 text-[var(--muted)] font-medium">HTTP</th>
                <th className="text-left px-4 py-2.5 text-[var(--muted)] font-medium">Type</th>
                <th className="text-right px-4 py-2.5 text-[var(--muted)] font-medium">AEO Score</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link, i) => (
                <tr
                  key={i}
                  className={`${i > 0 ? 'border-t border-[var(--card-border)]' : ''} hover:bg-[var(--card-border)]/20 transition-colors`}
                >
                  <td className="px-4 py-2.5 text-[var(--foreground)] font-medium max-w-[200px] truncate">
                    {link.title || '—'}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[var(--muted)] max-w-[300px] truncate">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[var(--accent)] transition-colors"
                    >
                      {link.url}
                    </a>
                  </td>
                  <td className="px-4 py-2.5">{statusBadge(link.status)}</td>
                  <td className="px-4 py-2.5 font-mono text-[var(--muted)]">
                    {link.httpStatus ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[var(--muted)] max-w-[150px] truncate">
                    {link.contentType?.split(';')[0] || '—'}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-right text-[var(--foreground)]">
                    {link.aeoScore ? (
                      <span className={link.aeoScore.total >= 7 ? 'text-[var(--success)]' : link.aeoScore.total >= 4 ? 'text-[var(--warning)]' : 'text-[var(--error)]'} title={`Ev: ${link.aeoScore.evidence}, Stat: ${link.aeoScore.statistics}, Quo: ${link.aeoScore.quotations}, Ext: ${link.aeoScore.extractability}, Read: ${link.aeoScore.readability}`}>
                        {link.aeoScore.total.toFixed(1)}/10
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
