import { describe, expect, it } from 'vitest';
import { shuffleOrder } from '@/domain/shuffle';

function deterministicRandom(sequence: number[]): () => number {
  let i = 0;
  return () => {
    const value = sequence[i % sequence.length];
    i += 1;
    return value ?? 0;
  };
}

describe('shuffleOrder', () => {
  it('returns every input exactly once for a single-item array', () => {
    expect(shuffleOrder([1])).toEqual([1]);
  });

  it('returns every input exactly once for a two-item array', () => {
    const result = shuffleOrder(['a', 'b']);
    expect(result.slice().sort()).toEqual(['a', 'b']);
  });

  it('returns every input exactly once for a realistic exam-sized array', () => {
    const items = Array.from({ length: 53 }, (_, i) => `${i + 1}`);
    const result = shuffleOrder(items);
    expect(result).toHaveLength(53);
    expect(result.slice().sort((a, b) => Number(a) - Number(b))).toEqual(items);
  });

  it('is deterministic given an injected random source', () => {
    const items = ['a', 'b', 'c', 'd'];
    // Always picks the last remaining element from the shrinking pool, so the result is the
    // input reversed.
    const random = deterministicRandom([0.999]);
    expect(shuffleOrder(items, random)).toEqual(['d', 'c', 'b', 'a']);
  });

  it('does not mutate the input array', () => {
    const items = ['a', 'b', 'c'];
    const copy = items.slice();
    shuffleOrder(items, deterministicRandom([0.5, 0.5]));
    expect(items).toEqual(copy);
  });
});
