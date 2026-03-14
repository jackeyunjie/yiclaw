/**
 * Agent API 服务
 */

const API_BASE_URL = 'http://localhost:3000/api/v1';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });
  return response.json();
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: { code: string; message: string };
}

export interface Agent {
  agentId: string;
  name: string;
  role: string;
  description: string;
  avatar?: string;
  isActive: boolean;
  status: 'idle' | 'busy' | 'offline';
  completedTasks: number;
  failedTasks: number;
  currentTask?: string;
  lastActiveAt?: string;
}

export interface CollaborationTask {
  taskId: string;
  title: string;
  description: string;
  status: string;
  involvedAgents: string[];
  subTasksCount: number;
  completedSubTasks: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export const agentsApi = {
  getAgents: () => request<ApiResponse<{ agents: Agent[] }>>('/agents', { method: 'GET' }),
  getRoles: () => request<ApiResponse<{ roles: any[] }>>('/agents/roles', { method: 'GET' }),
  createAgent: (params: any) => request<ApiResponse<Agent>>('/agents', { method: 'POST', body: JSON.stringify(params) }),
  deleteAgent: (agentId: string) => request<ApiResponse<void>>(`/agents/${agentId}`, { method: 'DELETE' }),
  enableAgent: (agentId: string) => request<ApiResponse<any>>(`/agents/${agentId}/enable`, { method: 'POST' }),
  disableAgent: (agentId: string) => request<ApiResponse<any>>(`/agents/${agentId}/disable`, { method: 'POST' }),

  createCollaboration: (params: { title: string; description: string; options?: any }) =>
    request<ApiResponse<any>>('/agents/collaborate', { method: 'POST', body: JSON.stringify(params) }),

  getCollaborationTasks: () =>
    request<ApiResponse<{ tasks: CollaborationTask[] }>>('/agents/collaborate/tasks', { method: 'GET' }),

  getCollaborationTask: (taskId: string) =>
    request<ApiResponse<any>>(`/agents/collaborate/tasks/${taskId}`, { method: 'GET' }),

  cancelCollaboration: (taskId: string) =>
    request<ApiResponse<void>>(`/agents/collaborate/tasks/${taskId}/cancel`, { method: 'POST' })
};
