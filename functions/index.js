const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Esta función escuchará los reportes en tiempo real de SendGrid
exports.webhookSendGrid = functions.https.onRequest(async (req, res) => {
  const eventos = req.body;

  if (!Array.isArray(eventos)) {
    res.status(400).send('Formato de carga inválido');
    return;
  }

  try {
    for (const evento of eventos) {
      const email = evento.email;
      const tipoEvento = evento.event; // 'delivered', 'open', 'bounce'
      const timestamp = evento.timestamp * 1000; 
      const fechaCR = new Date(timestamp).toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' });

      // Recuperar las etiquetas X-SMTPAPI que inyectamos en React
      const casoId = evento.casoId;
      const comunicadoId = evento.comunicadoId;

      if (casoId && comunicadoId && email) {
        // 1. Localizar al representado por su correo electrónico principal
        const clientesRef = db.collection('casos').doc(casoId).collection('clientes');
        const snapshot = await clientesRef.where('correo_principal', '==', email).limit(1).get();

        if (!snapshot.empty) {
          const clienteDoc = snapshot.docs[0];
          const clienteId = clienteDoc.id;

          // 2. Apuntar al documento del comunicado en la ficha del representado
          const historialRef = db
            .collection('casos')
            .doc(casoId)
            .collection('clientes')
            .doc(clienteId)
            .collection('historial_comunicados')
            .doc(comunicadoId);

          let datosActualizacion = {
            comunicadoId: comunicadoId,
            ultima_actualizacion: fechaCR
          };

          // 3. Mapear el estado que nos reporta SendGrid
          if (tipoEvento === 'delivered') {
            datosActualizacion.entregado_at = fechaCR;
            datosActualizacion.estado = 'Entregado';
          } else if (tipoEvento === 'open') {
            datosActualizacion.abierto_at = fechaCR;
            datosActualizacion.estado = 'Abierto';
          } else if (tipoEvento === 'bounce') {
            datosActualizacion.rebotado_at = fechaCR;
            datosActualizacion.estado = 'Rebotado';
            datosActualizacion.causa_rebote = evento.reason || 'Rebote duro / Cuenta inexistente';
          }

          // Guardar usando merge para no pisar marcas previas (ej: conservar hora de entrega al abrir)
          await historialRef.set(datosActualizacion, { merge: true });
        }
      }
    }
    
    // Responder obligatoriamente con 200 OK a SendGrid
    res.status(200).send('Eventos procesados correctamente');
  } catch (error) {
    console.error('Error en webhookSendGrid:', error);
    res.status(500).send('Internal Server Error');
  }
});