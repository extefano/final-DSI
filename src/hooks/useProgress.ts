import { useCallback, useEffect, useState } from 'react';
import type { ProgressState } from '../types/dsi';

const PROGRESS_STORAGE_KEY = 'estudio_dsi_progress_v1';

const DEFAULT_PROGRESS: ProgressState = {
  completedIds: [],
  reviewQueue: {},
  streak: 0,
  bestStreak: 0,
  totalAttempts: 0,
  totalCorrect: 0,
  lastUpdated: Date.now(),
};

function loadInitialProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
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
      lastUpdated: typeof parsed.lastUpdated === 'number' ? parsed.lastUpdated : Date.now(),
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function useProgress() {
  const [progress, setProgress] = useState<ProgressState>(loadInitialProgress);

  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Ignore quota errors
    }
  }, [progress]);

  const recordOutcome = useCallback(
    (exerciseId: string, isCorrect: boolean) => {
      setProgress((prev) => {
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
          // Failed exercise enters review queue needing 2 consecutive correct answers
          nextReview[exerciseId] = 0;
        }

        return {
          completedIds: Array.from(nextCompleted),
          reviewQueue: nextReview,
          streak: nextStreak,
          bestStreak: nextBestStreak,
          totalAttempts: prev.totalAttempts + 1,
          totalCorrect: prev.totalCorrect + (isCorrect ? 1 : 0),
          lastUpdated: Date.now(),
        };
      });
    },
    []
  );

  const replaceProgress = useCallback((incoming: ProgressState) => {
    setProgress({
      ...incoming,
      lastUpdated: Date.now(),
    });
  }, []);

  const resetProgress = useCallback(() => {
    setProgress({
      ...DEFAULT_PROGRESS,
      lastUpdated: Date.now(),
    });
  }, []);

  const reviewIds = Object.keys(progress.reviewQueue);

  return {
    progress,
    reviewIds,
    recordOutcome,
    replaceProgress,
    resetProgress,
  };
}
