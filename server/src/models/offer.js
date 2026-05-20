const mongoose = require("mongoose");

const OfferSchema = new mongoose.Schema({
  titulo: String,
  descripcion: String,
  descuento: Number,
  producto: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  activa: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.models.Offer || mongoose.model("Offer", OfferSchema);