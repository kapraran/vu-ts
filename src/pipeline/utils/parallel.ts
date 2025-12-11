/**
 * Parallel processing utilities
 * For now, we use Promise.all for parallelization
 * WorkerPool can be added later if needed for more complex scenarios
 */

export async function processInBatches<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number
): Promise<{ results: R[]; errors: Array<{ item: T; error: Error }> }> {
  const results: R[] = [];
  const errors: Array<{ item: T; error: Error }> = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map((item) => processor(item))
    );

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        errors.push({ item: batch[j], error: result.reason as Error });
      }
    }
  }

  return { results, errors };
}

export async function* processInBatchesAsync<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number
): AsyncGenerator<{ results: R[]; errors: Array<{ item: T; error: Error }> }> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map((item) => processor(item))
    );

    const results: R[] = [];
    const errors: Array<{ item: T; error: Error }> = [];

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        errors.push({ item: batch[j], error: result.reason as Error });
      }
    }

    yield { results, errors };
  }
}
