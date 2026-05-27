const mongoose = require("mongoose");

const ReservationSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  oferta: { type: mongoose.Schema.Types.ObjectId, ref: "Offer", required: true },
  estado: { type: String, enum: ["pendiente", "aceptada", "rechazada", "cancelada", "completada"], default: "pendiente" },
  fecha: Date,
  notas: String,
  calificada: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.models.Reservation || mongoose.model("Reservation", ReservationSchema);