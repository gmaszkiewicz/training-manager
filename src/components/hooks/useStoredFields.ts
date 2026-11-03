import { useEffect, useState } from "react";

import { readStored, writePreference } from "@/lib/browser-storage";
import { parseTopChartsFields, topChartsFieldsValue } from "@/lib/measurement-page";
import type { CircumferenceField } from "@/types";

/**
 * A circumference filter's selection: restored from its storage key after hydration, then remembered in storage and
 * in the cookie the next document request renders from.
 */
export function useStoredFields(
  initial: readonly CircumferenceField[],
  accountId: string | null,
  subjectId: string | null,
  storageKey: (accountUserId: string, subjectTraineeId: string) => string,
): [CircumferenceField[], (fields: CircumferenceField[]) => void] {
  const [fields, setFields] = useState<CircumferenceField[]>(() => parseTopChartsFields(topChartsFieldsValue(initial)));
  const [restored, setRestored] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- storage is applied after the hydration render */
  useEffect(() => {
    if (accountId !== null && subjectId !== null) {
      const stored = readStored(storageKey(accountId, subjectId));
      if (stored !== null) {
        setFields(parseTopChartsFields(stored));
      }
    }
    setRestored(true);
  }, [accountId, subjectId, storageKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!restored || accountId === null || subjectId === null) {
      return;
    }
    writePreference(storageKey(accountId, subjectId), topChartsFieldsValue(fields));
  }, [restored, accountId, subjectId, storageKey, fields]);

  return [fields, setFields];
}
