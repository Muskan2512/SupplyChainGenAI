// Add this temporary route to debug your data structure
// backend/routes/chat.js
const express = require("express");
const router = express.Router();
const memoryStore = require("../data/memoryStore");
router.get("/", (req, res) => {
  const rows = memoryStore.data;
  if (!rows || rows.length === 0) {
    return res.json({ message: "No data uploaded" });
  }
  
  // const columns = Object.keys(rows[0]);
  const sampleRow = rows[0];
  
  res.json({
    totalRows: rows.length,
    rows,
    sampleRow
  });
});
module.exports = router;