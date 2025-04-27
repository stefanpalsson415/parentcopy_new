// src/components/calendar/EventCreationSummary.jsx
import React from 'react';
import { Calendar, MapPin, User, Clock, Tag, AlertCircle, Check, Info } from 'lucide-react';

const EventCreationSummary = ({ event, onEdit, onConfirm }) => {
  if (!event) return null;
  
  // Format date and time
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };
  
  // Get icon for event type
  const getEventTypeIcon = () => {
    switch(event.eventType) {
      case 'dentist':
      case 'doctor':
        return <AlertCircle size={20} className="text-red-500" />;
      case 'activity':
        return <Activity size={20} className="text-green-500" />;
      case 'birthday':
        return <Gift size={20} className="text-purple-500" />;
      case 'meeting':
        return <Users size={20} className="text-amber-500" />;
      case 'date-night':
        return <Heart size={20} className="text-pink-500" />;
      case 'travel':
      case 'vacation':
        return <Plane size={20} className="text-blue-500" />;
      case 'playdate':
        return <Users size={20} className="text-indigo-500" />;
      default:
        return <Calendar size={20} className="text-gray-500" />;
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 max-w-md mx-auto mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-lg flex items-center">
          {getEventTypeIcon()}
          <span className="ml-2">{event.title || 'New Event'}</span>
        </h3>
        {onEdit && (
          <button 
            onClick={onEdit}
            className="text-blue-600 text-sm flex items-center"
          >
            <Edit size={14} className="mr-1" />
            Edit
          </button>
        )}
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-start">
          <Calendar size={16} className="mr-2 mt-0.5 text-gray-500" />
          <div>
            <div>{formatDate(event.dateTime)}</div>
            <div className="text-gray-500">{formatTime(event.dateTime)}</div>
          </div>
        </div>
        
        {event.location && (
          <div className="flex items-start">
            <MapPin size={16} className="mr-2 mt-0.5 text-gray-500" />
            <span>{event.location}</span>
          </div>
        )}
        
        {event.childName && (
          <div className="flex items-start">
            <User size={16} className="mr-2 mt-0.5 text-gray-500" />
            <span>For: {event.childName}</span>
          </div>
        )}
        
        {/* Event type specific details */}
        {event.eventType === 'dentist' && event.appointmentDetails?.doctorName && (
          <div className="flex items-start">
            <User size={16} className="mr-2 mt-0.5 text-gray-500" />
            <span>Dentist: {event.appointmentDetails.doctorName}</span>
          </div>
        )}
        
        {event.eventType === 'doctor' && event.appointmentDetails?.doctorName && (
          <div className="flex items-start">
            <User size={16} className="mr-2 mt-0.5 text-gray-500" />
            <span>Doctor: {event.appointmentDetails.doctorName}</span>
          </div>
        )}
        
        {event.eventType === 'activity' && event.activityDetails?.equipmentNeeded && (
          <div className="flex items-start">
            <Tag size={16} className="mr-2 mt-0.5 text-gray-500" />
            <span>Equipment: {event.activityDetails.equipmentNeeded}</span>
          </div>
        )}
        
        {/* Missing details indicator */}
        {event.missingRequiredFields && event.missingRequiredFields.length > 0 && (
          <div className="mt-3 p-2 bg-amber-50 rounded border border-amber-200 text-amber-800 text-xs">
            <div className="flex items-center mb-1">
              <Info size={14} className="mr-1" />
              <span className="font-medium">Missing information:</span>
            </div>
            <ul className="list-disc list-inside pl-1">
              {event.missingRequiredFields.map(field => (
                <li key={field}>{field.replace(/([A-Z])/g, ' $1').toLowerCase()}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {onConfirm && (
        <button
          onClick={onConfirm}
          className="w-full mt-4 bg-green-600 text-white py-2 rounded-md flex items-center justify-center"
        >
          <Check size={16} className="mr-2" />
          Add to Calendar
        </button>
      )}
    </div>
  );
};

export default EventCreationSummary;