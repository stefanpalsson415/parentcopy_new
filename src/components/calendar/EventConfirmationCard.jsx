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
  const [showSuccess, setShowSuccess] = useState(false);
  
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
      
      if (!editedEvent.childId && !editedEvent.title) {
        setError("Please provide an event title or select a child");
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
      
      // Only add siblingIds if siblings are selected
      if (selectedSiblings && selectedSiblings.length > 0) {
        finalEvent.siblingIds = selectedSiblings;
        
        // Add siblings' names for display purposes
        finalEvent.siblingNames = selectedSiblings.map(sibId => {
          const sibling = children.find(c => c.id === sibId);
          return sibling ? sibling.name : '';
        }).filter(Boolean);
      }
      
      // Convert to format expected by addEvent method
      let calendarEvent = {
        summary: finalEvent.title,
        title: finalEvent.title, // Include both for compatibility
        description: finalEvent.description || `Event for ${finalEvent.childName || 'family'}`,
        location: finalEvent.location || '',
        start: {
          dateTime: new Date(finalEvent.dateTime).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: new Date(new Date(finalEvent.dateTime).getTime() + 3600000).toISOString(), // Add 1 hour
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        // Add metadata
        category: finalEvent.eventType || 'event',
        childId: finalEvent.childId,
        childName: finalEvent.childName,
        eventType: finalEvent.eventType || 'general',
        extraDetails: finalEvent.extraDetails || {},
        attendingParentId: finalEvent.attendingParentId,
        familyId: familyId,
      };
      
      // Only add siblingIds if they exist and have values
      if (finalEvent.siblingIds && finalEvent.siblingIds.length > 0) {
        calendarEvent.siblingIds = finalEvent.siblingIds;
        calendarEvent.siblingNames = finalEvent.siblingNames;
      }
      
      // Clean the object - remove any undefined values
      calendarEvent = Object.fromEntries(
        Object.entries(calendarEvent).filter(([_, value]) => value !== undefined)
      );
      
      // Add the event to the calendar using addEvent instead of addChildEvent
      const result = await CalendarService.addEvent(calendarEvent, currentUserId);
      
      // If siblings are selected, create separate events for them too
      if (selectedSiblings && selectedSiblings.length > 0 && result.success) {
        for (const siblingId of selectedSiblings) {
          const sibling = children.find(c => c.id === siblingId);
          if (sibling) {
            let siblingEvent = {
              ...calendarEvent,
              childId: siblingId,
              childName: sibling.name,
              summary: calendarEvent.summary.replace(finalEvent.childName || '', sibling.name),
              title: calendarEvent.title.replace(finalEvent.childName || '', sibling.name),
              // Don't include siblingIds in the sibling's own event
              siblingIds: undefined,
              siblingNames: undefined
            };
            
            // Clean the object - remove any undefined values
            siblingEvent = Object.fromEntries(
              Object.entries(siblingEvent).filter(([_, value]) => value !== undefined)
            );
            
            await CalendarService.addEvent(siblingEvent, currentUserId);
          }
        }
      }
      
      if (result.success) {
        // Dispatch a force refresh event to ensure calendar reloads
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
        }
        
        // Show success animation
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          onConfirm(finalEvent);
        }, 1500);
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
  
  // Update handler
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
    const eventType = editedEvent.eventType || 'event';
    const typeConfig = {
      'birthday': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Birthday', icon: '🎂' },
      'doctor': { bg: 'bg-red-100', text: 'text-red-800', label: 'Doctor', icon: '👨‍⚕️' },
      'dental': { bg: 'bg-red-100', text: 'text-red-800', label: 'Dental', icon: '🦷' },
      'playdate': { bg: 'bg-green-100', text: 'text-green-800', label: 'Playdate', icon: '👭' },
      'sports': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Sports', icon: '🏀' },
      'music': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Music', icon: '🎵' },
      'dance': { bg: 'bg-pink-100', text: 'text-pink-800', label: 'Dance', icon: '💃' },
      'school': { bg: 'bg-amber-100', text: 'text-amber-800', label: 'School', icon: '🏫' },
      'art': { bg: 'bg-teal-100', text: 'text-teal-800', label: 'Art', icon: '🎨' },
      'coding': { bg: 'bg-cyan-100', text: 'text-cyan-800', label: 'Coding', icon: '💻' },
      'tutoring': { bg: 'bg-lime-100', text: 'text-lime-800', label: 'Tutoring', icon: '📚' },
      'camp': { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Camp', icon: '⛺' },
      'sleepover': { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Sleepover', icon: '🛌' },
      'family': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Family', icon: '👪' },
      'religious': { bg: 'bg-slate-100', text: 'text-slate-800', label: 'Religious', icon: '🙏' },
      'community': { bg: 'bg-rose-100', text: 'text-rose-800', label: 'Community', icon: '🌱' },
      'appointment': { bg: 'bg-red-100', text: 'text-red-800', label: 'Appointment', icon: '🩺' },
      'event': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Event', icon: '📅' }
    };
    
    const config = typeConfig[eventType] || typeConfig['event'];
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <span className="mr-1">{config.icon}</span>
        {config.label}
      </span>
    );
  };
  
  return (
    <div className="p-4 font-roboto">
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
            <div className="font-medium mb-2">Who will take {editedEvent.childName || 'the child'}?</div>
            
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
      
      {/* Success animation */}
      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-20">
          <div className="bg-white rounded-lg p-6 shadow-lg transform transition-all duration-500 ease-out scale-100 opacity-100 animate-bounce">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Event Added!</h3>
              <p className="text-sm text-gray-500">Successfully added to your calendar</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventConfirmationCard;