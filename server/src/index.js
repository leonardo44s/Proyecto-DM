const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
require("./services/cron"); // Activa tareas programadas

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", require("./routes/authRoutes"));
app.use("/stores", require("./routes/store"));
app.use("/products", require("./routes/products"));
app.use("/lots", require("./routes/lots"));
app.use("/offers", require("./routes/offers"));
app.use("/reservations", require("./routes/reservations"));
app.use("/notifications", require("./routes/notifications"));

// Inicia cron jobs
require("./services/cron");

const PORT = process.env.PORT || 4000;
mongoose.connect(process.env.MONGODB_URI).then(() => {
  app.listen(PORT, () => console.log("Server ready in port", PORT));
});