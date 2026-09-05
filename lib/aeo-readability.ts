/**
 * AEO Readability
 * Deterministic approximation of Flesch Reading Ease.
 * Max points: 1.0
 */

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const syllables = word.match(/[aeiouy]{1,2}/g);
  return syllables ? syllables.length : 1;
}

export function evaluateReadability(text: string): number {
  if (!text || text.length < 20) return 0.0;

  // Split into sentences using punctuation (. ! ?)
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length === 0) return 0.0;

  // Split into words
  const words = text.split(/\s+/).filter((w) => w.trim().length > 0);
  if (words.length === 0) return 0.0;

  let totalSyllables = 0;
  for (const word of words) {
    totalSyllables += countSyllables(word);
  }

  // Flesch Reading Ease Formula
  // 206.835 - 1.015 * (total_words / total_sentences) - 84.6 * (total_syllables / total_words)
  const wordsPerSentence = words.length / sentences.length;
  const syllablesPerWord = totalSyllables / words.length;

  const fleschScore = 206.835 - (1.015 * wordsPerSentence) - (84.6 * syllablesPerWord);

  // Map Flesch score to a 0.0 - 1.0 scale
  // Technical content normally scores poorly. 
  // Let's reward readability but not penalize heavily if it's somewhat complex.
  // >= 60 is Plain English
  // >= 30 is College level
  
  if (fleschScore >= 50) return 1.0;
  if (fleschScore >= 30) return 0.8;
  if (fleschScore >= 10) return 0.5;
  if (fleschScore > 0) return 0.2;
  
  return 0.0;
}
