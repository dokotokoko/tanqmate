import { Variants, Transition } from 'framer-motion';

// ノード生成時のアニメーション
export const nodeAppearVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.3,
    y: -20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
      delay: 0.1,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.3,
    transition: {
      duration: 0.3,
    },
  },
};

// ノード選択時のアニメーション
export const nodeSelectVariants: Variants = {
  selected: {
    scale: 1.2,
    boxShadow: '0 0 20px rgba(25, 118, 210, 0.6)',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 15,
    },
  },
  unselected: {
    scale: 1,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 15,
    },
  },
};

// ノード推奨バッジのアニメーション
export const recommendedBadgeVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0,
    rotate: -180,
  },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 20,
      delay: 0.3,
    },
  },
  pulse: {
    scale: [1, 1.2, 1],
    boxShadow: [
      '0 0 5px gold',
      '0 0 15px gold',
      '0 0 5px gold',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ノード完了時のアニメーション
export const nodeCompletionVariants: Variants = {
  completed: {
    scale: [1, 1.3, 1.1],
    backgroundColor: ['#1976D2', '#4CAF50', '#4CAF50'],
    transition: {
      duration: 0.6,
      times: [0, 0.5, 1],
      ease: 'easeInOut',
    },
  },
  celebrating: {
    y: [0, -10, 0],
    rotate: [0, 5, -5, 0],
    transition: {
      duration: 0.8,
      repeat: 2,
      ease: 'easeInOut',
    },
  },
};

// ホバー時のアニメーション
export const nodeHoverVariants: Variants = {
  hover: {
    scale: 1.1,
    y: -5,
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 10,
    },
  },
  rest: {
    scale: 1,
    y: 0,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 15,
    },
  },
};

// ノードラベルのアニメーション
export const nodeLabelVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.2,
      duration: 0.3,
    },
  },
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.2,
    },
  },
};

// ノードのステータス変更アニメーション
export const nodeStatusVariants: Variants = {
  notStarted: {
    borderColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  inProgress: {
    borderColor: '#FF9800',
    backgroundColor: '#FFF3E0',
    boxShadow: '0 0 10px rgba(255, 152, 0, 0.3)',
  },
  completed: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
    boxShadow: '0 0 10px rgba(76, 175, 80, 0.3)',
  },
};

// ドラッグ時のアニメーション設定
export const dragTransition: Transition = {
  type: 'spring',
  stiffness: 600,
  damping: 30,
};

// ノード間の距離に基づく遅延計算
export const calculateStaggerDelay = (index: number, total: number): number => {
  return (index / total) * 0.5; // 最大0.5秒の遅延
};

// アニメーション設定のプリセット
export const animationPresets = {
  fast: {
    duration: 0.2,
    ease: 'easeOut' as const,
  },
  normal: {
    duration: 0.4,
    ease: 'easeInOut' as const,
  },
  slow: {
    duration: 0.8,
    ease: 'easeInOut' as const,
  },
  spring: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 20,
  },
  bounce: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 10,
  },
};