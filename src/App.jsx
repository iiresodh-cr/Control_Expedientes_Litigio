import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { db } from './config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Login from './views/Login';
import Layout from './components/Layout';
import Casos from './views/Casos';
import DetalleCaso from './views/DetalleCaso';
import UsuariosAutorizados from './views/UsuariosAutorizados';
import LogsAuditoria from './views/LogsAuditoria';
import { 
  Typography, 
  Paper, 
  Box, 
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import { ShieldAlert } from 'lucide-react';

function App() {
  const { user, logout } = useAuth();
  const [view, setView] = useState('casos'); 
  const [casoSeleccionado, setCasoSeleccionado] = useState(null);
  
  const [userRole, setUserRole] = useState('Abogado/a'); 
  const [loadingRole, setLoadingRole] = useState(true);
  const [openUnauthorizedModal, setOpenUnauthorizedModal] = useState(false);

  // =====================================================================================
  // CORRECCIÓN CRÍTICA: Funciones declaradas al inicio para evitar la zona muerta de alcance
  // =====================================================================================
  const handleSelectCaso = (caso) => {
    setView('detalle_caso');
    setCasoSeleccionado(caso);
  };

  const handleVolverCasos = () => {
    setView('casos');
    setCasoSeleccionado(null);
  };

  // =====================================================================================
  // EFECTOS DE CONTROL DE FLUJO Y ROL
  // =====================================================================================
  useEffect(() => {
    const resolverRolYPermisos = async () => {
      if (!user) {
        setLoadingRole(false);
        return;
      }

      // Control preventivo: Forzar reinicio de vistas al detectar cambio de usuario
      setView('casos');
      setCasoSeleccionado(null);

      const emailLimpio = user.email.toLowerCase();

      // REGLA ROOT: Cuenta Superadmin Hardcoded
      if (emailLimpio === 'webmaster@iiresodh.org') {
        setUserRole('Superadmin');
        setLoadingRole(false);
        return;
      }

      // REGLA ENTERPRISE: Búsqueda directa por ID de documento (Email)
      try {
        const userDocRef = doc(db, 'usuarios_autorizados', emailLimpio);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userDoc = userDocSnap.data();
          setUserRole(userDoc.rol || 'Abogado/a');
          setOpenUnauthorizedModal(false);
        } else {
          // Intercepción perimetral si el correo no figura en la Whitelist
          setOpenUnauthorizedModal(true);
        }
      } catch (err) {
        console.error('Error crítico resolviendo roles en Firebase:', err);
        setUserRole('Abogado/a');
      } finally {
        setLoadingRole(false);
      }
    };

    setLoadingRole(true);
    resolverRolYPermisos();
  }, [user]);

  useEffect(() => {
    if (!loadingRole) {
      if (view === 'usuarios' && userRole !== 'Superadmin' && userRole !== 'Admin') {
        setView('casos');
      }
      if (view === 'logs' && userRole !== 'Superadmin') {
        setView('casos');
      }
    }
  }, [view, userRole, loadingRole]);

  // =====================================================================================
  // SECCIÓN DE SALIDAS PREVENTIVAS (Ubicadas correctamente tras declarar las funciones)
  // =====================================================================================
  if (!user) {
    return <Login />;
  }

  if (loadingRole) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh' 
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (openUnauthorizedModal) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh', 
          bgcolor: '#f8fafc' 
        }}
      >
        <Dialog
          open={openUnauthorizedModal}
          fullWidth
          maxWidth="xs"
          slotProps={{ 
            paper: { 
              sx: { 
                borderRadius: 3, 
                border: '2px solid #ef4444',
                p: 1
              } 
            } 
          }}
        >
          <DialogTitle 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5, 
              color: '#b91c1c', 
              fontWeight: 'bold' 
            }}
          >
            <ShieldAlert size={26} />
            Acceso Denegado
          </DialogTitle>
          
          <DialogContent dividers>
            <Typography variant="body2" color="text.primary" gutterBottom>
              La cuenta de correo institucional con la que acaba de autenticarse no se encuentra registrada en el sistema.
            </Typography>
            
            <Box 
              sx={{ 
                bgcolor: '#fef2f2', 
                p: 2, 
                borderRadius: 2, 
                my: 2, 
                border: '1px solid #fee2e2' 
              }}
            >
              <Typography variant="caption" display="block" color="#b91c1c" fontWeight="bold">
                Usuario Identificado:
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                {user?.email}
              </Typography>
            </Box>

            <Typography variant="caption" color="text.secondary" display="block">
              Si usted pertenece al cuerpo de Abogados o personal Administrativo de IIRESODH, por favor solicite a la dirección o a un administrador del sistema que pre-autorice su cuenta de correo electrónico.
            </Typography>
          </DialogContent>

          <DialogActions sx={{ p: 2 }}>
            <Button
              fullWidth
              variant="contained"
              color="error"
              onClick={async () => {
                await logout();
                setOpenUnauthorizedModal(false);
              }}
              sx={{ 
                textTransform: 'none', 
                fontWeight: 'bold',
                borderRadius: 2
              }}
            >
              Entendido y Volver al Login
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // =====================================================================================
  // RENDERIZADO SEGURO DE LA APLICACIÓN
  // =====================================================================================
  let vistaSegura = view;
  if (vistaSegura === 'usuarios' && userRole !== 'Superadmin' && userRole !== 'Admin') {
    vistaSegura = 'casos';
  }
  if (vistaSegura === 'logs' && userRole !== 'Superadmin') {
    vistaSegura = 'casos';
  }

  return (
    <Layout currentView={vistaSegura === 'detalle_caso' ? 'casos' : vistaSegura} setView={setView} userRole={userRole}>
      {vistaSegura === 'casos' && (
        <Casos onSelectCaso={handleSelectCaso} userRole={userRole} currentUserEmail={user.email} />
      )}

      {vistaSegura === 'detalle_caso' && casoSeleccionado && (
        <DetalleCaso caso={casoSeleccionado} onVolver={handleVolverCasos} currentUserEmail={user.email} userRole={userRole} />
      )}

      {vistaSegura === 'usuarios' && (
        <UsuariosAutorizados currentUserEmail={user.email} userRole={userRole} />
      )}

      {vistaSegura === 'logs' && (
        <LogsAuditoria currentUserEmail={user.email} userRole={userRole} />
      )}
    </Layout>
  );
}

export default App;