import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
} from '../firebase';
import type { ActiveStudySession, ProgressState, ThemeMode } from '../types/dsi';
import { sanitizeActiveSession } from './useProgress';

interface CloudSyncOptions {
  localProgress: ProgressState;
  theme: ThemeMode;
  onApplyCloudState: (progress: ProgressState, theme?: ThemeMode) => void;
}

function clampActiveSessionForCloud(session?: ActiveStudySession) {
  const clean = sanitizeActiveSession(session);
  return {
    view: clean.view,
    unitId: clean.view === 'study' && clean.unitId ? clean.unitId : '',
    exerciseIndex: clean.exerciseIndex,
    sessionCorrect: clean.sessionCorrect,
    sessionTotal: clean.sessionTotal,
  };
}

function clampPayload(progress: ProgressState, theme: ThemeMode) {
  const completedIds = Array.from(
    new Set(
      progress.completedIds
        .filter((id) => typeof id === 'string' && id.length > 0)
        .map((id) => id.slice(0, 64))
    )
  ).slice(0, 300);

  const reviewQueue: Record<string, number> = {};
  let count = 0;
  for (const [k, v] of Object.entries(progress.reviewQueue)) {
    if (count >= 300) break;
    if (typeof k === 'string' && k.length > 0 && typeof v === 'number' && v >= 0 && v < 2) {
      reviewQueue[k.slice(0, 64)] = Math.floor(v);
      count += 1;
    }
  }

  const totalAttempts = Math.min(Math.max(0, Math.floor(progress.totalAttempts)), 1000000);
  const totalCorrect = Math.min(
    Math.max(0, Math.floor(progress.totalCorrect)),
    totalAttempts
  );
  const streak = Math.min(Math.max(0, Math.floor(progress.streak)), 100000);
  const bestStreak = Math.min(
    Math.max(streak, Math.floor(progress.bestStreak)),
    100000
  );

  return {
    completedIds,
    reviewQueue,
    streak,
    bestStreak,
    totalAttempts,
    totalCorrect,
    theme: theme === 'dark' ? 'dark' : 'light',
    activeSession: clampActiveSessionForCloud(progress.activeSession),
  } as const;
}

export function useCloudSync({
  localProgress,
  theme,
  onApplyCloudState,
}: CloudSyncOptions) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [cloudDocExists, setCloudDocExists] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const localProgressRef = useRef(localProgress);
  localProgressRef.current = localProgress;
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const onApplyRef = useRef(onApplyCloudState);
  onApplyRef.current = onApplyCloudState;

  const hasInitialSyncedRef = useRef(false);
  const ignoreNextRemoteRef = useRef(false);
  const cloudExistsRef = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (!nextUser) {
        hasInitialSyncedRef.current = false;
        cloudExistsRef.current = false;
        setCloudDocExists(false);
        setSyncing(false);
      }
    });
    return () => unsub();
  }, []);

  const pushProgressToCloud = useCallback(
    async (nextProgress: ProgressState, nextTheme: ThemeMode) => {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.emailVerified) return;

      const docPath = `users/${currentUser.uid}`;
      const docRef = doc(db, 'users', currentUser.uid);
      const clean = clampPayload(nextProgress, nextTheme);

      setSyncing(true);
      ignoreNextRemoteRef.current = true;
      try {
        if (!cloudExistsRef.current) {
          await setDoc(docRef, {
            uid: currentUser.uid,
            ...clean,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          cloudExistsRef.current = true;
          setCloudDocExists(true);
        } else {
          await updateDoc(docRef, {
            ...clean,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        ignoreNextRemoteRef.current = false;
        handleFirestoreError(
          error,
          cloudExistsRef.current ? OperationType.UPDATE : OperationType.CREATE,
          docPath
        );
      } finally {
        setSyncing(false);
      }
    },
    []
  );

  // Subscribe to real-time updates for authenticated verified user
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) return;

    const docPath = `users/${user.uid}`;
    const docRef = doc(db, 'users', user.uid);
    setSyncing(true);

    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (!snap.exists()) {
          cloudExistsRef.current = false;
          setCloudDocExists(false);
          if (!hasInitialSyncedRef.current) {
            hasInitialSyncedRef.current = true;
            // First time this Google account connects: upload current local progress
            void pushProgressToCloud(localProgressRef.current, themeRef.current);
          } else {
            setSyncing(false);
          }
          return;
        }

        cloudExistsRef.current = true;
        setCloudDocExists(true);

        if (ignoreNextRemoteRef.current && !snap.metadata.hasPendingWrites) {
          ignoreNextRemoteRef.current = false;
          setSyncing(false);
          return;
        }

        const data = snap.data();
        const cloudUpdatedMs =
          data.updatedAt && typeof data.updatedAt.toMillis === 'function'
            ? (data.updatedAt.toMillis() as number)
            : Date.now();

        const cloudProgress: ProgressState = {
          completedIds: Array.isArray(data.completedIds) ? data.completedIds : [],
          reviewQueue:
            data.reviewQueue && typeof data.reviewQueue === 'object'
              ? data.reviewQueue
              : {},
          streak: typeof data.streak === 'number' ? data.streak : 0,
          bestStreak: typeof data.bestStreak === 'number' ? data.bestStreak : 0,
          totalAttempts: typeof data.totalAttempts === 'number' ? data.totalAttempts : 0,
          totalCorrect: typeof data.totalCorrect === 'number' ? data.totalCorrect : 0,
          activeSession: sanitizeActiveSession(data.activeSession),
          lastUpdated: cloudUpdatedMs,
        };
        const cloudTheme: ThemeMode | undefined =
          data.theme === 'dark' || data.theme === 'light' ? data.theme : undefined;

        if (!hasInitialSyncedRef.current) {
          hasInitialSyncedRef.current = true;
          const local = localProgressRef.current;
          // If local device has completed exercises not yet in cloud, merge union once
          const cloudSet = new Set(cloudProgress.completedIds);
          const hasLocalOnly = local.completedIds.some((id) => !cloudSet.has(id));

          if (hasLocalOnly && local.totalAttempts > 0) {
            const mergedIds = Array.from(
              new Set([...cloudProgress.completedIds, ...local.completedIds])
            );
            const mergedAttempts = Math.max(
              cloudProgress.totalAttempts,
              local.totalAttempts
            );
            const mergedCorrect = Math.min(
              Math.max(cloudProgress.totalCorrect, local.totalCorrect),
              mergedAttempts
            );
            const localSession = sanitizeActiveSession(local.activeSession);
            const cloudSession = sanitizeActiveSession(cloudProgress.activeSession);
            const chosenSession =
              cloudSession.view !== 'units' &&
              (cloudUpdatedMs >= local.lastUpdated || localSession.view === 'units')
                ? cloudSession
                : localSession;

            const merged: ProgressState = {
              completedIds: mergedIds,
              reviewQueue: { ...cloudProgress.reviewQueue, ...local.reviewQueue },
              streak: Math.max(cloudProgress.streak, local.streak),
              bestStreak: Math.max(cloudProgress.bestStreak, local.bestStreak),
              totalAttempts: mergedAttempts,
              totalCorrect: mergedCorrect,
              activeSession: chosenSession,
              lastUpdated: Date.now(),
            };
            onApplyRef.current(merged, cloudTheme);
            void pushProgressToCloud(merged, cloudTheme ?? themeRef.current);
            return;
          }

          // Upgrade legacy cloud documents that do not have activeSession yet
          if (!data.activeSession) {
            const localSession = sanitizeActiveSession(local.activeSession);
            const upgraded: ProgressState = {
              ...cloudProgress,
              activeSession: localSession,
            };
            onApplyRef.current(upgraded, cloudTheme);
            void pushProgressToCloud(upgraded, cloudTheme ?? themeRef.current);
            return;
          }
        }

        onApplyRef.current(cloudProgress, cloudTheme);
        setSyncing(false);
      },
      (error) => {
        setSyncing(false);
        handleFirestoreError(error, OperationType.GET, docPath);
      }
    );

    return () => unsub();
  }, [authReady, user, pushProgressToCloud]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: unknown) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code: unknown }).code)
          : '';
      if (code === 'auth/popup-closed-by-user') {
        return;
      }
      if (code === 'auth/unauthorized-domain') {
        setAuthError(
          `Este dominio (${window.location.hostname}) aún no está autorizado en Firebase Authentication. Agregalo en Firebase Console → Authentication → Settings → Authorized domains.`
        );
        return;
      }
      setAuthError(
        'No se pudo iniciar sesión con Google. Verificá que no estén bloqueadas las ventanas emergentes.'
      );
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    await signOut(auth);
  }, []);

  return {
    user,
    authReady,
    cloudDocExists,
    syncing,
    authError,
    signInWithGoogle,
    signOutUser,
    pushProgressToCloud,
  };
}
