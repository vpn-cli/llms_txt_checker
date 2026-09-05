/**
 * URL normalization for llms.txt checking.
 * Accepts bare domains, http/https URLs, with/without trailing slashes.
 */

export interface NormalizedUrl {
  origin: string;
  llmsTxtUrl: string;
  llmsFullTxtUrl: string;
}

/**
 * Normalize user input into a proper origin and derive llms.txt URLs.
 * 
 * Accepts:
 *   example.com
 *   https://example.com
 *   https://example.com/
 *   http://example.com
 */
export function normalizeUrl(input: string): NormalizedUrl {
  let trimmed = input.trim();

  if (!trimmed) {
    throw new Error('URL is required');
  }

  // Add protocol if missing
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Invalid URL: "${input}"`);
  }

  // Only allow http and https
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Invalid protocol: ${parsed.protocol}`);
  }

  // Reject obvious non-domain inputs
  if (!parsed.hostname || !parsed.hostname.includes('.')) {
    throw new Error(`Invalid domain: "${parsed.hostname}"`);
  }

  const origin = parsed.origin; // e.g. https://example.com

  return {
    origin,
    llmsTxtUrl: `${origin}/llms.txt`,
    llmsFullTxtUrl: `${origin}/llms-full.txt`,
  };
}
