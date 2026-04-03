'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TraceGraph, TraceNode } from '@watchllm/types';
import { api, ApiRequestError } from '@/lib/api-client';

export function useSimulationReplay(simulationId: string) {
  const [graphs, setGraphs] = useState<TraceGraph[]>([]);
  const [activeGraphIndex, setActiveGraphIndex] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [scrubIndex, setScrubIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  const loadReplay = useCallback(async () => {
    try {
      setIsLoading(true);
      const replayGraphs = await api.simulations.replay(simulationId);
      setGraphs(replayGraphs);
      setActiveGraphIndex(0);
      setUpgradeRequired(false);
      setError(null);
    } catch (loadError) {
      if (loadError instanceof ApiRequestError && loadError.code === 403) {
        setUpgradeRequired(true);
        setError(null);
      } else {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load replay graph');
      }
    } finally {
      setIsLoading(false);
    }
  }, [simulationId]);

  useEffect(() => {
    void loadReplay();
  }, [loadReplay]);

  const activeGraph = graphs[activeGraphIndex] ?? null;

  const sortedNodes = useMemo(() => {
    if (!activeGraph) return [];
    return [...activeGraph.nodes].sort((a, b) => a.timestamp - b.timestamp);
  }, [activeGraph]);

  useEffect(() => {
    if (sortedNodes.length === 0) {
      setScrubIndex(0);
      setSelectedNodeId(null);
      return;
    }

    setScrubIndex(sortedNodes.length - 1);
    setSelectedNodeId(sortedNodes[0]?.id ?? null);
  }, [activeGraph?.run_id, sortedNodes]);

  const highlightedNodeIds = useMemo(() => {
    const highlighted = new Set<string>();
    sortedNodes.slice(0, scrubIndex + 1).forEach((node) => highlighted.add(node.id));
    return highlighted;
  }, [scrubIndex, sortedNodes]);

  const selectedNode = useMemo<TraceNode | null>(() => {
    if (!activeGraph || !selectedNodeId) return null;
    return activeGraph.nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [activeGraph, selectedNodeId]);

  const selectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const scrubTo = useCallback((index: number) => {
    setScrubIndex(index);
  }, []);

  const selectRun = useCallback(
    (runId: string) => {
      const index = graphs.findIndex((graph) => graph.run_id === runId);
      if (index >= 0) setActiveGraphIndex(index);
    },
    [graphs],
  );

  return {
    graphs,
    activeGraph,
    selectedNode,
    highlightedNodeIds,
    scrubIndex,
    isLoading,
    error,
    upgradeRequired,
    selectNode,
    scrubTo,
    selectRun,
    refresh: loadReplay,
  };
}