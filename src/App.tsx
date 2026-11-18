import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { SessionModal } from './components/SessionModal';
import { StudySessionView } from './components/StudySessionView';
import { UnitCatalogView } from './components/UnitCatalogView';
import { useInputMode } from './hooks/useInputMode';
import { useCloudSync } from './hooks/useCloudSync';
import {
  DEFAULT_ACTIVE_SESSION,
  sanitizeActiveSession,
  useProgress,
} from './hooks/useProgress';
import { useTheme } from './hooks/useTheme';
import type {
  ActiveStudySession,
  CatalogIndex,
  Exercise,
  ProgressState,
  ThemeMode,
  UnitData,
} from './types/dsi';
import { decodeSessionCode } from './utils/sessionCodec';

interface DisplayedView {
  view: 'units' | 'study' | 'review';
  unitId: string | null;
}

export default function App() {
  const { theme, toggleTheme, setTheme } = useTheme();
  const { isMobileOrTouch } = useInputMode();
  const {
    profiles,
    activeProfile,
    progress,
    reviewIds,
    recordOutcome,
    setActiveSession,
    replaceProgress,
    resetProgress,
    switchProfile,
    createProfile,
    deleteProfile,
  } = useProgress();

  const savedSession = useMemo(
    () => sanitizeActiveSession(progress.activeSession),
    [progress.activeSession]
  );

  const [displayedView, setDisplayedView] = useState<DisplayedView>(() => ({
    view: savedSession.view,
    unitId: savedSession.unitId,
  }));
  const [syncVersion, setSyncVersion] = useState(0);

  const handleApplyCloudState = useCallback(
    (cloudProgress: ProgressState, cloudTheme?: ThemeMode) => {
      const next = replaceProgress(cloudProgress);
      const nextSession = sanitizeActiveSession(next.activeSession);
      setDisplayedView({
        view: nextSession.view,
        unitId: nextSession.unitId,
      });
      setSyncVersion((v) => v + 1);
      if (cloudTheme) setTheme(cloudTheme);
    },
    [replaceProgress, setTheme]
  );

  const {
    user: cloudUser,
    syncing: cloudSyncing,
    authError: cloudAuthError,
    signInWithGoogle,
    signOutUser,
    pushProgressToCloud,
  } = useCloudSync({
    localProgress: progress,
    theme,
    onApplyCloudState: handleApplyCloudState,
  });

  const [catalog, setCatalog] = useState<CatalogIndex | null>(null);
  const [unitsCache, setUnitsCache] = useState<Record<string, UnitData>>({});
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncModalOpen, setSyncModalOpen] = useState(false);

  // Incoming #s=DSI-... hash prompt
  const [pendingHashSession, setPendingHashSession] = useState<{
    progress: ProgressState;
    theme?: ThemeMode;
  } | null>(null);

  const loadCatalogAndUnits = useCallback(async () => {
    setLoadingCatalog(true);
    setLoadError(null);
    try {
      const res = await fetch('/data/index.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const indexData = (await res.json()) as CatalogIndex;
      setCatalog(indexData);

      // Fetch modular unit JSONs in parallel to populate exercise counts and Error Review pool
      const loadedPairs = await Promise.all(
        indexData.units.map(async (u) => {
          const uRes = await fetch(u.file);
          if (!uRes.ok) throw new Error(`Error cargando ${u.title}`);
          const uData = (await uRes.json()) as UnitData;
          return [u.unitId, uData] as const;
        })
      );

      const cacheMap: Record<string, UnitData> = {};
      for (const [id, data] of loadedPairs) {
        cacheMap[id] = data;
      }
      setUnitsCache(cacheMap);
    } catch {
      setLoadError(
        'No se pudieron cargar los módulos de ejercicios. Intentá recargar.'
      );
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    loadCatalogAndUnits();
  }, [loadCatalogAndUnits]);

  // Detect Pinturillo #s=DSI-... hash on load
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.toLowerCase().includes('#s=')) return;

    decodeSessionCode(hash).then((res) => {
      if (res.ok) {
        setPendingHashSession({
          progress: res.progress,
          theme: res.theme,
        });
      }
    });
  }, []);

  // Keep displayedView synced if the user switches local profiles
  useEffect(() => {
    const profileSession = sanitizeActiveSession(activeProfile.progress.activeSession);
    setDisplayedView({
      view: profileSession.view,
      unitId: profileSession.unitId,
    });
    setSyncVersion((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile.id]);

  const unitExerciseIdsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const [unitId, unitData] of Object.entries(unitsCache)) {
      map[unitId] = unitData.exercises.map((e) => e.id);
    }
    return map;
  }, [unitsCache]);

  const allExercisesMap = useMemo(() => {
    const map = new Map<string, Exercise>();
    if (catalog) {
      for (const u of catalog.units) {
        const unitData = unitsCache[u.unitId];
        if (unitData) {
          for (const ex of unitData.exercises) {
            map.set(ex.id, ex);
          }
        }
      }
    }
    return map;
  }, [catalog, unitsCache]);

  const reviewExercises = useMemo(() => {
    return reviewIds
      .map((id) => allExercisesMap.get(id))
      .filter((ex): ex is Exercise => Boolean(ex));
  }, [reviewIds, allExercisesMap]);

  const navigateAndPersist = useCallback(
    (nextSession: ActiveStudySession) => {
      const clean = sanitizeActiveSession(nextSession);
      setDisplayedView({ view: clean.view, unitId: clean.unitId });
      const nextProgress = setActiveSession(clean);
      void pushProgressToCloud(nextProgress, theme);
    },
    [setActiveSession, pushProgressToCloud, theme]
  );

  const handleRecordOutcome = useCallback(
    (
      exerciseId: string,
      isCorrect: boolean,
      nextIndex: number,
      nextStats: { correct: number; total: number }
    ) => {
      const nextSession: ActiveStudySession = {
        view: displayedView.view,
        unitId: displayedView.unitId,
        exerciseIndex: nextIndex,
        sessionCorrect: nextStats.correct,
        sessionTotal: nextStats.total,
      };
      const nextProgress = recordOutcome(exerciseId, isCorrect, nextSession);
      void pushProgressToCloud(nextProgress, theme);
    },
    [displayedView, recordOutcome, pushProgressToCloud, theme]
  );

  const handleStepSession = useCallback(
    (nextIndex: number, nextStats: { correct: number; total: number }) => {
      const nextSession: ActiveStudySession = {
        view: displayedView.view,
        unitId: displayedView.unitId,
        exerciseIndex: nextIndex,
        sessionCorrect: nextStats.correct,
        sessionTotal: nextStats.total,
      };
      const nextProgress = setActiveSession(nextSession);
      void pushProgressToCloud(nextProgress, theme);
    },
    [displayedView, setActiveSession, pushProgressToCloud, theme]
  );

  const handleFinishSession = useCallback(() => {
    // Clear persisted checkpoint to Home while keeping summary screen visible until exit
    const nextProgress = setActiveSession({ ...DEFAULT_ACTIVE_SESSION });
    void pushProgressToCloud(nextProgress, theme);
  }, [setActiveSession, pushProgressToCloud, theme]);

  const handleToggleTheme = useCallback(() => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    toggleTheme();
    void pushProgressToCloud(progress, nextTheme);
  }, [theme, toggleTheme, pushProgressToCloud, progress]);

  const handleImportState = useCallback(
    (incoming: ProgressState, incomingTheme?: ThemeMode) => {
      const nextProgress = replaceProgress(incoming);
      const nextSession = sanitizeActiveSession(nextProgress.activeSession);
      setDisplayedView({
        view: nextSession.view,
        unitId: nextSession.unitId,
      });
      setSyncVersion((v) => v + 1);
      const nextTheme = incomingTheme ?? theme;
      if (incomingTheme) setTheme(incomingTheme);
      void pushProgressToCloud(nextProgress, nextTheme);
    },
    [replaceProgress, setTheme, theme, pushProgressToCloud]
  );

  const handleResetProgress = useCallback(() => {
    const nextProgress = resetProgress();
    setDisplayedView({ view: 'units', unitId: null });
    setSyncVersion((v) => v + 1);
    void pushProgressToCloud(nextProgress, theme);
  }, [resetProgress, pushProgressToCloud, theme]);

  const handleApplyHashSession = (asNewProfile: boolean) => {
    if (!pendingHashSession) return;
    if (asNewProfile) {
      createProfile('Sesión compartida', pendingHashSession.progress);
      if (pendingHashSession.theme) setTheme(pendingHashSession.theme);
    } else {
      handleImportState(pendingHashSession.progress, pendingHashSession.theme);
    }
    setPendingHashSession(null);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  };

  const handleDismissHashSession = () => {
    setPendingHashSession(null);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  };

  const activeUnit = useMemo(() => {
    if (displayedView.view !== 'study' || !displayedView.unitId || !catalog) {
      return null;
    }
    return catalog.units.find((u) => u.unitId === displayedView.unitId) ?? null;
  }, [displayedView, catalog]);

  const resolvedView: 'units' | 'study' | 'review' =
    displayedView.view === 'study' && activeUnit
      ? 'study'
      : displayedView.view === 'review'
        ? 'review'
        : 'units';

  const initialSessionStats = useMemo(
    () => ({
      correct: savedSession.sessionCorrect,
      total: savedSession.sessionTotal,
    }),
    [savedSession.sessionCorrect, savedSession.sessionTotal]
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0B1120] dark:text-slate-100 transition-colors">
      <Navbar
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenSyncModal={() => setSyncModalOpen(true)}
        activeView={resolvedView}
        onSelectUnits={() =>
          navigateAndPersist({ ...DEFAULT_ACTIVE_SESSION })
        }
        onStartReview={() =>
          navigateAndPersist({
            view: 'review',
            unitId: null,
            exerciseIndex: 0,
            sessionCorrect: 0,
            sessionTotal: 0,
          })
        }
        reviewCount={reviewIds.length}
      />

      {pendingHashSession && (
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border-2 border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
              <p className="text-sm font-semibold text-blue-950 dark:text-blue-100">
                Se detectó un enlace de sesión compartida (
                {pendingHashSession.progress.completedIds.length} ejercicios completados).
                ¿Querés cargarlo en este dispositivo?
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleApplyHashSession(true)}
                className="duo-btn min-h-[40px] rounded-xl border-2 border-emerald-600 border-b-4 bg-emerald-600 hover:bg-emerald-500 px-3.5 text-xs font-bold text-white"
              >
                Abrir en perfil nuevo
              </button>
              <button
                type="button"
                onClick={() => handleApplyHashSession(false)}
                className="duo-btn min-h-[40px] rounded-xl border-2 border-blue-600 border-b-4 bg-blue-600 hover:bg-blue-500 px-3.5 text-xs font-bold text-white"
              >
                Reemplazar "{activeProfile.name}"
              </button>
              <button
                type="button"
                onClick={handleDismissHashSession}
                className="min-h-[40px] rounded-xl px-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800"
              >
                Ignorar
              </button>
            </div>
          </div>
        </div>
      )}

      {loadingCatalog ? (
        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-56 animate-pulse rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6"
              />
            ))}
          </div>
        </main>
      ) : loadError || !catalog ? (
        <main className="mx-auto max-w-xl px-4 py-16 text-center">
          <div className="rounded-3xl border-2 border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 p-8 space-y-4">
            <AlertCircle className="mx-auto h-10 w-10 text-rose-500" />
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Error de carga
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {loadError ?? 'Catálogo no disponible.'}
            </p>
            <button
              type="button"
              onClick={loadCatalogAndUnits}
              className="duo-btn inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-blue-600 border-b-4 bg-blue-600 px-5 text-sm font-bold text-white"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reintentar</span>
            </button>
          </div>
        </main>
      ) : resolvedView === 'units' ? (
        <UnitCatalogView
          units={catalog.units}
          unitExerciseIdsMap={unitExerciseIdsMap}
          progress={progress}
          reviewCount={reviewIds.length}
          activeProfileName={activeProfile.name}
          cloudUserEmail={cloudUser?.email ?? null}
          cloudSyncing={cloudSyncing}
          onSignInGoogle={() => void signInWithGoogle()}
          onOpenProfiles={() => setSyncModalOpen(true)}
          onStartUnit={(unit, resumeIndex) =>
            navigateAndPersist({
              view: 'study',
              unitId: unit.unitId,
              exerciseIndex: resumeIndex,
              sessionCorrect: 0,
              sessionTotal: 0,
            })
          }
          onStartReview={() =>
            navigateAndPersist({
              view: 'review',
              unitId: null,
              exerciseIndex: 0,
              sessionCorrect: 0,
              sessionTotal: 0,
            })
          }
        />
      ) : resolvedView === 'study' && activeUnit ? (
        <StudySessionView
          key={`unit_${activeUnit.unitId}`}
          title={activeUnit.title}
          isReviewMode={false}
          exercises={unitsCache[activeUnit.unitId]?.exercises ?? []}
          isMobileOrTouch={isMobileOrTouch}
          progress={progress}
          initialIndex={savedSession.exerciseIndex}
          initialStats={initialSessionStats}
          syncVersion={syncVersion}
          onOutcome={handleRecordOutcome}
          onStepSession={handleStepSession}
          onFinishSession={handleFinishSession}
          onExit={() => navigateAndPersist({ ...DEFAULT_ACTIVE_SESSION })}
          onJumpToReview={() =>
            navigateAndPersist({
              view: 'review',
              unitId: null,
              exerciseIndex: 0,
              sessionCorrect: 0,
              sessionTotal: 0,
            })
          }
        />
      ) : (
        <StudySessionView
          key="review_session"
          title="Repaso de Errores (2 aciertos seguidos)"
          isReviewMode={true}
          exercises={reviewExercises}
          isMobileOrTouch={isMobileOrTouch}
          progress={progress}
          initialIndex={savedSession.exerciseIndex}
          initialStats={initialSessionStats}
          syncVersion={syncVersion}
          onOutcome={handleRecordOutcome}
          onStepSession={handleStepSession}
          onFinishSession={handleFinishSession}
          onExit={() => navigateAndPersist({ ...DEFAULT_ACTIVE_SESSION })}
          onJumpToReview={() =>
            navigateAndPersist({
              view: 'review',
              unitId: null,
              exerciseIndex: 0,
              sessionCorrect: 0,
              sessionTotal: 0,
            })
          }
        />
      )}

      <SessionModal
        open={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        cloudUser={cloudUser}
        cloudSyncing={cloudSyncing}
        cloudAuthError={cloudAuthError}
        onSignInGoogle={() => void signInWithGoogle()}
        onSignOutGoogle={() => void signOutUser()}
        profiles={profiles}
        activeProfile={activeProfile}
        onSwitchProfile={switchProfile}
        onCreateProfile={(name) => createProfile(name)}
        onDeleteProfile={deleteProfile}
        progress={progress}
        theme={theme}
        onImportState={handleImportState}
        onResetProgress={handleResetProgress}
      />
    </div>
  );
}
