<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>探Qメイト - 新UIモックアップ</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    :root {
      /* Base Colors - Soft Butter */
      --bg-primary: #FFFAED;
      --bg-secondary: #FFFDF7;
      --bg-tertiary: #FFF6E0;
      
      /* Text Colors */
      --text-primary: #2D2A26;
      --text-secondary: #6B6560;
      --text-tertiary: #9E9891;
      
      /* Accent - Orange (CTA only) */
      --accent-orange: #FF8C5A;
      --accent-orange-hover: #FF7A42;
      --accent-orange-light: #FFF4EE;
      
      /* Multi-color palette */
      --color-teal: #5BBFBA;
      --color-teal-light: #E8F6F5;
      --color-yellow: #FFD166;
      --color-yellow-light: #FFF9E6;
      --color-purple: #A78BFA;
      --color-purple-light: #F3EEFF;
      --color-pink: #F472B6;
      --color-pink-light: #FDF2F8;
      --color-green: #6BCB77;
      --color-green-light: #EEFBF0;
      
      /* Cream tones */
      --cream-base: #FFF8E7;
      --cream-medium: #FFF3D6;
      
      /* Borders & Shadows - Soft Butter */
      --border-light: #F0E8D8;
      --shadow-soft: 0 2px 12px rgba(45, 42, 38, 0.04);
      --shadow-medium: 0 4px 20px rgba(45, 42, 38, 0.06);
      --shadow-float: 0 8px 32px rgba(45, 42, 38, 0.08);
      
      /* Border Radius - 統一 */
      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 16px;
      --radius-xl: 20px;
      --radius-full: 9999px;
    }
    
    body {
      font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
    }
    
    /* ==================== */
    /* Layout               */
    /* ==================== */
    .app-container {
      display: flex;
      min-height: 100vh;
    }
    
    /* Left Sidebar - 存在感を抑える */
    .sidebar {
      width: 64px;
      background: var(--bg-secondary);
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      /* シャドウなし、境界はごく薄いボーダーのみ */
      border-right: 1px solid var(--border-light);
    }
    
    .sidebar-logo {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, var(--accent-orange), var(--color-yellow));
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 14px;
      margin-bottom: 16px;
    }
    
    .sidebar-item {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-tertiary);
      cursor: pointer;
      transition: all 0.2s;
      background: transparent;
      border: none;
      font-size: 18px;
    }
    
    .sidebar-item:hover {
      background: var(--bg-tertiary);
      color: var(--text-secondary);
    }
    
    .sidebar-item.active {
      background: var(--accent-orange-light);
      color: var(--accent-orange);
    }
    
    /* Main Content */
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      position: relative;
      max-width: 900px;
      margin: 0 auto;
      padding: 0 24px;
    }
    
    /* ==================== */
    /* Chat Area            */
    /* ==================== */
    .chat-container {
      flex: 1;
      padding: 32px 0;
      padding-bottom: 140px; /* 浮島の入力欄分 */
      overflow-y: auto;
    }
    
    .chat-header {
      text-align: center;
      margin-bottom: 32px;
    }
    
    .chat-header h1 {
      font-size: 20px;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .chat-header p {
      font-size: 14px;
      color: var(--text-secondary);
      margin-top: 4px;
    }
    
    /* Messages */
    .message {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      animation: fadeInUp 0.3s ease;
    }
    
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .message.user {
      flex-direction: row-reverse;
    }
    
    .avatar {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    
    .avatar.ai {
      background: linear-gradient(135deg, var(--accent-orange), var(--color-yellow));
      box-shadow: 0 2px 8px rgba(255, 140, 90, 0.3);
    }
    
    .avatar.user {
      background: #D8D4CE;
    }
    
    .message-content {
      max-width: 600px;
    }
    
    .message-bubble {
      padding: 16px 20px;
      border-radius: var(--radius-lg);
      font-size: 14px;
      line-height: 1.7;
    }
    
    .message.ai .message-bubble {
      background: linear-gradient(135deg, #FFFBF5, #FFF6E8);
      border: 1px solid #FFE4C8;
      box-shadow: 0 4px 16px rgba(255, 140, 90, 0.12);
      border-bottom-left-radius: var(--radius-sm);
    }
    
    .message.user .message-bubble {
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      color: var(--text-secondary);
      border-bottom-right-radius: var(--radius-sm);
    }
    
    .message-time {
      font-size: 11px;
      color: var(--text-tertiary);
      margin-top: 6px;
      padding: 0 4px;
    }
    
    .message.user .message-time {
      text-align: right;
    }
    
    /* Quest Cards */
    .quest-cards {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 16px;
    }
    
    .quest-card {
      padding: 12px 16px;
      border-radius: var(--radius-md);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      display: flex;
      align-items: center;
      gap: 8px;
      border: none;
    }
    
    .quest-card:hover,
    .quest-card:focus {
      outline: none;
      transform: translateY(-2px) scale(1.02);
    }
    
    .quest-card.teal {
      background: var(--color-teal-light);
      color: #1A8A82;
    }
    .quest-card.teal:hover {
      box-shadow: 0 6px 16px rgba(91, 191, 186, 0.25);
      background: #D4F0EE;
    }
    
    .quest-card.yellow {
      background: var(--color-yellow-light);
      color: #B8860B;
    }
    .quest-card.yellow:hover {
      box-shadow: 0 6px 16px rgba(255, 209, 102, 0.3);
      background: #FFF3CC;
    }
    
    .quest-card.purple {
      background: var(--color-purple-light);
      color: #7C3AED;
    }
    .quest-card.purple:hover {
      box-shadow: 0 6px 16px rgba(167, 139, 250, 0.25);
      background: #EDE4FF;
    }
    
    .quest-card.pink {
      background: var(--color-pink-light);
      color: #DB2777;
    }
    .quest-card.pink:hover {
      box-shadow: 0 6px 16px rgba(244, 114, 182, 0.25);
      background: #FCE7F3;
    }
    
    .quest-card.green {
      background: var(--color-green-light);
      color: #15803D;
    }
    .quest-card.green:hover {
      box-shadow: 0 6px 16px rgba(107, 203, 119, 0.25);
      background: #DCFCE7;
    }
    
    /* ==================== */
    /* Floating Input       */
    /* ==================== */
    .input-island {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      width: 696px; /* AIアイコンからユーザーアイコンまでの幅 (36+12+600+12+36) */
      max-width: calc(100vw - 48px); /* 小さい画面での最大幅制限 */
      z-index: 100;
    }
    
    .input-container {
      background: var(--bg-secondary);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-float);
      padding: 16px;
      border: 1px solid var(--border-light);
    }
    
    /* Style Selector */
    .style-selector {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-light);
    }
    
    .style-label {
      font-size: 12px;
      color: var(--text-tertiary);
      margin-right: 4px;
    }
    
    .style-chip {
      padding: 6px 12px;
      border-radius: var(--radius-full);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid var(--border-light);
      background: var(--bg-secondary);
      color: var(--text-secondary);
    }
    
    .style-chip:hover {
      border-color: var(--accent-orange);
      color: var(--accent-orange);
    }
    
    .style-chip.active {
      background: var(--accent-orange-light);
      border-color: var(--accent-orange);
      color: var(--accent-orange);
      box-shadow: 0 0 0 2px var(--accent-orange-light);
    }
    
    /* Input Row */
    .input-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .input-field {
      flex: 1;
      padding: 12px 16px;
      border: none;
      border-radius: var(--radius-md);
      font-size: 14px;
      background: var(--bg-tertiary);
      transition: all 0.2s;
    }
    
    .input-field:focus {
      outline: none;
      background: var(--bg-secondary);
      box-shadow: 0 0 0 2px var(--accent-orange);
    }
    
    .input-field::placeholder {
      color: var(--text-tertiary);
    }
    
    .send-button {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      border: none;
      background: linear-gradient(135deg, var(--accent-orange), var(--accent-orange-hover));
      color: white;
      font-size: 18px;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .send-button:hover {
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 6px 16px rgba(255, 140, 90, 0.4);
    }
    
    .send-button:active {
      transform: translateY(0) scale(0.98);
    }
    
    /* ==================== */
    /* Right Panel (Optional) */
    /* ==================== */
    .right-panel {
      width: 280px;
      background: var(--bg-secondary);
      border-left: 1px solid var(--border-light);
      padding: 24px;
      display: none; /* デフォルトは非表示、必要なら表示 */
    }
    
    @media (min-width: 1200px) {
      .right-panel {
        display: block;
      }
    }
    
    .panel-section {
      margin-bottom: 24px;
    }
    
    .panel-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    
    .project-card {
      background: var(--cream-base);
      border-radius: var(--radius-md);
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .project-card:hover {
      background: var(--cream-medium);
    }
    
    .project-name {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;
    }
    
    .project-date {
      font-size: 12px;
      color: var(--text-tertiary);
    }
    
    /* ==================== */
    /* Comparison Section   */
    /* ==================== */
    .comparison-container {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: var(--bg-secondary);
      padding: 12px 24px;
      display: flex;
      justify-content: center;
      gap: 16px;
      border-bottom: 1px solid var(--border-light);
      z-index: 200;
    }
    
    .comparison-label {
      font-size: 13px;
      padding: 8px 16px;
      border-radius: var(--radius-full);
      font-weight: 500;
    }
    
    .comparison-label.new {
      background: var(--color-green-light);
      color: #15803D;
    }
  </style>
</head>
<body>
  <!-- Comparison Header -->
  <div class="comparison-container">
    <span class="comparison-label new">✨ New UI - AI Accent + Glow</span>
  </div>
  
  <div class="app-container" style="padding-top: 56px;">
    
    <!-- Left Sidebar - ミニマル化 -->
    <nav class="sidebar">
      <div class="sidebar-logo">探Q</div>
      <button class="sidebar-item active" title="チャット">💬</button>
      <button class="sidebar-item" title="プロジェクト">📁</button>
      <button class="sidebar-item" title="タイムライン">📊</button>
      <button class="sidebar-item" title="設定">⚙️</button>
    </nav>
    
    <!-- Main Chat Area -->
    <main class="main-content">
      <div class="chat-container">
        
        <!-- Header - 区切り線なし -->
        <div class="chat-header">
          <h1>探Qメイト</h1>
          <p>あなたの探究学習をサポートします</p>
        </div>
        
        <!-- AI Message -->
        <div class="message ai">
          <div class="avatar ai">🔥</div>
          <div class="message-content">
            <div class="message-bubble">
              こんにちは！探Qメイトです 🌱<br><br>
              今日はどんなことを探究していきますか？興味があること、気になっていることを教えてください。一緒に「次の一歩」を見つけましょう！
            </div>
            <div class="message-time">14:30</div>
          </div>
        </div>
        
        <!-- User Message -->
        <div class="message user">
          <div class="avatar user">👤</div>
          <div class="message-content">
            <div class="message-bubble">
              AIが人の仕事を奪うかどうかについて調べたいと思ってる
            </div>
            <div class="message-time">14:31</div>
          </div>
        </div>
        
        <!-- AI Response with Quest Cards -->
        <div class="message ai">
          <div class="avatar ai">🔥</div>
          <div class="message-content">
            <div class="message-bubble">
              面白いテーマですね！「AIと仕事の未来」は今まさに議論されているホットな話題です。<br><br>
              次にどんなことをしてみたいですか？
            </div>
            
            <div class="quest-cards">
              <button class="quest-card teal">
                🔍 AIで変わる仕事を調べる
              </button>
              <button class="quest-card yellow">
                💭 自分の考えを整理する
              </button>
              <button class="quest-card purple">
                🎤 働いている人に聞く
              </button>
              <button class="quest-card pink">
                📝 仮説を立ててみる
              </button>
              <button class="quest-card green">
                📊 データを探す
              </button>
            </div>
            
            <div class="message-time">14:32</div>
          </div>
        </div>
        
      </div>
      
      <!-- Floating Input Island -->
      <div class="input-island">
        <div class="input-container">
          <div class="style-selector">
            <span class="style-label">応答スタイル:</span>
            <button class="style-chip active">バランス</button>
            <button class="style-chip">やさしく</button>
            <button class="style-chip">深掘り</button>
            <button class="style-chip">シンプル</button>
          </div>
          <div class="input-row">
            <input 
              type="text" 
              class="input-field" 
              placeholder="メッセージを入力してください..."
            >
            <button class="send-button">→</button>
          </div>
        </div>
      </div>
    </main>
    
    <!-- Right Panel (1200px以上で表示) -->
    <aside class="right-panel">
      <div class="panel-section">
        <div class="panel-title">探究プロジェクト</div>
        <div class="project-card">
          <div class="project-name">AIと仕事の未来</div>
          <div class="project-date">📅 2026/1/11 更新</div>
        </div>
      </div>
    </aside>
    
  </div>
</body>
</html>