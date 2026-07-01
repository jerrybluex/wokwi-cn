/**
 * useAutosave — debounce-save a code+wiring pair to /api/projects/:id.
 *
 * Skips the initial run (we don't want to re-save what we just loaded).
 * Subsequent calls fire 10s after the last change. `force: true` triggers
 * an immediate save (used by the manual Save button).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { projectsApi } from '../projects/api';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const AUTOSAVE_DELAY_MS = 10_000;

export function useAutosave(
  projectId: string | null,
  code: string,
  wiring: string,
) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const firstRun = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Snapshot of the last values we actually persisted, to avoid saving
  // identical content.
  const lastSerialized = useRef<{ code: string; wiring: string } | null>(null);

  const performSave = useCallback(async () => {
    if (!projectId) return;
    const current = { code, wiring };
    if (
      lastSerialized.current &&
      lastSerialized.current.code === current.code &&
      lastSerialized.current.wiring === current.wiring
    ) {
      return; // nothing changed
    }
    setStatus('saving');
    setError(null);
    const { status: http, data } = await projectsApi.update(projectId, current);
    if (http === 200 && 'project' in data) {
      lastSerialized.current = current;
      setStatus('saved');
      setLastSavedAt(Date.now());
    } else {
      const msg = 'error' in data ? data.error : 'save_failed';
      setStatus('error');
      setError(msg);
    }
  }, [projectId, code, wiring]);

  // Reset the snapshot when the project changes.
  useEffect(() => {
    firstRun.current = true;
    lastSerialized.current = null;
    setStatus('idle');
    setError(null);
    setLastSavedAt(null);
  }, [projectId]);

  // Debounced auto-save.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (!projectId) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      performSave();
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [projectId, code, wiring, performSave]);

  const saveNow = useCallback(() => performSave(), [performSave]);

  return { status, lastSavedAt, error, saveNow };
}
