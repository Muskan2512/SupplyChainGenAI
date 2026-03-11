// components/Chat.jsx
import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiUser, FiCpu, FiDownload, FiTrash2, FiMessageSquare, FiRefreshCw } from 'react-icons/fi';
import axios from 'axios';

const ChatAI = ({ data: propData }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: '👋 Hello! I\'m your Supply Chain AI Assistant. I can help you analyze your shipping data. Ask me questions like:\n\n• Which warehouse has the highest shipping delay?\n• What is the average delay per warehouse?\n• Which product ships fastest?\n• Which orders were delayed more than 3 days?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localData, setLocalData] = useState(null);
  const [dataStatus, setDataStatus] = useState({ exists: false, count: 0 });
  const [suggestions] = useState([
    'Which warehouse has the highest shipping delay?',
    'What is the average delay per warehouse?',
    'Which product ships fastest?',
    'Which orders were delayed more than 3 days?',
    'Show me a summary of all data'
  ]);
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Load data from localStorage on component mount
  useEffect(() => {
    loadDataFromStorage();
  }, []);

  // Update when prop data changes (new upload)
  useEffect(() => {
    if (propData && propData.length > 0) {
      // Save to localStorage
      localStorage.setItem('supplyChainData', JSON.stringify(propData));
      localStorage.setItem('supplyChainDataTimestamp', Date.now().toString());
      setLocalData(propData);
      setDataStatus({ exists: true, count: propData.length });
      
      // Add a system message about data load
      // addSystemMessage(`✅ Data loaded successfully! ${propData.length} orders available for analysis.`);
    }
  }, [propData]);

  // Check localStorage on mount and set status
  const loadDataFromStorage = () => {
    try {
      const savedData = localStorage.getItem('supplyChainData');
      const timestamp = localStorage.getItem('supplyChainDataTimestamp');
      
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        if (parsedData && parsedData.length > 0) {
          setLocalData(parsedData);
          setDataStatus({ 
            exists: true, 
            count: parsedData.length,
            timestamp: timestamp ? new Date(parseInt(timestamp)).toLocaleString() : 'Unknown'
          });
          
          // Add a system message about restored data (only if messages are just the initial one)
          // if (messages.length === 1) {
            // addSystemMessage(`🔄 Data restored from previous session! ${parsedData.length} orders available.`);
          // }
        }
      } else {
        setDataStatus({ exists: false, count: 0 });
      }
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
      setDataStatus({ exists: false, count: 0 });
    }
  };

  // Add system message
  const addSystemMessage = (content) => {
    const systemMessage = {
      id: Date.now(),
      type: 'bot',
      content: content
    };
    setMessages(prev => [...prev, systemMessage]);
  };

  // Clear stored data
  const clearStoredData = () => {
    localStorage.removeItem('supplyChainData');
    localStorage.removeItem('supplyChainDataTimestamp');
    setLocalData(null);
    setDataStatus({ exists: false, count: 0 });
    addSystemMessage('🗑️ Stored data cleared. Please upload a new CSV file to continue.');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    // Check if data exists (either from props or localStorage)
    const activeData = propData || localData;
    
    if (!activeData) {
      setMessages(prev => [...prev, {
        id: prev.length + 2,
        type: 'bot',
        content: '⚠️ No data available. Please upload a CSV file first using the Upload CSV option.'
      }]);
      return;
    }

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      content: input
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call your backend API
      const response = await axios.post('http://localhost:5000/chat', {
        query: input
      });

      // Add bot response
      setMessages(prev => [...prev, {
        id: prev.length + 2,
        type: 'bot',
        content: response.data.answer || 'Sorry, I could not process your question.'
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      
      let errorMessage = '❌ Sorry, I encountered an error. ';
      if (error.response?.status === 429) {
        errorMessage = '⚠️ Rate limit reached. Please wait a moment before asking another question.';
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage += 'Cannot connect to server. Please make sure backend is running.';
      } else {
        errorMessage += 'Please try again.';
      }
      
      setMessages(prev => [...prev, {
        id: prev.length + 2,
        type: 'bot',
        content: errorMessage
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 1,
      type: 'bot',
      content: '👋 Chat cleared! How can I help you with your supply chain data?'
    }]);
    
    // Re-add data status message if data exists
    if (dataStatus.exists) {
      setTimeout(() => {
        addSystemMessage(`📊 ${dataStatus.count} orders available for analysis. Ask me anything!`);
      }, 100);
    }
  };

  // Get active data source
  const activeData = propData || localData;
  const hasData = !!(activeData && activeData.length > 0);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiMessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">AI Assistant</h2>
              <p className="text-sm text-gray-500">
                {hasData 
                  ? `✅ ${activeData.length} orders loaded` 
                  : 'Ask questions about your supply chain data'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Data status indicator */}
            {dataStatus.exists && !propData && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                <FiRefreshCw className="w-3 h-3" />
                Restored
              </span>
            )}
            <button 
              onClick={clearChat}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Clear chat"
            >
              <FiTrash2 className="w-5 h-5" />
            </button>
            {dataStatus.exists && (
              <button 
                onClick={clearStoredData}
                className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                title="Clear stored data"
              >
                <FiRefreshCw className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        {/* Data restored banner */}
        {dataStatus.exists && !propData && dataStatus.timestamp && (
          <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
            📦 Data restored from: {dataStatus.timestamp} ({dataStatus.count} orders)
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-4"
        style={{ maxHeight: 'calc(100vh - 320px)' }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-3 max-w-3xl ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.type === 'user' 
                  ? 'bg-blue-600' 
                  : 'bg-linear-to-br from-purple-600 to-blue-600'
              }`}>
                {message.type === 'user' 
                  ? <FiUser className="w-4 h-4 text-white" />
                  : <FiCpu className="w-4 h-4 text-white" />
                }
              </div>
              
              {/* Message Content */}
              <div className={`rounded-2xl px-4 py-3 ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-800'
              }`}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
              </div>
            </div>
          </div>
        ))}
        
        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-linear-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                <FiCpu className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length < 3 && hasData && (
        <div className="px-6 py-4 bg-white border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-3">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setInput(suggestion)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No Data Suggestions */}
      {!hasData && messages.length < 3 && (
        <div className="px-6 py-4 bg-white border-t border-gray-200">
          {/* <p className="text-sm text-amber-600 mb-2">📤 No data available</p> */}
          <p className="text-xs text-gray-500">
            Please upload a CSV file using the Upload CSV option in the sidebar to start asking questions.
          </p>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={hasData ? "Ask about your supply chain data..." : "Upload a CSV file first..."}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading || !hasData}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim() || !hasData}
            className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all ${
              isLoading || !input.trim() || !hasData
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
            }`}
          >
            <FiSend className="w-4 h-4" />
            Send
          </button>
        </div>
        
        {/* Status Messages */}
        {!hasData && (
          <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
            No data available. Please upload a CSV file first.
          </p>
        )}
        {hasData && dataStatus.exists && !propData && (
          <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Using data from previous session ({dataStatus.count} orders)
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatAI;