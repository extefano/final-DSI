import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActiveStudySession, ProgressState, StudyProfile } from '../types/dsi';

const LEGACY_PROGRESS_KEY = 'estudio_dsi_progress_v1';
const PROFILES_STORAGE_KEY = 'estudio_dsi_profiles_v1';

export const DEFAULT_ACTIVE_SESSION: ActiveStudySession = {
  view: 'units',
  unitId: null,
  exerciseIndex: 0,
  sessionCorrect: 0,
  sessionTotal: 0,
};

export function sanitizeActiveSession(raw: unknown): ActiveStudySession {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_ACTIVE_SESSION };
  }
  const s = raw as Partial<ActiveStudySession>;
  const rawView =
    s.view === 'study' || s.view === 'review' || s.view === 'units'
      ? s.view
      : 'units';
  const rawUnitId =
    typeof s.unitId === 'string' && /^[a-zA-Z0-9_-]{1,32}$/.test(s.unitId)
      ? s.unitId
      : null;

  const view = rawView === 'study' && !rawUnitId ? 'units' : rawView;
  const unitId = view === 'study' ? rawUnitId : null;
  const exerciseIndex =
    typeof s.exerciseIndex === 'number' && Number.isFinite(s.exerciseIndex)
      ? Math.min(Math.max(0, Math.floor(s.exerciseIndex)), 500)
      : 0;
  const sessionTotal =
    typeof s.sessionTotal === 'number' && Number.isFinite(s.sessionTotal)
      ? Math.min(Math.max(0, Math.floor(s.sessionTotal)), 500)
      : 0;
  const sessionCorrect =
    typeof s.sessionCorrect === 'number' && Number.isFinite(s.sessionCorrect)
      ? Math.min(Math.max(0, Math.floor(s.sessionCorrect)), sessionTotal)
      : 0;

  return {
    view,
    unitId,
    exerciseIndex,
    sessionCorrect,
    sessionTotal,
  };
}

const createEmptyProgress = (): ProgressState => ({
  completedIds: [],
  reviewQueue: {},
  streak: 0,
  bestStreak: 0,
  totalAttempts: 0,
  totalCorrect: 0,
  activeSession: { ...DEFAULT_ACTIVE_SESSION },
  lastUpdated: Date.now(),
});

interface ProfilesStore {
  activeProfileId: string;
  profiles: StudyProfile[];
}

function sanitizeProgress(raw: unknown): ProgressState {
  if (!raw || typeof raw !== 'object') return createEmptyProgress();
  const parsed = raw as Partial<ProgressState>;
  return {
    completedIds: Array.isArray(parsed.completedIds) ? parsed.completedIds : [],
    reviewQueue:
      parsed.reviewQueue && typeof parsed.reviewQueue === 'object'
        ? parsed.reviewQueue
        : {},
    streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
    bestStreak: typeof parsed.bestStreak === 'number' ? parsed.bestStreak : 0,
    totalAttempts: typeof parsed.totalAttempts === 'number' ? parsed.totalAttempts : 0,
    totalCorrect: typeof parsed.totalCorrect === 'number' ? parsed.totalCorrect : 0,
    activeSession: sanitizeActiveSession(parsed.activeSession),
    lastUpdated: typeof parsed.lastUpdated === 'number' ? parsed.lastUpdated : Date.now(),
  };
}

function loadInitialStore(): ProfilesStore {
  try {
    const rawProfiles = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (rawProfiles) {
      const parsed = JSON.parse(rawProfiles) as Partial<ProfilesStore>;
      if (Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
        const sanitized = parsed.profiles.map((p) => ({
          id: typeof p.id === 'string' && p.id ? p.id : `p_${Date.now()}`,
          name: typeof p.name === 'string' && p.name.trim() ? p.name.trim() : 'Principal',
          progress: sanitizeProgress(p.progress),
        }));
        const activeExists = sanitized.some((p) => p.id === parsed.activeProfileId);
        return {
          activeProfileId: activeExists
            ? (parsed.activeProfileId as string)
            : sanitized[0].id,
          profiles: sanitized,
        };
      }
    }

    // Migrate legacy single-user localStorage state seamlessly
    const legacyRaw = localStorage.getItem(LEGACY_PROGRESS_KEY);
    const initialProgress = legacyRaw
      ? sanitizeProgress(JSON.parse(legacyRaw))
      : createEmptyProgress();

    return {
      activeProfileId: 'principal',
      profiles: [
        {
          id: 'principal',
          name: 'Principal',
          progress: initialProgress,
        },
      ],
    };
  } catch {
    return {
      activeProfileId: 'principal',
      profiles: [
        {
          id: 'principal',
          name: 'Principal',
          progress: createEmptyProgress(),
        },
      ],
    };
  }
}

export function useProgress() {
  const [store, setStore] = useState<ProfilesStore>(loadInitialStore);
  const storeRef = useRef(store);
  storeRef.current = store;

  useEffect(() => {
    try {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(store));
    } catch {
      // Ignore quota errors
    }
  }, [store]);

  const activeProfile =
    store.profiles.find((p) => p.id === store.activeProfileId) ?? store.profiles[0];
  const progress = activeProfile.progress;

  const updateActiveProgress = useCallback(
    (updater: (prev: ProgressState) => ProgressState): ProgressState => {
      const currStore = storeRef.current;
      const currProfile =
        currStore.profiles.find((p) => p.id === currStore.activeProfileId) ??
        currStore.profiles[0];
      const nextProgress = updater(currProfile.progress);
      setStore((prevStore) => ({
        ...prevStore,
        profiles: prevStore.profiles.map((p) =>
          p.id === prevStore.activeProfileId
            ? { ...p, progress: updater(p.progress) }
            : p
        ),
      }));
      return nextProgress;
    },
    []
  );

  const recordOutcome = useCallback(
    (
      exerciseId: string,
      isCorrect: boolean,
      nextSession?: ActiveStudySession
    ): ProgressState => {
      return updateActiveProgress((prev) => {
        const nextCompleted = new Set(prev.completedIds);
        const nextReview = { ...prev.reviewQueue };
        let nextStreak = prev.streak;
        let nextBestStreak = prev.bestStreak;

        if (isCorrect) {
          nextCompleted.add(exerciseId);
          nextStreak += 1;
          if (nextStreak > nextBestStreak) {
            nextBestStreak = nextStreak;
          }
          if (exerciseId in nextReview) {
            const currentCount = nextReview[exerciseId] ?? 0;
            const updatedCount = currentCount + 1;
            if (updatedCount >= 2) {
              delete nextReview[exerciseId];
            } else {
              nextReview[exerciseId] = updatedCount;
            }
          }
        } else {
          nextStreak = 0;
          nextReview[exerciseId] = 0;
        }

        return {
          completedIds: Array.from(nextCompleted),
          reviewQueue: nextReview,
          streak: nextStreak,
          bestStreak: nextBestStreak,
          totalAttempts: prev.totalAttempts + 1,
          totalCorrect: prev.totalCorrect + (isCorrect ? 1 : 0),
          activeSession: nextSession
            ? sanitizeActiveSession(nextSession)
            : sanitizeActiveSession(prev.activeSession),
          lastUpdated: Date.now(),
        };
      });
    },
    [updateActiveProgress]
  );

  const setActiveSession = useCallback(
    (session: ActiveStudySession): ProgressState => {
      const cleanSession = sanitizeActiveSession(session);
      return updateActiveProgress((prev) => ({
        ...prev,
        activeSession: cleanSession,
        lastUpdated: Date.now(),
      }));
    },
    [updateActiveProgress]
  );

  const replaceProgress = useCallback(
    (incoming: ProgressState): ProgressState => {
      return updateActiveProgress(() => ({
        ...incoming,
        activeSession: sanitizeActiveSession(incoming.activeSession),
        lastUpdated: Date.now(),
      }));
    },
    [updateActiveProgress]
  );

  const resetProgress = useCallback((): ProgressState => {
    return updateActiveProgress(() => createEmptyProgress());
  }, [updateActiveProgress]);

  const switchProfile = useCallback((profileId: string) => {
    setStore((prev) => {
      if (!prev.profiles.some((p) => p.id === profileId)) return prev;
      return { ...prev, activeProfileId: profileId };
    });
  }, []);

  const createProfile = useCallback(
    (name: string, initialProgress?: ProgressState) => {
      const cleanName = name.trim() || `Perfil ${store.profiles.length + 1}`;
      const newId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setStore((prev) => ({
        activeProfileId: newId,
        profiles: [
          ...prev.profiles,
          {
            id: newId,
            name: cleanName,
            progress: initialProgress
              ? {
                  ...initialProgress,
                  activeSession: sanitizeActiveSession(initialProgress.activeSession),
                  lastUpdated: Date.now(),
                }
              : createEmptyProgress(),
          },
        ],
      }));
      return newId;
    },
    [store.profiles.length]
  );

  const renameProfile = useCallback((profileId: string, newName: string) => {
    const clean = newName.trim();
    if (!clean) return;
    setStore((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) =>
        p.id === profileId ? { ...p, name: clean } : p
      ),
    }));
  }, []);

  const deleteProfile = useCallback((profileId: string) => {
    setStore((prev) => {
      if (prev.profiles.length <= 1) return prev;
      const remaining = prev.profiles.filter((p) => p.id !== profileId);
      const nextActive =
        prev.activeProfileId === profileId ? remaining[0].id : prev.activeProfileId;
      return {
        activeProfileId: nextActive,
        profiles: remaining,
      };
    });
  }, []);

  const reviewIds = Object.keys(progress.reviewQueue);

  return {
    profiles: store.profiles,
    activeProfile,
    progress,
    reviewIds,
    recordOutcome,
    setActiveSession,
    replaceProgress,
    resetProgress,
    switchProfile,
    createProfile,
    renameProfile,
    deleteProfile,
  };
}
