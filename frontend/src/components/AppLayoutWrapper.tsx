"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { getAuthToken } from "@/utils/api";

export default function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    const token = getAuthToken();
    if (!token && !isLoginPage) {
      // Not logged in and not on login page, redirect to login
      router.push("/login");
    } else if (token && isLoginPage) {
      // Logged in and trying to access login, redirect to dashboard
      router.push("/dashboard");
    } else {
      setLoading(false);
    }
  }, [pathname, router, isLoginPage]);

  // Prevent flash of content before redirect checks
  if (loading && !isLoginPage) {
    return (
      <div style={loaderContainerStyle}>
        <div style={loaderStyle}></div>
        <span style={loaderTextStyle}>Connecting to Company Brain...</span>
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="content-body fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}

const loaderContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  backgroundColor: "#080b11",
  color: "#94a3b8",
  gap: "16px",
};

const loaderStyle: React.CSSProperties = {
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  border: "3px solid rgba(99, 102, 241, 0.15)",
  borderTopColor: "#6366f1",
  animation: "spin 1s linear infinite",
};

const loaderTextStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "600",
  letterSpacing: "0.025em",
};

// Add standard inline CSS keyframe animation for spinner
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
