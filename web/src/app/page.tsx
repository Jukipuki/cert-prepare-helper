import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-10 px-6 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">CCDV-F Practice Quiz</h1>
        <p className="max-w-md text-sm text-muted">
          53 practice questions. Nothing you do here is saved or sent anywhere — refreshing the page
          starts over.
        </p>
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-2">
        <Link
          href="/quiz?mode=zen"
          className="flex flex-col gap-2 rounded-xl border border-line p-6 text-left transition-colors hover:border-accent hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span className="text-lg font-semibold">Zen mode</span>
          <span className="text-sm text-muted">
            Untimed. See the correct answer and explanation right after each question. Step back to
            review earlier questions any time.
          </span>
        </Link>

        <Link
          href="/quiz?mode=exam"
          className="flex flex-col gap-2 rounded-xl border border-line p-6 text-left transition-colors hover:border-accent hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span className="text-lg font-semibold">Exam mode</span>
          <span className="text-sm text-muted">
            A 120-minute timed simulation. Answer questions in any order using the question grid.
            Results and explanations appear only after you submit.
          </span>
        </Link>
      </div>
    </main>
  );
}
