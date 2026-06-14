"use client";

import { useEffect, useState, useRef } from "react";
import {
  Send,
  Search,
  FileText,
  GitBranch,
  Calendar,
  Bot,
  User,
  Sparkles,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Trash2
} from "lucide-react";
import { api, SearchResult, getSavedUser, User as UserType } from "@/utils/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SearchResult["sources"];
  context_used?: string;
  timestamp: Date;
}

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm the **Company Brain**. I can search across documents, knowledge graphs, and timeline logs simultaneously.\n\nAsk me anything about projects, people, incidents, or decisions.",
      timestamp: new Date(),
    },
  ]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentUser(getSavedUser());
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = query.trim();
    if (!q || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: q,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setQuery("");
    setLoading(true);

    try {
      const result = await api.search(q);
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: result.answer,
        sources: result.sources,
        context_used: result.context_used,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `**Search failed:** ${err.message || "Could not reach the API server."}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hi! I'm the **Company Brain**. I can search across documents, knowledge graphs, and timeline logs simultaneously.\n\nAsk me anything about projects, people, incidents, or decisions.",
        timestamp: new Date(),
      },
    ]);
    setExpandedSources({});
  };

  const toggleSources = (msgId: string) => {
    setExpandedSources((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const countTotalSources = (sources?: SearchResult["sources"]): number => {
    if (!sources) return 0;
    return (
      (sources.semantic?.length || 0) +
      (sources.graph?.length || 0) +
      (sources.timeline?.length || 0)
    );
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerRowStyle}>
        <div>
          <h2>AI Context Search</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "13.5px", marginTop: "2px" }}>
            Query across semantic vectors, knowledge graphs, and chronological timeline logs.
          </p>
        </div>
        {messages.length > 1 && (
          <button onClick={clearChat} style={clearBtnStyle} title="Clear conversation">
            <Trash2 size={14} />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div style={messagesContainerStyle}>
        {messages.map((msg) => (
          <div key={msg.id} style={msg.role === "user" ? userMsgWrapperStyle : assistantMsgWrapperStyle}>
            <div style={msg.role === "user" ? userBubbleStyle : assistantBubbleStyle}>
              {/* Avatar */}
              <div style={msg.role === "user" ? userAvatarStyle : assistantAvatarStyle}>
                {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
              </div>

              {/* Content */}
              <div style={msgContentStyle}>
                <div
                  style={messageTextStyle}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                />

                {/* Source counts badge */}
                {msg.sources && countTotalSources(msg.sources) > 0 && (
                  <div style={sourcesToggleStyle}>
                    <button
                      onClick={() => toggleSources(msg.id)}
                      style={sourceBtnStyle}
                    >
                      {expandedSources[msg.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      <BookOpen size={12} />
                      <span>{countTotalSources(msg.sources)} sources retrieved</span>
                    </button>

                    {/* Expanded Source Details */}
                    {expandedSources[msg.id] && (
                      <div style={sourcesDetailStyle}>
                        {msg.sources.semantic && msg.sources.semantic.length > 0 && (
                          <div style={sourceGroupStyle}>
                            <div style={sourceGroupHeaderStyle}>
                              <FileText size={12} style={{ color: "#6366f1" }} />
                              <span>Semantic Documents ({msg.sources.semantic.length})</span>
                            </div>
                            {msg.sources.semantic.map((s: any, i: number) => (
                              <div key={i} style={sourceItemStyle}>
                                <span style={sourceBadgeStyle}>#{i + 1}</span>
                                <span style={sourceTextStyle}>
                                  {s.text?.substring(0, 120)}...
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {msg.sources.graph && msg.sources.graph.length > 0 && (
                          <div style={sourceGroupStyle}>
                            <div style={sourceGroupHeaderStyle}>
                              <GitBranch size={12} style={{ color: "#a855f7" }} />
                              <span>Graph Relations ({msg.sources.graph.length})</span>
                            </div>
                            {msg.sources.graph.map((s: any, i: number) => (
                              <div key={i} style={sourceItemStyle}>
                                <span style={sourceBadgeStyle}>#{i + 1}</span>
                                <span style={sourceTextStyle}>
                                  {s.relation || `${s.name} (${s.label})`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {msg.sources.timeline && msg.sources.timeline.length > 0 && (
                          <div style={sourceGroupStyle}>
                            <div style={sourceGroupHeaderStyle}>
                              <Calendar size={12} style={{ color: "#06b6d4" }} />
                              <span>Timeline Events ({msg.sources.timeline.length})</span>
                            </div>
                            {msg.sources.timeline.map((s: any, i: number) => (
                              <div key={i} style={sourceItemStyle}>
                                <span style={sourceBadgeStyle}>#{i + 1}</span>
                                <span style={sourceTextStyle}>{s.description}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div style={assistantMsgWrapperStyle}>
            <div style={assistantBubbleStyle}>
              <div style={assistantAvatarStyle}>
                <Bot size={14} />
              </div>
              <div style={loadingDotsStyle}>
                <div style={typingDotStyle}></div>
                <div style={{ ...typingDotStyle, animationDelay: "0.2s" }}></div>
                <div style={{ ...typingDotStyle, animationDelay: "0.4s" }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={inputContainerStyle}>
        <form onSubmit={handleSend} style={inputFormStyle}>
          <div style={inputWrapperStyle}>
            <Search size={16} style={{ color: "#64748b", marginLeft: "12px", flexShrink: 0 }} />
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about projects, people, events, or any company knowledge..."
              style={textInputStyle}
              rows={1}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              style={sendBtnStyle}
            >
              {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={16} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function renderMarkdown(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      if (line.startsWith("**") && line.endsWith("**")) {
        return `<strong>${line.slice(2, -2)}</strong>`;
      }
      line = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      line = line.replace(/\*(.+?)\*/g, "<em>$1</em>");
      if (line.startsWith("- ")) {
        return `<span style="display:block;padding-left:12px;position:relative;">&bull; ${line.slice(2)}</span>`;
      }
      return line || "<br/>";
    })
    .join("\n");
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "calc(100vh - 140px)",
  maxHeight: "calc(100vh - 140px)",
};

const headerRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "16px",
  flexShrink: 0,
};

const clearBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 14px",
  borderRadius: "6px",
  backgroundColor: "rgba(239, 68, 68, 0.08)",
  border: "1px solid rgba(239, 68, 68, 0.15)",
  color: "#f87171",
  fontSize: "12px",
  fontWeight: "600",
  cursor: "pointer",
};

const messagesContainerStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  paddingRight: "8px",
  marginBottom: "16px",
};

const userMsgWrapperStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
};

const assistantMsgWrapperStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-start",
};

const userBubbleStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  maxWidth: "75%",
  backgroundColor: "rgba(99, 102, 241, 0.1)",
  border: "1px solid rgba(99, 102, 241, 0.15)",
  borderRadius: "12px 12px 4px 12px",
  padding: "12px 16px",
};

const assistantBubbleStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  maxWidth: "85%",
  backgroundColor: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  borderRadius: "12px 12px 12px 4px",
  padding: "12px 16px",
};

const userAvatarStyle: React.CSSProperties = {
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  backgroundColor: "rgba(99, 102, 241, 0.2)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#6366f1",
  flexShrink: 0,
};

const assistantAvatarStyle: React.CSSProperties = {
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  backgroundColor: "rgba(16, 185, 129, 0.15)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#10b981",
  flexShrink: 0,
};

const msgContentStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const messageTextStyle: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#e2e8f0",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const sourcesToggleStyle: React.CSSProperties = {
  marginTop: "12px",
  paddingTop: "10px",
  borderTop: "1px solid rgba(255, 255, 255, 0.04)",
};

const sourceBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  padding: "4px 10px",
  borderRadius: "6px",
  backgroundColor: "rgba(99, 102, 241, 0.08)",
  border: "1px solid rgba(99, 102, 241, 0.12)",
  color: "#818cf8",
  fontSize: "11px",
  fontWeight: "600",
  cursor: "pointer",
};

const sourcesDetailStyle: React.CSSProperties = {
  marginTop: "10px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const sourceGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const sourceGroupHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "11px",
  fontWeight: "600",
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  marginBottom: "4px",
};

const sourceItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "8px",
  padding: "4px 8px",
  borderRadius: "4px",
  backgroundColor: "rgba(255, 255, 255, 0.02)",
  fontSize: "11.5px",
  color: "#94a3b8",
  lineHeight: "1.4",
};

const sourceBadgeStyle: React.CSSProperties = {
  flexShrink: 0,
  padding: "1px 5px",
  borderRadius: "3px",
  backgroundColor: "rgba(99, 102, 241, 0.1)",
  color: "#818cf8",
  fontSize: "9px",
  fontWeight: "700",
};

const sourceTextStyle: React.CSSProperties = {
  wordBreak: "break-word",
};

const loadingDotsStyle: React.CSSProperties = {
  display: "flex",
  gap: "4px",
  alignItems: "center",
  padding: "4px 0",
};

const typingDotStyle: React.CSSProperties = {
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  backgroundColor: "#64748b",
  animation: "pulse-dot 1.2s infinite",
};

const inputContainerStyle: React.CSSProperties = {
  flexShrink: 0,
};

const inputFormStyle: React.CSSProperties = {
  width: "100%",
};

const inputWrapperStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  backgroundColor: "rgba(12, 17, 33, 0.9)",
  border: "1px solid rgba(99, 102, 241, 0.15)",
  borderRadius: "12px",
  overflow: "hidden",
  transition: "border-color 0.2s ease",
};

const textInputStyle: React.CSSProperties = {
  flex: 1,
  padding: "14px 12px",
  backgroundColor: "transparent",
  border: "none",
  color: "#f8fafc",
  fontSize: "14px",
  fontFamily: "inherit",
  outline: "none",
  resize: "none",
  lineHeight: "1.4",
  maxHeight: "120px",
};

const sendBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "40px",
  height: "40px",
  margin: "6px",
  borderRadius: "8px",
  backgroundColor: "#6366f1",
  color: "white",
  border: "none",
  cursor: "pointer",
  flexShrink: 0,
  transition: "all 0.2s ease",
};
