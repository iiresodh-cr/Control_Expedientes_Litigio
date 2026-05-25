const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

exports.webhookSendGrid = functions.https.onRequest(async (req, res) => {
  const eventos = req.body;

  if (!Array.isArray(eventos)) {
    res.status(400).send('Formato de carga inválido');
    return;
  }

  try {
    for (const evento of eventos) {
      const email = evento.email;
      const tipoEvento = evento.event; 
      const timestamp = evento.timestamp * 1000; 
      const fechaCR = new Date(timestamp).toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' });
      
      // Capturar el ID universal del mensaje que SendGrid garantiza en el webhook
      const smtpId = evento['smtp-id'];

      if (!smtpId || !email) {
        console.warn('⚠️ Saltando evento debido a falta de smtp-id o email.');
        continue;
      }

      console.log(`🔍 Buscando comunicado en Firestore con smtp-id: ${smtpId}`);

      // Buscar el documento en todas las subcolecciones de comunicados usando un Query Group
      const comunicadoQuerySnap = await db.collectionGroup('comunicados')
        .where('delivery.info.messageId', '==', smtpId)
        .limit(1)
        .get();

      if (comunicadoQuerySnap.empty) {
        console.warn(`⚠️ No se encontró ningún comunicado asociado al smtp-id: ${smtpId}`);
        continue;
      }

      const comunicadoDoc = comunicadoQuerySnap.docs[0];
      const comunicadoId = comunicadoDoc.id;
      
      // Extraer de forma segura el casoId de la ruta jerárquica (casos/CASO_ID/comunicados/COM_ID)
      const pathSegments = comunicadoDoc.ref.path.split('/');
      const casoId = pathSegments[1];

      console.log(`📊 Localizado -> casoId: ${casoId} | comunicadoId: ${comunicadoId}`);

      // 1. Localizar al representado que sea dueño de ese correo dentro del caso coincidente
      const clientesRef = db.collection('casos').doc(casoId).collection('clientes');
      const snapshot = await clientesRef.where('correo_principal', '==', email).limit(1).get();

      if (snapshot.empty) {
        console.warn(`⚠️ No existe un representado con el correo ${email} en el caso: ${casoId}`);
        continue;
      }

      const clienteDoc = snapshot.docs[0];
      const clienteId = clienteDoc.id;

      // 2. Apuntar y actualizar el historial individual del representado
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

      if (tipoEvento === 'processed' || tipoEvento === 'delivered') {
        datosActualizacion.entregado_at = fechaCR;
        datosActualizacion.estado = 'Entregado';
      } else if (tipoEvento === 'open') {
        datosActualizacion.abierto_at = fechaCR;
        datosActualizacion.estado = 'Abierto';
      } else if (tipoEvento === 'bounce') {
        datosActualizacion.rebotado_at = fechaCR;
        datosActualizacion.estado = 'Rebotado';
        datosActualizacion.causa_rebote = evento.reason || 'Rebote de entrega';
      }

      await historialRef.set(datosActualizacion, { merge: true });
      console.log(`🎉 Ficha del cliente [${clienteId}] actualizada exitosamente para el evento: ${tipoEvento}`);
    }
    
    res.status(200).send('Eventos procesados correctamente');
  } catch (error) {
    console.error('❌ Error crítico ejecutando el webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});