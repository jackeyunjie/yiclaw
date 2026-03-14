/**
 * 全自动任务 API 服务
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
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response.json();
}

/**
 * 任务状态
 */
export type TaskStatus = 'planning' | 'running' | 'paused' | 'completed' | 'failed' | 'waiting_confirmation';

/**
 * 执行选项
 */
export interface ExecutionOptions {
  requireConfirmation?: boolean;
  maxIterations?: number;
  autoRetry?: boolean;
  timeout?: number;
}

/**
 * 子任务
 */
export interface SubTask {
  id: string;
  name: string;
  description: string;
  tool?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

/**
 * 任务
 */
export interface AutoTask {
  taskId: string;
  status: TaskStatus;
  goal: string;
  originalRequest: string;
  currentStep: number;
  totalSteps: number;
  subtasks: SubTask[];
  history: Array<{
    stepId: string;
    status: string;
    startTime: string;
    endTime?: string;
    aiDecision?: string;
  }>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
}

/**
 * 工具
 */
export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, {
      type: string;
      description: string;
    }>;
    required?: string[];
  };
}

/**
 * API 响应类型
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: { code: string; message: string };
}

/**
 * 创建任务响应
 */
export interface CreateTaskData {
  taskId: string;
  status: TaskStatus;
  plan: {
    goal: string;
    subtasks: Array<{
      id: string;
      name: string;
      description: string;
      tool?: string;
      status: string;
    }>;
  };
}

/**
 * 任务列表响应
 */
export interface TaskListData {
  tasks: AutoTask[];
}

/**
 * 工具列表响应
 */
export interface ToolListData {
  tools: Tool[];
}

/**
 * 全自动任务 API
 */
export const taskAutoApi = {
  /**
   * 创建新任务
   */
  createTask: (request: string, options?: ExecutionOptions) =>
    apiRequest<ApiResponse<CreateTaskData>>('/tasks-auto', {
      method: 'POST',
      body: JSON.stringify({ request, options })
    }),

  /**
   * 获取任务列表
   */
  getTasks: () =>
    apiRequest<ApiResponse<TaskListData>>('/tasks-auto', { method: 'GET' }),

  /**
   * 获取任务详情
   */
  getTask: (taskId: string) =>
    apiRequest<ApiResponse<AutoTask>>(`/tasks-auto/${taskId}`, { method: 'GET' }),

  /**
   * 确认继续执行任务
   */
  confirmTask: (taskId: string) =>
    apiRequest<ApiResponse<void>>(`/tasks-auto/${taskId}/confirm`, { method: 'POST' }),

  /**
   * 暂停任务
   */
  pauseTask: (taskId: string) =>
    apiRequest<ApiResponse<void>>(`/tasks-auto/${taskId}/pause`, { method: 'POST' }),

  /**
   * 恢复任务
   */
  resumeTask: (taskId: string) =>
    apiRequest<ApiResponse<void>>(`/tasks-auto/${taskId}/resume`, { method: 'POST' }),

  /**
   * 取消任务
   */
  cancelTask: (taskId: string) =>
    apiRequest<ApiResponse<void>>(`/tasks-auto/${taskId}`, { method: 'DELETE' }),

  /**
   * 获取任务报告
   */
  getTaskReport: (taskId: string) =>
    apiRequest<ApiResponse<{ report: string }>>(`/tasks-auto/${taskId}/report`, { method: 'GET' }),

  /**
   * 获取可用工具列表
   */
  getTools: () =>
    apiRequest<ApiResponse<ToolListData>>('/tasks-auto/tools', { method: 'GET' })
};
