// components/Orders.jsx
import React, { useState, useEffect } from 'react';
import { FiSearch, FiPackage, FiMapPin } from 'react-icons/fi';
import axios from 'axios';

const Orders = ({ data }) => {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  // Load data when component mounts or when data prop changes
  useEffect(() => {
    if (data && data.length > 0) {
      // If data passed from parent, use it
      setOrders(data);
    } else {
      // Otherwise fetch from debug endpoint
      fetchOrders();
    }
  }, [data]);

  // Fetch orders from debug endpoint
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/debug');
      console.log('Debug response:', response.data);
      
      // Check if we have data
      if (response.data && response.data.length > 0) {
        setOrders(response.data);
      } else if (response.data && response.data.rows) {
        setOrders(response.data.rows);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter orders based on search and status
  const filteredOrders = orders.filter(order => {
    // Search in multiple fields
    const searchMatch = 
      (order.order_id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (order.customer_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (order.product_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (order.warehouse?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    // Status filter
    const statusMatch = statusFilter === 'all' || 
      (order.status?.toLowerCase() || '') === statusFilter.toLowerCase();
    
    return searchMatch && statusMatch;
  });

  // Calculate delay if not present
  const getDelay = (order) => {
    if (order.delivery_time_days) return order.delivery_time_days;
    
    // Calculate from dates if available
    if (order.order_date && order.ship_date) {
      const orderDate = new Date(order.order_date);
      const shipDate = new Date(order.ship_date);
      if (!isNaN(orderDate) && !isNaN(shipDate)) {
        const diff = Math.ceil((shipDate - orderDate) / (1000 * 60 * 60 * 24));
        return diff;
      }
    }
    return 0;
  };

  // Status badge color
  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'delayed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        <p className="mt-2 text-gray-500">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Orders Data</h2>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Order ID, Customer, Product or Warehouse..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="delivered">Delivered</option>
            <option value="delayed">Delayed</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      {filteredOrders.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ship Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delay</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{order.order_id || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{order.customer_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <FiPackage className="text-gray-400" size={14} />
                        {order.product_name || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <FiMapPin className="text-gray-400" size={14} />
                        {order.warehouse || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{order.order_date || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{order.ship_date || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{order.delivery_date || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={getDelay(order) > 3 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                        {getDelay(order)} days
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                        {order.status || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Summary */}
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {filteredOrders.length} of {orders.length} orders
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 text-center rounded-lg border border-gray-100">
          <p className="text-gray-500">No orders found</p>
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Clear search
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Orders;