import { afterEach, describe, expect, it, vi } from 'vitest';
import { localShufflePreferenceStore } from '@/preferences/shufflePreferenceStore';

describe('localShufflePreferenceStore', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns false when nothing has been stored yet', () => {
    expect(localShufflePreferenceStore.get()).toBe(false);
  });

  it('round-trips true', () => {
    localShufflePreferenceStore.set(true);
    expect(localShufflePreferenceStore.get()).toBe(true);
  });

  it('round-trips false after having been set to true', () => {
    localShufflePreferenceStore.set(true);
    localShufflePreferenceStore.set(false);
    expect(localShufflePreferenceStore.get()).toBe(false);
  });

  it('get() falls back to false when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    expect(localShufflePreferenceStore.get()).toBe(false);
  });

  it('set() does not throw when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    expect(() => localShufflePreferenceStore.set(true)).not.toThrow();
  });
});
