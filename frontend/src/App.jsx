import React, { useState, useEffect } from 'react';
import { 
  FiMenu, 
  FiUpload, 
  FiMessageSquare, 
  FiPackage, 
  FiBarChart2,
  FiHome,
  FiLogOut,
  FiDownload,
  FiTrendingUp,
  FiClock,
  FiAlertCircle,
  FiCheckCircle,
  FiRefreshCw
} from 'react-icons/fi';
import Chat from './components/ChatAI';
import Orders from './components/Orders';
import UploadCSV from './components/FileUpload';
import axios from 'axios';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [uploadedData, setUploadedData] = useState(null);
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    delayedOrders: 0,
    avgDeliveryTime: 0,
    onTimeDelivery: 0,
    totalWarehouses: 0,
    totalProducts: 0
  });
  const [loading, setLoading] = useState(false);

  // Fetch metrics from debug endpoint
  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/debug');
      console.log('Debug data for metrics:', response.data);
      
      if (response.data && response.data.length > 0) {
        const orders = response.data;
        setUploadedData(response.data.rows);
        calculateMetrics(orders);
      } else if (response.data && response.data.rows) {
        const orders = response.data.rows;
        setUploadedData(response.data.rows);
        calculateMetrics(orders);
      } else {
        // Reset metrics if no data
        setMetrics({
          totalOrders: 0,
          delayedOrders: 0,
          avgDeliveryTime: 0,
          onTimeDelivery: 0,
          totalWarehouses: 0,
          totalProducts: 0
        });
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics from orders data
  const calculateMetrics = (orders) => {
    if (!orders || orders.length === 0) return;

    const totalOrders = orders.length;
    
    // Calculate delayed orders (>3 days)
    let delayedCount = 0;
    let totalDelay = 0;
    const warehouses = new Set();
    const products = new Set();

    orders.forEach(order => {
      // Get delay from delivery_time_days or calculate from dates
      let delay = order.delivery_time_days || 0;
      
      if (!delay && order.order_date && order.ship_date) {
        const orderDate = new Date(order.order_date);
        const shipDate = new Date(order.ship_date);
        if (!isNaN(orderDate) && !isNaN(shipDate)) {
          delay = Math.ceil((shipDate - orderDate) / (1000 * 60 * 60 * 24));
        }
      }

      if (delay > 3) {
        delayedCount++;
      }
      
      totalDelay += delay;

      // Add to unique sets
      if (order.warehouse) warehouses.add(order.warehouse);
      if (order.product_name) products.add(order.product_name);
    });

    const avgDeliveryTime = totalOrders > 0 ? (totalDelay / totalOrders).toFixed(1) : 0;
    const onTimeDelivery = totalOrders > 0 ? ((totalOrders - delayedCount) / totalOrders * 100).toFixed(1) : 0;

    setMetrics({
      totalOrders,
      delayedOrders: delayedCount,
      avgDeliveryTime: parseFloat(avgDeliveryTime),
      onTimeDelivery: parseFloat(onTimeDelivery),
      totalWarehouses: warehouses.size,
      totalProducts: products.size
    });
  };

  // Handle data upload from UploadCSV component
  const handleDataUploaded = (data) => {
    setUploadedData(data);
    // Fetch fresh metrics after upload
    fetchMetrics();
    // Switch to dashboard to show metrics
    setActiveTab('dashboard');
  };

  // Fetch metrics on component mount and when uploadedData changes
  useEffect(() => {
    if (uploadedData && uploadedData.length > 0) {
      console.log(uploadedData);
      calculateMetrics(uploadedData);
    } else {
      fetchMetrics();
    }
  }, [uploadedData]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FiHome },
    { id: 'upload', label: 'Upload CSV', icon: FiUpload },
    { id: 'orders', label: 'Orders Data', icon: FiPackage },
    { id: 'assistant', label: 'AI Assistant', icon: FiMessageSquare },
  ];

  const renderContent = () => {
    switch(activeTab) {
      case 'upload':
        return <UploadCSV onDataUploaded={handleDataUploaded} />;
      case 'orders':
        return <Orders data={uploadedData} />;
      case 'assistant':
        return <Chat data={uploadedData} />;
      default:
        return (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Supply Chain Overview</h2>
              <button 
                onClick={fetchMetrics}
                className="flex items-center cursor-pointer gap-2 text-sm text-blue-600 hover:text-blue-800"
                disabled={loading}
              >
                <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FiPackage className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {metrics.totalWarehouses} warehouses
                  </span>
                </div>
                <h3 className="text-gray-500 text-sm font-medium">Total Orders</h3>
                <p className="text-3xl font-bold text-gray-800 mt-1">{metrics.totalOrders}</p>
              </div>

              {/* <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <FiClock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <span className="text-sm font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                    {((metrics.delayedOrders / metrics.totalOrders) * 100 || 0).toFixed(1)}% of total
                  </span>
                </div>
                <h3 className="text-gray-500 text-sm font-medium">Delayed Orders</h3>
                <p className="text-3xl font-bold text-gray-800 mt-1">{metrics.delayedOrders}</p>
              </div> */}

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <FiTrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">
                    {metrics.onTimeDelivery}% on time
                  </span>
                </div>
                <h3 className="text-gray-500 text-sm font-medium">Avg Delivery Time</h3>
                <p className="text-3xl font-bold text-gray-800 mt-1">{metrics.avgDeliveryTime} days</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <FiCheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                    {metrics.totalProducts} products
                  </span>
                </div>
                <h3 className="text-gray-500 text-sm font-medium">On-Time Delivery</h3>
                <p className="text-3xl font-bold text-gray-800 mt-1">{metrics.onTimeDelivery}%</p>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              

              {/* Order Timeline Card */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Volume Timeline (Last 5 Orders)</h3>
                {/* {console.log("uploadedData:",uploadedData)} */}
                {uploadedData && uploadedData.length > 0 ? (
                  <>
                    <div className="h-48 flex items-end justify-between gap-4">
                      {uploadedData.slice(-5).map((order, i) => {
                        // Debug: log order data
                        {/* console.log('Order:', order); */}
                        
                        // Get order date - try different possible field names
                        const orderDate = order.order_date || order.Order_Date || order.date || '';
                        let dateDisplay = `Order ${i+1}`;
                        
                        try {
                          if (orderDate) {
                            const date = new Date(orderDate);
                            if (!isNaN(date.getTime())) {
                              dateDisplay = date.toLocaleDateString('en-US', { 
                                year:"2-digit",
                                month: 'short', 
                                day: 'numeric' 
                              });
                            }
                          }
                        } catch (e) {
                          console.log('Date parsing error:', e);
                        }
                        
                        // Get quantity - try different possible field names
                        const quantity = parseInt(order.quantity || order.Quantity || order.qty || 1);
                        
                        // Find max quantity for scaling
                        const quantities = uploadedData.map(o => parseInt(o.quantity || o.Quantity || o.qty || 1));
                        const maxQuantity = Math.max(...quantities);
                        
                        // Calculate height (max 160px, min 20px)
                        const height = maxQuantity > 0 ? (quantity / maxQuantity) * 140 : 40;
                        const barHeight = Math.max(height, 20);
                        
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center group">
                            <div className="relative w-full flex justify-center mb-1">
                              {/* Bar container with fixed width for consistent display */}
                              <div className="w-12 flex flex-col items-center">
                                {/* Quantity label above bar */}
                                <span className="text-xs font-medium text-gray-600 mb-1">
                                  {quantity}
                                </span>
                                
                                {/* Bar */}
                                <div 
                                  className="w-8 bg-blue-600 rounded-t-lg hover:bg-blue-700 transition-all cursor-pointer"
                                  style={{ height: `${barHeight}px` }}
                                >
                                  {/* Tooltip on hover */}
                                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                    {quantity} orders
                                  </div>
                                </div>
                              </div>
                            </div>
                            {/* Date label */}
                            <span className="text-xs text-gray-500 mt-2 font-medium">
                              {dateDisplay}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Axis labels */}
                    <div className="flex justify-between items-center mt-4 text-xs text-gray-400">
                      <span>← Older</span>
                      <span>Order Volume Timeline</span>
                      <span>Recent →</span>
                    </div>
                  </>
                ) : (
                  <div className="h-48 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                    <p className="text-gray-400">Upload data to see order timeline</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 bg-linear-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    {uploadedData ? 'Analyze your data with AI' : 'Ready to analyze your data?'}
                  </h3>
                  <p className="text-blue-100">
                    {uploadedData 
                      ? `${metrics.totalOrders} orders loaded. Ask the AI assistant for insights!` 
                      : 'Upload your CSV file to get AI-powered insights'}
                  </p>
                </div>
                <button 
                  onClick={() => setActiveTab(uploadedData ? 'assistant' : 'upload')}
                  className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2"
                >
                  {uploadedData ? (
                    <>
                      <FiMessageSquare className="w-5 h-5" />
                      Ask AI Assistant
                    </>
                  ) : (
                    <>
                      <FiUpload className="w-5 h-5" />
                      Upload CSV
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-semibold">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-linear-to-b from-[#0d012b] to-[#15025b] text-white transition-all duration-300 flex flex-col`}>
        {/* Logo */}
        <div className="p-6 flex justify-between items-center">
          <img src="supply.png" alt="logo" height={40} width={40} />
          <h1 className={`font-bold text-xl ${!sidebarOpen && 'hidden'}`}>
            SupplyChain<span className="text-blue-400">AI</span>
          </h1>
          {!sidebarOpen && <FiBarChart2 className="w-6 h-6 mx-auto" />}
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 mb-2 rounded-lg transition-colors ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiMenu className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-semibold text-gray-800">
                {menuItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
              </h2>
              {uploadedData && activeTab === 'dashboard' && (
                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                  {uploadedData.length} orders loaded
                </span>
              )}
            </div>
            
            {/* Upload Button in Header */}
            {activeTab !== 'upload' && !uploadedData && (
              <button 
                onClick={() => setActiveTab('upload')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 animate-pulse"
              >
                <FiUpload className="w-4 h-4" />
                Upload CSV to Start
              </button>
            )}
            {uploadedData && activeTab !== 'upload' && (
              <button 
                onClick={() => setActiveTab('upload')}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <FiUpload className="w-4 h-4" />
                Upload New CSV
              </button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;