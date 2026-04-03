'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export default function SimulationsIndexPage() {
  const [simulationId, setSimulationId] = useState('');

  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <h1 className="text-2xl font-semibold text-text-primary">Simulations</h1>
      <p className="mt-2 text-text-secondary">
        Enter a simulation ID to inspect its execution graph and node-level payloads.
      </p>

      <div className="mt-5 flex max-w-xl flex-col gap-3 sm:flex-row">
        <input
          value={simulationId}
          onChange={(event) => setSimulationId(event.target.value)}
          placeholder="sim_xxxxxxxxxxxxxxxxxxxxx"
          className="h-10 flex-1 rounded-[7px] border border-border bg-surface-raised px-3 text-text-primary outline-none transition-all duration-150 ease-in-out focus:border-border-hover"
        />
        <Button variant="accent" href={simulationId ? `/dashboard/simulations/${simulationId}` : undefined} disabled={!simulationId}>
          Open simulation
        </Button>
      </div>
    </section>
  );
}