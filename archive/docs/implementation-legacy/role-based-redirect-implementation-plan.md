# 🎯 Role-Based Redirect実装計画

## 📋 概要
生徒(student)と先生(teacher)のroleに基づいて、ログイン後のリダイレクト先を適切に振り分ける機能を実装します。

---

## 🔄 現在の状況

### 既存の実装
- ✅ Supabase認証システム実装済み
- ✅ profilesテーブルにroleカラム存在（'student' | 'teacher'）
- ✅ authStoreV2にuserRole追加済み
- ❌ 先生用ダッシュボード未実装
- ❌ role別リダイレクト未実装

### 現在のリダイレクトフロー
```
ログイン成功 → 一律 /dashboard へ
```

---

## 🎨 目標とする実装

### 新しいリダイレクトフロー
```mermaid
graph TD
    A[ログイン成功] --> B{roleチェック}
    B -->|student| C[/student へリダイレクト]
    B -->|teacher| D[/teacher へリダイレクト]
    B -->|role未設定| E[/onboarding へリダイレクト]
```

### ページ構成
| パス | ページ | 対象 | 説明 |
|------|--------|------|------|
| `/student` | StudentDashboard | 生徒 | 生徒用ダッシュボード |
| `/teacher` | TeacherDashboard | 先生 | 先生用ダッシュボード（モック） |
| `/dashboard` | - | - | `/student`へリダイレクト（後方互換） |

---

## 🚀 実装手順

### Phase 1: モックページ作成（5分）
1. **TeacherDashboard.tsx作成**
   - シンプルなテキスト表示
   - ユーザー情報表示（role, email, school）
   - ログアウトボタン

2. **StudentDashboard.tsx作成**
   - 既存のDashboardPageを複製してリネーム

### Phase 2: ルーティング設定（10分）
1. **App.tsx修正**
   ```typescript
   // 新規ルート追加
   <Route path="/student" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
   <Route path="/teacher" element={<ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>} />
   // 後方互換
   <Route path="/dashboard" element={<Navigate to="/student" />} />
   ```

2. **ProtectedRoute改修**
   - role propを追加
   - roleチェック機能追加

### Phase 3: リダイレクトロジック実装（15分）

1. **SignInPage.tsx修正**
   ```typescript
   const handleLogin = async () => {
     const result = await signIn(email, password);
     if (result.success) {
       const profile = await getProfile();
       navigate(profile?.role === 'teacher' ? '/teacher' : '/student');
     }
   };
   ```

2. **AuthCallbackPage.tsx修正**
   ```typescript
   // OAuth認証後のリダイレクト
   if (profile?.role === 'teacher') {
     navigate('/teacher');
   } else if (profile?.role === 'student') {
     navigate('/student');
   } else {
     navigate('/onboarding');
   }
   ```

3. **OnboardingPage.tsx修正**
   ```typescript
   // オンボーディング完了後
   navigate(formData.role === 'teacher' ? '/teacher' : '/student');
   ```

### Phase 4: テスト（10分）

#### テストケース
1. **生徒アカウント**
   - ログイン → `/student`へリダイレクト ✓
   - OAuth認証 → `/student`へリダイレクト ✓
   - `/teacher`アクセス → アクセス拒否 ✓

2. **先生アカウント**
   - ログイン → `/teacher`へリダイレクト ✓
   - OAuth認証 → `/teacher`へリダイレクト ✓
   - `/student`アクセス → アクセス許可（生徒管理のため） ✓

3. **新規ユーザー**
   - 登録 → `/onboarding` → role選択 → 適切なダッシュボード ✓

---

## 📊 実装優先順位

| 優先度 | タスク | 所要時間 | 依存関係 |
|--------|--------|----------|----------|
| 1 | TeacherDashboard作成 | 5分 | なし |
| 2 | App.tsxルート設定 | 5分 | 1 |
| 3 | SignInPageリダイレクト修正 | 5分 | 2 |
| 4 | AuthCallbackPageリダイレクト修正 | 5分 | 2 |
| 5 | ProtectedRoute role対応 | 10分 | 2 |
| 6 | テスト実施 | 10分 | 1-5 |

**総所要時間: 約40分**

---

## 🔍 検証方法

### 1. 生徒アカウントでテスト
```bash
# テスト用生徒アカウント
email: student@test.com
password: testpass123
期待結果: /student へリダイレクト
```

### 2. 先生アカウントでテスト
```bash
# テスト用先生アカウント
email: teacher@test.com
password: testpass123
期待結果: /teacher へリダイレクト
```

### 3. ブラウザ開発ツールで確認
```javascript
// Consoleで現在のrole確認
const store = JSON.parse(localStorage.getItem('auth-storage'));
console.log('Current role:', store.state.userRole);
```

---

## ⚠️ 注意事項

1. **後方互換性の維持**
   - 既存の`/dashboard`へのリンクは`/student`へリダイレクト
   - 既存のProtectedRouteは動作を維持

2. **セキュリティ考慮**
   - roleはサーバー側（profiles table）で管理
   - クライアント側のrole改竄は無効

3. **将来の拡張性**
   - admin roleの追加を考慮した設計
   - role別のミドルウェア追加可能

---

## 📝 実装後の確認事項

- [ ] 生徒ログイン → `/student`リダイレクト
- [ ] 先生ログイン → `/teacher`リダイレクト
- [ ] 新規登録フロー正常動作
- [ ] パスワードリセット後の適切なリダイレクト
- [ ] 不正なroleアクセスの拒否
- [ ] ログアウト後の適切なリダイレクト

---

## 🎉 完了条件

1. role別のダッシュボードが表示される
2. 適切なリダイレクトが機能する
3. 不正アクセスが防げる
4. 既存機能に影響がない