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
      
      const smtpId = evento['smtp-id'];
      
      // Extraer el token raíz de SendGrid eliminando los subprocesos después del punto
      let sgToken = null;
      if (evento.sg_message_id) {
        sgToken = evento.sg_message_id.split('.')[0];
      }

      if (!email || (!smtpId && !sgToken)) {
        console.warn('⚠️ Saltando evento debido a falta de identificadores válidos.');
        continue;
      }

      let comunicadoDoc = null;

      // ESTRATEGIA DE DOBLE ENLACE JURÍDICO
      if (smtpId) {
        // Ruta A: Buscar por el ID universal del encabezado SMTP
        const querySnap = await db.collectionGroup('comunicados')
          .where('delivery.info.messageId', '==', smtpId)
          .limit(1)
          .get();
        
        if (!querySnap.empty) {
          comunicadoDoc = querySnap.docs[0];
          // Guardar el token de SendGrid en el documento principal para futuros eventos de apertura
          if (sgToken) {
            await comunicadoDoc.ref.update({ sg_token: sgToken });
          }
        }
      } 
      
      if (!comunicadoDoc && sgToken) {
        // Ruta B (Fallback para aperturas): Buscar por el token de tracking previamente guardado
        const querySnap = await db.collectionGroup('comunicados')
          .where('sg_token', '==', sgToken)
          .limit(1)
          .get();
        
        if (!querySnap.empty) {
          comunicadoDoc = querySnap.docs[0];
        }
      }

      if (!comunicadoDoc) {
        console.warn(`⚠️ No se logró enlazar el evento con ningún comunicado activo en el sistema.`);
        continue;
      }

      const comunicadoId = comunicadoDoc.id;
      const pathSegments = comunicadoDoc.ref.path.split('/');
      const casoId = pathSegments[1];

      // Localizar al representado correspondiente dentro del litigio
      const clientesRef = db.collection('casos').doc(casoId).collection('clientes');
      const snapshot = await clientesRef.where('correo_principal', '==', email).limit(1).get();

      if (snapshot.empty) {
        console.warn(`⚠️ No se localizó al representado con correo ${email} dentro del caso: ${casoId}`);
        continue;
      }

      const clienteId = snapshot.docs[0].id;

      // Escribir telemetría inmutable en la ficha del representado
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
        datosActualizacion.causa_rebote = evento.reason || 'Rebote duro';
      }

      await historialRef.set(datosActualizacion, { merge: true });
      console.log(`🎉 [${tipoEvento}] registrado exitosamente en la ficha del cliente: ${clienteId}`);
    }
    
    res.status(200).send('Eventos procesados correctamente');
  } catch (error) {
    console.error('❌ Error ejecutando el bucle del webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});