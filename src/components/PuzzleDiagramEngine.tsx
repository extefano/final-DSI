import { useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { DiagramTemplateId, PuzzleDiagramExercise } from '../types/dsi';
import { shuffleArray } from '../utils/textNormalize';

interface PuzzleDiagramEngineProps {
  exercise: PuzzleDiagramExercise;
  checked: boolean;
  onResultReady: (isReady: boolean) => void;
  onEvaluate: (isCorrect: boolean, expectedSummary: string) => void;
  submitSignal: number;
}

interface PieceItem {
  uid: string;
  label: string;
}

function DiagramVisualHeader({
  template,
  slotIndex,
}: {
  template: DiagramTemplateId;
  slotIndex: number;
}) {
  if (template === 'uml_relations') {
    // Authentic UML notation glyphs per slot index
    const glyphs = [
      // 0: Herencia / Generalización (solid line + hollow triangle)
      <svg key="g0" viewBox="0 0 120 28" className="h-7 w-28 shrink-0">
        <line x1="8" y1="14" x2="90" y2="14" stroke="currentColor" strokeWidth="2.5" />
        <polygon points="90,6 108,14 90,22" fill="none" stroke="currentColor" strokeWidth="2.5" />
      </svg>,
      // 1: Dependencia (dashed line + open arrow)
      <svg key="g1" viewBox="0 0 120 28" className="h-7 w-28 shrink-0">
        <line x1="8" y1="14" x2="104" y2="14" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 5" />
        <polyline points="92,7 106,14 92,21" fill="none" stroke="currentColor" strokeWidth="2.5" />
      </svg>,
      // 2: Realización (dashed line + hollow triangle)
      <svg key="g2" viewBox="0 0 120 28" className="h-7 w-28 shrink-0">
        <line x1="8" y1="14" x2="90" y2="14" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 5" />
        <polygon points="90,6 108,14 90,22" fill="none" stroke="currentColor" strokeWidth="2.5" />
      </svg>,
      // 3: Composición (solid line + filled diamond)
      <svg key="g3" viewBox="0 0 120 28" className="h-7 w-28 shrink-0">
        <polygon points="8,14 22,7 36,14 22,21" fill="currentColor" stroke="currentColor" strokeWidth="2" />
        <line x1="36" y1="14" x2="110" y2="14" stroke="currentColor" strokeWidth="2.5" />
      </svg>,
      // 4: Agregación (solid line + hollow diamond)
      <svg key="g4" viewBox="0 0 120 28" className="h-7 w-28 shrink-0">
        <polygon points="8,14 22,7 36,14 22,21" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <line x1="36" y1="14" x2="110" y2="14" stroke="currentColor" strokeWidth="2.5" />
      </svg>,
    ];
    return (
      <div className="text-slate-700 dark:text-slate-200">
        {glyphs[slotIndex % glyphs.length]}
      </div>
    );
  }

  if (template === 'bce_stereotypes') {
    // Classic Jacobson Robustness / BCE symbols
    const glyphs = [
      // Boundary (|-O)
      <svg key="b0" viewBox="0 0 56 44" className="h-10 w-14 shrink-0">
        <line x1="10" y1="8" x2="10" y2="36" stroke="currentColor" strokeWidth="2.5" />
        <line x1="10" y1="22" x2="20" y2="22" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="34" cy="22" r="13" fill="none" stroke="currentColor" strokeWidth="2.5" />
      </svg>,
      // Control (O with top arrow)
      <svg key="b1" viewBox="0 0 56 44" className="h-10 w-14 shrink-0">
        <circle cx="28" cy="24" r="13" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <polyline points="23,7 29,11 23,15" fill="none" stroke="currentColor" strokeWidth="2.5" />
      </svg>,
      // Entity (O sitting on baseline)
      <svg key="b2" viewBox="0 0 56 44" className="h-10 w-14 shrink-0">
        <circle cx="28" cy="20" r="13" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <line x1="12" y1="36" x2="44" y2="36" stroke="currentColor" strokeWidth="2.5" />
      </svg>,
    ];
    return (
      <div className="text-blue-600 dark:text-blue-400">
        {glyphs[slotIndex % glyphs.length]}
      </div>
    );
  }

  // Clean structural node index badge for architectural/pattern diagrams
  return (
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold tabular-nums text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
      0{slotIndex + 1}
    </span>
  );
}

export function PuzzleDiagramEngine({
  exercise,
  checked,
  onResultReady,
  onEvaluate,
  submitSignal,
}: PuzzleDiagramEngineProps) {
  const bankPieces = useMemo<PieceItem[]>(() => {
    const allLabels = [
      ...exercise.slots.map((s) => s.correctPiece),
      ...exercise.distractors,
    ];
    return shuffleArray(allLabels).map((label, idx) => ({
      uid: `${exercise.id}_piece_${idx}_${label}`,
      label,
    }));
  }, [exercise.id, exercise.slots, exercise.distractors]);

  const [assignments, setAssignments] = useState<Record<string, PieceItem | null>>({});
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [draggedPieceUid, setDraggedPieceUid] = useState<string | null>(null);

  useEffect(() => {
    const initial: Record<string, PieceItem | null> = {};
    for (const s of exercise.slots) {
      initial[s.id] = null;
    }
    setAssignments(initial);
    setActiveSlotId(exercise.slots[0]?.id ?? null);
    setDraggedPieceUid(null);
  }, [exercise.id, exercise.slots]);

  const usedPieceUids = useMemo(() => {
    const set = new Set<string>();
    for (const item of Object.values(assignments)) {
      if (item) set.add(item.uid);
    }
    return set;
  }, [assignments]);

  const isReady = useMemo(() => {
    return exercise.slots.every((s) => assignments[s.id] != null);
  }, [exercise.slots, assignments]);

  useEffect(() => {
    onResultReady(isReady);
  }, [isReady, onResultReady]);

  useEffect(() => {
    if (submitSignal > 0 && !checked) {
      const allCorrect = exercise.slots.every(
        (s) => assignments[s.id]?.label === s.correctPiece
      );
      const summary = exercise.slots
        .map((s) => `${s.label} → ${s.correctPiece}`)
        .join(' | ');
      onEvaluate(allCorrect, summary);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitSignal]);

  const placePiece = (slotId: string, piece: PieceItem) => {
    if (checked) return;
    setAssignments((prev) => {
      const next: Record<string, PieceItem | null> = {};
      for (const [k, v] of Object.entries(prev)) {
        next[k] = v?.uid === piece.uid ? null : v;
      }
      next[slotId] = piece;
      return next;
    });

    // Advance active target to next empty slot
    const nextEmpty = exercise.slots.find(
      (s) => s.id !== slotId && !assignments[s.id]
    );
    setActiveSlotId(nextEmpty ? nextEmpty.id : null);
  };

  const handlePieceTap = (piece: PieceItem) => {
    if (checked || usedPieceUids.has(piece.uid)) return;
    const targetId =
      activeSlotId && !assignments[activeSlotId]
        ? activeSlotId
        : exercise.slots.find((s) => !assignments[s.id])?.id;

    if (!targetId) return;
    placePiece(targetId, piece);
  };

  const handleSlotTap = (slotId: string) => {
    if (checked) return;
    if (assignments[slotId]) {
      setAssignments((prev) => ({ ...prev, [slotId]: null }));
      setActiveSlotId(slotId);
    } else {
      setActiveSlotId(slotId);
    }
  };

  const handleClear = () => {
    if (checked) return;
    const empty: Record<string, PieceItem | null> = {};
    for (const s of exercise.slots) empty[s.id] = null;
    setAssignments(empty);
    setActiveSlotId(exercise.slots[0]?.id ?? null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {exercise.caption ??
            'Seleccioná una ranura del esquema y asignale la pieza correspondiente.'}
        </p>

        {!checked && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Limpiar</span>
          </button>
        )}
      </div>

      {/* Interactive Structural Diagram Board */}
      <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-6">
        <div className="grid gap-3">
          {exercise.slots.map((slot, idx) => {
            const placed = assignments[slot.id] ?? null;
            const isSlotActive = !checked && activeSlotId === slot.id;
            const isCorrect =
              checked && placed?.label === slot.correctPiece;

            return (
              <div
                key={slot.id}
                onDragOver={(e) => {
                  if (!checked) e.preventDefault();
                }}
                onDrop={() => {
                  if (!draggedPieceUid) return;
                  const found = bankPieces.find((p) => p.uid === draggedPieceUid);
                  if (found) placePiece(slot.id, found);
                  setDraggedPieceUid(null);
                }}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border-2 p-3.5 transition-colors ${
                  checked
                    ? isCorrect
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30'
                      : 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/30'
                    : isSlotActive
                      ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <DiagramVisualHeader
                    template={exercise.svgTemplate}
                    slotIndex={idx}
                  />
                  <div className="min-w-0">
                    <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      {slot.label}
                    </div>
                    {slot.hint && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {slot.hint}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={checked}
                    onClick={() => handleSlotTap(slot.id)}
                    className={`duo-btn min-h-[44px] min-w-[200px] sm:min-w-[240px] rounded-xl border-2 px-3.5 py-2 text-left sm:text-center text-xs sm:text-sm font-bold transition-colors ${
                      !placed
                        ? isSlotActive
                          ? 'border-dashed border-blue-500 bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400'
                          : 'border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500'
                        : checked
                          ? isCorrect
                            ? 'border-emerald-600 border-b-4 bg-emerald-600 text-white'
                            : 'border-rose-600 border-b-4 bg-rose-600 text-white'
                          : 'border-blue-600 dark:border-blue-500 border-b-4 bg-blue-600 text-white hover:bg-blue-500 cursor-pointer'
                    }`}
                  >
                    {placed
                      ? placed.label
                      : isSlotActive
                        ? 'Elegí una pieza abajo...'
                        : 'Tocar para asignar'}
                  </button>

                  {checked && !isCorrect && (
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      Correcta: {slot.correctPiece}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Piece Bank */}
      <div className="space-y-2.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Piezas disponibles
        </div>
        <div className="flex flex-wrap gap-2.5">
          {bankPieces.map((piece) => {
            const isUsed = usedPieceUids.has(piece.uid);
            return (
              <button
                key={piece.uid}
                type="button"
                disabled={checked || isUsed}
                draggable={!checked && !isUsed}
                onDragStart={() => setDraggedPieceUid(piece.uid)}
                onDragEnd={() => setDraggedPieceUid(null)}
                onClick={() => handlePieceTap(piece)}
                className={`duo-btn min-h-[44px] rounded-xl border-2 px-4 py-2 text-xs sm:text-sm font-bold text-left ${
                  isUsed
                    ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/40 text-transparent shadow-none cursor-default'
                    : 'border-slate-300 dark:border-slate-600 border-b-4 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer'
                }`}
              >
                {piece.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
