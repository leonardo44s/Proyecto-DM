const mongoose = require("mongoose");

const ReservaSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  oferta: { type: mongoose.Schema.Types.ObjectId, ref: "Offer", required: true },
  fecha: Date,
  notas: String
}, { timestamps: true });

module.exports = mongoose.model("Reserva", ReservaSchema);