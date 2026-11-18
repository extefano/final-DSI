import { useEffect, useMemo, useState } from 'react';
import { Keyboard, LayoutGrid, RotateCcw } from 'lucide-react';
import type { ClozeExercise } from '../types/dsi';
import {
  type ClozeEvaluation,
  evaluateClozeSlots,
  parseClozeTemplate,
  shuffleArray,
} from '../utils/textNormalize';

interface ClozeEngineProps {
  exercise: ClozeExercise;
  isMobileOrTouch: boolean;
  checked: boolean;
  onResultReady: (isReady: boolean) => void;
  onEvaluate: (isCorrect: boolean, expectedSummary: string) => void;
  submitSignal: number;
}

interface BankTile {
  uid: string;
  word: string;
}

export function ClozeEngine({
  exercise,
  isMobileOrTouch,
  checked,
  onResultReady,
  onEvaluate,
  submitSignal,
}: ClozeEngineProps) {
  const { segments, answers } = useMemo(
    () => parseClozeTemplate(exercise.template),
    [exercise.template]
  );

  // Desktop users default to inline typing, with an optional toggle to use the word tile bank
  const [forceTileMode, setForceTileMode] = useState(false);
  const [lockedTileMode, setLockedTileMode] = useState<boolean | null>(null);
  const [lockedEvaluation, setLockedEvaluation] = useState<ClozeEvaluation | null>(null);

  const liveTileMode = isMobileOrTouch || forceTileMode;
  const useTileMode = checked && lockedTileMode !== null ? lockedTileMode : liveTileMode;

  // Shuffled word bank for tile mode
  const initialBank = useMemo<BankTile[]>(() => {
    const combined = [...answers, ...exercise.distractors];
    return shuffleArray(combined).map((word, idx) => ({
      uid: `${exercise.id}_tile_${idx}_${word}`,
      word,
    }));
  }, [exercise.id, answers, exercise.distractors]);

  // Tile assignments: slotIndex -> BankTile | null
  const [slotTiles, setSlotTiles] = useState<Array<BankTile | null>>(() =>
    answers.map(() => null)
  );
  // Desktop typed values: slotIndex -> string
  const [typedValues, setTypedValues] = useState<string[]>(() => answers.map(() => ''));

  const [draggedTileUid, setDraggedTileUid] = useState<string | null>(null);

  // Reset local state when exercise changes
  useEffect(() => {
    setSlotTiles(answers.map(() => null));
    setTypedValues(answers.map(() => ''));
    setDraggedTileUid(null);
    setLockedTileMode(null);
    setLockedEvaluation(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id]);

  const usedTileUids = useMemo(() => {
    const set = new Set<string>();
    for (const tile of slotTiles) {
      if (tile) set.add(tile.uid);
    }
    return set;
  }, [slotTiles]);

  const isReady = useMemo(() => {
    if (useTileMode) {
      return slotTiles.every((tile) => tile !== null);
    }
    return typedValues.every((val) => val.trim().length > 0);
  }, [useTileMode, slotTiles, typedValues]);

  useEffect(() => {
    onResultReady(isReady);
  }, [isReady, onResultReady]);

  const currentUserAnswers = useMemo(
    () => (useTileMode ? slotTiles.map((t) => t?.word ?? '') : typedValues),
    [useTileMode, slotTiles, typedValues]
  );

  const liveEvaluation = useMemo(
    () => evaluateClozeSlots(answers, currentUserAnswers, exercise.unorderedGroups),
    [answers, currentUserAnswers, exercise.unorderedGroups]
  );
  const evaluation =
    checked && lockedEvaluation !== null ? lockedEvaluation : liveEvaluation;

  const hasUnorderedGroups = Boolean(
    exercise.unorderedGroups && exercise.unorderedGroups.length > 0
  );

  const evaluateCurrent = () => {
    setLockedTileMode(liveTileMode);
    setLockedEvaluation(liveEvaluation);
    const summary = answers.join(' · ');
    onEvaluate(liveEvaluation.allCorrect, summary);
  };

  // Trigger evaluation when parent Check button increments submitSignal
  useEffect(() => {
    if (submitSignal > 0 && !checked) {
      evaluateCurrent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitSignal]);

  const handlePlaceTileInNextEmpty = (tile: BankTile) => {
    if (checked || usedTileUids.has(tile.uid)) return;
    const nextEmptyIdx = slotTiles.findIndex((s) => s === null);
    if (nextEmptyIdx === -1) return;
    setSlotTiles((prev) => {
      const next = [...prev];
      next[nextEmptyIdx] = tile;
      return next;
    });
  };

  const handleReturnTileFromSlot = (slotIdx: number) => {
    if (checked) return;
    setSlotTiles((prev) => {
      if (!prev[slotIdx]) return prev;
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
  };

  const handleDropOnSlot = (slotIdx: number) => {
    if (checked || !draggedTileUid) return;
    const found = initialBank.find((t) => t.uid === draggedTileUid);
    if (!found) return;
    setSlotTiles((prev) => {
      const next = prev.map((existing) =>
        existing?.uid === found.uid ? null : existing
      );
      next[slotIdx] = found;
      return next;
    });
    setDraggedTileUid(null);
  };

  const handleClearAll = () => {
    if (checked) return;
    setSlotTiles(answers.map(() => null));
    setTypedValues(answers.map(() => ''));
  };

  return (
    <div className="space-y-6">
      {/* Mode indicator and optional Desktop tile toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {useTileMode
              ? 'Tocá o arrastrá las fichas correctas para completar la definición.'
              : 'Escribí los términos exactos en los espacios (sin preocuparte por mayúsculas o tildes).'}
          </p>
          {hasUnorderedGroups && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Los términos equivalentes dentro de una misma enumeración aceptan cualquier orden.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isMobileOrTouch && (
            <button
              type="button"
              onClick={() => setForceTileMode((prev) => !prev)}
              disabled={checked}
              className="duo-btn inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 border-b-4 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 whitespace-nowrap"
            >
              {useTileMode ? (
                <>
                  <Keyboard className="h-3.5 w-3.5" />
                  <span>Escribir en PC</span>
                </>
              ) : (
                <>
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Usar fichas</span>
                </>
              )}
            </button>
          )}

          {!checked && (
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {/* Definition Sentence Card */}
      <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 sm:p-7 text-base sm:text-lg leading-[2.35] text-slate-800 dark:text-slate-100">
        {segments.map((seg, idx) => {
          if (seg.type === 'text') {
            return <span key={`txt_${idx}`}>{seg.value}</span>;
          }

          const slotIdx = seg.slotIndex;
          const expected = seg.answer;

          if (useTileMode) {
            const placed = slotTiles[slotIdx];
            const isSlotCorrect =
              checked && placed !== null && Boolean(evaluation.slotCorrect[slotIdx]);
            const expectedLabel = evaluation.slotExpected[slotIdx] ?? expected;

            return (
              <span
                key={`slot_${slotIdx}`}
                onDragOver={(e) => {
                  if (!checked) e.preventDefault();
                }}
                onDrop={() => handleDropOnSlot(slotIdx)}
                className="inline-flex flex-wrap items-center align-middle mx-1 my-0.5"
              >
                <button
                  type="button"
                  disabled={checked || !placed}
                  onClick={() => handleReturnTileFromSlot(slotIdx)}
                  style={{ minWidth: `${Math.max(expected.length * 9 + 32, 96)}px` }}
                  className={`duo-btn inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 px-3.5 py-1.5 text-sm sm:text-base font-bold transition-colors ${
                    !placed
                      ? 'border-dashed border-slate-300 dark:border-slate-600 bg-slate-100/80 dark:bg-slate-800/70 text-slate-400 dark:text-slate-500'
                      : checked
                        ? isSlotCorrect
                          ? 'border-emerald-500 border-b-4 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'border-rose-500 border-b-4 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 line-through'
                        : 'border-blue-500 dark:border-blue-400 border-b-4 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/60 cursor-pointer'
                  }`}
                >
                  {placed ? placed.word : `(${slotIdx + 1})`}
                </button>
                {checked && !isSlotCorrect && (
                  <span className="ml-1.5 inline-flex items-center rounded-lg bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    {expectedLabel}
                  </span>
                )}
              </span>
            );
          }

          // Desktop inline input mode
          const currentVal = typedValues[slotIdx] ?? '';
          const isInputCorrect = checked && Boolean(evaluation.slotCorrect[slotIdx]);
          const expectedLabel = evaluation.slotExpected[slotIdx] ?? expected;
          const charWidth = Math.max(expected.length, currentVal.length, 8);

          return (
            <span
              key={`input_${slotIdx}`}
              className="inline-flex flex-wrap items-center align-middle mx-1 my-0.5"
            >
              <input
                type="text"
                value={currentVal}
                disabled={checked}
                aria-label={`Espacio ${slotIdx + 1}`}
                placeholder="..."
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                onChange={(e) => {
                  const val = e.target.value;
                  setTypedValues((prev) => {
                    const next = [...prev];
                    next[slotIdx] = val;
                    return next;
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isReady && !checked) {
                    e.preventDefault();
                    evaluateCurrent();
                  }
                }}
                style={{ width: `${Math.min(charWidth + 3, 28)}ch` }}
                className={`inline-block rounded-xl border-2 px-3 py-1 text-center text-sm sm:text-base font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  checked
                    ? isInputCorrect
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      : 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                    : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-900'
                }`}
              />
              {checked && !isInputCorrect && (
                <span className="ml-1.5 inline-flex items-center rounded-lg bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  {expectedLabel}
                </span>
              )}
            </span>
          );
        })}
      </div>

      {/* Shuffled Word Tile Bank */}
      {useTileMode && (
        <div className="space-y-2.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Banco de términos
          </div>
          <div className="flex flex-wrap gap-2.5">
            {initialBank.map((tile) => {
              const isUsed = usedTileUids.has(tile.uid);
              return (
                <button
                  key={tile.uid}
                  type="button"
                  disabled={checked || isUsed}
                  draggable={!checked && !isUsed}
                  onDragStart={() => setDraggedTileUid(tile.uid)}
                  onDragEnd={() => setDraggedTileUid(null)}
                  onClick={() => handlePlaceTileInNextEmpty(tile)}
                  className={`duo-btn min-h-[44px] rounded-xl border-2 px-4 py-2 text-sm sm:text-base font-bold select-none ${
                    isUsed
                      ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50 text-transparent shadow-none cursor-default'
                      : 'border-slate-300 dark:border-slate-600 border-b-4 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-slate-700 cursor-pointer'
                  }`}
                >
                  {tile.word}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
