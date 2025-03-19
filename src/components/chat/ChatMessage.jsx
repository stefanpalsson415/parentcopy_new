import React from 'react';

const ChatMessage = ({ message }) => {
  const isAllie = message.sender === 'allie';
  
  return (
    <div className={`flex mb-3 ${isAllie ? 'justify-start' : 'justify-end'}`}>
      {isAllie && (
        <div className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center mr-2 flex-shrink-0">
          <span className="text-xs font-bold">A</span>
        </div>
      )}
      
      <div className={`max-w-[80%] p-3 rounded-lg ${
        isAllie 
          ? 'bg-white border border-gray-200' 
          : 'bg-blue-100 text-black'
      }`}>
        {!isAllie && (
          <div className="font-medium text-xs mb-1">{message.userName}</div>
        )}
        <div className="text-sm whitespace-pre-wrap">{message.text}</div>
        <div className="text-xs text-gray-500 mt-1 text-right">
          {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </div>
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