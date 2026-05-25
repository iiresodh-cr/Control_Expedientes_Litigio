const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

exports.webhookSendGrid = functions.https.onRequest(async (req, res) => {
  const eventos = req.body;

  // 🔴 LOG CRÍTICO: Imprime el objeto exacto que manda SendGrid para ver sus llaves reales
  console.log("👉 PAYLOAD TOTAL RECIBIDO DE SENDGRID:", JSON.stringify(eventos));

  if (!Array.isArray(eventos)) {
    console.error("❌ El payload recibido no es un arreglo válido de eventos.");
    res.status(400).send('Formato de carga inválido');
    return;
  }

  try {
    for (const [index, evento] of eventos.entries()) {
      console.log(`🔍 Procesando evento #${index}: Tipo = ${evento.event} | Destinatario = ${evento.email}`);
      
      const email = evento.email;
      const tipoEvento = evento.event; 
      const timestamp = evento.timestamp * 1000; 
      const fechaCR = new Date(timestamp).toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' });

      // Intentar extraer los custom arguments de SendGrid
      const casoId = evento.casoId;
      const comunicadoId = evento.comunicadoId;

      console.log(`📊 Variables extraídas -> casoId: ${casoId} | comunicadoId: ${comunicadoId}`);

      if (!casoId || !comunicadoId || !email) {
        console.warn(`⚠️ Saltando evento #${index} debido a que faltan datos clave (casoId, comunicadoId o email vacíos).`);
        continue;
      }

      // 1. Localizar al representado por su correo electrónico principal
      const clientesRef = db.collection('casos').doc(casoId).collection('clientes');
      const snapshot = await clientesRef.where('correo_principal', '==', email).limit(1).get();

      if (snapshot.empty) {
        console.warn(`⚠️ No se localizó ningún representado con el correo ${email} dentro del caso: ${casoId}`);
        continue;
      }

      const clienteDoc = snapshot.docs[0];
      const clienteId = clienteDoc.id;
      console.log(`✅ Representado localizado con ID: ${clienteId}. Escribiendo marcas temporales...`);

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

      await historialRef.set(datosActualizacion, { merge: true });
      console.log(`🎉 Historial actualizado con éxito en Firestore para el comunicado: ${comunicadoId}`);
    }
    
    res.status(200).send('Eventos procesados correctamente');
  } catch (error) {
    console.error('❌ Error crítico en el bucle del webhookSendGrid:', error);
    res.status(500).send('Internal Server Error');
  }
});