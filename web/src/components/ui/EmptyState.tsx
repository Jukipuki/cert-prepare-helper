export function EmptyState({
  title = 'No questions available',
  description = 'The question set has no content to show right now.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
      <p className="max-w-sm text-sm text-muted">{description}</p>
    </div>
  );
}
