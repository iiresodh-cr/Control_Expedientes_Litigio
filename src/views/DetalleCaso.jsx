import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  serverTimestamp, 
  addDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Grid, 
  Chip, 
  Divider, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent
} from '@mui/material';
import { 
  ArrowLeft, 
  CalendarPlus, 
  CheckCircle, 
  Clock, 
  Users, 
  FileText, 
  Plus 
} from 'lucide-react';

export default function DetalleCaso({ caso, onVolver, currentUserEmail, userRole }) {
  const [instanciaCaso, setInstanciaCaso] = useState(caso);
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState('');
  const [loadingSubs, setLoadingSubs] = useState(false);

  // COLECCIONES SECUNDARIAS DE LA FIRMA
  const [clientes, setClientes] = useState([]);
  const [documentosComunes, setDocumentosComunes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [notasCliente, setNotasCliente] = useState([]);
  const [docsCliente, setDocsCliente] = useState([]);

  // ESTADOS MODALES: PESTAÑA 0 (PLAZOS)
  const [openPlazoModal, setOpenPlazoModal] = useState(false);
  const [descripcionPlazo, setDescripcionPlazo] = useState('');
  const [fechaFatalInput, setFechaFatalInput] = useState('');
  const [responsablePlazo, setResponsablePlazo] = useState('');
  const [openCerrarModal, setOpenCerrarModal] = useState(false);
  const [plazoAActivar, setPlazoAActivar] = useState(null);
  const [folioAcuse, setFolioAcuse] = useState('');

  // ESTADOS MODALES: PESTAÑA 1 (CLIENTES)
  const [openClienteModal, setOpenClienteModal] = useState(false);
  const [nombreCliente, setNombreCliente] = useState('');
  const [identificacionCliente, setIdentificacionCliente] = useState('');
  const [openNotaModal, setOpenNotaModal] = useState(false);
  const [contenidoNota, setContenidoNota] = useState('');
  const [openDocClienteModal, setOpenDocClienteModal] = useState(false);
  const [nombreDocCliente, setNombreDocCliente] = useState('');
  const [urlDocCliente, setUrlDocCliente] = useState('');

  // ESTADOS MODALES: PESTAÑA 2 (DOCS COMUNES)
  const [openDocComunModal, setOpenDocComunModal] = useState(false);
  const [nombreDocComun, setNombreDocComun] = useState('');
  const [urlDocComun, setUrlDocComun] = useState('');

  const cargarSubcoleccionesCaso = async () => {
    setLoadingSubs(true);
    setError('');
    try {
      // 1. Cargar Clientes vinculados al Litigio
      const clientesRef = collection(db, 'casos', instanciaCaso.id, 'clientes');
      const snapClientes = await getDocs(clientesRef);
      setClientes(snapClientes.docs.map(d => ({ id: d.id, ...d.data() })));

      // 2. Cargar Documentos Comunes del Litigio
      const documentosComunesRef = collection(db, 'casos', instanciaCaso.id, 'documentos_comunes');
      const snapDocs = await getDocs(documentosComunesRef);
      setDocumentosComunes(snapDocs.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      setError('Acceso denegado: Restricción perimetral al consultar subcolecciones del caso.');
    } finally {
      setLoadingSubs(false);
    }
  };

  useEffect(() => {
    cargarSubcoleccionesCaso();
  }, [instanciaCaso.id]);

  const cargarDatosEspecificosCliente = async (cliente) => {
    setClienteSeleccionado(cliente);
    try {
      const notasRef = collection(db, 'casos', instanciaCaso.id, 'clientes', cliente.id, 'notas');
      const snapNotas = await getDocs(notasRef);
      setNotasCliente(snapNotas.docs.map(d => ({ id: d.id, ...d.data() })));

      const docsRef = collection(db, 'casos', instanciaCaso.id, 'clientes', cliente.id, 'documentos');
      const snapDocs = await getDocs(docsRef);
      setDocsCliente(snapDocs.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      setError('Error al consultar el expediente privado del cliente.');
    }
  };

  // =====================================================================================
  // MANEJADORES: CONTROL DE TÉRMINOS Y PLAZOS JURÍDICOS (PESTAÑA 0)
  // =====================================================================================
  const handleAgregarPlazo = async (e) => {
    e.preventDefault();
    if (!descripcionPlazo || !fechaFatalInput || !responsablePlazo) return;

    setError('');
    const nuevoPlazoObj = {
      id: 'plazo_' + Date.now(),
      descripcion: descripcionPlazo,
      fechaFatal: fechaFatalInput,
      responsable: responsablePlazo,
      completado: false,
      fechaPresentacion: '',
      folioAcuse: ''
    };

    try {
      const casoRef = doc(db, 'casos', instanciaCaso.id);
      await updateDoc(casoRef, { plazos: arrayUnion(nuevoPlazoObj) });

      await addDoc(collection(db, 'logs_auditoria'), {
        usuario: currentUserEmail,
        accion: 'AGREGAR_PLAZO_PROCESAL',
        detalles: `Se fijó término fatal para ${fechaFatalInput} en Exp. ${instanciaCaso.numeroExpediente}`,
        fecha: serverTimestamp()
      });

      const copiaPlazos = [...(instanciaCaso.plazos || []), nuevoPlazoObj];
      setInstanciaCaso({ ...instanciaCaso, plazos: copiaPlazos });
      setDescripcionPlazo('');
      setFechaFatalInput('');
      setResponsablePlazo('');
      setOpenPlazoModal(false);
    } catch (err) {
      setError('No posee autorizaciones para inyectar plazos procesales.');
    }
  };

  const handleConfirmarCierrePlazo = async (e) => {
    e.preventDefault();
    if (!plazoAActivar || !folioAcuse) return;

    setError('');
    try {
      const casoRef = doc(db, 'casos', instanciaCaso.id);
      const plazosModificados = (instanciaCaso.plazos || []).map(p => {
        if (p.id === plazoAActivar.id) {
          return {
            ...p,
            completado: true,
            fechaPresentacion: new Date().toLocaleString(),
            folioAcuse: folioAcuse
          };
        }
        return p;
      });

      await updateDoc(casoRef, { plazos: plazosModificados });

      await addDoc(collection(db, 'logs_auditoria'), {
        usuario: currentUserEmail,
        accion: 'DESACTIVAR_PLAZO_PROCESAL',
        detalles: `Plazo cerrado en Exp. ${instanciaCaso.numeroExpediente}. Sello judicial Folio: ${folioAcuse}`,
        fecha: serverTimestamp()
      });

      setInstanciaCaso({ ...instanciaCaso, plazos: plazosModificados });
      setFolioAcuse('');
      setPlazoAActivar(null);
      setOpenCerrarModal(false);
    } catch (err) {
      setError('Error al salvaguardar la inmutabilidad del hito.');
    }
  };

  // =====================================================================================
  // MANEJADORES: EXPEDIENTE DE CLIENTELA INTERNA (PESTAÑA 1)
  // =====================================================================================
  const handleCrearCliente = async (e) => {
    e.preventDefault();
    if (!nombreCliente || !identificacionCliente) return;
    try {
      const ref = collection(db, 'casos', instanciaCaso.id, 'clientes');
      await addDoc(ref, {
        nombre: nombreCliente,
        identificacion: identificacionCliente,
        fechaAsociacion: new Date().toLocaleString()
      });

      setNombreCliente('');
      setIdentificacionCliente('');
      setOpenClienteModal(false);
      cargarSubcoleccionesCaso();
    } catch (err) {
      setError('Error al registrar cliente en la subcolección confidencial.');
    }
  };

  const handleAgregarNotaCliente = async (e) => {
    e.preventDefault();
    if (!contenidoNota || !clienteSeleccionado) return;
    try {
      const ref = collection(db, 'casos', instanciaCaso.id, 'clientes', clienteSeleccionado.id, 'notas');
      await addDoc(ref, {
        contenido: contenidoNota,
        autor: currentUserEmail,
        fecha: new Date().toLocaleString()
      });

      setContenidoNota('');
      setOpenNotaModal(false);
      cargarDatosEspecificosCliente(clienteSeleccionado);
    } catch (err) {
      setError('Error al resguardar nota jurídica.');
    }
  };

  const handleAgregarDocCliente = async (e) => {
    e.preventDefault();
    if (!nombreDocCliente || !urlDocCliente || !clienteSeleccionado) return;
    try {
      const ref = collection(db, 'casos', instanciaCaso.id, 'clientes', clienteSeleccionado.id, 'documentos');
      await addDoc(ref, {
        nombre: nombreDocCliente,
        url: urlDocCliente,
        fechaCarga: new Date().toLocaleString()
      });

      setNombreDocCliente('');
      setUrlDocCliente('');
      setOpenDocClienteModal(false);
      cargarDatosEspecificosCliente(clienteSeleccionado);
    } catch (err) {
      setError('Error al registrar documento del cliente.');
    }
  };

  // =====================================================================================
  // MANEJADORES: REPOSITORIO DIGITAL DE DOCUMENTOS COMUNES (PESTAÑA 2)
  // =====================================================================================
  const handleAgregarDocComun = async (e) => {
    e.preventDefault();
    if (!nombreDocComun || !urlDocComun) return;
    try {
      const ref = collection(db, 'casos', instanciaCaso.id, 'documentos_comunes');
      await addDoc(ref, {
        nombre: nombreDocComun,
        url: urlDocComun,
        cargadoPor: currentUserEmail,
        fechaCarga: new Date().toLocaleString()
      });

      setNombreDocComun('');
      setUrlDocComun('');
      setOpenDocComunModal(false);
      cargarSubcoleccionesCaso();
    } catch (err) {
      setError('Error al anexar archivo al expediente común.');
    }
  };

  const calcularEstiloFilaPlazo = (plazo) => {
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
  };

  return (
    <Box>
      <Button 
        startIcon={<ArrowLeft size={16} />} 
        onClick={onVolver} 
        sx={{ color: '#1a365d', textTransform: 'none', fontWeight: 'bold', mb: 3 }}
      >
        Volver al listado de casos
      </Button>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* BLOQUE MEMBRETADO DEL EXPEDIENTE */}
      <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none', mb: 4 }}>
        <Typography variant="caption" fontWeight="bold" color="text.disabled" display="block">
          EXPEDIENTE JUDICIAL ENTERPRISE
        </Typography>
        <Typography variant="h5" fontWeight="bold" color="#1a365d" gutterBottom>
          {instanciaCaso.nombreCaso}
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary" display="block">No. Expediente</Typography>
            <Typography variant="body2" fontWeight="bold" color="#1a365d">{instanciaCaso.numeroExpediente}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary" display="block">Materia Litigiosa</Typography>
            <Typography variant="body2" fontWeight="bold">{instanciaCaso.materia}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary" display="block">Abogado Asignador</Typography>
            <Typography variant="body2" fontSize="0.85rem">{instanciaCaso.creadoPor}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary" display="block">Clientes Vinculados</Typography>
            <Typography variant="body2" fontWeight="bold">{clientes.length} Registrados</Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* SISTEMA DE NAVEGACIÓN POR PESTAÑAS JURÍDICAS */}
      <Tabs 
        value={activeTab} 
        onChange={(e, newVal) => setActiveTab(newVal)} 
        sx={{ mb: 3, borderBottom: '1px solid #e2e8f0', '& .MuiTab-root': { textTransform: 'none', fontWeight: 'bold' } }}
      >
        <Tab icon={<Clock size={16} />} iconPosition="start" label="Fechas Fatales y Plazos" />
        <Tab icon={<Users size={16} />} iconPosition="start" label="Clientes y Archivo Privado" />
        <Tab icon={<FileText size={16} />} iconPosition="start" label="Expediente Digital Común" />
      </Tabs>

      {/* CONTENIDO: TAB 0 - CONTROL DE VENCIMIENTOS JUDICIALES */}
      {activeTab === 0 && (
        <Box>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight="bold" color="#1a365d">
              Vencimientos y Alertas de Término
            </Typography>
            <Button
              variant="outlined"
              startIcon={<CalendarPlus size={16} />}
              onClick={() => setOpenPlazoModal(true)}
              sx={{ color: '#1a365d', borderColor: '#1a365d', textTransform: 'none', fontWeight: 'bold', borderRadius: 2 }}
            >
              Cargar Fecha Fatal
            </Button>
          </Box>

          {(!instanciaCaso.plazos || instanciaCaso.plazos.length === 0) ? (
            <Alert severity="info">Este expediente no registra plazos procesales abiertos todavía.</Alert>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Término Procesal</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Fecha Límite</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Responsable</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Estatus</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Evidencia / Sello Judicial</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {instanciaCaso.plazos.map((plazo) => {
                    const cfg = calcularEstiloFilaPlazo(plazo);
                    return (
                      <TableRow key={plazo.id} sx={{ bgcolor: cfg.bgFila }} hover>
                        <TableCell sx={{ fontWeight: 'medium', py: 1.5 }}>{plazo.descripcion}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: '#b91c1c' }}>{plazo.fechaFatal}</TableCell>
                        <TableCell>{plazo.responsable}</TableCell>
                        <TableCell><Chip label={cfg.label} color={cfg.colorChip} size="small" sx={{ fontWeight: 'bold' }} /></TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                          {plazo.completado ? `Folio: ${plazo.folioAcuse} (${plazo.fechaPresentacion})` : 'Exigible ante el tribunal'}
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
        </Box>
      )}

      {/* CONTENIDO: TAB 1 - GESTIÓN DE CLIENTES, NOTAS INTERNAS Y DOCUMENTOS */}
      {activeTab === 1 && (
        <Box>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight="bold" color="#1a365d">Clientes Adscritos al Caso</Typography>
            <Button
              variant="contained"
              startIcon={<Plus size={16} />}
              onClick={() => setOpenClienteModal(true)}
              sx={{ bgcolor: '#1a365d', textTransform: 'none', fontWeight: 'bold', borderRadius: 2 }}
            >
              Asociar Cliente
            </Button>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              {clientes.length === 0 ? (
                <Alert severity="info">No se reportan clientes asignados a este litigio.</Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {clientes.map(cli => (
                    <Card 
                      key={cli.id} 
                      onClick={() => cargarDatosEspecificosCliente(cli)}
                      sx={{ 
                        cursor: 'pointer', 
                        borderRadius: 2,
                        border: clienteSeleccionado?.id === cli.id ? '2px solid #1a365d' : '1px solid #e2e8f0',
                        boxShadow: 'none',
                        bgcolor: clienteSeleccionado?.id === cli.id ? '#f8fafc' : '#ffffff'
                      }}
                    >
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Typography variant="body2" fontWeight="bold" color="#1a365d">{cli.nombre}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">ID: {cli.identificacion}</Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </Grid>

            <Grid item xs={12} md={8}>
              {clienteSeleccionado ? (
                <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                  <Typography variant="subtitle2" fontWeight="bold" color="#1a365d" gutterBottom>
                    Carpeta Legal de: {clienteSeleccionado.nombre}
                  </Typography>
                  <Divider sx={{ my: 2 }} />

                  {/* SUB-SECCIÓN: NOTAS DEL ABOGADO */}
                  <Box sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="caption" fontWeight="bold" color="text.secondary">Notas de Estrategia Interna</Typography>
                      <Button size="small" startIcon={<Plus size={14} />} onClick={() => setOpenNotaModal(true)} sx={{ textTransform: 'none' }}>Anexar Nota</Button>
                    </Box>
                    {notasCliente.length === 0 ? (
                      <Typography variant="caption" color="text.disabled" display="block">Sin anotaciones de staff.</Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {notasCliente.map(n => (
                          <Box key={n.id} sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #edf2f7' }}>
                            <Typography variant="body2">{n.contenido}</Typography>
                            <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5 }}>Por: {n.autor} — {n.fecha}</Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>

                  {/* SUB-SECCIÓN: DOCUMENTACIÓN PRIVADA */}
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="caption" fontWeight="bold" color="text.secondary">Documentación Personal / Poderes</Typography>
                      <Button size="small" startIcon={<Plus size={14} />} onClick={() => setOpenDocClienteModal(true)} sx={{ textTransform: 'none' }}>Subir Archivo</Button>
                    </Box>
                    {docsCliente.length === 0 ? (
                      <Typography variant="caption" color="text.disabled" display="block">No se cargaron archivos para este titular.</Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {docsCliente.map(d => (
                          <Box key={d.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, border: '1px solid #e2e8f0', borderRadius: 2 }}>
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><FileText size={14} /> {d.nombre}</Typography>
                            <Button size="small" href={d.url} target="_blank" rel="noopener" sx={{ textTransform: 'none' }}>Ver Enlace</Button>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Paper>
              ) : (
                <Box sx={{ p: 4, textAlign: 'center', border: '1px dashed #e2e8f0', borderRadius: 3 }}>
                  <Typography variant="body2" color="text.disabled">Seleccione un cliente de la lista para abrir su archivo de notas y poderes.</Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </Box>
      )}

      {/* CONTENIDO: TAB 2 - EXPEDIENTE DIGITAL COMÚN */}
      {activeTab === 2 && (
        <Box>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight="bold" color="#1a365d">Archivos y Actuaciones Comunes del Caso</Typography>
            <Button
              variant="contained"
              startIcon={<Plus size={16} />}
              onClick={() => setOpenDocComunModal(true)}
              sx={{ bgcolor: '#1a365d', textTransform: 'none', fontWeight: 'bold', borderRadius: 2 }}
            >
              Anexar Documento Común
            </Button>
          </Box>

          {documentosComunes.length === 0 ? (
            <Alert severity="info">El expediente digital común se encuentra vacío. No se han anexado demandas o resoluciones.</Alert>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Nombre del Archivo / Actuación</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Cargado Por</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Fecha de Carga</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Acceso</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documentosComunes.map(doc => (
                    <TableRow key={doc.id} hover>
                      <TableCell sx={{ fontWeight: 'medium', py: 1.5 }}>{doc.name || doc.nombre}</TableCell>
                      <TableCell sx={{ fontSize: '0.85rem' }}>{doc.cargadoPor || 'Personal de Staff'}</TableCell>
                      <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>{doc.fechaCarga}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Button variant="text" size="small" href={doc.url} target="_blank" rel="noopener" sx={{ textTransform: 'none', fontWeight: 'bold' }}>
                          Abrir Documento
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* SECCIÓN DE MODALES */}
      
      {/* MODAL: CARGAR PLAZO */}
      <Dialog open={openPlazoModal} onClose={() => setOpenPlazoModal(false)} fullWidth maxWidth="xs">
        <form onSubmit={handleAgregarPlazo}>
          <DialogTitle sx={{ fontWeight: 'bold', color: '#1a365d' }}>Cargar Término Procesal</DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField label="Descripción del Término (Ej: Recurso de Apelación)" fullWidth required value={descripcionPlazo} onChange={e => setDescripcionPlazo(e.target.value)} />
            <TextField label="Fecha Límite Judicial (Fecha Fatal)" type="date" fullWidth required slotProps={{ inputLabel: { shrink: true } }} value={fechaFatalInput} onChange={e => setFechaFatalInput(e.target.value)} />
            <TextField label="Abogado Litigante Responsable" fullWidth required value={responsablePlazo} onChange={e => setResponsablePlazo(e.target.value)} />
          </DialogContent>
          <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
            <Button onClick={() => setOpenPlazoModal(false)} color="inherit">Cancelar</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#1a365d' }}>Cargar Término</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* MODAL: RESOLVER PLAZO */}
      <Dialog open={openCerrarModal} onClose={() => setOpenCerrarModal(false)} fullWidth maxWidth="xs">
        <form onSubmit={handleConfirmarCierrePlazo}>
          <DialogTitle sx={{ fontWeight: 'bold', color: '#1a365d' }}>Desactivar Alerta Fatal</DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <Typography variant="body2" color="text.secondary">Ingrese el identificador oficial del sello o acuse digital provisto por el juzgado.</Typography>
            <TextField label="Número de Folio / Código de Barras del Acuse" fullWidth required value={folioAcuse} onChange={e => setFolioAcuse(e.target.value)} />
          </DialogContent>
          <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
            <Button onClick={() => setOpenCerrarModal(false)} color="inherit">Abortar</Button>
            <Button type="submit" variant="contained" color="success">Registrar Presentación</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* MODAL: REGISTRAR CLIENTE */}
      <Dialog open={openClienteModal} onClose={() => setOpenClienteModal(false)} fullWidth maxWidth="xs">
        <form onSubmit={handleCrearCliente}>
          <DialogTitle sx={{ fontWeight: 'bold', color: '#1a365d' }}>Asociar Cliente al Litigio</DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField label="Nombre Completo del Titular" fullWidth required value={nombreCliente} onChange={e => setNombreCliente(e.target.value)} />
            <TextField label="Cédula / Documento de Identificación" fullWidth required value={identificacionCliente} onChange={e => setIdentificacionCliente(e.target.value)} />
          </DialogContent>
          <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
            <Button onClick={() => setOpenClienteModal(false)} color="inherit">Cancelar</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#1a365d' }}>Asociar Cliente</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* MODAL: NUEVA NOTA */}
      <Dialog open={openNotaModal} onClose={() => setOpenNotaModal(false)} fullWidth maxWidth="xs">
        <form onSubmit={handleAgregarNotaCliente}>
          <DialogTitle sx={{ fontWeight: 'bold', color: '#1a365d' }}>Anexar Nota de Estrategia</DialogTitle>
          <DialogContent dividers sx={{ pt: 2 }}>
            <TextField label="Contenido Confidencial de la Nota" multiline rows={4} fullWidth required value={contenidoNota} onChange={e => setContenidoNota(e.target.value)} />
          </DialogContent>
          <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
            <Button onClick={() => setOpenNotaModal(false)} color="inherit">Cancelar</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#1a365d' }}>Guardar Nota</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* MODAL: DOCUMENTO DE CLIENTE */}
      <Dialog open={openDocClienteModal} onClose={() => setOpenDocClienteModal(false)} fullWidth maxWidth="xs">
        <form onSubmit={handleAgregarDocCliente}>
          <DialogTitle sx={{ fontWeight: 'bold', color: '#1a365d' }}>Vincular Archivo Personal / Poder</DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField label="Descripción del Archivo (Ej: Poder General)" fullWidth required value={nombreDocCliente} onChange={e => setNombreDocCliente(e.target.value)} />
            <TextField label="URL de Descarga Segura (Firebase Storage / Drive)" fullWidth required value={urlDocCliente} onChange={e => setUrlDocCliente(e.target.value)} />
          </DialogContent>
          <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
            <Button onClick={() => setOpenDocClienteModal(false)} color="inherit">Cancelar</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#1a365d' }}>Vincular Documento</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* MODAL: NUEVO DOCUMENTO COMÚN */}
      <Dialog open={openDocComunModal} onClose={() => setOpenDocComunModal(false)} fullWidth maxWidth="xs">
        <form onSubmit={handleAgregarDocComun}>
          <DialogTitle sx={{ fontWeight: 'bold', color: '#1a365d' }}>Anexar Documento al Expediente Común</DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField label="Nombre / Tipo de Actuación (Ej: Auto de Admisión)" fullWidth required value={nombreDocComun} onChange={e => setNombreDocComun(e.target.value)} />
            <TextField label="URL de Acceso al Documento Digital" fullWidth required value={urlDocComun} onChange={e => setUrlDocComun(e.target.value)} />
          </DialogContent>
          <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
            <Button onClick={() => setOpenDocComunModal(false)} color="inherit">Cancelar</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#1a365d' }}>Anexar Documento</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}