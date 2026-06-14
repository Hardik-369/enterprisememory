const API_BASE_URL = "http://localhost:8000/api";

export interface User {
  id: number;
  username: string;
  role: string;
  created_at: string;
}

export interface DocumentInfo {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface TimelineEvent {
  id: number;
  event_type: string;
  description: string;
  reference_time: string;
  document_id: string | null;
  created_at: string;
}

export interface GraphNode {
  id: string;
  label: string;
  name: string;
  summary: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  relation: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface SearchResult {
  query: string;
  answer: string;
  context_used: string;
  sources: {
    semantic: any[];
    graph: any[];
    timeline: any[];
  };
}

// Token helper methods
export const getAuthToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("company_brain_token");
  }
  return null;
};

export const setAuthToken = (token: string, user: User) => {
  localStorage.setItem("company_brain_token", token);
  localStorage.setItem("company_brain_user", JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem("company_brain_token");
  localStorage.removeItem("company_brain_user");
};

export const getSavedUser = (): User | null => {
  if (typeof window !== "undefined") {
    const user = localStorage.getItem("company_brain_user");
    return user ? JSON.parse(user) : null;
  }
  return null;
};

// Generic fetch wrapper
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  // Default JSON content-type unless we upload FormData
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Unknown error occurred" }));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Auth
  async login(username: string, password: string): Promise<{ access_token: string; token_type: string; user: User }> {
    return apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password, role: "employee" }),
    });
  },

  async register(username: string, password: string, role: string): Promise<User> {
    return apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password, role }),
    });
  },

  async getMe(): Promise<User> {
    return apiRequest("/auth/me");
  },

  // Documents
  async listDocuments(): Promise<DocumentInfo[]> {
    return apiRequest("/documents/");
  },

  async uploadDocument(file: File): Promise<DocumentInfo> {
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest("/documents/upload", {
      method: "POST",
      body: formData,
    });
  },

  async deleteDocument(id: string): Promise<{ message: string }> {
    return apiRequest(`/documents/${id}`, {
      method: "DELETE",
    });
  },

  // Timeline
  async getTimeline(): Promise<TimelineEvent[]> {
    return apiRequest("/timeline/");
  },

  async addTimelineEvent(event_type: string, description: string, reference_time: string): Promise<TimelineEvent> {
    return apiRequest("/timeline/", {
      method: "POST",
      body: JSON.stringify({ event_type, description, reference_time }),
    });
  },

  // Graph Visualization
  async getGraph(): Promise<GraphData> {
    return apiRequest("/graph");
  },

  // Search
  async search(query: string, sources: string[] | null = null): Promise<SearchResult> {
    return apiRequest("/search", {
      method: "POST",
      body: JSON.stringify({ query, sources }),
    });
  },
};
