import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Image, FileIcon, Calendar, User, Users, Clock, MapPin, Tag, X, Check, AlertCircle, Info 
} from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import CalendarService from '../../services/CalendarService';
import UserAvatar from '../common/UserAvatar';

/**
 * Enhanced Event Manager - Universal component for creating and editing calendar events
 * 
 * @param {Object} props
 * @param {Object} props.initialEvent - Optional initial event data for editing
 * @param {string} props.initialChildId - Optional child ID to pre-select
 * @param {Function} props.onSave - Callback when event is saved
 * @param {Function} props.onCancel - Callback when operation is cancelled
 * @param {string} props.eventType - Default event type (general, appointment, activity, task, birthday, etc.)
 * @param {Date} props.selectedDate - Optional pre-selected date
 * @param {boolean} props.isCompact - Optional flag for compact mode
 * @param {string} props.mode - 'create' or 'edit'
 */
const EnhancedEventManager = ({ 
  initialEvent = null, 
  initialChildId = null,
  onSave = null, 
  onCancel = null,
  eventType = 'general',
  selectedDate = null,
  isCompact = false,
  mode = 'create'
}) => {
  const { familyMembers, familyId } = useFamily();
  const { currentUser } = useAuth();
  
  // Create default event with proper structure
  const createDefaultEvent = () => {
    const date = selectedDate ? new Date(selectedDate) : new Date();
    // Round to nearest half hour
    date.setMinutes(Math.round(date.getMinutes() / 30) * 30, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(endDate.getHours() + 1);
    
    return {
      title: '',
      description: '',
      location: '',
      dateTime: date.toISOString(),
      endDateTime: endDate.toISOString(),
      childId: initialChildId || '',
      childName: '',
      attendingParentId: '',
      eventType: eventType,
      category: eventType,
      isRecurring: false,
      recurrence: {
        frequency: 'weekly',
        days: [],
        endDate: ''
      }
    };
  };
  
  const [event, setEvent] = useState(initialEvent || createDefaultEvent());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  
  const children = familyMembers.filter(m => m.role === 'child');
  const parents = familyMembers.filter(m => m.role === 'parent');
  
  // Update childName when childId changes
  useEffect(() => {
    if (event.childId) {
      const child = children.find(c => c.id === event.childId);
      if (child && child.name !== event.childName) {
        setEvent(prev => ({ ...prev, childName: child.name }));
      }
    }
  }, [event.childId, children]);
  

// Add a function to search for addresses
const searchAddress = async (query) => {
  if (!query || query.length < 3) {
    setAddressSuggestions([]);
    return;
  }
  
  setIsSearchingAddress(true);
  
  try {
    // This is a placeholder for an actual address lookup API
    // In a real implementation, you'd call a service like Google Places API or similar
    // For demo purposes, we'll simulate results
    const simulatedResults = [
      { id: 1, address: `${query}, Stockholm, Sweden` },
      { id: 2, address: `${query}, Gothenburg, Sweden` },
      { id: 3, address: `${query} Street, Uppsala, Sweden` }
    ];
    
    // Simulate API call delay
    setTimeout(() => {
      setAddressSuggestions(simulatedResults);
      setIsSearchingAddress(false);
    }, 500);
    
    // In a real implementation:
    // const response = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=address&key=YOUR_API_KEY`);
    // const data = await response.json();
    // setAddressSuggestions(data.predictions);
    // setIsSearchingAddress(false);
  } catch (error) {
    console.error("Error searching for address:", error);
    setIsSearchingAddress(false);
    setAddressSuggestions([]);
  }
};


  
 // In src/components/calendar/EnhancedEventManager.jsx
// Replace handleSave function with this improved version:

// Handle event saving
const handleSave = async () => {
  try {
    setLoading(true);
    setError(null);
    
    // Validation
    if (!event.title) {
      setError("Please enter an event title");
      setLoading(false);
      return;
    }
    
    if (!event.dateTime) {
      setError("Please select a date and time");
      setLoading(false);
      return;
    }
    
    // Format the event for the calendar service
    const calendarEvent = {
      ...event,
      userId: currentUser.uid,
      familyId,
      source: 'unified-manager',
      start: {
        dateTime: new Date(event.dateTime).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: new Date(event.endDateTime || 
                  new Date(new Date(event.dateTime).getTime() + 60 * 60 * 1000)
                 ).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };
    
    let result;
    
    // Handle recurring events if applicable
    if (event.isRecurring && event.recurrence.days.length > 0) {
      // Create multiple events for each day of the week
      const results = [];
      
      for (const day of event.recurrence.days) {
        // Calculate the next occurrence of this day
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayIndex = dayNames.indexOf(day);
        if (dayIndex === -1) continue;
        
        const currentDay = new Date(event.dateTime).getDay(); // 0-6, Sunday-Saturday
        let daysToAdd = (dayIndex - currentDay + 7) % 7;
        if (daysToAdd === 0) daysToAdd = 7; // If same day, add a week
        
        // Create a new date for this day
        const eventDate = new Date(event.dateTime);
        eventDate.setDate(eventDate.getDate() + daysToAdd);
        
        // Create event for this specific day
        const dayEvent = { 
          ...calendarEvent,
          title: `${calendarEvent.title} (${day})`,
          start: {
            dateTime: eventDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: new Date(eventDate.getTime() + (event.duration || 60) * 60000).toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          // Add a special flag to indicate this is part of a recurring series
          isRecurringSeries: true,
          recurrenceParent: event.isRecurring && event.firestoreId ? event.firestoreId : null,
          recurrence: {
            ...event.recurrence,
            currentDay: day
          }
        };
        
        // Save to calendar
        let dayResult;
        if (mode === 'edit' && event.firestoreId && event.recurrence.currentDay === day) {
          // Update existing event if this is the same day
          dayResult = await CalendarService.updateEvent(event.firestoreId, dayEvent, currentUser.uid);
        } else {
          // Create new event
          dayResult = await CalendarService.addEvent(dayEvent, currentUser.uid);
        }
        
        results.push(dayResult);
      }
      
      // Show success animation
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        if (onSave) onSave({success: true, recurringResults: results});
      }, 1500);
      setLoading(false);
      return; // Stop execution since we've already handled saving
    }
    
    // Not recurring - handle as single event
    if (mode === 'edit' && event.firestoreId) {
      // Update existing event
      result = await CalendarService.updateEvent(event.firestoreId, calendarEvent, currentUser.uid);
    } else {
      // Create new event
      result = await CalendarService.addEvent(calendarEvent, currentUser.uid);
    }
    
    // If this is an activity and for a child, also update the childrenData
    if (event.category === 'activity' && event.childId && mode === 'create' && result.success) {
      try {
        // Create the activity data structure
        const activityData = {
          id: result.firestoreId || result.eventId || `activity-${Date.now()}`,
          title: event.title,
          type: event.eventType || 'activity',
          date: new Date(event.dateTime).toISOString(),
          location: event.location || '',
          duration: event.duration || 60,
          days: event.isRecurring ? event.recurrence.days : [],
          notes: event.description || event.extraDetails?.notes || '',
          startTime: new Date(event.dateTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', hour12: false}),
          endTime: event.endDateTime ? new Date(event.endDateTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', hour12: false}) : '',
          calendarId: result.firestoreId || result.eventId,
          isRecurring: event.isRecurring,
          createdAt: new Date().toISOString()
        };
        
        // Get a reference to the family document
        const familyRef = doc(db, "families", familyId);
        
        // Get current child data
        const familyDoc = await getDoc(familyRef);
        if (familyDoc.exists()) {
          const childrenData = familyDoc.data().childrenData || {};
          const childData = childrenData[event.childId] || {};
          
          // Add or update activities array
          const activities = childData.routines || [];
          
          // Check if activity already exists
          const existingIndex = activities.findIndex(a => a.id === activityData.id);
          
          if (existingIndex !== -1) {
            // Update existing activity
            activities[existingIndex] = activityData;
          } else {
            // Add new activity
            activities.push(activityData);
          }
          
          // Update the database
          await updateDoc(familyRef, {
            [`childrenData.${event.childId}.routines`]: activities
          });
          
          console.log("Activity synchronized with child tracking data");
        }
      } catch (syncError) {
        console.error("Error synchronizing activity:", syncError);
        // Don't block the main success path
      }
    }
    
    // Show success animation
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      if (onSave) onSave(result);
    }, 1500);
    
    setLoading(false);
  } catch (error) {
    console.error("Error processing event:", error);
    setError(error.message || "An error occurred while saving");
    setLoading(false);
  }
};
  
  // Toggle a day in recurring settings
  const toggleRecurringDay = (day) => {
    setEvent(prev => {
      const days = [...(prev.recurrence?.days || [])];
      if (days.includes(day)) {
        return {
          ...prev,
          recurrence: {
            ...prev.recurrence,
            days: days.filter(d => d !== day)
          }
        };
      } else {
        return {
          ...prev,
          recurrence: {
            ...prev.recurrence,
            days: [...days, day]
          }
        };
      }
    });
  };
  
  // Handle form cancellation
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };
  
  return (
    <div className={`bg-white rounded-lg shadow-md ${isCompact ? 'p-3' : 'p-4'} max-w-2xl mx-auto font-roboto max-h-[90vh] overflow-y-auto`}>
    <div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-10 pb-2">
            <h3 className="text-lg font-medium flex items-center">
              <Calendar size={20} className="mr-2" />
              {mode === 'edit' ? 'Edit Event' : 'Add New Event'}
            </h3>
            {onCancel && (
              <button 
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            )}
          </div>
      
      <div className="space-y-4">
        {/* Event Type */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Event Type
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEvent(prev => ({ ...prev, category: 'general', eventType: 'general' }))}
              className={`px-3 py-1 text-sm rounded-full ${
                event.category === 'general' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              General
            </button>
            <button
              type="button"
              onClick={() => setEvent(prev => ({ ...prev, category: 'appointment', eventType: 'appointment' }))}
              className={`px-3 py-1 text-sm rounded-full ${
                event.category === 'appointment' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              Appointment
            </button>
            <button
              type="button"
              onClick={() => setEvent(prev => ({ ...prev, category: 'activity', eventType: 'activity' }))}
              className={`px-3 py-1 text-sm rounded-full ${
                event.category === 'activity' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              Activity
            </button>
            <button
              type="button"
              onClick={() => setEvent(prev => ({ ...prev, category: 'birthday', eventType: 'birthday' }))}
              className={`px-3 py-1 text-sm rounded-full ${
                event.category === 'birthday' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              Birthday
            </button>
            <button
              type="button"
              onClick={() => setEvent(prev => ({ ...prev, category: 'meeting', eventType: 'meeting' }))}
              className={`px-3 py-1 text-sm rounded-full ${
                event.category === 'meeting' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              Meeting
            </button>
          </div>
        </div>
        
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Title*
          </label>
          <input
            type="text"
            value={event.title}
            onChange={(e) => setEvent(prev => ({ ...prev, title: e.target.value }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder={`e.g., ${
              event.category === 'birthday' ? "Emma's 7th Birthday Party" :
              event.category === 'appointment' ? "Dentist Appointment" :
              event.category === 'activity' ? "Soccer Practice" :
              event.category === 'meeting' ? "Family Meeting" :
              "Trip to the Park"
            }`}
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-medium mb-1 text-gray-700">
      Date*
    </label>
    <input
      type="date"
      value={event.dateTime ? new Date(event.dateTime).toISOString().split('T')[0] : ''}
      onChange={(e) => {
        const date = new Date(event.dateTime || new Date());
        const newDate = new Date(e.target.value);
        date.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
        
        // Also update end time to match start date
        let endDate = event.endDateTime ? new Date(event.endDateTime) : new Date(date);
        endDate.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
        
        setEvent(prev => ({ 
          ...prev, 
          dateTime: date.toISOString(),
          endDateTime: endDate.toISOString()
        }));
      }}
      className="w-full border rounded-md p-2 text-sm"
    />
  </div>
  
  <div>
    <label className="block text-sm font-medium mb-1 text-gray-700">
      Time
    </label>
    <input
      type="time"
      value={event.dateTime ? new Date(event.dateTime).toTimeString().slice(0, 5) : ''}
      onChange={(e) => {
        const date = new Date(event.dateTime || new Date());
        const [hours, minutes] = e.target.value.split(':');
        date.setHours(hours, minutes);
        
        // Also update end time based on duration
        const endDate = new Date(date);
        endDate.setMinutes(date.getMinutes() + (event.duration || 30));
        
        setEvent(prev => ({ 
          ...prev, 
          dateTime: date.toISOString(),
          endDateTime: endDate.toISOString() 
        }));
      }}
      className="w-full border rounded-md p-2 text-sm"
    />
  </div>
</div>

{/* Duration */}
<div>
  <label className="block text-sm font-medium mb-1 text-gray-700">
    Duration
  </label>
  <div className="grid grid-cols-4 gap-2">
    {[30, 60, 90, 120].map(mins => (
      <button
        key={mins}
        type="button"
        onClick={() => {
          // Update end time based on start time + duration
          const startDate = new Date(event.dateTime);
          const endDate = new Date(startDate);
          endDate.setMinutes(startDate.getMinutes() + mins);
          
          setEvent(prev => ({ 
            ...prev, 
            duration: mins,
            endDateTime: endDate.toISOString()
          }));
        }}
        className={`py-2 px-3 text-sm rounded-md ${
          event.duration === mins 
            ? 'bg-blue-100 text-blue-800 border border-blue-200' 
            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
        }`}
      >
        {mins >= 60 ? `${mins/60} ${mins === 60 ? 'hour' : 'hours'}` : `${mins} min`}
      </button>
    ))}
  </div>
  <select
    value={event.duration || 30}
    onChange={(e) => {
      const duration = parseInt(e.target.value);
      
      // Update end time based on start time + duration
      const startDate = new Date(event.dateTime);
      const endDate = new Date(startDate);
      endDate.setMinutes(startDate.getMinutes() + duration);
      
      setEvent(prev => ({ 
        ...prev, 
        duration: duration,
        endDateTime: endDate.toISOString()
      }));
    }}
    className="w-full border rounded-md p-2 text-sm mt-2"
  >
    <option value="30">30 minutes</option>
    <option value="60">1 hour</option>
    <option value="90">1.5 hours</option>
    <option value="120">2 hours</option>
    <option value="150">2.5 hours</option>
    <option value="180">3 hours</option>
    <option value="240">4 hours</option>
    <option value="300">5 hours</option>
    <option value="480">8 hours (full day)</option>
  </select>
</div>
        
        {/* Location */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Location
          </label>
          <div className="relative">
  <div className="flex items-center border rounded-md overflow-hidden">
    <div className="p-2 text-gray-400">
      <MapPin size={16} />
    </div>
    <input
      type="text"
      value={event.location || ''}
      onChange={(e) => {
        setEvent(prev => ({ ...prev, location: e.target.value }));
        searchAddress(e.target.value);
      }}
      className="w-full p-2 text-sm border-0 focus:ring-0"
      placeholder="Where is this event happening?"
    />
    {isSearchingAddress && (
      <div className="p-2 text-gray-400 animate-spin">
        <div className="w-4 h-4 border-2 border-t-transparent border-gray-500 rounded-full"></div>
      </div>
    )}
  </div>
  
  {/* Address suggestions dropdown */}
  {addressSuggestions.length > 0 && (
    <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border">
      <ul className="max-h-60 overflow-auto py-1">
        {addressSuggestions.map(suggestion => (
          <li
            key={suggestion.id}
            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
            onClick={() => {
              setEvent(prev => ({ ...prev, location: suggestion.address }));
              setAddressSuggestions([]);
            }}
          >
            {suggestion.address}
          </li>
        ))}
      </ul>
    </div>
  )}
</div>
        </div>
        
        {/* Child Selection */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            For Child
          </label>
          <div className="flex flex-wrap gap-2">
            {children.map(child => (
              <button
                key={child.id}
                type="button"
                onClick={() => setEvent(prev => ({ 
                  ...prev, 
                  childId: child.id, 
                  childName: child.name 
                }))}
                className={`flex items-center px-3 py-1 rounded-full text-sm ${
                  event.childId === child.id 
                    ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                <UserAvatar user={child} size={20} className="mr-1" />
                {child.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Attending Parent */}
        {event.childId && (
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Who will attend with {event.childName}?
            </label>
            <div className="flex flex-wrap gap-2">
              {parents.map(parent => (
                <button
                  key={parent.id}
                  type="button"
                  onClick={() => setEvent(prev => ({ 
                    ...prev, 
                    attendingParentId: parent.id
                  }))}
                  className={`flex items-center px-3 py-1 rounded-full text-sm ${
                    event.attendingParentId === parent.id 
                      ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  <UserAvatar user={parent} size={20} className="mr-1" />
                  {parent.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setEvent(prev => ({ 
                  ...prev, 
                  attendingParentId: 'both'
                }))}
                className={`flex items-center px-3 py-1 rounded-full text-sm ${
                  event.attendingParentId === 'both'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                <Users size={16} className="mr-1" />
                Both Parents
              </button>
              <button
                type="button"
                onClick={() => setEvent(prev => ({ 
                  ...prev, 
                  attendingParentId: 'undecided'
                }))}
                className={`flex items-center px-3 py-1 rounded-full text-sm ${
                  event.attendingParentId === 'undecided'
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                <Clock size={16} className="mr-1" />
                Decide Later
              </button>
            </div>
          </div>
        )}
        
        {/* Include Siblings */}
        {event.childId && children.filter(c => c.id !== event.childId).length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Include Siblings?
            </label>
            <div className="flex flex-wrap gap-2">
              {children
                .filter(c => c.id !== event.childId)
                .map(sibling => (
                  <button
                    key={sibling.id}
                    type="button"
                    onClick={() => {
                      setEvent(prev => {
                        const siblingIds = prev.siblingIds || [];
                        const siblingNames = prev.siblingNames || [];
                        
                        if (siblingIds.includes(sibling.id)) {
                          return {
                            ...prev,
                            siblingIds: siblingIds.filter(id => id !== sibling.id),
                            siblingNames: siblingNames.filter(name => name !== sibling.name)
                          };
                        } else {
                          return {
                            ...prev,
                            siblingIds: [...siblingIds, sibling.id],
                            siblingNames: [...siblingNames, sibling.name]
                          };
                        }
                      });
                    }}
                    className={`flex items-center px-3 py-1 rounded-full text-sm ${
                      event.siblingIds?.includes(sibling.id)
                        ? 'bg-green-100 text-green-800 border border-green-200' 
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    <UserAvatar user={sibling} size={20} className="mr-1" />
                    {sibling.name}
                    {event.siblingIds?.includes(sibling.id) && (
                      <Check size={12} className="ml-1" />
                    )}
                  </button>
                ))}
            </div>
          </div>
        )}
        
        {/* Recurring Event Toggle */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={event.isRecurring}
              onChange={(e) => setEvent(prev => ({ 
                ...prev, 
                isRecurring: e.target.checked,
                recurrence: prev.recurrence || {
                  frequency: 'weekly',
                  days: [],
                  endDate: ''
                }
              }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">This is a recurring event</span>
          </label>
        </div>
        
        {/* Recurring Days Selection */}
        {event.isRecurring && (
          <div className="p-3 bg-gray-50 rounded-md">
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Repeat on these days:
            </label>
            <div className="flex flex-wrap gap-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleRecurringDay(day)}
                  className={`px-3 py-1 text-xs rounded-full ${
                    event.recurrence.days.includes(day)
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {day.substring(0, 3)}
                </button>
              ))}
            </div>
            
            <div className="mt-2">
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Repeat until:
              </label>
              <input
                type="date"
                value={event.recurrence.endDate || ''}
                onChange={(e) => setEvent(prev => ({
                  ...prev,
                  recurrence: {
                    ...prev.recurrence,
                    endDate: e.target.value
                  }
                }))}
                className="w-full border rounded-md p-2 text-sm"
              />
            </div>
          </div>
        )}
        
        {/* Birthday specific fields */}
        {event.category === 'birthday' && (
          <div className="p-3 bg-purple-50 rounded-md">
            <label className="block text-sm font-medium mb-2 text-purple-800">
              Birthday Details
            </label>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-purple-800">
                  Birthday Child's Name
                </label>
                <input
                  type="text"
                  className="w-full border rounded-md p-2 text-sm"
                  placeholder="e.g., Emma"
                  value={event.extraDetails?.birthdayChildName || ''}
                  onChange={(e) => setEvent(prev => ({
                    ...prev,
                    extraDetails: {
                      ...prev.extraDetails,
                      birthdayChildName: e.target.value
                    }
                  }))}
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium mb-1 text-purple-800">
                  Age
                </label>
                <input
                  type="number"
                  className="w-full border rounded-md p-2 text-sm"
                  placeholder="e.g., 7"
                  min="1"
                  value={event.extraDetails?.birthdayChildAge || ''}
                  onChange={(e) => setEvent(prev => ({
                    ...prev,
                    extraDetails: {
                      ...prev.extraDetails,
                      birthdayChildAge: e.target.value ? parseInt(e.target.value) : ''
                    }
                  }))}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Description
          </label>
          <textarea
            value={event.description || ''}
            onChange={(e) => setEvent(prev => ({ ...prev, description: e.target.value }))}
            className="w-full border rounded-md p-2 text-sm"
            rows="3"
            placeholder="Add any additional details about this event"
          ></textarea>
        </div>
        
        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Notes
          </label>
          <textarea
            value={event.extraDetails?.notes || ''}
            onChange={(e) => setEvent(prev => ({ 
              ...prev, 
              extraDetails: {
                ...prev.extraDetails,
                notes: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            rows="2"
            placeholder="Any special instructions or reminders"
          ></textarea>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-md flex items-start">
            <AlertCircle size={16} className="text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex justify-end pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border rounded-md text-sm mr-3 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-800 disabled:bg-gray-400 flex items-center"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Calendar size={16} className="mr-2" />
                {mode === 'edit' ? 'Update Event' : 'Add to Calendar'}
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Success Animation */}
      {success && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-20">
          <div className="bg-white rounded-lg p-6 shadow-lg animate-bounce">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-green-100 mb-3">
                <Check size={32} className="text-green-600" />
              </div>
              <h3 className="text-lg font-medium">
                {mode === 'edit' ? 'Event Updated!' : 'Event Added!'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Successfully {mode === 'edit' ? 'updated in' : 'added to'} your calendar
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedEventManager;