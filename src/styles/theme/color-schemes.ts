import type { ColorSystemOptions } from '@mui/material/styles';

import { california, kepple, lightenedGrassGreen, neonBlue, nevada, redOrange, shakespeare } from './colors';
import type { ColorScheme } from './types';

export const colorSchemes = {
  dark: {
    palette: {
      action: { disabledBackground: 'rgba(0, 0, 0, 0.12)' },
      background: {
        default: 'var(--mui-palette-common-black)',
        defaultChannel: '9 10 11',
        paper: 'var(--mui-palette-neutral-900)',
        paperChannel: '19 78 72',
        level1: 'var(--mui-palette-neutral-800)',
        level2: 'var(--mui-palette-neutral-700)',
        level3: 'var(--mui-palette-neutral-600)',
      },
      common: { black: '#000000', white: '#ffffff' },
      divider: 'var(--mui-palette-neutral-700)',
      dividerChannel: '50 56 62',
      error: {
        ...redOrange,
        light: redOrange[300],
        main: redOrange[400],
        dark: redOrange[500],
        contrastText: 'var(--mui-palette-common-white)',
      },
      info: {
        ...shakespeare,
        light: shakespeare[300],
        main: shakespeare[400],
        dark: shakespeare[500],
        contrastText: 'var(--mui-palette-common-black)',
      },
      dashboard: {
        color: 'var(--mui-palette-common-white)',
        chartTotalQueries: 'var(--mui-palette-primary-main)',
        chartBlockedQueries: 'var(--mui-palette-warning-main)',
        chartQueryPerSecond: 'var(--mui-palette-info-main)',
        chartCacheHitRate: 'var(--mui-palette-error-main)',
        chartCacheNumber: 'var(--mui-palette-success-main)',
        chartAverageQueryTime: redOrange[900],
      },
      toolbar: { ...nevada,
        color: 'var(--mui-palette-neutral-150)',
        background: 'var(--mui-palette-neutral-900)',
        title: {
          color: 'var(--mui-palette-neutral-150)',
          background: 'var(--mui-palette-neutral-900)',
        },
        navItem: {
          color: 'var(--mui-palette-neutral-200)',
          hoverBackground: 'rgba(255, 255, 255, 0.04)',
          activeBackground: 'var(--mui-palette-primary-main)',
          activeColor: 'var(--mui-palette-primary-contrastText)',
          disabledColor: 'var(--mui-palette-neutral-800)',
          iconColor: 'var(--mui-palette-neutral-100)',
          iconActiveColor: 'var(--mui-palette-primary-contrastText)',
          iconDisabledColor: 'var(--mui-palette-neutral-800)',
        },
      },
      neutral: { ...nevada },
      primary: {
        ...neonBlue,
        light: neonBlue[300],
        main: neonBlue[400],
        dark: neonBlue[500],
        contrastText: 'var(--mui-palette-common-white)',
      },
      secondary: {
        ...nevada,
        light: nevada[100],
        main: nevada[200],
        dark: nevada[300],
        contrastText: 'var(--mui-palette-common-black)',
      },
      success: {
        ...kepple,
        light: kepple[300],
        main: kepple[400],
        dark: kepple[500],
        contrastText: 'var(--mui-palette-common-black)',
      },
      text: {
        primary: 'var(--mui-palette-neutral-100)',
        primaryChannel: '240 244 248',
        secondary: 'var(--mui-palette-neutral-400)',
        secondaryChannel: '159 166 173',
        disabled: 'var(--mui-palette-neutral-600)',
      },
      warning: {
        ...california,
        light: california[300],
        main: california[400],
        dark: california[500],
        contrastText: 'var(--mui-palette-common-black)',
      },
    },
  },
  light: {
    palette: {
      action: { disabledBackground: 'rgba(0, 0, 0, 0.06)' },
      background: {
        default: 'var(--mui-palette-common-white)',
        defaultChannel: '255 255 255',
        paper: 'var(--mui-palette-neutral-50)',
        paperChannel: '255 255 255',
        level1: 'var(--mui-palette-neutral-50)',
        level2: 'var(--mui-palette-neutral-100)',
        level3: 'var(--mui-palette-neutral-200)',
      },
      common: { black: '#000000', white: '#ffffff' },
      divider: 'var(--mui-palette-neutral-200)',
      dividerChannel: '220 223 228',
      error: {
        ...redOrange,
        light: redOrange[400],
        main: redOrange[500],
        dark: redOrange[600],
        contrastText: 'var(--mui-palette-common-white)',
      },
      info: {
        ...shakespeare,
        light: shakespeare[400],
        main: shakespeare[500],
        dark: shakespeare[600],
        contrastText: 'var(--mui-palette-common-white)',
      },
      neutral: { ...nevada },
      dashboard: {
        color: 'var(--mui-palette-common-white)',
        chartTotalQueries: 'var(--mui-palette-primary-main)',
        chartBlockedQueries: 'var(--mui-palette-warning-main)',
        chartQueryPerSecond: 'var(--mui-palette-info-main)',
        chartCacheHitRate: 'var(--mui-palette-error-main)',
        chartCacheNumber: 'var(--mui-palette-success-main)',
        chartAverageQueryTime: redOrange[400],
      },
      toolbar: { ...nevada,
        color: 'var(--mui-palette-neutral-800)',
        background: 'var(--mui-palette-neutral-50)',
        title: {
          color: 'var(--mui-palette-neutral-800)',
          background: 'var(--mui-palette-neutral-50)',
        },
        navItem: {
          color: 'var(--mui-palette-neutral-800)',
          hoverBackground: 'rgba(0, 0, 0, 0.04)',
          activeBackground: 'var(--mui-palette-primary-main)',
          activeColor: 'var(--mui-palette-primary-contrastText)',
          disabledColor: 'var(--mui-palette-neutral-200)',
          iconColor: 'var(--mui-palette-neutral-900)',
          iconActiveColor: 'var(--mui-palette-primary-contrastText)',
          iconDisabledColor: 'var(--mui-palette-neutral-200)',
        },
      },
      primary: {
        ...lightenedGrassGreen,
        light: lightenedGrassGreen[400],
        main: lightenedGrassGreen[500],
        dark: lightenedGrassGreen[600],
        contrastText: 'var(--mui-palette-common-white)',
      },
      secondary: {
        ...nevada,
        light: nevada[600],
        main: nevada[700],
        dark: nevada[800],
        contrastText: 'var(--mui-palette-common-white)',
      },
      success: {
        ...kepple,
        light: kepple[400],
        main: kepple[500],
        dark: kepple[600],
        contrastText: 'var(--mui-palette-common-white)',
      },
      text: {
        primary: 'var(--mui-palette-neutral-900)',
        primaryChannel: '33 38 54',
        secondary: 'var(--mui-palette-neutral-500)',
        secondaryChannel: '102 112 133',
        disabled: 'var(--mui-palette-neutral-400)',
      },
      warning: {
        ...california,
        light: california[400],
        main: california[500],
        dark: california[600],
        contrastText: 'var(--mui-palette-common-white)',
      },
    },
  },
} satisfies Partial<Record<ColorScheme, ColorSystemOptions>>;
