const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const Rating = require("../models/Rating");
const Store = require("../models/Store");
const Reservation = require("../models/Reservation");

// POST /ratings -> Calificar un comercio
router.post("/", auth, async (req, res) => {
  try {
    const { tiendaId, reservaId, puntos, comentario } = req.body;
    const usuarioId = req.user.id;

    if (!tiendaId || !puntos || puntos < 1 || puntos > 5) {
      return res.status(400).json({ message: "Calificación inválida (los puntos deben ser entre 1 y 5)" });
    }

    if (reservaId) {
      // Validar reserva
      const reserva = await Reservation.findOne({
        _id: reservaId,
        usuario: usuarioId,
        estado: { $in: ["aceptada", "completada"] }
      });

      if (!reserva) {
        return res.status(404).json({ message: "Reserva no encontrada o no elegible para calificar" });
      }

      if (reserva.calificada) {
        return res.status(400).json({ message: "Esta reserva ya ha sido calificada" });
      }

      // Crear calificación
      const rating = new Rating({
        tienda: tiendaId,
        usuario: usuarioId,
        puntos,
        comentario
      });
      await rating.save();

      // Marcar reserva como calificada
      reserva.calificada = true;
      await reserva.save();

      // Recalcular promedio de calificaciones de la tienda
      const ratings = await Rating.find({ tienda: tiendaId });
      const total = ratings.length;
      const promedio = ratings.reduce((acc, curr) => acc + curr.puntos, 0) / total;

      await Store.findByIdAndUpdate(tiendaId, {
        promedioCalificaciones: parseFloat(promedio.toFixed(1)),
        totalCalificaciones: total
      });

      return res.status(201).json(rating);
    } else {
      // Calificación general directa
      const rating = new Rating({
        tienda: tiendaId,
        usuario: usuarioId,
        puntos,
        comentario
      });
      await rating.save();

      const ratings = await Rating.find({ tienda: tiendaId });
      const total = ratings.length;
      const promedio = ratings.reduce((acc, curr) => acc + curr.puntos, 0) / total;

      await Store.findByIdAndUpdate(tiendaId, {
        promedioCalificaciones: parseFloat(promedio.toFixed(1)),
        totalCalificaciones: total
      });

      return res.status(201).json(rating);
    }
  } catch (err) {
    console.error("Error al calificar comercio:", err);
    res.status(500).json({ message: "Error interno al guardar calificación" });
  }
});

// GET /ratings/store/:storeId -> Obtener calificaciones de una tienda
router.get("/store/:storeId", async (req, res) => {
  try {
    const ratings = await Rating.find({ tienda: req.params.storeId })
      .populate("usuario", "nombre")
      .sort({ createdAt: -1 });
    res.json(ratings);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener calificaciones" });
  }
});

module.exports = router;
