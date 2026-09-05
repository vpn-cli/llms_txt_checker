/**
 * AEO Content Extractability
 * Evaluates how easily a generative engine can extract useful structure and answers.
 * Max points: 2.0
 */

export interface HtmlMetadata {
  titlePresent: boolean;
  h1Count: number;
  h2h3Count: number;
  liCount: number;
  tableCount: number;
  pCount: number;
  textLength: number;
}

export interface ContentExtractabilityInput {
  text: string;
  contentType: 'HTML_CONTENT' | 'MARKDOWN_CONTENT' | 'EMPTY_HTML' | 'OTHER_NON_HTML';
  htmlMetadata?: HtmlMetadata;
}

export function evaluateExtractability(input: ContentExtractabilityInput): number {
  if (input.contentType === 'EMPTY_HTML' || input.contentType === 'OTHER_NON_HTML') {
    return 0.0;
  }

  let score = 0;

  // 1. Structure (max 0.75)
  if (input.contentType === 'HTML_CONTENT' && input.htmlMetadata) {
    if (input.htmlMetadata.titlePresent || input.htmlMetadata.h1Count > 0) score += 0.25;
    if (input.htmlMetadata.h2h3Count > 0) {
      score += 0.25;
      if (input.htmlMetadata.h2h3Count >= 3) {
        score += 0.25;
      }
    }
  } else if (input.contentType === 'MARKDOWN_CONTENT') {
    // For Markdown, detect headings directly from syntax
    const hasH1 = /(?:^|\n)#\s+.+/.test(input.text);
    if (hasH1) score += 0.25;
    
    const h2h3Matches = input.text.match(/(?:^|\n)#{2,3}\s+.+/g);
    if (h2h3Matches && h2h3Matches.length > 0) {
      score += 0.25;
      if (h2h3Matches.length >= 3) {
        score += 0.25;
      }
    }
  }

  // 2. Answerability (max 0.75)
  const answerRegex = /\b(?:is a|provides|helps|offers|specializes in|was founded|serves|designed for|allows users to)\b/gi;
  const answerMatches = input.text.match(answerRegex);
  if (answerMatches) {
    if (answerMatches.length >= 3) score += 0.75;
    else if (answerMatches.length >= 1) score += 0.4;
  }

  // 3. Concrete Information / Definitions (max 0.5)
  if (input.contentType === 'HTML_CONTENT' && input.htmlMetadata) {
    if (input.htmlMetadata.liCount > 0) score += 0.25;
    if (input.htmlMetadata.tableCount > 0) score += 0.25;
  } else if (input.contentType === 'MARKDOWN_CONTENT') {
    const hasLists = /(?:^|\n)[-*+]\s+.+/.test(input.text);
    if (hasLists) score += 0.25;
    
    const hasTables = /(?:^|\n)\|.*\|.*\|/.test(input.text);
    if (hasTables) score += 0.25;
  }

  // 4. Noise Penalty
  const textLen = input.htmlMetadata ? input.htmlMetadata.textLength : input.text.length;
  if (textLen < 200) {
    score -= 1.0;
  }
  
  if (input.contentType === 'HTML_CONTENT' && input.htmlMetadata) {
    if (textLen > 3000 && input.htmlMetadata.h2h3Count === 0) {
      score -= 0.5;
    }
  } else if (input.contentType === 'MARKDOWN_CONTENT') {
    const h2h3Matches = input.text.match(/(?:^|\n)#{2,3}\s+.+/g);
    if (textLen > 3000 && (!h2h3Matches || h2h3Matches.length === 0)) {
      score -= 0.5;
    }
  }

  return Math.max(0.0, Math.min(2.0, score));
}
