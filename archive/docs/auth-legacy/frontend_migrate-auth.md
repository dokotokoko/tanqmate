# Auth Migration Guide

## 移行手順

### 1. インポートの変更

**旧:**
```typescript
import { useAuthStore } from '../stores/authStore';
import apiClient from '../lib/api';
import { chatService } from '../services/chatService';
```

**新:**
```typescript
import { useAuthStore } from '../stores/authStore.unified';
import apiClient from '../lib/api.unified';
import { chatService } from '../services/chatService.unified';
```

### 2. 認証メソッドの変更

**旧:**
```typescript
const { user, login, logout, register } = useAuthStore();

// ログイン
await login(username, password);

// 登録
await register(username, password, confirmPassword);

// ログアウト
logout();
```

**新:**
```typescript
const { user, signIn, signOut, signUp, profile } = useAuthStore();

// ログイン（メールアドレス必須）
await signIn(email, password);

// 登録（メールアドレス必須）
await signUp(email, password, username);

// ログアウト
await signOut();
```

### 3. ユーザー情報の取得

**旧:**
```typescript
const { user } = useAuthStore();
if (user) {
  console.log(user.username);
  console.log(user.id);
}
```

**新:**
```typescript
const { user, profile } = useAuthStore();
if (user && profile) {
  console.log(profile.username || user.email);
  console.log(user.id);
}
```

### 4. トークン管理

**旧:**
```typescript
// tokenManagerを使用
import { tokenManager } from '../utils/tokenManager';
const token = tokenManager.getTokens()?.access_token;
```

**新:**
```typescript
// Supabaseが内部管理
const { getAccessToken } = useAuthStore();
const token = getAccessToken();
```

### 5. API呼び出し

**旧:**
```typescript
// 手動でトークンをヘッダーに追加
const token = localStorage.getItem('auth-token');
fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**新:**
```typescript
// apiClient が自動的にSupabaseセッションを使用
import apiClient from '../lib/api.unified';
await apiClient.getProjects();
```

## 移行対象ファイル一覧

### 優先度: 高
- [ ] `src/App.tsx`
- [ ] `src/pages/LoginPage.tsx`
- [ ] `src/pages/LoginPageV2.tsx`
- [ ] `src/components/ProtectedRoute.tsx`
- [ ] `src/components/ProtectedRouteV2.tsx`

### 優先度: 中
- [ ] `src/pages/DashboardPage.tsx`
- [ ] `src/pages/StudentDashboard.tsx`
- [ ] `src/pages/TeacherDashboard.tsx`
- [ ] `src/components/Layout/Layout.tsx`
- [ ] `src/components/Layout/DashboardSidebar.tsx`
- [ ] `src/components/Layout/LeftSidebar.tsx`

### 優先度: 低
- [ ] `src/pages/ProfilePage.tsx`
- [ ] `src/pages/ProjectPage.tsx`
- [ ] `src/pages/MemoPage.tsx`
- [ ] `src/pages/StepPage.tsx`
- [ ] `src/pages/GeneralInquiryPage.tsx`

## 注意事項

1. **メールアドレス必須**: 新システムではSupabase Authを使用するため、メールアドレスが必須です
2. **セッション管理**: Supabaseが自動的にセッションを管理します
3. **トークン更新**: 自動的に行われるため、手動更新は不要です
4. **プロファイル情報**: `profiles`テーブルから取得されます

## バックエンドの変更

バックエンドでもSupabaseトークンを検証する必要があります：

```python
from supabase import create_client
import os

supabase = create_client(
    os.environ.get("SUPABASE_URL"),
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
)

def verify_token(token: str):
    """Verify Supabase JWT token"""
    user = supabase.auth.get_user(token)
    if user:
        return user
    raise HTTPException(status_code=401, detail="Invalid token")
```