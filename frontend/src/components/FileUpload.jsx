// components/UploadCSV.jsx
import React, { useState, useCallback } from 'react';
import { FiUpload, FiFile, FiCheckCircle, FiAlertCircle, FiX, FiRefreshCw, FiDownload } from 'react-icons/fi';
import axios from 'axios';

const UploadCSV = ({ onDataUploaded }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [error, setError] = useState(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "text/csv") {
      setFile(droppedFile);
      setError(null);
    } else {
      setError("Please upload a valid CSV file");
    }
  }, []);

  const handleFileSelect = useCallback((e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setError(null);
    } else {
      setError("Please upload a valid CSV file");
    }
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus(null);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:5000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      setUploadStatus('success');
      onDataUploaded(response.data.data);
      
      // Reset after 3 seconds
      setTimeout(() => {
        setUploadStatus(null);
        setFile(null);
        setUploadProgress(0);
      }, 3000);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || 'Failed to upload file. Please try again.');
      setUploadStatus('error');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setError(null);
    setUploadStatus(null);
    setUploadProgress(0);
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      ['OrderID', 'Customer', 'Product', 'Warehouse', 'Order_Date', 'Ship_Date', 'Delivery_Date', 'Quantity', 'Status'],
      ['1001', 'Amit Sharma', 'Laptop', 'Delhi_WH', '2024-01-02', '2024-01-05', '2024-01-09', '2', 'Delivered'],
      ['1002', 'Neha Verma', 'Smartphone', 'Mumbai_WH', '2024-01-03', '2024-01-08', '2024-01-15', '5', 'Delayed'],
      ['1003', 'Rahul Singh', 'Headphones', 'Bangalore_WH', '2024-01-04', '2024-01-06', '2024-01-10', '10', 'Delivered'],
      ['1004', 'Pooja Mehta', 'Keyboard', 'Chennai_WH', '2024-01-05', '2024-01-10', '2024-01-14', '4', 'Delayed'],
      ['1005', 'Sahil Khan', 'Monitor', 'Pune_WH', '2024-01-06', '2024-01-07', '2024-01-11', '3', 'Delivered']
    ];

    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'supply_chain_sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800">Upload CSV Data</h2>
        <p className="text-sm text-gray-500 mt-1">Upload your supply chain data to start analyzing</p>
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 transition-all ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        } ${file ? 'bg-green-50 border-green-500' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />
        
        <div className="text-center">
          {!file ? (
            <>
              <div className="inline-flex p-4 bg-blue-100 rounded-full mb-4">
                <FiUpload className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Drop your CSV file here
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                or click to browse from your computer
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <FiFile className="w-4 h-4" />
                <span>Only CSV files are supported</span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FiCheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={removeFile}
                className="p-1 hover:bg-gray-100 rounded-full"
                disabled={uploading}
              >
                <FiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="mt-6 bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Uploading...</span>
            <span className="text-sm text-gray-500">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {uploadStatus === 'success' && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <FiCheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-green-800 font-medium">Upload successful!</p>
            <p className="text-sm text-green-600">Your data has been processed and is ready for analysis.</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <FiAlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <div>
            <p className="text-red-800 font-medium">Upload failed</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Upload Button */}
      {file && !uploading && uploadStatus !== 'success' && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleUpload}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <FiUpload className="w-4 h-4" />
            Upload and Process
          </button>
        </div>
      )}

      {/* Template Info */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-gray-700">CSV Template Format</h4>
          <button
            onClick={downloadSampleCSV}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 px-3 py-1 bg-blue-50 rounded-lg"
          >
            <FiDownload className="w-3 h-3" />
            Download Sample CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left font-medium text-gray-700">OrderID</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Customer</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Product</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Warehouse</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Order_Date</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Ship_Date</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Delivery_Date</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Quantity</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-600">1001</td>
                <td className="px-4 py-2 text-gray-600">Amit Sharma</td>
                <td className="px-4 py-2 text-gray-600">Laptop</td>
                <td className="px-4 py-2 text-gray-600">Delhi_WH</td>
                <td className="px-4 py-2 text-gray-600">2024-01-02</td>
                <td className="px-4 py-2 text-gray-600">2024-01-05</td>
                <td className="px-4 py-2 text-gray-600">2024-01-09</td>
                <td className="px-4 py-2 text-gray-600">2</td>
                <td className="px-4 py-2">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Delivered</span>
                </td>
              </tr>
              
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          <span className="font-medium">Note:</span> The CSV file should have these exact column headers. 
          The system will calculate shipping delays automatically from Order_Date and Ship_Date.
        </p>
      </div>
    </div>
  );
};

export default UploadCSV;