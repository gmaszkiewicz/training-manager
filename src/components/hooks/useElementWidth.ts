import { useEffect, useRef, useState, type RefObject } from "react";

/** The element's content width in pixels, kept current with a ResizeObserver; `null` until first measured. */
export function useElementWidth<T extends HTMLElement>(): [RefObject<T | null>, number | null] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (element === null || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver((records) => {
      const record = records[records.length - 1] as ResizeObserverEntry | undefined;
      if (record !== undefined) {
        setWidth(record.contentRect.width);
      }
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  return [ref, width];
}
