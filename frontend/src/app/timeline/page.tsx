"use client";

import { useEffect, useState } from "react";
import { 
  Calendar, 
  Plus, 
  AlertCircle, 
  Milestone, 
  Activity, 
  HelpCircle,
  FileText,
  Clock,
  Sparkles
} from "lucide-react";
import { api, getSavedUser, TimelineEvent, User } from "@/utils/api";

export default function TimelinePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering states
  const [filterType, setFilterType] = useState<string>("all");

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [eventType, setEventType] = useState("decision");
  const [description, setDescription] = useState("");
  const [refDate, setRefDate] = useState(new Date().toISOString().substring(0, 10));
  
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const isEmployee = currentUser?.role.toLowerCase() === "employee";

  useEffect(() => {
    setCurrentUser(getSavedUser());
    loadTimeline();
  }, []);

  const loadTimeline = async () => {
    try {
      const data = await api.getTimeline();
      setEvents(data);
    } catch (e: any) {
      console.error("Failed to load timeline events:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    
    if (!description.trim() || !refDate) {
      setFormError("Please fill out all fields.");
      return;
    }

    setFormLoading(true);
    try {
      // API expects ISO reference time
      const isoTime = new Date(refDate).toISOString();
      await api.addTimelineEvent(eventType, description, isoTime);
      
      // Reset & Reload
      setDescription("");
      setShowAddForm(false);
      loadTimeline();
    } catch (err: any) {
      setFormError(err.message || "Failed to create event.");
    } finally {
      setFormLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t === "incident") return <Activity size={15} style={{ color: "#ef4444" }} />;
    if (t === "decision") return <HelpCircle size={15} style={{ color: "#f59e0b" }} />;
    if (t === "milestone") return <Milestone size={15} style={{ color: "#10b981" }} />;
    if (t === "document_uploaded") return <FileText size={15} style={{ color: "#6366f1" }} />;
    return <Clock size={15} style={{ color: "#06b6d4" }} />;
  };

  const getEventBadgeClass = (type: string) => {
    const t = type.toLowerCase();
    if (t === "incident") return "badge-failed";
    if (t === "decision") return "badge-processing";
    if (t === "milestone") return "badge-indexed";
    if (t === "document_uploaded") return "badge-indexed";
    return "badge-processing";
  };

  // Filter events
  const filteredEvents = events.filter(event => {
    if (filterType === "all") return true;
    if (filterType === "auto") return event.event_type === "extracted_reference";
    return event.event_type.toLowerCase() === filterType.toLowerCase();
  });

  return (
    <div style={containerStyle}>
      {/* Page header and action button */}
      <div style={headerRowStyle}>
        <div>
          <h2>Temporal Memory Timeline</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "13.5px", marginTop: "2px" }}>
            Chronological audit of company events, milestones, and auto-extracted document timelines.
          </p>
        </div>
        
        {!isEmployee && (
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            style={addEventBtnStyle}
            className="btn btn-primary"
          >
            <Plus size={16} />
            <span>Log Custom Event</span>
          </button>
        )}
      </div>

      {/* Manual Event Logging Form (Glass panel overlay) */}
      {showAddForm && (
        <div className="glass-panel" style={formPanelStyle}>
          <h3 style={{ fontSize: "16px", marginBottom: "16px" }}>Log a Custom Event</h3>
          {formError && <div style={formErrorStyle}>{formError}</div>}
          <form onSubmit={handleAddEventSubmit} style={formStyle}>
            <div style={formGrid}>
              <div style={formGroup}>
                <label style={labelStyle}>Event Type</label>
                <select 
                  value={eventType} 
                  onChange={(e) => setEventType(e.target.value)}
                  style={selectStyle}
                >
                  <option value="decision">Decision Made</option>
                  <option value="milestone">Company Milestone</option>
                  <option value="incident">System/Tech Incident</option>
                  <option value="general">General Update</option>
                </select>
              </div>

              <div style={formGroup}>
                <label style={labelStyle}>Date of Occurrence</label>
                <input 
                  type="date" 
                  value={refDate} 
                  onChange={(e) => setRefDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={formGroup}>
              <label style={labelStyle}>Event Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail what happened, who was involved, and the result."
                style={textareaStyle}
                rows={3}
              />
            </div>

            <div style={formBtnContainer}>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)} 
                style={cancelBtnStyle}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={formLoading} 
                style={saveBtnStyle}
              >
                {formLoading ? "Saving..." : "Log Event"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtering Actions */}
      <div style={filterContainerStyle}>
        <span style={filterLabelStyle}>Filter timeline:</span>
        <div style={filterBtnGrid}>
          {["all", "decision", "milestone", "incident", "document_uploaded", "auto"].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              style={filterType === type ? activeFilterBtnStyle : filterBtnStyle}
            >
              {type === "auto" ? "Auto-Extracted" : type.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Main Timeline Line */}
      {loading ? (
        <div style={loadingContainer}>
          <div style={spinnerStyle}></div>
          <span>Loading historical logs...</span>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="glass-panel" style={emptyStateStyle}>
          <h3>No events found</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
            There are no indexed events matching this filter.
          </p>
        </div>
      ) : (
        <div style={timelineContainer}>
          {/* Vertical axis line */}
          <div style={timelineAxisLine}></div>

          {filteredEvents.map((event, index) => {
            const isAuto = event.event_type === "extracted_reference";
            return (
              <div key={event.id} style={timelineItemStyle} className="fade-in">
                {/* Node icon placeholder */}
                <div style={nodeIconStyle(event.event_type)}>
                  {getEventIcon(event.event_type)}
                </div>

                {/* Content Panel */}
                <div className="glass-panel" style={eventCardStyle}>
                  <div style={eventCardHeaderStyle}>
                    <div style={eventDateStyle}>
                      {new Date(event.reference_time).toLocaleDateString(undefined, { 
                        weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' 
                      })}
                    </div>
                    
                    <div style={{ display: "flex", gap: "8px" }}>
                      {isAuto && (
                        <span style={autoBadgeStyle}>
                          <Sparkles size={10} />
                          <span>Auto</span>
                        </span>
                      )}
                      <span className={`badge ${getEventBadgeClass(event.event_type)}`}>
                        {isAuto ? "Reference" : event.event_type.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  <p style={eventDescStyle}>{event.description}</p>

                  {/* Document connection tag */}
                  {event.document_id && (
                    <div style={sourceFileTagStyle}>
                      <FileText size={12} style={{ color: "#64748b" }} />
                      <span>Extracted from: <strong>{event.document_id}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Styling
const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "24px",
};

const headerRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const addEventBtnStyle: React.CSSProperties = {
  padding: "10px 18px",
};

const formPanelStyle: React.CSSProperties = {
  border: "1px solid var(--border-color-glow)",
  backgroundColor: "rgba(16, 20, 38, 0.95)",
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const formGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "16px",
};

const formGroup: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const labelStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: "600",
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  backgroundColor: "rgba(8, 12, 24, 0.9)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "8px",
  color: "#f8fafc",
  fontSize: "13.5px",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: "inherit",
  resize: "vertical",
};

const formBtnContainer: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "12px",
  marginTop: "6px",
};

const cancelBtnStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: "6px",
  backgroundColor: "transparent",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  color: "#94a3b8",
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
};

const saveBtnStyle: React.CSSProperties = {
  padding: "8px 20px",
  borderRadius: "6px",
  backgroundColor: "#6366f1",
  color: "white",
  border: "none",
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)",
};

const formErrorStyle: React.CSSProperties = {
  backgroundColor: "rgba(239, 68, 68, 0.1)",
  border: "1px solid rgba(239, 68, 68, 0.2)",
  color: "#f87171",
  padding: "10px 14px",
  borderRadius: "8px",
  fontSize: "12.5px",
  marginBottom: "14px",
};

const filterContainerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  backgroundColor: "rgba(255, 255, 255, 0.02)",
  border: "1px solid rgba(255, 255, 255, 0.04)",
  padding: "12px 18px",
  borderRadius: "10px",
  flexWrap: "wrap",
};

const filterLabelStyle: React.CSSProperties = {
  fontSize: "12.5px",
  fontWeight: "600",
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const filterBtnGrid: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const filterBtnStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: "6px",
  backgroundColor: "rgba(255, 255, 255, 0.03)",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "rgba(255, 255, 255, 0.06)",
  color: "#94a3b8",
  fontSize: "12px",
  fontWeight: "600",
  cursor: "pointer",
  textTransform: "capitalize",
  transition: "all 0.2s ease",
};

const activeFilterBtnStyle: React.CSSProperties = {
  ...filterBtnStyle,
  backgroundColor: "rgba(99, 102, 241, 0.15)",
  borderColor: "#6366f1",
  color: "#f8fafc",
};

const timelineContainer: React.CSSProperties = {
  position: "relative",
  paddingLeft: "40px",
  display: "flex",
  flexDirection: "column",
  gap: "24px",
  marginTop: "10px",
};

const timelineAxisLine: React.CSSProperties = {
  position: "absolute",
  left: "15px",
  top: "8px",
  bottom: "8px",
  width: "2px",
  backgroundColor: "rgba(255, 255, 255, 0.06)",
};

const timelineItemStyle: React.CSSProperties = {
  position: "relative",
};

const nodeIconStyle = (type: string): React.CSSProperties => {
  let color = "#6366f1";
  if (type === "incident") color = "#ef4444";
  if (type === "decision") color = "#f59e0b";
  if (type === "milestone") color = "#10b981";
  
  return {
    position: "absolute",
    left: "-37px",
    top: "12px",
    width: "26px",
    height: "26px",
    borderRadius: "50%",
    backgroundColor: "#080b11",
    border: `2px solid ${color}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: `0 0 8px ${color}33`,
    zIndex: 2,
  };
};

const eventCardStyle: React.CSSProperties = {
  padding: "20px",
};

const eventCardHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "10px",
};

const eventDateStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#64748b",
};

const autoBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "3px",
  padding: "2px 6px",
  borderRadius: "4px",
  backgroundColor: "rgba(168, 85, 247, 0.1)",
  color: "#c084fc",
  fontSize: "9px",
  fontWeight: "bold",
  textTransform: "uppercase",
  border: "1px solid rgba(168, 85, 247, 0.2)",
};

const eventDescStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#cbd5e1",
  lineHeight: "1.5",
};

const sourceFileTagStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  marginTop: "12px",
  paddingTop: "10px",
  borderTop: "1px solid rgba(255, 255, 255, 0.04)",
  fontSize: "11px",
  color: "#64748b",
};

const loadingContainer: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "60px 0",
  color: "#94a3b8",
  gap: "12px",
  fontSize: "14px",
};

const spinnerStyle: React.CSSProperties = {
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  border: "2px solid rgba(99, 102, 241, 0.1)",
  borderTopColor: "#6366f1",
  animation: "spin 1s linear infinite",
};

const emptyStateStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "50px 20px",
  textAlign: "center",
};
