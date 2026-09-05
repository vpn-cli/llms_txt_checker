/**
 * Safe HTTP fetcher with timeout, redirect handling, size limits, and SSRF protection.
 */

import { checkSsrf } from './security';
import type { FetchResult } from '@/types/audit';

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB
const USER_AGENT = 'LLMSTxtChecker/1.0 (+https://github.com/llms-txt-checker)';

export interface FetchOptions {
  timeoutMs?: number;
  maxRedirects?: number;
  maxResponseBytes?: number;
}

/**
 * Fetch a URL safely with all protections enabled.
 */
export async function safeFetch(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResult> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRedirects = MAX_REDIRECTS,
    maxResponseBytes = MAX_RESPONSE_BYTES,
  } = options;

  // SSRF check on the original URL
  try {
    const parsed = new URL(url);
    const ssrfReason = checkSsrf(parsed.hostname);
    if (ssrfReason) {
      return {
        url,
        status: null,
        contentType: null,
        finalUrl: null,
        body: null,
        size: 0,
        redirectCount: 0,
        error: `SSRF blocked: ${ssrfReason}`,
      };
    }
  } catch {
    return {
      url,
      status: null,
      contentType: null,
      finalUrl: null,
      body: null,
      size: 0,
      redirectCount: 0,
      error: `Invalid URL: ${url}`,
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // Manual redirect following for counting
    let currentUrl = url;
    let redirectCount = 0;
    let response: Response;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      response = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/plain, text/markdown, text/html, */*',
        },
      });

      // Handle redirects
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        redirectCount++;
        if (redirectCount > maxRedirects) {
          clearTimeout(timer);
          return {
            url,
            status: response.status,
            contentType: response.headers.get('content-type'),
            finalUrl: currentUrl,
            body: null,
            size: 0,
            redirectCount,
            error: `Too many redirects (>${maxRedirects})`,
          };
        }
        const location = response.headers.get('location');
        if (!location) {
          clearTimeout(timer);
          return {
            url,
            status: response.status,
            contentType: response.headers.get('content-type'),
            finalUrl: currentUrl,
            body: null,
            size: 0,
            redirectCount,
            error: 'Redirect without Location header',
          };
        }
        // Resolve relative redirects
        currentUrl = new URL(location, currentUrl).href;

        // SSRF check on redirect target
        const redirectParsed = new URL(currentUrl);
        const redirectSsrf = checkSsrf(redirectParsed.hostname);
        if (redirectSsrf) {
          clearTimeout(timer);
          return {
            url,
            status: response.status,
            contentType: null,
            finalUrl: currentUrl,
            body: null,
            size: 0,
            redirectCount,
            error: `SSRF blocked on redirect: ${redirectSsrf}`,
          };
        }
        continue;
      }

      break;
    }

    clearTimeout(timer);

    // Read body with size limit
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > maxResponseBytes) {
      return {
        url,
        status: response.status,
        contentType: response.headers.get('content-type'),
        finalUrl: currentUrl,
        body: null,
        size: parseInt(contentLength, 10),
        redirectCount,
        error: `Response too large: ${contentLength} bytes`,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > maxResponseBytes) {
      return {
        url,
        status: response.status,
        contentType: response.headers.get('content-type'),
        finalUrl: currentUrl,
        body: null,
        size: arrayBuffer.byteLength,
        redirectCount,
        error: `Response too large: ${arrayBuffer.byteLength} bytes`,
      };
    }

    const body = new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer);

    return {
      url,
      status: response.status,
      contentType: response.headers.get('content-type'),
      finalUrl: currentUrl !== url ? currentUrl : null,
      body,
      size: arrayBuffer.byteLength,
      redirectCount,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout = message.includes('abort') || message.includes('timeout');

    return {
      url,
      status: null,
      contentType: null,
      finalUrl: null,
      body: null,
      size: 0,
      redirectCount: 0,
      error: isTimeout ? `Request timed out after ${timeoutMs}ms` : message,
    };
  }
}
