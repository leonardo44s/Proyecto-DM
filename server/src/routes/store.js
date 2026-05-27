const express = require("express");
const router = express.Router();
const Store = require("../models/Store");
const auth = require("../middlewares/auth");
const roleGuard = require("../middlewares/roleGuard");
const { geocodeAddress, normalizeAddress } = require("../utils/geocoder");

// Create
router.post("/", auth, roleGuard("merchant"), async (req, res) => {
  try {
    let { coords, direccion, ...rest } = req.body;
    if (direccion) {
      direccion = normalizeAddress(direccion);
    }
    let parsedCoords = null;

    if (coords) {
      if (Array.isArray(coords)) {
        parsedCoords = { type: "Point", coordinates: coords };
      } else if (typeof coords === "object" && coords.coordinates) {
        parsedCoords = coords;
      }
    }

    // Si no pasaron coordenadas pero sí dirección, la buscamos por geocodificación
    if (!parsedCoords && direccion) {
      const storeCoords = await geocodeAddress(direccion);
      parsedCoords = {
        type: "Point",
        coordinates: storeCoords
      };
    }

    const s = new Store({
      ...rest,
      direccion,
      coords: parsedCoords || { type: "Point", coordinates: [-76.5226, 3.4516] }, // Fallback Cali
      usuario: req.user.id
    });
    await s.save();
    res.status(201).json(s);
  } catch (err) {
    res.status(400).json({ message: "Error", error: err });
  }
});

// Get stats for merchant dashboard
router.get("/merchant/stats", auth, roleGuard("merchant"), async (req, res) => {
  try {
    const Product = require("../models/Products");
    const Offer = require("../models/offer");
    const Reservation = require("../models/Reservation");
    
    // Find the merchant's store
    const store = await Store.findOne({ usuario: req.user.id });
    if (!store) {
      return res.status(404).json({ message: "No tienes una tienda registrada." });
    }
    
    // Count active products
    const activeProductsCount = await Product.countDocuments({ tienda: store._id });
    
    // Find merchant's offers
    const offers = await Offer.find({ usuario: req.user.id });
    const offerIds = offers.map(o => o._id);
    
    // Period filter
    const { periodo } = req.query; // 'hoy', 'semana', 'mes', 'todo'
    let dateFilter = {};
    if (periodo === "hoy") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      dateFilter = { createdAt: { $gte: startOfDay } };
    } else if (periodo === "semana") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      dateFilter = { createdAt: { $gte: oneWeekAgo } };
    } else if (periodo === "mes") {
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
      dateFilter = { createdAt: { $gte: oneMonthAgo } };
    }

    // Find reservations in this period
    const reservations = await Reservation.find({
      oferta: { $in: offerIds },
      ...dateFilter
    })
      .populate("usuario", "nombre")
      .populate({
        path: "oferta",
        populate: { path: "producto" }
      });
      
    // Global metrics (always total) for dashboard widgets
    const overallPendingCount = await Reservation.countDocuments({
      oferta: { $in: offerIds },
      estado: "pendiente"
    });
    const overallCompletedCount = await Reservation.countDocuments({
      oferta: { $in: offerIds },
      estado: "completada"
    });
    
    // Calculate total stats for the selected period
    const totalReservas = reservations.length;
    let ingresosTotales = 0;
    let totalVendidosCount = 0; // completadas
    
    const reservasPorEstado = { pendiente: 0, aceptada: 0, completada: 0, cancelada: 0, rechazada: 0 };
    const productoStatsMap = {};
    
    reservations.forEach(r => {
      if (reservasPorEstado[r.estado] !== undefined) {
        reservasPorEstado[r.estado]++;
      }
      
      const offer = r.oferta;
      if (!offer) return;
      const prod = offer.producto;
      if (!prod) return;
      
      const basePrice = prod.precioBase || 0;
      const discount = offer.descuento || 0;
      const finalPrice = basePrice * (1 - discount / 100);
      
      const prodId = prod._id.toString();
      if (!productoStatsMap[prodId]) {
        productoStatsMap[prodId] = {
          id: prodId,
          nombre: prod.nombre,
          imagen: prod.imagen,
          categoria: prod.categoria,
          reservado: 0,
          vendido: 0,
          ingresos: 0
        };
      }
      
      productoStatsMap[prodId].reservado += 1;
      
      if (r.estado === "completada") {
        ingresosTotales += finalPrice;
        totalVendidosCount += 1;
        productoStatsMap[prodId].vendido += 1;
        productoStatsMap[prodId].ingresos += finalPrice;
      }
    });
    
    // Convert maps to sorted arrays
    const productosMasVendidos = Object.values(productoStatsMap)
      .sort((a, b) => b.vendido - a.vendido || b.reservado - a.reservado);
      
    // Group categories
    const categoriaStatsMap = {};
    Object.values(productoStatsMap).forEach(p => {
      const cat = p.categoria || "Otros";
      if (!categoriaStatsMap[cat]) {
        categoriaStatsMap[cat] = {
          categoria: cat,
          reservado: 0,
          vendido: 0,
          ingresos: 0
        };
      }
      categoriaStatsMap[cat].reservado += p.reservado;
      categoriaStatsMap[cat].vendido += p.vendido;
      categoriaStatsMap[cat].ingresos += p.ingresos;
    });
    
    const ventasPorCategoria = Object.values(categoriaStatsMap)
      .sort((a, b) => b.ingresos - a.ingresos);

    // Recent activities (always last 5 for dashboard)
    const recentReservations = await Reservation.find({ oferta: { $in: offerIds } })
      .populate("usuario", "nombre")
      .populate({ path: "oferta", populate: { path: "producto" } })
      .sort({ createdAt: -1 })
      .limit(5);
      
    const activities = recentReservations.map(reserva => {
      const timeAgo = Math.round((new Date() - new Date(reserva.createdAt)) / 60000);
      let timeStr = `Hace ${timeAgo} minutos`;
      if (timeAgo >= 60) {
        const hours = Math.round(timeAgo / 60);
        timeStr = hours === 1 ? "Hace 1 hora" : `Hace ${hours} horas`;
      }
      if (timeAgo >= 1440) {
        const days = Math.round(timeAgo / 1440);
        timeStr = days === 1 ? "Hace 1 día" : `Hace ${days} días`;
      }
      
      let tituloStr = "Nueva reserva";
      let colorStr = "#1976D2";
      
      if (reserva.estado === "pendiente") {
        tituloStr = "Nueva reserva confirmada";
        colorStr = "#E65100";
      } else if (reserva.estado === "aceptada") {
        tituloStr = "Reserva aceptada";
        colorStr = "#2E7D32";
      } else if (reserva.estado === "completada") {
        tituloStr = "Reserva entregada (completada)";
        colorStr = "#1976D2";
      } else if (reserva.estado === "cancelada" || reserva.estado === "rechazada") {
        tituloStr = `Reserva ${reserva.estado}`;
        colorStr = "#D32F2F";
      }
      
      return {
        id: reserva._id,
        tipo: reserva.estado,
        titulo: tituloStr,
        descripcion: `${reserva.oferta?.producto?.nombre || 'Producto'} - por ${reserva.usuario?.nombre || 'Cliente'}`,
        fecha: timeStr,
        color: colorStr
      };
    });

    const savedFoodWeight = Math.round(overallCompletedCount * 1.5 * 10) / 10;
    
    res.json({
      storeName: store.nombre,
      productosActivos: activeProductsCount,
      reservasPendientes: overallPendingCount,
      rescatesCompletados: overallCompletedCount,
      alimentosSalvados: savedFoodWeight,
      actividades: activities,
      // Detailed stats
      totalReservas,
      ingresosTotales: Math.round(ingresosTotales * 100) / 100,
      totalVendidos: totalVendidosCount,
      reservasPorEstado,
      productosMasVendidos,
      ventasPorCategoria
    });
  } catch (err) {
    console.error("Error al obtener estadísticas del comerciante:", err);
    res.status(500).json({ message: "Error interno", error: err.message });
  }
});

// Get Single
router.get("/:id", async (req, res) => {
  const store = await Store.findById(req.params.id);
  res.json(store);
});

// Update
router.put("/:id", auth, roleGuard("merchant"), async (req, res) => {
  try {
    let { coords, direccion, ...rest } = req.body;
    if (direccion) {
      direccion = normalizeAddress(direccion);
    }
    let parsedCoords = null;

    if (coords) {
      if (Array.isArray(coords)) {
        parsedCoords = { type: "Point", coordinates: coords };
      } else if (typeof coords === "object" && coords.coordinates) {
        parsedCoords = coords;
      }
    }

    // Si la dirección cambió y no pasaron nuevas coordenadas, la geocodificamos
    if (!parsedCoords && direccion) {
      const storeCoords = await geocodeAddress(direccion);
      parsedCoords = {
        type: "Point",
        coordinates: storeCoords
      };
    }

    const updateFields = { ...rest, direccion };
    if (parsedCoords) {
      updateFields.coords = parsedCoords;
    }

    const store = await Store.findOneAndUpdate(
      { _id: req.params.id, usuario: req.user.id },
      { $set: updateFields },
      { new: true }
    );
    res.json(store);
  } catch (err) {
    res.status(400).json({ message: "Error al actualizar tienda", error: err });
  }
});

// Delete
router.delete("/:id", auth, roleGuard("merchant"), async (req, res) => {
  await Store.deleteOne({ _id: req.params.id, usuario: req.user.id });
  res.json({ message: "Tienda eliminada" });
});

// List (all or by search)
router.get("/", async (req, res) => {
  const filter = {};
  if (req.query.nombre) filter.nombre = { $regex: req.query.nombre, $options: "i" };
  const stores = await Store.find(filter);
  res.json(stores);
});

module.exports = router;