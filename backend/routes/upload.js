// backend/routes/upload.js
const express = require("express");
const multer = require("multer");
const Papa = require("papaparse");
const fs = require("fs");
const { processCSV } = require("../utils/csvParser");
const memoryStore = require("../data/memoryStore");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("file"), (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  // console.log(file);
  let csvData = fs.readFileSync(file.path, "utf8");

  Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,       // ⭐ removes blank rows automatically
    transformHeader: (header) => header.trim(),
    
    complete: (results) => {
      // REMOVE invalid, empty, or undefined rows
      const cleanedRows = results.data.filter((row) => {
        if (!row) return false;
        if (typeof row !== "object") return false;

        // remove completely empty objects `{}` or rows where all values are ""
        const values = Object.values(row);
        const allEmpty = values.every(
          (v) => v === null || v === undefined || String(v).trim() === ""
        );
        return !allEmpty;
      });

      // Run your custom processing (delay, etc.)
      const processed = processCSV(cleanedRows);

      memoryStore.data = processed;
      
      console.log("Uploaded rows:", processed.length);
      console.log("Memory now contains:", memoryStore.data.length);

      res.json({
        message: "CSV uploaded, cleaned, processed",
        rows: processed.length,
      });
    },

    error: (err) => {
      res.status(500).json({ message: "CSV parse error", error: err });
    },
  });
});

module.exports = router;