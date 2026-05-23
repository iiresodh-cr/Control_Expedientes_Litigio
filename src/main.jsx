import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

// Un tema elegante y corporativo para la firma legal
const theme = createTheme({
  palette: {
    primary: {
      main: '#1a365d', // Azul marino institucional
    },
    secondary: {
      main: '#c5a880', // Dorado sutil elegante
    },
    background: {
      default: '#f8fafc', // Gris ultra claro de fondo
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
)