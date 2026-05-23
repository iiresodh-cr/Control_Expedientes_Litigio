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
  const { user } = useAuth();
  const [view, setView] = useState('casos'); 
  const [casoSeleccionado, setCasoSeleccionado] = useState(null);
  
  const [userRole, setUserRole] = useState('Abogado/a'); 
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    const resolverRolYPermisos = async () => {
      if (!user) {
        setLoadingRole(false);
        return;
      }

      // =====================================================================================
      // CONTROL DE ENTRADA: Forzar reinicio inmediato a la página de Casos para todo rol
      // =====================================================================================
      setView('casos');
      setCasoSeleccionado(null);

      const emailLimpio = user.email.toLowerCase();

      // REGLA ROOT: Cuenta Superadmin Hardcoded inviolable
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
        } else {
          // Si está autenticado en Google pero no pre-autorizado en la whitelist, hereda rol restrictivo
          setUserRole('Abogado/a');
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

  // =====================================================================================
  // CAPA 1: GUARDIA DE NAVEGACIÓN ACTIVA (Expulsa usuarios no autorizados de vistas críticas)
  // =====================================================================================
  useEffect(() => {
    if (!loadingRole) {
      // Si cae en usuarios y no es Admin/Superadmin, forzar redirección a casos
      if (view === 'usuarios' && userRole !== 'Superadmin' && userRole !== 'Admin') {
        setView('casos');
      }
      // Si cae en logs y no es el Superadmin root, forzar redirección a casos
      if (view === 'logs' && userRole !== 'Superadmin') {
        setView('casos');
      }
    }
  }, [view, userRole, loadingRole]);

  if (!user) {
    return <Login />;
  }

  if (loadingRole) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const handleSelectCaso = (caso) => {
    setView('detalle_caso');
    setCasoSeleccionado(caso);
  };

  const handleVolverCasos = () => {
    setView('casos');
    setCasoSeleccionado(null);
  };

  // =====================================================================================
  // CAPA 2: SANITIZACIÓN DEL RENDER (Intercepta e impide renderizado ilegal)
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