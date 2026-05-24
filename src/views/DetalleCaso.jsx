import React, { useState, useEffect } from 'react';
import { db, storage } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  serverTimestamp, 
  doc, 
  deleteDoc, 
  query, 
  orderBy,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { 
  Box, 
  Button, 
  Typography, 
  Tabs, 
  Tab, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  TextField, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  IconButton, 
  Chip, 
  CircularProgress, 
  Alert, 
  Divider, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  LinearProgress, 
  List, 
  ListItem, 
  ListItemText 
} from '@mui/material';
import { 
  ArrowLeft, 
  Users, 
  FileText, 
  CreditCard, 
  Plus, 
  Eye, 
  Upload, 
  File, 
  Trash2,
  Clock,
  Calendar
} from 'lucide-react';
import FichaCliente from './FichaCliente';
import { registrarLogAuditoria } from '../utils/auditLogger';

const DOC_TYPES = [
  'Cédula de Identidad', 
  'DNI', 
  'Pasaporte', 
  'RUT', 
  'Cédula de Residencia', 
  'Otro'
];

const COUNTRIES = [
  { code: 'CR', name: 'Costa Rica', phone: '+506' },
  { code: 'US', name: 'Estados Unidos', phone: '+1' },
  { code: 'MX', name: 'México', phone: '+52' },
  { code: 'ES', name: 'España', phone: '+34' },
  { code: 'CO', name: 'Colombia', phone: '+57' },
  { code: 'AR', name: 'Argentina', phone: '+54' },
  { code: 'CL', name: 'Chile', phone: '+56' },
  { code: 'PE', name: 'Perú', phone: '+51' },
  { code: 'EC', name: 'Ecuador', phone: '+593' },
  { code: 'PA', name: 'Panamá', phone: '+507' },
  { code: 'SV', name: 'El Salvador', phone: '+503' },
  { code: 'GT', name: 'Guatemala', phone: '+502' },
  { code: 'HN', name: 'Honduras', phone: '+504' },
  { code: 'NI', name: 'Nicaragua', phone: '+505' },
  { code: 'VE', name: 'Venezuela', phone: '+58' },
  { code: 'UY', name: 'Uruguay', phone: '+598' },
  { code: 'PY', name: 'Paraguay', phone: '+595' },
  { code: 'BO', name: 'Bolivia', phone: '+591' },
  { code: 'CA', name: 'Canadá', phone: '+1' },
  { code: 'GB', name: 'Reino Unido', phone: '+44' },
  { code: 'FR', name: 'Francia', phone: '+33' },
  { code: 'DE', name: 'Alemania', phone: '+49' },
  { code: 'IT', name: 'Italia', phone: '+39' }
];

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function DetalleCaso({ caso, onVolver, currentUserEmail, userRole }) {
  const [activeTab, setActiveTab] = useState(0);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState(null);
  
  // Estados para documentos comunes compartidos
  const [docsComunes, setDocsComunes] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadProgressDoc, setUploadProgressDoc] = useState(0);

  // Estados del formulario del representado
  const [openModal, setOpenModal] = useState(false);
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [tipoIdentificacion, setTipoIdentificacion] = useState('Cédula de Identidad');
  const [identificacion, setIdentificacion] = useState('');
  const [correoPrincipal, setCorreoPrincipal] = useState('');
  const [codigoTelefonoPrincipal, setCodigoTelefonoPrincipal] = useState('+506');
  const [telefonoPrincipal, setTelefonoPrincipal] = useState('');
  const [pais, setPais] = useState('Costa Rica');
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');

  // Estados para control de plazos procesales fatales
  const [localPlazos, setLocalPlazos] = useState(caso.plazos || []);
  const [openPlazoModal, setOpenPlazoModal] = useState(false);
  const [descripcionPlazo, setDescripcionPlazo] = useState('');
  const [fechaFatalInput, setFechaFatalInput] = useState('');
  const [responsablePlazo, setResponsiblePlazo] = useState('');
  const [openCerrarModal, setOpenCerrarModal] = useState(false);
  const [plazoAActivar, setPlazoAActivar] = useState(null);
  
  // Estados de carga para el documento probatorio del plazo
  const [fileProbatorio, setFileProbatorio] = useState(null);
  const [uploadingPlazoDoc, setUploadingPlazoDoc] = useState(false);
  const [uploadProgressPlazoDoc, setUploadProgressPlazoDoc] = useState(0);

  const fetchClientes = async () => {
    setLoading(true);
    setError('');
    try {
      const clientesRef = collection(db, 'casos', caso.id, 'clientes');
      const snapshot = await getDocs(clientesRef);
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      lista.sort((a, b) => (a.apellidos || '').localeCompare(b.apellidos || ''));
      setClientes(lista);
    } catch (err) {
      console.error(err);
      setError('Error al cargar la lista de clientes.');
    } finally { 
      setLoading(false); 
    }
  };

  const fetchDocsComunes = async () => {
    setLoadingDocs(true);
    try {
      const docsRef = collection(db, 'casos', caso.id, 'documentos_comunes');
      const snapshot = await getDocs(query(docsRef, orderBy('fecha_subida', 'desc')));
      setDocsComunes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally { 
      setLoadingDocs(false); 
    }
  };

  useEffect(() => {
    setLocalPlazos(caso.plazos || []);
    fetchClientes();
    fetchDocsComunes();
  }, [caso.id, caso.plazos]);

  const handleCreateCliente = async (e) => {
    e.preventDefault();
    if (!nombres.trim() || !apellidos.trim() || !identificacion.trim()) return;

    try {
      const clientesRef = collection(db, 'casos', caso.id, 'clientes');
      await addDoc(clientesRef, {
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        tipo_identificacion: tipoIdentificacion,
        identificacion: identificacion.trim(),
        correo_principal: correoPrincipal.trim(),
        correo_secundario: '',
        codigo_telefono_principal: codigoTelefonoPrincipal,
        telefono_principal: telefonoPrincipal.trim(),
        codigo_telefono_secundario: '+506',
        telefono_secundario: '',
        pais: pais,
        direccion: direccion.trim(),
        notas: notas.trim(),
        estado_pago: 'Pendiente',
        stripe_customer_id: '',
        fecha_registro: serverTimestamp()
      });

      await registrarLogAuditoria(
        currentUserEmail, 
        'Registro de Cliente', 
        `Se inscribió al representado "${apellidos.trim()}, nombres.trim()" en el litigio [${caso.nombre}]`
      );

      setNombres('');
      setApellidos('');
      setIdentificacion('');
      setCorreoPrincipal('');
      setCodigoTelefonoPrincipal('+506');
      setTelefonoPrincipal('');
      setPais('Costa Rica');
      setDireccion('');
      setNotas('');
      setOpenModal(false);
      
      fetchClientes();
    } catch (err) {
      setError('No se pudo registrar al cliente.');
    }
  };

  const handleUploadDocComun = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingDoc(true);
    setUploadProgressDoc(0);
    setError('');

    const storagePath = `casos/${caso.id}/documentos_comunes/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snap) => {
        const progress = (snap.bytesTransferred / snap.totalBytes) * 100;
        setUploadProgressDoc(Math.round(progress));
      },
      (err) => { 
        setError('Error al subir documento común.'); 
        setUploadingDoc(false); 
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        await addDoc(collection(db, 'casos', caso.id, 'documentos_comunes'), {
          nombre: file.name,
          url: downloadURL,
          storage_path: storagePath,
          fecha_subida: new Date().toISOString()
        });

        await registrarLogAuditoria(
          currentUserEmail, 
          'Carga de Doc Común', 
          `Se subió el documento global "${file.name}" para el caso "${caso.nombre}"`
        );
        
        setUploadingDoc(false);
        fetchDocsComunes();
      }
    );
  };

  const handleDeleteDocComun = async (docId, storagePath) => {
    if (!window.confirm('¿Desea eliminar este documento global del caso?')) return;
    try {
      if (storagePath) {
        await deleteObject(ref(storage, storagePath));
      }
      await deleteDoc(doc(db, 'casos', caso.id, 'documentos_comunes', docId));

      await registrarLogAuditoria(
        currentUserEmail, 
        'Eliminación de Doc Común', 
        `Se borró el documento global ID: ${docId} del litigio [${caso.nombre}]`
      );

      fetchDocsComunes();
    } catch (err) { 
      setError('Error al suprimir el documento común.'); 
    }
  };

  const handleAgregarPlazo = async (e) => {
    e.preventDefault();
    if (!descripcionPlazo.trim() || !fechaFatalInput || !responsablePlazo.trim()) return;

    setError('');
    const nuevoPlazoObj = {
      id: 'plazo_' + Date.now(),
      descripcion: descripcionPlazo.trim(),
      fechaFatal: fechaFatalInput,
      responsable: responsablePlazo.trim(),
      completado: false,
      fechaPresentacion: '',
      documentoProbatorioNombre: '',
      documentoProbatorioUrl: '',
      storage_path: ''
    };

    try {
      const casoDocRef = doc(db, 'casos', caso.id);
      await updateDoc(casoDocRef, {
        plazos: arrayUnion(nuevoPlazoObj)
      });

      await registrarLogAuditoria(
        currentUserEmail,
        'Registro de Plazo',
        `Se asignó fecha fatal ${fechaFatalInput} para "${descripcionPlazo.trim()}" en el caso "${caso.nombre}"`
      );

      setLocalPlazos(prev => [...prev, nuevoPlazoObj]);
      setDescripcionPlazo('');
      setFechaFatalInput('');
      setResponsiblePlazo('');
      setOpenPlazoModal(false);
    } catch (err) {
      setError('No se pudo guardar el plazo procesal.');
    }
  };

  const handleConfirmarCierrePlazo = async (e) => {
    e.preventDefault();
    if (!plazoAActivar || !fileProbatorio) return;

    setUploadingPlazoDoc(true);
    setUploadProgressPlazoDoc(0);
    setError('');

    const storagePath = `casos/${caso.id}/documentos_comunes/${Date.now()}_${fileProbatorio.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, fileProbatorio);

    uploadTask.on('state_changed', 
      (snap) => {
        const progress = (snap.bytesTransferred / snap.totalBytes) * 100;
        setUploadProgressPlazoDoc(Math.round(progress));
      },
      (err) => { 
        setError('Error al subir el documento probatorio.'); 
        setUploadingPlazoDoc(false); 
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // 1. Inyectar en Documentos Comunes automáticamente
          await addDoc(collection(db, 'casos', caso.id, 'documentos_comunes'), {
            nombre: fileProbatorio.name,
            url: downloadURL,
            storage_path: storagePath,
            fecha_subida: new Date().toISOString()
          });

          // 2. Modificar el estatus del término procesal
          const plazosModificados = localPlazos.map(p => {
            if (p.id === plazoAActivar.id) {
              return {
                ...p,
                completado: true,
                fechaPresentacion: new Date().toLocaleString(),
                documentoProbatorioNombre: fileProbatorio.name,
                documentoProbatorioUrl: downloadURL,
                storage_path: storagePath
              };
            }
            return p;
          });

          const casoDocRef = doc(db, 'casos', caso.id);
          await updateDoc(casoDocRef, { plazos: plazosModificados });

          await registrarLogAuditoria(
            currentUserEmail,
            'Resolución de Plazo',
            `Se solventó plazo ID: ${plazoAActivar.id} subiendo documento probatorio: "${fileProbatorio.name}"`
          );

          setLocalPlazos(plazosModificados);
          setFileProbatorio(null);
          setPlazoAActivar(null);
          setOpenCerrarModal(false);
          fetchDocsComunes(); 
        } catch (ex) {
          setError('Error al resguardar la inmutabilidad del hito.');
        } finally {
          setUploadingPlazoDoc(false);
        }
      }
    );
  };

  // =====================================================================================
  // MOTOR DEL SEMÁFORO INTERNO: Sincroniza el estatus dinámico de las pestañas
  // =====================================================================================
  const semaforoGeneral = (() => {
    const plazosActivos = localPlazos.filter(p => !p.completado);
    if (plazosActivos.length === 0) return null;

    const fechasEnMilisegundos = plazosActivos.map(p => new Date(p.fechaFatal + 'T00:00:00').getTime());
    const fechaMasProximaMs = Math.min(...fechasEnMilisegundos);
    
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    
    const fechaFatal = new Date(fechaMasProximaMs);
    fechaFatal.setHours(0,0,0,0);

    const diferenciaTiempo = fechaFatal.getTime() - hoy.getTime();
    const diasRestantes = Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24));

    if (diasRestantes < 0) return { label: `Vencido (${Math.abs(diasRestantes)} d)`, color: '#b91c1c' };
    if (diasRestantes <= 2) return { label: `URGENTE (${diasRestantes} d)`, color: '#b91c1c' };
    if (diasRestantes <= 5) return { label: `Advertencia (${diasRestantes} d)`, color: '#b45309' };
    return { label: `${diasRestantes} días libres`, color: '#15803d' };
  })();

  if (clienteSeleccionadoId) {
    return (
      <FichaCliente 
        casoId={caso.id} 
        clienteId={clienteSeleccionadoId} 
        onVolver={() => setClienteSeleccionadoId(null)} 
        currentUserEmail={currentUserEmail} 
      />
    );
  }

  return (
    <Box>
      <Button 
        startIcon={<ArrowLeft size={16} />} 
        onClick={onVolver} 
        sx={{ mb: 2, textTransform: 'none', color: 'text.secondary' }}
      >
        Volver a todos los casos
      </Button>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
        <Typography variant="h4" fontWeight="bold" color="primary.main" gutterBottom>
          {caso.nombre}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {caso.descripcion || 'Sin descripción del litigio.'}
        </Typography>
      </Paper>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)} textColor="primary" indicatorColor="primary">
          <Tab icon={<Users size={18} />} iconPosition="start" label="Fichas de Clientes" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
          <Tab icon={<FileText size={18} />} iconPosition="start" label="Documentos Comunes" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
          <Tab icon={<CreditCard size={18} />} iconPosition="start" label="Control de Pagos" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
          {/* COLORACIÓN DINÁMICA: Aplica estilos según criticidad en la pestaña */}
          <Tab 
            icon={<Clock size={18} style={{ color: semaforoGeneral ? semaforoGeneral.color : 'inherit' }} />} 
            iconPosition="start" 
            label={semaforoGeneral ? `Control de Vencimientos (${semaforoGeneral.label})` : "Control de Vencimientos"} 
            style={{ 
              textTransform: 'none', 
              fontWeight: 'bold', 
              color: semaforoGeneral ? semaforoGeneral.color : 'inherit' 
            }} 
          />
        </Tabs>
      </Box>

      {/* PESTAÑA 1: RECONSTRUCCIÓN VERTICAL TABLA DE REPRESETADOS */}
      <TabPanel value={activeTab} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" fontWeight="bold">Representados en el Litigio</Typography>
          <Button 
            variant="contained" 
            startIcon={<Plus size={18} />} 
            onClick={() => setOpenModal(true)} 
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 'bold' }}
          >
            Agregar Cliente
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : clientes.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>No hay clientes registrados.</Alert>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Apellidos y Nombres</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Documento de Identidad</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>País</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Contacto Principal</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Pago Stripe</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clientes.map((clienteItem) => (
                  <TableRow key={clienteItem.id} hover>
                    <TableCell sx={{ fontWeight: 'medium' }}>
                      {clienteItem.apellidos}, {clienteItem.nombres}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{clienteItem.identificacion}</Typography>
                      <Typography variant="caption" color="text.secondary">{clienteItem.tipo_identificacion}</Typography>
                    </TableCell>
                    <TableCell>
                      {clienteItem.pais || 'No especificado'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{clienteItem.correo_principal || 'Sin correo'}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {clienteItem.telefono_principal ? `${clienteItem.codigo_telefono_principal} ${clienteItem.telefono_principal}` : 'Sin teléfono'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={clienteItem.estado_pago} 
                        size="small" 
                        color={clienteItem.estado_pago === 'Pagado' ? 'success' : 'warning'} 
                        sx={{ fontWeight: 'bold' }} 
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton 
                        size="small" 
                        color="primary" 
                        title="Ver Ficha Completa" 
                        onClick={() => setClienteSeleccionadoId(clienteItem.id)}
                      >
                        <Eye size={18} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* PESTAÑA 2: DOCUMENTOS COMUNES */}
      <TabPanel value={activeTab} index={1}>
        <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h6" fontWeight="bold">Escritos y Respuestas de Instancias Internacionales</Typography>
            </Box>
            <Button 
              variant="contained" 
              component="label" 
              startIcon={<Upload size={18} />} 
              disabled={uploadingDoc} 
              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 'bold' }}
            >
              {uploadingDoc ? 'Subiendo...' : 'Subir Documento Común'}
              <input type="file" accept="application/pdf,image/*" hidden onChange={handleUploadDocComun} />
            </Button>
          </Box>
          
          {uploadingDoc && (
            <Box sx={{ width: '100%', mb: 3 }}>
              <LinearProgress variant="determinate" value={uploadProgressDoc} />
            </Box>
          )}

          {loadingDocs ? (
            <CircularProgress />
          ) : docsComunes.length === 0 ? (
            <Alert severity="info">No hay documentos globales subidos para este litigio.</Alert>
          ) : (
            <List>
              {docsComunes.map((d) => (
                <ListItem key={d.id} disablePadding sx={{ mb: 1, display: 'flex', gap: 2 }}>
                  <Button 
                    component="a" 
                    href={d.url} 
                    target="_blank" 
                    variant="text" 
                    color="inherit" 
                    startIcon={<File size={16} />} 
                    sx={{ flexGrow: 1, justifyContent: 'flex-start', p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5 }}
                  >
                    <ListItemText 
                      primary={d.nombre} 
                      secondary={d.fecha_subida ? `Subido: ${new Date(d.fecha_subida).toLocaleString()}` : ''} 
                    />
                  </Button>
                  <IconButton 
                    size="small" 
                    color="error" 
                    onClick={() => handleDeleteDocComun(d.id, d.storage_path)} 
                    sx={{ border: '1px solid #fee2e2', bgcolor: '#fef2f2', p: 1.25 }}
                  >
                    <Trash2 size={18} />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </TabPanel>

      {/* PESTAÑA 3: PAGOS */}
      <TabPanel value={activeTab} index={2}>
        <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>Pasarela de Stripe</Typography>
          <Typography variant="body2" color="text.secondary">Registro general de conciliación de pagos de este litigio.</Typography>
        </Paper>
      </TabPanel>

      {/* PESTAÑA 4: CONTROL DE VENCIMIENTOS PROCESALES */}
      <TabPanel value={activeTab} index={3}>
        <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h6" fontWeight="bold">Fechas Fatales y Plazos Judiciales</Typography>
              <Typography variant="body2" color="text.secondary">Seguimiento de términos perentorios asociados a las notificaciones oficiales.</Typography>
            </Box>
            <Button 
              variant="contained" 
              startIcon={<Calendar size={18} />} 
              onClick={() => setOpenPlazoModal(true)} 
              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 'bold' }}
            >
              Cargar Fecha Fatal
            </Button>
          </Box>

          {localPlazos.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>No hay plazos procesales configurados para este litigio.</Alert>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Término Procesal / Descripción</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Fecha Límite</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Responsable</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Estatus</TableCell>
                    {/* COLUMNA ACTUALIZADA BAJO CRITERIOS INTERNACIONALES */}
                    <TableCell sx={{ fontWeight: 'bold' }}>Documento Probatorio</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {localPlazos.map((plazo) => {
                    const cfg = (() => {
                      if (plazo.completado) return { colorChip: 'success', label: 'Presentado', bgFila: '#ffffff' };
                      const hoy = new Date();
                      hoy.setHours(0,0,0,0);
                      const fatal = new Date(plazo.fechaFatal + 'T00:00:00');
                      fatal.setHours(0,0,0,0);
                      const diff = Math.ceil((fatal.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

                      if (diff < 0) return { colorChip: 'error', label: 'Vencido', bgFila: '#fef2f2' };
                      if (diff <= 2) return { colorChip: 'error', label: 'CRÍTICO', bgFila: '#fef2f2' };
                      if (diff <= 5) return { colorChip: 'warning', label: 'Advertencia', bgFila: '#fffbeb' };
                      return { colorChip: 'info', label: 'A tiempo', bgFila: '#ffffff' };
                    })();

                    return (
                      <TableRow key={plazo.id} sx={{ bgcolor: cfg.bgFila }} hover>
                        <TableCell sx={{ fontWeight: 'medium', py: 1.5 }}>{plazo.descripcion}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: '#b91c1c' }}>{plazo.fechaFatal}</TableCell>
                        <TableCell>{plazo.responsable}</TableCell>
                        <TableCell><Chip label={cfg.label} color={cfg.colorChip} size="small" sx={{ fontWeight: 'bold' }} /></TableCell>
                        {/* ENLACE DIRECTO AL ARCHIVO EN STORAGE */}
                        <TableCell sx={{ fontSize: '0.8rem' }}>
                          {plazo.completado ? (
                            <Button
                              component="a"
                              href={plazo.documentoProbatorioUrl}
                              target="_blank"
                              rel="noopener"
                              variant="text"
                              size="small"
                              startIcon={<File size={14} />}
                              sx={{ textTransform: 'none', p: 0, fontWeight: 'bold', justifyContent: 'flex-start' }}
                            >
                              {plazo.documentoProbatorioNombre || 'Ver Archivo'}
                            </Button>
                          ) : (
                            <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                              Exigible ante la instancia
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          {!plazo.completado ? (
                            <Button 
                              variant="contained" 
                              color="success" 
                              size="small" 
                              onClick={() => { setPlazoAActivar(plazo); setOpenCerrarModal(true); }}
                              sx={{ textTransform: 'none', fontWeight: 'bold', borderRadius: 1.5 }}
                            >
                              Cerrar
                            </Button>
                          ) : (
                            <Chip label="Histórico" size="small" variant="outlined" disabled />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </TabPanel>

      {/* MODAL DE AGREGAR CLIENTE EXTENDIDO */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle fontWeight="bold">Nueva Ficha de Cliente</DialogTitle>
        <Box component="form" onSubmit={handleCreateCliente}>
          <DialogContent dividers>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2.5 }}>
              <TextField label="Nombres" required fullWidth value={nombres} onChange={(e) => setNombres(e.target.value)} />
              <TextField label="Apellidos" required fullWidth value={apellidos} onChange={(e) => setApellidos(e.target.value)} />
            </Box>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2.5 }}>
              <FormControl fullWidth>
                <InputLabel>Tipo Identificación</InputLabel>
                <Select value={tipoIdentificacion} label="Tipo Identificación" onChange={(e) => setTipoIdentificacion(e.target.value)}>
                  {DOC_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Número de Identificación" required fullWidth value={identificacion} onChange={(e) => setIdentificacion(e.target.value)} />
            </Box>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2.5 }}>
              <FormControl fullWidth>
                <InputLabel>País de Residencia</InputLabel>
                <Select 
                  value={pais} 
                  label="País de Residencia" 
                  onChange={(e) => { 
                    setPais(e.target.value); 
                    const c = COUNTRIES.find(x => x.name === e.target.value); 
                    if (c) setCodigoTelefonoPrincipal(c.phone); 
                  }}
                >
                  {COUNTRIES.map(c => <MenuItem key={c.code} value={c.name}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Email Principal" type="email" required fullWidth value={correoPrincipal} onChange={(e) => setCorreoPrincipal(e.target.value)} />
            </Box>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 2, mb: 2.5 }}>
              <FormControl fullWidth>
                <InputLabel>Código</InputLabel>
                <Select value={codigoTelefonoPrincipal} label="Código" onChange={(e) => setCodigoTelefonoPrincipal(e.target.value)}>
                  {COUNTRIES.map(c => <MenuItem key={c.code} value={c.phone}>{`${c.code} (${c.phone})`}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Número Telefónico Principal" fullWidth value={telefonoPrincipal} onChange={(e) => setTelefonoPrincipal(e.target.value)} />
            </Box>
            
            <Box sx={{ mb: 2.5 }}>
              <TextField label="Dirección Física" fullWidth multiline rows={2} value={direccion} onChange={(e) => setDireccion(e.target.value)} />
            </Box>
            
            <TextField label="Notas Jurídicas Iniciales" fullWidth multiline rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setOpenModal(false)} color="inherit">Cancelar</Button>
            <Button type="submit" variant="contained">Registrar en el Caso</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* MODAL: CARGAR PLAZO */}
      <Dialog open={openPlazoModal} onClose={() => setOpenPlazoModal(false)} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle fontWeight="bold">Cargar Término Procesal</DialogTitle>
        <Box component="form" onSubmit={handleAgregarPlazo}>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Descripción del Término (Ej: Recurso de Apelación)" fullWidth required value={descripcionPlazo} onChange={e => setDescripcionPlazo(e.target.value)} />
            <TextField label="Fecha Límite Judicial (Fecha Fatal)" type="date" fullWidth required slotProps={{ inputLabel: { shrink: true } }} value={fechaFatalInput} onChange={e => setFechaFatalInput(e.target.value)} />
            <TextField label="Abogado Litigante Responsable" fullWidth required value={responsablePlazo} onChange={e => setResponsiblePlazo(e.target.value)} />
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setOpenPlazoModal(false)} color="inherit" sx={{ textTransform: 'none' }}>Cancelar</Button>
            <Button type="submit" variant="contained" sx={{ textTransform: 'none', fontWeight: 'bold' }}>Cargar Término</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* MODAL: RESOLVER PLAZO CON ARCHIVO PROBATORIO OBLIGATORIO */}
      <Dialog 
        open={openCerrarModal} 
        onClose={() => { if (!uploadingPlazoDoc) { setOpenCerrarModal(false); setFileProbatorio(null); } }} 
        fullWidth 
        maxWidth="xs" 
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <Box component="form" onSubmit={handleConfirmarCierrePlazo}>
          <DialogTitle fontWeight="bold">Subsanar y Cargar Documento Probatorio</DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Para dar por solventado este plazo ante instancias internacionales, debe anexar obligatoriamente el documento sustentatorio en formato digital.
            </Typography>
            
            <Button 
              variant="outlined" 
              component="label" 
              startIcon={<Upload size={18} />} 
              disabled={uploadingPlazoDoc} 
              fullWidth
              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 'bold', py: 1.5 }}
            >
              {fileProbatorio ? fileProbatorio.name : 'Seleccionar Documento Probatorio'}
              <input type="file" accept="application/pdf,image/*" hidden required onChange={(e) => setFileProbatorio(e.target.files[0])} />
            </Button>

            {uploadingPlazoDoc && (
              <Box sx={{ width: '100%', mt: 1 }}>
                <LinearProgress variant="determinate" value={uploadProgressPlazoDoc} />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>
                  Subiendo archivo... {uploadProgressPlazoDoc}%
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => { setOpenCerrarModal(false); setFileProbatorio(null); }} color="inherit" sx={{ textTransform: 'none' }} disabled={uploadingPlazoDoc}>Abortar</Button>
            <Button type="submit" variant="contained" color="success" sx={{ textTransform: 'none', fontWeight: 'bold' }} disabled={uploadingPlazoDoc || !fileProbatorio}>
              {uploadingPlazoDoc ? 'Procesando...' : 'Registrar Presentación'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}