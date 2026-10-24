interface IdleRuntimeCleanupOptions {
  enabled: boolean;
  collect(): Promise<unknown>;
  onError(error: unknown): void;
  schedule?: (tick: () => void, intervalMs: number) => () => void;
}

/** Host-owned sweep lifetime; shutdown waits for an already admitted sweep. */
export function startIdleRuntimeCleanup(options: IdleRuntimeCleanupOptions): () => Promise<void> {
  let collection: Promise<unknown> | null = null;
  let stopped = false;
  const schedule =
    options.schedule ??
    ((tick, intervalMs) => {
      const timer = setInterval(tick, intervalMs);
      timer.unref();
      return () => clearInterval(timer);
    });
  const cancel = schedule(() => {
    if (!options.enabled || stopped || collection) return;
    collection = options
      .collect()
      .catch(options.onError)
      .finally(() => {
        collection = null;
      });
  }, 60_000);
  return async () => {
    stopped = true;
    cancel();
    await collection;
  };
}
