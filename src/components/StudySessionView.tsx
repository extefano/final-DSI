import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Flame,
  RotateCw,
  XCircle,
} from 'lucide-react';
import type { Exercise, ProgressState } from '../types/dsi';
import { ClozeEngine } from './ClozeEngine';
import { PuzzleDiagramEngine } from './PuzzleDiagramEngine';
import { PuzzleGridEngine } from './PuzzleGridEngine';

interface StudySessionViewProps {
  title: string;
  isReviewMode: boolean;
  exercises: Exercise[];
  isMobileOrTouch: boolean;
  progress: ProgressState;
  initialIndex: number;
  initialStats: { correct: number; total: number };
  syncVersion: number;
  onOutcome: (
    exerciseId: string,
    isCorrect: boolean,
    nextIndex: number,
    nextStats: { correct: number; total: number }
  ) => void;
  onStepSession: (
    nextIndex: number,
    nextStats: { correct: number; total: number }
  ) => void;
  onFinishSession: () => void;
  onExit: () => void;
  onJumpToReview: () => void;
}

export function StudySessionView({
  title,
  isReviewMode,
  exercises,
  isMobileOrTouch,
  progress,
  initialIndex,
  initialStats,
  syncVersion,
  onOutcome,
  onStepSession,
  onFinishSession,
  onExit,
  onJumpToReview,
}: StudySessionViewProps) {
  // Keep review round list stable while the user progresses through a round
  const [reviewSnapshot, setReviewSnapshot] = useState<Exercise[]>(() =>
    isReviewMode ? exercises : []
  );
  const activeExercises = isReviewMode ? reviewSnapshot : exercises;

  const [currentIndex, setCurrentIndex] = useState(() =>
    activeExercises.length > 0
      ? Math.min(Math.max(0, initialIndex), activeExercises.length - 1)
      : 0
  );
  const [canSubmit, setCanSubmit] = useState(false);
  const [submitSignal, setSubmitSignal] = useState(0);
  const [checked, setChecked] = useState(false);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    summary: string;
  } | null>(null);
  const [sessionStats, setSessionStats] = useState(initialStats);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (isReviewMode && reviewSnapshot.length === 0 && exercises.length > 0 && !finished) {
      setReviewSnapshot(exercises);
    }
  }, [isReviewMode, reviewSnapshot.length, exercises, finished]);

  // Sync position/stats when a genuine remote cloud snapshot arrives while not reviewing feedback
  useEffect(() => {
    if (syncVersion === 0) return;
    if (checked) {
      setSessionStats(initialStats);
      return;
    }

    const list = isReviewMode ? exercises : activeExercises;
    const nextSafe =
      list.length > 0 ? Math.min(Math.max(0, initialIndex), list.length - 1) : 0;

    if (isReviewMode) {
      setReviewSnapshot(exercises);
    }
    setSessionStats(initialStats);
    if (currentIndex !== nextSafe) {
      setCurrentIndex(nextSafe);
      setChecked(false);
      setFeedback(null);
      setCanSubmit(false);
      setSubmitSignal(0);
      setFinished(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncVersion]);

  const safeIndex =
    activeExercises.length > 0
      ? Math.min(Math.max(0, currentIndex), activeExercises.length - 1)
      : 0;
  const currentExercise = activeExercises[safeIndex];

  const handleResultReady = useCallback((ready: boolean) => {
    setCanSubmit(ready);
  }, []);

  const handleEvaluate = useCallback(
    (isCorrect: boolean, expectedSummary: string) => {
      if (!currentExercise || checked) return;
      const nextStats = {
        correct: sessionStats.correct + (isCorrect ? 1 : 0),
        total: sessionStats.total + 1,
      };
      const savedIndex =
        safeIndex + 1 < activeExercises.length ? safeIndex + 1 : safeIndex;

      setChecked(true);
      setFeedback({ isCorrect, summary: expectedSummary });
      setSessionStats(nextStats);
      onOutcome(currentExercise.id, isCorrect, savedIndex, nextStats);
    },
    [
      currentExercise,
      checked,
      sessionStats,
      safeIndex,
      activeExercises.length,
      onOutcome,
    ]
  );

  const handleTriggerCheck = () => {
    if (!canSubmit || checked) return;
    setSubmitSignal((s) => s + 1);
  };

  const handleNext = () => {
    if (safeIndex + 1 >= activeExercises.length) {
      setFinished(true);
      onFinishSession();
      return;
    }
    const nextIdx = safeIndex + 1;
    setCurrentIndex(nextIdx);
    setChecked(false);
    setFeedback(null);
    setCanSubmit(false);
    setSubmitSignal(0);
    onStepSession(nextIdx, sessionStats);
  };

  if (activeExercises.length === 0 || !currentExercise) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center space-y-5">
        <div className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 space-y-4">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            ¡Cola de repaso vacía!
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
            Superaste todos tus errores previos con 2 aciertos consecutivos.
          </p>
          <button
            type="button"
            onClick={onExit}
            className="duo-btn inline-flex min-h-[46px] items-center gap-2 rounded-xl border-2 border-emerald-600 border-b-4 bg-emerald-600 hover:bg-emerald-500 px-6 text-sm font-bold text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver a las unidades</span>
          </button>
        </div>
      </main>
    );
  }

  if (finished) {
    const accuracy =
      sessionStats.total > 0
        ? Math.round((sessionStats.correct / sessionStats.total) * 100)
        : 100;
    const pendingReviewCount = Object.keys(progress.reviewQueue).length;

    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-9 text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400">
            <Award className="h-9 w-9" />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              {isReviewMode ? 'Ronda de repaso finalizada' : 'Sesión completada'}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {title}
            </h1>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 p-4">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Precisión
              </div>
              <div className="mt-1 font-display text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {accuracy}%
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 p-4">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Aciertos
              </div>
              <div className="mt-1 font-display text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {sessionStats.correct}/{sessionStats.total}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 p-4">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Racha
              </div>
              <div className="mt-1 font-display text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {progress.streak}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onExit}
              className="duo-btn w-full sm:w-auto min-h-[46px] rounded-xl border-2 border-emerald-600 border-b-4 bg-emerald-600 hover:bg-emerald-500 px-6 text-sm font-bold text-white"
            >
              Volver a Unidades
            </button>

            {pendingReviewCount > 0 && (
              <button
                type="button"
                onClick={onJumpToReview}
                className="duo-btn w-full sm:w-auto min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl border-2 border-amber-600 border-b-4 bg-amber-500 hover:bg-amber-400 px-6 text-sm font-bold text-slate-950"
              >
                <RotateCw className="h-4 w-4" />
                <span>Repasar errores ({pendingReviewCount})</span>
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  const progressPct = Math.round(
    ((safeIndex + (checked ? 1 : 0)) / activeExercises.length) * 100
  );
  const reviewHits = progress.reviewQueue[currentExercise.id];

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col justify-between">
      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 pt-5 pb-32 space-y-6">
        {/* Session Progress Header */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onExit}
            aria-label="Salir de la sesión"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span className="truncate max-w-[200px] sm:max-w-sm">{title}</span>
              <span className="font-mono tabular-nums">
                {safeIndex + 1} / {activeExercises.length}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isReviewMode ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.max(progressPct, 6)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1 font-mono text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400 shrink-0">
            <Flame className="h-4 w-4" />
            <span>{progress.streak}</span>
          </div>
        </div>

        {/* Exercise Header */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>
              {currentExercise.type === 'cloze'
                ? 'Completar definición'
                : currentExercise.type === 'puzzle_grid'
                  ? 'Rompecabezas de diagrama'
                  : 'Diagrama interactivo'}
            </span>
            {reviewHits !== undefined && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-700 dark:text-amber-400 font-bold">
                  Repaso de errores: {reviewHits}/2 aciertos seguidos
                </span>
              </>
            )}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {currentExercise.topic}
          </h1>
        </div>

        {/* Active Interactive Engine */}
        {currentExercise.type === 'cloze' && (
          <ClozeEngine
            key={currentExercise.id}
            exercise={currentExercise}
            isMobileOrTouch={isMobileOrTouch}
            checked={checked}
            onResultReady={handleResultReady}
            onEvaluate={handleEvaluate}
            submitSignal={submitSignal}
          />
        )}

        {currentExercise.type === 'puzzle_grid' && (
          <PuzzleGridEngine
            key={currentExercise.id}
            exercise={currentExercise}
            checked={checked}
            onResultReady={handleResultReady}
            onEvaluate={handleEvaluate}
            submitSignal={submitSignal}
          />
        )}

        {currentExercise.type === 'puzzle_diagram' && (
          <PuzzleDiagramEngine
            key={currentExercise.id}
            exercise={currentExercise}
            checked={checked}
            onResultReady={handleResultReady}
            onEvaluate={handleEvaluate}
            submitSignal={submitSignal}
          />
        )}
      </main>

      {/* Bottom Verification & Feedback Dock */}
      <footer
        className={`sticky bottom-0 z-20 border-t-2 transition-colors ${
          feedback
            ? feedback.isCorrect
              ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/95'
              : 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/95'
            : 'border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md'
        }`}
      >
        <div className="mx-auto flex max-w-3xl flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3.5">
          {feedback ? (
            <div className="animate-panel-up flex items-start gap-3 min-w-0">
              {feedback.isCorrect ? (
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-rose-600 dark:text-rose-400" />
              )}
              <div className="min-w-0">
                <div
                  className={`font-display text-base font-bold ${
                    feedback.isCorrect
                      ? 'text-emerald-900 dark:text-emerald-100'
                      : 'text-rose-900 dark:text-rose-100'
                  }`}
                >
                  {feedback.isCorrect
                    ? '¡Excelente! Respuesta correcta'
                    : 'Revisá este concepto (agregado a Repaso)'}
                </div>
                {!feedback.isCorrect && (
                  <p className="mt-0.5 text-xs sm:text-sm font-semibold text-rose-800 dark:text-rose-200">
                    Solución: {feedback.summary}
                  </p>
                )}
                {currentExercise.explanation && (
                  <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">
                    {currentExercise.explanation}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden sm:block text-xs font-medium text-slate-500 dark:text-slate-400">
              {canSubmit
                ? 'Todo listo para verificar tu respuesta.'
                : 'Completá todos los espacios o piezas para comprobar.'}
            </div>
          )}

          {!checked ? (
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleTriggerCheck}
              className="duo-btn w-full sm:w-auto min-h-[46px] rounded-xl border-2 border-emerald-600 border-b-4 bg-emerald-600 hover:bg-emerald-500 disabled:border-slate-200 dark:disabled:border-slate-800 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 px-8 text-sm font-bold text-white whitespace-nowrap shrink-0"
            >
              Comprobar
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className={`duo-btn w-full sm:w-auto min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl border-2 border-b-4 px-8 text-sm font-bold text-white whitespace-nowrap shrink-0 ${
                feedback?.isCorrect
                  ? 'border-emerald-700 bg-emerald-600 hover:bg-emerald-500'
                  : 'border-rose-700 bg-rose-600 hover:bg-rose-500'
              }`}
            >
              <span>
                {safeIndex + 1 >= activeExercises.length ? 'Finalizar' : 'Continuar'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
