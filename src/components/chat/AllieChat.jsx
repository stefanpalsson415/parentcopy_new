import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, MinusSquare, Send, Info, Calendar, PlusCircle, Mic, User, ChevronUp, ChevronDown, Upload } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import { useChat } from '../../contexts/ChatContext';
import ChatMessage from './ChatMessage';

const AllieChat = () => {
  const { selectedUser, familyMembers } = useFamily();
  const { messages, sendMessage, loading } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [canUseChat, setCanUseChat] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [chatHeight, setChatHeight] = useState(96); // Default height (in rems)
  const messagesEndRef = useRef(null);
  const recognition = useRef(null);
  const fileInputRef = useRef(null);
  
  // Check if current user can use chat
  useEffect(() => {
    if (selectedUser?.role === 'child') {
      // Check if children are allowed to use chat
      const parent = familyMembers.find(m => m.role === 'parent');
      setCanUseChat(parent?.settings?.childrenCanUseChat !== false);
    } else {
      setCanUseChat(true);
    }
  }, [selectedUser, familyMembers]);
  
  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = true;
      recognition.current.lang = 'en-US';
      
      recognition.current.onstart = () => {
        setIsListening(true);
      };
      
      recognition.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        
        setTranscription(transcript);
        setInput(transcript);
      };
      
      recognition.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
      
      recognition.current.onend = () => {
        setIsListening(false);
      };
    }
    
    return () => {
      if (recognition.current) {
        recognition.current.abort();
      }
    };
  }, []);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const toggleChat = () => {
    setIsOpen(!isOpen);
  };
  
  const handleSend = () => {
    if (input.trim() && canUseChat) {
      sendMessage(input, selectedUser);
      setInput('');
      setTranscription('');
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const toggleListening = () => {
    if (isListening) {
      recognition.current.stop();
    } else {
      recognition.current.start();
    }
  };

  // Handle image upload
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageFile(file);
      setImagePreview(reader.result);
      // Process the image
      processImage(file);
    };
    reader.readAsDataURL(file);
  };

  // Process uploaded image
  const processImage = async (file) => {
    setIsProcessingImage(true);
    try {
      // Here we would normally send the image to a server for OCR processing
      // For now, we'll simulate this with a timeout and direct message to Allie
      
      // Create a message asking Allie to analyze the image
      const message = "I'm sharing a screenshot of an appointment. Can you extract the details and help me add it to the calendar?";
      sendMessage(message, selectedUser);
      
      // Wait a bit to simulate processing
      setTimeout(() => {
        setIsProcessingImage(false);
        setImageFile(null);
        setImagePreview(null);
      }, 1500);
    } catch (error) {
      console.error("Error processing image:", error);
      setIsProcessingImage(false);
    }
  };

  // Drag and drop handling
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageFile(file);
          setImagePreview(reader.result);
          // Process the image
          processImage(file);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Chat sizing controls
  const increaseHeight = () => {
    setChatHeight(prev => Math.min(prev + 10, 140)); // Max height 140rem
  };

  const decreaseHeight = () => {
    setChatHeight(prev => Math.max(prev - 10, 56)); // Min height 56rem
  };
  
  // Helper to detect child tracking patterns
  const suggestChildTrackingMessage = () => {
    const childTrackingSuggestions = [
      {
        text: "Add a doctor's appointment",
        handler: () => sendMessage("Add a doctor's appointment for my child", selectedUser)
      },
      {
        text: "Record growth measurement",
        handler: () => sendMessage("Record new growth measurement for my child", selectedUser)
      },
      {
        text: "Add homework assignment",
        handler: () => sendMessage("Add a homework assignment for my child", selectedUser)
      },
      {
        text: "Check emotional wellbeing",
        handler: () => sendMessage("Record emotional check-in for my child", selectedUser)
      }
    ];
    
    return (
      <div className="mt-4">
        <p className="text-sm font-roboto text-gray-600 mb-2">Try asking about your children:</p>
        <div className="flex flex-wrap gap-2">
          {childTrackingSuggestions.map((suggestion, index) => (
            <button
              key={index}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-roboto"
              onClick={suggestion.handler}
            >
              {suggestion.text}
            </button>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div 
          className="bg-white border border-black shadow-lg rounded-lg w-80 sm:w-96 flex flex-col"
          style={{ height: `${chatHeight}rem` }}
        >
          {/* Chat header */}
          <div className="flex justify-between items-center border-b p-3">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center mr-2">
                <Info size={16} />
              </div>
              <span className="font-medium">Allie Assistant</span>
            </div>
            <div className="flex">
              <button 
                onClick={decreaseHeight} 
                className="p-1 hover:bg-gray-100 rounded"
                title="Decrease chat height"
              >
                <ChevronDown size={18} />
              </button>
              <button 
                onClick={increaseHeight} 
                className="p-1 hover:bg-gray-100 rounded"
                title="Increase chat height"
              >
                <ChevronUp size={18} />
              </button>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1 hover:bg-gray-100 rounded"
              >
                <MinusSquare size={18} />
              </button>
              <button 
                onClick={toggleChat} 
                className="p-1 hover:bg-gray-100 rounded ml-1"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          
          {/* Messages area */}
          <div 
            className="flex-1 overflow-y-auto p-3 bg-gray-50"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
          {messages.length === 0 ? (
              <div className="text-center text-gray-500 my-4">
                <p className="mb-2 font-medium font-roboto">Hi, I'm Allie!</p>
                <p className="text-sm mb-2 font-roboto">I can help your family achieve better balance. Ask me about:</p>
                <div className="text-left text-sm space-y-1 mx-auto max-w-[220px]">
                  <div className="flex items-start">
                    <span className="inline-block w-4 h-4 rounded-full bg-black text-white text-xs flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">?</span>
                    <span className="font-roboto">Survey results and insights</span>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-block w-4 h-4 rounded-full bg-black text-white text-xs flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">?</span>
                    <span className="font-roboto">Why each task was selected for you</span>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-block w-4 h-4 rounded-full bg-black text-white text-xs flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">?</span>
                    <span className="font-roboto">How tasks improve family balance</span>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-block w-4 h-4 rounded-full bg-black text-white text-xs flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">?</span>
                    <span className="font-roboto">Your children's tracking information</span>
                  </div>
                </div>
                
                {/* Add suggestion chips */}
                <div className="flex justify-center space-x-2 mt-6">
                  <button 
                    className="flex items-center px-3 py-2 bg-black hover:bg-gray-800 text-white rounded-full text-sm font-roboto shadow transition-all duration-150 transform hover:scale-105"
                    onClick={() => sendMessage("How do I add tasks to my calendar?", selectedUser)}
                  >
                    <Calendar size={14} className="mr-1" />
                    <span>Calendar tips</span>
                  </button>
                  
                  <button 
                    className="flex items-center px-3 py-2 bg-black hover:bg-gray-800 text-white rounded-full text-sm font-roboto shadow transition-all duration-150 transform hover:scale-105"
                    onClick={() => sendMessage("Tell me about my children's schedules", selectedUser)}
                  >
                    <User size={14} className="mr-1" />
                    <span>Kids dashboard</span>
                  </button>
                </div>
                
                {/* Child tracking specific suggestions */}
                {suggestChildTrackingMessage()}

                {/* Upload image prompt */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600 font-roboto mb-2">
                    Drop an image or screenshot here to let me analyze it
                  </p>
                  <button
                    className="flex items-center mx-auto px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full text-sm font-roboto"
                    onClick={() => fileInputRef.current.click()}
                  >
                    <Upload size={14} className="mr-1" />
                    <span>Upload image</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>
            ) : (
              messages.map((msg, index) => (
                <ChatMessage key={index} message={msg} />
              ))
            )}
            
            {/* Image preview */}
            {imagePreview && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm font-medium font-roboto">Image Preview</p>
                  <button 
                    className="text-gray-400 hover:text-gray-600"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full rounded-lg"
                  />
                  {isProcessingImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                      <div className="text-white text-center">
                        <div className="inline-block w-8 h-8 border-4 border-t-transparent border-white rounded-full animate-spin mb-2"></div>
                        <p className="text-sm font-roboto">Processing image...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
            
            {/* Loading indicator */}
            {loading && (
              <div className="flex items-center justify-center my-2">
                <div className="w-2 h-2 bg-purple-600 rounded-full mr-1 animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-purple-600 rounded-full mr-1 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            )}
          </div>
          
          {/* Input area */}
          <div className="border-t p-3">
            {!canUseChat ? (
              <p className="text-red-500 text-sm text-center">Chat access for children is disabled</p>
            ) : (
              <div className="flex flex-col">
                <div className="flex mb-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask Allie a question..."
                    className="flex-1 border p-2 rounded-l-md focus:outline-none focus:ring-1 focus:ring-black resize-none"
                    rows="2"
                  />
                  <button
                    onClick={handleSend}
                    className="bg-black text-white px-3 rounded-r-md hover:bg-gray-800"
                    disabled={loading || !input.trim()}
                  >
                    <Send size={18} />
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleListening}
                    className={`flex-1 flex items-center justify-center py-2 rounded-md ${
                      isListening 
                        ? 'bg-red-500 text-white' 
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    <Mic size={16} className="mr-2" />
                    {isListening ? 'Listening...' : 'Speak to Allie'}
                  </button>
                  <button
                    className="flex items-center justify-center p-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md"
                    onClick={() => fileInputRef.current.click()}
                  >
                    <Upload size={16} />
                  </button>
                </div>
                {transcription && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-md text-sm">
                    <p className="font-roboto">{transcription}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={toggleChat}
          className="bg-black text-white p-3 rounded-full hover:bg-gray-800 shadow-lg"
        >
          <MessageSquare size={24} />
        </button>
      )}
    </div>
  );
};

export default AllieChat;