import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { readStored, writeStored } from "@/lib/browser-storage";
import { CHART_SELECTION_LIMIT, limitSelection } from "@/lib/measurement-chart";
import { chartsSelectionStorageKey, chartsVisualizedStorageKey } from "@/lib/measurement-page";

/** Sent on `window` after every write, so the list and the charts tile (separate islands) re-read the selection. */
export const chartSelectionEvent = "tm:measurements:chart-selection";

interface ChartSelectionEventDetail {
  checkedKey: string;
  cleared: boolean;
}

interface Selection {
  checked: string[];
  visualized: string[];
}

interface SelectionKeys {
  checked: string;
  visualized: string;
}

export interface ChartSelection {
  checkedIds: string[];
  visualizedIds: string[];
  setChecked: (ids: readonly string[]) => void;
  visualize: () => void;
  clear: () => void;
  reconcile: (requestedIds: readonly string[], foundIds: readonly string[]) => void;
}

interface Options {
  /** Called in every island of this account and trainee when Clear empties the selection. */
  onClear?: () => void;
}

const emptySelection: Selection = { checked: [], visualized: [] };
const emptySnapshot = "\n";

function namedId(id: string | null | undefined): string | null {
  if (id === null || id === undefined || id === "") {
    return null;
  }
  return id;
}

function parseIds(value: string | null): string[] {
  if (value === null || value === "") {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const ids = parsed.filter((id): id is string => typeof id === "string" && id !== "");
    return limitSelection([], ids, CHART_SELECTION_LIMIT);
  } catch {
    return [];
  }
}

// This page's writes, shared by both islands. Storage only seeds the first read, so a blocked or failing
// localStorage still leaves the checkboxes and buttons working for this visit.
const pageSelection = new Map<string, string>();

function readSelection(key: string): string | null {
  return pageSelection.get(key) ?? readStored(key);
}

function writeSelection(key: string, value: string): void {
  pageSelection.set(key, value);
  writeStored(key, value);
}

function readSnapshot(keys: SelectionKeys): string {
  // A string snapshot compares by value, so an unchanged selection never re-renders.
  return `${readSelection(keys.checked) ?? ""}\n${readSelection(keys.visualized) ?? ""}`;
}

function parseSnapshot(snapshot: string): Selection {
  const split = snapshot.indexOf("\n");
  return {
    checked: parseIds(snapshot.slice(0, split)),
    visualized: parseIds(snapshot.slice(split + 1)),
  };
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(chartSelectionEvent, onChange);
  return () => {
    window.removeEventListener(chartSelectionEvent, onChange);
  };
}

function serverSnapshot(): string {
  return emptySnapshot;
}

/**
 * The checked and visualized measurement ids for one account and trainee, shared by the list and the charts tile
 * through localStorage and a window event. Without an account or trainee (kitchen-sink local mode) it stays in memory.
 */
export function useMeasurementChartSelection(
  accountUserId: string | null | undefined,
  subjectTraineeId: string | null | undefined,
  options: Options = {},
): ChartSelection {
  const accountId = namedId(accountUserId);
  const subjectId = namedId(subjectTraineeId);
  const keys = useMemo<SelectionKeys | null>(
    () =>
      accountId === null || subjectId === null
        ? null
        : {
            checked: chartsSelectionStorageKey(accountId, subjectId),
            visualized: chartsVisualizedStorageKey(accountId, subjectId),
          },
    [accountId, subjectId],
  );

  // The server and the hydration render see nothing selected; storage is read right after.
  const getSnapshot = useCallback(() => (keys === null ? emptySnapshot : readSnapshot(keys)), [keys]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const stored = useMemo(() => parseSnapshot(snapshot), [snapshot]);

  const [memory, setMemory] = useState<Selection>(emptySelection);
  const memoryRef = useRef<Selection>(emptySelection);

  const onClearRef = useRef(options.onClear);
  useEffect(() => {
    onClearRef.current = options.onClear;
  }, [options.onClear]);

  useEffect(() => {
    if (keys === null) {
      return;
    }
    const checkedKey = keys.checked;
    function onSelection(event: Event) {
      const detail = (event as CustomEvent<ChartSelectionEventDetail | undefined>).detail;
      if (detail?.cleared === true && detail.checkedKey === checkedKey) {
        onClearRef.current?.();
      }
    }
    window.addEventListener(chartSelectionEvent, onSelection);
    return () => {
      window.removeEventListener(chartSelectionEvent, onSelection);
    };
  }, [keys]);

  const current = useCallback(
    (): Selection => (keys === null ? memoryRef.current : parseSnapshot(readSnapshot(keys))),
    [keys],
  );

  const write = useCallback(
    (next: Selection, cleared = false): void => {
      if (keys === null) {
        memoryRef.current = next;
        setMemory(next);
        if (cleared) {
          onClearRef.current?.();
        }
        return;
      }
      writeSelection(keys.checked, JSON.stringify(next.checked));
      writeSelection(keys.visualized, JSON.stringify(next.visualized));
      const detail: ChartSelectionEventDetail = { checkedKey: keys.checked, cleared };
      window.dispatchEvent(new CustomEvent(chartSelectionEvent, { detail }));
    },
    [keys],
  );

  const setChecked = useCallback(
    (ids: readonly string[]): void => {
      write({ ...current(), checked: limitSelection([], ids, CHART_SELECTION_LIMIT) });
    },
    [current, write],
  );

  const visualize = useCallback((): void => {
    const selection = current();
    write({ checked: selection.checked, visualized: [...selection.checked] });
  }, [current, write]);

  const clear = useCallback((): void => {
    write(emptySelection, true);
  }, [write]);

  const reconcile = useCallback(
    (requestedIds: readonly string[], foundIds: readonly string[]): void => {
      const selection = current();
      const found = new Set(foundIds);
      // Only ids this read asked for can be known stale; ids visualized since then, and other checked ids, stay.
      const stale = new Set(requestedIds.filter((id) => !found.has(id)));
      if (!selection.visualized.some((id) => stale.has(id))) {
        return;
      }
      write({
        checked: selection.checked.filter((id) => !stale.has(id)),
        visualized: selection.visualized.filter((id) => !stale.has(id)),
      });
    },
    [current, write],
  );

  const selection = keys === null ? memory : stored;
  return {
    checkedIds: selection.checked,
    visualizedIds: selection.visualized,
    setChecked,
    visualize,
    clear,
    reconcile,
  };
}
