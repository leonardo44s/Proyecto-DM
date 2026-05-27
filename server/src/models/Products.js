const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  nombre: String,
  descripcion: String,
  categoria: String,
  precioBase: Number,
  cantidad: { type: Number, default: 0 },
  imagen: String,
  tienda: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

module.exports = mongoose.models.Product || mongoose.model("Product", ProductSchema);