import { Variants, Transition } from 'framer-motion';

// ローディングスピナーのアニメーション
export const spinnerVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// パルスローディング
export const pulseVariants: Variants = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ドットローディング
export const dotLoadingVariants: Variants = {
  animate: {
    y: [0, -20, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ドットコンテナのアニメーション
export const dotContainerVariants: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.2,
    },
  },
};

// 波形ローディング
export const waveVariants: Variants = {
  animate: {
    scaleY: [1, 2, 1],
    transition: {
      duration: 0.8,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// 波形コンテナのアニメーション
export const waveContainerVariants: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// スケルトンローディング
export const skeletonVariants: Variants = {
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// プログレスバーのアニメーション
export const progressBarVariants: Variants = {
  initial: {
    width: '0%',
  },
  animate: (progress: number) => ({
    width: `${progress}%`,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  }),
};

// フェードローディング
export const fadeLoadingVariants: Variants = {
  animate: {
    opacity: [0.3, 1, 0.3],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// マップローディング専用アニメーション
export const mapLoadingVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.8,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
  generating: {
    rotate: [0, 5, -5, 0],
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ノード生成中のアニメーション
export const nodeGeneratingVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0,
    rotate: 0,
  },
  generating: {
    opacity: [0, 0.5, 0],
    scale: [0, 1.2, 0.8],
    rotate: [0, 180, 360],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  completed: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      duration: 0.5,
      ease: 'backOut',
    },
  },
};

// エッジ生成中のアニメーション
export const edgeGeneratingVariants: Variants = {
  initial: {
    pathLength: 0,
    opacity: 0,
  },
  generating: {
    pathLength: [0, 1, 0],
    opacity: [0, 0.5, 0],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  completed: {
    pathLength: 1,
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: 'easeOut',
    },
  },
};

// AI思考中のアニメーション
export const aiThinkingVariants: Variants = {
  animate: {
    rotate: [0, 10, -10, 0],
    scale: [1, 1.1, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// データ処理中のアニメーション
export const dataProcessingVariants: Variants = {
  animate: {
    x: [0, 10, -10, 0],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ローディングテキストのアニメーション
export const loadingTextVariants: Variants = {
  animate: {
    opacity: [1, 0.5, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ローディングオーバーレイ
export const loadingOverlayVariants: Variants = {
  initial: {
    opacity: 0,
    backdropFilter: 'blur(0px)',
  },
  animate: {
    opacity: 1,
    backdropFilter: 'blur(4px)',
    transition: {
      duration: 0.3,
    },
  },
  exit: {
    opacity: 0,
    backdropFilter: 'blur(0px)',
    transition: {
      duration: 0.3,
    },
  },
};

// ローディング状態の定数
export const LOADING_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  GENERATING_NODES: 'generating_nodes',
  GENERATING_EDGES: 'generating_edges',
  AI_THINKING: 'ai_thinking',
  DATA_PROCESSING: 'data_processing',
  COMPLETED: 'completed',
  ERROR: 'error',
} as const;

export type LoadingState = typeof LOADING_STATES[keyof typeof LOADING_STATES];

// ローディングメッセージ
export const loadingMessages = {
  [LOADING_STATES.LOADING]: 'データを読み込み中...',
  [LOADING_STATES.GENERATING_NODES]: 'クエストノードを生成中...',
  [LOADING_STATES.GENERATING_EDGES]: '関連性を分析中...',
  [LOADING_STATES.AI_THINKING]: 'AIが思考中...',
  [LOADING_STATES.DATA_PROCESSING]: 'データを処理中...',
  [LOADING_STATES.COMPLETED]: '完了しました！',
  [LOADING_STATES.ERROR]: 'エラーが発生しました',
};