import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Image, FileIcon, Calendar, User, Users, Trash2, Clock, MapPin, Tag, X, Check, AlertCircle, Info, Edit
} from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import CalendarService from '../../services/CalendarService';
import UserAvatar from '../common/UserAvatar';
import SmartReminderSuggestions from './SmartReminderSuggestions';
import { useEvents } from '../../contexts/EventContext';

/**
 * Enhanced Event Manager - Universal component for creating and editing calendar events
 * 
 * @param {Object} props
 * @param {Object} props.initialEvent - Optional initial event data for editing
 * @param {string} props.initialChildId - Optional child ID to pre-select
 * @param {Function} props.onSave - Callback when event is saved
 * @param {Function} props.onCancel - Callback when operation is cancelled
 * @param {Function} props.onDelete - Callback when event is deleted
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
  onDelete = null,
  eventType = 'general',
  selectedDate = null,
  isCompact = false,
  mode = 'create', // 'create', 'edit', or 'view'
  conflictingEvents = [],
  showAiMetadata = false,
  currentWeek = null // Add this prop
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
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [placesInitialized, setPlacesInitialized] = useState(false);
  const placeAutocompleteElementRef = useRef(null);
  const placesContainerRef = useRef(null);
  const [selectedReminders, setSelectedReminders] = useState([]);
  const { addEvent, updateEvent } = useEvents();
  const [showSuccess, setShowSuccess] = useState(false);
  
  const children = familyMembers.filter(m => m.role === 'child');
  const parents = familyMembers.filter(m => m.role === 'parent');
  const isUpdatingRef = useRef(false);
const previousDateRef = useRef(null);
const prevLocationRef = useRef(null);


// Consolidated useEffect for initialEvent processing
useEffect(() => {
  // Only run this effect when initialEvent changes or mode changes
  // and prevent running during updates
  if (initialEvent && mode === 'edit' && !isUpdatingRef.current) {
    isUpdatingRef.current = true;
    
    // Create an updatedEvent object to batch all changes
    let updatedEvent = { ...event };
    let hasChanges = false;
    
    // 1. Handle date/time standardization
    if (initialEvent.dateObj && !updatedEvent.dateTime) {
      updatedEvent.dateTime = initialEvent.dateObj.toISOString();
      hasChanges = true;
    } else if (initialEvent.start?.dateTime && !updatedEvent.dateTime) {
      updatedEvent.dateTime = initialEvent.start.dateTime;
      hasChanges = true;
    }
    
    // 2. Handle cycle due date special settings
    const isCycleDueDate = (initialEvent.title && initialEvent.title.includes('Cycle') && initialEvent.title.includes('Due Date')) || 
                           (initialEvent.category === 'cycle-due-date' || initialEvent.eventType === 'cycle-due-date');
    
    if (isCycleDueDate) {
      if (updatedEvent.category !== 'meeting') {
        updatedEvent.category = 'meeting';
        hasChanges = true;
      }
      
      if (updatedEvent.eventType !== 'meeting') {
        updatedEvent.eventType = 'meeting';
        hasChanges = true;
      }
      
      if (updatedEvent.attendingParentId !== 'both') {
        updatedEvent.attendingParentId = 'both';
        hasChanges = true;
      }
    }
    
    // 3. Apply the batch update only if something changed
    if (hasChanges) {
      setEvent(updatedEvent);
    }
    
    // Reset update flag after state update is processed
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 0);
  }
  // This effect should only run when initialEvent or mode changes, not when event changes
}, [initialEvent, mode]);

// Separate useEffect for child name update with safeguards
const prevChildIdRef = useRef(null);

// Add this useEffect near other useEffects at the top level of the component
useEffect(() => {
  // Automatically set all family members as attendees for meeting events
  if ((event.category === 'meeting' || event.eventType === 'meeting') && familyMembers.length > 0) {
    // Create attendees list from all family members
    const allAttendees = familyMembers.map(member => ({
      id: member.id,
      name: member.name,
      role: member.role
    }));
    
    // Update event with all family members as attendees and both parents attending
    setEvent(prev => ({
      ...prev,
      attendees: allAttendees,
      attendingParentId: 'both'
    }));
  }
}, [event.category, event.eventType, familyMembers]);

useEffect(() => {
  // Skip if we're currently in an update cycle
  if (isUpdatingRef.current) return;
  
  // Only process if childId changed from previous render
  if (event.childId && event.childId !== prevChildIdRef.current) {
    prevChildIdRef.current = event.childId;
    
    const child = children.find(c => c.id === event.childId);
    if (child && child.name !== event.childName) {
      // Set the update flag before changing state
      isUpdatingRef.current = true;
      
      // Use functional update to avoid dependency on event
      setEvent(prev => ({ ...prev, childName: child.name }));
      
      // Reset update flag after state update is processed
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  }
}, [event.childId, children]);  

// Add this useEffect near other useEffects at the top level of the component
useEffect(() => {
  // Automatically set all family members as attendees for meeting events
  if ((event.category === 'meeting' || event.eventType === 'meeting') && familyMembers.length > 0) {
    // Create attendees list from all family members
    const allAttendees = familyMembers.map(member => ({
      id: member.id,
      name: member.name,
      role: member.role
    }));
    
    // Update event with all family members as attendees and both parents attending
    setEvent(prev => ({
      ...prev,
      attendees: allAttendees,
      attendingParentId: 'both'
    }));
  }
}, [event.category, event.eventType, familyMembers]);

/// Updated Google Places Autocomplete initialization using modern API
useEffect(() => {
  // Function to initialize Google Places Autocomplete using the new PlaceAutocompleteElement
  const initPlacesAutocomplete = () => {
    console.log("Initializing Google Places with PlaceAutocompleteElement API");
    
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.log("Google Maps Places API not available");
      return false;
    }

    try {
      // Check if the new API is available
      if (window.google.maps.places.PlaceAutocompleteElement) {
        // Get container where we'll mount the PlaceAutocompleteElement
        const container = document.getElementById('places-container');
        
        if (!container) {
          console.log("Places container element not found");
          return false;
        }
        
        // Clear any existing content
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        
        // Create the PlaceAutocompleteElement
        const placeAutocompleteElement = 
          new window.google.maps.places.PlaceAutocompleteElement({
            inputPlaceholder: "Where is this event happening?",
            types: ['address', 'establishment'],
            fields: ['name', 'formatted_address', 'address_components', 'geometry', 'place_id']
          });
        
        // Add to the container
        container.appendChild(placeAutocompleteElement);
        
        // Store reference to the element
        placeAutocompleteElementRef.current = placeAutocompleteElement;
        
        // Add event listener for place selection
        placeAutocompleteElement.addEventListener('gmp-placeselect', (event) => {
          try {
            const place = event.place;
            
            if (place && place.formattedAddress) {
              let locationText = place.formattedAddress;
              
              // Add place name if different from address
              if (place.displayName && place.displayName !== locationText) {
                locationText = `${place.displayName}, ${locationText}`;
              }
              
              console.log("Setting location from place selection:", locationText);
              setEvent(prev => ({ ...prev, location: locationText }));
              prevLocationRef.current = locationText;
            }
          } catch (error) {
            console.warn("Error handling place selection:", error);
          }
        });
        
        // If we already have a location value, set it visually
        if (event.location && prevLocationRef.current !== event.location) {
          prevLocationRef.current = event.location;
        }
        
        return true;
      } else {
        // Fallback to basic input if new API isn't available
        console.log("PlaceAutocompleteElement not available, using fallback input");
        return false;
      }
    } catch (error) {
      console.warn("Error initializing Places API:", error);
      return false;
    }
  };

  // Initialize after a short delay to ensure the DOM is ready
  const timeoutId = setTimeout(() => {
    if (!placesInitialized && window.google && window.google.maps && window.google.maps.places) {
      const success = initPlacesAutocomplete();
      setPlacesInitialized(success);
    }
  }, 500);
  
  // Also listen for the API loaded event
  const handleMapsApiLoaded = () => {
    if (!placesInitialized) {
      const success = initPlacesAutocomplete();
      setPlacesInitialized(success);
    }
  };
  
  window.addEventListener('google-maps-api-loaded', handleMapsApiLoaded);
  
  return () => {
    clearTimeout(timeoutId);
    window.removeEventListener('google-maps-api-loaded', handleMapsApiLoaded);
  };
}, [placesInitialized, event.location]);

// Synchronize event location with Places input when location changes
useEffect(() => {
  // Skip if we're currently in an update cycle or if Places isn't initialized yet
  if (isUpdatingRef.current || !placesInitialized || !placeAutocompleteElementRef.current) return;
  
  // If event has a location and it's different from what we previously stored
  if (event.location && event.location !== prevLocationRef.current) {
    console.log("Updating Places input with location:", event.location);
    prevLocationRef.current = event.location;
    
    try {
      const input = placeAutocompleteElementRef.current.querySelector('input');
      if (input && input.value !== event.location) {
        input.value = event.location;
      }
    } catch (error) {
      console.warn("Error updating location input value:", error);
    }
  }
}, [event.location, placesInitialized]);

// Simplified manual location input handler
const handleManualLocationInput = (value) => {
  console.log("Manual location input:", value);
  setEvent(prev => ({ ...prev, location: value }));
  prevLocationRef.current = value;
  
  // No need to update any other input since we're using the same input field
};

 


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
  },
  // Explicitly include location to ensure it's saved properly
  location: event.location || '',
  // Add reminders if we have any
  reminders: selectedReminders.length > 0 ? {
    useDefault: false,
    overrides: selectedReminders.map(minutes => ({
      method: 'popup',
      minutes
    }))
  } : undefined,
  
  // Include document and provider information
  documents: event.documents || [],
  providers: event.providers || [],
  
  // Include family members as attendees
  attendees: [
    // Always include the child if selected
    ...(event.childId ? [{
      id: event.childId,
      name: event.childName,
      role: 'child'
    }] : []),
    
    // Include siblings if selected
    ...(event.siblingIds?.map((sibId, index) => {
      const sibling = familyMembers.find(m => m.id === sibId);
      return {
        id: sibId,
        name: event.siblingNames?.[index] || (sibling ? sibling.name : 'Sibling'),
        role: 'child'
      };
    }) || []),
    
    // Include attending parent
    ...(event.attendingParentId ? (
      event.attendingParentId === 'both' ?
        // Both parents
        parents.map(parent => ({
          id: parent.id, 
          name: parent.name,
          role: 'parent'
        })) :
        // Single parent
        [{
          id: event.attendingParentId,
          name: parents.find(p => p.id === event.attendingParentId)?.name || 'Parent',
          role: 'parent'
        }]
    ) : [])
  ],
  
  // Enhanced context
  extraDetails: {
    ...(event.extraDetails || {}),
    notes: event.extraDetails?.notes || '',
    
    // For appointments, include provider details
    ...(event.category === 'appointment' && event.providers?.[0] ? {
      providerName: event.providers[0].name,
      providerSpecialty: event.providers[0].specialty,
      providerPhone: event.providers[0].phone,
      providerAddress: event.providers[0].address
    } : {}),
    
    // For birthdays, include age and related info
    ...(event.category === 'birthday' ? {
      birthdayChildName: event.extraDetails?.birthdayChildName,
      birthdayChildAge: event.extraDetails?.birthdayChildAge
    } : {})
  }
};

console.log("Saving event with location:", event.location);    
    let result;

    // Add reminders if we have any
    if (!calendarEvent.reminders || calendarEvent.reminders.useDefault === undefined) {
      calendarEvent.reminders = {
        useDefault: true,
        overrides: []
      };
    }

    // Make sure the event doesn't have any undefined values before saving
    Object.keys(calendarEvent).forEach(key => {
      if (calendarEvent[key] === undefined) {
        delete calendarEvent[key]; // Remove any undefined properties
      }
    });
    
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
        
        // Save to calendar - USING useEvents HOOK
        let dayResult;
        if (mode === 'edit' && event.firestoreId && event.recurrence.currentDay === day) {
          // Update existing event
          dayResult = await updateEvent(event.firestoreId, dayEvent);
        } else {
          // Create new event
          dayResult = await addEvent(dayEvent);
        }
        
        results.push(dayResult);
      }
      
      // Trigger immediate refresh on task tab (new code)
      if (typeof window !== 'undefined') {
        // Dispatch a custom event that TasksTab can listen for
        window.dispatchEvent(new CustomEvent('calendar-event-updated', { 
          detail: { 
            updated: true,
            cycleUpdate: calendarEvent.title?.includes("Cycle") && calendarEvent.category === 'meeting'
          }
        }));
        // Force additional refresh of the calendar
        window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
      }
      
      // Call onSave immediately before showing animation
      if (onSave) onSave({success: true, recurringResults: results});
      
      // Show success animation
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 1500);
      
      setLoading(false);
      return; 
    }
    
    // Not recurring - handle as single event - USING useEvents HOOK
    if (mode === 'edit' && event.firestoreId) {
      // Update existing event
      result = await updateEvent(event.firestoreId, calendarEvent);
    } else {
      // Create new event
      result = await addEvent(calendarEvent);
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
    
    // NEW CODE: For Cycle due date updates, trigger IMMEDIATE refresh of TasksTab
    const isCycleDueDate = calendarEvent.title?.includes("Cycle") && 
                          (calendarEvent.category === 'meeting' || calendarEvent.eventType === 'meeting');
    
    if (mode === 'edit' && isCycleDueDate) {
      // Update the surveySchedule in the database directly
      try {
        const cycleNumber = parseInt(calendarEvent.title.match(/Cycle\s*(\d+)/i)?.[1] || 
                          calendarEvent.cycleNumber || 
                          event.extraDetails?.cycleNumber || 
                          "0");
        
        // Extract the date 
        const newDate = new Date(calendarEvent.start.dateTime);
        
        // Update survey schedule directly
        if (familyId && cycleNumber > 0) {
          const familyRef = doc(db, "families", familyId);
          await updateDoc(familyRef, {
            [`surveySchedule.${cycleNumber}`]: newDate.toISOString(),
            updatedAt: serverTimestamp()
          });
          
          console.log(`Directly updated due date for cycle ${cycleNumber} to ${newDate.toISOString()}`);
        }
        
        // Also update week status if it exists
        const weekStatusRef = doc(db, "families", familyId);
        const weekStatusDoc = await getDoc(weekStatusRef);
        if (weekStatusDoc.exists()) {
          const weekStatus = weekStatusDoc.data().weekStatus || {};
          
          if (weekStatus[cycleNumber]) {
            await updateDoc(weekStatusRef, {
              [`weekStatus.${cycleNumber}.scheduledDate`]: newDate.toISOString(),
              updatedAt: serverTimestamp()
            });
          }
        }
      } catch (err) {
        console.warn("Error updating cycle data directly:", err);
        // Non-critical error, continue
      }
    }
    
    // Trigger immediate refresh on task tab (new code)
    if (typeof window !== 'undefined') {
      // Dispatch custom events that TasksTab can listen for
      window.dispatchEvent(new CustomEvent('calendar-event-updated', { 
        detail: { 
          updated: true,
          cycleUpdate: isCycleDueDate
        }
      }));
      
      // Force refresh of all calendar components
      window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
      
      // For cycle updates, dispatch special event
      if (isCycleDueDate) {
        window.dispatchEvent(new CustomEvent('cycle-date-updated', { 
          detail: { date: new Date(calendarEvent.start.dateTime) }
        }));
      }
    }
    
    // Call onSave immediately before animation
    if (onSave) onSave(result);
    
    // Show success animation after results are saved
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 1500);
    
    setLoading(false);
  } catch (error) {
    console.error("Error processing event:", error);
    setError(error.message || "An error occurred while saving");
    setLoading(false);
  }
};
  
  const handleAddReminder = (minutes) => {
    if (minutes === 'custom') {
      // Show custom reminder input (you'd need to implement this UI)
      // For now, just add a default 15 minute reminder
      if (!selectedReminders.includes(15)) {
        setSelectedReminders([...selectedReminders, 15]);
      }
      return;
    }
    
    // Add the reminder if not already added
    if (!selectedReminders.includes(minutes)) {
      setSelectedReminders([...selectedReminders, minutes]);
    }
  };
  
  const handleRemoveReminder = (minutes) => {
    setSelectedReminders(selectedReminders.filter(r => r !== minutes));
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
    // Create a valid date from the input value
    const newDate = new Date(e.target.value);
    if (isNaN(newDate.getTime())) {
      console.error("Invalid date input:", e.target.value);
      return; // Don't proceed with invalid date
    }
    
    // Create a fresh date object based on the current date/time with updated year/month/day
    const date = new Date(event.dateTime || new Date());
    date.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
    
    // Also create a fresh end date that preserves the original time
    let endDate = event.endDateTime ? new Date(event.endDateTime) : new Date(date);
    endDate.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
    
    // Log what we're updating for debugging
    console.log("Updating event date to:", date.toISOString());
    
    // IMPORTANT: Update ALL date-related fields for consistency
    setEvent(prev => ({ 
      ...prev, 
      // ISO string formats
      dateTime: date.toISOString(),
      endDateTime: endDate.toISOString(),
      date: date.toISOString(),
      
      // Date objects
      dateObj: date,
      dateEndObj: endDate,
      
      // Nested date formats
      start: {
        ...(prev.start || {}),
        dateTime: date.toISOString(),
        date: date.toISOString().split('T')[0],
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        ...(prev.end || {}),
        dateTime: endDate.toISOString(),
        date: endDate.toISOString().split('T')[0],
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    }));
  }}
  className="w-full border rounded-md p-2 text-sm"
  required
/>
  {event.dateTime && (
    <div className="text-xs text-gray-500 mt-1">
      {new Date(event.dateTime).toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        year: 'numeric' 
      })}
    </div>
  )}
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
        
        {/* Location Section */}
<div>
  <label className="block text-sm font-medium mb-1 text-gray-700">
    Location
  </label>
  
  {/* Single location input with icon */}
  <div className="flex items-center border rounded-md overflow-hidden">
    <div className="p-2 text-gray-400">
      <MapPin size={16} />
    </div>
    <input
      type="text"
      id="location-input"
      ref={placesContainerRef}
      value={event.location || ''}
      onChange={(e) => handleManualLocationInput(e.target.value)}
      className="w-full p-2 text-sm border-0 focus:ring-0"
      placeholder="Where is this event happening?"
    />
  </div>
  
  {/* Current location value display (for visibility) */}
  {event.location && (
    <div className="text-xs text-blue-600 mt-1 pl-2">
      Current location: {event.location}
    </div>
  )}
</div>
        
        {/* Event Attendees Section */}
{(event.category === 'meeting' || event.eventType === 'meeting' || event.category === 'general') ? (
  // Meeting/General events: All family members attend
  <div>
    <label className="block text-sm font-medium mb-1 text-gray-700">
      Event Attendees
    </label>
    <div className="p-3 bg-blue-50 rounded-md">
      <div className="flex flex-wrap gap-2 mb-2">
        {familyMembers.map(member => (
          <div key={member.id} className="flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200">
            <UserAvatar user={member} size={20} className="mr-1" />
            {member.name}
            <Check size={12} className="ml-1" />
          </div>
        ))}
      </div>
      <p className="text-xs text-blue-700">
        {event.category === 'meeting' ? 
          "Family meetings include all family members by default." : 
          "All family members are included for this event."}
      </p>
    </div>
  </div>
) : (
  // Child-specific events: Child/Parent/Sibling selection
  <>
    {/* For meetings/general events: Show all attendees, for other events: Show child selection UI */}
{(event.category === 'meeting' || event.eventType === 'meeting') ? (
  <div>
    <label className="block text-sm font-medium mb-1 text-gray-700">
      Event Attendees
    </label>
    <div className="p-3 bg-blue-50 rounded-md">
      <div className="flex flex-wrap gap-2 mb-2">
        {familyMembers.map(member => (
          <div key={member.id} className="flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200">
            <UserAvatar user={member} size={20} className="mr-1" />
            {member.name}
            <Check size={12} className="ml-1" />
          </div>
        ))}
      </div>
      <p className="text-xs text-blue-700">
        {event.category === 'meeting' ? 
          "Family meetings include all family members by default." : 
          "All family members are included for this event."}
      </p>
    </div>
  </div>
) : (
  <>
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
  </>
)}
  </>
)}
        
        {/* Document Selection */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Attach Documents
          </label>
          <div className="p-3 bg-gray-50 rounded-md">
            {event.documents?.length > 0 ? (
              <div className="space-y-2">
                {event.documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div className="flex items-center">
                      <FileText size={16} className="text-blue-500 mr-2" />
                      <span className="text-sm truncate max-w-xs">{doc.title || doc.fileName}</span>
                    </div>
                    <button
                      onClick={() => setEvent(prev => ({
                        ...prev,
                        documents: prev.documents.filter((_, i) => i !== index)
                      }))}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    // This would normally open a document picker
                    // For now we'll just navigate to document library
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('open-document-library', {
                        detail: { 
                          childId: event.childId,
                          onSelect: (selectedDoc) => {
                            setEvent(prev => ({
                              ...prev,
                              documents: [...(prev.documents || []), selectedDoc]
                            }));
                          }
                        }
                      }));
                    }
                  }}
                  className="w-full py-2 text-center text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add More Documents
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  // This would normally open a document picker
                  // For now we'll just navigate to document library
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('open-document-library', {
                      detail: { 
                        childId: event.childId,
                        onSelect: (selectedDoc) => {
                          setEvent(prev => ({
                            ...prev,
                            documents: [...(prev.documents || []), selectedDoc]
                          }));
                        }
                      }
                    }));
                  }
                }}
                className="w-full p-3 border border-dashed border-gray-300 rounded-md flex items-center justify-center"
              >
                <FileText size={20} className="text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">Select Documents</span>
              </button>
            )}
          </div>
        </div>

        {/* Provider Selection */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Link to Provider
          </label>
          <div className="p-3 bg-gray-50 rounded-md">
            {event.providers?.length > 0 ? (
              <div className="space-y-2">
                {event.providers.map((provider, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div className="flex items-center">
                      <User size={16} className="text-purple-500 mr-2" />
                      <span className="text-sm">{provider.name}</span>
                      {provider.specialty && (
                        <span className="text-xs text-gray-500 ml-2">({provider.specialty})</span>
                      )}
                    </div>
                    <button
                      onClick={() => setEvent(prev => ({
                        ...prev,
                        providers: prev.providers.filter((_, i) => i !== index)
                      }))}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    // This would normally open a provider picker
                    // For now we'll just navigate to provider directory
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('open-provider-directory', {
                        detail: { 
                          onSelect: (selectedProvider) => {
                            setEvent(prev => ({
                              ...prev,
                              providers: [...(prev.providers || []), selectedProvider]
                            }));
                          }
                        }
                      }));
                    }
                  }}
                  className="w-full py-2 text-center text-sm text-purple-600 hover:text-purple-800"
                >
                  + Add More Providers
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  // This would normally open a provider picker
                  // For now we'll just navigate to provider directory
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('open-provider-directory', {
                      detail: { 
                        onSelect: (selectedProvider) => {
                          setEvent(prev => ({
                            ...prev,
                            providers: [...(prev.providers || []), selectedProvider]
                          }));
                        }
                      }
                    }));
                  }
                }}
                className="w-full p-3 border border-dashed border-gray-300 rounded-md flex items-center justify-center"
              >
                <User size={20} className="text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">Select Provider</span>
              </button>
            )}
          </div>
        </div>
        
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

        <SmartReminderSuggestions 
          eventType={event.eventType || eventType} 
          onSelectReminder={handleAddReminder} 
        />

        {selectedReminders.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Selected Reminders</h4>
            <div className="flex flex-wrap gap-2">
              {selectedReminders.map(minutes => (
                <div key={minutes} className="flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
                  {minutes >= 1440 ? `${minutes / 1440} day(s)` : 
                  minutes >= 60 ? `${minutes / 60} hour(s)` : 
                  `${minutes} minute(s)`} before
                  <button 
                    onClick={() => handleRemoveReminder(minutes)}
                    className="ml-1 text-blue-500 hover:text-blue-700"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
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
        <div className="flex justify-between pt-2">
          <div>
            {mode === 'edit' && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(event)}
                className="px-4 py-2 border border-red-500 text-red-500 rounded-md text-sm hover:bg-red-50 flex items-center"
              >
                <Trash2 size={16} className="mr-2" />
                Delete
              </button>
            )}
          </div>
          
          <div className="flex">
            {onCancel && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border rounded-md text-sm mr-3 hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
            
            {mode === 'view' ? (
              <button
                type="button"
                onClick={() => {
                  // Since we can't directly modify mode state in this component,
                  // We need to tell the parent to change to edit mode - if onSave is provided
                  if (onSave) {
                    // Signal to parent that user wants to edit
                    onSave({ requestEdit: true });
                  }
                }}
                className="px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-800 flex items-center"
              >
                <Edit size={16} className="mr-2" />
                Edit Event
              </button>
            ) : (
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
            )}
          </div>
        </div>
      </div>
      
      {/* Success Animation */}
      {showSuccess && (
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