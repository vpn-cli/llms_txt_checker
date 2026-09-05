/**
 * AEO Statistics & Concrete Facts
 * Detects numbers, percentages, and factual statistics.
 * Max points: 2.5
 */

export function evaluateStatistics(text: string): number {
  let strongSignals = 0;
  let weakSignals = 0;

  // 1. Percentages
  const percentageRegex = /\b\d+(?:\.\d+)?%\s*(?:increase|decrease|growth|of|more|less|faster|slower|reduction|improvement|jump|drop|fall|rise)?\b/gi;
  const percentageMatches = text.match(percentageRegex);
  if (percentageMatches) strongSignals += percentageMatches.length;

  // 2. Currency
  const currencyRegex = /\$(?:\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*(?:million|billion|trillion|k|m|b)?\b/gi;
  const currencyMatches = text.match(currencyRegex);
  if (currencyMatches) strongSignals += currencyMatches.length;

  // 3. Measured quantities & large counts
  const quantityRegex = /\b\d+(?:,\d{3})+(?:\.\d+)?\s+(?:users|customers|articles|requests|queries|seconds|minutes|hours|days|months|years|nodes|servers|instances)\b/gi;
  const quantityMatches = text.match(quantityRegex);
  if (quantityMatches) strongSignals += quantityMatches.length;

  // 4. Weak signals (e.g., isolated years like 2024, or small numbers without clear context)
  const yearRegex = /\b(?:19|20)\d{2}\b/g;
  const yearMatches = text.match(yearRegex);
  if (yearMatches) weakSignals += yearMatches.length;

  // Score calculation
  // Strong signals are worth 1.0 each, weak are worth 0.2 each
  let rawScore = (strongSignals * 1.0) + (weakSignals * 0.2);

  // Diminishing returns cap at 2.5
  if (rawScore >= 4.0) return 2.5;
  if (rawScore >= 3.0) return 2.0;
  if (rawScore >= 2.0) return 1.5;
  if (rawScore >= 1.0) return 1.0;
  if (rawScore > 0) return 0.5;
  
  return 0.0;
}
