import { ThemeOptions, createTheme, alpha } from '@mui/material/styles';

// クエストマップ専用のテーマカスタマイズ
export interface QuestMapTheme {
  nodeColors: {
    current: string;
    choice: string;
    future: string;
    goal: string;
  };
  nodeStatus: {
    notStarted: string;
    inProgress: string;
    completed: string;
  };
  edgeColors: {
    default: string;
    highlighted: string;
    selected: string;
    recommended: string;
  };
  backgroundColors: {
    canvas: string;
    grid: string;
    overlay: string;
  };
  effects: {
    glow: string;
    shadow: string;
    pulse: string;
  };
  accessibility: {
    highContrast: boolean;
    reducedMotion: boolean;
    largeText: boolean;
    focusVisible: string;
  };
}

// ライトモードのデフォルトテーマ
export const lightQuestMapTheme: QuestMapTheme = {
  nodeColors: {
    current: '#2E7D32',     // 濃い緑
    choice: '#1976D2',      // 青
    future: '#F57C00',      // オレンジ
    goal: '#C62828',        // 赤
  },
  nodeStatus: {
    notStarted: '#9E9E9E',  // グレー
    inProgress: '#FF9800',  // オレンジ
    completed: '#4CAF50',   // 緑
  },
  edgeColors: {
    default: '#BDBDBD',     // ライトグレー
    highlighted: '#1976D2', // 青
    selected: '#FF5722',    // 深いオレンジ
    recommended: '#FFD700', // ゴールド
  },
  backgroundColors: {
    canvas: '#FAFAFA',      // とても薄いグレー
    grid: '#F0F0F0',        // 薄いグレー
    overlay: 'rgba(255, 255, 255, 0.9)',
  },
  effects: {
    glow: '#FFD700',        // ゴールド
    shadow: 'rgba(0, 0, 0, 0.1)',
    pulse: '#2196F3',       // ブルー
  },
  accessibility: {
    highContrast: false,
    reducedMotion: false,
    largeText: false,
    focusVisible: '#2196F3',
  },
};

// ダークモードのデフォルトテーマ
export const darkQuestMapTheme: QuestMapTheme = {
  nodeColors: {
    current: '#4CAF50',     // 明るい緑
    choice: '#42A5F5',      // 明るい青
    future: '#FF9800',      // オレンジ
    goal: '#F44336',        // 明るい赤
  },
  nodeStatus: {
    notStarted: '#757575',  // ダークグレー
    inProgress: '#FFA726',  // 明るいオレンジ
    completed: '#66BB6A',   // 明るい緑
  },
  edgeColors: {
    default: '#616161',     // ダークグレー
    highlighted: '#42A5F5', // 明るい青
    selected: '#FF7043',    // 明るいオレンジ
    recommended: '#FFD54F', // 明るいゴールド
  },
  backgroundColors: {
    canvas: '#121212',      // とても暗いグレー
    grid: '#1E1E1E',        // 暗いグレー
    overlay: 'rgba(18, 18, 18, 0.9)',
  },
  effects: {
    glow: '#FFD54F',        // 明るいゴールド
    shadow: 'rgba(255, 255, 255, 0.1)',
    pulse: '#64B5F6',       // 明るいブルー
  },
  accessibility: {
    highContrast: false,
    reducedMotion: false,
    largeText: false,
    focusVisible: '#64B5F6',
  },
};

// カラーパレットプリセット
export const colorPalettes = {
  default: {
    name: 'デフォルト',
    light: lightQuestMapTheme,
    dark: darkQuestMapTheme,
  },
  ocean: {
    name: 'オーシャン',
    light: {
      ...lightQuestMapTheme,
      nodeColors: {
        current: '#006064',
        choice: '#0277BD',
        future: '#0288D1',
        goal: '#01579B',
      },
      edgeColors: {
        ...lightQuestMapTheme.edgeColors,
        highlighted: '#0288D1',
        recommended: '#00ACC1',
      },
      effects: {
        ...lightQuestMapTheme.effects,
        glow: '#00ACC1',
        pulse: '#0288D1',
      },
    },
    dark: {
      ...darkQuestMapTheme,
      nodeColors: {
        current: '#00BCD4',
        choice: '#03A9F4',
        future: '#2196F3',
        goal: '#3F51B5',
      },
      edgeColors: {
        ...darkQuestMapTheme.edgeColors,
        highlighted: '#03A9F4',
        recommended: '#00E5FF',
      },
      effects: {
        ...darkQuestMapTheme.effects,
        glow: '#00E5FF',
        pulse: '#03A9F4',
      },
    },
  },
  forest: {
    name: 'フォレスト',
    light: {
      ...lightQuestMapTheme,
      nodeColors: {
        current: '#2E7D32',
        choice: '#388E3C',
        future: '#43A047',
        goal: '#1B5E20',
      },
      edgeColors: {
        ...lightQuestMapTheme.edgeColors,
        highlighted: '#4CAF50',
        recommended: '#8BC34A',
      },
      effects: {
        ...lightQuestMapTheme.effects,
        glow: '#8BC34A',
        pulse: '#4CAF50',
      },
    },
    dark: {
      ...darkQuestMapTheme,
      nodeColors: {
        current: '#4CAF50',
        choice: '#66BB6A',
        future: '#81C784',
        goal: '#2E7D32',
      },
      edgeColors: {
        ...darkQuestMapTheme.edgeColors,
        highlighted: '#66BB6A',
        recommended: '#AED581',
      },
      effects: {
        ...darkQuestMapTheme.effects,
        glow: '#AED581',
        pulse: '#66BB6A',
      },
    },
  },
  sunset: {
    name: 'サンセット',
    light: {
      ...lightQuestMapTheme,
      nodeColors: {
        current: '#D32F2F',
        choice: '#F57C00',
        future: '#FFA000',
        goal: '#E65100',
      },
      edgeColors: {
        ...lightQuestMapTheme.edgeColors,
        highlighted: '#FF5722',
        recommended: '#FFB74D',
      },
      effects: {
        ...lightQuestMapTheme.effects,
        glow: '#FFB74D',
        pulse: '#FF5722',
      },
    },
    dark: {
      ...darkQuestMapTheme,
      nodeColors: {
        current: '#F44336',
        choice: '#FF9800',
        future: '#FFC107',
        goal: '#E65100',
      },
      edgeColors: {
        ...darkQuestMapTheme.edgeColors,
        highlighted: '#FF7043',
        recommended: '#FFCC02',
      },
      effects: {
        ...darkQuestMapTheme.effects,
        glow: '#FFCC02',
        pulse: '#FF7043',
      },
    },
  },
  purple: {
    name: 'パープル',
    light: {
      ...lightQuestMapTheme,
      nodeColors: {
        current: '#7B1FA2',
        choice: '#8E24AA',
        future: '#9C27B0',
        goal: '#6A1B9A',
      },
      edgeColors: {
        ...lightQuestMapTheme.edgeColors,
        highlighted: '#9C27B0',
        recommended: '#BA68C8',
      },
      effects: {
        ...lightQuestMapTheme.effects,
        glow: '#BA68C8',
        pulse: '#9C27B0',
      },
    },
    dark: {
      ...darkQuestMapTheme,
      nodeColors: {
        current: '#AB47BC',
        choice: '#BA68C8',
        future: '#CE93D8',
        goal: '#8E24AA',
      },
      edgeColors: {
        ...darkQuestMapTheme.edgeColors,
        highlighted: '#BA68C8',
        recommended: '#E1BEE7',
      },
      effects: {
        ...darkQuestMapTheme.effects,
        glow: '#E1BEE7',
        pulse: '#BA68C8',
      },
    },
  },
};

// アクセシビリティ対応のハイコントラストテーマ
export const getHighContrastTheme = (baseTheme: QuestMapTheme): QuestMapTheme => ({
  ...baseTheme,
  nodeColors: {
    current: '#000000',
    choice: '#000000',
    future: '#000000',
    goal: '#000000',
  },
  nodeStatus: {
    notStarted: '#666666',
    inProgress: '#000000',
    completed: '#000000',
  },
  edgeColors: {
    default: '#333333',
    highlighted: '#000000',
    selected: '#000000',
    recommended: '#000000',
  },
  backgroundColors: {
    ...baseTheme.backgroundColors,
    canvas: '#FFFFFF',
  },
  accessibility: {
    ...baseTheme.accessibility,
    highContrast: true,
  },
});

// フォントサイズ設定
export interface FontSizeSettings {
  scale: number;
  nodeLabels: number;
  tooltips: number;
  ui: number;
}

export const fontSizePresets = {
  small: { scale: 0.85, nodeLabels: 11, tooltips: 12, ui: 13 },
  medium: { scale: 1.0, nodeLabels: 13, tooltips: 14, ui: 15 },
  large: { scale: 1.15, nodeLabels: 15, tooltips: 16, ui: 17 },
  extraLarge: { scale: 1.3, nodeLabels: 17, tooltips: 18, ui: 19 },
};

// テーマユーティリティ関数
export const createQuestMapTheme = (
  baseTheme: ThemeOptions,
  questMapTheme: QuestMapTheme,
  fontSettings: FontSizeSettings
) => {
  return createTheme({
    ...baseTheme,
    components: {
      ...baseTheme.components,
      MuiCssBaseline: {
        styleOverrides: {
          ':root': {
            // CSS変数としてテーマ色を定義
            '--qm-node-current': questMapTheme.nodeColors.current,
            '--qm-node-choice': questMapTheme.nodeColors.choice,
            '--qm-node-future': questMapTheme.nodeColors.future,
            '--qm-node-goal': questMapTheme.nodeColors.goal,
            '--qm-status-not-started': questMapTheme.nodeStatus.notStarted,
            '--qm-status-in-progress': questMapTheme.nodeStatus.inProgress,
            '--qm-status-completed': questMapTheme.nodeStatus.completed,
            '--qm-edge-default': questMapTheme.edgeColors.default,
            '--qm-edge-highlighted': questMapTheme.edgeColors.highlighted,
            '--qm-edge-selected': questMapTheme.edgeColors.selected,
            '--qm-edge-recommended': questMapTheme.edgeColors.recommended,
            '--qm-bg-canvas': questMapTheme.backgroundColors.canvas,
            '--qm-bg-grid': questMapTheme.backgroundColors.grid,
            '--qm-bg-overlay': questMapTheme.backgroundColors.overlay,
            '--qm-effect-glow': questMapTheme.effects.glow,
            '--qm-effect-shadow': questMapTheme.effects.shadow,
            '--qm-effect-pulse': questMapTheme.effects.pulse,
            '--qm-focus-visible': questMapTheme.accessibility.focusVisible,
            '--qm-font-scale': fontSettings.scale.toString(),
            '--qm-font-node': `${fontSettings.nodeLabels}px`,
            '--qm-font-tooltip': `${fontSettings.tooltips}px`,
            '--qm-font-ui': `${fontSettings.ui}px`,
          },
          // 動きの軽減設定
          ...(questMapTheme.accessibility.reducedMotion && {
            '*, *::before, *::after': {
              animationDuration: '0.01ms !important',
              animationIterationCount: '1 !important',
              transitionDuration: '0.01ms !important',
            },
          }),
          // 大きなフォント設定
          ...(questMapTheme.accessibility.largeText && {
            body: {
              fontSize: `${fontSettings.ui * 1.2}px`,
            },
            '.quest-node-label': {
              fontSize: `${fontSettings.nodeLabels * 1.2}px`,
            },
          }),
        },
      },
    },
  });
};

// カスタマイズ可能なオプション
export interface QuestMapCustomization {
  colorPalette: keyof typeof colorPalettes;
  fontSize: keyof typeof fontSizePresets;
  accessibility: {
    highContrast: boolean;
    reducedMotion: boolean;
    largeText: boolean;
  };
  layout: {
    nodeSpacing: number;
    edgeWidth: number;
    showGrid: boolean;
    showMinimap: boolean;
  };
  animations: {
    nodeAnimations: boolean;
    edgeAnimations: boolean;
    celebrationAnimations: boolean;
    speed: 'slow' | 'normal' | 'fast';
  };
}

export const defaultCustomization: QuestMapCustomization = {
  colorPalette: 'default',
  fontSize: 'medium',
  accessibility: {
    highContrast: false,
    reducedMotion: false,
    largeText: false,
  },
  layout: {
    nodeSpacing: 150,
    edgeWidth: 2,
    showGrid: false,
    showMinimap: true,
  },
  animations: {
    nodeAnimations: true,
    edgeAnimations: true,
    celebrationAnimations: true,
    speed: 'normal',
  },
};

// テーマを適用するためのユーティリティ
export const applyCustomization = (
  customization: QuestMapCustomization,
  isDarkMode: boolean
): { questMapTheme: QuestMapTheme; fontSettings: FontSizeSettings } => {
  const palette = colorPalettes[customization.colorPalette];
  let questMapTheme = isDarkMode ? palette.dark : palette.light;
  
  // アクセシビリティ設定を適用
  questMapTheme = {
    ...questMapTheme,
    accessibility: {
      ...questMapTheme.accessibility,
      ...customization.accessibility,
    },
  };
  
  // ハイコントラストモードの適用
  if (customization.accessibility.highContrast) {
    questMapTheme = getHighContrastTheme(questMapTheme);
  }
  
  const fontSettings = fontSizePresets[customization.fontSize];
  
  return { questMapTheme, fontSettings };
};

export default {
  lightQuestMapTheme,
  darkQuestMapTheme,
  colorPalettes,
  fontSizePresets,
  defaultCustomization,
  createQuestMapTheme,
  applyCustomization,
};