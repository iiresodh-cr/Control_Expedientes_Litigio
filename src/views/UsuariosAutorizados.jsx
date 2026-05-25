import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, setDoc, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, TextField, Dialog, 
  DialogTitle, DialogContent, DialogActions, FormControl, 
  InputLabel, Select, MenuItem, Chip, IconButton, CircularProgress
} from '@mui/material';
import { Plus, Trash2, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { registrarLogAuditoria } from '../utils/auditLogger';

export default function UsuariosAutorizados({ currentUserEmail, userRole }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);

  // Estados para el formulario de inscripción
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [rol, setRol] = useState('Abogado/a');

  // NUEVOS ESTADOS: Control inteligente de Modales de Confirmación y Feedback
  const [openConfirm, setOpenConfirm] = useState(false);
  const [usuarioARevocar, setUsuarioARevocar] = useState('');
  const [feedback, setFeedback] = useState({
    open: false,
    title: '',
    message: '',
    severity: 'success' // 'success' | 'error' | 'warning'
  });

  // Función interna para disparar notificaciones modales fluidas
  const lanzarNotificacionModal = (title, message, severity = 'success') => {
    setFeedback({ open: true, title, message, severity });
  };

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'usuarios_autorizados'), orderBy('nombre', 'asc'));
      const snapshot = await getDocs(q);
      setUsuarios(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { 
      lanzarNotificacionModal('Error de Conexión', 'No se pudo compilar la lista blanca de usuarios.', 'error'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchUsuarios(); 
  }, []);

  const handleAutorizar = async (e) => {
    e.preventDefault();
    const emailLimpio = correo.trim().toLowerCase();

    if (!nombre.trim() || !emailLimpio) return;
    
    // Validación de privilegios perimetrales mostrada vía modal
    if (rol === 'Admin' && userRole !== 'Superadmin') {
      lanzarNotificacionModal(
        'Operación Denegada', 
        'Privilegios insuficientes. Únicamente el Superadmin de la firma puede otorgar rangos de Administrador.', 
        'warning'
      );
      return;
    }

    try {
      await setDoc(doc(db, 'usuarios_autorizados', emailLimpio), {
        nombre: nombre.trim(), 
        correo: emailLimpio, 
        rol: rol, 
        autorizado_por: currentUserEmail, 
        fecha_autorizacion: new Date().toISOString()
      });

      await registrarLogAuditoria(
        currentUserEmail, 
        'Autorización de Usuario', 
        `Se habilitó acceso perimetral al correo [${emailLimpio}] con privilegios de: ${rol}`
      );

      setNombre(''); 
      setCorreo(''); 
      setRol('Abogado/a'); 
      setOpenModal(false);
      
      lanzarNotificacionModal('Registro Exitoso', `El usuario [${emailLimpio}] ha sido pre-autorizado en la plataforma de manera correcta.`, 'success');
      fetchUsuarios();
    } catch (err) { 
      lanzarNotificacionModal('Error en Firestore', 'El servidor rechazó la escritura de credenciales autorizadas.', 'error'); 
    }
  };

  // El botón de revocar ahora abre el modal controlado en lugar de usar confirm nativo
  const handlePreRevocar = (id) => {
    if (id === 'webmaster@iiresodh.org') return;
    setUsuarioARevocar(id);
    setOpenConfirm(true);
  };

  const ejecutarRevocacion = async () => {
    setOpenConfirm(false);
    const idTarget = usuarioARevocar;
    
    try {
      await deleteDoc(doc(db, 'usuarios_autorizados', idTarget));

      await registrarLogAuditoria(
        currentUserEmail, 
        'Revocación de Usuario', 
        `Se eliminaron e invalidaron de la lista blanca las credenciales de: [${idTarget}]`
      );

      lanzarNotificacionModal('Acceso Revocado', `Las credenciales del usuario [${idTarget}] han sido eliminadas e invalidadas del perímetro con éxito.`, 'success');
      fetchUsuarios();
    } catch (err) { 
      lanzarNotificacionModal('Error del Servidor', 'Ocurrió un error inesperado al intentar suprimir el usuario.', 'error'); 
    } finally {
      setUsuarioARevocar('');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box><Typography variant="h4" fontWeight="bold">Control de Usuarios Autorizados</Typography></Box>
        <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => setOpenModal(true)} sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 'bold' }}>
          Autorizar Personal
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Nombre Completo</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>ID Documento (Correo)</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Rol Asignado</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Autorizado Por</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usuarios.filter(u => u.id !== 'webmaster@iiresodh.org').map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell sx={{ fontWeight: 'medium' }}>{u.nombre}</TableCell>
                  <TableCell><code>{u.id}</code></TableCell>
                  <TableCell><Chip label={u.rol} size="small" color={u.rol === 'Admin' ? 'warning' : 'primary'} sx={{ fontWeight: 'bold' }} /></TableCell>
                  <TableCell>{u.autorizado_por}</TableCell>
                  <TableCell>
                    <IconButton color="error" onClick={() => handlePreRevocar(u.id)} sx={{ border: '1px solid #fee2e2', bgcolor: '#fef2f2', p: 1 }}>
                      <Trash2 size={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* MODAL 1: FORMULARIO DE REGISTRO */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle fontWeight="bold">Autorizar Nuevo Usuario</DialogTitle>
        <Box component="form" onSubmit={handleAutorizar}>
          <DialogContent dividers>
            <TextField label="Nombre del Funcionario" required fullWidth value={nombre} onChange={(e) => setNombre(e.target.value)} sx={{ mb: 2.5 }} />
            <TextField label="Correo Electrónico Institucional" type="email" required fullWidth value={correo} onChange={(e) => setCorreo(e.target.value)} sx={{ mb: 2.5 }} />
            <FormControl fullWidth>
              <InputLabel>Rol y Permisos</InputLabel>
              <Select value={rol} label="Rol y Permisos" onChange={(e) => setRol(e.target.value)}>
                {userRole === 'Superadmin' && <MenuItem value="Admin">Administrador</MenuItem>}
                <MenuItem value="Abogado/a">Abogado/a</MenuItem>
                <MenuItem value="Administrativo">Administrativo</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setOpenModal(false)} color="inherit" sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button type="submit" variant="contained" sx={{ textTransform: 'none', fontWeight: 'bold' }}>Otorgar Acceso</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* MODAL 2: CONFIRMACIÓN CONTROLADA (REEMPLAZO DE WINDOW.CONFIRM) */}
      <Dialog open={openConfirm} onClose={() => setOpenConfirm(false)} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <ShieldAlert size={22} /> Revocar Acceso Perimetral
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.primary" sx={{ mt: 1 }}>
            ¿Está seguro de que desea retirar y desautorizar de forma permanente la cuenta institucional <strong>{usuarioARevocar}</strong> de la lista blanca del sistema?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setOpenConfirm(false)} color="inherit" sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button onClick={ejecutarRevocacion} variant="contained" color="error" sx={{ textTransform: 'none', fontWeight: 'bold' }}>
            Revocar Acceso
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL 3: FEEDBACK GENERAL DE OPERACIONES (REEMPLAZO DE ALERTS INVASIVOS) */}
      <Dialog open={feedback.open} onClose={() => setFeedback({ ...feedback, open: false })} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle fontWeight="bold" sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.25, 
          color: feedback.severity === 'success' ? 'success.main' : feedback.severity === 'error' ? 'error.main' : 'warning.main' 
        }}>
          {feedback.severity === 'success' && <CheckCircle2 size={22} />}
          {feedback.severity === 'error' && <AlertCircle size={22} />}
          {feedback.severity === 'warning' && <ShieldAlert size={22} />}
          {feedback.title}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {feedback.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setFeedback({ ...feedback, open: false })} variant="outlined" color="inherit" sx={{ textTransform: 'none', fontWeight: 'bold', minWidth: 80 }}>
            Entendido
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}