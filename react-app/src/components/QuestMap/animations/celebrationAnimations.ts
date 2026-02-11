import { Variants } from 'framer-motion';

// 完了時のお祝いアニメーション
export const celebrationVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 15,
    },
  },
  exit: {
    opacity: 0,
    scale: 0,
    transition: {
      duration: 0.5,
    },
  },
};

// 紙吹雪のアニメーション
export const confettiVariants: Variants = {
  initial: {
    y: -50,
    opacity: 0,
    rotate: 0,
    scale: 0.8,
  },
  animate: {
    y: [0, 100, 200],
    opacity: [0, 1, 0],
    rotate: [0, 180, 360],
    scale: [0.8, 1, 0.6],
    x: [-20, 0, 20, -10, 10, 0],
    transition: {
      duration: 3,
      ease: 'easeOut',
      times: [0, 0.3, 1],
    },
  },
};

// 花火エフェクト
export const fireworkVariants: Variants = {
  initial: {
    scale: 0,
    opacity: 0,
  },
  explode: {
    scale: [0, 1.5, 2],
    opacity: [0, 1, 0],
    transition: {
      duration: 1.2,
      ease: 'easeOut',
    },
  },
};

// 光の波紋エフェクト
export const rippleVariants: Variants = {
  initial: {
    scale: 0,
    opacity: 0.8,
  },
  animate: {
    scale: [0, 2, 4],
    opacity: [0.8, 0.4, 0],
    transition: {
      duration: 2,
      ease: 'easeOut',
    },
  },
};

// 星のキラキラエフェクト
export const sparkleVariants: Variants = {
  initial: {
    scale: 0,
    opacity: 0,
    rotate: 0,
  },
  animate: {
    scale: [0, 1, 0],
    opacity: [0, 1, 0],
    rotate: [0, 180],
    transition: {
      duration: 1,
      ease: 'easeInOut',
      repeat: 2,
      repeatType: 'loop',
    },
  },
};

// 完了バッジのアニメーション
export const completionBadgeVariants: Variants = {
  initial: {
    scale: 0,
    rotate: -180,
    opacity: 0,
  },
  animate: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 15,
      delay: 0.3,
    },
  },
  pulse: {
    scale: [1, 1.1, 1],
    transition: {
      duration: 0.8,
      repeat: 3,
      ease: 'easeInOut',
    },
  },
};

// テキストの浮上アニメーション
export const floatingTextVariants: Variants = {
  initial: {
    y: 0,
    opacity: 0,
    scale: 0.8,
  },
  animate: {
    y: -50,
    opacity: [0, 1, 0],
    scale: [0.8, 1, 1.2],
    transition: {
      duration: 2,
      ease: 'easeOut',
    },
  },
};

// プログレスサークルのアニメーション
export const progressCircleVariants: Variants = {
  initial: {
    pathLength: 0,
    opacity: 0,
  },
  animate: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        type: 'spring',
        stiffness: 100,
        damping: 15,
        duration: 2,
      },
      opacity: {
        duration: 0.5,
      },
    },
  },
};

// 完了効果のコンテナアニメーション
export const celebrationContainerVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.2,
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.5,
    },
  },
};

// 成果メッセージのアニメーション
export const achievementMessageVariants: Variants = {
  initial: {
    y: 50,
    opacity: 0,
    scale: 0.9,
  },
  animate: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
      delay: 0.5,
    },
  },
  exit: {
    y: -50,
    opacity: 0,
    scale: 0.9,
    transition: {
      duration: 0.3,
    },
  },
};

// レベルアップエフェクト
export const levelUpVariants: Variants = {
  initial: {
    scale: 0,
    rotate: -90,
    opacity: 0,
  },
  animate: {
    scale: [0, 1.2, 1],
    rotate: [0, 10, -5, 0],
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: 'backOut',
    },
  },
};

// 紙吹雪の色配列
export const confettiColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD',
  '#00D2D3', '#FF9F43', '#EE5A24', '#0ABDE3',
];

// セレブレーション設定
export const celebrationConfig = {
  confettiCount: 50,
  fireworkCount: 3,
  sparkleCount: 20,
  duration: 5000, // 5秒間表示
  autoHide: true,
};