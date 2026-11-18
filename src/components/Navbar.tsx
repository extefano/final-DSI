import { Moon, Share2, Sun } from 'lucide-react';
import type { ThemeMode } from '../types/dsi';

interface NavbarProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenSyncModal: () => void;
  activeView: 'units' | 'review' | 'study' | 'oral';
  onSelectUnits: () => void;
  onSelectOral: () => void;
  onStartReview: () => void;
  reviewCount: number;
}

export function Navbar({
  theme,
  onToggleTheme,
  onOpenSyncModal,
  activeView,
  onSelectUnits,
  onSelectOral,
  onStartReview,
  reviewCount,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3 sm:gap-8 px-3 sm:px-6">
        {/* Zone 1: Single-line brand wordmark */}
        <button
          type="button"
          onClick={onSelectUnits}
          className="font-display text-base sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-md px-1"
        >
          Estudio DSI
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Navegación principal"
          className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm font-semibold"
        >
          <button
            type="button"
            onClick={onSelectUnits}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-sm ${
              activeView === 'units'
                ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Unidades
          </button>
          <button
            type="button"
            onClick={onSelectOral}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm ${
              activeView === 'oral'
                ? 'border-blue-500 text-blue-700 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="sm:hidden">Oral</span>
            <span className="hidden sm:inline">Simulacro Oral</span>
          </button>
          <button
            type="button"
            onClick={onStartReview}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-sm ${
              activeView === 'review'
                ? 'border-amber-500 text-amber-700 dark:text-amber-400'
                : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Repaso ({reviewCount})
          </button>
        </nav>

        {/* Zone 3: Theme switcher + Primary session sync action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            className="duo-btn flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-200 dark:border-slate-700 border-b-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={onOpenSyncModal}
            className="duo-btn flex h-10 items-center gap-2 rounded-xl border-2 border-blue-600 dark:border-blue-500 border-b-4 bg-blue-600 hover:bg-blue-500 px-3 sm:px-4 text-xs sm:text-sm font-bold text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <Share2 className="h-4 w-4 shrink-0" />
            <span>Sesión</span>
          </button>
        </div>
      </div>
    </header>
  );
}
