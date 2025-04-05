// src/components/chat/ChatMessage.jsx
import React from 'react';
import { ExternalLink, ThumbsUp, Image, Paperclip } from 'lucide-react';
import ChatFeedback from './ChatFeedback';

const ChatMessage = ({ message, showFeedback = true, onReact = null }) => {
  const isAllie = message.sender === 'allie';
  
  // Function to detect URLs and make them clickable
  const formatMessageText = (text) => {
    if (!text) return '';
    
    // Simple URL regex pattern
    const urlPattern = /https?:\/\/[^\s]+/g;
    
    // Split the text by URLs
    const parts = text.split(urlPattern);
    
    // Extract URLs from the text
    const urls = text.match(urlPattern) || [];
    
    // Combine parts and URLs back together with links
    return parts.map((part, i) => (
      <React.Fragment key={i}>
        {part}
        {urls[i] && (
          <a 
            href={urls[i]} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-500 hover:underline inline-flex items-center"
          >
            {urls[i].length > 30 ? urls[i].substring(0, 30) + '...' : urls[i]}
            <ExternalLink size={12} className="ml-1" />
          </a>
        )}
      </React.Fragment>
    ));
  };
  
  // Function to add line breaks to text
  const formatWithLineBreaks = (text) => {
    if (!text) return '';
    
    return text.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        {formatMessageText(line)}
        {i < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };
  
  return (
    <div className={`flex mb-4 ${isAllie ? 'justify-start' : 'justify-end'}`}>
      {isAllie && (
        <div className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center mr-2 flex-shrink-0">
          <span className="text-xs font-bold font-roboto">A</span>
        </div>
      )}
      
      <div className={`max-w-[80%] p-3 rounded-lg ${
        isAllie 
          ? 'bg-white border border-gray-200 shadow-sm' 
          : 'bg-black text-white'
      }`}>
        <div className="flex justify-between items-start">
          {!isAllie && (
            <div className="font-medium text-xs mb-1 font-roboto">{message.userName}</div>
          )}
          {isAllie && (
            <div className="font-medium text-xs mb-1 font-roboto">Allie</div>
          )}
          <div className="text-xs text-gray-500 ml-2 font-roboto">
            {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </div>
        </div>
        
        <div className="text-sm whitespace-pre-wrap font-roboto leading-relaxed">
          {formatWithLineBreaks(message.text)}
        </div>
        
        {/* Show image if present */}
        {message.imageUrl && (
          <div className="mt-2 max-w-xs">
            <img 
              src={message.imageUrl} 
              alt="Shared in chat" 
              className="rounded-md max-w-full h-auto"
            />
          </div>
        )}
        
        {/* Show file attachment if present */}
        {message.fileUrl && (
          <div className="mt-2">
            <a 
              href={message.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center p-2 bg-gray-100 rounded-md text-sm hover:bg-gray-200"
            >
              <Paperclip size={14} className="mr-2 text-gray-600" />
              <span className="text-gray-800 truncate">{message.fileName || "Attachment"}</span>
            </a>
          </div>
        )}
        
        {/* Show feedback component for Allie messages */}
        {isAllie && showFeedback && message.id && (
          <ChatFeedback messageId={message.id} familyId={message.familyId} />
        )}
      </div>
      
      {!isAllie && message.userImage && (
        <div className="h-8 w-8 rounded-full overflow-hidden ml-2 flex-shrink-0">
          <img 
            src={message.userImage} 
            alt={message.userName}
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;