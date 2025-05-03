// src/components/chat/MobileResponsiveUI.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Calendar, X, Mic, ArrowLeft, Camera, Send } from 'lucide-react';
import AllieChat from './AllieChat';
import RevisedFloatingCalendarWidget from '../calendar/RevisedFloatingCalendarWidget';

/**
 * Mobile-optimized UI for Allie experience
 * Provides a full-screen chat with a toggleable calendar widget
 */
const MobileResponsiveUI = ({ isStandalone }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [message, setMessage] = useState('');
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const chatRef = useRef(null);
  
  // Function to simulate sending a voice message
  // In a real implementation, this would use the Web Speech API
  const handleVoiceInput = () => {
    setIsRecording(true);
    setShowVoiceInput(true);
    
    // Simulate voice recognition after 3 seconds
    setTimeout(() => {
      setIsRecording(false);
      setMessage("What's on my calendar for tomorrow?");
      
      // Simulate processing for 1 more second
      setTimeout(() => {
        setShowVoiceInput(false);
      }, 1000);
    }, 3000);
  };
  
  // Toggle calendar view
  const toggleCalendar = () => {
    setShowCalendar(!showCalendar);
  };
  
  // Handle sending message
  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    // Trigger send message in AllieChat component
    if (chatRef.current && chatRef.current.handleSend) {
      chatRef.current.handleSend(message);
      setMessage('');
    }
  };
  
  return (
    <div className="relative h-full overflow-hidden bg-gray-50 flex flex-col">
      {/* Mobile header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white ${isStandalone ? 'pt-8' : ''}`}>
        <div className="flex items-center">
          <h1 className="text-lg font-semibold text-gray-800">Allie</h1>
        </div>
        
        {!showCalendar ? (
          <button
            onClick={toggleCalendar}
            className="p-2 rounded-full text-blue-500 hover:bg-blue-50"
          >
            <Calendar size={20} />
          </button>
        ) : (
          <button
            onClick={toggleCalendar}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        )}
      </div>
      
      {/* Content area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Main chat component */}
        <div className={`absolute inset-0 transition-all duration-300 ease-in-out ${showCalendar ? 'translate-x-[-100%]' : 'translate-x-0'}`}>
          <AllieChat ref={chatRef} isMobileView={true} />
        </div>
        
        {/* Calendar widget */}
        <div className={`absolute inset-0 transition-all duration-300 ease-in-out ${showCalendar ? 'translate-x-0' : 'translate-x-[100%]'}`}>
          <RevisedFloatingCalendarWidget embedded={true} />
        </div>
      </div>
      
      {/* Mobile input area - only shown when chat is visible */}
      {!showCalendar && (
        <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center">
          <button className="p-2 text-gray-500 rounded-full hover:bg-gray-100 mr-2">
            <Camera size={20} />
          </button>
          
          <div className="flex-1 relative">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message Allie..."
              className="w-full py-2 px-4 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
          </div>
          
          {message ? (
            <button 
              className="p-2 ml-2 bg-blue-500 rounded-full text-white"
              onClick={handleSendMessage}
            >
              <Send size={20} />
            </button>
          ) : (
            <button 
              className="p-2 ml-2 text-blue-500 rounded-full hover:bg-blue-50"
              onClick={handleVoiceInput}
            >
              <Mic size={20} />
            </button>
          )}
        </div>
      )}
      
      {/* Voice input overlay */}
      {showVoiceInput && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-4/5 max-w-sm">
            <div className="text-center mb-4">
              <h3 className="text-lg font-medium">
                {isRecording ? 'Listening...' : 'Processing...'}
              </h3>
            </div>
            
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className={`absolute inset-0 rounded-full ${isRecording ? 'animate-pulse bg-blue-100' : 'bg-gray-100'}`}></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Mic size={32} color={isRecording ? '#3b82f6' : '#6b7280'} />
              </div>
            </div>
            
            {message && !isRecording && (
              <p className="text-center text-gray-700 mb-4">"{message}"</p>
            )}
            
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setShowVoiceInput(false);
                  setIsRecording(false);
                }}
                className="px-4 py-2 text-blue-500 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileResponsiveUI;