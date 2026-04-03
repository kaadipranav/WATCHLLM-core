import { SimulationDetailClient } from '@/components/dashboard/SimulationDetailClient';

interface SimulationPageProps {
  params: {
    id: string;
  };
}

export default function SimulationPage({ params }: SimulationPageProps) {
  return <SimulationDetailClient simulationId={params.id} />;
}