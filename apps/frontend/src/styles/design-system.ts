/**
 * 探Qメイト デザインシステム
 * 統一されたデザイン変数とテーマ設定を管理
 */

// ==========================================
// 1. カラーパレット
// ==========================================

export const colors = {
  // プライマリカラー
  primary: {
    50: '#E8F4FF',
    100: '#C3E4FF',
    200: '#9ED8FF',
    300: '#52BAFF',
    400: '#2FA7FF',
    500: '#059BFF', // メインカラー
    600: '#0080DD',
    700: '#006EB8',
    800: '#005A96',
    900: '#00406B',
  },
  
  // セカンダリカラー
  secondary: {
    50: '#FFF3E0',
    100: '#FFE0B2',
    200: '#FFCC80',
    300: '#FFB74D',
    400: '#FFA726',
    500: '#FF9800',
    600: '#FB8C00',
    700: '#F57C00',
    800: '#EF6C00',
    900: '#E65100',
  },
  
  // 成功・エラー・警告・情報
  success: {
    light: '#81C784',
    main: '#4CAF50',
    dark: '#388E3C',
  },
  error: {
    light: '#EF5350',
    main: '#F44336',
    dark: '#C62828',
  },
  warning: {
    light: '#FFB74D',
    main: '#FF9800',
    dark: '#F57C00',
  },
  info: {
    light: '#4FC3F7',
    main: '#29B6F6',
    dark: '#0288D1',
  },
  
  // グレースケール
  grey: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  
  // 背景色
  background: {
    default: '#FFF9C4', // パステルクリーム
    paper: '#FFFDE7',
    elevated: '#FFFFFF',
    dark: '#1E1E1E',
  },
  
  // テキストカラー
  text: {
    primary: '#333333',
    secondary: '#666666',
    disabled: '#9E9E9E',
    hint: '#BDBDBD',
    inverse: '#FFFFFF',
  },
};

// ==========================================
// 2. タイポグラフィシステム
// ==========================================

export const typography = {
  fontFamily: {
    primary: '"Noto Sans JP", "Roboto", "Helvetica", "Arial", sans-serif',
    monospace: '"Roboto Mono", "Courier New", monospace',
  },
  
  // フォントサイズ
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    md: '1.125rem',   // 18px
    lg: '1.25rem',    // 20px
    xl: '1.5rem',     // 24px
    '2xl': '1.875rem', // 30px
    '3xl': '2.25rem',  // 36px
    '4xl': '3rem',     // 48px
    '5xl': '3.75rem',  // 60px
  },
  
  // 見出しスタイル
  heading: {
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '0',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: '0',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.5,
      letterSpacing: '0',
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 500,
      lineHeight: 1.5,
      letterSpacing: '0',
    },
  },
  
  // 本文スタイル
  body: {
    large: {
      fontSize: '1.125rem',
      lineHeight: 1.7,
      letterSpacing: '0',
    },
    regular: {
      fontSize: '1rem',
      lineHeight: 1.6,
      letterSpacing: '0',
    },
    small: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      letterSpacing: '0',
    },
  },
  
  // フォントウェイト
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};

// ==========================================
// 3. スペーシングシステム
// ==========================================

export const spacing = {
  // ベーススペーシング（8pxベース）
  xs: '4px',    // 0.5
  sm: '8px',    // 1
  md: '16px',   // 2
  lg: '24px',   // 3
  xl: '32px',   // 4
  '2xl': '40px', // 5
  '3xl': '48px', // 6
  '4xl': '64px', // 8
  '5xl': '80px', // 10
  
  // レイアウト用スペーシング
  layout: {
    gutter: '24px',
    containerPadding: '24px',
    sectionSpacing: '64px',
    cardPadding: '24px',
  },
  
  // コンポーネント内スペーシング
  component: {
    buttonPadding: '12px 24px',
    inputPadding: '12px 16px',
    chipPadding: '6px 12px',
    listItemPadding: '12px 16px',
  },
};

// ==========================================
// 4. ブレークポイント
// ==========================================

export const breakpoints = {
  xs: '0px',
  sm: '600px',
  md: '960px',
  lg: '1280px',
  xl: '1920px',
  
  // タブレット専用
  tablet: {
    min: '768px',
    max: '1024px',
  },
  
  // モバイル専用
  mobile: {
    max: '599px',
  },
};

// ==========================================
// 5. シャドウシステム
// ==========================================

export const shadows = {
  xs: '0 1px 3px rgba(0, 0, 0, 0.06)',
  sm: '0 2px 10px rgba(0, 0, 0, 0.08)',
  md: '0 4px 20px rgba(0, 0, 0, 0.12)',
  lg: '0 8px 30px rgba(0, 0, 0, 0.16)',
  xl: '0 12px 40px rgba(0, 0, 0, 0.20)',
  
  // 特殊効果
  elevated: '0 10px 40px rgba(5, 155, 255, 0.15)',
  inset: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
  
  // カード用
  card: {
    default: '0 4px 20px rgba(0, 0, 0, 0.08)',
    hover: '0 8px 30px rgba(0, 0, 0, 0.15)',
    active: '0 2px 10px rgba(0, 0, 0, 0.12)',
  },
};

// ==========================================
// 6. ボーダー半径
// ==========================================

export const borderRadius = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  full: '9999px',
  
  // コンポーネント専用
  button: '14px',
  card: '16px',
  input: '12px',
  chip: '16px',
  dialog: '20px',
};

// ==========================================
// 7. トランジション
// ==========================================

export const transitions = {
  // イージング関数
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },
  
  // 継続時間
  duration: {
    shortest: '150ms',
    short: '200ms',
    standard: '300ms',
    long: '400ms',
    longest: '500ms',
  },
  
  // プリセット
  preset: {
    fast: '0.2s ease',
    normal: '0.3s ease',
    slow: '0.5s ease',
    smooth: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// ==========================================
// 8. Z-INDEX階層
// ==========================================

export const zIndex = {
  negative: -1,
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  notification: 1700,
  loading: 9999,
};

// ==========================================
// 9. グラデーション
// ==========================================

export const gradients = {
  primary: 'linear-gradient(135deg, #059BFF 0%, #00406B 100%)',
  secondary: 'linear-gradient(45deg, #52BAFF, #006EB8)',
  success: 'linear-gradient(135deg, #81C784 0%, #388E3C 100%)',
  error: 'linear-gradient(135deg, #EF5350 0%, #C62828 100%)',
  warning: 'linear-gradient(135deg, #FFB74D 0%, #F57C00 100%)',
  
  // 特殊効果
  shimmer: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
  glassmorphism: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
};

// ==========================================
// 10. アイコンサイズ
// ==========================================

export const iconSize = {
  xs: '16px',
  sm: '20px',
  md: '24px',
  lg: '32px',
  xl: '40px',
  '2xl': '48px',
};

// ==========================================
// 11. Material-UI テーマ設定
// ==========================================

export const createMuiTheme = (isDarkMode: boolean) => ({
  palette: {
    mode: isDarkMode ? 'dark' : 'light',
    primary: {
      main: colors.primary[500],
      light: colors.primary[300],
      dark: colors.primary[700],
    },
    secondary: {
      main: colors.secondary[500],
      light: colors.secondary[300],
      dark: colors.secondary[700],
    },
    error: {
      main: colors.error.main,
      light: colors.error.light,
      dark: colors.error.dark,
    },
    warning: {
      main: colors.warning.main,
      light: colors.warning.light,
      dark: colors.warning.dark,
    },
    info: {
      main: colors.info.main,
      light: colors.info.light,
      dark: colors.info.dark,
    },
    success: {
      main: colors.success.main,
      light: colors.success.light,
      dark: colors.success.dark,
    },
    background: {
      default: isDarkMode ? colors.background.dark : colors.background.default,
      paper: isDarkMode ? colors.grey[900] : colors.background.paper,
    },
    text: {
      primary: isDarkMode ? colors.text.inverse : colors.text.primary,
      secondary: isDarkMode ? colors.grey[400] : colors.text.secondary,
      disabled: colors.text.disabled,
    },
  },
  typography: {
    fontFamily: typography.fontFamily.primary,
    h1: typography.heading.h1,
    h2: typography.heading.h2,
    h3: typography.heading.h3,
    h4: typography.heading.h4,
    h5: typography.heading.h5,
    h6: typography.heading.h6,
    body1: typography.body.regular,
    body2: typography.body.small,
  },
  spacing: 8, // 8px基準
  shape: {
    borderRadius: parseInt(borderRadius.md),
  },
  shadows: [
    'none',
    shadows.xs,
    shadows.sm,
    shadows.sm,
    shadows.md,
    shadows.md,
    shadows.md,
    shadows.md,
    shadows.lg,
    shadows.lg,
    shadows.lg,
    shadows.lg,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
  ],
  transitions: {
    easing: transitions.easing,
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
  },
  zIndex: {
    mobileStepper: 1000,
    fab: 1050,
    speedDial: 1050,
    appBar: 1100,
    drawer: 1200,
    modal: 1300,
    snackbar: 1400,
    tooltip: 1500,
  },
});

// ==========================================
// 12. カスタムユーティリティ関数
// ==========================================

export const utils = {
  // レスポンシブ値を取得
  getResponsiveValue: (mobile: string, tablet: string, desktop: string) => ({
    '@media (max-width: 599px)': mobile,
    '@media (min-width: 600px) and (max-width: 1023px)': tablet,
    '@media (min-width: 1024px)': desktop,
  }),
  
  // グラスモーフィズム効果
  glassmorphism: (opacity = 0.25) => ({
    background: `rgba(255, 255, 255, ${opacity})`,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: `1px solid rgba(255, 255, 255, ${opacity / 2})`,
  }),
  
  // テキストグラデーション
  textGradient: (gradient: string) => ({
    background: gradient,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    color: 'transparent',
  }),
  
  // トランケート（省略）
  truncate: (lines = 1) => ({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
  }),
};

export default {
  colors,
  typography,
  spacing,
  breakpoints,
  shadows,
  borderRadius,
  transitions,
  zIndex,
  gradients,
  iconSize,
  createMuiTheme,
  utils,
};