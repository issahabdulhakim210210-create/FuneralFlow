// Facebook-inspired palette
export const colors = {
  primary: {
    base: '#1877f2',
    light: '#4d8ffc',
    dark: '#165fcf',
    accent: '#42b72a',
  },

  secondary: {
    light: '#e7f3ff',
    dark: '#0f64e3',
  },

  neutral: {
    white: '#ffffff',
    50: '#f0f2f5',
    100: '#e4e6eb',
    200: '#d8dadf',
    300: '#bcc0c4',
    400: '#90949c',
    500: '#65676b',
    600: '#4b4f56',
    700: '#3a3d43',
    800: '#242526',
    900: '#050505',
  },

  success: '#42b72a',
  warning: '#f7b928',
  error: '#ed4956',
  info: '#1877f2',

  gradients: {
    primary: ['#1877f2', '#4d8ffc'],
    blue: ['#1877f2', '#165fcf'],
    gray: ['#f0f2f5', '#e4e6eb'],
  },

  text: {
    primary: '#050505',
    secondary: '#4b4f56',
    tertiary: '#65676b',
    inverse: '#ffffff',
  },

  background: {
    primary: '#ffffff',
    secondary: '#f0f2f5',
    tertiary: '#e4e6eb',
  },

  border: {
    light: '#d8dadf',
    medium: '#bcc0c4',
    dark: '#90949c',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
};

export const typography = {
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 36,
  },
  weights: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    black: '800' as const,
  },
};
