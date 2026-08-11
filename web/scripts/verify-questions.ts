import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMMITTED_PATH = path.resolve(__dirname, '../src/content/questions.generated.json');
const GENERATOR_PATH = path.resolve(__dirname, './generate-questions.ts');

function main() {
  const committed = readFileSync(COMMITTED_PATH, 'utf8');

  const tempDir = mkdtempSync(path.join(tmpdir(), 'verify-questions-'));
  const freshPath = path.join(tempDir, 'questions.generated.json');

  try {
    execFileSync('npx', ['tsx', GENERATOR_PATH, freshPath], { stdio: 'inherit' });
    const fresh = readFileSync(freshPath, 'utf8');

    if (fresh !== committed) {
      console.error(
        `verify-questions: ${path.relative(process.cwd(), COMMITTED_PATH)} has drifted from ` +
          'sql/002_seed_ccdv_f_questions.sql. Run "npm run generate:questions" and commit the result.',
      );
      process.exit(1);
    }

    console.log('verify-questions: committed bundle matches a fresh generation from the seed.');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

main();
