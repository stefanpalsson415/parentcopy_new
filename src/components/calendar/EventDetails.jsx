import React, { useState } from 'react';
import { 
  X, Check, Edit, Trash2, Calendar, Clock, MapPin, User, Users, Info, AlertCircle 
} from 'lucide-react';
import UserAvatar from '../common/UserAvatar';

/**
 * Component to display event details with options to edit or delete
 * 
 * @param {Object} props
 * @param {Object} props.event - Event to display
 * @param {Function} props.onClose - Function to call when closing the details
 * @param {Function} props.onEdit - Function to call when edit button is clicked
 * @param {Function} props.onDelete - Function to call when delete button is clicked
 * @param {Array} props.familyMembers - List of family members for attendee display
 * @param {string} props.pendingAction - Currently pending action ('delete')
 * @param {boolean} props.showSuccess - Whether to show success animation
 */
const EventDetails = ({ 
  event, 
  onClose, 
  onEdit, 
  onDelete, 
  familyMembers = [],
  pendingAction = null,
  showSuccess = false
}) => {
  // Add a null check before trying to use event properties
  if (!event) {
    console.warn("EventDetails received null event");
    return null;
  }
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Format time for display
  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold font-roboto flex items-center">
            {event.title}
            <span className="ml-2 text-xs px-2 py-1 rounded-full bg-gray-100">
              {event.eventType || 'event'}
            </span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            {/* Date and Time */}
            <div className="flex items-start">
              <Clock size={18} className="mr-2 mt-1 text-gray-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm font-roboto">Date & Time</p>
                <p className="text-sm text-gray-600 font-roboto">
                  {formatDate(event.dateObj || event.date || event.dateTime)}
                </p>
                <p className="text-sm text-gray-600 font-roboto">
                  {event.time || formatTime(event.dateObj || event.date || event.dateTime)}
                  {event.dateEndObj && ` - ${formatTime(event.dateEndObj)}`}
                </p>
              </div>
            </div>
            
            {/* Location */}
            <div className="flex items-start">
              <MapPin size={18} className="mr-2 mt-1 text-gray-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm font-roboto">Location</p>
                <p className="text-sm text-gray-600 font-roboto">{event.location || "TBD"}</p>
              </div>
            </div>
            
            {/* Child Information */}
            {(event.childName || event.childId) && (
              <div className="flex items-start">
                <User size={18} className="mr-2 mt-1 text-gray-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm font-roboto">For Child</p>
                  <div className="flex items-center">
                    {event.childId && familyMembers.find(m => m.id === event.childId) && (
                      <div className="w-6 h-6 rounded-full overflow-hidden mr-2">
                        <UserAvatar
                          user={{
                            id: event.childId,
                            name: event.childName,
                            profilePicture: event.childId && familyMembers.find(m => m.id === event.childId)?.profilePicture
                          }}
                          size={24}
                        />
                      </div>
                    )}
                    <span className="text-sm text-gray-600 font-roboto">{event.childName || 'Unknown child'}</span>
                  </div>
                  
                  {/* Show sibling information if available */}
                  {(event.siblingIds?.length > 0 || event.siblingNames?.length > 0) && (
                    <div className="mt-1">
                      <p className="text-xs text-gray-500 font-roboto">Also includes:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(event.siblingNames || []).map((name, idx) => (
                          <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            {name}
                          </span>
                        ))}
                        {event.siblingIds?.map(sibId => {
                          const sibling = familyMembers.find(m => m.id === sibId);
                          if (!sibling) return null;
                          return (
                            <span key={sibId} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                              {sibling.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Parent Information */}
            {event.attendingParentId && (
              <div className="flex items-start">
                <Users size={18} className="mr-2 mt-1 text-gray-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm font-roboto">Attending Parent</p>
                  <div className="flex items-center">
                    {event.attendingParentId === 'both' ? (
                      <span className="text-sm text-purple-600 font-roboto flex items-center">
                        <Users size={14} className="mr-1" />
                        Both Parents
                      </span>
                    ) : event.attendingParentId === 'undecided' ? (
                      <span className="text-sm text-orange-600 font-roboto">To be decided</span>
                    ) : (
                      <>
                        {familyMembers.find(m => m.id === event.attendingParentId) && (
                          <div className="w-6 h-6 rounded-full overflow-hidden mr-2">
                            <UserAvatar
                              user={{
                                id: event.attendingParentId,
                                name: familyMembers.find(m => m.id === event.attendingParentId)?.name,
                                profilePicture: familyMembers.find(m => m.id === event.attendingParentId)?.profilePicture
                              }}
                              size={24}
                            />
                          </div>
                        )}
                        <span className="text-sm text-gray-600 font-roboto">
                          {familyMembers.find(m => m.id === event.attendingParentId)?.name || 
                           event.attendingParentId}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Host Information */}
            {event.hostParent && (
              <div className="flex items-start">
                <User size={18} className="mr-2 mt-1 text-gray-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm font-roboto">Host</p>
                  <p className="text-sm text-gray-600 font-roboto">{event.hostParent}</p>
                </div>
              </div>
            )}
            
            {/* Description */}
            <div className="flex items-start">
              <Info size={18} className="mr-2 mt-1 text-gray-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm font-roboto">Description</p>
                <p className="text-sm text-gray-600 font-roboto whitespace-pre-line">
                  {event.description || event.notes || "No description provided"}
                </p>
              </div>
            </div>
            
            {/* Event Type specific details */}
            {event.eventType === 'birthday' && event.extraDetails && (
              <div className="flex items-start">
                <Info size={18} className="mr-2 mt-1 text-gray-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm font-roboto">Birthday Details</p>
                  <p className="text-sm text-gray-600 font-roboto">
                    {event.extraDetails.birthdayChildName || 'Child'} is turning {' '}
                    {event.extraDetails.birthdayChildAge || '?'}
                  </p>
                </div>
              </div>
            )}
            
            {/* Notes */}
            {event.extraDetails?.notes && (
              <div className="flex items-start">
                <Info size={18} className="mr-2 mt-1 text-gray-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm font-roboto">Notes</p>
                  <p className="text-sm text-gray-600 font-roboto whitespace-pre-line">
                    {event.extraDetails.notes}
                  </p>
                </div>
              </div>
            )}
            
            {/* Source information */}
            {event.source && (
              <div className="mt-4 pt-3 border-t text-xs text-gray-500">
                Added via: {event.source === 'chat' ? 'Allie Chat' : 
                        event.source === 'parser' ? 'Message Parser' : 
                        event.source === 'manual' ? 'Calendar' : 
                        event.source === 'unified-manager' ? 'unified-manager' : event.source}
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-t flex justify-between">
          <button
            onClick={() => onDelete(event)}
            className="px-4 py-2 border border-red-500 text-red-500 rounded hover:bg-red-50 font-roboto flex items-center"
            disabled={pendingAction === 'delete'}
          >
            {pendingAction === 'delete' ? (
              <>
                <div className="w-4 h-4 border-2 border-t-transparent border-red-500 rounded-full animate-spin mr-2"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={16} className="mr-2" />
                Delete
              </>
            )}
          </button>
          <button
            onClick={() => onEdit(event)}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 font-roboto flex items-center"
          >
            <Edit size={16} className="mr-2" />
            Edit
          </button>
        </div>
        
        {/* Success Animation */}
        {showSuccess && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-20">
            <div className="bg-white rounded-lg p-6 shadow-lg animate-bounce">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-green-100 mb-3">
                  <Check size={32} className="text-green-600" />
                </div>
                <h3 className="text-lg font-medium">Event Updated!</h3>
                <p className="text-sm text-gray-500 mt-1">Successfully updated in your calendar</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetails;