import { supabase } from '../lib/supabase';

export interface LegacyUserCheckResult {
  exists: boolean;
  legacyUserId?: string;
  projectCount: number;
  memoCount: number;
  logCount: number;
}

export interface MigrationResult {
  success: boolean;
  error?: string;
  migratedProjects: number;
  migratedMemos: number;
  migratedLogs: number;
}

export interface MigrationTransaction {
  id: string;
  legacy_user_id: string;
  supabase_user_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  started_at: string;
  completed_at?: string;
  error_message?: string;
  migrated_data: {
    projects: number;
    memos: number;
    logs: number;
  };
}

/**
 * データ移行のためのヘルパー関数
 */
export class MigrationHelper {
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = (import.meta as any).env?.VITE_API_URL || '/api';
  }

  /**
   * 旧システムのユーザーが存在するかチェック
   */
  async checkLegacyUser(legacyUsername: string): Promise<LegacyUserCheckResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/migration/check-legacy-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: legacyUsername,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'ユーザー確認に失敗しました');
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('Legacy user check error:', error);
      throw new Error(
        error instanceof Error 
          ? error.message 
          : '旧ユーザーの確認中にエラーが発生しました'
      );
    }
  }

  /**
   * 旧システムのデータを新システムに移行
   */
  async migrateLegacyData(
    legacyUsername: string,
    supabaseUserId: string
  ): Promise<MigrationResult> {
    let transactionId: string | null = null;

    try {
      // 1. 移行トランザクションを開始
      transactionId = await this.startMigrationTransaction(legacyUsername, supabaseUserId);

      // 2. プロジェクトデータを移行
      const projectsResult = await this.migrateProjects(transactionId, legacyUsername, supabaseUserId);

      // 3. メモデータを移行
      const memosResult = await this.migrateMemos(transactionId, legacyUsername, supabaseUserId);

      // 4. 学習ログを移行
      const logsResult = await this.migrateLogs(transactionId, legacyUsername, supabaseUserId);

      // 5. 移行完了をマーク
      await this.completeMigrationTransaction(transactionId, {
        projects: projectsResult,
        memos: memosResult,
        logs: logsResult,
      });

      // 6. Supabaseユーザーのメタデータに旧ユーザーIDを関連付け
      await this.updateSupabaseUserMetadata(supabaseUserId, legacyUsername);

      return {
        success: true,
        migratedProjects: projectsResult,
        migratedMemos: memosResult,
        migratedLogs: logsResult,
      };

    } catch (error) {
      console.error('Migration error:', error);

      // ロールバック処理
      if (transactionId) {
        await this.rollbackMigration(transactionId, error instanceof Error ? error.message : '不明なエラー');
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'データ移行中にエラーが発生しました',
        migratedProjects: 0,
        migratedMemos: 0,
        migratedLogs: 0,
      };
    }
  }

  /**
   * 移行トランザクションを開始
   */
  private async startMigrationTransaction(
    legacyUsername: string, 
    supabaseUserId: string
  ): Promise<string> {
    const response = await fetch(`${this.apiBaseUrl}/migration/start-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        legacy_username: legacyUsername,
        supabase_user_id: supabaseUserId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || '移行トランザクションの開始に失敗しました');
    }

    const data = await response.json();
    return data.transaction_id;
  }

  /**
   * プロジェクトデータを移行
   */
  private async migrateProjects(
    transactionId: string,
    legacyUsername: string,
    supabaseUserId: string
  ): Promise<number> {
    const response = await fetch(`${this.apiBaseUrl}/migration/migrate-projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction_id: transactionId,
        legacy_username: legacyUsername,
        supabase_user_id: supabaseUserId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'プロジェクトデータの移行に失敗しました');
    }

    const data = await response.json();
    return data.migrated_count || 0;
  }

  /**
   * メモデータを移行
   */
  private async migrateMemos(
    transactionId: string,
    legacyUsername: string,
    supabaseUserId: string
  ): Promise<number> {
    const response = await fetch(`${this.apiBaseUrl}/migration/migrate-memos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction_id: transactionId,
        legacy_username: legacyUsername,
        supabase_user_id: supabaseUserId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'メモデータの移行に失敗しました');
    }

    const data = await response.json();
    return data.migrated_count || 0;
  }

  /**
   * 学習ログを移行
   */
  private async migrateLogs(
    transactionId: string,
    legacyUsername: string,
    supabaseUserId: string
  ): Promise<number> {
    const response = await fetch(`${this.apiBaseUrl}/migration/migrate-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction_id: transactionId,
        legacy_username: legacyUsername,
        supabase_user_id: supabaseUserId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || '学習ログの移行に失敗しました');
    }

    const data = await response.json();
    return data.migrated_count || 0;
  }

  /**
   * 移行トランザクションを完了
   */
  private async completeMigrationTransaction(
    transactionId: string,
    migratedData: { projects: number; memos: number; logs: number }
  ): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/migration/complete-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction_id: transactionId,
        migrated_data: migratedData,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || '移行トランザクションの完了に失敗しました');
    }
  }

  /**
   * Supabaseユーザーのメタデータを更新
   */
  private async updateSupabaseUserMetadata(
    supabaseUserId: string,
    legacyUsername: string
  ): Promise<void> {
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          legacy_username: legacyUsername,
          migration_completed_at: new Date().toISOString(),
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to update user metadata:', error);
      // メタデータ更新失敗は致命的エラーではないため、ログのみ出力
    }
  }

  /**
   * 移行をロールバック
   */
  private async rollbackMigration(
    transactionId: string,
    errorMessage: string
  ): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/migration/rollback-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: transactionId,
          error_message: errorMessage,
        }),
      });

      if (!response.ok) {
        console.error('Failed to rollback migration transaction');
      }
    } catch (error) {
      console.error('Rollback error:', error);
    }
  }

  /**
   * 移行履歴を取得
   */
  async getMigrationHistory(supabaseUserId: string): Promise<MigrationTransaction[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/migration/history/${supabaseUserId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('移行履歴の取得に失敗しました');
      }

      const data = await response.json();
      return data.transactions || [];

    } catch (error) {
      console.error('Failed to get migration history:', error);
      return [];
    }
  }

  /**
   * 移行可能性をチェック
   */
  async checkMigrationEligibility(legacyUsername: string, supabaseUserId: string): Promise<{
    eligible: boolean;
    reason?: string;
    previousMigration?: MigrationTransaction;
  }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/migration/check-eligibility`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          legacy_username: legacyUsername,
          supabase_user_id: supabaseUserId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          eligible: false,
          reason: errorData.detail || '移行適格性の確認に失敗しました',
        };
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('Migration eligibility check error:', error);
      return {
        eligible: false,
        reason: '移行適格性の確認中にエラーが発生しました',
      };
    }
  }

  /**
   * テスト用のドライラン移行
   */
  async dryRunMigration(legacyUsername: string): Promise<{
    estimatedTime: number; // 分
    dataSize: number; // MB
    conflicts: string[];
    recommendations: string[];
  }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/migration/dry-run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          legacy_username: legacyUsername,
        }),
      });

      if (!response.ok) {
        throw new Error('ドライラン移行の実行に失敗しました');
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('Dry run migration error:', error);
      throw error;
    }
  }
}

// シングルトンインスタンスをエクスポート
export const migrationHelper = new MigrationHelper();