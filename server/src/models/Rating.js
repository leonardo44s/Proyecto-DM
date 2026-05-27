const mongoose = require("mongoose");

const RatingSchema = new mongoose.Schema({
  tienda: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  puntos: { type: Number, required: true, min: 1, max: 5 },
  comentario: String
}, { timestamps: true });

// Índice único por usuario y tienda para evitar calificaciones duplicadas por la misma reserva/compra si es necesario, 
// pero permitiremos que califiquen diferentes transacciones si se realiza por reserva.
module.exports = mongoose.models.Rating || mongoose.model("Rating", RatingSchema);
