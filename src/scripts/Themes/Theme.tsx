import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
    interface Palette {
      ochre: Palette['primary'];
    }
  
    interface PaletteOptions {
      ochre?: PaletteOptions['primary'];
    }
  }

export const theme = createTheme({
  palette: {
    primary: {
        main: '#ffffff',
        light: '#ffffff',
        dark: '#ffffff',
        contrastText: '#ffffff',
    },
    secondary: {
        main: '#ffffff',
        light: '#ffffff',
        dark: '#ffffff',
        contrastText: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      'Arial',
      'sans-serif'
    ].join(',')
  }
});

