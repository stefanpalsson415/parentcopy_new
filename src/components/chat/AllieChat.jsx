// src/components/chat/AllieChat.jsx
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, MinusSquare, Send, Info, Calendar, PlusCircle, Mic, User, ChevronUp, ChevronDown, Upload } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import EnhancedChatService from '../../services/EnhancedChatService';
import EnhancedNLU from '../../services/EnhancedNLU';
import ChatMessage from './ChatMessage';
import CalendarPromptChip from './CalendarPromptChip';
import ChatFeedback from './ChatFeedback';

const AllieChat = () => {
  const { familyId, selectedUser, familyMembers } = useFamily();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [canUseChat, setCanUseChat] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [chatHeight, setChatHeight] = useState(68); // Default height (in rems)
  const [promptChips, setPromptChips] = useState([
    { type: 'calendar', text: 'Add an event to my calendar' },
    { type: 'task', text: 'What tasks do I have this week?' },
    { type: 'balance', text: 'How is our family balance?' }
  ]);
  // New state variables for enhanced features
  const [showInsights, setShowInsights] = useState(false);
  const [detectedIntent, setDetectedIntent] = useState(null);
  const [extractedEntities, setExtractedEntities] = useState(null);
  const [conversationContext, setConversationContext] = useState([]);
  
  const messagesEndRef = useRef(null);
  const recognition = useRef(null);
  const fileInputRef = useRef(null);
  const nlu = useRef(new EnhancedNLU());
  
  // Check if current user can use chat
  useEffect(() => {
    if (!selectedUser) return;
    
    if (selectedUser.role === 'child') {
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
      
      recognition.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        
        setTranscription(transcript);
        setInput(transcript);
      };
      
      recognition.current.onend = () => {
        setIsListening(false);
      };
      
      recognition.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
    }
  }, []);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Load messages when component mounts or familyId changes
  useEffect(() => {
    if (selectedUser && selectedUser.familyId) {
      loadMessages();
    }
  }, [selectedUser]);
  
  const loadMessages = async () => {
    try {
      if (!selectedUser || !selectedUser.familyId) return;
      
      setLoading(true);
      const familyId = selectedUser.familyId;
      const chatMessages = await EnhancedChatService.loadMessages(familyId);
      setMessages(chatMessages);
      setLoading(false);
    } catch (error) {
      console.error("Error loading chat messages:", error);
      setLoading(false);
    }
  };
  
  const toggleChat = () => {
    setIsOpen(!isOpen);
  };
  
  const handleSend = async () => {
    if (input.trim() && canUseChat && selectedUser && selectedUser.familyId) {
      try {
        const familyId = selectedUser.familyId;
        
        // Process with NLU first to show insights
        const intent = nlu.current.detectIntent(input);
        const entities = nlu.current.extractEntities(input, familyMembers);
        
        // Update NLU insights
        setDetectedIntent(intent);
        setExtractedEntities(entities);
        
        // Create user message
        const userMessage = {
          familyId,
          sender: selectedUser.id,
          userName: selectedUser.name,
          userImage: selectedUser.profilePicture,
          text: input,
          timestamp: new Date().toISOString()
        };
        
        // Optimistically add message to UI
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setTranscription('');
        setLoading(true);
        
        // Reset image if any
        if (imageFile) {
          setImageFile(null);
          setImagePreview(null);
        }
        
        // Save message to database
        const savedMessage = await EnhancedChatService.saveMessage(userMessage);
        
        // Update conversation context
        const updatedContext = EnhancedChatService.updateConversationContext(familyId, {
          query: input,
          intent,
          entities
        });
        
        setConversationContext(updatedContext?.recentTopics || []);
        
        // Get AI response
        const aiResponse = await EnhancedChatService.getAIResponse(
          input, 
          familyId, 
          [...messages, userMessage]
        );
        
        // Add AI response to messages
        const allieMessage = {
          id: Date.now().toString(), // Temporary ID 
          familyId,
          sender: 'allie',
          userName: 'Allie',
          text: aiResponse,
          timestamp: new Date().toISOString()
        };
        
        // Save AI message to database
        const savedAIMessage = await EnhancedChatService.saveMessage(allieMessage);
        if (savedAIMessage.success && savedAIMessage.messageId) {
          allieMessage.id = savedAIMessage.messageId;
        }
        
        // Update messages state with AI response
        setMessages(prev => [...prev, allieMessage]);
        setLoading(false);
      } catch (error) {
        console.error("Error sending message:", error);
        setLoading(false);
        
        // Show error message
        setMessages(prev => [...prev, {
          familyId: selectedUser.familyId,
          sender: 'allie',
          userName: 'Allie',
          text: "I'm having trouble processing your request right now. Please try again in a moment.",
          timestamp: new Date().toISOString()
        }]);
      }
    }
  };
  
  const handleUsePrompt = (promptText) => {
    setInput(promptText);
  };
  
  const handleToggleMic = () => {
    if (isListening) {
      if (recognition.current) {
        recognition.current.stop();
      }
      setIsListening(false);
    } else {
      if (recognition.current) {
        recognition.current.start();
        setIsListening(true);
      } else {
        alert("Your browser doesn't support speech recognition.");
      }
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      // Check if it's an image file
      if (file.type.startsWith('image/')) {
        // Create a preview URL
        const previewUrl = URL.createObjectURL(file);
        setImageFile(file);
        setImagePreview(previewUrl);
        setIsProcessingImage(false);
      } else {
        alert("Please upload an image file.");
      }
    }
  };
  
  const handleAttachImage = () => {
    fileInputRef.current?.click();
  };
  
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    // Release object URL to free memory
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
  };
  
  const handleResize = (direction) => {
    const minHeight = 50; // Min height in rems
    const maxHeight = 85; // Max height in rems (almost full screen)
    
    if (direction === 'up' && chatHeight > minHeight) {
      setChatHeight(chatHeight - 5);
    } else if (direction === 'down' && chatHeight < maxHeight) {
      setChatHeight(chatHeight + 5);
    }
  };
  
  // Make sure the chat doesn't render without a user
  if (!selectedUser) {
    return null;
  }
  
  // Render the chat component
  return (
    <div className="fixed bottom-0 right-0 z-50 md:w-96 w-full flex flex-col">
      {/* Chat header (shown when closed) */}
      {!isOpen && (
        <div 
          className="bg-white shadow-lg rounded-t-lg p-4 mx-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
          onClick={toggleChat}
        >
          <div className="flex items-center">
            <MessageSquare className="text-blue-600 mr-2" />
            <span className="font-semibold">Chat with Allie</span>
          </div>
          <div className="flex items-center space-x-1">
            {messages.length > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {messages.filter(m => m.sender === 'allie').length}
              </span>
            )}
            <ChevronUp />
          </div>
        </div>
      )}
      
      {/* Full chat interface (shown when open) */}
      {isOpen && (
        <div 
          className="bg-white shadow-lg rounded-t-lg mx-4 flex flex-col transition-all duration-300"
          style={{ height: `${chatHeight}vh` }}
        >
          {/* Chat header */}
          <div className="p-3 border-b flex items-center justify-between">
            <div className="flex items-center">
              <MessageSquare className="text-blue-600 mr-2" />
              <span className="font-semibold">Chat with Allie</span>
            </div>
            <div className="flex items-center">
              {/* Toggle NLU insights */}
              <button 
                onClick={() => setShowInsights(!showInsights)} 
                className={`p-1 rounded mr-1 ${showInsights ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                title="Toggle NLU insights"
              >
                <Info size={18} />
              </button>
              
              {/* Resize buttons */}
              <button 
                onClick={() => handleResize('up')} 
                className="p-1 hover:bg-gray-100 rounded mr-1"
                title="Make chat smaller"
              >
                <ChevronDown size={18} />
              </button>
              <button 
                onClick={() => handleResize('down')} 
                className="p-1 hover:bg-gray-100 rounded mr-1"
                title="Make chat larger"
              >
                <ChevronUp size={18} />
              </button>
              
              {/* Minimize button */}
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1 hover:bg-gray-100 rounded mr-1"
                title="Minimize chat"
              >
                <MinusSquare size={18} />
              </button>
              
              {/* Close button */}
              <button 
                onClick={toggleChat} 
                className="p-1 hover:bg-gray-100 rounded"
                title="Close chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Welcome message if no messages */}
            {messages.length === 0 && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center mb-1">
                  <span className="font-medium">Allie</span>
                </div>
                <p className="text-sm">
                  Hello! I'm Allie, your family balance assistant. I can help with workload balance, 
                  relationship insights, task management, and more. How can I support your family today?
                </p>
              </div>
            )}
            
            {/* Render messages */}
            {messages.map((msg, index) => (
              <div key={index} className={`p-3 rounded-lg ${msg.sender === 'allie' ? 'bg-blue-50 ml-4' : 'bg-gray-100 mr-4'}`}>
                <div className="flex items-center mb-1">
                  <span className="font-medium text-sm">{msg.userName || (msg.sender === 'allie' ? 'Allie' : 'You')}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                
                {/* Add feedback component for Allie messages */}
                {msg.sender === 'allie' && msg.id && (
                  <ChatFeedback messageId={msg.id} familyId={selectedUser.familyId} />
                )}
              </div>
            ))}
            
            {/* Loading indicator */}
            {loading && (
              <div className="flex items-center justify-center space-x-1 my-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            )}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
          
          {/* NLU insights panel */}
          {showInsights && (detectedIntent || (extractedEntities && Object.keys(extractedEntities).length > 0)) && (
            <div className="border-t p-2 bg-gray-50 text-xs overflow-y-auto max-h-40">
              {detectedIntent && (
                <div className="mb-2">
                  <span className="font-medium">Intent:</span>
                  <span className="ml-1 font-mono">{detectedIntent}</span>
                </div>
              )}
              
              {extractedEntities && Object.keys(extractedEntities).length > 0 && (
                <div>
                  <span className="font-medium">Entities:</span>
                  <div className="bg-white p-1 rounded border mt-1 overflow-x-auto">
                    <pre className="text-xs">{JSON.stringify(extractedEntities, null, 2)}</pre>
                  </div>
                </div>
              )}
              
              {conversationContext && conversationContext.length > 0 && (
                <div className="mt-2">
                  <span className="font-medium">Recent Context:</span>
                  <ul className="list-disc list-inside pl-2 mt-1">
                    {conversationContext.slice(0, 3).map((topic, idx) => (
                      <li key={idx} className="truncate">
                        {topic.query || "Previous topic"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {/* Prompt chips */}
          <div className="px-3 py-2 flex flex-wrap gap-2">
            {promptChips.map((chip, index) => (
              <button
                key={index}
                onClick={() => handleUsePrompt(chip.text)}
                className="bg-gray-100 hover:bg-gray-200 text-xs px-3 py-1 rounded-full"
              >
                {chip.type === 'calendar' && <Calendar size={12} className="inline mr-1" />}
                {chip.text}
              </button>
            ))}
          </div>
          
          {/* Image preview area */}
          {imagePreview && (
            <div className="p-2 border-t relative">
              <div className="relative w-32 h-32">
                <img 
                  src={imagePreview} 
                  alt="Upload preview" 
                  className="w-full h-full object-cover rounded-md border"
                />
                <button
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                  title="Remove image"
                >
                  <X size={12} />
                </button>
              </div>
              {isProcessingImage && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="text-white text-sm">Processing...</div>
                </div>
              )}
            </div>
          )}
          
          {/* Input area */}
          <div className="p-3 border-t mt-auto">
            {!canUseChat ? (
              <div className="bg-amber-50 p-2 rounded-md text-xs text-amber-800 mb-2">
                Chat is disabled for children. Please ask a parent to enable this feature.
              </div>
            ) : (
              <>
                <div className="flex items-end">
                  <textarea
                    value={isListening ? transcription : input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Message Allie..."
                    className="flex-1 border rounded-l-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm resize-none"
                    rows="1"
                    disabled={isListening}
                  ></textarea>
                  <div className="flex bg-gray-100 rounded-r-md border-t border-r border-b">
                    <button
                      onClick={handleToggleMic}
                      className={`p-3 ${isListening ? 'text-red-500' : 'text-gray-500 hover:text-gray-700'}`}
                      title={isListening ? "Stop recording" : "Record voice"}
                    >
                      <Mic size={18} />
                    </button>
                    <button
                      onClick={handleAttachImage}
                      className="p-3 text-gray-500 hover:text-gray-700"
                      title="Upload image"
                    >
                      <Upload size={18} />
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={(!input.trim() && !imageFile) || loading}
                      className="bg-blue-600 text-white p-3 rounded-r-md hover:bg-blue-700 disabled:bg-blue-300"
                      title="Send message"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
                {isListening && (
                  <p className="text-xs text-red-500 mt-1 animate-pulse">
                    Listening... speak now
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AllieChat;