import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Box, Drawer, AppBar, Toolbar, List, Typography, 
  ListItem, ListItemButton, ListItemIcon, ListItemText, 
  IconButton, Avatar 
} from '@mui/material';
import { Scale, Briefcase, ShieldAlert, LogOut, UserCheck } from 'lucide-react';

const drawerWidth = 260;

export default function Layout({ children, currentView, setView, userRole }) {
  const { user, logout } = useAuth();

  const menuItems = [
    { text: 'Casos y Litigios', icon: <Briefcase size={20} />, id: 'casos' },
  ];

  if (userRole === 'Superadmin' || userRole === 'Admin') {
    menuItems.push({ text: 'Control de Usuarios', icon: <UserCheck size={20} />, id: 'usuarios' });
  }

  if (userRole === 'Superadmin') {
    menuItems.push({ text: 'Logs de Auditoría', icon: <ShieldAlert size={20} />, id: 'logs' });
  }

  return (
    <Box sx={{ display: 'flex' }}>
      {/* BARRA SUPERIOR */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: '#1a365d', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Scale size={24} color="#c5a880" />
            {/* MODIFICACIÓN: Identidad corporativa y nombre del sistema actualizado */}
            <Typography variant="h6" fontWeight="bold" noWrap component="div" sx={{ letterSpacing: 0.5 }}>
              Control de Expedientes de Litigio
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" fontWeight="medium" color="white">
                {user?.displayName || 'Abogado Staff'}
              </Typography>
              <Typography variant="caption" color="rgba(255,255,255,0.6)" display="block">
                {user?.email} ({userRole})
              </Typography>
            </Box>
            
            {/* MODIFICACIÓN: Inyección de photoURL de Google con fallback automático a letra inicial si no existe */}
            <Avatar 
              src={user?.photoURL} 
              sx={{ bgcolor: '#c5a880', width: 36, height: 36, fontSize: '0.9rem', fontWeight: 'bold' }}
            >
              {user?.email?.charAt(0).toUpperCase()}
            </Avatar>
            
            <IconButton color="inherit" onClick={logout} title="Cerrar Sesión" sx={{ ml: 1 }}>
              <LogOut size={20} color="#ff8a80" />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* BARRA LATERAL (SIDEBAR) */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', borderRight: '1px solid #e2e8f0', bgcolor: '#ffffff' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', mt: 2 }}>
          <List sx={{ px: 1.5 }}>
            {menuItems.map((item) => (
              <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton 
                  onClick={() => setView(item.id)}
                  selected={currentView === item.id}
                  sx={{
                    borderRadius: 2,
                    color: currentView === item.id ? 'primary.main' : 'text.secondary',
                    bgcolor: currentView === item.id ? 'rgba(26, 54, 93, 0.04)' : 'transparent',
                    '&.Mui-selected': {
                      bgcolor: 'rgba(26, 54, 93, 0.08)',
                      color: 'primary.main',
                      fontWeight: 'bold',
                      '&:hover': { bgcolor: 'rgba(26, 54, 93, 0.12)' }
                    }
                  }}
                >
                  <ListItemIcon sx={{ color: currentView === item.id ? 'primary.main' : 'text.disabled', minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: currentView === item.id ? 600 : 500 }} 
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* CONTENIDO PRINCIPAL */}
      <Box component="main" sx={{ flexGrow: 1, p: 4, bgcolor: '#f8fafc', minHeight: '100vh' }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}