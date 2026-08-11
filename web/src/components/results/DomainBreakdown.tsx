import type { DomainResult } from '@/domain/types';

export function DomainBreakdown({ byDomain }: { byDomain: DomainResult[] }) {
  return (
    <table className="w-full text-left text-sm">
      <caption className="mb-2 text-left text-sm font-medium text-fg">By domain</caption>
      <thead>
        <tr className="border-b border-line text-muted">
          <th scope="col" className="py-2 font-medium">
            Domain
          </th>
          <th scope="col" className="py-2 text-right font-medium">
            Correct
          </th>
        </tr>
      </thead>
      <tbody>
        {byDomain.map((domain) => (
          <tr key={domain.domainNumber} className="border-b border-line last:border-0">
            <td className="py-2 text-fg">{domain.domainName}</td>
            <td className="py-2 text-right text-muted">
              {domain.correct} / {domain.asked}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
