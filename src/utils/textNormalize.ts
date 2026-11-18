export type ClozeSegment =
  | { type: 'text'; value: string }
  | { type: 'slot'; slotIndex: number; answer: string };

/**
 * Normalizes Spanish text for tolerant desktop cloze input:
 * - trims outer whitespace
 * - collapses consecutive internal spaces
 * - converts to lowercase
 * - strips diacritics (e.g., "método" === "metodo", "cohesión" === "cohesion")
 */
export function normalizeAnswer(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Parses a template string containing {{answer}} markers into ordered segments.
 */
export function parseClozeTemplate(template: string): {
  segments: ClozeSegment[];
  answers: string[];
} {
  const regex = /\{\{([^}]+)\}\}/g;
  const segments: ClozeSegment[] = [];
  const answers: string[] = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let slotIndex = 0;

  while ((match = regex.exec(template)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        value: template.slice(lastIndex, match.index),
      });
    }
    const answer = match[1].trim();
    answers.push(answer);
    segments.push({
      type: 'slot',
      slotIndex,
      answer,
    });
    slotIndex += 1;
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < template.length) {
    segments.push({
      type: 'text',
      value: template.slice(lastIndex),
    });
  }

  return { segments, answers };
}

export function shuffleArray<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
