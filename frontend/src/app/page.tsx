"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/dashboard");
  }, [router]);

  return (
    <div style={containerStyle}>
      <div style={spinnerStyle}></div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  backgroundColor: "#080b11",
};

const spinnerStyle: React.CSSProperties = {
  width: "30px",
  height: "30px",
  borderRadius: "50%",
  border: "2px solid rgba(255, 255, 255, 0.05)",
  borderTopColor: "#6366f1",
  animation: "spin 1s linear infinite",
};
