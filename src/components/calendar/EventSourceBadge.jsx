// src/components/calendar/EventSourceBadge.jsx
import React from 'react';
import { 
  MessageCircle, 
  BrainCircuit, 
  FileText, 
  Image, 
  UserCircle, 
  Bot, 
  Calendar
} from 'lucide-react';

/**
 * Component to display a badge indicating the source of a calendar event
 * 
 * @param {Object} props
 * @param {Object} props.event - The event object
 * @param {boolean} props.showDetails - Whether to show detailed extraction info
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.size - Badge size ('sm', 'md', 'lg')
 */
const EventSourceBadge = ({ 
  event, 
  showDetails = false, 
  className = '', 
  size = 'md'
}) => {
  if (!event) return null;
  
  // Extract source information
  const source = event.source || 'manual';
  const extraDetails = event.extraDetails || {};
  const parsedWithAI = extraDetails.parsedWithAI || false;
  const parsedFromImage = extraDetails.parsedFromImage || false;
  const extractionConfidence = extraDetails.extractionConfidence || null;
  const creationSource = extraDetails.creationSource || source;
  
  // Determine badge style based on source
  let badgeStyle = '';
  let badgeIcon = null;
  let badgeText = '';
  
  // Set sizes based on the size prop
  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs';
  const badgeSize = size === 'sm' ? 'px-1 py-0.5' : size === 'lg' ? 'px-2.5 py-1.5' : 'px-2 py-1';
  
  // Determine badge style based on source
  switch (creationSource) {
    case 'chat':
    case 'message':
      badgeStyle = 'bg-blue-100 text-blue-800';
      badgeIcon = <MessageCircle size={iconSize} className="mr-1" />;
      badgeText = 'Chat';
      break;
    case 'parser':
    case 'AI-parse-text':
      badgeStyle = 'bg-purple-100 text-purple-800';
      badgeIcon = <BrainCircuit size={iconSize} className="mr-1" />;
      badgeText = 'AI';
      break;
    case 'AI-parse-image':
      badgeStyle = 'bg-purple-100 text-purple-800';
      badgeIcon = <Image size={iconSize} className="mr-1" />;
      badgeText = 'AI Image';
      break;
    case 'document':
    case 'email':
      badgeStyle = 'bg-amber-100 text-amber-800';
      badgeIcon = <FileText size={iconSize} className="mr-1" />;
      badgeText = 'Document';
      break;
    case 'system':
    case 'task-system':
      badgeStyle = 'bg-green-100 text-green-800';
      badgeIcon = <Bot size={iconSize} className="mr-1" />;
      badgeText = 'Allie';
      break;
    case 'manual':
    default:
      badgeStyle = 'bg-gray-100 text-gray-800';
      badgeIcon = <UserCircle size={iconSize} className="mr-1" />;
      badgeText = 'Manual';
      break;
  }
  
  // Override if we have direct AI parsing info
  if (parsedWithAI) {
    badgeStyle = 'bg-purple-100 text-purple-800';
    badgeIcon = parsedFromImage 
      ? <Image size={iconSize} className="mr-1" /> 
      : <BrainCircuit size={iconSize} className="mr-1" />;
    badgeText = 'AI';
  }
  
  // For calendar integrations
  if (source === 'google' || source === 'apple' || source === 'outlook') {
    badgeStyle = 'bg-indigo-100 text-indigo-800';
    badgeIcon = <Calendar size={iconSize} className="mr-1" />;
    badgeText = source.charAt(0).toUpperCase() + source.slice(1);
  }
  
  return (
    <div className={`inline-flex items-center ${badgeStyle} ${badgeSize} rounded-full ${textSize} font-medium ${className}`}>
      {badgeIcon}
      <span>{badgeText}</span>
      
      {/* Show confidence if available and requested */}
      {showDetails && parsedWithAI && extractionConfidence !== null && (
        <span className="ml-1">
          {Math.round(extractionConfidence * 100)}%
        </span>
      )}
    </div>
  );
};

export default EventSourceBadge;