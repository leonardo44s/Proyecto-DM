const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const Notificacion = require("../models/Notification");

// Listar notificaciones del usuario actual
router.get("/", auth, async (req, res) => {
  const notis = await Notificacion.find({ usuario: req.user.id });
  res.json(notis);
});

// Crear notificación (opcional, por lógica de negocio)
router.post("/", auth, async (req, res) => {
  const { mensaje } = req.body;
  const noti = new Notificacion({ usuario: req.user.id, mensaje });
  await noti.save();
  res.status(201).json(noti);
});

// Marcar como leída
router.put("/:id/leida", auth, async (req, res) => {
  const noti = await Notificacion.findOneAndUpdate(
    { _id: req.params.id, usuario: req.user.id },
    { leida: true },
    { new: true }
  );
  res.json(noti);
});

module.exports = router;