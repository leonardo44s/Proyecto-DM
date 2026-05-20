const mongoose = require("mongoose");

const LotSchema = new mongoose.Schema({
  producto: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  cantidadTotal: Number,
  cantidadDisponible: Number,
  fechaEntrada: Date,
  fechaVencimiento: Date,
  estado: { type: String, enum: ["active", "exhausted", "expired"], default: "active" }
}, { timestamps: true });

LotSchema.index({ fechaVencimiento: 1 });

module.exports = mongoose.models.Lot || mongoose.model("Lot", LotSchema);