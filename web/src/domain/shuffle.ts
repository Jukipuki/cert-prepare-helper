/**
 * Fisher-Yates shuffle via repeated random removal. `random` is a seam for tests, not a security
 * boundary — defaults to `Math.random`, which is appropriate here because nothing depends on the
 * order being unpredictable to an adversary, only unpredictable to the candidate reading it.
 */
export function shuffleOrder<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const pool = items.slice();
  const result: T[] = [];
  while (pool.length > 0) {
    const index = Math.floor(random() * pool.length);
    result.push(...pool.splice(index, 1));
  }
  return result;
}
