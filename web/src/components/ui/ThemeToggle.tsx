'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // resolvedTheme is unknown on the server, so the button stays disabled until after hydration
  // rather than guessing — this is the mount-detection pattern next-themes' own docs recommend.
  // Keeping a single button element (rather than swapping between two JSX blocks) means the
  // server and first client render produce the exact same tree, with only props differing.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- documented next-themes pattern
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      disabled={!mounted}
      aria-label={
        mounted ? (isDark ? 'Switch to light theme' : 'Switch to dark theme') : 'Toggle theme'
      }
      className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-sm hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default"
    >
      <span aria-hidden="true">{mounted ? (isDark ? '☀' : '🌙') : '🌓'}</span>
    </button>
  );
}
