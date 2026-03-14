/**
 * API 服务
 *
 * 封装后端 API 调用
 */

const API_BASE_URL = 'http://localhost:3000/api/v1';

/**
 * 获取存储的 token
 */
function getToken(): string | null {
  return localStorage.getItem('token');
}

/**
 * 基础请求函数
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: { code: string; message: string } }> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : '网络请求失败',
      },
    };
  }
}

// ==================== 认证 API ====================

export interface LoginParams {
  username: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: {
    id: string;
    username: string;
    role: string;
  };
}

export const authApi = {
  login: (params: LoginParams) => request<LoginResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(params),
  }),

  register: (params: LoginParams) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(params),
  }),

  getMe: () => request('/auth/me'),
};

// ==================== 会话 API ====================

export interface Session {
  id: string;
  title: string;
  channelType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: {
    content: string;
    role: string;
    createdAt: string;
  } | null;
}

export interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  metadata?: {
    model?: string;
    tokens?: {
      prompt: number;
      completion: number;
      total: number;
    };
  };
  createdAt: string;
}

export const sessionApi = {
  getSessions: () => request<Session[]>('/sessions'),

  createSession: (title: string) => request<Session>('/sessions', {
    method: 'POST',
    body: JSON.stringify({ title, channelType: 'WEB' }),
  }),

  getSession: (id: string) => request<{ id: string; title: string; messages: Message[] }>(`/sessions/${id}`),

  deleteSession: (id: string) => request(`/sessions/${id}`, {
    method: 'DELETE',
  }),

  getMessages: (sessionId: string, page = 1, limit = 20) => 
    request<{ messages: Message[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      `/sessions/${sessionId}/messages?page=${page}&limit=${limit}`
    ),

  sendMessage: (sessionId: string, content: string) => request<Message>(`/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  }),
};

// ==================== 聊天 API ====================

export interface ChatResponse {
  userMessage: Message;
  assistantMessage: {
    id: string;
    role: string;
    content: string;
    model: string;
    tokens: {
      prompt: number;
      completion: number;
      total: number;
    };
    createdAt: string;
  };
}

export const chatApi = {
  chat: (sessionId: string, content: string, model?: string) =>
    request<ChatResponse>(`/chat/${sessionId}`, {
      method: 'POST',
      body: JSON.stringify({ content, model, stream: false }),
    }),

  getModels: () => request<{ models: { id: string; name: string; description: string }[]; configured: boolean }>('/chat/models'),

  getStatus: () => request<{ available: boolean; providers: string[]; modelCount: number; message: string }>('/chat/status'),
};

// ==================== 长期记忆 API ====================

export type MemoryType = 'strategic' | 'first_principle' | 'fundamental' | 'experience' | 'preference' | 'knowledge';
export type MemoryStatus = 'active' | 'deprecated' | 'pending' | 'archived';

export interface Memory {
  memoryId: string;
  type: MemoryType;
  title: string;
  content: string;
  status: MemoryStatus;
  priority: number;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  category: string;
  accessCount: number;
  successCount: number;
  failureCount: number;
  goalLevel?: string;
  progress?: number;
  stickiness?: number;
  reviewHistory?: any[];
}

export const memoryApi = {
  // 基础 CRUD
  getMemories: (params?: { type?: string; status?: string; search?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.type) query.append('type', params.type);
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    return request<{ items: Memory[]; total: number }>(`/memory?${query.toString()}`);
  },

  getMemory: (id: string) => request<Memory & { relatedMemories: Memory[] }>(`/memory/${id}`),

  createMemory: (params: Partial<Memory>) => request<Memory>('/memory', {
    method: 'POST',
    body: JSON.stringify(params),
  }),

  updateMemory: (id: string, params: Partial<Memory>) => request<Memory>(`/memory/${id}`, {
    method: 'PUT',
    body: JSON.stringify(params),
  }),

  deleteMemory: (id: string) => request(`/memory/${id}`, {
    method: 'DELETE',
  }),

  // 特定类型记忆创建
  createStrategicMemory: (params: any) => request<Memory>('/memory/strategic', {
    method: 'POST',
    body: JSON.stringify(params),
  }),

  createFirstPrincipleMemory: (params: any) => request<Memory>('/memory/first-principle', {
    method: 'POST',
    body: JSON.stringify(params),
  }),

  createFundamentalMemory: (params: any) => request<Memory>('/memory/fundamental', {
    method: 'POST',
    body: JSON.stringify(params),
  }),

  // 复盘
  conductReview: (id: string, params: any) => request(`/memory/${id}/review`, {
    method: 'POST',
    body: JSON.stringify(params),
  }),

  // 检索
  retrieveMemories: (query: string, context?: any, limit?: number) => request<Memory[]>('/memory/retrieve', {
    method: 'POST',
    body: JSON.stringify({ query, context, limit }),
  }),

  // 统计
  getMemoryStats: () => request<any>('/memory/stats/overview'),

  // 状态管理
  updateMemoryStatus: (id: string, status: string, reason: string) => request<Memory>(`/memory/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status, reason }),
  }),

  // 战略决策
  makeStrategicDecision: (id: string) => request<any>(`/memory/${id}/decision`, {
    method: 'POST',
  }),

  // 待复盘列表
  getPendingReview: (days?: number) => request<Memory[]>(`/memory/review/pending?days=${days || 30}`),
};

/**
 * 消息通知 API
 */
export const messagingApi = {
  // 获取配置列表
  getConfigs: () => request<{ success: boolean; data: any[] }>('/messaging/configs'),

  // 发送消息
  sendMessage: (params: {
    platform: string;
    webhookUrl: string;
    content: string;
    msgType?: string;
    secret?: string;
    mentionedMobileList?: string[];
  }) => request<any>('/messaging/send', {
    method: 'POST',
    body: JSON.stringify(params),
  }),

  // 批量发送
  broadcastMessage: (params: {
    targets: Array<{ platform: string; webhookUrl: string; secret?: string }>;
    content: string;
    msgType?: string;
  }) => request<any>('/messaging/broadcast', {
    method: 'POST',
    body: JSON.stringify(params),
  }),

  // 发送任务通知
  sendTaskNotification: (params: {
    platform: string;
    webhookUrl: string;
    taskName: string;
    status: string;
    details?: any;
    secret?: string;
  }) => request<any>('/messaging/task-notification', {
    method: 'POST',
    body: JSON.stringify(params),
  }),

  // 测试配置
  testConfig: (params: {
    platform: string;
    webhookUrl: string;
    secret?: string;
  }) => request<any>('/messaging/test', {
    method: 'POST',
    body: JSON.stringify(params),
  }),
};

/**
 * 数据库工具 API
 */
export const databaseApi = {
  // 执行 SQL 查询
  executeQuery: (sql: string, limit?: number) => request<any>('/database/query', {
    method: 'POST',
    body: JSON.stringify({ sql, limit }),
  }),

  // 获取表结构
  getSchema: (tableName?: string) => request<any>(`/database/schema${tableName ? `/${tableName}` : ''}`),

  // 导出数据
  exportData: (sql: string, format: 'csv' | 'json', filename?: string) => request<any>('/database/export', {
    method: 'POST',
    body: JSON.stringify({ sql, format, filename }),
  }),

  // 生成报表
  generateReport: (params: {
    tableName: string;
    dateColumn?: string;
    startDate?: string;
    endDate?: string;
    groupBy?: string;
    metrics?: string[];
  }) => request<any>('/database/report', {
    method: 'POST',
    body: JSON.stringify(params),
  }),

  // 获取健康状态
  getHealth: () => request<any>('/database/health'),

  // ==================== Skills API ====================

  // 获取所有 Skills
  getSkills: () => request<any[]>('/database/skills'),

  // 获取单个 Skill
  getSkill: (id: string) => request<any>(`/database/skills/${id}`),

  // 创建 Skill
  createSkill: (params: {
    name: string;
    description: string;
    category?: string;
    skillDoc: string;
    workflows?: any;
    sqlTemplate: string;
    parameters?: any;
    tags?: string[];
  }) => request<any>('/database/skills', {
    method: 'POST',
    body: JSON.stringify(params),
  }),

  // 更新 Skill
  updateSkill: (id: string, params: any) => request<any>(`/database/skills/${id}`, {
    method: 'PUT',
    body: JSON.stringify(params),
  }),

  // 删除 Skill
  deleteSkill: (id: string) => request(`/database/skills/${id}`, {
    method: 'DELETE',
  }),

  // 执行 Skill
  executeSkill: (id: string, parameters?: any, limit?: number) => request<any>(`/database/skills/${id}/execute`, {
    method: 'POST',
    body: JSON.stringify({ parameters, limit }),
  }),

  // ==================== 查询历史 API ====================

  // 获取查询历史
  getHistory: (params?: { favorite?: boolean; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.favorite !== undefined) query.append('favorite', String(params.favorite));
    if (params?.limit) query.append('limit', params.limit.toString());
    return request<any[]>(`/database/history?${query.toString()}`);
  },

  // 收藏/取消收藏
  favoriteHistory: (id: string, isFavorite: boolean) => request<any>(`/database/history/${id}/favorite`, {
    method: 'PUT',
    body: JSON.stringify({ isFavorite }),
  }),

  // 添加备注
  noteHistory: (id: string, note: string) => request<any>(`/database/history/${id}/note`, {
    method: 'PUT',
    body: JSON.stringify({ note }),
  }),

  // 删除历史记录
  deleteHistory: (id: string) => request(`/database/history/${id}`, {
    method: 'DELETE',
  }),
};

// 导出 api 对象用于其他服务
export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body?: unknown) => request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
