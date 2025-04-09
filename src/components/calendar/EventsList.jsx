import React from 'react';
import { AlertCircle, Activity, BookOpen, Bell, Users, Heart, Clock, Calendar, Check, Edit, Trash2 } from 'lucide-react';

/**
 * Event list component to display calendar events
 * 
 * @param {Object} props
 * @param {Array} props.events - List of events to display
 * @param {Function} props.onEventClick - Function to call when an event is clicked
 * @param {Function} props.onEventAdd - Function to call when an event is added to calendar
 * @param {Function} props.onEventEdit - Function to call when an event is edited
 * @param {Function} props.onEventDelete - Function to call when an event is deleted
 * @param {Object} props.addedEvents - Map of events that have been added to calendar
 * @param {Object} props.showAddedMessage - Map of events showing "Added" message
 * @param {Boolean} props.loading - Whether events are loading
 * @param {string} props.title - Optional title for the events list
 * @param {string} props.emptyMessage - Message to show when no events are found
 */
const EventsList = ({ 
  events = [], 
  onEventClick, 
  onEventAdd, 
  onEventEdit, 
  onEventDelete,
  addedEvents = {},
  showAddedMessage = {},
  loading = false,
  title = "Events",
  emptyMessage = "No events scheduled"
}) => {
  
  // Helper function to get a unique key for an event
  const getEventKey = (event) => {
    if (!event) return null;
    
    // Try to create a unique identifier based on event properties
    let key = '';
    
    if (event.id) key += event.id; // Use ID first if available
    else {
      if (event.title) key += event.title;
      if (event.dateObj) key += '-' + event.dateObj.toISOString().split('T')[0];
      if (event.childName) key += '-' + event.childName;
      // If ID was missing but we have firestoreId, add it
      if (event.firestoreId) key += '-' + event.firestoreId;
    }
    
    return key.toLowerCase().replace(/\s+/g, '-');
  };
  
  // Helper to get appropriate icon for event type
  const getEventIcon = (event) => {
    switch (event.eventType) {
      case 'appointment':
        return <AlertCircle size={14} className="text-red-500 mr-1" />;
      case 'activity':
        return <Activity size={14} className="text-blue-500 mr-1" />;
      case 'homework':
        return <BookOpen size={14} className="text-green-500 mr-1" />;
      case 'event':
        return <Bell size={14} className="text-purple-500 mr-1" />;
      case 'meeting':
        return <Users size={14} className="text-indigo-500 mr-1" />;
      case 'relationship':
        return <Heart size={14} className="text-pink-500 mr-1" />;
      case 'task':
        return <Clock size={14} className="text-amber-500 mr-1" />;
      case 'general':
        return <Calendar size={14} className="text-blue-500 mr-1" />;
      default:
        return <Calendar size={14} className="text-gray-500 mr-1" />;
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "Not scheduled";
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Attendee display component
  const AttendeeAvatars = ({ attendees = [], max = 3 }) => {
    return (
      <div className="flex -space-x-2 ml-2 items-center">
        {attendees.slice(0, max).map((attendee, i) => (
          <div 
            key={i} 
            className="w-6 h-6 rounded-full overflow-hidden border border-white shadow-sm bg-white"
            title={attendee.name}
          >
            <img 
              src={attendee.profilePicture || `/api/placeholder/24/24`} 
              alt={attendee.name}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
        {attendees.length > max && (
          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center border border-white shadow-sm text-xs" title={`${attendees.length - max} more attendees`}>
            +{attendees.length - max}
          </div>
        )}
      </div>
    );
  };
  
  // Render event action buttons
  const EventActions = ({ event }) => {
    const eventKey = getEventKey(event);
    
    if (!addedEvents[eventKey]) {
      return (
        <button 
          onClick={(e) => {
            e.stopPropagation(); // Prevent opening details modal
            onEventAdd(event);
          }}
          className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800 font-roboto"
        >
          Add
        </button>
      );
    }
    
    if (showAddedMessage[eventKey]) {
      return (
        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded font-roboto flex items-center">
          <Check size={12} className="mr-1" />
          Added
        </span>
      );
    }
    
    return (
      <div className="flex space-x-1">
        <button 
          onClick={(e) => {
            e.stopPropagation(); // Prevent opening details modal
            onEventEdit(event);
          }}
          className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
          title="Edit event"
        >
          <Edit size={14} />
        </button>
        
        {event.firestoreId && (
          <button 
            onClick={(e) => {
              e.stopPropagation(); // Prevent opening details modal
              onEventDelete(event);
            }}
            className="p-1 text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-100"
            title="Delete event"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2 font-roboto">{title}</h4>
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-t-transparent border-black rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="mb-4">
      <h4 className="text-sm font-medium mb-2 font-roboto">{title}</h4>
      
      {events.length > 0 ? (
        <div className="space-y-2">
          {events.map((event, index) => (
            <div 
              key={index} 
              className="border rounded-lg p-2 hover:bg-gray-50 cursor-pointer"
              onClick={() => onEventClick(event)}
            >
              <div className="flex justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    {getEventIcon(event)}
                    <p className="text-sm font-medium font-roboto">{event.title}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500 font-roboto">
                      {event.time || event.dateObj?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      {event.location && ` - ${event.location}`}
                    </p>
                    
                    {/* Attendee avatars - assuming we pass attendees with the event */}
                    {event.attendees && event.attendees.length > 0 && (
                      <AttendeeAvatars attendees={event.attendees} />
                    )}
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="ml-2 flex items-center">
                  {onEventAdd && onEventEdit && onEventDelete && (
                    <EventActions event={event} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 font-roboto">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
};

export default EventsList;