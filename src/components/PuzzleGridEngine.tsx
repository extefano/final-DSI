import { useEffect, useMemo, useState } from 'react';
import { Check, Eye, EyeOff, Shuffle, X } from 'lucide-react';
import type { PuzzleGridExercise } from '../types/dsi';
import { getGridDiagramDataUri } from '../utils/diagramAssets';
import { shuffleArray } from '../utils/textNormalize';

interface PuzzleGridEngineProps {
  exercise: PuzzleGridExercise;
  checked: boolean;
  onResultReady: (isReady: boolean) => void;
  onEvaluate: (isCorrect: boolean, expectedSummary: string) => void;
  submitSignal: number;
}

function createScrambledIndices(total: number): number[] {
  const base = Array.from({ length: total }, (_, i) => i);
  if (total <= 1) return base;
  let shuffled = shuffleArray(base);
  let guard = 0;
  while (shuffled.every((val, idx) => val === idx) && guard < 10) {
    shuffled = shuffleArray(base);
    guard += 1;
  }
  if (shuffled.every((val, idx) => val === idx)) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  return shuffled;
}

export function PuzzleGridEngine({
  exercise,
  checked,
  onResultReady,
  onEvaluate,
  submitSignal,
}: PuzzleGridEngineProps) {
  const totalTiles = exercise.cols * exercise.rows;
  const fallbackUri = useMemo(
    () => getGridDiagramDataUri(exercise.diagramKind),
    [exercise.diagramKind]
  );

  const [resolvedSrc, setResolvedSrc] = useState<string>(fallbackUri);
  const [tilesOrder, setTilesOrder] = useState<number[]>(() =>
    createScrambledIndices(totalTiles)
  );
  const [selectedPos, setSelectedPos] = useState<number | null>(null);
  const [draggedPos, setDraggedPos] = useState<number | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  // Attempt loading external apunte image if specified; silently fall back to SVG diagram
  useEffect(() => {
    let active = true;
    setResolvedSrc(fallbackUri);
    if (exercise.image && !exercise.image.startsWith('data:')) {
      const img = new Image();
      img.onload = () => {
        if (active) setResolvedSrc(exercise.image);
      };
      img.onerror = () => {
        if (active) setResolvedSrc(fallbackUri);
      };
      img.src = exercise.image;
    }
    return () => {
      active = false;
    };
  }, [exercise.image, fallbackUri]);

  useEffect(() => {
    setTilesOrder(createScrambledIndices(totalTiles));
    setSelectedPos(null);
    setDraggedPos(null);
    setShowGuide(false);
  }, [exercise.id, totalTiles]);

  // Grid puzzles are always submittable once user arranges them
  useEffect(() => {
    onResultReady(true);
  }, [onResultReady]);

  useEffect(() => {
    if (submitSignal > 0 && !checked) {
      const isSolved = tilesOrder.every((tileIdx, posIdx) => tileIdx === posIdx);
      const summary = `Diagrama reconstruido correctamente en grilla ${exercise.cols}×${exercise.rows}.`;
      onEvaluate(isSolved, summary);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitSignal]);

  const swapPositions = (posA: number, posB: number) => {
    if (checked || posA === posB) return;
    setTilesOrder((prev) => {
      const next = [...prev];
      [next[posA], next[posB]] = [next[posB], next[posA]];
      return next;
    });
  };

  const handleTileTap = (posIdx: number) => {
    if (checked) return;
    if (selectedPos === null) {
      setSelectedPos(posIdx);
    } else if (selectedPos === posIdx) {
      setSelectedPos(null);
    } else {
      swapPositions(selectedPos, posIdx);
      setSelectedPos(null);
    }
  };

  const handleReshuffle = () => {
    if (checked) return;
    setTilesOrder(createScrambledIndices(totalTiles));
    setSelectedPos(null);
  };

  // Preserve exact 3:2 SVG proportions across any (cols x rows) grid layout
  const tileAspectRatio = `${3 * exercise.rows} / ${2 * exercise.cols}`;
  const isVerticalStack = exercise.cols === 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {exercise.caption} Tocá dos bloques para intercambiarlos o arrastralos a su posición.
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGuide((v) => !v)}
            className="duo-btn inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 border-b-4 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap"
          >
            {showGuide ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span>{showGuide ? 'Ocultar guía' : 'Ver referencia'}</span>
          </button>

          {!checked && (
            <button
              type="button"
              onClick={handleReshuffle}
              className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 whitespace-nowrap"
            >
              <Shuffle className="h-3.5 w-3.5" />
              <span>Mezclar</span>
            </button>
          )}
        </div>
      </div>

      {showGuide && (
        <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
          <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Referencia visual del diagrama completo
          </div>
          <img
            src={resolvedSrc}
            alt={exercise.topic}
            referrerPolicy="no-referrer"
            className="mx-auto max-h-56 w-auto rounded-xl border border-slate-200 dark:border-slate-700 object-contain"
          />
        </div>
      )}

      {/* Dynamic CSS sliced puzzle board */}
      <div
        className={`mx-auto w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 p-2 sm:p-3 ${
          isVerticalStack ? 'max-w-xl' : 'max-w-2xl'
        }`}
      >
        <div
          className="grid gap-1.5 sm:gap-2"
          style={{
            gridTemplateColumns: `repeat(${exercise.cols}, minmax(0, 1fr))`,
          }}
        >
          {tilesOrder.map((tileIdx, posIdx) => {
            const tileCol = tileIdx % exercise.cols;
            const tileRow = Math.floor(tileIdx / exercise.cols);

            const bgPosX =
              exercise.cols > 1 ? (tileCol / (exercise.cols - 1)) * 100 : 0;
            const bgPosY =
              exercise.rows > 1 ? (tileRow / (exercise.rows - 1)) * 100 : 0;

            const isSelected = selectedPos === posIdx;
            const isCorrectPos = tileIdx === posIdx;

            return (
              <button
                key={`pos_${posIdx}`}
                type="button"
                disabled={checked}
                draggable={!checked}
                onDragStart={() => setDraggedPos(posIdx)}
                onDragEnd={() => setDraggedPos(null)}
                onDragOver={(e) => {
                  if (!checked) e.preventDefault();
                }}
                onDrop={() => {
                  if (draggedPos !== null) {
                    swapPositions(draggedPos, posIdx);
                    setDraggedPos(null);
                  }
                }}
                onClick={() => handleTileTap(posIdx)}
                aria-label={`Celda ${posIdx + 1}`}
                style={{
                  aspectRatio: tileAspectRatio,
                  backgroundImage: `url("${resolvedSrc}")`,
                  backgroundSize: `${exercise.cols * 100}% ${exercise.rows * 100}%`,
                  backgroundPosition: `${bgPosX}% ${bgPosY}%`,
                  backgroundRepeat: 'no-repeat',
                }}
                className={`group relative overflow-hidden rounded-xl border-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  checked
                    ? isCorrectPos
                      ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                      : 'border-rose-500 ring-2 ring-rose-500/30'
                    : isSelected
                      ? 'scale-[0.98] border-blue-600 dark:border-blue-400 ring-4 ring-blue-500/35'
                      : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 cursor-pointer'
                }`}
              >
                {checked && (
                  <span
                    className={`absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-md shadow-sm ${
                      isCorrectPos
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {isCorrectPos ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
