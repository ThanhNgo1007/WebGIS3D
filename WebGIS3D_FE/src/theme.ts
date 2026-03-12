import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366f1', // Indigo 500 - more academic/professional than vibrant cyan
      light: '#818cf8',
      dark: '#4f46e5',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#94a3b8', // Slate 400 - neutral
      light: '#cbd5e1',
      dark: '#64748b',
      contrastText: '#0f172a',
    },
    error: {
      main: '#ef4444',
    },
    success: {
      main: '#10b981',
    },
    background: {
      default: '#020617', // Slate 950 - deeper, more contrast
      paper: 'rgba(15, 23, 42, 0.8)', // Glassy Slate 900
    },
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
    },
    divider: 'rgba(255, 255, 255, 0.05)',
  },
  typography: {
    fontFamily: '"Outfit", "Inter", sans-serif',
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
      letterSpacing: '0.01em',
    },
    subtitle2: {
      fontWeight: 500,
      fontSize: '0.875rem',
      color: '#94a3b8',
    },
    body2: {
      fontSize: '0.8125rem',
      lineHeight: 1.6,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
      fontSize: '0.875rem',
    },
  },
  shape: {
    borderRadius: 8, // More conservative border radius for research tools
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: "#334155 #0f172a",
          "&::-webkit-scrollbar, & *::-webkit-scrollbar": {
            backgroundColor: "#0f172a",
            width: "5px",
            height: "5px",
          },
          "&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb": {
            borderRadius: 10,
            backgroundColor: "#334155",
            minHeight: 24,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
          },
        },
        contained: {
          backgroundColor: '#6366f1',
          '&:hover': {
            backgroundColor: '#4f46e5',
          },
        },
      },
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(2, 6, 23, 0.4)',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.1)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.2)',
            },
            '&.Mui-focused fieldset': {
              borderWidth: '1px',
            },
          },
        },
      },
      defaultProps: {
        size: 'small',
        variant: 'outlined',
      },
    },
  },
});

export default theme;
