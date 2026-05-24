import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  IconButton, 
  Chip, 
  CircularProgress, 
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem
} from '@mui/material';
import { FolderPlus, Eye, AlertTriangle } from 'lucide-react';

export default function Casos({ onSelectCaso, userRole, currentUserEmail }) {
  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estados para Modal de Nuevo Caso
  const [openModal, setOpenModal] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoNumero, setNuevoNumero] = useState('');
  const [nuevoMateria, setNuevoMateria] = useState('');

  const fetchCasos = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'casos'), orderBy('numeroExpediente', 'asc'));
      const snapshot = await getDocs(q);
      setCasos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      setError('Error de comunicación: No se pudo conectar con el servidor de expedientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCasos();
  }, []);

  const handleCrearCaso = async (e) => {
    e.preventDefault();
    if (!nuevoNombre || !nuevoNumero || !nuevoMateria) return;

    try {
      await addDoc(collection(db, 'casos'), {
        nombreCaso: nuevoNombre,
        numeroExpediente: nuevoNumero,
        materia: nuevoMateria,
        creadoPor: currentUserEmail,
        fechaCreacion: serverTimestamp(),
        plazos: [] // Inicializador inmutable para el control de términos fatales
      });

      // Registro transaccional en la auditoría interna
      await addDoc(collection(db, 'logs_auditoria'), {
        usuario: currentUserEmail,
        accion: 'CREAR_CASO',
        detalles: `Creación del expediente de litigio número: ${nuevoNumero}`,
        fecha: serverTimestamp()
      });

      setNuevoNombre('');
      setNuevoNumero('');
      setNuevoMateria('');
      setOpenModal(false);
      fetchCasos();
    } catch (err) {
      setError('Acceso denegado: No posee autorizaciones de escritura en el servidor legal.');
    }
  };

  // =====================================================================================
  // MOTOR DEL SEMÁFORO AUTOMATIZADO: Evalúa los términos abiertos más críticos
  // =====================================================================================
  const calcularSemaforoDePlazos = (plazos = []) => {
    const plazosActivos = plazos.filter(p => !p.completado);
    if (plazosActivos.length === 0) {
      return { label: 'Sin plazos activos', color: 'default', bcolor: '#e2e8f0', textColor: '#64748b', anim: false };
    }

    const fechasEnMilisegundos = plazosActivos.map(p => new Date(p.fechaFatal + 'T00:00:00').getTime());
    const fechaMasProximaMs = Math.min(...fechasEnMilisegundos);
    
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    
    const fechaFatal = new Date(fechaMasProximaMs);
    fechaFatal.setHours(0,0,0,0);

    const diferenciaTiempo = fechaFatal.getTime() - hoy.getTime();
    const diasRestantes = Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24));

    if (diasRestantes < 0) {
      return { label: `Vencido (${Math.abs(diasRestantes)} d)`, color: 'error', bcolor: '#fef2f2', textColor: '#b91c1c', anim: true };
    } else if (diasRestantes <= 2) {
      return { label: `CRÍTICO (${diasRestantes} d)`, color: 'error', bcolor: '#fef2f2', textColor: '#b91c1c', anim: true };
    } else if (diasRestantes <= 5) {
      return { label: `Advertencia (${diasRestantes} d)`, color: 'warning', bcolor: '#fffbeb', textColor: '#b45309', anim: false };
    } else {
      return { label: `${diasRestantes} días libres`, color: 'success', bcolor: '#f0fdf4', textColor: '#15803d', anim: false };
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" color="text.primary">
            Control de Expedientes Activos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Módulo general de litigios jurídicos de la firma institucional.
          </Typography>
        </Box>
        {(userRole === 'Superadmin' || userRole === 'Admin') && (
          <Button
            variant="contained"
            startIcon={<FolderPlus size={18} />}
            onClick={() => setOpenModal(true)}
            sx={{ bgcolor: '#1a365d', textTransform: 'none', fontWeight: 'bold', borderRadius: 2 }}
          >
            Nuevo Expediente
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : casos.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>No existen expedientes de litigio registrados en el servidor.</Alert>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#1a365d' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>No. Expediente</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Nombre del Litigio</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Materia Jurídica</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Estatus de Plazos (Fechas Fatales)</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {casos.map((caso) => {
                const semaforo = calcularSemaforoDePlazos(caso.plazos);
                return (
                  <TableRow key={caso.id} hover>
                    <TableCell sx={{ fontWeight: 'bold', color: '#1a365d' }}>{caso.numeroExpediente}</TableCell>
                    <TableCell sx={{ fontWeight: 'medium' }}>{caso.nombreCaso}</TableCell>
                    <TableCell>
                      <Chip label={caso.materia} size="small" sx={{ fontWeight: 'medium', bgcolor: '#f1f5f9' }} />
                    </TableCell>
                    <TableCell>
                      <Box 
                        sx={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: 1,
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 2,
                          bgcolor: semaforo.bcolor,
                          border: `1px solid ${semaforo.color === 'default' ? '#e2e8f0' : 'transparent'}`,
                          animation: semaforo.anim ? 'pulse 1.5s infinite alternate' : 'none',
                          '@keyframes pulse': { '0%': { opacity: 0.6 }, '100%': { opacity: 1 } }
                        }}
                      >
                        {semaforo.color === 'error' && <AlertTriangle size={14} color="#b91c1c" />}
                        <Typography variant="caption" fontWeight="bold" color={semaforo.textColor}>
                          {semaforo.label}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <IconButton size="small" color="primary" title="Abrir Expediente" onClick={() => onSelectCaso(caso)}>
                        <Eye size={18} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* MODAL INSTITUCIONAL PARA NUEVO EXPEDIENTE */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="xs">
        <form onSubmit={handleCrearCaso}>
          <DialogTitle sx={{ fontWeight: 'bold', color: '#1a365d' }}>Registrar Litigio</DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Número de Expediente / Carátula"
              variant="outlined"
              fullWidth
              required
              value={nuevoNumero}
              onChange={(e) => setNuevoNumero(e.target.value)}
            />
            <TextField
              label="Nombre de las Partes (Actor vs Demandado)"
              variant="outlined"
              fullWidth
              required
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
            />
            <TextField
              select
              label="Materia Jurídica"
              variant="outlined"
              fullWidth
              required
              value={nuevoMateria}
              onChange={(e) => setNuevoMateria(e.target.value)}
            >
              <MenuItem value="Constitucional / Amparo">Constitucional / Amparo</MenuItem>
              <MenuItem value="Derechos Humanos Int.">Derechos Humanos Int.</MenuItem>
              <MenuItem value="Contencioso Administrativo">Contencioso Administrativo</MenuItem>
              <MenuItem value="Civil / Mercantil">Civil / Mercantil</MenuItem>
              <MenuItem value="Laboral / Sindical">Laboral / Sindical</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
            <Button onClick={() => setOpenModal(false)} color="inherit" sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#1a365d', textTransform: 'none', fontWeight: 'bold' }}>Guardar Caso</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}