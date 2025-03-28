import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, MinusSquare, Send, Info, Calendar, PlusCircle } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import { useChat } from '../../contexts/ChatContext';
import ChatMessage from './ChatMessage';

const AllieChat = () => {
  const { selectedUser, familyMembers } = useFamily();
  const { messages, sendMessage, loading } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [canUseChat, setCanUseChat] = useState(true);
  const messagesEndRef = useRef(null);
  
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
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="bg-white border border-black shadow-lg rounded-lg w-80 sm:w-96 flex flex-col h-96">
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
          <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
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
        <span className="font-roboto">Tips for getting tasks done easily</span>
      </div>
    </div>
    
    {/* Add suggestion chips */}
    <div className="flex justify-center space-x-2 mt-6">
      <button 
        onClick={() => sendMessage("How do I add tasks to my calendar?", selectedUser)}
        className="flex items-center px-3 py-2 bg-black hover:bg-gray-800 text-white rounded-full text-sm font-roboto shadow transition-all duration-150 transform hover:scale-105"
      >
        <Calendar size={14} className="mr-1" />
        <span>Calendar tips</span>
      </button>
      
      <button 
        onClick={() => sendMessage("What tasks should I do next?", selectedUser)}
        className="flex items-center px-3 py-2 bg-black hover:bg-gray-800 text-white rounded-full text-sm font-roboto shadow transition-all duration-150 transform hover:scale-105"
      >
        <PlusCircle size={14} className="mr-1" />
        <span>Task suggestions</span>
      </button>
    </div>
  </div>
) : (
  messages.map((msg, index) => (
    <ChatMessage key={index} message={msg} />
  ))
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
              <div className="flex">
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