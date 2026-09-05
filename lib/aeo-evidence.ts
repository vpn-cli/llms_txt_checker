/**
 * AEO Evidence & Source Attribution
 * Detects references, citations, and source attributions.
 * Max points: 3.0
 */

export function evaluateEvidence(text: string): number {
  let signalCount = 0;

  // 1. Explicit sections
  if (/(?:##|^#)\s*(References|Sources|Citations|Further Reading)/im.test(text)) {
    signalCount += 2; // Strong signal
  }

  // 2. Inline attribution
  const inlineRegex = /according to \[[^\]]+\]\([^\)]+\)|source:\s*\[[^\]]+\]\([^\)]+\)|references:\s*\[\d+\]/gi;
  const inlineMatches = text.match(inlineRegex);
  if (inlineMatches) {
    signalCount += inlineMatches.length;
  }

  // 3. Academic citations: (Smith, 2023), (Smith et al., 2023)
  const academicRegex = /\([A-Z][a-zA-Z\s]+(?:et al\.)?,\s*(?:19|20)\d{2}\)/g;
  const academicMatches = text.match(academicRegex);
  if (academicMatches) {
    signalCount += academicMatches.length;
  }

  // 4. Bracket citations: [1], [2], [42]
  const bracketRegex = /(?<=\s|\]|”|")[\[]\d+[\]](?=\s|\.|,|;|$)/g;
  const bracketMatches = text.match(bracketRegex);
  if (bracketMatches) {
    signalCount += bracketMatches.length;
  }

  // Evaluate diminishing returns
  if (signalCount === 0) return 0.0;
  if (signalCount === 1) return 1.0;
  if (signalCount === 2) return 2.0;
  if (signalCount === 3) return 2.5;
  return 3.0; // 4+
}
