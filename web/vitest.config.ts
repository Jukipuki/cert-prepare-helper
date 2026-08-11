import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Node's own experimental global `localStorage` (unflagged since ~Node 22) shadows jsdom's
// window.localStorage with a non-functional stub unless a --localstorage-file is configured,
// which breaks any test touching localStorage (first needed by this feature's
// ShufflePreferenceStore). Disabling it here, before test workers are spawned, lets jsdom's real
// implementation through instead.
process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS ?? ''} --no-experimental-webstorage`.trim();

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/component/**/*.test.tsx'],
  },
});
