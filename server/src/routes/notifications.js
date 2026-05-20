const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const Notification = require("../models/Notification");

// Listar notificaciones del usuario actual
router.get("/", auth, async (req, res) => {
  const notis = await Notification.find({ usuario: req.user.id })
    .sort({ createdAt: -1 });
  res.json(notis);
});

// Marcar como leída
router.put("/:id/leida", auth, async (req, res) => {
  const noti = await Notification.findOneAndUpdate(
    { _id: req.params.id, usuario: req.user.id },
    { leida: true },
    { new: true }
  );
  res.json(noti);
});

module.exports = router;