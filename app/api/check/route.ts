/**
 * POST /api/check
 *
 * Accepts: { url: string }
 * Returns: AuditResult
 */

import { NextRequest, NextResponse } from 'next/server';
import { runAudit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "url" field' },
        { status: 400 }
      );
    }

    const trimmed = url.trim();
    if (trimmed.length === 0) {
      return NextResponse.json(
        { error: 'URL cannot be empty' },
        { status: 400 }
      );
    }

    if (trimmed.length > 500) {
      return NextResponse.json(
        { error: 'URL is too long' },
        { status: 400 }
      );
    }

    const result = await runAudit(trimmed);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    // URL validation errors are user errors
    if (message.includes('Invalid URL') || message.includes('Invalid domain') || message.includes('Invalid protocol')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error('Audit error:', err);
    return NextResponse.json(
      { error: 'Internal server error during audit' },
      { status: 500 }
    );
  }
}
