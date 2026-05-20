console.log('Inicio cron.js');
const cron = require("node-cron");
console.log('node-cron ok');
// luego los demás requires
const Lot = require("../models/Lot");
const Product = require("../models/Products");
const Store = require("../models/Store");
const { createNotification } = require("../utils/notifications");

// Corre todos los días a las 8am
cron.schedule("0 8 * * *", async () => {
  try {
    const ahora = new Date();
    const soon = new Date(ahora.getTime() + 3 * 24 * 60 * 60 * 1000); // +3 días
    // Todos los lotes con vencimiento <= soon && estado=active
    const lots = await Lot.find({
      fechaVencimiento: { $lte: soon, $gte: ahora },
      estado: "active"
    }).populate({
      path: "producto", populate: { path: "tienda" }
    });

    for (const lot of lots) {
      const tienda = lot.producto.tienda;
      // Busca owner
      const merchantId = tienda.usuario;
      await createNotification({
        recipientId: merchantId,
        message: `El lote del producto "${lot.producto.nombre}" en tu tienda "${tienda.nombre}" vence en ${Math.round((lot.fechaVencimiento - ahora)/(1000*60*60*24))} días.`,
        link: `/products/lotes`, // url de tu sistema
        data: { loteId: lot._id, productoId: lot.producto._id }
      });
    }
    // Opcional: log de lotes notificados
    console.log(`[CRON] Notificado merchants sobre lotes por vencer: ${lots.length}`);
  } catch (err) {
    console.error("[CRON] Error enviando alerta de lotes por vencer", err);
  }
});