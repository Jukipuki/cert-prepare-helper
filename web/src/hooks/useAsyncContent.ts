'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { QuestionSourceError } from '@/content/questionSource';

export type AsyncContentState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };

/**
 * The loading/error/retry state machine every async content screen needs (FR-040/Principle III),
 * extracted so it has one implementation instead of one per screen (research.md R6 of
 * specs/002-multi-exam-support). `loader` is read through a ref, refreshed in its own effect rather
 * than mutated during render, so passing a fresh inline closure on every render does not retrigger
 * the fetch. `retry()` resets to the loading state itself (a direct response to a user action) before
 * bumping the counter that reruns the effect — nothing calls `setState` synchronously inside the
 * effect body.
 */
export function useAsyncContent<T>(
  loader: () => Promise<T>,
  fallbackMessage = 'Failed to load content.',
): AsyncContentState<T> & { retry: () => void } {
  const [retryCount, setRetryCount] = useState(0);
  const [state, setState] = useState<AsyncContentState<T>>({ status: 'loading' });
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    let cancelled = false;

    loaderRef
      .current()
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof QuestionSourceError ? error.message : fallbackMessage;
        setState({ status: 'error', message });
      });

    return () => {
      cancelled = true;
    };
  }, [retryCount, fallbackMessage]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setRetryCount((count) => count + 1);
  }, []);

  return { ...state, retry };
}
