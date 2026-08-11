export function ProgressIndicator({
  position,
  total,
  correctCount,
}: {
  position: number;
  total: number;
  correctCount: number;
}) {
  return (
    <div className="flex items-center justify-between text-sm text-muted">
      <span>
        Question {position} of {total}
      </span>
      <span>{correctCount} correct so far</span>
    </div>
  );
}
