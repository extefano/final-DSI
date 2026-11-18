import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Flame, Layers, RotateCw } from 'lucide-react';
import type { ProgressState, UnitCatalogItem } from '../types/dsi';

interface UnitCatalogViewProps {
  units: UnitCatalogItem[];
  unitExerciseIdsMap: Record<string, string[]>;
  progress: ProgressState;
  reviewCount: number;
  onStartUnit: (unit: UnitCatalogItem) => void;
  onStartReview: () => void;
}

type TermFilter = 'Todas' | '1er Cuatrimestre' | '2do Cuatrimestre' | 'Transversal';

const ACCENT_STYLES: Record<
  UnitCatalogItem['accentColor'],
  { bar: string; btn: string }
> = {
  emerald: {
    bar: 'bg-emerald-500',
    btn: 'border-emerald-600 bg-emerald-600 hover:bg-emerald-500 text-white',
  },
  blue: {
    bar: 'bg-blue-500',
    btn: 'border-blue-600 bg-blue-600 hover:bg-blue-500 text-white',
  },
  amber: {
    bar: 'bg-amber-500',
    btn: 'border-amber-600 bg-amber-600 hover:bg-amber-500 text-white',
  },
  violet: {
    bar: 'bg-violet-500',
    btn: 'border-violet-600 bg-violet-600 hover:bg-violet-500 text-white',
  },
  rose: {
    bar: 'bg-rose-500',
    btn: 'border-rose-600 bg-rose-600 hover:bg-rose-500 text-white',
  },
  teal: {
    bar: 'bg-teal-500',
    btn: 'border-teal-600 bg-teal-600 hover:bg-teal-500 text-white',
  },
};

export function UnitCatalogView({
  units,
  unitExerciseIdsMap,
  progress,
  reviewCount,
  onStartUnit,
  onStartReview,
}: UnitCatalogViewProps) {
  const [termFilter, setTermFilter] = useState<TermFilter>('Todas');

  const completedSet = useMemo(
    () => new Set(progress.completedIds),
    [progress.completedIds]
  );

  const totalExercises = useMemo(
    () => units.reduce((sum, u) => sum + u.exerciseCount, 0),
    [units]
  );

  const completedTotal = useMemo(() => {
    let count = 0;
    for (const u of units) {
      const ids = unitExerciseIdsMap[u.unitId];
      if (ids) {
        count += ids.filter((id) => completedSet.has(id)).length;
      }
    }
    return count;
  }, [units, unitExerciseIdsMap, completedSet]);

  const globalPct =
    totalExercises > 0 ? Math.round((completedTotal / totalExercises) * 100) : 0;

  const filteredUnits = useMemo(() => {
    if (termFilter === 'Todas') return units;
    return units.filter((u) => u.term === termFilter);
  }, [units, termFilter]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      {/* Hero & Compact Progress Summary */}
      <section className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
        <div className="lg:col-span-8 flex flex-col justify-between rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
          <div className="space-y-3">
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Diseño de Sistemas de Información · Apunte Completo (240 págs.)
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              Entrená cada unidad con definiciones y diagramas activos
            </h1>
            <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
              Completá definiciones clave, reconstruí modelos en grilla y ensamblá notaciones UML, SOLID y patrones GoF. Todo error entra en repaso hasta acertarlo dos veces seguidas.
            </p>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              <span>Progreso global del programa</span>
              <span className="font-mono tabular-nums">
                {completedTotal} / {totalExercises} ({globalPct}%)
              </span>
            </div>
            <div className="h-3.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${globalPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action & Review Card */}
        <div className="lg:col-span-4 flex flex-col justify-between rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <Flame className="h-4 w-4 text-amber-500" />
                <span>Racha actual</span>
              </div>
              <div className="mt-1 font-display text-2xl sm:text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
                {progress.streak}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <RotateCw className="h-4 w-4 text-rose-500" />
                <span>En repaso</span>
              </div>
              <div className="mt-1 font-display text-2xl sm:text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
                {reviewCount}
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {reviewCount > 0
                ? `Tenés ${reviewCount} ejercicio${reviewCount === 1 ? '' : 's'} pendiente${reviewCount === 1 ? '' : 's'} que requieren 2 aciertos consecutivos.`
                : 'No tenés errores pendientes en tu cola. Podés seguir avanzando con las unidades.'}
            </p>
            <button
              type="button"
              disabled={reviewCount === 0}
              onClick={onStartReview}
              className="duo-btn flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-600 border-b-4 bg-amber-500 hover:bg-amber-400 disabled:border-slate-200 dark:disabled:border-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 px-4 text-sm font-bold text-slate-950 whitespace-nowrap"
            >
              <RotateCw className="h-4 w-4" />
              <span>Repaso de Errores ({reviewCount})</span>
            </button>
          </div>
        </div>
      </section>

      {/* Filter Controls */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span>Unidades del Programa</span>
          </h2>

          <div
            role="tablist"
            aria-label="Filtrar unidades por cuatrimestre"
            className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-1"
          >
            {(
              ['Todas', '1er Cuatrimestre', '2do Cuatrimestre', 'Transversal'] as const
            ).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={termFilter === tab}
                onClick={() => setTermFilter(tab)}
                className={`min-h-[36px] rounded-lg px-3 py-1 text-xs font-bold transition-colors whitespace-nowrap ${
                  termFilter === tab
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Unit Cards Grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredUnits.map((unit) => {
            const ids = unitExerciseIdsMap[unit.unitId] ?? [];
            const doneCount = ids.filter((id) => completedSet.has(id)).length;
            const total = ids.length || unit.exerciseCount;
            const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
            const isMastered = total > 0 && doneCount === total;
            const accent = ACCENT_STYLES[unit.accentColor] ?? ACCENT_STYLES.emerald;

            return (
              <article
                key={unit.unitId}
                className="flex flex-col justify-between rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
              >
                <div>
                  {/* Clean unboxed metadata line */}
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span>
                      {unit.code} · {unit.term} · Págs. {unit.pdfPages}
                    </span>
                    {isMastered && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Completa</span>
                      </span>
                    )}
                  </div>

                  <h3 className="mt-2 font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    {unit.title}
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {unit.subtitle}
                  </p>
                </div>

                <div className="mt-6 space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                      <span>Dominado</span>
                      <span className="font-mono tabular-nums">
                        {doneCount}/{total} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${accent.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onStartUnit(unit)}
                    className={`duo-btn flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border-2 border-b-4 px-4 text-sm font-bold whitespace-nowrap ${accent.btn}`}
                  >
                    <span>{doneCount > 0 ? 'Seguir practicando' : 'Comenzar unidad'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
