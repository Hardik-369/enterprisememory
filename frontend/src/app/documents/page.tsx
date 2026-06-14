"use client";

import { useEffect, useState, useRef } from "react";
import { 
  FileText, 
  Upload, 
  Trash2, 
  AlertCircle, 
  CheckCircle,
  FileCode,
  FileType
} from "lucide-react";
import { api, getSavedUser, DocumentInfo, User } from "@/utils/api";

export default function DocumentsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isEmployee = currentUser?.role.toLowerCase() === "employee";

  useEffect(() => {
    setCurrentUser(getSavedUser());
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const data = await api.listDocuments();
      setDocuments(data);
    } catch (e: any) {
      console.error("Failed to load documents:", e);
      setError(e.message || "Failed to fetch document catalog.");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = () => {
    if (isEmployee) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setError("");
    setSuccess("");
    setUploading(true);

    try {
      const file = files[0];
      const res = await api.uploadDocument(file);
      
      if (res.status === "failed") {
        setError(`Processing failed: ${res.error_message}`);
      } else {
        setSuccess(`Document '${file.name}' uploaded and indexed successfully!`);
      }
      
      loadDocuments(); // Refresh list
    } catch (err: any) {
      setError(err.message || "Failed to upload document.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Clear file input
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (isEmployee) return;
    if (!confirm(`Are you sure you want to delete '${name}'? This will remove all associated semantic vectors and relational connections.`)) {
      return;
    }
    
    setError("");
    setSuccess("");
    
    try {
      await api.deleteDocument(id);
      setSuccess(`Document '${name}' successfully removed.`);
      setDocuments(documents.filter(doc => doc.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete document.");
    }
  };

  return (
    <div style={containerStyle}>
      {/* Role Alert Warning for Employees */}
      {isEmployee && (
        <div style={warningBannerStyle}>
          <AlertCircle size={18} />
          <span><strong>Read-Only Mode:</strong> Employees can view documents but cannot upload or delete them. Require Admin or Manager permissions to write.</span>
        </div>
      )}

      {/* Upload Zone (Only visible/active for Admins and Managers) */}
      {!isEmployee && (
        <div 
          onClick={handleUploadClick}
          style={uploading ? uploadZoneDisabledStyle : uploadZoneStyle}
          className="glass-panel"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange}
            accept=".pdf,.md,.txt"
            style={{ display: "none" }}
            disabled={uploading}
          />
          <Upload size={36} style={uploadIconStyle} />
          <h3 style={uploadTitleStyle}>
            {uploading ? "Ingesting and Indexing..." : "Upload Company Knowledge"}
          </h3>
          <p style={uploadSubStyle}>
            Select or drag a PDF, Markdown (.md), or Text (.txt) file. Max size 15MB.
          </p>
          {uploading && <div style={progressBarGlow}></div>}
        </div>
      )}

      {/* Action Notifications */}
      {error && (
        <div style={errorBannerStyle}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div style={successBannerStyle}>
          <CheckCircle size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Documents List Header */}
      <div style={sectionHeader}>
        <h2>Indexed Knowledge Base ({documents.length})</h2>
        <p style={sectionSub}>Uploaded files are chunked, parsed for entities/relationships, and vectorized automatically.</p>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div style={loadingContainer}>
          <div style={spinnerStyle}></div>
          <span>Loading knowledge catalog...</span>
        </div>
      ) : documents.length === 0 ? (
        <div className="glass-panel" style={emptyStateStyle}>
          <FileText size={48} style={{ color: "var(--text-muted)", marginBottom: "12px" }} />
          <h3>No Knowledge Ingested Yet</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            {isEmployee ? "Please ask an Admin or Manager to upload company documents." : "Select files above to build the company mind database."}
          </p>
        </div>
      ) : (
        <div style={gridStyle}>
          {documents.map((doc) => (
            <div key={doc.id} className="glass-panel" style={cardStyle}>
              <div style={cardHeaderStyle}>
                {doc.file_type === "pdf" ? (
                  <div style={fileIconBg("#ef4444")}>
                    <FileType size={18} style={{ color: "#ef4444" }} />
                  </div>
                ) : doc.file_type === "md" ? (
                  <div style={fileIconBg("#a855f7")}>
                    <FileCode size={18} style={{ color: "#a855f7" }} />
                  </div>
                ) : (
                  <div style={fileIconBg("#6366f1")}>
                    <FileText size={18} style={{ color: "#6366f1" }} />
                  </div>
                )}
                
                <span className={`badge badge-${doc.status.toLowerCase()}`}>
                  {doc.status}
                </span>
              </div>

              <h4 style={docNameStyle} title={doc.filename}>{doc.filename}</h4>
              
              <div style={docDetailsStyle}>
                <div style={detailRow}>
                  <span style={detailLabel}>File Size:</span>
                  <span style={detailVal}>{(doc.file_size / 1024).toFixed(1)} KB</span>
                </div>
                <div style={detailRow}>
                  <span style={detailLabel}>Type:</span>
                  <span style={detailVal}>{doc.file_type.toUpperCase()} File</span>
                </div>
                <div style={detailRow}>
                  <span style={detailLabel}>Uploaded:</span>
                  <span style={detailVal}>
                    {new Date(doc.created_at).toLocaleDateString(undefined, { 
                      month: 'short', day: 'numeric', year: 'numeric' 
                    })}
                  </span>
                </div>
              </div>

              {/* Error messages if indexing failed */}
              {doc.error_message && (
                <div style={errorMessageStyle}>
                  <strong>Error:</strong> {doc.error_message}
                </div>
              )}

              {/* Action buttons (Disabled for employees) */}
              {!isEmployee && (
                <button 
                  onClick={() => handleDelete(doc.id, doc.filename)}
                  style={deleteBtnStyle}
                >
                  <Trash2 size={14} />
                  <span>Delete Document</span>
                </button>
              )}
            </div>
          ))}
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

const warningBannerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  backgroundColor: "rgba(245, 158, 11, 0.08)",
  border: "1px solid rgba(245, 158, 11, 0.2)",
  padding: "12px 18px",
  borderRadius: "8px",
  color: "#f59e0b",
  fontSize: "13px",
  lineHeight: "1.4",
};

const uploadZoneStyle: React.CSSProperties = {
  borderWidth: "2px",
  borderStyle: "dashed",
  borderColor: "rgba(99, 102, 241, 0.35)",
  borderRadius: "12px",
  padding: "40px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  textAlign: "center",
  position: "relative",
  overflow: "hidden",
};

const uploadZoneDisabledStyle: React.CSSProperties = {
  ...uploadZoneStyle,
  borderStyle: "solid",
  borderColor: "rgba(255,255,255,0.08)",
  cursor: "not-allowed",
};

const uploadIconStyle: React.CSSProperties = {
  color: "#6366f1",
  marginBottom: "16px",
  filter: "drop-shadow(0 0 4px rgba(99, 102, 241, 0.2))",
};

const uploadTitleStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: "700",
  color: "#f8fafc",
  margin: "0 0 6px 0",
};

const uploadSubStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  margin: "0",
};

const progressBarGlow: React.CSSProperties = {
  position: "absolute",
  bottom: "0",
  left: "0",
  height: "3px",
  width: "100%",
  background: "linear-gradient(90deg, #6366f1, #d946ef)",
  animation: "loading-bar 1.5s infinite linear",
};

const errorBannerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  backgroundColor: "rgba(239, 68, 68, 0.1)",
  border: "1px solid rgba(239, 68, 68, 0.2)",
  padding: "10px 14px",
  borderRadius: "8px",
  color: "#f87171",
  fontSize: "13px",
};

const successBannerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  backgroundColor: "rgba(16, 185, 129, 0.1)",
  border: "1px solid rgba(16, 185, 129, 0.2)",
  padding: "10px 14px",
  borderRadius: "8px",
  color: "#34d399",
  fontSize: "13px",
};

const sectionHeader: React.CSSProperties = {
  marginTop: "10px",
};

const sectionSub: React.CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  marginTop: "4px",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "20px",
};

const cardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  padding: "20px",
  minHeight: "230px",
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "16px",
};

const fileIconBg = (color: string): React.CSSProperties => ({
  width: "36px",
  height: "36px",
  borderRadius: "8px",
  backgroundColor: `rgba(${color === "#ef4444" ? "239,68,68" : color === "#a855f7" ? "168,85,247" : "99,102,241"}, 0.1)`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

const docNameStyle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: "600",
  color: "#f8fafc",
  margin: "0 0 12px 0",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const docDetailsStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  flex: 1,
  marginBottom: "16px",
};

const detailRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "12px",
};

const detailLabel: React.CSSProperties = {
  color: "#64748b",
};

const detailVal: React.CSSProperties = {
  color: "#cbd5e1",
  fontWeight: "500",
};

const errorMessageStyle: React.CSSProperties = {
  backgroundColor: "rgba(239, 68, 68, 0.08)",
  color: "#f87171",
  padding: "8px 10px",
  borderRadius: "6px",
  fontSize: "11px",
  marginBottom: "14px",
  wordBreak: "break-word",
  border: "1px solid rgba(239, 68, 68, 0.15)",
};

const deleteBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  width: "100%",
  padding: "8px 12px",
  borderRadius: "6px",
  backgroundColor: "transparent",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  color: "#ef4444",
  fontSize: "12px",
  fontWeight: "600",
  cursor: "pointer",
  transition: "all 0.2s ease",
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

// Add standard loading animation keyframe
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `
    @keyframes loading-bar {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  `;
  document.head.appendChild(style);
}
