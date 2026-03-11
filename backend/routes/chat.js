// backend/routes/chat.js
const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const memoryStore = require("../data/memoryStore");
require('dotenv').config();
const router = express.Router();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash-lite",
  generationConfig: {
    temperature: 0.2,
    maxOutputTokens: 800, // Increased to allow for order details
  }
});

// Helper function to extract value with multiple possible column names
function extractValue(row, possibleNames) {
  for (const name of possibleNames) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
      return row[name];
    }
  }
  return null;
}

// Calculate delay from dates
function calculateDelay(orderDate, shipDate) {
  if (!orderDate || !shipDate) return null;
  
  try {
    const order = new Date(orderDate);
    const ship = new Date(shipDate);
    
    if (isNaN(order) || isNaN(ship)) return null;
    
    const diffTime = Math.abs(ship - order);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch (e) {
    return null;
  }
}

// Enhanced data summary function with ALL order details
function createDataSummary(rows) {
  const warehouses = {};
  const products = {};
  const customers = {}; // Add customer tracking
  const allOrders = [];
  const delayedOrders = [];
  let totalDelay = 0;
  let validRows = 0;

  rows.forEach((row, index) => {
    // Extract ALL fields, don't filter by delay
    const orderId = extractValue(row, [
      'OrderID', 'OrderId', 'order_id', 'Order ID', 'Order_ID',
      'id', 'ID', 'order'
    ]) || `ORDER-${index + 1}`;

    // Extract customer (THIS WAS MISSING!)
    const customer = extractValue(row, [
      'Customer', 'customer', 'CUSTOMER', 'customer_name', 
      'CustomerName', 'client', 'Client'
    ]) || 'Unknown';

    const warehouse = extractValue(row, [
      'Warehouse', 'warehouse', 'WH', 'wh', 'WAREHOUSE',
      'warehouse_name', 'WarehouseName'
    ]) || 'Unknown';

    const product = extractValue(row, [
      'Product', 'product', 'PRODUCT', 'SKU', 'sku',
      'item', 'Item', 'product_name'
    ]) || 'Unknown';

    const orderDate = extractValue(row, [
      'Order_Date', 'OrderDate', 'order_date', 'Order Date',
      'ORDER_DATE', 'orderdate'
    ]);
    
    const shipDate = extractValue(row, [
      'Ship_Date', 'ShipDate', 'ship_date', 'Ship Date',
      'SHIP_DATE', 'shipdate'
    ]);

    const deliveryDate = extractValue(row, [
      'Delivery_Date', 'DeliveryDate', 'delivery_date', 'Delivery Date',
      'DELIVERY_DATE', 'deliverydate'
    ]);

    const quantity = extractValue(row, [
      'Quantity', 'quantity', 'QUANTITY', 'qty', 'Qty'
    ]) || 0;

    const status = extractValue(row, [
      'Status', 'status', 'STATUS', 'order_status'
    ]) || 'Unknown';

    // Calculate delay (but don't filter by it)
    let delay = 0;
    if (orderDate && shipDate) {
      const calculatedDelay = calculateDelay(orderDate, shipDate);
      if (calculatedDelay !== null) {
        delay = calculatedDelay;
      }
    }

    // If delay calculation failed, try direct delay field
    if (delay === 0) {
      const delayValue = extractValue(row, [
        'delay', 'Delay', 'shipping_delay', 'ShippingDelay',
        'delivery_days', 'DeliveryDays', 'delivery_time_days'
      ]);
      if (delayValue) {
        delay = parseFloat(delayValue);
      }
    }

    // Count this row regardless of delay value
    validRows++;
    totalDelay += delay;

    // Create complete order object with ALL fields
    const order = {
      orderId: orderId,
      customer: customer,  // NOW INCLUDING CUSTOMER!
      warehouse: warehouse,
      product: product,
      quantity: quantity,
      status: status,
      delay: delay,
      orderDate: orderDate || 'N/A',
      shipDate: shipDate || 'N/A',
      deliveryDate: deliveryDate || 'N/A',
      isDelayed: delay > 3
    };
    
    allOrders.push(order);

    // Track delayed orders (>3 days)
    if (delay > 3) {
      delayedOrders.push(order);
    }

    // Track customers for top customer analysis
    if (customer !== 'Unknown') {
      if (!customers[customer]) {
        customers[customer] = {
          orderCount: 0,
          totalQuantity: 0,
          orders: []
        };
      }
      customers[customer].orderCount++;
      customers[customer].totalQuantity += parseInt(quantity) || 1;
      customers[customer].orders.push(order);
    }

    // Warehouse statistics (include all orders)
    if (!warehouses[warehouse]) {
      warehouses[warehouse] = { 
        totalDelay: 0, 
        count: 0, 
        delays: [],
        orders: []
      };
    }
    warehouses[warehouse].totalDelay += delay;
    warehouses[warehouse].count++;
    warehouses[warehouse].delays.push(delay);
    warehouses[warehouse].orders.push(order);

    // Product statistics
    if (product !== 'Unknown') {
      if (!products[product]) {
        products[product] = { 
          totalDelay: 0, 
          count: 0,
          delays: []
        };
      }
      products[product].totalDelay += delay;
      products[product].count++;
      products[product].delays.push(delay);
    }
  });

  // Sort customers by order count for "top customers"
  const customerList = Object.entries(customers)
    .map(([name, stats]) => ({
      name,
      orderCount: stats.orderCount,
      totalQuantity: stats.totalQuantity,
      avgQuantity: (stats.totalQuantity / stats.orderCount).toFixed(1)
    }))
    .sort((a, b) => b.orderCount - a.orderCount);

  // Create warehouse performance list
  const warehouseList = Object.entries(warehouses).map(([name, stats]) => {
    const avgDelay = stats.totalDelay / stats.count;
    const delayedCount = stats.delays.filter(d => d > 3).length;
    return {
      name,
      avgDelay,
      count: stats.count,
      delayedCount,
      maxDelay: Math.max(...stats.delays),
      orders: stats.orders
    };
  }).sort((a, b) => b.avgDelay - a.avgDelay);

  // Create product performance list
  const productList = Object.entries(products).map(([name, stats]) => ({
    name,
    avgDelay: stats.totalDelay / stats.count,
    count: stats.count,
    minDelay: Math.min(...stats.delays),
    maxDelay: Math.max(...stats.delays)
  })).sort((a, b) => a.avgDelay - b.avgDelay);

  // Create comprehensive summary for Gemini with ALL data
  let summary = `📊 **SUPPLY CHAIN DATA SUMMARY**\n\n`;
  summary += `Total orders in dataset: ${validRows}\n`;
  summary += `Overall average delay: ${(totalDelay/validRows).toFixed(2)} days\n`;
  summary += `Orders delayed >3 days: ${delayedOrders.length} (${((delayedOrders.length/validRows)*100).toFixed(1)}%)\n\n`;

  // Customer insights (NEW!)
  if (customerList.length > 0) {
    summary += `👥 **TOP CUSTOMERS BY ORDER VOLUME:**\n`;
    customerList.slice(0, 5).forEach((c, index) => {
      summary += `${index + 1}. **${c.name}**: ${c.orderCount} orders`;
      if (c.totalQuantity > c.orderCount) {
        summary += ` (${c.totalQuantity} items total)`;
      }
      summary += `\n`;
    });
    summary += `\n`;
  }

  // Warehouse performance
  summary += `🏭 **WAREHOUSE PERFORMANCE:**\n`;
  warehouseList.slice(0, 10).forEach(w => {
    summary += `• ${w.name}: ${w.avgDelay.toFixed(2)} days avg (${w.count} orders, ${w.delayedCount} delayed >3d, max: ${w.maxDelay} days)\n`;
  });

  // Product performance
  if (productList.length > 0) {
    summary += `\n📦 **PRODUCT PERFORMANCE:**\n`;
    productList.slice(0, 10).forEach(p => {
      summary += `• ${p.name}: ${p.avgDelay.toFixed(2)} days avg (${p.count} orders, range: ${p.minDelay}-${p.maxDelay} days)\n`;
    });
  }

  // Sample of recent orders (first 5)
  if (allOrders.length > 0) {
    summary += `\n📋 **RECENT ORDERS SAMPLE:**\n`;
    allOrders.slice(0, 5).forEach((order, index) => {
      summary += `${index + 1}. Order ${order.orderId}: ${order.customer} - ${order.product} `;
      summary += `(${order.warehouse}, ${order.delay} days, ${order.status})\n`;
    });
  }

  // Detailed delayed orders (if any)
  if (delayedOrders.length > 0) {
    summary += `\n⚠️ **DELAYED ORDERS (>3 DAYS):**\n`;
    delayedOrders.slice(0, 10).forEach((order, index) => {
      summary += `${index + 1}. Order ${order.orderId}: ${order.delay} days | `;
      summary += `Customer: ${order.customer} | `;
      summary += `Warehouse: ${order.warehouse} | `;
      summary += `Product: ${order.product}\n`;
    });
  }

  return {
    summary,
    warehouseList,
    productList,
    customerList,  // Return for potential use
    delayedOrders,
    allOrders,
    stats: {
      totalOrders: validRows,
      overallAvgDelay: totalDelay/validRows,
      delayedCount: delayedOrders.length
    }
  };
}
// Debug route to see data structure
router.get("/debug-data", (req, res) => {
  const rows = memoryStore.data;
  if (!rows || rows.length === 0) {
    return res.json({ message: "No data uploaded" });
  }
  
  const columns = Object.keys(rows[0]);
  const sampleRow = rows[0];
  
  // Also show calculated analysis
  const analysis = createDataSummary(rows);
  
  res.json({
    totalRows: rows.length,
    columns,
    sampleRow,
    summary: {
      totalOrders: analysis.stats.totalOrders,
      delayedOrders: analysis.stats.delayedCount,
      overallAvgDelay: analysis.stats.overallAvgDelay.toFixed(2)
    },
    delayedOrdersSample: analysis.delayedOrders.slice(0, 3) // Show first 3 delayed orders
  });
});

// Chat endpoint
router.post("/", async (req, res) => {
  const { query } = req.body;

  if (!query || query.trim() === "") {
    return res.status(400).json({ answer: "Please ask a question." });
  }

  const rows = memoryStore.data;

  if (!rows || rows.length === 0) {
    return res.json({ answer: "No data uploaded yet. Please upload a CSV file first." });
  }

  try {
    // Create enhanced data summary
    const analysis = createDataSummary(rows);
    
    // Check if we have valid data
    if (analysis.stats.totalOrders === 0) {
      return res.json({ 
        answer: `I couldn't find valid shipping delay data in your CSV. Please check your date columns.` 
      });
    }

    // Create prompt for Gemini with the enhanced summary
    const prompt = `You are a supply chain AI copilot. You have access to the following shipping data:

${analysis.summary}

Based on this data, answer this question: "${query}"

Guidelines:
- If asked about delayed orders, LIST the specific order IDs with their details
- If asked about fastest products, mention the product names and their average delays
- If asked about warehouse performance, include the average delays and order counts
- Be concise but provide specific details when available
- If the question asks for something not in the data, say so politely

Answer:`;

    console.log("Sending prompt to Gemini...");
    
    // Call Gemini API
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let answer = response.text();

    // If answer is empty or too short, provide a fallback based on the data
    if (!answer || answer.length < 20) {
      const lowerQuery = query.toLowerCase();
      
      if (lowerQuery.includes('delayed more than 3') || lowerQuery.includes('orders delayed > 3')) {
        if (analysis.delayedOrders.length > 0) {
          answer = `**${analysis.delayedOrders.length} orders were delayed more than 3 days:**\n\n`;
          analysis.delayedOrders.forEach((order, idx) => {
            answer += `${idx + 1}. **Order ${order.orderId}**: ${order.delay} days delay\n`;
            answer += `   • Warehouse: ${order.warehouse}\n`;
            answer += `   • Product: ${order.product}\n`;
            answer += `   • Order Date: ${order.orderDate}\n`;
            answer += `   • Ship Date: ${order.shipDate}\n\n`;
          });
        } else {
          answer = "No orders were delayed more than 3 days.";
        }
      }
      else if (lowerQuery.includes('highest shipping delay') || lowerQuery.includes('most delays')) {
        const worst = analysis.warehouseList[0];
        answer = `**${worst.name}** has the highest average shipping delay of **${worst.avgDelay.toFixed(2)} days**.\n\n`;
        answer += `Details:\n`;
        answer += `• Orders processed: ${worst.count}\n`;
        answer += `• Orders delayed >3 days: ${worst.delayedCount}\n`;
        answer += `• Maximum delay: ${worst.maxDelay} days\n`;
      }
      else if (lowerQuery.includes('fastest product') || lowerQuery.includes('product ships fastest')) {
        if (analysis.productList.length > 0) {
          const fastest = analysis.productList[0];
          answer = `**${fastest.name}** ships fastest with an average of **${fastest.avgDelay.toFixed(2)} days**.\n\n`;
          
          // Find all products with same delay
          const fastestProducts = analysis.productList.filter(p => p.avgDelay === fastest.avgDelay);
          if (fastestProducts.length > 1) {
            answer = `The fastest shipping products are: `;
            answer += fastestProducts.map(p => `**${p.name}**`).join(', ');
            answer += `, all with an average delay of **${fastest.avgDelay.toFixed(2)} days**.\n\n`;
          }
        } else {
          answer = "Product information is not available in the dataset.";
        }
      }
    }

    return res.json({ answer });

  } catch (error) {
    console.error("Gemini API error:", error);
    
    if (error.message?.includes("429") || error.message?.includes("quota")) {
      return res.status(429).json({ 
        answer: "Rate limit reached. Please wait a moment before asking another question." 
      });
    }
    
    if (error.message?.includes("API_KEY_INVALID")) {
      return res.status(500).json({ 
        answer: "API key error. Please check your GEMINI_API_KEY in .env file." 
      });
    }
    
    return res.status(500).json({ 
      answer: "Sorry, I encountered an error. Please try again." 
    });
  }
});

module.exports = router;