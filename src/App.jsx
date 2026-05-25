import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { db } from './config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Typography, Paper, Box, CircularProgress } from '@mui/material';

// Vistas Generales de la Intranet
import Login from './views/Login';
import Layout from './components/Layout';
import HubIntranet from './views/HubIntranet'; // 🚀 AGREGADO: Importar el nuevo menú de módulos
import UsuariosAutorizados from './views/UsuariosAutorizados';
import LogsAuditoria from './views/LogsAuditoria';

// Vistas del Módulo de Litigio (🚀 CORREGIDO: Apuntando a la nueva subcarpeta /litigio/)
import Casos from './views/litigio/Casos';
import DetalleCaso from './views/litigio/DetalleCaso';

// FILTRO DE CONSOLA: Mantiene el perímetro limpio bloqueando trazas automáticas de persistencia del SDK
const originalConsoleError = console.error;

console.error = (...args) => {
  const cadenaError = args.map((item) => {
    if (item instanceof Error) {
      return item.message + ' ' + item.stack;
    }
    if (typeof item === 'object') {
      try {
        return JSON.stringify(item);
      } catch (e) {
        return '';
      }
    }
    return String(item);
  }).join(' ');

  if (
    cadenaError.includes('FirebaseError') || 
    cadenaError.includes('permissions') || 
    cadenaError.includes('insufficient')
  ) {
    return; 
  }

  originalConsoleError(...args);
};

function App() {
  const { user, logout } = useAuth();
  
  // 🚀 CORREGIDO: El estado inicial ahora arranca en el 'hub' de la intranet, no en 'casos'
  const [view, setView] = useState('hub'); 
  const [casoSeleccionado, setCasoSeleccionado] = useState(null);
  
  const [userRole, setUserRole] = useState('Abogado/a'); 
  const [loadingRole, setLoadingRole] = useState(true);
  const [institutionalError, setInstitutionalError] = useState('');

  // Funciones de alcance global
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

      // 🚀 CORREGIDO: Al detectar inicio de sesión, mandamos al usuario directo al Hub principal
      setView('hub');
      setCasoSeleccionado(null);

      const emailLimpio = user.email.toLowerCase();

      if (emailLimpio === 'webmaster@iiresodh.org') {
        setUserRole('Superadmin');
        setInstitutionalError('');
        setLoadingRole(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'usuarios_autorizados', emailLimpio);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userDoc = userDocSnap.data();
          setUserRole(userDoc.rol || 'Abogado/a');
          setInstitutionalError('');
        } else {
          await logout();
          setInstitutionalError('Acceso denegado: No tiene acceso a esta plataforma.');
        }
      } catch (err) {
        await logout();
        setUserRole('Abogado/a');
        setInstitutionalError('Acceso denegado: No tiene acceso a esta plataforma.');
      } finally {
        setLoadingRole(false);
      }
    };

    setLoadingRole(true);
    resolverRolYPermisos();
  }, [user]);

  // Protección de seguridad perimetral para vistas administrativas
  useEffect(() => {
    if (!loadingRole) {
      // 🚀 CORREGIDO: Si hay un intento de intrusión o desajuste de rol, redirige al 'hub' global
      if (view === 'usuarios' && userRole !== 'Superadmin' && userRole !== 'Admin') {
        setView('hub');
      }
      if (view === 'logs' && userRole !== 'Superadmin') {
        setView('hub');
      }
    }
  }, [view, userRole, loadingRole]);

  if (!user || institutionalError) {
    return (
      <Login 
        institutionalError={institutionalError} 
        setInstitutionalError={setInstitutionalError} 
      />
    );
  }

  if (loadingRole) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  let vistaSegura = view;
  if (vistaSegura === 'usuarios' && userRole !== 'Superadmin' && userRole !== 'Admin') {
    vistaSegura = 'hub';
  }
  if (vistaSegura === 'logs' && userRole !== 'Superadmin') {
    vistaSegura = 'hub';
  }

  return (
    /* 🚀 CORREGIDO: Pasamos "vistaSegura" limpia al Layout para que pueda evaluar "currentView === 'hub'" y esconder la Sidebar */
    <Layout currentView={vistaSegura} setView={setView} userRole={userRole}>
      
      {/* 🚀 AGREGADO: Renderizado de la vista de bienvenida e intercambio de módulos */}
      {vistaSegura === 'hub' && (
        <HubIntranet setView={setView} userRole={userRole} />
      )}

      {/* Módulo de Litigios */}
      {vistaSegura === 'casos' && (
        <Casos onSelectCaso={handleSelectCaso} userRole={userRole} currentUserEmail={user.email} />
      )}

      {vistaSegura === 'detalle_caso' && casoSeleccionado && (
        <DetalleCaso caso={casoSeleccionado} onVolver={handleVolverCasos} currentUserEmail={user.email} userRole={userRole} />
      )}

      {/* Módulos de Administración Global */}
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