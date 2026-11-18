import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Link as LinkIcon,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import type { ProgressState, ThemeMode } from '../types/dsi';
import {
  buildSessionShareUrl,
  decodeSessionCode,
  encodeSessionCode,
} from '../utils/sessionCodec';

interface SessionModalProps {
  open: boolean;
  onClose: () => void;
  progress: ProgressState;
  theme: ThemeMode;
  onImportState: (incoming: ProgressState, incomingTheme?: ThemeMode) => void;
  onResetProgress: () => void;
}

export function SessionModal({
  open,
  onClose,
  progress,
  theme,
  onImportState,
  onResetProgress,
}: SessionModalProps) {
  const [sessionCode, setSessionCode] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copiedTarget, setCopiedTarget] = useState<'code' | 'url' | null>(null);
  const [pasteInput, setPasteInput] = useState('');
  const [statusMsg, setStatusMsg] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!open) {
      setStatusMsg(null);
      setConfirmReset(false);
      return;
    }
    let active = true;
    encodeSessionCode(progress, theme)
      .then((code) => {
        if (!active) return;
        setSessionCode(code);
        setShareUrl(buildSessionShareUrl(code));
      })
      .catch(() => {
        if (active) {
          setSessionCode('');
        }
      });
    return () => {
      active = false;
    };
  }, [open, progress, theme]);

  if (!open) return null;

  const handleCopy = async (text: string, target: 'code' | 'url') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTarget(target);
      setTimeout(() => setCopiedTarget(null), 1800);
    } catch {
      setStatusMsg({
        type: 'err',
        text: 'No se pudo copiar automáticamente; seleccioná el texto manualmente.',
      });
    }
  };

  const handleRestoreCode = async () => {
    const result = await decodeSessionCode(pasteInput);
    if (!result.ok) {
      setStatusMsg({ type: 'err', text: result.error });
      return;
    }
    onImportState(result.progress, result.theme);
    setPasteInput('');
    setStatusMsg({
      type: 'ok',
      text: `Progreso restaurado (${result.progress.completedIds.length} ejercicios completados).`,
    });
  };

  const handleDownloadBackup = () => {
    const payload = {
      app: 'Estudio DSI',
      exportedAt: new Date().toISOString(),
      theme,
      progress,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `estudio-dsi-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatusMsg({ type: 'ok', text: 'Respaldo .json descargado correctamente.' });
  };

  const handleUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const candidate: Partial<ProgressState> = parsed.progress ?? parsed;
        if (!Array.isArray(candidate.completedIds) || typeof candidate.reviewQueue !== 'object') {
          setStatusMsg({
            type: 'err',
            text: 'El archivo .json no corresponde a un respaldo válido de Estudio DSI.',
          });
          return;
        }
        onImportState(
          {
            completedIds: candidate.completedIds,
            reviewQueue: candidate.reviewQueue ?? {},
            streak: typeof candidate.streak === 'number' ? candidate.streak : 0,
            bestStreak: typeof candidate.bestStreak === 'number' ? candidate.bestStreak : 0,
            totalAttempts:
              typeof candidate.totalAttempts === 'number' ? candidate.totalAttempts : 0,
            totalCorrect:
              typeof candidate.totalCorrect === 'number' ? candidate.totalCorrect : 0,
            lastUpdated: Date.now(),
          },
          parsed.theme === 'dark' || parsed.theme === 'light' ? parsed.theme : undefined
        );
        setStatusMsg({
          type: 'ok',
          text: `Respaldo importado (${candidate.completedIds.length} ejercicios completados).`,
        });
      } catch {
        setStatusMsg({
          type: 'err',
          text: 'Error al leer el archivo .json. Verificá que no esté dañado.',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 sm:p-7 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2
              id="session-modal-title"
              className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white"
            >
              Código de Sesión y Respaldo
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Llevá tu progreso entre el teléfono y la PC sin crear cuentas ni servidores.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de sesión"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-6">
          {/* Export compressed Pinturillo code */}
          <section className="space-y-2.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Tu código actual (comprimido)
            </h3>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 font-mono text-xs break-all text-slate-800 dark:text-slate-200 select-all">
              {sessionCode || 'Generando código...'}
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => handleCopy(sessionCode, 'code')}
                className="duo-btn inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-blue-600 border-b-4 bg-blue-600 hover:bg-blue-500 px-4 text-xs sm:text-sm font-bold text-white"
              >
                {copiedTarget === 'code' ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Código copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copiar código</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleCopy(shareUrl, 'url')}
                className="duo-btn inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-slate-300 dark:border-slate-600 border-b-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100"
              >
                {copiedTarget === 'url' ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span>Enlace copiado</span>
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-4 w-4" />
                    <span>Copiar enlace directo</span>
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Restore from external code */}
          <section className="space-y-2.5 border-t border-slate-200 dark:border-slate-800 pt-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Cargar sesión desde otro dispositivo
            </h3>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={pasteInput}
                onChange={(e) => setPasteInput(e.target.value)}
                placeholder="Pegá un código DSI-... o enlace #s=..."
                className="min-h-[44px] flex-1 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 px-3.5 text-sm font-mono text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                disabled={!pasteInput.trim()}
                onClick={handleRestoreCode}
                className="duo-btn min-h-[44px] rounded-xl border-2 border-emerald-600 border-b-4 bg-emerald-600 hover:bg-emerald-500 disabled:border-slate-200 dark:disabled:border-slate-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 px-5 text-sm font-bold text-white whitespace-nowrap"
              >
                Restaurar
              </button>
            </div>
          </section>

          {/* File Backup JSON */}
          <section className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Archivo de respaldo (.json)
            </h3>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="duo-btn inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-slate-300 dark:border-slate-600 border-b-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100"
                >
                  <Download className="h-4 w-4" />
                  <span>Exportar .json</span>
                </button>

                <label className="duo-btn inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border-2 border-slate-300 dark:border-slate-600 border-b-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                  <Upload className="h-4 w-4" />
                  <span>Importar .json</span>
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={handleUploadBackup}
                    className="sr-only"
                  />
                </label>
              </div>

              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reiniciar progreso</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onResetProgress();
                      setConfirmReset(false);
                      setStatusMsg({
                        type: 'ok',
                        text: 'Tu progreso local fue reiniciado.',
                      });
                    }}
                    className="min-h-[40px] rounded-xl bg-rose-600 px-3 text-xs font-bold text-white hover:bg-rose-500"
                  >
                    Confirmar reinicio
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="min-h-[40px] rounded-xl px-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </section>

          {statusMsg && (
            <div
              role="status"
              className={`rounded-xl border p-3 text-sm font-semibold ${
                statusMsg.type === 'ok'
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200'
                  : 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200'
              }`}
            >
              {statusMsg.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
