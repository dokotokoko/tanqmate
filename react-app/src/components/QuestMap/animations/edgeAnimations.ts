import { Variants, Transition } from 'framer-motion';

// エッジ描画のアニメーション
export const edgeDrawVariants: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        type: 'spring',
        stiffness: 100,
        damping: 20,
        delay: 0.3,
      },
      opacity: {
        delay: 0.3,
        duration: 0.2,
      },
    },
  },
};

// エッジの強調表示アニメーション
export const edgeHighlightVariants: Variants = {
  default: {
    strokeWidth: 2,
    stroke: '#999',
    opacity: 0.6,
  },
  highlighted: {
    strokeWidth: 4,
    stroke: '#1976D2',
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeInOut',
    },
  },
  selected: {
    strokeWidth: 6,
    stroke: '#FF5722',
    opacity: 1,
    strokeDasharray: '10,5',
    transition: {
      duration: 0.3,
      ease: 'easeInOut',
    },
  },
};

// エッジホバー時のアニメーション
export const edgeHoverVariants: Variants = {
  hover: {
    strokeWidth: 3,
    opacity: 0.9,
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
    transition: {
      duration: 0.2,
    },
  },
  rest: {
    strokeWidth: 2,
    opacity: 0.6,
    filter: 'drop-shadow(0 0 0 rgba(0,0,0,0))',
    transition: {
      duration: 0.2,
    },
  },
};

// エッジのフロー効果アニメーション
export const edgeFlowVariants: Variants = {
  flowing: {
    strokeDasharray: '8,4',
    strokeDashoffset: [0, -12],
    transition: {
      strokeDashoffset: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear',
      },
    },
  },
  static: {
    strokeDasharray: 'none',
    strokeDashoffset: 0,
  },
};

// 矢印のアニメーション
export const arrowVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.5,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      delay: 0.5,
      duration: 0.3,
    },
  },
  pulse: {
    scale: [1, 1.3, 1],
    opacity: [0.7, 1, 0.7],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// エッジ作成時のアニメーション（接続線）
export const connectionLineVariants: Variants = {
  drawing: {
    pathLength: [0, 1],
    opacity: [0, 1],
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
  completed: {
    pathLength: 1,
    opacity: 1,
  },
};

// エッジの削除アニメーション
export const edgeRemoveVariants: Variants = {
  removing: {
    opacity: 0,
    pathLength: 0,
    transition: {
      duration: 0.4,
      ease: 'easeIn',
    },
  },
};

// エッジのタイプ別スタイル
export const edgeTypeStyles = {
  solid: {
    strokeDasharray: 'none',
    strokeLinecap: 'round' as const,
  },
  dashed: {
    strokeDasharray: '8,4',
    strokeLinecap: 'round' as const,
  },
  dotted: {
    strokeDasharray: '2,3',
    strokeLinecap: 'round' as const,
  },
  curved: {
    strokeLinecap: 'round' as const,
    fill: 'none',
  },
};

// エッジの重要度に基づくアニメーション
export const edgeImportanceVariants: Variants = {
  low: {
    strokeWidth: 1,
    opacity: 0.4,
  },
  medium: {
    strokeWidth: 2,
    opacity: 0.6,
  },
  high: {
    strokeWidth: 3,
    opacity: 0.8,
  },
  critical: {
    strokeWidth: 4,
    opacity: 1,
    stroke: '#F44336',
    filter: 'drop-shadow(0 0 8px rgba(244, 67, 54, 0.3))',
  },
};

// エッジのグループ化アニメーション
export const edgeGroupVariants: Variants = {
  grouped: {
    stroke: '#9C27B0',
    strokeWidth: 3,
    opacity: 0.8,
    strokeDasharray: '6,2',
  },
  ungrouped: {
    stroke: '#999',
    strokeWidth: 2,
    opacity: 0.6,
    strokeDasharray: 'none',
  },
};

// アニメーション遅延の計算関数
export const calculateEdgeDelay = (sourceIndex: number, targetIndex: number): number => {
  return Math.max(sourceIndex, targetIndex) * 0.1;
};

// エッジのパルスアニメーション（データフロー表現）
export const edgePulseVariants: Variants = {
  pulse: {
    strokeWidth: [2, 4, 2],
    opacity: [0.6, 1, 0.6],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  noPulse: {
    strokeWidth: 2,
    opacity: 0.6,
  },
};