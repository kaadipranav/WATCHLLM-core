'use client';

import type { TraceGraph, TraceNode } from '@watchllm/types';
import { useGraphLayout } from '@/hooks/useGraphLayout';

interface GraphVisualizerProps {
  graph: TraceGraph | null;
  selectedNodeId: string | null;
  highlightedNodeIds: Set<string>;
  onNodeSelect: (nodeId: string) => void;
}

function isNodeCompromised(node: TraceNode): boolean {
  const compromised = node.metadata['compromised'];
  return typeof compromised === 'boolean' && compromised;
}

function nodeColor(node: TraceNode): string {
  if (isNodeCompromised(node)) return '#ff4444';

  switch (node.type) {
    case 'llm_call':
      return '#00C896';
    case 'tool_call':
      return '#6366f1';
    case 'decision':
      return '#f59e0b';
    case 'memory_read':
    case 'memory_write':
      return '#888888';
    case 'agent_start':
    case 'agent_end':
      return '#f0f0f0';
    default:
      return '#f0f0f0';
  }
}

export function GraphVisualizer({
  graph,
  selectedNodeId,
  highlightedNodeIds,
  onNodeSelect,
}: GraphVisualizerProps) {
  const layout = useGraphLayout(graph);

  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="flex h-[520px] items-center justify-center rounded-lg border border-border bg-surface text-text-secondary">
        No graph data available.
      </div>
    );
  }

  return (
    <div className="h-[520px] w-full overflow-auto rounded-lg border border-border bg-surface p-4">
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="h-full min-w-[680px] w-full" fill="none">
        {layout.edges.map((edge) => {
          const isActive = highlightedNodeIds.has(edge.from) && highlightedNodeIds.has(edge.to);
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
              stroke="rgba(255,255,255,0.24)"
              strokeWidth={2}
              opacity={isActive ? 0.8 : 0.2}
            />
          );
        })}

        {layout.nodes.map((positionedNode) => {
          const { node, x, y } = positionedNode;
          const selected = node.id === selectedNodeId;
          const highlighted = highlightedNodeIds.has(node.id);

          return (
            <g
              key={node.id}
              className="cursor-pointer"
              onClick={() => onNodeSelect(node.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onNodeSelect(node.id);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Node ${node.id}`}
            >
              <circle
                cx={x}
                cy={y}
                r={20}
                fill={nodeColor(node)}
                stroke={selected ? '#00C896' : 'rgba(255,255,255,0.2)'}
                strokeWidth={selected ? 3 : 1.5}
                opacity={highlighted ? 1 : 0.3}
              />
              <text
                x={x}
                y={y + 38}
                textAnchor="middle"
                fill="#888888"
                fontSize="11"
                fontFamily="var(--font-geist-mono)"
              >
                {node.type}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}