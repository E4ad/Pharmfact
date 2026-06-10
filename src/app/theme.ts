import { createTheme, type Theme } from '@mui/material/styles';
import { deepmerge } from '@mui/utils';

export type ThemeMode = 'light' | 'dark' | 'system';

// Thème de base commun à light et dark
const baseTheme = {
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: {
      fontSize: 'clamp(2.6rem, 6vw, 4.6rem)',
      fontWeight: 500,
      letterSpacing: '-0.055em',
    },
    h2: {
      fontSize: 'clamp(2.1rem, 4vw, 3.5rem)',
      fontWeight: 500,
      letterSpacing: '-0.05em',
    },
    h4: {
      fontWeight: 650,
      letterSpacing: '-0.035em',
    },
    h5: {
      fontWeight: 650,
      letterSpacing: '-0.025em',
    },
    button: {
      textTransform: 'none',
      fontWeight: 650,
    },
  },
  shape: {
    borderRadius: 18,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          paddingInline: 20,
        },
      },
    },
  },
};

// Thème clair
const lightThemePalette = {
  mode: 'light' as const,
  background: {
    default: '#f7f7f8',
    paper: '#ffffff',
  },
  primary: {
    main: '#2563eb',
    light: '#3b82f6',
    dark: '#1d4ed8',
    contrastText: '#ffffff',
  },
  success: {
    main: '#059669',
    light: '#10b981',
    dark: '#047857',
  },
  warning: {
    main: '#d97706',
    light: '#f59e0b',
    dark: '#b45309',
  },
  error: {
    main: '#dc2626',
    light: '#ef4444',
    dark: '#b91c1c',
  },
  text: {
    primary: '#202124',
    secondary: '#686b70',
  },
  divider: '#e8e8eb',
};

// Thème sombre
const darkThemePalette = {
  mode: 'dark' as const,
  background: {
    default: '#0f1115',
    paper: '#171a21',
  },
  primary: {
    main: '#90caf9',
    light: '#c7d8f0',
    dark: '#639ddb',
    contrastText: '#000000',
  },
  success: {
    main: '#4caf50',
    light: '#81c784',
    dark: '#388e3c',
    contrastText: '#000000',
  },
  warning: {
    main: '#ff9800',
    light: '#ffc947',
    dark: '#c66900',
    contrastText: '#000000',
  },
  error: {
    main: '#f44336',
    light: '#ff7961',
    dark: '#ba000d',
    contrastText: '#000000',
  },
  text: {
    primary: '#f5f5f5',
    secondary: '#a0aec0',
  },
  divider: 'rgba(255, 255, 255, 0.08)',
};

// Overrides spécifiques pour le dark mode
const darkThemeOverrides = {
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid',
          borderColor: 'rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 26px rgba(0, 0, 0, 0.2)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#171a21',
          backgroundImage: 'none',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        },
        head: {
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          color: '#f5f5f5',
        },
        body: {
          color: '#f5f5f5',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0f1115',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#171a21',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#171a21',
          color: '#f5f5f5',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        },
      },
    },
    MuiSnackbar: {
      styleOverrides: {
        root: {
          backgroundColor: '#171a21',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          color: '#f5f5f5',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        },
        standardSuccess: {
          backgroundColor: 'rgba(72, 187, 120, 0.14)',
          color: '#4caf50',
        },
        standardWarning: {
          backgroundColor: 'rgba(245, 158, 11, 0.14)',
          color: '#ff9800',
        },
        standardError: {
          backgroundColor: 'rgba(244, 67, 54, 0.14)',
          color: '#f44336',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          paddingInline: 20,
        },
        containedPrimary: {
          color: '#000000',
        },
        outlined: {
          borderColor: 'rgba(255, 255, 255, 0.23)',
          color: '#f5f5f5',
          '&:hover': {
            borderColor: 'rgba(255, 255, 255, 0.4)',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(255, 255, 255, 0.23)',
          color: '#f5f5f5',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            borderColor: 'rgba(255, 255, 255, 0.3)',
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          color: '#f5f5f5',
        },
        select: {
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
        },
        icon: {
          color: '#a0aec0',
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
          color: '#f5f5f5',
        },
        title: {
          color: '#f5f5f5',
        },
        subheader: {
          color: '#a0aec0',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          color: '#f5f5f5',
          '&:last-child': {
            paddingBottom: 16,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#171a21',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: '#171a21',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: '#f5f5f5',
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          color: '#f5f5f5',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: '#a0aec0',
          '&.Mui-checked': {
            color: '#90caf9',
          },
          '&.Mui-disabled': {
            color: 'rgba(255, 255, 255, 0.3)',
          },
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          color: '#a0aec0',
          '&.Mui-checked': {
            color: '#90caf9',
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        track: {
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
          '.Mui-checked + &': {
            backgroundColor: 'rgba(144, 202, 249, 0.3)',
          },
        },
        thumb: {
          backgroundColor: '#a0aec0',
          '.Mui-checked &': {
            backgroundColor: '#90caf9',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          color: '#a0aec0',
        },
        indicator: {
          backgroundColor: '#90caf9',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: '#a0aec0',
          '&.Mui-selected': {
            color: '#f5f5f5',
          },
          '&.Mui-disabled': {
            color: 'rgba(255, 255, 255, 0.3)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          color: '#f5f5f5',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        },
        deleteIcon: {
          color: '#a0aec0',
          '&:hover': {
            color: '#f5f5f5',
          },
        },
        label: {
          color: '#f5f5f5',
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          backgroundColor: '#90caf9',
          color: '#000000',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          color: '#f5f5f5',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#a0aec0',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            color: '#f5f5f5',
          },
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          color: '#a0aec0',
          '&.Mui-focused': {
            color: '#90caf9',
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#a0aec0',
          '&.Mui-focused': {
            color: '#90caf9',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          color: '#f5f5f5',
        },
        notchedOutline: {
          borderColor: 'rgba(255, 255, 255, 0.23)',
          '&:hover': {
            borderColor: 'rgba(255, 255, 255, 0.4)',
          },
        },
      },
    },
    MuiFilledInput: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          color: '#f5f5f5',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:nth-of-type(odd)': {
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
          },
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
          },
        },
      },
    },
  },
};

// Créer les thèmes
const lightTheme = createTheme(deepmerge(baseTheme, { palette: lightThemePalette }));
const darkTheme = createTheme(deepmerge(baseTheme, { palette: darkThemePalette }, darkThemeOverrides));

// Détecter le mode système
export function getSystemMode(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

// Retourner le thème approprié en fonction du mode
export function getTheme(mode: ThemeMode): Theme {
  if (mode === 'dark') return darkTheme;
  if (mode === 'light') return lightTheme;
  // system
  return getSystemMode() === 'dark' ? darkTheme : lightTheme;
}

// Thème par défaut (pour la compatibilité descendante)
export const theme = lightTheme;

// Exporter les thèmes pour les tests
export { lightTheme, darkTheme };
