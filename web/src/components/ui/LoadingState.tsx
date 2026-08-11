export function LoadingState({ label = 'Loading questions…' }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 py-16 text-center"
    >
      <span
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent"
      />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}
