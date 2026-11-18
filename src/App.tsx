import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { SessionModal } from './components/SessionModal';
import { StudySessionView } from './components/StudySessionView';
import { UnitCatalogView } from './components/UnitCatalogView';
import { useInputMode } from './hooks/useInputMode';
import { useProgress } from './hooks/useProgress';
import { useTheme } from './hooks/useTheme';
import type {
  CatalogIndex,
  Exercise,
  ProgressState,
  ThemeMode,
  UnitCatalogItem,
  UnitData,
} from './types/dsi';
import { decodeSessionCode } from './utils/sessionCodec';

type ActiveRoute =
  | { view: 'units' }
  | { view: 'study'; unit: UnitCatalogItem }
  | { view: 'review' };

export default function App() {
  const { theme, toggleTheme, setTheme } = useTheme();
  const { isMobileOrTouch } = useInputMode();
  const { progress, reviewIds, recordOutcome, replaceProgress, resetProgress } =
    useProgress();

  const [catalog, setCatalog] = useState<CatalogIndex | null>(null);
  const [unitsCache, setUnitsCache] = useState<Record<string, UnitData>>({});
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [route, setRoute] = useState<ActiveRoute>({ view: 'units' });
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

  const handleImportState = useCallback(
    (incoming: ProgressState, incomingTheme?: ThemeMode) => {
      replaceProgress(incoming);
      if (incomingTheme) setTheme(incomingTheme);
    },
    [replaceProgress, setTheme]
  );

  const handleApplyHashSession = () => {
    if (!pendingHashSession) return;
    handleImportState(pendingHashSession.progress, pendingHashSession.theme);
    setPendingHashSession(null);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  };

  const handleDismissHashSession = () => {
    setPendingHashSession(null);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  };

  const activeNavView =
    route.view === 'review' ? 'review' : route.view === 'study' ? 'study' : 'units';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0B1120] dark:text-slate-100 transition-colors">
      <Navbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSyncModal={() => setSyncModalOpen(true)}
        activeView={activeNavView}
        onSelectUnits={() => setRoute({ view: 'units' })}
        onStartReview={() => setRoute({ view: 'review' })}
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
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleApplyHashSession}
                className="duo-btn min-h-[40px] rounded-xl border-2 border-blue-600 border-b-4 bg-blue-600 hover:bg-blue-500 px-4 text-xs font-bold text-white"
              >
                Aplicar sesión
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
      ) : route.view === 'units' ? (
        <UnitCatalogView
          units={catalog.units}
          unitExerciseIdsMap={unitExerciseIdsMap}
          progress={progress}
          reviewCount={reviewIds.length}
          onStartUnit={(unit) => setRoute({ view: 'study', unit })}
          onStartReview={() => setRoute({ view: 'review' })}
        />
      ) : route.view === 'study' ? (
        <StudySessionView
          key={`unit_${route.unit.unitId}`}
          title={route.unit.title}
          isReviewMode={false}
          exercises={unitsCache[route.unit.unitId]?.exercises ?? []}
          isMobileOrTouch={isMobileOrTouch}
          progress={progress}
          onOutcome={recordOutcome}
          onExit={() => setRoute({ view: 'units' })}
          onJumpToReview={() => setRoute({ view: 'review' })}
        />
      ) : (
        <StudySessionView
          key="review_session"
          title="Repaso de Errores (2 aciertos seguidos)"
          isReviewMode={true}
          exercises={reviewExercises}
          isMobileOrTouch={isMobileOrTouch}
          progress={progress}
          onOutcome={recordOutcome}
          onExit={() => setRoute({ view: 'units' })}
          onJumpToReview={() => setRoute({ view: 'review' })}
        />
      )}

      <SessionModal
        open={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        progress={progress}
        theme={theme}
        onImportState={handleImportState}
        onResetProgress={resetProgress}
      />
    </div>
  );
}
