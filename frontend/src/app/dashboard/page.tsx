"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  FileText, 
  GitBranch, 
  Calendar, 
  Search, 
  ArrowRight,
  TrendingUp,
  Cpu
} from "lucide-react";
import { api, DocumentInfo, TimelineEvent, GraphData } from "@/utils/api";

export default function DashboardPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<DocumentInfo[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [graph, setGraph] = useState<GraphData | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadStats() {
      try {
        const [docsData, timelineData, graphData] = await Promise.all([
          api.listDocuments(),
          api.getTimeline(),
          api.getGraph()
        ]);
        setDocs(docsData);
        setTimeline(timelineData);
        setGraph(graphData);
      } catch (e) {
        console.error("Failed to load dashboard data:", e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Redirect to chat page with query as search param
      router.push(`/chat?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const getSystemStatus = () => {
    if (docs.some(d => d.status === "processing")) {
      return { label: "Processing Documents", color: "#f59e0b" };
    }
    return { label: "Operational & Idle", color: "#10b981" };
  };

  const status = getSystemStatus();

  return (
    <div style={containerStyle}>
      {/* 1. Dashboard Quick Search Banner */}
      <div style={bannerStyle} className="glass-panel">
        <div style={bannerContent}>
          <h2 style={bannerTitle}>Query the Company Mind</h2>
          <p style={bannerSub}>Ask questions across documents, timelines, and relationships simultaneously.</p>
          <form onSubmit={handleQuickSearchSubmit} style={searchForm}>
            <div style={searchWrapper}>
              <Search size={18} style={searchIcon} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ask e.g. Who worked on Project Brain? Why was this database outage resolved?"
                style={searchInput}
              />
              <button type="submit" style={searchBtn}>
                Search <ArrowRight size={14} />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 2. Metrics Widgets Grid */}
      <div className="grid-3" style={{ marginBottom: "24px" }}>
        <div className="glass-panel" style={cardMetricStyle}>
          <div style={metricHeader}>
            <div style={metricIconBg("#6366f1")}>
              <FileText size={20} style={{ color: "#6366f1" }} />
            </div>
            <span style={metricTitle}>Indexed Documents</span>
          </div>
          <div style={metricValue}>{loading ? "..." : docs.length}</div>
          <span style={metricFooter}>PDFs, Markdown, and Text files</span>
        </div>

        <div className="glass-panel" style={cardMetricStyle}>
          <div style={metricHeader}>
            <div style={metricIconBg("#a855f7")}>
              <GitBranch size={20} style={{ color: "#a855f7" }} />
            </div>
            <span style={metricTitle}>Graph Connections</span>
          </div>
          <div style={metricValue}>
            {loading ? "..." : (graph ? graph.nodes.length + graph.edges.length : 0)}
          </div>
          <span style={metricFooter}>Entities & extracted relations</span>
        </div>

        <div className="glass-panel" style={cardMetricStyle}>
          <div style={metricHeader}>
            <div style={metricIconBg("#06b6d4")}>
              <Calendar size={20} style={{ color: "#06b6d4" }} />
            </div>
            <span style={metricTitle}>Timeline Events</span>
          </div>
          <div style={metricValue}>{loading ? "..." : timeline.length}</div>
          <span style={metricFooter}>Chronological incident & decision logs</span>
        </div>
      </div>

      {/* 3. System and Activity Split Grid */}
      <div className="grid-2">
        {/* Recent Uploads */}
        <div className="glass-panel" style={sectionCard}>
          <div style={sectionHeader}>
            <h3 style={sectionTitle}>Recent Ingestions</h3>
            <span onClick={() => router.push("/documents")} style={viewAllLink}>
              View All
            </span>
          </div>
          <div style={listContainer}>
            {loading ? (
              <div style={emptyStateStyle}>Loading documents...</div>
            ) : docs.length === 0 ? (
              <div style={emptyStateStyle}>No documents uploaded yet. Go to Documents to upload your first file.</div>
            ) : (
              docs.slice(0, 4).map((doc) => (
                <div key={doc.id} style={listItem}>
                  <FileText size={16} style={{ color: "#64748b" }} />
                  <div style={listItemBody}>
                    <div style={listItemName}>{doc.filename}</div>
                    <div style={listItemMeta}>
                      {doc.file_type.toUpperCase()} • {(doc.file_size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <span className={`badge badge-${doc.status.toLowerCase()}`}>{doc.status}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Events & Status */}
        <div className="glass-panel" style={sectionCard}>
          <div style={sectionHeader}>
            <h3 style={sectionTitle}>Recent Timeline Events</h3>
            <span onClick={() => router.push("/timeline")} style={viewAllLink}>
              View All
            </span>
          </div>
          <div style={listContainer}>
            {loading ? (
              <div style={emptyStateStyle}>Loading timeline...</div>
            ) : timeline.length === 0 ? (
              <div style={emptyStateStyle}>No events in the timeline yet.</div>
            ) : (
              timeline.slice(0, 4).map((event) => (
                <div key={event.id} style={timelineItem}>
                  <div style={timelineMarker}>
                    <div style={timelineDot(event.event_type)}></div>
                    <div style={timelineLine}></div>
                  </div>
                  <div style={timelineItemBody}>
                    <div style={timelineTime}>
                      {new Date(event.reference_time).toLocaleDateString(undefined, { 
                        year: 'numeric', month: 'short', day: 'numeric' 
                      })}
                    </div>
                    <div style={timelineDesc}>{event.description}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* 4. Infrastructure Overview Panel */}
      <div className="glass-panel" style={infraPanelStyle}>
        <div style={infraHeader}>
          <Cpu size={16} style={{ color: "#14b8a6" }} />
          <span>RAG Ingestion Pipelines Status</span>
        </div>
        <div style={infraGrid}>
          <div style={infraCell}>
            <span style={infraLabel}>ChromaDB Persistence:</span>
            <strong style={{ color: "#10b981" }}>Mounted (Local)</strong>
          </div>
          <div style={infraCell}>
            <span style={infraLabel}>Graphiti Engine:</span>
            <strong style={{ color: "#10b981" }}>Loaded (Neo4j Bridge)</strong>
          </div>
          <div style={infraCell}>
            <span style={infraLabel}>LLM Host:</span>
            <strong style={{ color: "#6366f1" }}>NVIDIA NIM Gateway</strong>
          </div>
          <div style={infraCell}>
            <span style={infraLabel}>State Engine:</span>
            <strong style={{ color: status.color }}>{status.label}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// Layout styling
const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "24px",
};

const bannerStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(17, 23, 41, 0.8), rgba(99, 102, 241, 0.1))",
  border: "1px solid rgba(99, 102, 241, 0.15)",
  padding: "35px 30px",
};

const bannerContent: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const bannerTitle: React.CSSProperties = {
  fontSize: "24px",
  fontFamily: "'Outfit', sans-serif",
  fontWeight: "800",
  margin: "0",
  background: "linear-gradient(90deg, #f8fafc, #94a3b8)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const bannerSub: React.CSSProperties = {
  fontSize: "14px",
  color: "#94a3b8",
  margin: "0 0 10px 0",
};

const searchForm: React.CSSProperties = {
  width: "100%",
};

const searchWrapper: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  width: "100%",
};

const searchIcon: React.CSSProperties = {
  position: "absolute",
  left: "16px",
  color: "#64748b",
};

const searchInput: React.CSSProperties = {
  width: "100%",
  padding: "14px 120px 14px 46px",
  backgroundColor: "rgba(8, 12, 24, 0.95)",
  border: "1px solid rgba(99, 102, 241, 0.25)",
  borderRadius: "8px",
  color: "#f8fafc",
  fontSize: "14px",
  outline: "none",
  boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
};

const searchBtn: React.CSSProperties = {
  position: "absolute",
  right: "6px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 16px",
  backgroundColor: "#6366f1",
  color: "white",
  border: "none",
  borderRadius: "6px",
  fontWeight: "600",
  fontSize: "13px",
  cursor: "pointer",
};

const cardMetricStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  padding: "20px",
};

const metricHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const metricIconBg = (color: string): React.CSSProperties => ({
  width: "36px",
  height: "36px",
  borderRadius: "8px",
  backgroundColor: `rgba(${color === "#6366f1" ? "99,102,241" : color === "#a855f7" ? "168,85,247" : "6,182,212"}, 0.1)`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

const metricTitle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: "600",
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const metricValue: React.CSSProperties = {
  fontSize: "32px",
  fontFamily: "'Outfit', sans-serif",
  fontWeight: "800",
  color: "#f8fafc",
  lineHeight: "1",
};

const metricFooter: React.CSSProperties = {
  fontSize: "11px",
  color: "#64748b",
};

const sectionCard: React.CSSProperties = {
  padding: "24px",
  display: "flex",
  flexDirection: "column",
};

const sectionHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "between",
  marginBottom: "16px",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: "700",
  color: "#f8fafc",
  margin: "0",
  flex: 1,
};

const viewAllLink: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#6366f1",
  cursor: "pointer",
};

const listContainer: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  flex: 1,
};

const listItem: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "10px 12px",
  borderRadius: "8px",
  backgroundColor: "rgba(255, 255, 255, 0.02)",
  border: "1px solid rgba(255, 255, 255, 0.04)",
};

const listItemBody: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const listItemName: React.CSSProperties = {
  fontSize: "13.5px",
  fontWeight: "550",
  color: "#f8fafc",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const listItemMeta: React.CSSProperties = {
  fontSize: "11px",
  color: "#64748b",
  marginTop: "2px",
};

const emptyStateStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  textAlign: "center",
  padding: "30px 0",
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const timelineItem: React.CSSProperties = {
  display: "flex",
  gap: "14px",
};

const timelineMarker: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const timelineDot = (type: string): React.CSSProperties => {
  let color = "#6366f1";
  if (type === "incident") color = "#ef4444";
  if (type === "decision") color = "#f59e0b";
  if (type === "milestone") color = "#10b981";
  
  return {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    backgroundColor: color,
    boxShadow: `0 0 6px ${color}`,
  };
};

const timelineLine: React.CSSProperties = {
  width: "2px",
  flex: 1,
  backgroundColor: "rgba(255, 255, 255, 0.05)",
  marginTop: "4px",
};

const timelineItemBody: React.CSSProperties = {
  paddingBottom: "12px",
  flex: 1,
};

const timelineTime: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: "600",
  color: "#64748b",
};

const timelineDesc: React.CSSProperties = {
  fontSize: "13px",
  color: "#cbd5e1",
  marginTop: "4px",
  lineHeight: "1.4",
};

const infraPanelStyle: React.CSSProperties = {
  marginTop: "24px",
  padding: "16px 24px",
  backgroundColor: "rgba(255, 255, 255, 0.01)",
};

const infraHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "12px",
  fontWeight: "600",
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "12px",
};

const infraGrid: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "30px",
};

const infraCell: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "13px",
};

const infraLabel: React.CSSProperties = {
  color: "#64748b",
};
