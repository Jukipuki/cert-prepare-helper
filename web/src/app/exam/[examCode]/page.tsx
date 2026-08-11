import { ModeChoiceHost } from '@/app/exam/[examCode]/ModeChoiceHost';
import { SEED_SOURCES } from '../../../../scripts/generate-questions';

// The configured exam codes are a small, known, build-time list (research.md R2 of
// specs/002-multi-exam-support) — prerendering each one statically, rather than leaving this route
// server-rendered on demand, keeps every screen in the app equally reachable with no backend.
export function generateStaticParams() {
  return SEED_SOURCES.map((source) => ({ examCode: source.examCode }));
}

export default async function ExamModeChoicePage({
  params,
}: {
  params: Promise<{ examCode: string }>;
}) {
  const { examCode } = await params;
  const decoded = decodeURIComponent(examCode);
  // Keyed so navigating between two exam codes on this same route always mounts a fresh instance
  // (and fresh useAsyncContent state) rather than relying on Next.js's reconciliation behavior.
  return <ModeChoiceHost key={decoded} examCode={decoded} />;
}
