import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#f7f7f8',
      paper: '#ffffff',
    },
    primary: {
      main: '#2563eb',
    },
    success: {
      main: '#059669',
    },
    warning: {
      main: '#d97706',
    },
    error: {
      main: '#dc2626',
    },
    text: {
      primary: '#202124',
      secondary: '#686b70',
    },
    divider: '#e8e8eb',
  },
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
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #ececf0',
          boxShadow: '0 8px 26px rgba(16, 24, 40, 0.06)',
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
});
