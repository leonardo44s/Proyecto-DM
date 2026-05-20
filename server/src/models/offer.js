const mongoose = require("mongoose");

const OfferSchema = new mongoose.Schema({
  titulo: String,
  descripcion: String,
  descuento: Number,
  producto: { type: mongoose.Schema.Types.ObjectId, ref: "Producto", required: true },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

module.exports = mongoose.model("Offer", OfferSchema);