/**
 * 插件管理 API 服务
 */

const API_BASE = '/api/v1/plugins';

/**
 * 获取所有插件
 */
export async function getPlugins() {
  const response = await fetch(API_BASE);
  if (!response.ok) {
    throw new Error('Failed to fetch plugins');
  }
  return response.json();
}

/**
 * 获取插件详情
 */
export async function getPlugin(id: string) {
  const response = await fetch(`${API_BASE}/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch plugin');
  }
  return response.json();
}

/**
 * 启用/禁用插件
 */
export async function togglePlugin(id: string, enabled: boolean) {
  const response = await fetch(`${API_BASE}/${id}/toggle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ enabled }),
  });
  if (!response.ok) {
    throw new Error('Failed to toggle plugin');
  }
  return response.json();
}

/**
 * 更新插件配置
 */
export async function updatePluginConfig(id: string, config: Record<string, unknown>) {
  const response = await fetch(`${API_BASE}/${id}/config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    throw new Error('Failed to update plugin config');
  }
  return response.json();
}

/**
 * 安装插件
 */
export async function installPlugin(pluginData: FormData) {
  const response = await fetch(`${API_BASE}/install`, {
    method: 'POST',
    body: pluginData,
  });
  if (!response.ok) {
    throw new Error('Failed to install plugin');
  }
  return response.json();
}

/**
 * 卸载插件
 */
export async function uninstallPlugin(id: string) {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to uninstall plugin');
  }
  return response.json();
}

/**
 * 重启插件
 */
export async function restartPlugin(id: string) {
  const response = await fetch(`${API_BASE}/${id}/restart`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to restart plugin');
  }
  return response.json();
}
