import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { CircularProgress, Box } from '@mui/material';

const AuthContext = createContext();

// Dominios institucionales autorizados
const ALLOWED_DOMAINS = ['iiresodh.org', 'sipdh.com'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Iniciar sesión tradicional (Email/Password)
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // 2. Iniciar sesión con Google Workspace + Filtro de Dominio
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    // Fuerza a Google a mostrar el selector de cuentas siempre
    provider.setCustomParameters({ prompt: 'select_account' });
    
    const result = await signInWithPopup(auth, provider);
    const email = result.user.email || '';
    const domain = email.split('@')[1];

    // Si el dominio NO está en la lista permitida, lo expulsamos inmediatamente
    if (!ALLOWED_DOMAINS.includes(domain)) {
      await signOut(auth);
      throw new Error('auth/domain-not-allowed');
    }

    return result;
  };

  // 3. Cerrar sesión
  const logout = () => {
    return signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}