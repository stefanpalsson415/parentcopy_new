// src/components/calendar/EventConfirmationCard.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, User, Users, Clock, CheckCircle, Edit, X, Info, AlertTriangle } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import { useAuth } from '../../contexts/AuthContext';
import CalendarService from '../../services/CalendarService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const EventConfirmationCard = ({ event, onConfirm, onEdit, onCancel, familyId }) => {
  const { familyMembers } = useFamily();
  const { currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState(event);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [attendingParent, setAttendingParent] = useState(event.attendingParentId || 'undecided');
  const [selectedSiblings, setSelectedSiblings] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  
  const parents = familyMembers.filter(m => m.role === 'parent');
  const children = familyMembers.filter(m => m.role === 'child');
  const siblings = children.filter(child => child.id !== event.childId);
  
  // Initialize event with current date/time if missing
  useEffect(() => {
    if (!editedEvent.dateTime) {
      setEditedEvent(prev => ({
        ...prev,
        dateTime: new Date().toISOString()
      }));
    }
  }, [editedEvent.dateTime]);
  
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      if (!editedEvent.childId || !editedEvent.title) {
        setError("Please select a child and provide an event title");
        setSaving(false);
        return;
      }
      
      // Get current user ID from auth context
      const currentUserId = currentUser?.uid;
      
      if (!currentUserId) {
        setError("You must be logged in to add events to the calendar");
        setSaving(false);
        return;
      }
      
      // Update with attending parent selection
      const finalEvent = {
        ...editedEvent,
        attendingParentId: attendingParent,
        familyId,
        // Explicitly include the user ID
        userId: currentUserId
      };
      
      // Handle siblings
      if (selectedSiblings.length > 0) {
        finalEvent.siblingIds = selectedSiblings;
        
        // Add siblings' names for display purposes
        finalEvent.siblingNames = selectedSiblings.map(sibId => {
          const sibling = children.find(c => c.id === sibId);
          return sibling ? sibling.name : '';
        }).filter(Boolean);
      }
      
      // Add the event to the calendar
      const result = await CalendarService.addChildEvent(finalEvent, currentUserId);
      
      // If additional events should be created for siblings, handle that
      if (selectedSiblings.length > 0 && result.success) {
        for (const siblingId of selectedSiblings) {
          const sibling = children.find(c => c.id === siblingId);
          if (sibling) {
            const siblingEvent = {
              ...finalEvent,
              childId: siblingId,
              childName: sibling.name,
              // Explicitly include the user ID
              userId: currentUserId,
              // No need to duplicate sibling information for sibling's own event
              siblingIds: undefined,
              siblingNames: undefined
            };
            
            await CalendarService.addChildEvent(siblingEvent, currentUserId);
          }
        }
      }
      
      if (result.success) {
        onConfirm(finalEvent);
      } else {
        setError(result.error || "Failed to save event");
      }
      
      setSaving(false);
    } catch (error) {
      console.error("Error saving event:", error);
      setError("An error occurred while saving the event");
      setSaving(false);
    }
  };
  
  const handleEdit = () => {
    setIsEditing(true);
  };
  
  // Simplified update handler without references to undefined variables
  const handleUpdate = async () => {
    try {
      setPendingAction('update');
      
      if (!editedEvent || !editedEvent.firestoreId) {
        CalendarService.showNotification("Cannot update this event - no valid ID found", "error");
        setPendingAction(null);
        return;
      }
      
      // Create updated event object
      const updatedEvent = {
        summary: editedEvent.title,
        description: editedEvent.description || '',
        location: editedEvent.location || 'TBD',
      };
      
      // Update date/time if changed
      if (editedEvent.dateObj) {
        updatedEvent.start = {
          dateTime: editedEvent.dateObj.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
        
        // Calculate end time (default 1 hour duration)
        const endDate = new Date(editedEvent.dateObj.getTime() + 60 * 60 * 1000);
        
        updatedEvent.end = {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
      }
      
      // Update in Firestore
      const docRef = doc(db, "calendar_events", editedEvent.firestoreId);
      await updateDoc(docRef, updatedEvent);
      
      // Apply updates to local state
      setEditedEvent(prev => ({
        ...prev,
        ...updatedEvent
      }));
      
      // Close edit mode
      setIsEditing(false);
      
      // Pass the updated event back to parent
      if (onEdit) {
        onEdit(editedEvent);
      }
      
      // Show notification
      CalendarService.showNotification("Event updated successfully", "success");
      
      setPendingAction(null);
    } catch (error) {
      console.error("Error updating event:", error);
      CalendarService.showNotification("Failed to update event: " + error.message, "error");
      setPendingAction(null);
    }
  };
  
  const handleInputChange = (field, value) => {
    setEditedEvent(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const toggleSibling = (siblingId) => {
    setSelectedSiblings(prev => {
      if (prev.includes(siblingId)) {
        return prev.filter(id => id !== siblingId);
      } else {
        return [...prev, siblingId];
      }
    });
  };
  
  const formatDate = (date) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  const formatTime = (date) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };
  
  const getEventTypeBadge = () => {
    switch(editedEvent.eventType) {
      case 'birthday':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          Birthday
        </span>;
      case 'playdate':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Playdate
        </span>;
      case 'sports':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Sports
        </span>;
      case 'appointment':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Appointment
        </span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Event
        </span>;
    }
  };
  
  return (
    <div className="p-4">
      <div className="mb-3 flex items-center">
        <CheckCircle size={18} className="mr-2 text-green-500" />
        <h3 className="text-lg font-medium">Event Details {getEventTypeBadge()}</h3>
      </div>
      
      {!isEditing ? (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex justify-between">
              <h4 className="font-medium text-lg mb-2">{editedEvent.title}</h4>
              <button
                onClick={handleEdit}
                className="text-gray-500 hover:text-gray-700"
              >
                <Edit size={16} />
              </button>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-3 mt-2">
              <div className="flex items-start">
                <Calendar size={16} className="mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm">Date & Time</div>
                  <div className="text-sm">{formatDate(editedEvent.dateTime)}</div>
                  <div className="text-sm">{formatTime(editedEvent.dateTime)}</div>
                </div>
              </div>
              
              <div className="flex items-start">
                <MapPin size={16} className="mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm">Location</div>
                  <div className="text-sm">{editedEvent.location || 'No location specified'}</div>
                </div>
              </div>
              
              <div className="flex items-start">
                <User size={16} className="mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm">For Child</div>
                  <div className="text-sm">{editedEvent.childName || 'Unknown child'}</div>
                </div>
              </div>
              
              <div className="flex items-start">
                <Users size={16} className="mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm">Host</div>
                  <div className="text-sm">{editedEvent.hostParent || 'No host information'}</div>
                </div>
              </div>
            </div>
            
            {editedEvent.eventType === 'birthday' && editedEvent.extraDetails && (
              <div className="mt-3 p-2 bg-purple-50 rounded-md text-sm">
                <div className="font-medium text-purple-800">Birthday Details</div>
                <div className="text-purple-800">
                  {editedEvent.extraDetails.birthdayChildName || 'Child'} is turning {' '}
                  {editedEvent.extraDetails.birthdayChildAge || '?'}
                </div>
              </div>
            )}
            
            {editedEvent.extraDetails?.notes && (
              <div className="mt-3 p-2 bg-yellow-50 rounded-md">
                <div className="font-medium text-sm text-yellow-800">Notes</div>
                <div className="text-sm text-yellow-800">{editedEvent.extraDetails.notes}</div>
              </div>
            )}
          </div>
          
          {/* Parent Selection */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="font-medium mb-2">Who will take {editedEvent.childName}?</div>
            
            <div className="flex flex-wrap gap-2">
              {parents.map(parent => (
                <button
                  key={parent.id}
                  onClick={() => setAttendingParent(parent.id)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    attendingParent === parent.id 
                      ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                      : 'bg-gray-100 hover:bg-gray-200 border border-transparent'
                  }`}
                >
                  {parent.name || parent.roleType}
                </button>
              ))}
              
              <button
                onClick={() => setAttendingParent('both')}
                className={`px-3 py-1 rounded-full text-sm ${
                  attendingParent === 'both' 
                    ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                    : 'bg-gray-100 hover:bg-gray-200 border border-transparent'
                }`}
              >
                Both Parents
              </button>
              
              <button
                onClick={() => setAttendingParent('undecided')}
                className={`px-3 py-1 rounded-full text-sm ${
                  attendingParent === 'undecided' 
                    ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                    : 'bg-gray-100 hover:bg-gray-200 border border-transparent'
                }`}
              >
                Decide Later
              </button>
            </div>
          </div>
          
          {/* Sibling Selection */}
          {siblings.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="font-medium mb-2">Include siblings?</div>
              
              <div className="flex flex-wrap gap-2">
                {siblings.map(sibling => (
                  <button
                    key={sibling.id}
                    onClick={() => toggleSibling(sibling.id)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedSiblings.includes(sibling.id) 
                        ? 'bg-green-100 text-green-800 border border-green-200' 
                        : 'bg-gray-100 hover:bg-gray-200 border border-transparent'
                    }`}
                  >
                    {sibling.name}
                    {selectedSiblings.includes(sibling.id) && 
                      <CheckCircle size={12} className="ml-1 inline" />
                    }
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-center">
              <AlertTriangle size={16} className="mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          <div className="flex justify-between pt-3">
            <button
              onClick={onCancel}
              className="px-3 py-2 border rounded-md text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:bg-gray-400 flex items-center"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Calendar size={16} className="mr-2" />
                  Add to Calendar
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Event Title</label>
            <input
              type="text"
              value={editedEvent.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full border rounded p-2 text-sm"
              placeholder="e.g., Birthday Party, Soccer Practice"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={editedEvent.dateTime ? new Date(editedEvent.dateTime).toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  const date = new Date(editedEvent.dateTime || new Date());
                  const newDate = new Date(e.target.value);
                  date.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
                  handleInputChange('dateTime', date.toISOString());
                }}
                className="w-full border rounded p-2 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Time</label>
              <input
                type="time"
                value={editedEvent.dateTime ? new Date(editedEvent.dateTime).toTimeString().slice(0, 5) : ''}
                onChange={(e) => {
                  const date = new Date(editedEvent.dateTime || new Date());
                  const [hours, minutes] = e.target.value.split(':');
                  date.setHours(hours, minutes);
                  handleInputChange('dateTime', date.toISOString());
                }}
                className="w-full border rounded p-2 text-sm"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <input
              type="text"
              value={editedEvent.location || ''}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full border rounded p-2 text-sm"
              placeholder="e.g., Laserdome, Pizza Palace"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">For Child</label>
            <select
              value={editedEvent.childId || ''}
              onChange={(e) => {
                const child = children.find(c => c.id === e.target.value);
                handleInputChange('childId', e.target.value);
                handleInputChange('childName', child ? child.name : '');
              }}
              className="w-full border rounded p-2 text-sm"
            >
              <option value="">Select child</option>
              {children.map(child => (
                <option key={child.id} value={child.id}>{child.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Host</label>
            <input
              type="text"
              value={editedEvent.hostParent || ''}
              onChange={(e) => handleInputChange('hostParent', e.target.value)}
              className="w-full border rounded p-2 text-sm"
              placeholder="e.g., Emma's mom"
            />
          </div>
          
          {editedEvent.eventType === 'birthday' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Birthday Child's Name</label>
                <input
                  type="text"
                  value={editedEvent.extraDetails?.birthdayChildName || ''}
                  onChange={(e) => setEditedEvent(prev => ({
                    ...prev,
                    extraDetails: {
                      ...prev.extraDetails,
                      birthdayChildName: e.target.value
                    }
                  }))}
                  className="w-full border rounded p-2 text-sm"
                  placeholder="e.g., Emma"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Age</label>
                <input
                  type="number"
                  value={editedEvent.extraDetails?.birthdayChildAge || ''}
                  onChange={(e) => setEditedEvent(prev => ({
                    ...prev,
                    extraDetails: {
                      ...prev.extraDetails,
                      birthdayChildAge: e.target.value ? parseInt(e.target.value) : ''
                    }
                  }))}
                  className="w-full border rounded p-2 text-sm"
                  placeholder="e.g., 8"
                  min="1"
                  max="18"
                />
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={editedEvent.extraDetails?.notes || ''}
              onChange={(e) => setEditedEvent(prev => ({
                ...prev,
                extraDetails: {
                  ...prev.extraDetails,
                  notes: e.target.value
                }
              }))}
              className="w-full border rounded p-2 text-sm min-h-[80px]"
              placeholder="e.g., Bring socks, will have cake"
            ></textarea>
          </div>
          
          <div className="flex justify-end pt-3">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-2 border rounded-md text-sm hover:bg-gray-50 mr-2"
            >
              <X size={14} className="mr-1 inline" />
              Cancel
            </button>
            
            <button
              onClick={handleUpdate}
              className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
            >
              <CheckCircle size={14} className="mr-1 inline" />
              Update
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventConfirmationCard;