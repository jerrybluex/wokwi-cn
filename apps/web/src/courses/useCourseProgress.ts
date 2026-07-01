/**
 * useCourseProgress — manages step navigation with local-first persistence.
 *
 * Strategy:
 *   1. Read from localStorage immediately (no flash of wrong step)
 *   2. Once server responds, merge server stepIdx if it is ahead
 *   3. On navigation, write to localStorage synchronously
 *   4. Debounce a sync to the server (1 s)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { coursesApi } from './api';

const LS_KEY = (slug: string) => `wokwi_course_${slug}_step`;

export type CourseProgressState = {
  stepIdx: number;
  totalSteps: number;
  isLoading: boolean;
  goToStep: (idx: number) => void;
  next: () => void;
  prev: () => void;
  markComplete: () => void;
  isComplete: boolean;
};

export function useCourseProgress(slug: string, totalSteps: number): CourseProgressState {
  const [stepIdx, setStepIdx] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY(slug));
      return stored ? Math.min(parseInt(stored, 10), totalSteps - 1) : 0;
    } catch {
      return 0;
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 1. Load server progress, keep the furthest step ──────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status, data } = await coursesApi.getProgress(slug);
      if (cancelled) return;
      if (status === 200 && 'stepIdx' in data) {
        const serverIdx = (data as { stepIdx: number; completed: boolean }).stepIdx;
        setStepIdx((prev) => {
          const furthest = Math.max(prev, serverIdx);
          if (furthest !== prev) {
            try { localStorage.setItem(LS_KEY(slug), String(furthest)); } catch {}
          }
          return furthest;
        });
        setIsComplete((data as { completed: boolean }).completed);
      }
      setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  // ── 2. Sync to server (debounced) ────────────────────────────────
  const scheduleSync = useCallback(
    (idx: number, completed = false) => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => {
        coursesApi.syncProgress(slug, idx, completed).catch(() => {});
      }, 1000);
    },
    [slug],
  );

  const goToStep = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(idx, totalSteps - 1));
      setStepIdx(clamped);
      try { localStorage.setItem(LS_KEY(slug), String(clamped)); } catch {}
      scheduleSync(clamped);
    },
    [totalSteps, slug, scheduleSync],
  );

  const next = useCallback(() => {
    goToStep(stepIdx + 1);
  }, [stepIdx, goToStep]);

  const prev = useCallback(() => {
    goToStep(stepIdx - 1);
  }, [stepIdx, goToStep]);

  const markComplete = useCallback(() => {
    setIsComplete(true);
    try { localStorage.setItem(LS_KEY(slug) + '_done', '1'); } catch {}
    scheduleSync(stepIdx, true);
  }, [stepIdx, slug, scheduleSync]);

  return { stepIdx, totalSteps, isLoading, goToStep, next, prev, markComplete, isComplete };
}