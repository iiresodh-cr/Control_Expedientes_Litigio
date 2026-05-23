import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Container,
  Alert,
  CircularProgress 
} from '@mui/material';
import { Scale } from 'lucide-react';

export default function Login() {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error(err);
      setError('Error de autenticación. Asegúrese de utilizar su cuenta de Google institucional autorizada.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh', 
        bgcolor: '#f8fafc' 
      }}
    >
      <Container maxWidth="xs">
        <Paper 
          elevation={0}
          sx={{ 
            p: 4, 
            borderRadius: 4, 
            textAlign: 'center', 
            border: '1px solid #e2e8f0',
            boxShadow: '0px 10px 25px rgba(0, 0, 0, 0.02)'
          }}
        >
          {/* BLOQUE LOGOTIPO JURÍDICO */}
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              mb: 3 
            }}
          >
            <Box 
              sx={{ 
                bgcolor: '#1a365d', 
                p: 2, 
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Scale size={40} color="#c5a880" />
            </Box>
          </Box>

          {/* TÍTULO OFICIAL CORREGIDO */}
          <Typography 
            variant="h5" 
            fontWeight="bold" 
            color="#1a365d" 
            gutterBottom
            sx={{ letterSpacing: 0.5 }}
          >
            Control de Expedientes de Litigio
          </Typography>

          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ mb: 4 }}
          >
            Acceso exclusivo para personal legal y administrativo de IIRESODH.
          </Typography>

          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3, 
                borderRadius: 2,
                textAlign: 'left' 
              }}
            >
              {error}
            </Alert>
          )}

          {/* BOTÓN DE INGRESO CON GOOGLE */}
          <Button
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            onClick={handleLogin}
            sx={{
              bgcolor: '#1a365d',
              color: '#ffffff',
              textTransform: 'none',
              fontWeight: 'bold',
              borderRadius: 2.5,
              py: 1.5,
              '&:hover': {
                bgcolor: '#112542'
              }
            }}
          >
            {loading ? (
              <CircularProgress 
                size={24} 
                color="inherit" 
              />
            ) : (
              'Iniciar Sesión con Google'
            )}
          </Button>

          {/* PIE DE PÁGINA SANEADO Y COHERENTE */}
          <Box sx={{ mt: 4 }}>
            <Typography 
              variant="caption" 
              color="text.disabled"
            >
              Control de Expedientes de Litigio • IIRESODH
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}