/**
 * 探Qメイト デザインシステム
 * Master spec: docs/design_system_master_spec.md
 */

export const colors = {
  primary: {
    50: '#FFF1E8',
    100: '#FFE4D3',
    200: '#FFD0B3',
    300: '#FFBA92',
    400: '#FFA26F',
    500: '#FF8C5A',
    600: '#FF7A42',
    700: '#F0642B',
    800: '#D9531F',
    900: '#B94317',
    contrastText: '#FFFFFF',
  },

  secondary: {
    50: '#EEF5F9',
    100: '#DCEAF3',
    200: '#C3D9E8',
    300: '#A7C6DA',
    400: '#8CB4CE',
    500: '#7BA9C9',
    600: '#5F94B9',
    700: '#4B7B9B',
    800: '#3A617B',
    900: '#2B4B5F',
    contrastText: '#FFFFFF',
  },

  accentWarm: {
    soft: '#FFE4CC',
    main: '#FF8C5A',
    hover: '#FF7A42',
    active: '#FF6B35',
    contrastText: '#FFFFFF',
  },

  trustBlue: {
    soft: '#DCEAF3',
    main: '#7BA9C9',
    hover: '#5F94B9',
    strong: '#4B7B9B',
    contrastText: '#FFFFFF',
  },

  success: {
    light: '#DDEBDD',
    main: '#6FA67A',
    dark: '#4E7D58',
  },
  error: {
    light: '#F5DDD8',
    main: '#D46A5F',
    dark: '#A84E46',
  },
  warning: {
    light: '#F5E5C7',
    main: '#D89A43',
    dark: '#AA742F',
  },
  info: {
    light: '#DCEAF3',
    main: '#6F98B8',
    dark: '#51748D',
  },

  grey: {
    50: '#FAF7F2',
    100: '#F4EEE4',
    200: '#E8DED0',
    300: '#D8CDB8',
    400: '#C3B6A1',
    500: '#A59681',
    600: '#857967',
    700: '#6B6257',
    800: '#4F4841',
    900: '#322D29',
  },

  background: {
    default: '#FFFAED',
    paper: '#FFFDF7',
    subtle: '#FFF6E8',
    elevated: '#FFFFFF',
    dark: '#1E1E1E',
  },

  border: {
    soft: '#F0E8D8',
    warm: '#FFE4C8',
    strong: '#D8CDB8',
  },

  text: {
    primary: '#2D2A26',
    secondary: '#6B6560',
    muted: '#9E9891',
    disabled: '#B2ABA3',
    hint: '#9E9891',
    inverse: '#FFFFFF',
  },

  focus: {
    warm: 'rgba(255, 140, 90, 0.35)',
    warmStrong: 'rgba(255, 122, 66, 0.45)',
    blue: 'rgba(123, 169, 201, 0.30)',
  },
};

export const typography = {
  fontFamily: {
    primary: '"Noto Sans JP", "Roboto", "Helvetica", "Arial", sans-serif',
    monospace: '"Roboto Mono", "Courier New", monospace',
  },

  fontSize: {
    xs: '0.75rem',
    sm: '0.8125rem',
    base: '1rem',
    md: '1.125rem',
    lg: '1.25rem',
    xl: '1.5rem',
    '2xl': '1.75rem',
    '3xl': '2rem',
    '4xl': '2.5rem',
  },

  heading: {
    h1: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.15,
      letterSpacing: '-0.01em',
    },
    h2: {
      fontSize: '1.75rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '0',
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.35,
      letterSpacing: '0',
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '0',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.45,
      letterSpacing: '0',
    },
  },

  body: {
    large: {
      fontSize: '1rem',
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
      lineHeight: 1.55,
      letterSpacing: '0',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.45,
      letterSpacing: '0',
    },
  },

  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '48px',
  '4xl': '64px',

  layout: {
    gutter: '24px',
    containerPadding: '24px',
    sectionSpacing: '40px',
    cardPadding: '24px',
  },

  component: {
    buttonPadding: '12px 20px',
    inputPadding: '12px 16px',
    chipPadding: '6px 12px',
    listItemPadding: '12px 16px',
  },
};

export const breakpoints = {
  xs: '0px',
  sm: '600px',
  md: '960px',
  lg: '1280px',
  xl: '1920px',
  tablet: {
    min: '768px',
    max: '1024px',
  },
  mobile: {
    max: '599px',
  },
};

export const shadows = {
  xs: '0 1px 4px rgba(120, 92, 64, 0.06)',
  sm: '0 4px 16px rgba(120, 92, 64, 0.08)',
  md: '0 8px 24px rgba(120, 92, 64, 0.12)',
  lg: '0 12px 28px rgba(120, 92, 64, 0.14)',
  xl: '0 18px 40px rgba(120, 92, 64, 0.18)',

  elevated: '0 8px 24px rgba(120, 92, 64, 0.12)',
  accent: '0 8px 24px rgba(255, 140, 90, 0.18)',
  inset: 'inset 0 1px 2px rgba(120, 92, 64, 0.04)',

  card: {
    default: '0 4px 16px rgba(120, 92, 64, 0.08)',
    hover: '0 10px 28px rgba(120, 92, 64, 0.14)',
    active: '0 4px 14px rgba(120, 92, 64, 0.10)',
  },
};

export const borderRadius = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  full: '9999px',

  button: '14px',
  card: '16px',
  input: '12px',
  chip: '16px',
  dialog: '20px',
};

export const transitions = {
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },
  duration: {
    shortest: '120ms',
    short: '160ms',
    standard: '200ms',
    long: '280ms',
    longest: '360ms',
  },
  preset: {
    fast: '160ms ease',
    normal: '200ms ease',
    slow: '280ms ease',
    smooth: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

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

export const gradients = {
  warm: `linear-gradient(135deg, ${colors.accentWarm.main} 0%, ${colors.accentWarm.hover} 100%)`,
  warmSoft: 'linear-gradient(180deg, #FFFDF7 0%, #FFF6E8 100%)',
  coolSoft: 'linear-gradient(180deg, #FFFDF7 0%, #EEF5F9 100%)',
};

export const diary = {
  page: {
    background: colors.background.default,
    backgroundSoft: colors.background.subtle,
    surface: colors.background.paper,
    surfaceRaised: colors.background.elevated,
    border: colors.border.soft,
    borderWarm: colors.border.warm,
    shadow: shadows.card.default,
    shadowLift: shadows.card.hover,
  },
  accent: {
    warm: colors.accentWarm.main,
    warmSoft: colors.accentWarm.soft,
    warmActive: colors.accentWarm.active,
    trust: colors.trustBlue.main,
  },
  atmosphere: {
    topGlow:
      'radial-gradient(circle at 18% 0%, rgba(255, 228, 204, 0.88) 0%, rgba(255, 228, 204, 0.28) 24%, rgba(255, 228, 204, 0) 62%)',
    bottomGlow:
      'radial-gradient(circle at 82% 100%, rgba(123, 169, 201, 0.14) 0%, rgba(123, 169, 201, 0.06) 30%, rgba(123, 169, 201, 0) 68%)',
    wash: `linear-gradient(180deg, ${colors.background.paper} 0%, ${colors.background.subtle} 100%)`,
  },
  text: {
    primary: colors.text.primary,
    secondary: colors.text.secondary,
    muted: colors.text.muted,
  },
  layout: {
    maxWidth: '1040px',
    shellPaddingX: 'clamp(16px, 3vw, 32px)',
    shellPaddingY: 'clamp(20px, 4vw, 40px)',
    contentGap: '24px',
    sectionGap: '28px',
    panelPadding: 'clamp(18px, 2.4vw, 28px)',
    radius: borderRadius.dialog,
  },
};

export const iconSize = {
  xs: '16px',
  sm: '20px',
  md: '24px',
  lg: '32px',
  xl: '40px',
  '2xl': '48px',
};

export const createMuiTheme = (isDarkMode: boolean) => ({
  palette: {
    mode: isDarkMode ? 'dark' : 'light',
    primary: {
      main: colors.primary[500],
      light: colors.primary[300],
      dark: colors.primary[700],
      contrastText: colors.primary.contrastText,
    },
    secondary: {
      main: colors.secondary[500],
      light: colors.secondary[300],
      dark: colors.secondary[700],
      contrastText: colors.secondary.contrastText,
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
      secondary: isDarkMode ? colors.grey[300] : colors.text.secondary,
      disabled: colors.text.disabled,
    },
    divider: isDarkMode ? colors.grey[700] : colors.border.soft,
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
    caption: typography.body.caption,
    button: {
      textTransform: 'none',
      fontWeight: typography.fontWeight.semibold,
    },
  },
  spacing: 8,
  shape: {
    borderRadius: parseInt(borderRadius.md, 10),
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
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: isDarkMode ? colors.background.dark : colors.background.default,
          color: isDarkMode ? colors.text.inverse : colors.text.primary,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.button,
          textTransform: 'none',
          boxShadow: 'none',
        },
        containedPrimary: {
          backgroundColor: colors.accentWarm.main,
          color: colors.text.inverse,
          '&:hover': {
            backgroundColor: colors.accentWarm.hover,
            boxShadow: shadows.accent,
          },
        },
        outlinedPrimary: {
          borderColor: colors.border.warm,
          color: colors.accentWarm.active,
          '&:hover': {
            borderColor: colors.accentWarm.main,
            backgroundColor: colors.accentWarm.soft,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
  transitions: {
    easing: transitions.easing,
    duration: {
      shortest: 120,
      shorter: 160,
      short: 180,
      standard: 200,
      complex: 280,
      enteringScreen: 180,
      leavingScreen: 160,
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

export const utils = {
  getResponsiveValue: (mobile: string, tablet: string, desktop: string) => ({
    '@media (max-width: 599px)': mobile,
    '@media (min-width: 600px) and (max-width: 1023px)': tablet,
    '@media (min-width: 1024px)': desktop,
  }),

  focusRing: (mode: 'warm' | 'blue' = 'warm') => ({
    outline: 'none',
    boxShadow: `0 0 0 3px ${mode === 'warm' ? colors.focus.warm : colors.focus.blue}`,
  }),

  textGradient: () => ({
    color: colors.text.primary,
  }),

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
  diary,
  iconSize,
  createMuiTheme,
  utils,
};
