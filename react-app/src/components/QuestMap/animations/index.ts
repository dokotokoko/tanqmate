// アニメーション関連のエクスポート
export * from './nodeAnimations';
export * from './edgeAnimations';
export * from './celebrationAnimations';
export * from './loadingAnimations';

// アニメーション設定のデフォルト値
export const defaultAnimationConfig = {
  // 基本的なトランジション設定
  transitions: {
    fast: { duration: 0.2, ease: 'easeOut' },
    normal: { duration: 0.4, ease: 'easeInOut' },
    slow: { duration: 0.8, ease: 'easeInOut' },
  },
  
  // スプリングアニメーション設定
  spring: {
    gentle: { type: 'spring', stiffness: 120, damping: 14 },
    normal: { type: 'spring', stiffness: 300, damping: 20 },
    bouncy: { type: 'spring', stiffness: 400, damping: 10 },
  },
  
  // 遅延設定
  delays: {
    instant: 0,
    short: 0.1,
    medium: 0.3,
    long: 0.5,
  },
};

// アニメーション有効/無効の設定
export interface AnimationSettings {
  enableNodeAnimations: boolean;
  enableEdgeAnimations: boolean;
  enableCelebrationAnimations: boolean;
  enableLoadingAnimations: boolean;
  animationSpeed: 'fast' | 'normal' | 'slow';
  reduceMotion: boolean;
}

export const defaultAnimationSettings: AnimationSettings = {
  enableNodeAnimations: true,
  enableEdgeAnimations: true,
  enableCelebrationAnimations: true,
  enableLoadingAnimations: true,
  animationSpeed: 'normal',
  reduceMotion: false,
};

// アクセシビリティ対応のアニメーション設定
export const getAccessibleAnimationConfig = (settings: AnimationSettings) => {
  if (settings.reduceMotion) {
    return {
      ...defaultAnimationConfig,
      transitions: {
        fast: { duration: 0, ease: 'linear' },
        normal: { duration: 0, ease: 'linear' },
        slow: { duration: 0, ease: 'linear' },
      },
    };
  }
  
  const speedMultiplier = {
    fast: 0.5,
    normal: 1,
    slow: 1.5,
  }[settings.animationSpeed];
  
  return {
    ...defaultAnimationConfig,
    transitions: {
      fast: { 
        duration: defaultAnimationConfig.transitions.fast.duration * speedMultiplier, 
        ease: 'easeOut' 
      },
      normal: { 
        duration: defaultAnimationConfig.transitions.normal.duration * speedMultiplier, 
        ease: 'easeInOut' 
      },
      slow: { 
        duration: defaultAnimationConfig.transitions.slow.duration * speedMultiplier, 
        ease: 'easeInOut' 
      },
    },
  };
};