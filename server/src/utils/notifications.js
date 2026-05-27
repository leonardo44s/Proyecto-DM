const Notification = require("../models/Notification");
const User = require("../models/User");
const { sendNotificationEmail } = require("./mailer");

// recipientId o roleRecipient es obligatorio
async function createNotification({ recipientId = null, message }) {
  const noti = await Notification.create({
    usuario: recipientId,
    mensaje: message,
    leida: false
  });

  if (recipientId) {
    try {
      const user = await User.findById(recipientId);
      if (user && user.email) {
        // Enviar correo de notificación asíncronamente (sin bloquear respuesta HTTP)
        sendNotificationEmail(user.email, "Nueva notificación - ResYet", message).catch(err => {
          console.error("[MAILER-NOTI] Error asíncrono al enviar correo:", err);
        });
      }
    } catch (err) {
      console.error("[MAILER-NOTI] Error buscando correo del destinatario:", err);
    }
  }

  return noti;
}

module.exports = { createNotification };