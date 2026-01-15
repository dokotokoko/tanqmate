-- refresh_tokens_schema.sql - リフレッシュトークン管理テーブル

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    session_id UUID NOT NULL,

    token_hash VARCHAR(256) NOT NULL,
    jti UUID NOT NULL,

    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMPTZ,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    client_info JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- user × session の一意性
CREATE UNIQUE INDEX IF NOT EXISTS uq_refresh_tokens_user_session
  ON refresh_tokens (user_id, session_id);

-- token_hash での照合
CREATE UNIQUE INDEX IF NOT EXISTS uq_refresh_tokens_token_hash
  ON refresh_tokens (token_hash);

-- アクティブセッション検索用
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_active
  ON refresh_tokens (user_id, expires_at)
  WHERE is_revoked = FALSE;

-- 期限切れ掃除用
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
  ON refresh_tokens (expires_at);
