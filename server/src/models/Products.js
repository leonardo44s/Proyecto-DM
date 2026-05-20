const mongoose = require("mongoose");

const ProductoSchema = new mongoose.Schema({
  nombre: String,
  descripcion: String,
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

module.exports = mongoose.model("Producto", ProductoSchema);