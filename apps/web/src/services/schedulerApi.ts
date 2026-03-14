/**
 * 定时任务 API 服务
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
 * API 响应类型
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: { code: string; message: string };
}

/**
 * 定时任务
 */
export interface ScheduledTask {
  taskId: string;
  name: string;
  description?: string;
  cronExpression: string;
  type: 'react' | 'command' | 'http';
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  nextRunAt?: string;
  runCount: number;
  failCount: number;
}

/**
 * 创建任务参数
 */
export interface CreateTaskParams {
  name: string;
  description?: string;
  cronExpression: string;
  type: 'react' | 'command' | 'http';
  payload: {
    query?: string;
    command?: string;
    url?: string;
    method?: string;
    body?: unknown;
  };
  options?: {
    maxIterations?: number;
    temperature?: number;
    model?: string;
  };
  notification?: {
    onSuccess?: boolean;
    onFailure?: boolean;
    email?: string;
    webhook?: string;
  };
}

/**
 * 执行记录
 */
export interface ExecutionRecord {
  executionId: string;
  status: 'success' | 'failure';
  startedAt: string;
  completedAt: string;
  duration: number;
  result?: Record<string, unknown>;
  error?: string;
}

/**
 * 调度器状态
 */
export interface SchedulerStatus {
  isRunning: boolean;
  totalTasks: number;
  activeTasks: number;
  totalRuns: number;
  totalFails: number;
  successRate: string;
}

/**
 * 定时任务 API
 */
export const schedulerApi = {
  /**
   * 获取所有任务
   */
  getTasks: () =>
    request<ApiResponse<{ tasks: ScheduledTask[] }>>('/scheduler/tasks', { method: 'GET' }),

  /**
   * 创建任务
   */
  createTask: (params: CreateTaskParams) =>
    request<ApiResponse<ScheduledTask>>('/scheduler/tasks', {
      method: 'POST',
      body: JSON.stringify(params)
    }),

  /**
   * 获取单个任务
   */
  getTask: (taskId: string) =>
    request<ApiResponse<ScheduledTask>>(`/scheduler/tasks/${taskId}`, { method: 'GET' }),

  /**
   * 更新任务
   */
  updateTask: (taskId: string, updates: Partial<CreateTaskParams>) =>
    request<ApiResponse<ScheduledTask>>(`/scheduler/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }),

  /**
   * 删除任务
   */
  deleteTask: (taskId: string) =>
    request<ApiResponse<void>>(`/scheduler/tasks/${taskId}`, { method: 'DELETE' }),

  /**
   * 启用任务
   */
  enableTask: (taskId: string) =>
    request<ApiResponse<{ taskId: string; enabled: boolean }>>(`/scheduler/tasks/${taskId}/enable`, {
      method: 'POST'
    }),

  /**
   * 禁用任务
   */
  disableTask: (taskId: string) =>
    request<ApiResponse<{ taskId: string; enabled: boolean }>>(`/scheduler/tasks/${taskId}/disable`, {
      method: 'POST'
    }),

  /**
   * 立即执行任务
   */
  runTaskNow: (taskId: string) =>
    request<ApiResponse<ExecutionRecord>>(`/scheduler/tasks/${taskId}/run`, {
      method: 'POST'
    }),

  /**
   * 获取执行历史
   */
  getExecutionHistory: (taskId: string) =>
    request<ApiResponse<{ taskId: string; history: ExecutionRecord[] }>>(`/scheduler/tasks/${taskId}/history`, {
      method: 'GET'
    }),

  /**
   * 获取调度器状态
   */
  getStatus: () =>
    request<ApiResponse<SchedulerStatus>>('/scheduler/status', { method: 'GET' })
};
