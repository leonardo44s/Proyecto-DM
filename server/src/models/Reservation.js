const mongoose = require("mongoose");

const ReservationSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  oferta: { type: mongoose.Schema.Types.ObjectId, ref: "Offer", required: true },
  cantidad: { type: Number, default: 1 },
  estado: { type: String, enum: ["pending", "accepted", "rejected", "cancelled", "picked_up", "expired"], default: "pending" },
  fecha: Date, // Fecha solicitada para recoger
  notas: String
}, { timestamps: true });

module.exports = mongoose.model("Reservation", ReservationSchema);