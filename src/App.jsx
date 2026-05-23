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
import { Typography, Paper, Box, CircularProgress } from '@mui/material';

function App() {
  const { user, logout } = useAuth();
  const [view, setView] = useState('casos'); 
  const [casoSeleccionado, setCasoSeleccionado] = useState(null);
  
  const [userRole, setUserRole] = useState('Abogado/a'); 
  const [loadingRole, setLoadingRole] = useState(true);
  
  // NUEVO ESTADO: Almacena de forma segura los mensajes de rechazo perimetral de la whitelist
  const [institutionalError, setInstitutionalError] = useState('');

  // Declaración temprana de funciones para evitar problemas de alcance en compilación de producción
  const handleSelectCaso = (caso) => {
    setView('detalle_caso');
    setCasoSeleccionado(caso);
  };

  const handleVolverCasos = () => {
    setView('casos');
    setCasoSeleccionado(null);
  };

  useEffect(() => {
    const resolverRolYPermisos = async () => {
      if (!user) {
        setLoadingRole(false);
        return;
      }

      // Control preventivo: Limpiar expedientes activos ante cambios de sesión
      setView('casos');
      setCasoSeleccionado(null);

      const emailLimpio = user.email.toLowerCase();

      // REGLA ROOT: Cuenta Superadmin Hardcoded inviolable
      if (emailLimpio === 'webmaster@iiresodh.org') {
        setUserRole('Superadmin');
        setInstitutionalError('');
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
          setInstitutionalError('');
        } else {
          // =====================================================================================
          // INTERCEPCIÓN PERIMETRAL: El usuario no figura en la Whitelist institucional.
          // Forzamos el deslogueo en Firebase y mandamos el mensaje directo a la vista de Login.
          // =====================================================================================
          await logout();
          setInstitutionalError(`Acceso Denegado: La cuenta de correo ${user.email} no se encuentra registrada ni autorizada en el sistema.`);
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

  // GUARDIA DE NAVEGACIÓN ACTIVA: Protege las URLs internas de accesos residuales
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

  // SALIDA 1: Si no hay usuario activo, renderiza la pantalla de Login pasándole los errores institucionales
  if (!user) {
    return (
      <Login 
        institutionalError={institutionalError} 
        setInstitutionalError={setInstitutionalError} 
      />
    );
  }

  // SALIDA 2: Pantalla de transición mientras Firestore resuelve las credenciales del servidor
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

  // SANITIZACIÓN FINAL DEL COMPONENTE DE RENDERIZADO
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