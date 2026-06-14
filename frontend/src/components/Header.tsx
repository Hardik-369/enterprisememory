"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldCheck, Info, CloudLightning } from "lucide-react";
import { getSavedUser, User } from "@/utils/api";

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getSavedUser());
  }, [pathname]);

  const getPageTitle = () => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return "Dashboard Overview";
    
    const page = segments[0];
    switch (page) {
      case "dashboard":
        return "Dashboard";
      case "chat":
        return "AI Context Search";
      case "documents":
        return "Documents Explorer";
      case "timeline":
        return "Enterprise Log Timeline";
      case "graph":
        return "Knowledge Graph Network";
      default:
        return "Company Brain";
    }
  };

  return (
    <header className="header" style={headerStyle}>
      <div>
        <h1 style={titleStyle}>{getPageTitle()}</h1>
        <p style={subStyle}>Centralized shared intelligence and memory</p>
      </div>

      <div style={statusContainerStyle}>
        <div style={serverStatusStyle}>
          <div style={statusDotStyle}></div>
          <span style={statusLabelStyle}>API Server: Online</span>
        </div>
        
        {user && (
          <div style={roleDisplayStyle}>
            <ShieldCheck size={14} style={{ color: "#6366f1" }} />
            <span>Authorized: <strong style={{ textTransform: "capitalize" }}>{user.role}</strong></span>
          </div>
        )}
      </div>
    </header>
  );
}

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  height: "75px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#f8fafc",
  margin: "0 0 2px 0",
};

const subStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  margin: "0",
};

const statusContainerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "20px",
};

const serverStatusStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  backgroundColor: "rgba(16, 185, 129, 0.08)",
  border: "1px solid rgba(16, 185, 129, 0.2)",
  padding: "6px 12px",
  borderRadius: "20px",
};

const statusDotStyle: React.CSSProperties = {
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor: "#10b981",
  boxShadow: "0 0 8px #10b981",
};

const statusLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#10b981",
  fontWeight: "600",
};

const roleDisplayStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  backgroundColor: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  padding: "6px 12px",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#94a3b8",
};
