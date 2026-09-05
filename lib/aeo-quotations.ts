/**
 * AEO Quotations & Attribution
 * Detects quotes and their attribution strength.
 * Max points: 1.5
 */

export function evaluateQuotations(text: string): number {
  let strongQuotes = 0;
  let weakQuotes = 0;

  // Match text enclosed in standard or smart quotes
  const quoteRegex = /(["“”])(?:(?=(\\?))\2.)*?\1/g;
  const quotes = text.match(quoteRegex) || [];

  for (const quote of quotes) {
    if (quote.length < 20) continue; // Ignore very short quoted fragments ("the")

    // Find the context around the quote (50 characters before and after)
    const quoteIndex = text.indexOf(quote);
    const contextStart = Math.max(0, quoteIndex - 50);
    const contextEnd = Math.min(text.length, quoteIndex + quote.length + 50);
    const context = text.slice(contextStart, contextEnd);

    // Look for attribution signals in the context
    // E.g., "said", "states", "according to", "— Name", "- Name"
    const attributionRegex = /said|says|states|according to|—\s*[A-Z]|\-\s*[A-Z]|explains|notes/i;
    
    if (attributionRegex.test(context)) {
      strongQuotes++;
    } else {
      weakQuotes++;
    }
  }

  // Scoring
  // Strong quote: 0.8
  // Weak quote: 0.3
  const rawScore = (strongQuotes * 0.8) + (weakQuotes * 0.3);

  return Math.min(1.5, rawScore);
}
