const mongoose = require("mongoose");

const OfferSchema = new mongoose.Schema({
  titulo: String,
  descripcion: String,
  tipoDescuento: { type: String, enum: ["percent", "fixed"], required: true },
  valor: Number,
  inicio: Date,
  fin: Date,
  producto: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  lote: { type: mongoose.Schema.Types.ObjectId, ref: "Lot" },
  stockDisponible: Number,
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  estado: { type: String, enum: ["active", "expired", "cancelled"], default: "active" }
}, { timestamps: true });

module.exports = mongoose.models.Offer || mongoose.model("Offer", OfferSchema);