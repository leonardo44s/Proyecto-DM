const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  nombre: String,
  categoria: String,
  precioBase: Number,
  imagen: String,
  tienda: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

module.exports = mongoose.models.Product || mongoose.model("Product", ProductSchema);