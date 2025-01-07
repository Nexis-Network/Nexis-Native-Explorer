import { extendTheme } from '@mui/joy/styles';

export const theme = extendTheme({
  cssVarPrefix: 'joy',
  colorSchemes: {
    light: {
      palette: {
        primary: {
          50: '#e4e4e4',
          100: '#bdbdbd',
          200: '#989898',
          300: '#757575',
          400: '#545454',
          500: '#0B0C0E',
          600: '#292929',
          700: '#1f1f1f',
          800: '#141414',
          900: '#0a0a0a',
        }
      }
    },
    dark: {
      palette: {
        primary: {
          50: '#e4e4e4',
          100: '#bdbdbd',
          200: '#989898',
          300: '#757575',
          400: '#545454',
          500: '#0B0C0E',
          600: '#292929',
          700: '#1f1f1f',
          800: '#141414',
          900: '#0a0a0a',
        },
        background: {
          body: '#0B0C0E',
          surface: '#141414',
        },
      },
    },
  },
  components: {
    JoyButton: {
      styleOverrides: {
        root: {
          borderRadius: '4px',
        },
      },
    },
  },
  fontFamily: {
    body: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    display: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
}); 