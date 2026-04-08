import { ApiRequestError, apiClient } from '../../lib/api';

export interface ProjectPageProject {
  id: number;
  theme: string;
  question?: string;
  hypothesis?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectPageMemo {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectPageProjectPayload {
  theme: string;
  question?: string;
  hypothesis?: string;
}

export interface ProjectPageMemoPayload {
  title: string;
  content: string;
}

const withApiError = async <T>(request: Promise<T>, fallbackError: string): Promise<T> => {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw new Error(error.message || fallbackError);
    }

    throw error;
  }
};

class ProjectPageService {
  async getProject(projectId: string): Promise<ProjectPageProject> {
    return withApiError(
      apiClient.requestJson<ProjectPageProject>(`/projects/${projectId}`),
      'プロジェクトの取得に失敗しました'
    );
  }

  async updateProject(
    projectId: string,
    payload: ProjectPageProjectPayload
  ): Promise<ProjectPageProject> {
    return withApiError(
      apiClient.requestJson<ProjectPageProject>(`/projects/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
      'プロジェクトの更新に失敗しました'
    );
  }

  async getProjectMemos(projectId: string): Promise<ProjectPageMemo[]> {
    return withApiError(
      apiClient.requestJson<ProjectPageMemo[]>(`/projects/${projectId}/memos`),
      'メモの取得に失敗しました'
    );
  }

  async createProjectMemo(
    projectId: string,
    payload: ProjectPageMemoPayload
  ): Promise<ProjectPageMemo> {
    return withApiError(
      apiClient.requestJson<ProjectPageMemo>(`/projects/${projectId}/memos`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
      'メモの作成に失敗しました'
    );
  }

  async deleteMemo(memoId: number | string): Promise<void> {
    await withApiError(
      apiClient.requestJson<unknown>(`/memos/${memoId}`, {
        method: 'DELETE',
      }),
      'メモの削除に失敗しました'
    );
  }
}

export const projectPageService = new ProjectPageService();

export default projectPageService;
