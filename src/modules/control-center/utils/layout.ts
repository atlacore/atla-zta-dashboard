import type { Edge, Node } from "@xyflow/react";

export const DEFAULT_MAX_ZOOM = 1.6;
export const DEFAULT_MIN_ZOOM = 0.2;

const NODE_HEIGHT = 64;
const ROW_GAP = 28;
const COLUMN_X = [0, 400, 900, 1360];
const SWEEPS = 8;

const TARGET_TYPE_ORDER: Record<string, number> = {
  resourceNode: 0,
  networkNode: 1,
};

function columnOf(node: Node): number {
  if (node.type === "userNode") return 0;
  if (node.type === "policyNode") return 1;
  if (node.type === "routeNode") return 3;
  return 2;
}

// Vertical position in [0, 1] so ranks from columns of different length are comparable.
function normalizedRanks(columns: Node[][]): Map<string, number> {
  const ranks = new Map<string, number>();
  columns.forEach((column) =>
    column.forEach((node, index) =>
      ranks.set(node.id, (index + 0.5) / column.length),
    ),
  );
  return ranks;
}

function reorder(
  column: Node[],
  neighbours: Map<string, string[]>,
  ranks: Map<string, number>,
): Node[] {
  return column
    .map((node, index) => {
      const linked = neighbours.get(node.id) ?? [];
      const center = linked.length
        ? linked.reduce((sum, other) => sum + (ranks.get(other) ?? 0.5), 0) /
          linked.length
        : Number.MAX_SAFE_INTEGER;
      return { node, index, center };
    })
    .sort((a, b) => a.center - b.center || a.index - b.index)
    .map((entry) => entry.node);
}

// Four-column layout (users | policy rules | resources and networks | network routes). Each column
// is ordered by the barycenter of its neighbours over a few forward/backward sweeps to cut edge crossings.
export function layoutColumns(nodes: Node[], edges: Edge[]): Node[] {
  const neighbours = new Map<string, string[]>();
  const link = (from: string, to: string) =>
    neighbours.set(from, [...(neighbours.get(from) ?? []), to]);
  edges.forEach((edge) => {
    link(edge.source, edge.target);
    link(edge.target, edge.source);
  });

  const columns: Node[][] = [[], [], [], []];
  nodes.forEach((node) => columns[columnOf(node)].push(node));
  columns[2].sort(
    (a, b) =>
      (TARGET_TYPE_ORDER[a.type ?? ""] ?? 2) -
      (TARGET_TYPE_ORDER[b.type ?? ""] ?? 2),
  );

  for (let sweep = 0; sweep < SWEEPS; sweep++) {
    const order = sweep % 2 === 0 ? [1, 2, 3, 0] : [2, 1, 0, 3];
    order.forEach((index) => {
      columns[index] = reorder(
        columns[index],
        neighbours,
        normalizedRanks(columns),
      );
    });
  }

  return columns.flatMap((column, columnIndex) => {
    const offset = (column.length * (NODE_HEIGHT + ROW_GAP)) / 2;
    return column.map((node, index) => ({
      ...node,
      position: {
        x: COLUMN_X[columnIndex],
        y: index * (NODE_HEIGHT + ROW_GAP) - offset,
      },
    }));
  });
}
