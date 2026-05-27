const nodemailer = require("nodemailer");

async function sendResetEmail(email, code) {
  let transporter;

  // Usar configuración real SMTP si está en .env
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Desarrollo: Usar Ethereal Email como fallback
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch (err) {
      console.warn("[MAILER] No se pudo inicializar transporte de pruebas, usando consola");
    }
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || '"ResYet" <no-reply@resyet.com>',
    to: email,
    subject: "Código de recuperación de contraseña - ResYet",
    text: `Tu código para restablecer la contraseña es: ${code}\n\nEste código vencerá en 1 hora.`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #2E7D32; text-align: center; font-weight: bold;">ResYet</h2>
        <p>Hola,</p>
        <p>Has solicitado restablecer tu contraseña en la aplicación ResYet. Utiliza el siguiente código para completar el proceso:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2E7D32; border: 2px dashed #2E7D32; padding: 10px 20px; border-radius: 4px; display: inline-block;">
            ${code}
          </span>
        </div>
        <p style="color: #666; font-size: 13px; text-align: center;">Este código es válido por 1 hora. Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
      </div>
    `,
  };

  // Siempre loguear en consola para facilitar pruebas rápidas
  console.log("\n==================================================");
  console.log(`[MAILER] CÓDIGO DE RECUPERACIÓN PARA ${email}: ${code}`);
  console.log("==================================================\n");

  if (transporter) {
    try {
      const info = await transporter.sendMail(mailOptions);
      if (!process.env.SMTP_HOST) {
        console.log(`[MAILER] Email de prueba enviado. URL de vista previa: ${nodemailer.getTestMessageUrl(info)}`);
      }
      return info;
    } catch (e) {
      console.error("[MAILER] Error al enviar email:", e);
      return { message: "Error al enviar, ver consola" };
    }
  } else {
    return { message: "Consola logueada" };
  }
}

async function sendNotificationEmail(email, subject, messageText) {
  let transporter;

  // Usar configuración real SMTP si está en .env
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Desarrollo: Usar Ethereal Email como fallback
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch (err) {
      console.warn("[MAILER] No se pudo inicializar transporte de pruebas, usando consola");
    }
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || '"ResYet" <no-reply@resyet.com>',
    to: email,
    subject: subject,
    text: messageText,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #00B050; text-align: center; font-weight: bold;">ResYet</h2>
        <p>Hola,</p>
        <p>Tienes una nueva notificación de ResYet:</p>
        <div style="background-color: #F4FDF7; padding: 15px; border-left: 4px solid #00B050; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 16px; color: #333;">${messageText}</p>
        </div>
        <p style="color: #666; font-size: 13px; text-align: center;">Puedes ver más detalles ingresando a la aplicación.</p>
      </div>
    `,
  };

  // Loguear en consola para facilitar desarrollo
  console.log("\n==================================================");
  console.log(`[MAILER] ENVIANDO EMAIL DE NOTIFICACIÓN PARA ${email}`);
  console.log(`ASUNTO: ${subject}`);
  console.log(`MENSAJE: ${messageText}`);
  console.log("==================================================\n");

  if (transporter) {
    try {
      const info = await transporter.sendMail(mailOptions);
      if (!process.env.SMTP_HOST) {
        console.log(`[MAILER] Email de notificación enviado. Vista previa: ${nodemailer.getTestMessageUrl(info)}`);
      }
      return info;
    } catch (e) {
      console.error("[MAILER] Error al enviar email de notificación:", e);
      return { error: e.message };
    }
  }
}

module.exports = { sendResetEmail, sendNotificationEmail };

