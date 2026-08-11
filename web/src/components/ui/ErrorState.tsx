export function ErrorState({
  message = 'Something went wrong while loading the questions.',
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <p aria-hidden="true" className="text-2xl">
        ⚠
      </p>
      <p className="max-w-sm text-sm text-fg">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Retry
      </button>
    </div>
  );
}
