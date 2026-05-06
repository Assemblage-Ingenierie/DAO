import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getProject,
  listProjects,
  updateProjectData,
} from './projectStore.js';

// ── useProject ────────────────────────────────────────────────────────────
// Loads one project by id and exposes a setter that patches a single
// sub-store inside `project.data`. Saves to localStorage are debounced
// (250 ms) so a fast-typing user produces ~5 writes/sec, not ~50.
//
// Usage in Editor.jsx (replaces the 10 usePersistedState calls):
//   const [project, setData] = useProject(id);
//   const formData = project?.data?.formData ?? {};
//   const setFormData = (v) => setData('formData', v);
//   // … same shape for actorAssignments, fieldComments, actors,
//   //   personnelRows, materielRows, propositionItems, bulletListItems,
//   //   articlesEsssRows, tranchesRows.
//
// `setData(key, valueOrFn)` accepts either a value or a (prev) => next
// updater, mirroring the React useState API the legacy code uses.
//
// Returns `[null, noop]` when the id doesn't resolve (project deleted, bad
// URL, race during migration). Callers should handle the null project.
export function useProject(id) {
  const [project, setProject] = useState(() => (id ? getProject(id) : null));
  const saveTimerRef = useRef(null);
  const pendingDataRef = useRef(null);

  // Reload when id changes (navigating between projects).
  useEffect(() => {
    setProject(id ? getProject(id) : null);
  }, [id]);

  // Flush any pending debounced save when unmounting or id changes, so a
  // fast navigation away doesn't lose the last few edits.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        if (pendingDataRef.current && id) {
          updateProjectData(id, pendingDataRef.current);
        }
        saveTimerRef.current = null;
        pendingDataRef.current = null;
      }
    };
  }, [id]);

  const setData = useCallback(
    (key, valueOrFn) => {
      setProject((prev) => {
        if (!prev) return prev;
        const oldValue = prev.data?.[key];
        const newValue =
          typeof valueOrFn === 'function' ? valueOrFn(oldValue) : valueOrFn;
        const nextData = { ...prev.data, [key]: newValue };
        const next = {
          ...prev,
          data: nextData,
          updatedAt: new Date().toISOString(),
        };

        // Debounced save — coalesces bursts of edits into one write.
        pendingDataRef.current = nextData;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          if (pendingDataRef.current) {
            updateProjectData(id, pendingDataRef.current);
            pendingDataRef.current = null;
          }
          saveTimerRef.current = null;
        }, 250);

        return next;
      });
    },
    [id],
  );

  return [project, setData];
}

// ── useProjectList ────────────────────────────────────────────────────────
// Read-only listing for the home page. Refreshes when projects mutate via
// the same tab (createProject / deleteProject / etc. dispatch a custom
// 'dtao:projects-changed' event). Other tabs are not synced — that's fine
// here since multi-tab scenarios are rare and the app already isn't
// concurrent-write safe.
export function useProjectList() {
  const [items, setItems] = useState(() => listProjects());

  useEffect(() => {
    const handler = () => setItems(listProjects());
    window.addEventListener('dtao:projects-changed', handler);
    return () => window.removeEventListener('dtao:projects-changed', handler);
  }, []);

  return items;
}
