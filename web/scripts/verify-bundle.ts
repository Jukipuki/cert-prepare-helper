import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NEXT_DIR = path.resolve(__dirname, '../.next');
const BUDGET_BYTES = 200 * 1024; // 200 KB gzipped, Constitution Principle IV

// Maps each route to the prerendered HTML Next.js writes to .next/server/app/, which lists the
// exact <script> tags a fresh load of that route requests — the real "initial client JS" rather
// than a build-time estimate. Next.js 16 removed the built-in Route (app) size output, so this
// script measures it directly from the build artifacts instead.
const ROUTES: { label: string; htmlPath: string }[] = [
  { label: '/', htmlPath: path.join(NEXT_DIR, 'server/app/index.html') },
  { label: '/quiz', htmlPath: path.join(NEXT_DIR, 'server/app/quiz.html') },
];

function extractScriptPaths(html: string): string[] {
  const matches = html.matchAll(/<script[^>]*\ssrc="(\/_next\/static\/[^"]+\.js)"/g);
  return Array.from(new Set(Array.from(matches, (m) => m[1] as string)));
}

function gzippedSize(filePath: string): number {
  const contents = readFileSync(filePath);
  return gzipSync(contents, { level: 9 }).length;
}

function main() {
  if (!existsSync(NEXT_DIR)) {
    console.error('verify-bundle: no .next/ build output found. Run "npm run build" first.');
    process.exit(1);
  }

  let failed = false;

  for (const route of ROUTES) {
    if (!existsSync(route.htmlPath)) {
      console.error(
        `verify-bundle: expected prerendered output at ${route.htmlPath} — did the build succeed?`,
      );
      failed = true;
      continue;
    }

    const html = readFileSync(route.htmlPath, 'utf8');
    const scriptUrls = extractScriptPaths(html);

    let total = 0;
    for (const url of scriptUrls) {
      const filePath = path.join(NEXT_DIR, url.replace(/^\/_next\//, ''));
      if (!existsSync(filePath)) {
        console.error(`verify-bundle: referenced script not found on disk: ${filePath}`);
        failed = true;
        continue;
      }
      total += gzippedSize(filePath);
    }

    const kb = (total / 1024).toFixed(1);
    const budgetKb = (BUDGET_BYTES / 1024).toFixed(0);
    const overBudget = total > BUDGET_BYTES;
    failed = failed || overBudget;

    console.log(
      `verify-bundle: ${route.label} — ${kb} KB gzipped (${scriptUrls.length} scripts), budget ${budgetKb} KB — ${
        overBudget ? 'FAIL' : 'OK'
      }`,
    );
  }

  if (failed) {
    process.exit(1);
  }
}

main();
