// Wraps an async fn so concurrent callers share one in-flight promise
// instead of each triggering their own call.
export function createSingleFlight<T>(fn: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | null = null;
  return () => {
    if (!pending) {
      pending = fn().finally(() => {
        pending = null;
      });
    }
    return pending;
  };
}
