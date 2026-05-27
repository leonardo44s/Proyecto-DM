const mongoose = require("mongoose");

const StoreSchema = new mongoose.Schema({
  nombre: String,
  direccion: String,
  coords: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: [0, 0] } // [lng, lat]
  },
  horario: {
    apertura: String,
    cierre: String
  },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  promedioCalificaciones: { type: Number, default: 0 },
  totalCalificaciones: { type: Number, default: 0 }
}, { timestamps: true });

StoreSchema.index({ coords: "2dsphere" }); // Para geolocalización futura

module.exports = mongoose.models.Store || mongoose.model("Store", StoreSchema);