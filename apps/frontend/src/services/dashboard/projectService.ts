import { ApiRequestError, apiClient } from '../../lib/api';

export interface DashboardProject {
  id: number;
  theme: string;
  question?: string;
  hypothesis?: string;
  created_at: string;
  updated_at: string;
  memo_count?: number;
}

export interface DashboardProjectPayload {
  theme: string;
  question?: string;
  hypothesis?: string;
}

export const dashboardProjectService = {
  async listProjects(): Promise<DashboardProject[]> {
    try {
      return await apiClient.requestJson<DashboardProject[]>('/projects');
    } catch (error) {
      if (error instanceof ApiRequestError) {
        throw new Error(error.message || 'プロジェクトの取得に失敗しました');
      }
      throw error;
    }
  },

  async createProject(payload: DashboardProjectPayload): Promise<void> {
    try {
      await apiClient.requestJson<unknown>('/projects', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (error) {
      if (error instanceof ApiRequestError) {
        throw new Error(error.message || 'プロジェクトの作成に失敗しました');
      }
      throw error;
    }
  },

  async updateProject(projectId: number, payload: DashboardProjectPayload): Promise<void> {
    try {
      await apiClient.requestJson<unknown>(`/projects/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } catch (error) {
      if (error instanceof ApiRequestError) {
        throw new Error(error.message || 'プロジェクトの更新に失敗しました');
      }
      throw error;
    }
  },

  async deleteProject(projectId: number): Promise<void> {
    try {
      await apiClient.requestJson<unknown>(`/projects/${projectId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      if (error instanceof ApiRequestError) {
        throw new Error(error.message || 'プロジェクトの削除に失敗しました');
      }
      throw error;
    }
  },
};
