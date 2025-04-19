// src/components/calendar/EventsList.jsx
import React from 'react';
import { AlertCircle, Activity, BookOpen, Bell, Users, FileText, User, Heart, Clock, Calendar, Check, Edit, Trash2, MapPin } from 'lucide-react';
import UserAvatar from '../common/UserAvatar';
import EventSourceBadge from './EventSourceBadge';
import CalendarOperations from '../../utils/CalendarOperations';

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
 * @param {Function} props.renderBadges - Optional function to render custom badges
 * @param {Boolean} props.showActionButtons - Whether to show action buttons (default: false for upcoming events)
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
  emptyMessage = "No events scheduled",
  renderBadges,
  showActionButtons = false, // Added this prop with default value false
  familyMembers = [] // Add this prop with default empty array
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
  
  const findFamilyMember = (id) => {
    return familyMembers.find(member => member.id === id);
  };

  // Format time for display
  const formatTime = (dateString) => {
    if (!dateString) return "";
    
    const date = new Date(dateString);
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };
  
  const AttendeeAvatars = ({ attendees = [], max = 3 }) => {
    return (
      <div className="flex -space-x-2 items-center">
        {attendees.slice(0, max).map((attendee, i) => {
          // Try to find the complete family member data if we only have an ID
          const memberData = attendee.id && !attendee.profilePicture ? 
            findFamilyMember(attendee.id) : attendee;
            
          return (
            <div 
              key={i} 
              className="w-6 h-6 rounded-full overflow-hidden border border-white shadow-sm"
              title={attendee.name || memberData?.name}
            >
              <UserAvatar 
                user={memberData || attendee}
                size={24}
              />
            </div>
          );
        })}
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
    
    // Only show action buttons if specifically enabled (for event lists that need them)
    if (!showActionButtons) {
      return null; // Don't show any action buttons for upcoming events
    }
    
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
          {events.map((event, index) => {
            // Get formatted date and time
            const dateObj = event.dateObj || new Date(event.start?.dateTime || event.dateTime || event.date);
            const formattedDate = CalendarOperations.formatDate(dateObj, 'medium');
            const formattedTime = CalendarOperations.formatTime(dateObj);
            
            return (
              <div 
                key={index} 
                className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => onEventClick(event)}
              >
                <div className="flex justify-between">
                  <div className="flex-1">
                    {/* Title row with badges */}
                    <div className="flex items-center mb-1">
                      {getEventIcon(event)}
                      <p className="text-sm font-medium font-roboto">{event.title}</p>
                      
                      {/* Display source badge */}
                      <div className="ml-2">
                        <EventSourceBadge 
                          event={event} 
                          size="sm"
                          showDetails={false}
                        />
                      </div>
                      
                      {/* Custom badges if provided */}
                      {renderBadges && renderBadges(event)}
                    </div>
                    
                    {/* Date & Time row */}
                    <div className="flex items-center text-xs text-gray-500 font-roboto mb-1">
                      <Clock size={12} className="mr-1" />
                      <span>
                        {formattedDate} • {formattedTime}
                        {event.end?.dateTime && ` - ${CalendarOperations.formatTime(new Date(event.end.dateTime))}`}
                      </span>
                    </div>
                    
                    {/* Location row if available */}
                    {event.location && (
                      <div className="flex items-center text-xs text-gray-500 font-roboto mb-1">
                        <MapPin size={12} className="mr-1" />
                        <span className="truncate max-w-xs">{event.location}</span>
                      </div>
                    )}
                    {/* Document and Provider info */}
{(event.documents?.length > 0 || event.providers?.length > 0) && (
  <div className="mt-1 flex flex-wrap gap-1">
    {event.documents?.map((doc, index) => (
      <span key={`doc-${index}`} className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">
        <FileText size={10} className="mr-1" />
        {doc.title || doc.fileName || 'Document'}
      </span>
    ))}
    
    {event.providers?.map((provider, index) => (
      <span key={`prov-${index}`} className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-purple-50 text-purple-700">
        <User size={10} className="mr-1" />
        {provider.name || 'Provider'}
      </span>
    ))}
  </div>
)}
                    {/* Description row - truncated */}
                    {event.description && (
                      <div className="text-xs text-gray-600 font-roboto mt-1 line-clamp-2 max-w-xs">
                        {event.description}
                      </div>
                    )}
                  </div>
                  
                  {/* Action buttons or attendee avatars */}
<div className="ml-2 flex items-center self-start">
  {showActionButtons && onEventAdd && onEventEdit && onEventDelete ? (
    <EventActions event={event} />
  ) : (
    // Always show avatars for events without action buttons
    <>
      {/* Show combined attendees for a better visualization */}
      {(() => {
        // Collect all attendees from various sources
        const allAttendees = [
          // If event has explicit attendees, use those
          ...(event.attendees || []),
          
          // If not, try to collect from other properties
          ...(!event.attendees || event.attendees.length === 0 ? [
            // Add child if present
            ...(event.childId ? [{
              id: event.childId,
              name: event.childName,
              role: 'child',
              // Try to get full data from family members
              ...(familyMembers.find(m => m.id === event.childId) || {})
            }] : []),
            
            // Add siblings if present
            ...(event.siblingIds?.map((sibId, index) => {
              const sibling = familyMembers.find(m => m.id === sibId);
              return {
                id: sibId,
                name: event.siblingNames?.[index] || (sibling ? sibling.name : 'Sibling'),
                role: 'child',
                ...(sibling || {})
              };
            }) || []),
            
            // Add attending parent if specified
            ...(event.attendingParentId ? (
              event.attendingParentId === 'both' ?
                // Add both parents
                familyMembers.filter(m => m.role === 'parent').map(parent => ({
                  id: parent.id,
                  name: parent.name,
                  role: 'parent',
                  ...parent
                })) :
                // Add single parent
                [{
                  id: event.attendingParentId,
                  name: familyMembers.find(m => m.id === event.attendingParentId)?.name || 'Parent',
                  role: 'parent',
                  ...(familyMembers.find(m => m.id === event.attendingParentId) || {})
                }]
            ) : [])
          ] : [])
        ];
        
        // If we have attendees, display them
        if (allAttendees.length > 0) {
          return <AttendeeAvatars attendees={allAttendees} max={3} />;
        }
        
        // For events with no attendees, use event type icons
        if (event.category === 'meeting') {
          return (
            <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 text-xs">
              <Users size={14} />
            </div>
          );
        } else if (event.category === 'appointment') {
          return (
            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-800 text-xs">
              <AlertCircle size={14} />
            </div>
          );
        } else {
          // Generic calendar icon as fallback
          return (
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs">
              <Calendar size={14} />
            </div>
          );
        }
      })()}
    </>
  )}
</div>
                </div>
              </div>
            );
          })}
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