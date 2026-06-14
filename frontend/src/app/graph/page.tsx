"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  GitBranch,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
  AlertCircle,
  User,
  FileText,
  Hexagon,
  Zap,
  Target,
  Info,
  X,
  RotateCcw
} from "lucide-react";
import { api, GraphData, GraphNode, GraphEdge } from "@/utils/api";

interface PositionedNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

interface LayoutEdge extends GraphEdge {
  source: string;
  target: string;
  sourceNode: PositionedNode;
  targetNode: PositionedNode;
}

const NODE_COLORS: Record<string, string> = {
  Employee: "#6366f1",
  Project: "#a855f7",
  Feature: "#06b6d4",
  Document: "#f59e0b",
  Incident: "#ef4444",
  Entity: "#14b8a6",
};

export default function GraphPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderRef = useRef<number>(0);
  const simRef = useRef<number>(0);
  const nodesRef = useRef<PositionedNode[]>([]);
  const edgesRef = useRef<LayoutEdge[]>([]);
  const dragNodeRef = useRef<PositionedNode | null>(null);
  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const hoveredIdRef = useRef<string | null>(null);
  const zoomRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });

  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [nodeCount, setNodeCount] = useState(0);
  const [edgeCount, setEdgeCount] = useState(0);

  // Load graph data
  useEffect(() => {
    async function load() {
      try {
        const data = await api.getGraph();
        setGraphData(data);
      } catch (e: any) {
        setError(e.message || "Failed to load graph data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Initialize and run simulation when data loads
  useEffect(() => {
    if (!graphData || graphData.nodes.length === 0) return;

    const centerX = 400;
    const centerY = 300;
    const radius = 200;

    const nodeMap = new Map<string, PositionedNode>();
    const posNodes: PositionedNode[] = graphData.nodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / graphData.nodes.length;
      const color = NODE_COLORS[n.label] || "#64748b";
      return {
        ...n,
        x: centerX + radius * Math.cos(angle) + (Math.random() - 0.5) * 30,
        y: centerY + radius * Math.sin(angle) + (Math.random() - 0.5) * 30,
        vx: 0,
        vy: 0,
        radius: n.label === "Project" ? 32 : n.label === "Employee" ? 28 : 24,
        color,
      };
    });

    posNodes.forEach((n) => nodeMap.set(n.id, n));

    const posEdges: LayoutEdge[] = graphData.edges
      .map((e) => {
        const sourceNode = nodeMap.get(e.source);
        const targetNode = nodeMap.get(e.target);
        if (!sourceNode || !targetNode) return null;
        return { ...e, sourceNode, targetNode };
      })
      .filter((e): e is LayoutEdge => e !== null);

    nodesRef.current = posNodes;
    edgesRef.current = posEdges;
    setNodeCount(posNodes.length);
    setEdgeCount(posEdges.length);

    // Run force simulation
    const REPULSION = 8000;
    const ATTRACTION = 0.005;
    const DAMPING = 0.85;
    const CENTER_GRAVITY = 0.01;
    const MIN_VELOCITY = 0.1;
    let stableFrames = 0;

    const simulate = () => {
      const simNodes = nodesRef.current;

      if (dragNodeRef.current) {
        dragNodeRef.current.vx = 0;
        dragNodeRef.current.vy = 0;
      }

      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const a = simNodes[i];
          const b = simNodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1) dist = 1;
          const force = REPULSION / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          if (dragNodeRef.current?.id !== a.id) { a.vx -= fx; a.vy -= fy; }
          if (dragNodeRef.current?.id !== b.id) { b.vx += fx; b.vy += fy; }
        }
      }

      for (const edge of edgesRef.current) {
        const source = edge.sourceNode;
        const target = edge.targetNode;
        let dx = target.x - source.x;
        let dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const force = dist * ATTRACTION;
        const fx = dx * force;
        const fy = dy * force;
        if (dragNodeRef.current?.id !== source.id) { source.vx += fx; source.vy += fy; }
        if (dragNodeRef.current?.id !== target.id) { target.vx -= fx; target.vy -= fy; }
      }

      for (const node of simNodes) {
        if (dragNodeRef.current?.id === node.id) continue;
        node.vx += (400 - node.x) * CENTER_GRAVITY;
        node.vy += (300 - node.y) * CENTER_GRAVITY;
      }

      let totalVelocity = 0;
      for (const node of simNodes) {
        if (dragNodeRef.current?.id === node.id) continue;
        node.vx *= DAMPING;
        node.vy *= DAMPING;
        node.x += node.vx;
        node.y += node.vy;
        if (!isFinite(node.x)) node.x = 400;
        if (!isFinite(node.y)) node.y = 300;
        totalVelocity += Math.abs(node.vx) + Math.abs(node.vy);
      }

      if (totalVelocity < MIN_VELOCITY) {
        stableFrames++;
      } else {
        stableFrames = 0;
      }

      if (stableFrames < 60) {
        simRef.current = requestAnimationFrame(simulate);
      }
    };

    simRef.current = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(simRef.current);
  }, [graphData]);

  // Continuous canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      const z = zoomRef.current;
      const off = offsetRef.current;
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const hoveredId = hoveredIdRef.current;
      const selId = selectedNode?.id;

      ctx.save();
      ctx.translate(off.x, off.y);
      ctx.scale(z, z);

      for (const edge of edges) {
        const sx = edge.sourceNode.x;
        const sy = edge.sourceNode.y;
        const tx = edge.targetNode.x;
        const ty = edge.targetNode.y;
        if (!isFinite(sx) || !isFinite(sy) || !isFinite(tx) || !isFinite(ty)) continue;

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (edge.label) {
          const mx = (sx + tx) / 2;
          const my = (sy + ty) / 2;
          ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
          ctx.font = "9px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(edge.label, mx, my - 8);
        }
      }

      for (const node of nodes) {
        if (!isFinite(node.x) || !isFinite(node.y)) continue;
        const isHovered = hoveredId === node.id;
        const isSelected = selId === node.id;
        const r = isHovered || isSelected ? node.radius + 4 : node.radius;

        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 2.5);
        gradient.addColorStop(0, `${node.color}33`);
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        if (isSelected) {
          ctx.strokeStyle = "#f8fafc";
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (isHovered) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        ctx.fillStyle = "#cbd5e1";
        ctx.font = `${isHovered || isSelected ? 11 : 10}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(node.name, node.x, node.y + r + 4);

        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.font = "bold 14px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(node.name.charAt(0).toUpperCase(), node.x, node.y);
      }

      ctx.restore();
      renderRef.current = requestAnimationFrame(render);
    };

    renderRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(renderRef.current);
  }, [selectedNode]);

  // Sync zoom/offset state to refs for the render loop
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);

  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const z = zoomRef.current;
    const off = offsetRef.current;
    return {
      x: (clientX - rect.left - off.x) / z,
      y: (clientY - rect.top - off.y) / z,
    };
  }, []);

  const findNodeAt = useCallback((x: number, y: number): PositionedNode | null => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = x - n.x;
      const dy = y - n.y;
      if (dx * dx + dy * dy <= (n.radius + 5) * (n.radius + 5)) {
        return n;
      }
    }
    return null;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasPos(e.clientX, e.clientY);
    const node = findNodeAt(pos.x, pos.y);

    if (node) {
      isDraggingRef.current = true;
      dragNodeRef.current = node;
    } else {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - offsetRef.current.x, y: e.clientY - offsetRef.current.y };
    }
  }, [getCanvasPos, findNodeAt]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingRef.current && dragNodeRef.current) {
      const pos = getCanvasPos(e.clientX, e.clientY);
      dragNodeRef.current.x = pos.x;
      dragNodeRef.current.y = pos.y;
      return;
    }

    if (isPanningRef.current) {
      const newOffset = { x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y };
      offsetRef.current = newOffset;
      setOffset(newOffset);
      return;
    }

    const pos = getCanvasPos(e.clientX, e.clientY);
    const node = findNodeAt(pos.x, pos.y);
    hoveredIdRef.current = node?.id || null;
    document.body.style.cursor = node ? "pointer" : "default";
  }, [getCanvasPos, findNodeAt]);

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current && dragNodeRef.current) {
      const node = dragNodeRef.current;
      setSelectedNode({
        id: node.id,
        label: node.label,
        name: node.name,
        summary: node.summary,
      });
    }
    isDraggingRef.current = false;
    dragNodeRef.current = null;
    isPanningRef.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => {
      const next = Math.max(0.2, Math.min(5, z * delta));
      zoomRef.current = next;
      return next;
    });
  }, []);

  const zoomIn = () => setZoom((z) => { const n = Math.min(5, z * 1.3); zoomRef.current = n; return n; });
  const zoomOut = () => setZoom((z) => { const n = Math.max(0.2, z / 1.3); zoomRef.current = n; return n; });
  const resetView = () => { setZoom(1); zoomRef.current = 1; setOffset({ x: 0, y: 0 }); offsetRef.current = { x: 0, y: 0 }; };
  const restartSimulation = () => {
    if (simRef.current) cancelAnimationFrame(simRef.current);
    const nodes = nodesRef.current;
    for (const n of nodes) { n.vx = 0; n.vy = 0; }
    // Re-run simulation
    const REPULSION = 8000;
    const ATTRACTION = 0.005;
    const DAMPING = 0.85;
    const CENTER_GRAVITY = 0.01;
    const MIN_VELOCITY = 0.1;
    let stableFrames = 0;

    const simulate = () => {
      const simNodes = nodesRef.current;
      if (dragNodeRef.current) { dragNodeRef.current.vx = 0; dragNodeRef.current.vy = 0; }

      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const a = simNodes[i], b = simNodes[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          let dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1) dist = 1;
          const force = REPULSION / (dist * dist);
          const fx = (dx / dist) * force, fy = (dy / dist) * force;
          if (dragNodeRef.current?.id !== a.id) { a.vx -= fx; a.vy -= fy; }
          if (dragNodeRef.current?.id !== b.id) { b.vx += fx; b.vy += fy; }
        }
      }

      for (const edge of edgesRef.current) {
        const s = edge.sourceNode, t = edge.targetNode;
        let dx = t.x - s.x, dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const force = dist * ATTRACTION;
        const fx = dx * force, fy = dy * force;
        if (dragNodeRef.current?.id !== s.id) { s.vx += fx; s.vy += fy; }
        if (dragNodeRef.current?.id !== t.id) { t.vx -= fx; t.vy -= fy; }
      }

      for (const node of simNodes) {
        if (dragNodeRef.current?.id === node.id) continue;
        node.vx += (400 - node.x) * CENTER_GRAVITY;
        node.vy += (300 - node.y) * CENTER_GRAVITY;
      }

      let totalVelocity = 0;
      for (const node of simNodes) {
        if (dragNodeRef.current?.id === node.id) continue;
        node.vx *= DAMPING; node.vy *= DAMPING;
        node.x += node.vx; node.y += node.vy;
        if (!isFinite(node.x)) node.x = 400;
        if (!isFinite(node.y)) node.y = 300;
        totalVelocity += Math.abs(node.vx) + Math.abs(node.vy);
      }

      if (totalVelocity < MIN_VELOCITY) stableFrames++;
      else stableFrames = 0;

      if (stableFrames < 60) simRef.current = requestAnimationFrame(simulate);
    };
    simRef.current = requestAnimationFrame(simulate);
  };

  if (loading) {
    return (
      <div style={loadingContainerStyle}>
        <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "#6366f1" }} />
        <span>Loading knowledge graph...</span>
      </div>
    );
  }

  if (error && !graphData) {
    return (
      <div style={errorContainerStyle}>
        <AlertCircle size={24} style={{ color: "#ef4444" }} />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerRowStyle}>
        <div>
          <h2>Knowledge Graph Network</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "13.5px", marginTop: "2px" }}>
            Interactive visualization of entities, projects, and relationships.
          </p>
        </div>
        <div style={controlsStyle}>
          <button onClick={zoomIn} style={controlBtnStyle} title="Zoom In">
            <ZoomIn size={16} />
          </button>
          <button onClick={zoomOut} style={controlBtnStyle} title="Zoom Out">
            <ZoomOut size={16} />
          </button>
          <button onClick={resetView} style={controlBtnStyle} title="Reset View">
            <Maximize2 size={16} />
          </button>
          <button onClick={restartSimulation} style={controlBtnStyle} title="Restart Layout">
            <RotateCcw size={16} />
          </button>
          <span style={zoomLabelStyle}>{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      <div style={legendStyle}>
        {Object.entries(NODE_COLORS).map(([label, color]) => (
          <div key={label} style={legendItemStyle}>
            <div style={{ ...legendDotStyle, backgroundColor: color }}></div>
            <span style={legendLabelStyle}>{label}</span>
          </div>
        ))}
        <span style={{ color: "#64748b", fontSize: "11px", marginLeft: "8px" }}>
          {nodeCount} nodes, {edgeCount} edges
        </span>
      </div>

      <div
        ref={containerRef}
        style={canvasContainerStyle}
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas
          ref={canvasRef}
          style={canvasStyle}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />
        <div style={hintStyle}>
          Drag nodes to rearrange &bull; Scroll to zoom &bull; Click node for details
        </div>
      </div>

      {selectedNode && (
        <div className="glass-panel" style={detailPanelStyle}>
          <div style={detailHeaderStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  ...detailIconStyle,
                  backgroundColor: `${NODE_COLORS[selectedNode.label] || "#64748b"}22`,
                  color: NODE_COLORS[selectedNode.label] || "#64748b",
                }}
              >
                {selectedNode.label === "Employee" ? <User size={16} /> :
                 selectedNode.label === "Document" ? <FileText size={16} /> :
                 selectedNode.label === "Project" ? <Target size={16} /> :
                 selectedNode.label === "Feature" ? <Zap size={16} /> :
                 selectedNode.label === "Incident" ? <AlertCircle size={16} /> :
                 <Hexagon size={16} />}
              </div>
              <div>
                <h4 style={detailNameStyle}>{selectedNode.name}</h4>
                <span style={{
                  ...typeBadgeStyle,
                  color: NODE_COLORS[selectedNode.label] || "#64748b",
                  borderColor: `${NODE_COLORS[selectedNode.label] || "#64748b"}44`,
                  backgroundColor: `${NODE_COLORS[selectedNode.label] || "#64748b"}11`,
                }}>
                  {selectedNode.label}
                </span>
              </div>
            </div>
            <button onClick={() => setSelectedNode(null)} style={closeBtnStyle}>
              <X size={14} />
            </button>
          </div>

          {selectedNode.summary && (
            <p style={detailSummaryStyle}>{selectedNode.summary}</p>
          )}

          <div style={connectedSectionStyle}>
            <div style={connectedTitleStyle}>
              <GitBranch size={12} />
              <span>Connected Relations</span>
            </div>
            {edgesRef.current
              .filter((e) => e.sourceNode.id === selectedNode.id || e.targetNode.id === selectedNode.id)
              .slice(0, 6)
              .map((e, i) => {
                const other = e.sourceNode.id === selectedNode.id ? e.targetNode : e.sourceNode;
                return (
                  <div key={i} style={connectedItemStyle} onClick={() => {
                    setSelectedNode({ id: other.id, label: other.label, name: other.name, summary: other.summary });
                  }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: other.color, flexShrink: 0 }}></div>
                    <div style={connectedItemBody}>
                      <span style={connectedItemName}>{other.name}</span>
                      <span style={connectedItemRel}>{e.label}</span>
                    </div>
                  </div>
                );
              })}
          </div>

          <div style={idFooterStyle}>
            <Info size={10} />
            <span>ID: {selectedNode.id}</span>
          </div>
        </div>
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: "16px",
  height: "calc(100vh - 140px)", position: "relative",
};
const headerRowStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
};
const controlsStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "6px",
  backgroundColor: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "8px", padding: "4px",
};
const controlBtnStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  width: "30px", height: "30px", borderRadius: "6px",
  backgroundColor: "transparent", border: "none", color: "#94a3b8", cursor: "pointer",
};
const zoomLabelStyle: React.CSSProperties = {
  fontSize: "11px", fontWeight: "600", color: "#64748b",
  minWidth: "40px", textAlign: "center",
};
const legendStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", flexShrink: 0,
};
const legendItemStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "5px",
};
const legendDotStyle: React.CSSProperties = {
  width: "8px", height: "8px", borderRadius: "50%",
};
const legendLabelStyle: React.CSSProperties = {
  fontSize: "11px", color: "#94a3b8", fontWeight: "500",
};
const canvasContainerStyle: React.CSSProperties = {
  flex: 1, position: "relative", borderRadius: "12px", overflow: "hidden",
  backgroundColor: "rgba(8, 12, 24, 0.5)", border: "1px solid rgba(255, 255, 255, 0.04)",
};
const canvasStyle: React.CSSProperties = {
  width: "100%", height: "100%", display: "block",
};
const hintStyle: React.CSSProperties = {
  position: "absolute", bottom: "12px", left: "50%", transform: "translateX(-50%)",
  fontSize: "11px", color: "#64748b",
  backgroundColor: "rgba(8, 11, 17, 0.8)", padding: "6px 14px",
  borderRadius: "20px", border: "1px solid rgba(255, 255, 255, 0.04)",
  pointerEvents: "none", whiteSpace: "nowrap",
};
const detailPanelStyle: React.CSSProperties = {
  position: "absolute", top: "100px", right: "20px", width: "280px",
  zIndex: 20, padding: "20px", animation: "slideUp 0.25s ease",
};
const detailHeaderStyle: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px",
};
const detailIconStyle: React.CSSProperties = {
  width: "36px", height: "36px", borderRadius: "8px",
  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
};
const detailNameStyle: React.CSSProperties = {
  fontSize: "15px", fontWeight: "700", color: "#f8fafc", margin: "0 0 4px 0",
};
const typeBadgeStyle: React.CSSProperties = {
  fontSize: "10px", fontWeight: "700", textTransform: "uppercase",
  padding: "2px 8px", borderRadius: "4px", border: "1px solid", letterSpacing: "0.03em",
};
const closeBtnStyle: React.CSSProperties = {
  width: "26px", height: "26px", borderRadius: "6px",
  backgroundColor: "rgba(255, 255, 255, 0.04)", border: "none",
  color: "#64748b", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
};
const detailSummaryStyle: React.CSSProperties = {
  fontSize: "13px", color: "#cbd5e1", lineHeight: "1.5", marginBottom: "16px",
};
const connectedSectionStyle: React.CSSProperties = {
  marginTop: "4px",
};
const connectedTitleStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "6px",
  fontSize: "10px", fontWeight: "600", color: "#64748b",
  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px",
};
const connectedItemStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "8px",
  padding: "6px 8px", borderRadius: "6px", cursor: "pointer", marginBottom: "4px",
};
const connectedItemBody: React.CSSProperties = {
  flex: 1, minWidth: 0,
};
const connectedItemName: React.CSSProperties = {
  fontSize: "12.5px", fontWeight: "600", color: "#e2e8f0", display: "block",
};
const connectedItemRel: React.CSSProperties = {
  fontSize: "10px", color: "#64748b",
};
const idFooterStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "4px",
  marginTop: "14px", paddingTop: "10px",
  borderTop: "1px solid rgba(255, 255, 255, 0.04)",
  fontSize: "10px", color: "#475569",
};
const loadingContainerStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center",
  justifyContent: "center", gap: "16px", padding: "100px 0",
  color: "#94a3b8", fontSize: "14px",
};
const errorContainerStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center",
  justifyContent: "center", gap: "16px", padding: "100px 0",
  color: "#f87171", fontSize: "14px",
};
