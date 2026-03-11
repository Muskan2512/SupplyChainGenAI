// backend/data/memoryStore.js

// This module holds the processed supply chain data in memory.
// It can be accessed and updated by different routes (upload, chat, dashboard).

const memoryStore = {
  data: [] // will store the processed rows from the uploaded CSV
};

module.exports = memoryStore;