// Server Component — owns generateStaticParams for output: 'export'
// Client logic lives in SimulationDetailClient.tsx

import SimulationDetailClient from './SimulationDetailClient';

// Next.js 14 output: 'export' requires at least one entry in generateStaticParams.
// We provide a dummy placeholder; the real ID is read at runtime via useParams()
// inside SimulationDetailClient. The '_' shell page is built but never surfaced.
export function generateStaticParams() {
  return [{ id: '_' }];
}

export const dynamicParams = false;

export default function SimulationDetailPage(): JSX.Element {
  return <SimulationDetailClient />;
}
