"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  Brain, 
  MessageSquare, 
  FileText, 
  Calendar, 
  GitBranch, 
  LogOut, 
  User as UserIcon,
  LayoutDashboard
} from "lucide-react";
import { getSavedUser, clearAuth, User } from "@/utils/api";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getSavedUser());
  }, [pathname]);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "AI Chat Memory", href: "/chat", icon: MessageSquare },
    { name: "Documents Explorer", href: "/documents", icon: FileText },
    { name: "Company Timeline", href: "/timeline", icon: Calendar },
    { name: "Knowledge Graph", href: "/graph", icon: GitBranch },
  ];

  return (
    <aside className="sidebar" style={sidebarStyle}>
      {/* Brand Header */}
      <div style={brandStyle}>
        <Brain style={brandIconStyle} size={28} />
        <div>
          <h2 style={brandTitleStyle}>Company Brain</h2>
          <span style={brandSubStyle}>Memory System v1</span>
        </div>
      </div>

      {/* Nav Links */}
      <nav style={navContainerStyle}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href} 
              style={isActive ? activeLinkStyle : linkStyle}
            >
              <Icon size={18} style={isActive ? activeIconStyle : iconStyle} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div style={footerStyle}>
        {user && (
          <div style={userWidgetStyle}>
            <div style={avatarStyle}>
              <UserIcon size={16} />
            </div>
            <div style={userInfoStyle}>
              <div style={usernameStyle}>{user.username}</div>
              <span style={getRoleBadgeStyle(user.role)}>{user.role}</span>
            </div>
          </div>
        )}
        <button onClick={handleLogout} style={logoutBtnStyle}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

// Inline styles for CSS flexibility without external dependencies
const sidebarStyle: React.CSSProperties = {
  padding: "20px 15px",
};

const brandStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "10px 8px 25px 8px",
  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  marginBottom: "20px",
};

const brandIconStyle: React.CSSProperties = {
  color: "#6366f1",
  filter: "drop-shadow(0 0 8px rgba(99, 102, 241, 0.45))",
};

const brandTitleStyle: React.CSSProperties = {
  fontSize: "17px",
  fontWeight: "700",
  lineHeight: "1.2",
  color: "#f8fafc",
  margin: "0",
};

const brandSubStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "#64748b",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const navContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  flex: 1,
};

const linkStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px 14px",
  borderRadius: "8px",
  color: "#94a3b8",
  fontSize: "14px",
  fontWeight: "500",
  transition: "all 0.2s ease",
};

const activeLinkStyle: React.CSSProperties = {
  ...linkStyle,
  color: "#f8fafc",
  background: "rgba(99, 102, 241, 0.12)",
  boxShadow: "inset 4px 0 0 #6366f1",
};

const iconStyle: React.CSSProperties = {
  color: "#64748b",
};

const activeIconStyle: React.CSSProperties = {
  color: "#6366f1",
};

const footerStyle: React.CSSProperties = {
  marginTop: "auto",
  paddingTop: "20px",
  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const userWidgetStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "8px",
  borderRadius: "8px",
  backgroundColor: "rgba(255, 255, 255, 0.03)",
};

const avatarStyle: React.CSSProperties = {
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  backgroundColor: "rgba(99, 102, 241, 0.2)",
  color: "#6366f1",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const userInfoStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};

const usernameStyle: React.CSSProperties = {
  fontSize: "13.5px",
  fontWeight: "600",
  color: "#f8fafc",
  textTransform: "capitalize",
};

const logoutBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  backgroundColor: "transparent",
  border: "1px solid rgba(239, 68, 68, 0.25)",
  color: "#ef4444",
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const getRoleBadgeStyle = (role: string): React.CSSProperties => {
  const base: React.CSSProperties = {
    fontSize: "9px",
    fontWeight: "bold",
    textTransform: "uppercase",
    padding: "2px 6px",
    borderRadius: "4px",
    width: "fit-content",
  };
  
  const roleLower = role.toLowerCase();
  if (roleLower === "admin") {
    return { ...base, backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#ef4444" };
  }
  if (roleLower === "manager") {
    return { ...base, backgroundColor: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" };
  }
  return { ...base, backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981" };
};
