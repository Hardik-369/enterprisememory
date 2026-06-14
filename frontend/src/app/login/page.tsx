"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, User as UserIcon, Lock, Shield } from "lucide-react";
import { api, setAuthToken } from "@/utils/api";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("employee");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (!username.trim() || !password.trim()) {
      setError("Please fill out all fields.");
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await api.register(username, password, role);
        setSuccess("Registration successful! You can now log in.");
        setIsRegister(false);
        setPassword("");
      } else {
        const response = await api.login(username, password);
        setAuthToken(response.access_token, response.user);
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Is the API server running?");
    } finally {
      setLoading(false);
    }
  };

  const fillSeededAccount = (user: string) => {
    setUsername(user);
    setPassword(`${user}123`);
    setIsRegister(false);
  };

  return (
    <div style={containerStyle}>
      {/* Dynamic abstract background gradients */}
      <div style={bgGlowLeft}></div>
      <div style={bgGlowRight}></div>

      <div style={cardStyle} className="fade-in">
        {/* Header Logo */}
        <div style={logoContainer}>
          <div style={logoIconBg}>
            <Brain size={32} style={{ color: "#6366f1" }} />
          </div>
          <h1 style={titleStyle}>Company Brain</h1>
          <p style={subtitleStyle}>Shared Memory & Knowledge Network</p>
        </div>

        {/* Tab switcher */}
        <div style={tabsStyle}>
          <button 
            type="button" 
            onClick={() => { setIsRegister(false); setError(""); }} 
            style={isRegister ? inactiveTab : activeTab}
          >
            Sign In
          </button>
          <button 
            type="button" 
            onClick={() => { setIsRegister(true); setError(""); }} 
            style={isRegister ? activeTab : inactiveTab}
          >
            Register
          </button>
        </div>

        {/* Status Alerts */}
        {error && <div style={errorAlertStyle}>{error}</div>}
        {success && <div style={successAlertStyle}>{success}</div>}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={formGroup}>
            <label style={labelStyle}>Username</label>
            <div style={inputWrapper}>
              <UserIcon size={16} style={inputIcon} />
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="Enter username" 
                style={inputStyle}
                disabled={loading}
              />
            </div>
          </div>

          <div style={formGroup}>
            <label style={labelStyle}>Password</label>
            <div style={inputWrapper}>
              <Lock size={16} style={inputIcon} />
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Enter password" 
                style={inputStyle}
                disabled={loading}
              />
            </div>
          </div>

          {isRegister && (
            <div style={formGroup}>
              <label style={labelStyle}>Access Role</label>
              <div style={inputWrapper}>
                <Shield size={16} style={inputIcon} />
                <select 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)} 
                  style={selectStyle}
                  disabled={loading}
                >
                  <option value="employee">Employee (Read-Only Search)</option>
                  <option value="manager">Manager (Upload & Search)</option>
                  <option value="admin">Admin (Full Control)</option>
                </select>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} style={submitBtnStyle}>
            {loading ? "Processing..." : (isRegister ? "Create Account" : "Access Brain")}
          </button>
        </form>

        {/* Seeded Accounts Shortcut */}
        {!isRegister && (
          <div style={seedContainer}>
            <div style={seedTitle}>Seeded Accounts for Instant Access</div>
            <div style={seedGrid}>
              <button onClick={() => fillSeededAccount("admin")} style={seedBtnAdmin}>
                Admin
              </button>
              <button onClick={() => fillSeededAccount("manager")} style={seedBtnManager}>
                Manager
              </button>
              <button onClick={() => fillSeededAccount("employee")} style={seedBtnEmployee}>
                Employee
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Layout styling
const containerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  backgroundColor: "#07090e",
  padding: "20px",
  position: "relative",
  overflow: "hidden",
};

const bgGlowLeft: React.CSSProperties = {
  position: "absolute",
  width: "350px",
  height: "350px",
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0) 70%)",
  top: "10%",
  left: "10%",
  zIndex: 1,
};

const bgGlowRight: React.CSSProperties = {
  position: "absolute",
  width: "400px",
  height: "400px",
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, rgba(168, 85, 247, 0) 70%)",
  bottom: "10%",
  right: "10%",
  zIndex: 1,
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "430px",
  backgroundColor: "rgba(15, 20, 36, 0.8)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "16px",
  padding: "35px 30px",
  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
  zIndex: 2,
};

const logoContainer: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  marginBottom: "25px",
};

const logoIconBg: React.CSSProperties = {
  width: "56px",
  height: "56px",
  borderRadius: "14px",
  backgroundColor: "rgba(99, 102, 241, 0.1)",
  border: "1px solid rgba(99, 102, 241, 0.25)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "12px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "24px",
  fontFamily: "'Outfit', sans-serif",
  fontWeight: "800",
  color: "#f8fafc",
  margin: "0",
  letterSpacing: "-0.025em",
};

const subtitleStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  marginTop: "4px",
  margin: "0",
};

const tabsStyle: React.CSSProperties = {
  display: "flex",
  backgroundColor: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "8px",
  padding: "4px",
  marginBottom: "20px",
};

const activeTab: React.CSSProperties = {
  flex: 1,
  padding: "8px 0",
  backgroundColor: "rgba(99, 102, 241, 0.15)",
  color: "#f8fafc",
  border: "none",
  borderRadius: "6px",
  fontWeight: "600",
  fontSize: "13px",
  cursor: "pointer",
};

const inactiveTab: React.CSSProperties = {
  flex: 1,
  padding: "8px 0",
  backgroundColor: "transparent",
  color: "#94a3b8",
  border: "none",
  cursor: "pointer",
  fontWeight: "550",
  fontSize: "13px",
  transition: "color 0.2s ease",
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const formGroup: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const inputWrapper: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
};

const inputIcon: React.CSSProperties = {
  position: "absolute",
  left: "14px",
  color: "#64748b",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px 12px 40px",
  backgroundColor: "rgba(8, 12, 24, 0.9)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "8px",
  color: "#f8fafc",
  fontSize: "14px",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
  cursor: "pointer",
};

const submitBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  background: "linear-gradient(135deg, #6366f1, #a855f7)",
  color: "#ffffff",
  border: "none",
  fontWeight: "650",
  fontSize: "14px",
  cursor: "pointer",
  marginTop: "10px",
  boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)",
};

const errorAlertStyle: React.CSSProperties = {
  backgroundColor: "rgba(239, 68, 68, 0.1)",
  border: "1px solid rgba(239, 68, 68, 0.25)",
  color: "#f87171",
  padding: "10px 14px",
  borderRadius: "8px",
  fontSize: "12.5px",
  marginBottom: "16px",
};

const successAlertStyle: React.CSSProperties = {
  backgroundColor: "rgba(16, 185, 129, 0.1)",
  border: "1px solid rgba(16, 185, 129, 0.25)",
  color: "#34d399",
  padding: "10px 14px",
  borderRadius: "8px",
  fontSize: "12.5px",
  marginBottom: "16px",
};

const seedContainer: React.CSSProperties = {
  marginTop: "25px",
  paddingTop: "20px",
  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
};

const seedTitle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: "600",
  color: "#64748b",
  textTransform: "uppercase",
  textAlign: "center",
  letterSpacing: "0.05em",
  marginBottom: "10px",
};

const seedGrid: React.CSSProperties = {
  display: "flex",
  gap: "10px",
};

const baseSeedBtn: React.CSSProperties = {
  flex: 1,
  padding: "6px 0",
  border: "none",
  borderRadius: "6px",
  fontSize: "11.5px",
  fontWeight: "700",
  cursor: "pointer",
  transition: "opacity 0.2s ease",
};

const seedBtnAdmin: React.CSSProperties = {
  ...baseSeedBtn,
  backgroundColor: "rgba(239, 68, 68, 0.1)",
  color: "#ef4444",
};

const seedBtnManager: React.CSSProperties = {
  ...baseSeedBtn,
  backgroundColor: "rgba(245, 158, 11, 0.1)",
  color: "#f59e0b",
};

const seedBtnEmployee: React.CSSProperties = {
  ...baseSeedBtn,
  backgroundColor: "rgba(16, 185, 129, 0.1)",
  color: "#10b981",
};
