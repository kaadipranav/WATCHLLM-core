'use client';

import { useMemo } from 'react';
import type { TraceGraph, TraceNode } from '@watchllm/types';

type PositionedNode = {
  node: TraceNode;
  x: number;
  y: number;
};

type PositionedEdge = {
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export interface GraphLayout {
  width: number;
  height: number;
  nodes: PositionedNode[];
  edges: PositionedEdge[];
}

const DEFAULT_LAYOUT: GraphLayout = {
  width: 800,
  height: 460,
  nodes: [],
  edges: [],
};

function buildDepthMap(graph: TraceGraph): Map<string, number> {
  const adjacency = new Map<string, string[]>();

  for (const edge of graph.edges) {
    const neighbors = adjacency.get(edge.from) ?? [];
    neighbors.push(edge.to);
    adjacency.set(edge.from, neighbors);
  }

  const rootNode = graph.nodes.find((node) => node.type === 'agent_start') ?? graph.nodes[0];
  const depthMap = new Map<string, number>();

  if (!rootNode) return depthMap;

  const queue: string[] = [rootNode.id];
  depthMap.set(rootNode.id, 0);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    const currentDepth = depthMap.get(current) ?? 0;
    const neighbors = adjacency.get(current) ?? [];

    for (const nextNode of neighbors) {
      if (depthMap.has(nextNode)) continue;
      depthMap.set(nextNode, currentDepth + 1);
      queue.push(nextNode);
    }
  }

  let overflowDepth = Math.max(...depthMap.values(), 0) + 1;
  const sortedByTimestamp = [...graph.nodes].sort((a, b) => a.timestamp - b.timestamp);

  for (const node of sortedByTimestamp) {
    if (depthMap.has(node.id)) continue;
    depthMap.set(node.id, overflowDepth);
    overflowDepth += 1;
  }

  return depthMap;
}

function computeLayout(graph: TraceGraph | null): GraphLayout {
  if (!graph || graph.nodes.length === 0) return DEFAULT_LAYOUT;

  const depthMap = buildDepthMap(graph);
  const depthRows = new Map<number, TraceNode[]>();

  for (const node of graph.nodes) {
    const depth = depthMap.get(node.id) ?? 0;
    const row = depthRows.get(depth) ?? [];
    row.push(node);
    depthRows.set(depth, row);
  }

  for (const row of depthRows.values()) {
    row.sort((a, b) => a.timestamp - b.timestamp);
  }

  const COL_GAP = 170;
  const ROW_GAP = 140;
  const PAD_X = 90;
  const PAD_Y = 70;

  const maxColumns = Math.max(...Array.from(depthRows.values(), (row) => row.length), 1);
  const maxDepth = Math.max(...depthRows.keys(), 0);

  const width = PAD_X * 2 + Math.max(0, maxColumns - 1) * COL_GAP;
  const height = PAD_Y * 2 + Math.max(1, maxDepth) * ROW_GAP;

  const positionedNodes: PositionedNode[] = [];

  for (const [depth, row] of depthRows.entries()) {
    const rowWidth = Math.max(0, row.length - 1) * COL_GAP;
    const rowStartX = PAD_X + ((maxColumns - 1) * COL_GAP - rowWidth) / 2;
    const y = PAD_Y + depth * ROW_GAP;

    row.forEach((node, index) => {
      positionedNodes.push({
        node,
        x: rowStartX + index * COL_GAP,
        y,
      });
    });
  }

  const nodePositions = new Map(positionedNodes.map((positioned) => [positioned.node.id, positioned]));

  const positionedEdges: PositionedEdge[] = graph.edges
    .map((edge) => {
      const fromNode = nodePositions.get(edge.from);
      const toNode = nodePositions.get(edge.to);

      if (!fromNode || !toNode) return null;

      return {
        from: edge.from,
        to: edge.to,
        x1: fromNode.x,
        y1: fromNode.y,
        x2: toNode.x,
        y2: toNode.y,
      };
    })
    .filter((edge): edge is PositionedEdge => edge !== null);

  return {
    width,
    height,
    nodes: positionedNodes,
    edges: positionedEdges,
  };
}

export function useGraphLayout(graph: TraceGraph | null) {
  return useMemo(() => computeLayout(graph), [graph]);
}