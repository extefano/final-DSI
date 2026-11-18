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

export interface ClozeEvaluation {
  allCorrect: boolean;
  slotCorrect: boolean[];
  slotExpected: string[];
}

/**
 * Evaluates cloze answers supporting order-independent (commutative) slot groups.
 * Any slot indices listed in the same group in `unorderedGroups` accept any permutation
 * of that group's expected answers without permitting duplicate reuse of a single answer.
 */
export function evaluateClozeSlots(
  answers: string[],
  userAnswers: string[],
  unorderedGroups?: number[][]
): ClozeEvaluation {
  const n = answers.length;
  const slotCorrect = new Array<boolean>(n).fill(false);
  const slotExpected = [...answers];
  const groupedIndices = new Set<number>();

  if (unorderedGroups && unorderedGroups.length > 0) {
    for (const group of unorderedGroups) {
      const validGroup = group.filter(
        (idx) => idx >= 0 && idx < n && !groupedIndices.has(idx)
      );
      if (validGroup.length === 0) continue;

      for (const idx of validGroup) {
        groupedIndices.add(idx);
      }

      const remainingPool = validGroup.map((idx) => ({
        original: answers[idx],
        normalized: normalizeAnswer(answers[idx]),
        consumed: false,
      }));

      for (const idx of validGroup) {
        const normUser = normalizeAnswer(userAnswers[idx] ?? '');
        if (!normUser) continue;
        const match = remainingPool.find(
          (item) => !item.consumed && item.normalized === normUser
        );
        if (match) {
          match.consumed = true;
          slotCorrect[idx] = true;
          slotExpected[idx] = match.original;
        }
      }

      const unusedAnswers = remainingPool.filter((item) => !item.consumed);
      let unusedCursor = 0;
      for (const idx of validGroup) {
        if (!slotCorrect[idx]) {
          slotExpected[idx] = unusedAnswers[unusedCursor]?.original ?? answers[idx];
          unusedCursor += 1;
        }
      }
    }
  }

  for (let idx = 0; idx < n; idx += 1) {
    if (groupedIndices.has(idx)) continue;
    const normUser = normalizeAnswer(userAnswers[idx] ?? '');
    const normExpected = normalizeAnswer(answers[idx]);
    slotCorrect[idx] = normUser.length > 0 && normUser === normExpected;
    slotExpected[idx] = answers[idx];
  }

  const allCorrect = n > 0 && slotCorrect.every(Boolean);
  return { allCorrect, slotCorrect, slotExpected };
}

export function shuffleArray<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
