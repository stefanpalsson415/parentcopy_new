// src/components/demos/EnhancedChatDemo.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useFamily } from '../../contexts/FamilyContext';
import EnhancedChatService from '../../services/EnhancedChatService';
import EnhancedNLU from '../../services/EnhancedNLU';

const EnhancedChatDemo = () => {
  const { familyId, familyMembers } = useFamily();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [detectedIntent, setDetectedIntent] = useState(null);
  const [extractedEntities, setExtractedEntities] = useState(null);
  const [conversationContext, setConversationContext] = useState([]);
  
  const messagesEndRef = useRef(null);
  const nlu = useRef(new EnhancedNLU());
  
  // Fetch existing messages on load
  useEffect(() => {
    if (familyId) {
      loadMessages();
    }
  }, [familyId]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const loadMessages = async () => {
    try {
      setLoading(true);
      const chatMessages = await EnhancedChatService.loadMessages(familyId);
      setMessages(chatMessages);
      setLoading(false);
    } catch (error) {
      console.error("Error loading chat messages:", error);
      setLoading(false);
    }
  };
  
  const handleSend = async () => {
    if (!input.trim() || !familyId) return;
    
    try {
      // Process message with NLU first
      const intent = nlu.current.detectIntent(input);
      const entities = nlu.current.extractEntities(input);
      
      // Display NLU results
      setDetectedIntent(intent);
      setExtractedEntities(entities);
      
      // Add user message to state for immediate display
      const userMessage = {
        familyId,
        sender: 'user',
        userName: 'You',
        text: input,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setLoading(true);
      setFeedback(null);
      
      // Save message to database
      await EnhancedChatService.saveMessage(userMessage);
      
      // Update conversation context
      const updatedContext = EnhancedChatService.updateConversationContext(familyId, {
        query: input,
        intent,
        entities
      });
      
      setConversationContext(updatedContext.recentTopics || []);
      
      // Get AI response
      const aiResponse = await EnhancedChatService.getAIResponse(
        input, 
        familyId, 
        [...messages, userMessage]
      );
      
      // Add AI response to messages
      const allieMessage = {
        familyId,
        sender: 'allie',
        userName: 'Allie',
        text: aiResponse,
        timestamp: new Date().toISOString()
      };
      
      // Save AI message to database
      await EnhancedChatService.saveMessage(allieMessage);
      
      // Update messages state with AI response
      setMessages(prev => [...prev, allieMessage]);
      setLoading(false);
    } catch (error) {
      console.error("Error processing message:", error);
      setLoading(false);
      
      // Add fallback error message
      setMessages(prev => [
        ...prev,
        {
          familyId,
          sender: 'allie',
          userName: 'Allie',
          text: "I'm having trouble processing your request right now. Please try again in a moment.",
          timestamp: new Date().toISOString()
        }
      ]);
    }
  };
  
  const provideFeedback = async (messageId, feedbackType) => {
    try {
      setFeedback(feedbackType);
      
      // Save feedback to database
      await EnhancedChatService.saveUserFeedback(messageId, feedbackType);
      
      // Optionally provide a correction
      if (feedbackType === 'thumbsDown') {
        const correction = prompt("What was wrong with this response?");
        
        if (correction) {
          await EnhancedChatService.saveUserFeedback(messageId, feedbackType, correction);
        }
      }
    } catch (error) {
      console.error("Error saving feedback:", error);
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-4 min-h-[500px] max-h-[500px] flex flex-col">
            <h3 className="text-lg font-medium font-roboto mb-2">Enhanced Chat Demo</h3>
            
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {messages.length === 0 ? (
                <p className="text-gray-500 text-center mt-10 font-roboto">
                  No messages yet. Start chatting with Allie!
                </p>
              ) : (
                messages.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg ${
                      msg.sender === 'allie' 
                        ? 'bg-blue-50 ml-4' 
                        : 'bg-gray-100 mr-4'
                    }`}
                  >
                    <div className="flex items-center mb-1">
                      <span className="font-medium font-roboto text-sm">{msg.userName}</span>
                      <span className="text-xs text-gray-500 ml-2 font-roboto">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="font-roboto whitespace-pre-wrap">{msg.text}</p>
                    
                    {/* Feedback buttons for Allie messages */}
                    {msg.sender === 'allie' && index === messages.length - 1 && (
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <button
                          onClick={() => provideFeedback(msg.id, 'thumbsUp')}
                          className={`hover:text-green-500 ${feedback === 'thumbsUp' ? 'text-green-500' : ''}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                          </svg>
                          Helpful
                        </button>
                        <button
                          onClick={() => provideFeedback(msg.id, 'thumbsDown')}
                          className={`ml-3 hover:text-red-500 ${feedback === 'thumbsDown' ? 'text-red-500' : ''}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                          </svg>
                          Not helpful
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
              
              {loading && (
                <div className="flex items-center justify-center space-x-1 my-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input area */}
            <div className="mt-3">
              <div className="flex">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask Allie a question..."
                  className="flex-1 border rounded-l-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 font-roboto resize-none"
                  rows="2"
                ></textarea>
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="bg-blue-600 text-white px-4 rounded-r-md hover:bg-blue-700 disabled:bg-blue-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1 font-roboto">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>
        </div>
        
        {/* NLU Insights Panel */}
        <div className="bg-white rounded-lg shadow-md p-4 h-[500px] overflow-y-auto">
          <h3 className="text-lg font-medium font-roboto mb-2">NLU Insights</h3>
          
          {detectedIntent && (
            <div className="mb-4">
              <h4 className="text-sm font-medium font-roboto">Detected Intent:</h4>
              <div className="bg-blue-50 p-2 rounded text-sm font-mono mt-1">
                {detectedIntent}
              </div>
            </div>
          )}
          
          {extractedEntities && Object.keys(extractedEntities).length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium font-roboto">Extracted Entities:</h4>
              <div className="bg-blue-50 p-2 rounded text-sm font-mono mt-1 overflow-x-auto">
                <pre className="text-xs">
                  {JSON.stringify(extractedEntities, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
          {conversationContext.length > 0 && (
            <div>
              <h4 className="text-sm font-medium font-roboto">Conversation Context:</h4>
              <div className="bg-blue-50 p-2 rounded text-sm mt-1">
                <ul className="list-disc list-inside text-xs">
                  {conversationContext.map((topic, index) => (
                    <li key={index} className="font-roboto">
                      {topic.query ? (
                        <span className="font-medium">{topic.query.substring(0, 30)}...</span>
                      ) : (
                        <span className="italic">Previous topic</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {!detectedIntent && !extractedEntities && (
            <p className="text-gray-500 text-center mt-10 font-roboto">
              Send a message to see NLU processing insights here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedChatDemo;