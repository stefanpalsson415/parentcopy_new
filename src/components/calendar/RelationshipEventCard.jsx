// src/components/calendar/RelationshipEventCard.jsx
import React from 'react';
import { Heart, Calendar, Clock, MapPin, Users, Info } from 'lucide-react';
import CalendarOperations from '../../services/CalendarOperations';



/**
 * Special event card for relationship-focused calendar events
 */
const RelationshipEventCard = ({ event, onView, onEdit, onDelete }) => {
  // Determine event type to style appropriately
  const getEventTypeDetails = () => {
    const type = event.eventType || 
                (event.metadata && event.metadata.eventType) || 
                'general';
    
    switch (type.toLowerCase()) {
      case 'date-night':
        return {
          icon: <Heart size={16} className="text-pink-600" />,
          bgColor: 'bg-pink-50',
          borderColor: 'border-pink-200',
          label: 'Date Night'
        };
      case 'check-in':
        return {
          icon: <Users size={16} className="text-purple-600" />,
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          label: 'Couple Check-in'
        };
      case 'meeting':
        return {
          icon: <Users size={16} className="text-red-600" />,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Relationship Meeting'
        };
      case 'self-care':
        return {
          icon: <Heart size={16} className="text-blue-600" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          label: 'Self-Care'
        };
      default:
        return {
          icon: <Heart size={16} className="text-gray-600" />,
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Relationship'
        };
    }
  };
  
  // Get style details for this event type
  const { icon, bgColor, borderColor, label } = getEventTypeDetails();
  
  // Get formatted date and time
  const formatEventDate = () => {
    try {
      const startDate = event.start?.dateTime ? new Date(event.start.dateTime) : new Date();
      return CalendarOperations.formatDate(startDate, 'medium');
    } catch (error) {
      return 'Date unavailable';
    }
  };
  
  const formatEventTime = () => {
    try {
      const startDate = event.start?.dateTime ? new Date(event.start.dateTime) : new Date();
      const endDate = event.end?.dateTime ? new Date(event.end.dateTime) : null;
      
      const startTime = CalendarOperations.formatTime(startDate);
      
      if (endDate) {
        const endTime = CalendarOperations.formatTime(endDate);
        return `${startTime} - ${endTime}`;
      }
      
      return startTime;
    } catch (error) {
      return 'Time unavailable';
    }
  };
  
  // Get cycle number if available
  const getCycleNumber = () => {
    if (event.metadata && event.metadata.cycleNumber) {
      return event.metadata.cycleNumber;
    }
    
    // Try to extract from title if it contains "Cycle X"
    const cycleMatch = event.title?.match(/Cycle\s+(\d+)/i);
    if (cycleMatch && cycleMatch[1]) {
      return parseInt(cycleMatch[1], 10);
    }
    
    return null;
  };
  
  const cycleNumber = getCycleNumber();
  
  return (
    <div className={`p-4 ${bgColor} rounded-lg border ${borderColor} mb-3 hover:shadow-md transition-all`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center">
          <div className="mr-2 flex-shrink-0">
            {icon}
          </div>
          <h4 className="font-medium font-roboto">{event.title || 'Untitled Event'}</h4>
        </div>
        
        {cycleNumber && (
          <span className="bg-black text-white text-xs font-bold rounded-full px-2 py-1">
            Cycle {cycleNumber}
          </span>
        )}
      </div>
      
      <div className="space-y-2 ml-6">
        <div className="flex items-center text-sm text-gray-600">
          <Calendar size={14} className="mr-1 text-gray-400" />
          <span>{formatEventDate()}</span>
        </div>
        
        <div className="flex items-center text-sm text-gray-600">
          <Clock size={14} className="mr-1 text-gray-400" />
          <span>{formatEventTime()}</span>
        </div>
        
        {event.location && (
          <div className="flex items-center text-sm text-gray-600">
            <MapPin size={14} className="mr-1 text-gray-400" />
            <span>{event.location}</span>
          </div>
        )}
      </div>
      
      {event.description && (
        <div className="mt-3 p-2 bg-white rounded text-sm">
          <p className="text-gray-700">{event.description}</p>
        </div>
      )}
      
      <div className="flex mt-3 justify-between">
        <div>
          <span className="inline-flex items-center bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
            {label}
          </span>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => onView && onView(event)}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="View details"
          >
            <Info size={16} />
          </button>
          
          <button
            onClick={() => onEdit && onEdit(event)}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Edit event"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RelationshipEventCard;