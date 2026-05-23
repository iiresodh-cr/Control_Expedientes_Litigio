import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, setDoc, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, TextField, Dialog, 
  DialogTitle, DialogContent, DialogActions, FormControl, 
  InputLabel, Select, MenuItem, Chip, IconButton, CircularProgress, Alert 
} from '@mui/material';
import { Plus, Trash2, UserCheck } from 'lucide-react';
import { registrarLogAuditoria } from '../utils/auditLogger';

export default function UsuariosAutorizados({ currentUserEmail, userRole }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openModal, setOpenModal] = useState(false);

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [rol, setRol] = useState('Abogado/a');

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'usuarios_autorizados'), orderBy('nombre', 'asc'));
      const snapshot = await getDocs(q);
      setUsuarios(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { setError('Error al cargar la lista.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsuarios(); }, []);

  const handleAutorizar = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    const emailLimpio = correo.trim().toLowerCase();

    if (!nombre.trim() || !emailLimpio) return;
    if (rol === 'Admin' && userRole !== 'Superadmin') {
      setError('Operación denegada. Solo Superadmin otorga rangos de Administrador.');
      return;
    }

    try {
      await setDoc(doc(db, 'usuarios_autorizados', emailLimpio), {
        nombre: nombre.trim(), correo: emailLimpio, rol: rol, autorizado_por: currentUserEmail, fecha_autorizacion: new Date().toISOString()
      });

      // REGISTRO AUDITORÍA ENTERPRISE
      await registrarLogAuditoria(currentUserEmail, 'Autorización de Usuario', `Se habilitó acceso perimetral al correo [${emailLimpio}] con privilegios de: ${rol}`);

      setNombre(''); setCorreo(''); setRol('Abogado/a'); setOpenModal(false);
      setSuccess('Usuario pre-autorizado con éxito.');
      fetchUsuarios();
    } catch (err) { setError('Error en Firestore.'); }
  };

  const handleRevocar = async (id) => {
    if (id === 'webmaster@iiresodh.org') return;
    if (!window.confirm(`¿Desea revocar el acceso a ${id}?`)) return;
    setError(''); setSuccess('');

    try {
      await deleteDoc(doc(db, 'usuarios_autorizados', id));

      // REGISTRO AUDITORÍA ENTERPRISE
      await registrarLogAuditoria(currentUserEmail, 'Revocación de Usuario', `Se eliminaron e invalidaron de la lista blanca las credenciales de: [${id}]`);

      setSuccess('Acceso revocado.');
      fetchUsuarios();
    } catch (err) { setError('Error al revocar.'); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box><Typography variant="h4" fontWeight="bold">Control de Usuarios Autorizados</Typography></Box>
        <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => setOpenModal(true)}>Autorizar Personal</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      {loading ? <CircularProgress /> : (
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
                  <TableCell><Chip label={u.rol} size="small" color={u.rol === 'Admin' ? 'warning' : 'primary'} /></TableCell>
                  <TableCell>{u.autorizado_por}</TableCell>
                  <TableCell><IconButton color="error" onClick={() => handleRevocar(u.id)}><Trash2 size={16} /></IconButton></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle fontWeight="bold">Autorizar Nuevo Usuario</DialogTitle>
        <Box component="form" onSubmit={handleAutorizar}>
          <DialogContent dividers>
            <TextField label="Nombre del Funcionario" required fullWidth value={nombre} onChange={(e) => setNombre(e.target.value)} sx={{ mb: 2.5 }} />
            <TextField label="Correo Electrónico Institucional" type="email" required fullWidth value={correo} onChange={(e) => setCorreo(e.target.value)} sx={{ mb: 2.5 }} />
            <FormControl fullWidth><InputLabel>Rol y Permisos</InputLabel><Select value={rol} label="Rol y Permisos" onChange={(e) => setRol(e.target.value)}>{userRole === 'Superadmin' && <MenuItem value="Admin">Administrador</MenuItem>}<MenuItem value="Abogado/a">Abogado/a</MenuItem><MenuItem value="Administrativo">Administrativo</MenuItem></Select></FormControl>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}><Button onClick={() => setOpenModal(false)}>Cancelar</Button><Button type="submit" variant="contained">Otorgar Acceso</Button></DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}