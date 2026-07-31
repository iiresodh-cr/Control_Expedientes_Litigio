import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText, 
  Avatar, 
  Divider, 
  TextField, 
  IconButton, 
  Button,
  AppBar,
  Toolbar,
  Alert,
  AlertTitle
} from '@mui/material';
import { Send, Search, MoreVertical, Settings, ArrowLeft } from 'lucide-react';

export default function WhatsappInterface({ onVolver }) {
  const [selectedChat, setSelectedChat] = useState(null);
  const [mensajeTexto, setMensajeTexto] = useState('');

  // Contactos de prueba
  const mockContacts = [
    { id: 1, name: '+506 8888 8888', lastMessage: 'Esperando conexión con la API...', time: '10:30', unread: 0 },
    { id: 2, name: 'Cliente Potencial', lastMessage: '¿Tienen oficinas en San José?', time: 'Ayer', unread: 1 }
  ];

  const handleSendMessage = () => {
    if (!mensajeTexto.trim()) return;
    // Aquí iría la lógica de envío mediante la API
    console.log("Enviando mensaje vía API:", mensajeTexto);
    setMensajeTexto('');
    // TODO: Integrar llamada a la API de WhatsApp Business
  };

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', bgcolor: '#f0f2f5', borderRadius: 2, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      
      {/* Alerta de Configuración Pendiente */}
      <Alert severity="warning" sx={{ borderRadius: 0, borderBottom: '1px solid #e2e8f0' }}>
        <AlertTitle>Configuración de API Pendiente</AlertTitle>
        La integración con WhatsApp Business API requiere configuración. Por favor, introduzca su <strong>Token de Acceso</strong>, <strong>ID del Número de Teléfono</strong> y configure los Webhooks en el panel de desarrolladores de Meta para activar la mensajería en tiempo real.
      </Alert>

      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Sidebar de Chats */}
        <Box sx={{ width: { xs: '100%', md: '350px' }, borderRight: '1px solid #e2e8f0', bgcolor: 'white', display: { xs: selectedChat ? 'none' : 'flex', md: 'flex' }, flexDirection: 'column' }}>
          {/* Header del Sidebar */}
          <Box sx={{ bgcolor: '#f0f2f5', p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={onVolver} size="small" sx={{ mr: 1 }}>
                <ArrowLeft size={20} />
              </IconButton>
              <Avatar sx={{ width: 40, height: 40, bgcolor: '#25D366' }}>W</Avatar>
              <Typography variant="subtitle1" fontWeight="bold">Chats (API)</Typography>
            </Box>
            <Box>
              <IconButton size="small"><Settings size={20} /></IconButton>
              <IconButton size="small"><MoreVertical size={20} /></IconButton>
            </Box>
          </Box>
          
          {/* Búsqueda */}
          <Box sx={{ p: 1.5, borderBottom: '1px solid #e2e8f0', bgcolor: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#f0f2f5', borderRadius: 2, px: 2, py: 0.5 }}>
              <Search size={18} color="#8696a0" />
              <TextField 
                placeholder="Busca un chat o inicia uno nuevo"
                variant="standard"
                fullWidth
                InputProps={{ disableUnderline: true, sx: { ml: 1, fontSize: '14px' } }}
              />
            </Box>
          </Box>

          {/* Lista de Chats */}
          <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }}>
            {mockContacts.map((contact, index) => (
              <React.Fragment key={contact.id}>
                <ListItem 
                  button 
                  onClick={() => setSelectedChat(contact)}
                  sx={{ 
                    bgcolor: selectedChat?.id === contact.id ? '#f0f2f5' : 'transparent',
                    '&:hover': { bgcolor: '#f5f6f6' }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: '#cfe9e2', color: '#1a365d' }}>{contact.name.charAt(0)}</Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={<Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="subtitle2" noWrap>{contact.name}</Typography><Typography variant="caption" color="text.secondary">{contact.time}</Typography></Box>} 
                    secondary={<Typography variant="body2" color="text.secondary" noWrap>{contact.lastMessage}</Typography>} 
                  />
                </ListItem>
                {index < mockContacts.length - 1 && <Divider component="li" sx={{ ml: 9 }} />}
              </React.Fragment>
            ))}
          </List>
        </Box>

        {/* Área de Chat Principal */}
        <Box sx={{ flexGrow: 1, display: { xs: selectedChat ? 'flex' : 'none', md: 'flex' }, flexDirection: 'column', bgcolor: '#efeae2', backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundRepeat: 'repeat', position: 'relative' }}>
          {selectedChat ? (
            <>
              {/* Header del Chat */}
              <Box sx={{ bgcolor: '#f0f2f5', p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <IconButton onClick={() => setSelectedChat(null)} sx={{ display: { md: 'none' } }}>
                    <ArrowLeft size={20} />
                  </IconButton>
                  <Avatar sx={{ bgcolor: '#cfe9e2', color: '#1a365d' }}>{selectedChat.name.charAt(0)}</Avatar>
                  <Typography variant="subtitle1" fontWeight="medium">{selectedChat.name}</Typography>
                </Box>
                <Box>
                  <IconButton size="small"><Search size={20} /></IconButton>
                  <IconButton size="small"><MoreVertical size={20} /></IconButton>
                </Box>
              </Box>

              {/* Mensajes del Chat */}
              <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {/* Mensaje de prueba recibido */}
                <Box sx={{ alignSelf: 'flex-start', bgcolor: 'white', p: 1.5, borderRadius: 2, maxWidth: '70%', boxShadow: '0 1px 0.5px rgba(11,20,26,.13)' }}>
                  <Typography variant="body2">{selectedChat.lastMessage}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: 0.5, fontSize: '10px' }}>{selectedChat.time}</Typography>
                </Box>
              </Box>

              {/* Input de Mensaje */}
              <Box sx={{ bgcolor: '#f0f2f5', p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  fullWidth
                  placeholder="Escribe un mensaje"
                  variant="outlined"
                  size="small"
                  value={mensajeTexto}
                  onChange={(e) => setMensajeTexto(e.target.value)}
                  onKeyPress={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                  sx={{ bgcolor: 'white', borderRadius: 2, '& fieldset': { border: 'none' } }}
                />
                <IconButton 
                  color="primary" 
                  onClick={handleSendMessage}
                  disabled={!mensajeTexto.trim()}
                  sx={{ bgcolor: mensajeTexto.trim() ? '#25D366' : 'transparent', color: mensajeTexto.trim() ? 'white' : '#8696a0', '&:hover': { bgcolor: mensajeTexto.trim() ? '#20bd5a' : 'transparent' } }}
                >
                  <Send size={20} />
                </IconButton>
              </Box>
            </>
          ) : (
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 4, textAlign: 'center' }}>
              <Box sx={{ bgcolor: 'white', p: 3, borderRadius: '50%', mb: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Send size={48} color="#25D366" />
              </Box>
              <Typography variant="h5" color="text.secondary" fontWeight="light" gutterBottom>
                WhatsApp Business API
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400 }}>
                Selecciona un chat para comenzar a enviar mensajes o configura la integración en el panel de administrador.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
