import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDashed,
  Eye,
  GraduationCap,
  HelpCircle,
  NotebookPen,
  RefreshCw,
  RotateCw,
  Shuffle,
  ShieldAlert,
  Target,
} from 'lucide-react';
import type {
  ActiveStudySession,
  OralDeckData,
  OralDeckMode,
  OralQuestion,
  OralQuestionCategory,
  OralRatingLevel,
  ProgressState,
} from '../types/dsi';
import { shuffleArray } from '../utils/textNormalize';

interface OralExamViewProps {
  deck: OralDeckData | null;
  loading: boolean;
  error: string | null;
  onRetryLoad: () => void;
  progress: ProgressState;
  savedSession: ActiveStudySession;
  syncVersion: number;
  onStartRound: (mode: OralDeckMode, queueIds: string[]) => void;
  onRateQuestion: (
    questionId: string,
    rating: OralRatingLevel,
    nextSession: ActiveStudySession
  ) => void;
  onExitToLobby: () => void;
  onExitToUnits: () => void;
}

type CategoryFilter = 'todas' | OralQuestionCategory;
type RoundSizeOption = 8 | 15 | 0; // 0 = all available

interface RoundResultEntry {
  questionId: string;
  rating: OralRatingLevel;
}

const CATEGORY_LABEL: Record<OralQuestionCategory, string> = {
  integradora: 'Pregunta integradora',
  comparacion: 'Comparación de tribunal',
  trampa: 'Pregunta trampa',
};

const MODE_LABEL: Record<OralDeckMode, string> = {
  mixed: 'Simulacro completo mezclado',
  weak: 'Refuerzo de débiles y pendientes',
  traps: 'Trampas y comparaciones',
};

function RatingLabel({ rating }: { rating?: OralRatingLevel }) {
  if (rating === 'high') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap shrink-0">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>Lo domino</span>
      </span>
    );
  }
  if (rating === 'mid') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap shrink-0">
        <HelpCircle className="h-3.5 w-3.5" />
        <span>Con dudas</span>
      </span>
    );
  }
  if (rating === 'low') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400 whitespace-nowrap shrink-0">
        <RotateCw className="h-3.5 w-3.5" />
        <span>Repasar</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
      <CircleDashed className="h-3.5 w-3.5" />
      <span>Sin evaluar</span>
    </span>
  );
}

export function OralExamView({
  deck,
  loading,
  error,
  onRetryLoad,
  progress,
  savedSession,
  syncVersion,
  onStartRound,
  onRateQuestion,
  onExitToLobby,
  onExitToUnits,
}: OralExamViewProps) {
  const [roundSize, setRoundSize] = useState<RoundSizeOption>(8);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('todas');

  // Local active-card transient states
  const [revealed, setRevealed] = useState(false);
  const [checkedPoints, setCheckedPoints] = useState<Set<number>>(() => new Set());
  const [showNotes, setShowNotes] = useState(false);
  const [scratchNotes, setScratchNotes] = useState('');
  const [showFollowUpAnswer, setShowFollowUpAnswer] = useState(false);

  // Completed round summary state
  const [roundSummary, setRoundSummary] = useState<RoundResultEntry[] | null>(null);
  const [currentRoundResults, setCurrentRoundResults] = useState<RoundResultEntry[]>([]);

  const oralRatings = progress.oralRatings ?? {};

  const questionMap = useMemo(() => {
    const map = new Map<string, OralQuestion>();
    if (deck) {
      for (const q of deck.questions) {
        map.set(q.id, q);
      }
    }
    return map;
  }, [deck]);

  const activeQueue = useMemo(() => {
    if (
      savedSession.view !== 'oral' ||
      !savedSession.oralQueueIds ||
      savedSession.oralQueueIds.length === 0
    ) {
      return [];
    }
    return savedSession.oralQueueIds
      .map((id) => questionMap.get(id))
      .filter((q): q is OralQuestion => Boolean(q));
  }, [savedSession.view, savedSession.oralQueueIds, questionMap]);

  const safeIndex =
    activeQueue.length > 0
      ? Math.min(Math.max(0, savedSession.exerciseIndex), activeQueue.length - 1)
      : 0;
  const activeQuestion = activeQueue[safeIndex] ?? null;

  // Reset transient reveal/checklist state when moving to a new question or syncing externally
  useEffect(() => {
    setRevealed(false);
    setCheckedPoints(new Set());
    setShowNotes(false);
    setScratchNotes('');
    setShowFollowUpAnswer(false);
  }, [activeQuestion?.id, safeIndex, syncVersion]);

  const stats = useMemo(() => {
    const questions = deck?.questions ?? [];
    let high = 0;
    let mid = 0;
    let low = 0;
    let unrated = 0;
    for (const q of questions) {
      const r = oralRatings[q.id];
      if (r === 'high') high += 1;
      else if (r === 'mid') mid += 1;
      else if (r === 'low') low += 1;
      else unrated += 1;
    }
    return { total: questions.length, high, mid, low, unrated };
  }, [deck, oralRatings]);

  const filteredBank = useMemo(() => {
    if (!deck) return [];
    if (categoryFilter === 'todas') return deck.questions;
    return deck.questions.filter((q) => q.category === categoryFilter);
  }, [deck, categoryFilter]);

  const buildQueueForMode = (mode: OralDeckMode, limitOverride?: number): string[] => {
    if (!deck || deck.questions.length === 0) return [];
    const limit = limitOverride ?? (roundSize === 0 ? deck.questions.length : roundSize);

    let ordered: OralQuestion[];
    if (mode === 'traps') {
      const subset = deck.questions.filter(
        (q) => q.category === 'trampa' || q.category === 'comparacion'
      );
      ordered = shuffleArray(subset);
    } else if (mode === 'weak') {
      const lowList = shuffleArray(deck.questions.filter((q) => oralRatings[q.id] === 'low'));
      const midList = shuffleArray(deck.questions.filter((q) => oralRatings[q.id] === 'mid'));
      const unratedList = shuffleArray(deck.questions.filter((q) => !oralRatings[q.id]));
      const highList = shuffleArray(deck.questions.filter((q) => oralRatings[q.id] === 'high'));
      ordered = [...lowList, ...midList, ...unratedList, ...highList];
    } else {
      ordered = shuffleArray(deck.questions);
    }

    return ordered.slice(0, Math.min(limit, ordered.length)).map((q) => q.id);
  };

  const handleLaunchMode = (mode: OralDeckMode) => {
    const queueIds = buildQueueForMode(mode);
    if (queueIds.length === 0) return;
    setRoundSummary(null);
    setCurrentRoundResults([]);
    onStartRound(mode, queueIds);
  };

  const handleLaunchSingleFromBank = (question: OralQuestion) => {
    if (!deck) return;
    const remaining = shuffleArray(
      deck.questions.filter((q) => q.id !== question.id)
    ).slice(0, 7);
    const queueIds = [question.id, ...remaining.map((q) => q.id)];
    setRoundSummary(null);
    setCurrentRoundResults([]);
    onStartRound('mixed', queueIds);
  };

  const handleRateCurrent = (rating: OralRatingLevel) => {
    if (!activeQuestion) return;
    const nextResults = [
      ...currentRoundResults,
      { questionId: activeQuestion.id, rating },
    ];
    const isLast = safeIndex + 1 >= activeQueue.length;
    const nextCorrect =
      savedSession.sessionCorrect + (rating === 'high' ? 1 : 0);
    const nextTotal = savedSession.sessionTotal + 1;

    if (isLast) {
      setRoundSummary(nextResults);
      setCurrentRoundResults([]);
      onRateQuestion(activeQuestion.id, rating, {
        view: 'oral',
        unitId: null,
        exerciseIndex: 0,
        sessionCorrect: 0,
        sessionTotal: 0,
      });
      return;
    }

    setCurrentRoundResults(nextResults);
    onRateQuestion(activeQuestion.id, rating, {
      view: 'oral',
      unitId: null,
      exerciseIndex: safeIndex + 1,
      sessionCorrect: nextCorrect,
      sessionTotal: nextTotal,
      oralMode: savedSession.oralMode ?? 'mixed',
      oralQueueIds: savedSession.oralQueueIds,
    });
  };

  const togglePoint = (idx: number) => {
    setCheckedPoints((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-10 space-y-5">
        <div className="h-52 animate-pulse rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            />
          ))}
        </div>
      </main>
    );
  }

  if (error || !deck) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-3xl border-2 border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 p-8 space-y-4">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-500" />
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            No se pudo cargar el Simulacro Oral
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {error ?? 'Banco de preguntas orales no disponible.'}
          </p>
          <button
            type="button"
            onClick={onRetryLoad}
            className="duo-btn inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-blue-600 border-b-4 bg-blue-600 px-5 text-sm font-bold text-white whitespace-nowrap"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reintentar</span>
          </button>
        </div>
      </main>
    );
  }

  // Round Summary Screen
  if (roundSummary) {
    const highCount = roundSummary.filter((r) => r.rating === 'high').length;
    const midCount = roundSummary.filter((r) => r.rating === 'mid').length;
    const lowCount = roundSummary.filter((r) => r.rating === 'low').length;
    const weakIds = roundSummary
      .filter((r) => r.rating === 'low' || r.rating === 'mid')
      .map((r) => r.questionId);

    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-9 text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400">
            <Award className="h-9 w-9" />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Mesa examinadora completada
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Balance de tu defensa oral
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Cada autoevaluación quedó guardada y sincronizada para priorizar tus puntos débiles en la próxima ronda.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 p-4">
              <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                Lo domino
              </div>
              <div className="mt-1 font-display text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                {highCount}
              </div>
            </div>
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-4">
              <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                Con dudas
              </div>
              <div className="mt-1 font-display text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
                {midCount}
              </div>
            </div>
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-4">
              <div className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                A repasar
              </div>
              <div className="mt-1 font-display text-2xl font-bold tabular-nums text-rose-700 dark:text-rose-400">
                {lowCount}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {weakIds.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setRoundSummary(null);
                  setCurrentRoundResults([]);
                  onStartRound('weak', shuffleArray(weakIds));
                }}
                className="duo-btn w-full sm:w-auto min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl border-2 border-amber-600 border-b-4 bg-amber-500 hover:bg-amber-400 px-6 text-sm font-bold text-slate-950 whitespace-nowrap"
              >
                <RotateCw className="h-4 w-4" />
                <span>Repasar débiles ({weakIds.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setRoundSummary(null);
                onExitToLobby();
              }}
              className="duo-btn w-full sm:w-auto min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-600 border-b-4 bg-emerald-600 hover:bg-emerald-500 px-6 text-sm font-bold text-white whitespace-nowrap"
            >
              <span>Volver al vestíbulo oral</span>
            </button>

            <button
              type="button"
              onClick={onExitToUnits}
              className="min-h-[46px] rounded-xl px-4 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              Ir a Unidades
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Active Oral Defense Stage
  if (activeQuestion) {
    const activeMode = savedSession.oralMode ?? 'mixed';
    const progressPct = Math.round(
      ((safeIndex + (revealed ? 1 : 0)) / activeQueue.length) * 100
    );
    const savedRating = oralRatings[activeQuestion.id];

    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col justify-between">
        <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 pt-5 pb-32 space-y-6">
          {/* Top Session Progress Bar */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => {
                setCurrentRoundResults([]);
                onExitToLobby();
              }}
              aria-label="Volver al vestíbulo del simulacro"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span className="truncate max-w-[210px] sm:max-w-md">
                  {MODE_LABEL[activeMode]}
                </span>
                <span className="font-mono tabular-nums">
                  {safeIndex + 1} / {activeQueue.length}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${Math.max(progressPct, 6)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Unboxed Metadata + Tribunal Prompt */}
          <section className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <div className="flex flex-wrap items-center gap-2">
                <span>{CATEGORY_LABEL[activeQuestion.category]}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {activeQuestion.units.join(' + ')}
                </span>
                <span aria-hidden="true">·</span>
                <span>{activeQuestion.topic}</span>
              </div>
              <RatingLabel rating={savedRating} />
            </div>

            <div className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-5">
              <h1 className="font-display text-xl sm:text-2xl font-bold leading-snug text-slate-900 dark:text-white">
                {activeQuestion.question}
              </h1>

              {!revealed ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Respondé en voz alta como frente al tribunal. Si querés, anotá palabras clave de tu esquema antes de destapar la rúbrica.
                  </p>

                  <div>
                    <button
                      type="button"
                      onClick={() => setShowNotes((prev) => !prev)}
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-3.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                    >
                      <NotebookPen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>
                        {showNotes
                          ? 'Ocultar notas rápidas'
                          : 'Anotar esqueleto mental (opcional)'}
                      </span>
                      {showNotes ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {showNotes && (
                      <textarea
                        value={scratchNotes}
                        onChange={(e) => setScratchNotes(e.target.value)}
                        rows={3}
                        placeholder="Ej: 1) Definir concepto base, 2) Comparar criterio, 3) Dar ejemplo concreto..."
                        className="mt-3 w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3.5 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
                      />
                    )}
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setRevealed(true)}
                      className="duo-btn inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border-2 border-blue-600 border-b-4 bg-blue-600 hover:bg-blue-500 px-6 text-sm font-bold text-white whitespace-nowrap"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Ya respondí — Ver rúbrica del tribunal</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="animate-panel-up space-y-6 border-t border-slate-200 dark:border-slate-800 pt-5">
                  {/* Mandatory Key Points Interactive Checklist */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                        Puntos clave obligatorios
                      </h2>
                      <span className="font-mono text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                        Mencionados: {checkedPoints.size} / {activeQuestion.keyPoints.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tildá cada criterio que explicaste correctamente durante tu exposición oral.
                    </p>
                    <ul className="space-y-2">
                      {activeQuestion.keyPoints.map((point, idx) => {
                        const isChecked = checkedPoints.has(idx);
                        return (
                          <li key={idx}>
                            <button
                              type="button"
                              onClick={() => togglePoint(idx)}
                              aria-pressed={isChecked}
                              className={`flex w-full min-h-[44px] items-start gap-3 rounded-2xl border p-3.5 text-left text-sm transition-colors ${
                                isChecked
                                  ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100'
                                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                              }`}
                            >
                              <span
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                  isChecked
                                    ? 'border-emerald-600 bg-emerald-600 text-white'
                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                                }`}
                              >
                                {isChecked && <Check className="h-3.5 w-3.5" />}
                              </span>
                              <span className="leading-relaxed">{point}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Model Answer Summary */}
                  <div className="space-y-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Síntesis modelo de respuesta
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                      {activeQuestion.modelAnswer}
                    </p>
                  </div>

                  {/* Tribunal Trap Warning (hairline border, NO border-l-4) */}
                  <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>Trampa típica de tribunal</span>
                    </div>
                    <p className="text-sm leading-relaxed text-amber-950 dark:text-amber-100">
                      {activeQuestion.trapWarning}
                    </p>
                  </div>

                  {/* Follow-up Cross-Question */}
                  <div className="rounded-2xl border border-blue-200 dark:border-blue-900/70 bg-blue-50/60 dark:bg-blue-950/30 p-4 space-y-3">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-blue-800 dark:text-blue-300">
                        Repregunta encadenada del docente
                      </div>
                      <p className="text-sm font-semibold leading-relaxed text-slate-900 dark:text-white">
                        {activeQuestion.followUpQuestion}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowFollowUpAnswer((prev) => !prev)}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 px-3.5 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-800 whitespace-nowrap"
                    >
                      {showFollowUpAnswer ? (
                        <>
                          <ChevronUp className="h-3.5 w-3.5" />
                          <span>Ocultar respuesta esperada</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3.5 w-3.5" />
                          <span>Ver respuesta esperada de la repregunta</span>
                        </>
                      )}
                    </button>

                    {showFollowUpAnswer && (
                      <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 border-t border-blue-200 dark:border-blue-900/70 pt-3">
                        {activeQuestion.followUpAnswer}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>

        {/* Bottom Sticky Self-Evaluation Dock (only when rubric revealed, compact for mobile <=15%) */}
        {revealed && (
          <footer className="sticky bottom-0 z-20 border-t-2 border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md">
            <div className="mx-auto flex max-w-3xl flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 sm:px-6 py-3">
              <span className="hidden sm:inline text-xs font-semibold text-slate-600 dark:text-slate-300">
                Autoevaluá tu nivel para guardar y avanzar:
              </span>
              <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-2.5">
                <button
                  type="button"
                  onClick={() => handleRateCurrent('low')}
                  className="duo-btn inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border-2 border-rose-600 border-b-4 bg-rose-600 hover:bg-rose-500 px-3 sm:px-4 text-xs sm:text-sm font-bold text-white whitespace-nowrap"
                >
                  <RotateCw className="h-4 w-4 shrink-0" />
                  <span>Repasar</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRateCurrent('mid')}
                  className="duo-btn inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border-2 border-amber-600 border-b-4 bg-amber-500 hover:bg-amber-400 px-3 sm:px-4 text-xs sm:text-sm font-bold text-slate-950 whitespace-nowrap"
                >
                  <HelpCircle className="h-4 w-4 shrink-0" />
                  <span>Con dudas</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRateCurrent('high')}
                  className="duo-btn inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border-2 border-emerald-600 border-b-4 bg-emerald-600 hover:bg-emerald-500 px-3 sm:px-4 text-xs sm:text-sm font-bold text-white whitespace-nowrap"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Lo domino</span>
                </button>
              </div>
            </div>
          </footer>
        )}
      </div>
    );
  }

  // Lobby View (Vestíbulo del Simulacro Final Oral)
  const masteredPct =
    stats.total > 0 ? Math.round((stats.high / stats.total) * 100) : 0;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      {/* Hero & Readiness Breakdown */}
      <section className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2.5 max-w-3xl">
            <div className="text-xs font-semibold text-blue-700 dark:text-blue-400">
              Simulacro Final Oral · Todas las unidades (U1–U6 + Calidad)
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              {deck.title}
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
              {deck.subtitle}
            </p>
          </div>

          <div className="shrink-0 text-left lg:text-right">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Preparación oral global
            </div>
            <div className="font-display text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {masteredPct}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              <span>Dominadas</span>
            </div>
            <div className="mt-1 font-display text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {stats.high}
            </div>
          </div>
          <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30 p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <HelpCircle className="h-4 w-4" />
              <span>Con dudas</span>
            </div>
            <div className="mt-1 font-display text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {stats.mid}
            </div>
          </div>
          <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-800 dark:text-rose-300">
              <RotateCw className="h-4 w-4" />
              <span>A repasar</span>
            </div>
            <div className="mt-1 font-display text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {stats.low}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <CircleDashed className="h-4 w-4" />
              <span>Sin evaluar</span>
            </div>
            <div className="mt-1 font-display text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {stats.unrated}
            </div>
          </div>
        </div>
      </section>

      {/* Round Size Selector & 3 Launch Modes */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span>Armar mesa de simulacro</span>
          </h2>

          <div
            role="tablist"
            aria-label="Cantidad de preguntas de la ronda"
            className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-1"
          >
            {(
              [
                { val: 8, label: 'Ronda corta (8)' },
                { val: 15, label: 'Ronda media (15)' },
                { val: 0, label: `Banco completo (${stats.total})` },
              ] as const
            ).map((opt) => (
              <button
                key={opt.val}
                type="button"
                role="tab"
                aria-selected={roundSize === opt.val}
                onClick={() => setRoundSize(opt.val)}
                className={`min-h-[36px] rounded-lg px-3 py-1 text-xs font-bold transition-colors whitespace-nowrap ${
                  roundSize === opt.val
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <article className="flex flex-col justify-between rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400">
                <Shuffle className="h-4 w-4" />
                <span>Todas las unidades mezcladas</span>
              </div>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Simulacro completo mezclado
              </h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Mezcla preguntas integradoras entre unidades, comparaciones finas y trampas aleatorias simulando un final real.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleLaunchMode('mixed')}
              className="duo-btn flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border-2 border-blue-600 border-b-4 bg-blue-600 hover:bg-blue-500 px-4 text-sm font-bold text-white whitespace-nowrap"
            >
              <span>Iniciar mesa mezclada</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </article>

          <article className="flex flex-col justify-between rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                <Target className="h-4 w-4" />
                <span>Prioridad inteligente</span>
              </div>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Reforzar débiles y pendientes
              </h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Ordena primero los temas marcados para repasar o con dudas, seguidos de las consignas todavía sin evaluar.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleLaunchMode('weak')}
              className="duo-btn flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-600 border-b-4 bg-amber-500 hover:bg-amber-400 px-4 text-sm font-bold text-slate-950 whitespace-nowrap"
            >
              <span>Entrenar puntos débiles</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </article>

          <article className="flex flex-col justify-between rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-400">
                <ShieldAlert className="h-4 w-4" />
                <span>Errores típicos de mesa</span>
              </div>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Trampas y comparaciones
              </h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Práctica intensiva sobre distinciones que suelen preguntar los docentes (Strategy vs. State, SQA vs. SQC, LSP, etc.).
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleLaunchMode('traps')}
              className="duo-btn flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border-2 border-rose-600 border-b-4 bg-rose-600 hover:bg-rose-500 px-4 text-sm font-bold text-white whitespace-nowrap"
            >
              <span>Entrenar trampas</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </article>
        </div>
      </section>

      {/* Question Bank Browser */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Explorar banco de preguntas ({filteredBank.length})
          </h2>

          <div
            role="tablist"
            aria-label="Filtrar preguntas orales por tipo"
            className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-1"
          >
            {(
              [
                { id: 'todas', label: 'Todas' },
                { id: 'integradora', label: 'Integradoras' },
                { id: 'comparacion', label: 'Comparaciones' },
                { id: 'trampa', label: 'Trampas' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={categoryFilter === tab.id}
                onClick={() => setCategoryFilter(tab.id)}
                className={`min-h-[36px] rounded-lg px-3 py-1 text-xs font-bold transition-colors whitespace-nowrap ${
                  categoryFilter === tab.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {filteredBank.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => handleLaunchSingleFromBank(q)}
              className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-left transition-colors hover:border-blue-400 dark:hover:border-blue-600"
            >
              <div className="w-full space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>
                    {CATEGORY_LABEL[q.category]} · {q.units.join(' + ')}
                  </span>
                  <RatingLabel rating={oralRatings[q.id]} />
                </div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  {q.topic}
                </h3>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-2">
                  {q.question}
                </p>
              </div>
              <div className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                <span>Practicar desde esta pregunta</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
