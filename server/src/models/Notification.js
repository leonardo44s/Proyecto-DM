const mongoose = require("mongoose");

const NotificacionSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  mensaje: String,
  leida: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Notificacion", NotificacionSchema);