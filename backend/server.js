// backend/server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const uploadRoutes = require("./routes/upload");
const chatRoutes = require("./routes/chat");
const debugData=require("./routes/debugData");
require('dotenv').config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use("/upload", uploadRoutes);
app.use("/chat", chatRoutes);
// app.use("/dashboard", dashboardRoutes);
app.use("/debug",debugData);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});