import { useState } from "react";

/**
 * The value, or while it is `null` the last value that was not: a tile keeps showing what it last loaded while the next
 * read is on its way, instead of collapsing to a loading line. The value must keep its identity between renders (a
 * memoised object), since any new object counts as a change.
 */
export function useLastSettled<T>(value: T | null): T | null {
  const [last, setLast] = useState<T | null>(value);
  // Updating state while rendering is React's pattern for state derived from a changing input.
  if (value !== null && value !== last) {
    setLast(value);
  }
  return value ?? last;
}
