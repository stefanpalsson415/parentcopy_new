// src/components/chat/ChatMessage.jsx
import React, { useState } from 'react';
import { ExternalLink, ThumbsUp, Image, Paperclip, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import ChatFeedback from './ChatFeedback';

const ChatMessage = ({ message, showFeedback = true, onReact = null, onDelete = null, onEdit = null }) => {
  const isAllie = message.sender === 'allie';
  const [showOptions, setShowOptions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.text || '');
  
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
  
  // Function to add line breaks to text and filter out voiceNote tags
  const formatWithLineBreaks = (text) => {
    if (!text) return '';
    
    // Filter out any voiceNote tags first
    text = text.replace(/<voiceNote>.*?<\/voiceNote>/g, '');
    
    return text.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        {formatMessageText(line)}
        {i < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };
  
  // Function to handle message deletion
const handleDelete = async (e) => {
  // Instead of window.confirm, use a custom confirmation approach
  // This avoids browser notifications and keeps everything in-app
  // For now, I'll keep the confirmation logic but we can add a custom modal later
  
  // Prevent event propagation
  e.stopPropagation();
  
  // Simple in-app confirm dialog
  const confirmDelete = window.confirm("Are you sure you want to delete this message?");
  
  if (confirmDelete && onDelete) {
    // Call the delete handler from the parent component
    onDelete(message.id);
  }
  
  setShowOptions(false);
};
  
  // Function to handle editing
  const handleEdit = () => {
    setIsEditing(true);
    setShowOptions(false);
  };
  
  // Function to save edits and rerun
  const saveAndRerun = () => {
    if (editedText.trim() && onEdit) {
      onEdit(message.id, editedText);
      setIsEditing(false);
    }
  };
  
  // Function to cancel editing
  const cancelEdit = () => {
    setEditedText(message.text || '');
    setIsEditing(false);
  };
  
  return (
    <div className={`flex mb-4 ${isAllie ? 'justify-start' : 'justify-end'} relative group`}>
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
        
        {/* Show edit form if editing, otherwise show message */}
        {isEditing ? (
          <div className="mt-2">
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full p-2 border rounded text-sm text-black"
              rows={Math.max(3, (editedText.match(/\n/g) || []).length + 1)}
              autoFocus
            />
            <div className="flex justify-end mt-2 space-x-2">
              <button 
                onClick={cancelEdit}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
              <button 
                onClick={saveAndRerun}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save & Rerun
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm whitespace-pre-wrap font-roboto leading-relaxed">
            {formatWithLineBreaks(message.text)}
            {message.isEdited && (
              <span className="text-xs text-gray-500 italic ml-1">(edited)</span>
            )}
          </div>
        )}
        
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
      
      {/* Message options (only for user messages) */}
      {!isAllie && !isEditing && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => setShowOptions(!showOptions)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          >
            <MoreHorizontal size={16} />
          </button>
          
          {/* Options dropdown */}
          {showOptions && (
            <div className="absolute right-0 mt-1 bg-white rounded-md shadow-lg z-10 border overflow-hidden">
              <button 
                onClick={handleEdit}
                className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 w-full text-left flex items-center"
              >
                <Edit size={14} className="mr-2" />
                Edit & Rerun
              </button>
              <button 
                onClick={handleDelete}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left flex items-center"
              >
                <Trash2 size={14} className="mr-2" />
                Delete Message
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatMessage;