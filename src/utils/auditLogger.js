import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Registra una acción de auditoría inmutable en Firestore con estándar Enterprise.
 * @param {string} usuarioEmail - Correo del usuario que ejecuta la acción.
 * @param {string} accion - Título o clasificación de la acción (Ej: "Eliminación de Caso").
 * @param {string} detalles - Metadatos o descripción detallada del movimiento.
 */
export const registrarLogAuditoria = async (usuarioEmail, accion, detalles = '') => {
  try {
    await addDoc(collection(db, 'logs_auditoria'), {
      usuario: usuarioEmail,
      accion: accion,
      detalles: detalles,
      fecha: serverTimestamp()
    });
  } catch (err) {
    console.error('Error crítico e irreversible al intentar escribir en el log de auditoría enterprise:', err);
  }
};