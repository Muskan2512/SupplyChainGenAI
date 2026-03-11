// backend/utils/csvParser.js
const dayjs = require("dayjs");

function processCSV(data) {
  const cleaned = [];

  data.forEach((row) => {
    if (!row) return;

    // Map your CSV headers
    const orderId = row.OrderID || row.order_id;
    const customerName = row.Customer;
    const productName = row.Product;
    const warehouse = row.Warehouse;
    const orderDateStr = row.Order_Date;
    const shipDateStr = row.Ship_Date;
    const deliveryDateStr = row.Delivery_Date;
    const quantityStr = row.Quantity;
    const status = row.Status;

    // Required-check
    if (!orderId || !orderDateStr || !deliveryDateStr) {
      return; // skip invalid row
    }

    // Parse dates
    const orderDate = dayjs(orderDateStr);
    const deliveryDate = dayjs(deliveryDateStr);

    if (!orderDate.isValid() || !deliveryDate.isValid()) return;

    // Compute delivery time
    const deliveryTimeDays = deliveryDate.diff(orderDate, "day");

    cleaned.push({
      order_id: String(orderId).trim(),
      customer_name: customerName?.trim() || "",
      product_name: productName?.trim() || "",
      warehouse: warehouse?.trim() || "",
      order_date: orderDate.format("YYYY-MM-DD"),
      delivery_date: deliveryDate.format("YYYY-MM-DD"),
      ship_date: shipDateStr || "",
      quantity: isNaN(parseInt(quantityStr)) ? 0 : parseInt(quantityStr),
      status: status?.trim() || "",
      delivery_time_days: deliveryTimeDays,
    });
  });

  return cleaned;
}

module.exports = { processCSV };