import React, { createContext, useContext, useState, useEffect } from 'react';
import { useFamily } from './FamilyContext';
import ChatService from '../services/ChatService';

const ChatContext = createContext();

export function useChat() {
  return useContext(ChatContext);
}

export function ChatProvider({ children }) {
  const { familyId, selectedUser } = useFamily();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Load messages when familyId changes
  useEffect(() => {
    if (familyId) {
      loadMessages();
    }
  }, [familyId]);
  
  // Load messages from database
  const loadMessages = async () => {
    try {
      const chatMessages = await ChatService.loadMessages(familyId);
      setMessages(chatMessages);
    } catch (error) {
      console.error("Error loading chat messages:", error);
    }
  };
  
  // Send a message
  const sendMessage = async (text, user) => {
    if (!user || !familyId) return;
    
    const newMessage = {
      familyId,
      sender: user.id,
      userName: user.name,
      userImage: user.profilePicture,
      text,
      timestamp: new Date().toISOString()
    };
    
    // Optimistically add message to UI
    setMessages(prev => [...prev, newMessage]);
    
    try {
      setLoading(true);
      
      // Save message to database
      await ChatService.saveMessage(newMessage);
      
      // Get AI response
      const aiResponse = await ChatService.getAIResponse(text, familyId, messages);
      
      // Add AI response to messages
      const allieMessage = {
        familyId,
        sender: 'allie',
        userName: 'Allie',
        text: aiResponse,
        timestamp: new Date().toISOString()
      };
      
      // Save AI message to database
      await ChatService.saveMessage(allieMessage);
      
      // Update messages state with AI response
      setMessages(prev => [...prev, allieMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const value = {
    messages,
    sendMessage,
    loading,
    loadMessages
  };
  
  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}