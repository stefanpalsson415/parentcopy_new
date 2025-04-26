import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Image, FileIcon, Calendar, User, Users, Trash2, Clock, MapPin, Tag, X,
  Heart, Check, AlertCircle, Info, Edit, BookOpen, Music, Star, Award, Gift, 
  Briefcase, Activity, Phone, Mail, DollarSign, Truck, Package, Home, Shield, 
  Umbrella, List, Coffee, Clipboard
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
  currentWeek = null
}) => {
  const { familyMembers, familyId } = useFamily();
  const { currentUser } = useAuth();
  const { addEvent, updateEvent } = useEvents();
  
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
      },
      
      // Appointment-specific fields
      appointmentDetails: {
        reasonForVisit: '',
        insuranceInfo: '',
        formsNeeded: '',
        fastingRequired: false,
        bringRecords: false,
        transportation: '',
        postCare: '',
        duration: 60,
        followUpDate: '',
        costsAndCopays: '',
        doctorName: ''
      },
      
      // Activity-specific fields (sports, music, etc.)
      activityDetails: {
        equipmentNeeded: '',
        parentAttendance: false,
        weatherContingency: '',
        seasonDuration: '',
        fees: '',
        uniform: '',
        communicationMethod: '',
        coach: '',
        teammates: '',
        skillLevel: '',
        lessonType: ''
      },
      
      // Birthday-specific fields
      birthdayDetails: {
        birthdayChildName: '',
        birthdayChildAge: '',
        guestList: '',
        theme: '',
        foodArrangements: '',
        activities: '',
        budget: '',
        favors: '',
        setupCleanup: '',
        weatherBackup: '',
        isInvitation: false,
        rsvpDeadline: '',
        giftPreferences: ''
      },
      
      // Meeting-specific fields
      meetingDetails: {
        agenda: '',
        currentAssignments: '',
        issuesForDiscussion: '',
        trackingMethod: '',
        followUpPlan: '',
        participantsNeeded: [],
        meetingGoals: '',
        meetingNotes: ''
      },
      
      // Date night-specific fields
      dateNightDetails: {
        venue: '',
        budget: '',
        transportation: '',
        childcareArranged: false,
        needsBabysitter: true,
        specialOccasion: false,
        occasionNote: '',
        reservations: '',
        dresscode: ''
      },
      
      // Family vacation/travel-specific fields
      travelDetails: {
        destination: '',
        accommodation: '',
        packingList: '',
        petCare: '',
        houseSecurity: '',
        emergencyContacts: '',
        specialNeeds: '',
        travelDocuments: '',
        transportationDetails: ''
      },
      
      // Playdate-specific fields
      playdateDetails: {
        host: '',
        activities: '',
        foodPlans: '',
        dropoffPickup: '',
        otherChildren: []
      },
      
      // Parent-teacher conference specific fields
      conferenceDetails: {
        teacher: '',
        academicPerformance: '',
        questionsToAsk: '',
        previousGoals: '',
        upcomingGoals: ''
      },
      
      // Store providers for doctors, teachers, babysitters, etc.
      providers: [],
      
      // Store related documents
      documents: []
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
  const [showSuccess, setShowSuccess] = useState(false);
  
  const children = familyMembers.filter(m => m.role === 'child');
  const parents = familyMembers.filter(m => m.role === 'parent');
  const isUpdatingRef = useRef(false);
  const previousDateRef = useRef(null);
  const prevLocationRef = useRef(null);
  
  // Handle initial event data
  useEffect(() => {
    if (initialEvent && mode === 'edit' && !isUpdatingRef.current) {
      isUpdatingRef.current = true;
      
      // Create an updatedEvent object to batch all changes
      let updatedEvent = { ...event };
      let hasChanges = false;
      
      // Handle date/time standardization
      if (initialEvent.dateObj && !updatedEvent.dateTime) {
        updatedEvent.dateTime = initialEvent.dateObj.toISOString();
        hasChanges = true;
      } else if (initialEvent.start?.dateTime && !updatedEvent.dateTime) {
        updatedEvent.dateTime = initialEvent.start.dateTime;
        hasChanges = true;
      }
      
      // Handle end time
      if (initialEvent.dateEndObj && !updatedEvent.endDateTime) {
        updatedEvent.endDateTime = initialEvent.dateEndObj.toISOString();
        hasChanges = true;
      } else if (initialEvent.end?.dateTime && !updatedEvent.endDateTime) {
        updatedEvent.endDateTime = initialEvent.end.dateTime;
        hasChanges = true;
      }
      
      // Extract event-specific details from extraDetails
      if (initialEvent.extraDetails) {
        if (initialEvent.extraDetails.appointmentDetails) {
          updatedEvent.appointmentDetails = initialEvent.extraDetails.appointmentDetails;
          hasChanges = true;
        }
        
        if (initialEvent.extraDetails.activityDetails) {
          updatedEvent.activityDetails = initialEvent.extraDetails.activityDetails;
          hasChanges = true;
        }
        
        if (initialEvent.extraDetails.birthdayDetails) {
          updatedEvent.birthdayDetails = initialEvent.extraDetails.birthdayDetails;
          hasChanges = true;
        }
        
        if (initialEvent.extraDetails.meetingDetails) {
          updatedEvent.meetingDetails = initialEvent.extraDetails.meetingDetails;
          hasChanges = true;
        }
        
        if (initialEvent.extraDetails.dateNightDetails) {
          updatedEvent.dateNightDetails = initialEvent.extraDetails.dateNightDetails;
          hasChanges = true;
        }
        
        if (initialEvent.extraDetails.travelDetails) {
          updatedEvent.travelDetails = initialEvent.extraDetails.travelDetails;
          hasChanges = true;
        }
        
        if (initialEvent.extraDetails.playdateDetails) {
          updatedEvent.playdateDetails = initialEvent.extraDetails.playdateDetails;
          hasChanges = true;
        }
        
        if (initialEvent.extraDetails.conferenceDetails) {
          updatedEvent.conferenceDetails = initialEvent.extraDetails.conferenceDetails;
          hasChanges = true;
        }
        
        // Backward compatibility for birthday details
        if (initialEvent.extraDetails.birthdayChildName && !updatedEvent.birthdayDetails?.birthdayChildName) {
          updatedEvent.birthdayDetails = {
            ...updatedEvent.birthdayDetails,
            birthdayChildName: initialEvent.extraDetails.birthdayChildName,
            birthdayChildAge: initialEvent.extraDetails.birthdayChildAge || ''
          };
          hasChanges = true;
        }
      }
      
      // Apply the batch update only if something changed
      if (hasChanges) {
        setEvent(updatedEvent);
      }
      
      // Reset update flag after state update is processed
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  }, [initialEvent, mode]);
  
  // Automatically update child name when childId changes
  useEffect(() => {
    if (isUpdatingRef.current) return;
    
    if (event.childId) {
      const child = children.find(c => c.id === event.childId);
      if (child && child.name !== event.childName) {
        isUpdatingRef.current = true;
        setEvent(prev => ({ ...prev, childName: child.name }));
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 0);
      }
    }
  }, [event.childId, children]);
  
  // Automatically set all family members as attendees for meeting events
  useEffect(() => {
    if ((event.category === 'meeting' || event.eventType === 'meeting') && familyMembers.length > 0) {
      const allAttendees = familyMembers.map(member => ({
        id: member.id,
        name: member.name,
        role: member.role
      }));
      
      setEvent(prev => ({
        ...prev,
        attendees: allAttendees,
        attendingParentId: 'both'
      }));
    }
  }, [event.category, event.eventType, familyMembers]);
  
 // Initialize Google Places Autocomplete
const initPlacesAutocomplete = async () => {
  if (!window.google || !window.google.maps) {
    console.warn("Google Maps API not available");
    return false;
  }

  try {
    // Make sure we have the places library
    if (!window.google.maps.places) {
      try {
        console.log("Importing Places library...");
        await window.google.maps.importLibrary("places");
        console.log("Places library imported successfully");
      } catch (importError) {
        console.error("Error importing Places library:", importError);
        return false;
      }
    }

    // Verify the PlaceAutocompleteElement exists
    if (!window.google.maps.places.PlaceAutocompleteElement) {
      console.error("PlaceAutocompleteElement is not available");
      return false;
    }

    const container = document.getElementById('places-container');
    
    if (!container) {
      console.warn("Places container not found in DOM");
      return false;
    }
    
    // Clear the container
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    
    // Add custom styles for the PlaceAutocompleteElement
    // This targets the shadow DOM parts
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      #places-container {
        width: 100%;
      }
      #place-autocomplete-element::part(input) {
        width: 100%;
        padding: 0.5rem;
        border-radius: 0.375rem;
        border: 1px solid #d1d5db;
        font-family: Roboto, sans-serif;
        font-size: 0.875rem;
      }
      #place-autocomplete-element::part(menu) {
        margin-top: 0.25rem;
        border-radius: 0.375rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        z-index: 100;
      }
      #place-autocomplete-element::part(item) {
        padding: 0.5rem 0.75rem;
        font-family: Roboto, sans-serif;
        font-size: 0.875rem;
      }
      #place-autocomplete-element::part(item:hover) {
        background-color: #f3f4f6;
      }
      #place-autocomplete-element::part(item[active]) {
        background-color: #e5e7eb;
      }
    `;
    document.head.appendChild(styleEl);
    
    // Create the PlaceAutocompleteElement with enhanced options compatible with the new API
console.log("Creating enhanced PlaceAutocompleteElement...");
const placeAutocompleteElement = new window.google.maps.places.PlaceAutocompleteElement({
  types: ['address', 'establishment'], // Allow addresses and points of interest
  inputPlaceholder: 'Where is this event happening?',
  // Optional: Add location bias to improve results relevance
  locationBias: navigator.geolocation ? { center: { lat: 0, lng: 0 }, radius: 10000 } : undefined
});
    
    // Set component ID for CSS targeting
    placeAutocompleteElement.id = 'place-autocomplete-element';
    
    // Add it to the container
    container.appendChild(placeAutocompleteElement);
    placeAutocompleteElementRef.current = placeAutocompleteElement;
    
    // Add event listener for place selection
    placeAutocompleteElement.addEventListener('gmp-placeselect', async (event) => {
      try {
        console.log("Place selected:", event);
        
        // Get place prediction from the event
const placePrediction = event.placePrediction;
const place = placePrediction.toPlace();

// Fetch the fields we need with the new API pattern
await place.fetchFields({
  fields: ["formattedAddress", "displayName", "name", "location"]
});
        
        console.log("Fetched place fields:", place);
        
        // Extract location text - prioritize formattedAddress for consistency
        let locationText = "";
        
        if (place.formattedAddress) {
          locationText = place.formattedAddress;
        } else if (place.displayName) {
          locationText = place.displayName;
        } else if (place.name) {
          locationText = place.name;
        }
        
        if (locationText) {
          console.log("Setting location to:", locationText);
          // Update in a single state change to prevent UI flicker
          setEvent(prev => ({ 
            ...prev, 
            location: locationText,
            // Store coordinates if available for future use
            coordinates: place.location ? { 
              lat: place.location.lat, 
              lng: place.location.lng 
            } : prev.coordinates
          }));
          
          prevLocationRef.current = locationText;
        }
      } catch (error) {
        console.error("Error handling place selection:", error);
      }
    });
    
    // Try to set initial location value if available
    if (event.location && prevLocationRef.current !== event.location) {
      prevLocationRef.current = event.location;
      
      // Initialize input with current location if available
      try {
        const input = placeAutocompleteElement.querySelector('input');
        if (input) {
          input.value = event.location;
        }
      } catch (err) {
        console.warn("Could not initialize input value:", err);
      }
    }
    
    console.log("Enhanced PlaceAutocompleteElement initialized successfully");
    return true;
  } catch (error) {
    console.error("Error initializing Places API:", error);
    return false;
  }
};
  
  // Initialize Places API after DOM is ready
useEffect(() => {
  // Add a delay to ensure DOM is ready
  const timeoutId = setTimeout(async () => {
    if (!placesInitialized && window.google && window.google.maps) {
      console.log("Initializing Places Autocomplete...");
      try {
        const success = await initPlacesAutocomplete();
        console.log("Places initialization result:", success);
        setPlacesInitialized(success);
      } catch (error) {
        console.error("Error in Places initialization:", error);
        setPlacesInitialized(false);
      }
    }
  }, 1000); // Increased timeout to ensure DOM and API are fully loaded
  
  // Listen for API loaded event
  const handleMapsApiLoaded = async () => {
    console.log("Maps API loaded event received");
    if (!placesInitialized) {
      try {
        const success = await initPlacesAutocomplete();
        console.log("Places initialization result from event:", success);
        setPlacesInitialized(success);
      } catch (error) {
        console.error("Error in Places initialization from event:", error);
        setPlacesInitialized(false);
      }
    }
  };
  
  window.addEventListener('google-maps-api-loaded', handleMapsApiLoaded);
  
  return () => {
    clearTimeout(timeoutId);
    window.removeEventListener('google-maps-api-loaded', handleMapsApiLoaded);
  };
}, [placesInitialized]);
  
  // Synchronize event location with Places input
  useEffect(() => {
    if (isUpdatingRef.current || !placesInitialized || !placeAutocompleteElementRef.current) return;
    
    if (event.location && event.location !== prevLocationRef.current) {
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
  
  // Manual location input handler
  const handleManualLocationInput = (value) => {
    setEvent(prev => ({ ...prev, location: value }));
    prevLocationRef.current = value;
  };
  
  // Handle form save
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
        location: event.location || '',
        
        // Add reminders if selected
        reminders: selectedReminders.length > 0 ? {
          useDefault: false,
          overrides: selectedReminders.map(minutes => ({
            method: 'popup',
            minutes
          }))
        } : {
          useDefault: true,
          overrides: []
        },
        
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
        
        // Include all event-specific details in extraDetails
        extraDetails: {
          ...(event.extraDetails || {}),
          notes: event.extraDetails?.notes || '',
          
          // Add type-specific details based on category
          ...(event.category === 'appointment' && { 
            appointmentDetails: event.appointmentDetails
          }),
          
          ...(event.category === 'activity' && { 
            activityDetails: event.activityDetails
          }),
          
          ...(event.category === 'birthday' && { 
            birthdayDetails: event.birthdayDetails || {
              birthdayChildName: event.extraDetails?.birthdayChildName,
              birthdayChildAge: event.extraDetails?.birthdayChildAge
            }
          }),
          
          ...(event.category === 'meeting' && { 
            meetingDetails: event.meetingDetails
          }),
          
          ...(event.eventType === 'date-night' && {
            dateNightDetails: event.dateNightDetails
          }),
          
          ...(event.eventType === 'travel' || event.eventType === 'vacation' && {
            travelDetails: event.travelDetails
          }),
          
          ...(event.eventType === 'playdate' && {
            playdateDetails: event.playdateDetails
          }),
          
          ...(event.eventType === 'conference' && {
            conferenceDetails: event.conferenceDetails
          })
        }
      };
      
      let result;
      
      // Handle recurring events if applicable
      if (event.isRecurring && event.recurrence.days.length > 0) {
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
            dayResult = await updateEvent(event.firestoreId, dayEvent);
          } else {
            dayResult = await addEvent(dayEvent);
          }
          
          results.push(dayResult);
        }
        
        // Trigger immediate refresh
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('calendar-event-updated', { 
            detail: { 
              updated: true,
              cycleUpdate: calendarEvent.title?.includes("Cycle") && calendarEvent.category === 'meeting'
            }
          }));
          window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
        }
        
        // Call onSave with results
        if (onSave) onSave({success: true, recurringResults: results});
        
        // Show success animation
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
        }, 1500);
        
        setLoading(false);
        return; 
      }
      
      // Not recurring - handle as single event
      if (mode === 'edit' && event.firestoreId) {
        result = await updateEvent(event.firestoreId, calendarEvent);
      } else {
        result = await addEvent(calendarEvent);
      }
      
      // Handle special event types
      // Special handling for cycle due dates
      const isCycleDueDate = calendarEvent.title?.includes("Cycle") && 
                            (calendarEvent.category === 'meeting' || calendarEvent.eventType === 'meeting');
      
      if (mode === 'edit' && isCycleDueDate) {
        try {
          const cycleNumber = parseInt(calendarEvent.title.match(/Cycle\s*(\d+)/i)?.[1] || 
                            calendarEvent.cycleNumber || 
                            event.extraDetails?.cycleNumber || 
                            "0");
          
          const newDate = new Date(calendarEvent.start.dateTime);
          
          if (familyId && cycleNumber > 0) {
            const familyRef = doc(db, "families", familyId);
            await updateDoc(familyRef, {
              [`surveySchedule.${cycleNumber}`]: newDate.toISOString(),
              updatedAt: serverTimestamp()
            });
          }
          
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
        }
      }
      
      // Trigger immediate refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('calendar-event-updated', { 
          detail: { 
            updated: true,
            cycleUpdate: isCycleDueDate
          }
        }));
        
        window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
        
        if (isCycleDueDate) {
          window.dispatchEvent(new CustomEvent('cycle-date-updated', { 
            detail: { date: new Date(calendarEvent.start.dateTime) }
          }));
        }
      }
      
      // Call onSave callback
      if (onSave) onSave(result);
      
      // Show success animation
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
  
  // Handle reminders
  const handleAddReminder = (minutes) => {
    if (minutes === 'custom') {
      if (!selectedReminders.includes(15)) {
        setSelectedReminders([...selectedReminders, 15]);
      }
      return;
    }
    
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
  
  // Render appointment-specific fields
  const renderAppointmentFields = () => (
    <div className="p-4 bg-red-50 rounded-md border border-red-200 mt-4">
      <h4 className="font-medium mb-3 flex items-center">
        <AlertCircle size={18} className="mr-2 text-red-600" />
        Appointment Details
      </h4>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Reason for Visit
          </label>
          <input
            type="text"
            value={event.appointmentDetails?.reasonForVisit || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              appointmentDetails: {
                ...prev.appointmentDetails,
                reasonForVisit: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Why is this appointment needed?"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Insurance Information
          </label>
          <input
            type="text"
            value={event.appointmentDetails?.insuranceInfo || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              appointmentDetails: {
                ...prev.appointmentDetails,
                insuranceInfo: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Insurance details, ID, etc."
          />
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-gray-700">
          Forms Needed
        </label>
        <textarea
          value={event.appointmentDetails?.formsNeeded || ''}
          onChange={(e) => setEvent(prev => ({   
            ...prev,   
            appointmentDetails: {
              ...prev.appointmentDetails,
              formsNeeded: e.target.value
            }
          }))}
          className="w-full border rounded-md p-2 text-sm"
          rows="2"
          placeholder="List any forms that need to be completed"
        ></textarea>
      </div>
      
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="fastingRequired"
            checked={event.appointmentDetails?.fastingRequired || false}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              appointmentDetails: {
                ...prev.appointmentDetails,
                fastingRequired: e.target.checked
              }
            }))}
            className="h-4 w-4 text-blue-600 rounded border-gray-300"
          />
          <label htmlFor="fastingRequired" className="ml-2 text-sm text-gray-700">
            Fasting required
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="bringRecords"
            checked={event.appointmentDetails?.bringRecords || false}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              appointmentDetails: {
                ...prev.appointmentDetails,
                bringRecords: e.target.checked
              }
            }))}
            className="h-4 w-4 text-blue-600 rounded border-gray-300"
          />
          <label htmlFor="bringRecords" className="ml-2 text-sm text-gray-700">
            Bring previous records
          </label>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Transportation Plans
          </label>
          <input
            type="text"
            value={event.appointmentDetails?.transportation || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              appointmentDetails: {
                ...prev.appointmentDetails,
                transportation: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="How will you get there?"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Costs/Copays
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign size={14} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={event.appointmentDetails?.costsAndCopays || ''}
              onChange={(e) => setEvent(prev => ({   
                ...prev,   
                appointmentDetails: {
                  ...prev.appointmentDetails,
                  costsAndCopays: e.target.value
                }
              }))}
              className="w-full border rounded-md p-2 pl-9 text-sm"
              placeholder="Expected costs"
            />
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-gray-700">
          Follow-up Date (if known)
        </label>
        <input
          type="date"
          value={event.appointmentDetails?.followUpDate || ''}
          onChange={(e) => setEvent(prev => ({   
            ...prev,   
            appointmentDetails: {
              ...prev.appointmentDetails,
              followUpDate: e.target.value
            }
          }))}
          className="w-full border rounded-md p-2 text-sm"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">
          Post-Appointment Care Notes
        </label>
        <textarea
          value={event.appointmentDetails?.postCare || ''}
          onChange={(e) => setEvent(prev => ({   
            ...prev,   
            appointmentDetails: {
              ...prev.appointmentDetails,
              postCare: e.target.value
            }
          }))}
          className="w-full border rounded-md p-2 text-sm"
          rows="2"
          placeholder="Any special care needed after the appointment"
        ></textarea>
      </div>
    </div>
  );
  
  // Render activity-specific fields
  const renderActivityFields = () => (
    <div className="p-4 bg-green-50 rounded-md border border-green-200 mt-4">
      <h4 className="font-medium mb-3 flex items-center">
        <Activity size={18} className="mr-2 text-green-600" />
        Activity Details
      </h4>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Equipment Needed
          </label>
          <textarea
            value={event.activityDetails?.equipmentNeeded || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              activityDetails: {
                ...prev.activityDetails,
                equipmentNeeded: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            rows="2"
            placeholder="What to bring (e.g., cleats, shin guards, instrument)"
          ></textarea>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Instructor/Coach
          </label>
          <input
            type="text"
            value={event.activityDetails?.coach || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              activityDetails: {
                ...prev.activityDetails,
                coach: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Name of coach or instructor"
          />
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-gray-700">
          Weather Contingency Plan
        </label>
        <input
          type="text"
          value={event.activityDetails?.weatherContingency || ''}
          onChange={(e) => setEvent(prev => ({   
            ...prev,   
            activityDetails: {
              ...prev.activityDetails,
              weatherContingency: e.target.value
            }
          }))}
          className="w-full border rounded-md p-2 text-sm"
          placeholder="What happens if weather is bad?"
        />
      </div>
      
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="parentAttendance"
            checked={event.activityDetails?.parentAttendance || false}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              activityDetails: {
                ...prev.activityDetails,
                parentAttendance: e.target.checked
              }
            }))}
            className="h-4 w-4 text-blue-600 rounded border-gray-300"
          />
          <label htmlFor="parentAttendance" className="ml-2 text-sm text-gray-700">
            Parent attendance required
          </label>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Skill Level/Class Type
          </label>
          <input
            type="text"
            value={event.activityDetails?.skillLevel || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              activityDetails: {
                ...prev.activityDetails,
                skillLevel: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Beginner, intermediate, etc."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Fees
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign size={14} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={event.activityDetails?.fees || ''}
              onChange={(e) => setEvent(prev => ({   
                ...prev,   
                activityDetails: {
                  ...prev.activityDetails,
                  fees: e.target.value
                }
              }))}
              className="w-full border rounded-md p-2 pl-9 text-sm"
              placeholder="Fees or payment due"
            />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Season Duration
          </label>
          <input
            type="text"
            value={event.activityDetails?.seasonDuration || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              activityDetails: {
                ...prev.activityDetails,
                seasonDuration: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="How long does this activity run?"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Communication Method
          </label>
          <input
            type="text"
            value={event.activityDetails?.communicationMethod || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              activityDetails: {
                ...prev.activityDetails,
                communicationMethod: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="How are changes communicated?"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">
          Uniform/Dress Requirements
        </label>
        <input
          type="text"
          value={event.activityDetails?.uniform || ''}
          onChange={(e) => setEvent(prev => ({   
            ...prev,   
            activityDetails: {
              ...prev.activityDetails,
              uniform: e.target.value
            }
          }))}
          className="w-full border rounded-md p-2 text-sm"
          placeholder="What should they wear?"
        />
      </div>
    </div>
  );
  
  // Render birthday-specific fields
  const renderBirthdayFields = () => (
    <div className="p-4 bg-purple-50 rounded-md border border-purple-200 mt-4">
      <h4 className="font-medium mb-3 flex items-center">
        <Gift size={18} className="mr-2 text-purple-600" />
        Birthday Party Details
      </h4>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Birthday Child's Name
          </label>
          <input
            type="text"
            value={event.birthdayDetails?.birthdayChildName || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              birthdayDetails: {
                ...prev.birthdayDetails,
                birthdayChildName: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Who is celebrating their birthday?"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Age
          </label>
          <input
            type="number"
            value={event.birthdayDetails?.birthdayChildAge || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              birthdayDetails: {
                ...prev.birthdayDetails,
                birthdayChildAge: e.target.value ? parseInt(e.target.value) : ''
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            min="1"
            placeholder="How old are they turning?"
          />
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-gray-700">
          Guest List
        </label>
        <textarea
          value={event.birthdayDetails?.guestList || ''}
          onChange={(e) => setEvent(prev => ({   
            ...prev,   
            birthdayDetails: {
              ...prev.birthdayDetails,
              guestList: e.target.value
            }
          }))}
          className="w-full border rounded-md p-2 text-sm"
          rows="2"
          placeholder="Who is invited to the party?"
        ></textarea>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Party Theme
          </label>
          <input
            type="text"
            value={event.birthdayDetails?.theme || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              birthdayDetails: {
                ...prev.birthdayDetails,
                theme: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Any special theme for the party?"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            RSVP Deadline
          </label>
          <input
            type="date"
            value={event.birthdayDetails?.rsvpDeadline || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              birthdayDetails: {
                ...prev.birthdayDetails,
                rsvpDeadline: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Food & Cake
          </label>
          <input
            type="text"
            value={event.birthdayDetails?.foodArrangements || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              birthdayDetails: {
                ...prev.birthdayDetails,
                foodArrangements: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Food plans and cake details"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Budget
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign size={14} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={event.birthdayDetails?.budget || ''}
              onChange={(e) => setEvent(prev => ({   
                ...prev,   
                birthdayDetails: {
                  ...prev.birthdayDetails,
                  budget: e.target.value
                }
              }))}
              className="w-full border rounded-md p-2 pl-9 text-sm"
              placeholder="Budget for the party"
            />
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-gray-700">
          Activities Planned
        </label>
        <textarea
          value={event.birthdayDetails?.activities || ''}
          onChange={(e) => setEvent(prev => ({   
            ...prev,   
            birthdayDetails: {
              ...prev.birthdayDetails,
              activities: e.target.value
            }
          }))}
          className="w-full border rounded-md p-2 text-sm"
          rows="2"
          placeholder="What activities are planned for the party?"
        ></textarea>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Party Favors
          </label>
          <input
            type="text"
            value={event.birthdayDetails?.favors || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              birthdayDetails: {
                ...prev.birthdayDetails,
                favors: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="What are you giving guests?"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Setup & Cleanup Plan
          </label>
          <input
            type="text"
            value={event.birthdayDetails?.setupCleanup || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              birthdayDetails: {
                ...prev.birthdayDetails,
                setupCleanup: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Who's helping with setup/cleanup?"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Weather Backup Plan
          </label>
          <input
            type="text"
            value={event.birthdayDetails?.weatherBackup || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              birthdayDetails: {
                ...prev.birthdayDetails,
                weatherBackup: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Plan B for outdoor parties"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Gift Preferences
          </label>
          <input
            type="text"
            value={event.birthdayDetails?.giftPreferences || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              birthdayDetails: {
                ...prev.birthdayDetails,
                giftPreferences: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Any gift preferences or registry"
          />
        </div>
      </div>
      
      <div className="flex items-center">
        <input
          type="checkbox"
          id="isInvitation"
          checked={event.birthdayDetails?.isInvitation || false}
          onChange={(e) => setEvent(prev => ({   
            ...prev,   
            birthdayDetails: {
              ...prev.birthdayDetails,
              isInvitation: e.target.checked
            }
          }))}
          className="h-4 w-4 text-purple-600 rounded border-gray-300"
        />
        <label htmlFor="isInvitation" className="ml-2 text-sm text-gray-700">
          This is an invitation to someone else's party
        </label>
      </div>
    </div>
  );
  
  // Render meeting-specific fields
  const renderMeetingFields = () => (
    <div className="p-4 bg-amber-50 rounded-md border border-amber-200 mt-4">
      <h4 className="font-medium mb-3 flex items-center">
        <Users size={18} className="mr-2 text-amber-600" />
        Meeting Details
      </h4>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-gray-700">
          Meeting Agenda
        </label>
        <textarea
          value={event.meetingDetails?.agenda || ''}
          onChange={(e) => setEvent(prev => ({   
            ...prev,   
            meetingDetails: {
              ...prev.meetingDetails,
              agenda: e.target.value
            }
          }))}
          className="w-full border rounded-md p-2 text-sm"
          rows="3"
          placeholder="What will be discussed in this meeting?"
        ></textarea>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-gray-700">
          Current Assignments/Tasks
        </label>
        <textarea
          value={event.meetingDetails?.currentAssignments || ''}
          onChange={(e) => setEvent(prev => ({   
            ...prev,   
            meetingDetails: {
              ...prev.meetingDetails,
              currentAssignments: e.target.value
            }
          }))}
          className="w-full border rounded-md p-2 text-sm"
          rows="2"
          placeholder="What assignments are currently in progress?"
        ></textarea>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-gray-700">
          Issues for Discussion
        </label>
        <textarea
          value={event.meetingDetails?.issuesForDiscussion || ''}
          onChange={(e) => setEvent(prev => ({   
            ...prev,   
            meetingDetails: {
              ...prev.meetingDetails,
              issuesForDiscussion: e.target.value
            }
          }))}
          className="w-full border rounded-md p-2 text-sm"
          rows="2"
          placeholder="What issues need to be addressed?"
        ></textarea>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Meeting Goals
          </label>
          <textarea
            value={event.meetingDetails?.meetingGoals || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              meetingDetails: {
                ...prev.meetingDetails,
                meetingGoals: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            rows="2"
            placeholder="What are the goals for this meeting?"
          ></textarea>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Follow-up Plan
          </label>
          <input
            type="text"
            value={event.meetingDetails?.followUpPlan || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              meetingDetails: {
                ...prev.meetingDetails,
                followUpPlan: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="How will you follow up after the meeting?"
          />
        </div>
      </div>
    </div>
  );
  
  // Render date night-specific fields
  const renderDateNightFields = () => (
    <div className="p-4 bg-pink-50 rounded-md border border-pink-200 mt-4">
      <h4 className="font-medium mb-3 flex items-center">
        <Heart size={18} className="mr-2 text-pink-600" />
        Date Night Details
      </h4>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Venue/Restaurant
          </label>
          <input
            type="text"
            value={event.dateNightDetails?.venue || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              dateNightDetails: {
                ...prev.dateNightDetails,
                venue: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Where will you be going?"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Budget
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign size={14} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={event.dateNightDetails?.budget || ''}
              onChange={(e) => setEvent(prev => ({   
                ...prev,   
                dateNightDetails: {
                  ...prev.dateNightDetails,
                  budget: e.target.value
                }
              }))}
              className="w-full border rounded-md p-2 pl-9 text-sm"
              placeholder="Estimated cost for the evening"
            />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Transportation
          </label>
          <input
            type="text"
            value={event.dateNightDetails?.transportation || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              dateNightDetails: {
                ...prev.dateNightDetails,
                transportation: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="How will you get there?"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Reservations
          </label>
          <input
            type="text"
            value={event.dateNightDetails?.reservations || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              dateNightDetails: {
                ...prev.dateNightDetails,
                reservations: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Reservation details or confirmation #"
          />
        </div>
      </div>
      
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="childcareArranged"
            checked={event.dateNightDetails?.childcareArranged || false}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              dateNightDetails: {
                ...prev.dateNightDetails,
                childcareArranged: e.target.checked
              }
            }))}
            className="h-4 w-4 text-blue-600 rounded border-gray-300"
          />
          <label htmlFor="childcareArranged" className="ml-2 text-sm text-gray-700">
            Childcare arranged
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="needsBabysitter"
            checked={event.dateNightDetails?.needsBabysitter || false}
            onChange={(e) => {
              setEvent(prev => ({   
                ...prev,   
                dateNightDetails: {
                  ...prev.dateNightDetails,
                  needsBabysitter: e.target.checked
                }
              }));
              
              // If checked and no providers, prompt to add a babysitter
              if (e.target.checked && (!event.providers || event.providers.length === 0)) {
                setTimeout(() => {
                  if (typeof window !== 'undefined' && !isUpdatingRef.current) {
                    window.dispatchEvent(new CustomEvent('open-provider-directory', {
                      detail: {   
                        filterType: 'childcare',
                        title: 'Select Babysitter',
                        onSelect: (selectedProvider) => {
                          setEvent(prev => ({
                            ...prev,
                            providers: [...(prev.providers || []), selectedProvider]
                          }));
                        }
                      }
                    }));
                  }
                }, 500);
              }
            }}
            className="h-4 w-4 text-blue-600 rounded border-gray-300"
          />
          <label htmlFor="needsBabysitter" className="ml-2 text-sm text-gray-700">
            Need a babysitter
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="specialOccasion"
            checked={event.dateNightDetails?.specialOccasion || false}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              dateNightDetails: {
                ...prev.dateNightDetails,
                specialOccasion: e.target.checked,
                occasionNote: e.target.checked   
                  ? prev.dateNightDetails?.occasionNote || ''   
                  : ''
              }
            }))}
            className="h-4 w-4 text-blue-600 rounded border-gray-300"
          />
          <label htmlFor="specialOccasion" className="ml-2 text-sm text-gray-700">
            Special occasion
          </label>
        </div>
      </div>
      
      {/* Special occasion note */}
      {event.dateNightDetails?.specialOccasion && (
        <div className="mb-4">
          <input
            type="text"
            value={event.dateNightDetails?.occasionNote || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              dateNightDetails: {
                ...prev.dateNightDetails,
                occasionNote: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="What's the special occasion? (Anniversary, birthday, etc.)"
          />
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">
          Dress Code
        </label>
        <input
          type="text"
          value={event.dateNightDetails?.dresscode || ''}
          onChange={(e) => setEvent(prev => ({   
            ...prev,   
            dateNightDetails: {
              ...prev.dateNightDetails,
              dresscode: e.target.value
            }
          }))}
          className="w-full border rounded-md p-2 text-sm"
          placeholder="Any specific dress code?"
        />
      </div>
    </div>
  );
  
  // Render travel/vacation-specific fields
  const renderTravelFields = () => (
    <div className="p-4 bg-blue-50 rounded-md border border-blue-200 mt-4">
      <h4 className="font-medium mb-3 flex items-center">
        <Briefcase size={18} className="mr-2 text-blue-600" />
        Travel/Vacation Details
      </h4>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Destination
          </label>
          <input
            type="text"
            value={event.travelDetails?.destination || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              travelDetails: {
                ...prev.travelDetails,
                destination: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Where are you going?"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Accommodation
          </label>
          <input
            type="text"
            value={event.travelDetails?.accommodation || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              travelDetails: {
                ...prev.travelDetails,
                accommodation: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Hotel, Airbnb, etc."
          />
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-gray-700">
          Packing List
        </label>
        <textarea
          value={event.travelDetails?.packingList || ''}
          onChange={(e) => setEvent(prev => ({   
            ...prev,   
            travelDetails: {
              ...prev.travelDetails,
              packingList: e.target.value
            }
          }))}
          className="w-full border rounded-md p-2 text-sm"
          rows="3"
          placeholder="What to pack for each family member"
        ></textarea>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Transportation Details
          </label>
          <textarea
            value={event.travelDetails?.transportationDetails || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              travelDetails: {
                ...prev.travelDetails,
                transportationDetails: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            rows="2"
            placeholder="Flight/train numbers, rental car info, etc."
          ></textarea>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Travel Documents Needed
          </label>
          <textarea
            value={event.travelDetails?.travelDocuments || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              travelDetails: {
                ...prev.travelDetails,
                travelDocuments: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            rows="2"
            placeholder="Passports, ID, tickets, confirmations"
          ></textarea>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Pet Care Arrangements
          </label>
          <input
            type="text"
            value={event.travelDetails?.petCare || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              travelDetails: {
                ...prev.travelDetails,
                petCare: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Who's taking care of pets?"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            House Security
          </label>
          <input
            type="text"
            value={event.travelDetails?.houseSecurity || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              travelDetails: {
                ...prev.travelDetails,
                houseSecurity: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="House sitter, security system, etc."
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Emergency Contacts
          </label>
          <textarea
            value={event.travelDetails?.emergencyContacts || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              travelDetails: {
                ...prev.travelDetails,
                emergencyContacts: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            rows="2"
            placeholder="Emergency contact information"
          ></textarea>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Special Needs/Considerations
          </label>
          <textarea
            value={event.travelDetails?.specialNeeds || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              travelDetails: {
                ...prev.travelDetails,
                specialNeeds: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            rows="2"
            placeholder="Medications, allergies, accessibility needs"
          ></textarea>
        </div>
      </div>
    </div>
  );
  
  // Render playdate-specific fields
  const renderPlaydateFields = () => (
    <div className="p-4 bg-blue-50 rounded-md border border-blue-200 mt-4">
      <h4 className="font-medium mb-3 flex items-center">
        <Users size={18} className="mr-2 text-blue-600" />
        Playdate Details
      </h4>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Host
          </label>
          <input
            type="text"
            value={event.playdateDetails?.host || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              playdateDetails: {
                ...prev.playdateDetails,
                host: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Who is hosting the playdate?"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Food Plans
          </label>
          <input
            type="text"
            value={event.playdateDetails?.foodPlans || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              playdateDetails: {
                ...prev.playdateDetails,
                foodPlans: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Snacks, meals, allergies, etc."
          />
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-gray-700">
          Activities Planned
        </label>
        <textarea
          value={event.playdateDetails?.activities || ''}
          onChange={(e) => setEvent(prev => ({   
            ...prev,   
            playdateDetails: {
              ...prev.playdateDetails,
              activities: e.target.value
            }
          }))}
          className="w-full border rounded-md p-2 text-sm"
          rows="2"
          placeholder="What will the children be doing?"
        ></textarea>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-gray-700">
          Other Children Attending
        </label>
        <textarea
          value={event.playdateDetails?.otherChildren || ''}
          onChange={(e) => setEvent(prev => ({   
            ...prev,   
            playdateDetails: {
              ...prev.playdateDetails,
              otherChildren: e.target.value
            }
          }))}
          className="w-full border rounded-md p-2 text-sm"
          rows="2"
          placeholder="Names and ages of other children"
        ></textarea>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">
          Drop-off/Pick-up Arrangements
        </label>
        <input
          type="text"
          value={event.playdateDetails?.dropoffPickup || ''}
          onChange={(e) => setEvent(prev => ({   
            ...prev,   
            playdateDetails: {
              ...prev.playdateDetails,
              dropoffPickup: e.target.value
            }
          }))}
          className="w-full border rounded-md p-2 text-sm"
          placeholder="Who is dropping off and picking up?"
        />
      </div>
    </div>
  );
  
  // Render parent-teacher conference fields
  const renderConferenceFields = () => (
    <div className="p-4 bg-indigo-50 rounded-md border border-indigo-200 mt-4">
      <h4 className="font-medium mb-3 flex items-center">
        <BookOpen size={18} className="mr-2 text-indigo-600" />
        Parent-Teacher Conference Details
      </h4>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Teacher's Name
          </label>
          <input
            type="text"
            value={event.conferenceDetails?.teacher || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              conferenceDetails: {
                ...prev.conferenceDetails,
                teacher: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Name of the teacher"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Academic Performance
          </label>
          <input
            type="text"
            value={event.conferenceDetails?.academicPerformance || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              conferenceDetails: {
                ...prev.conferenceDetails,
                academicPerformance: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Current grades or performance status"
          />
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-gray-700">
          Questions to Ask
        </label>
        <textarea
          value={event.conferenceDetails?.questionsToAsk || ''}
          onChange={(e) => setEvent(prev => ({   
            ...prev,   
            conferenceDetails: {
              ...prev.conferenceDetails,
              questionsToAsk: e.target.value
            }
          }))}
          className="w-full border rounded-md p-2 text-sm"
          rows="3"
          placeholder="List of questions to ask the teacher"
        ></textarea>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Previous Goals
          </label>
          <textarea
            value={event.conferenceDetails?.previousGoals || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              conferenceDetails: {
                ...prev.conferenceDetails,
                previousGoals: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            rows="2"
            placeholder="Goals set in previous conferences"
          ></textarea>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Goals for Coming Period
          </label>
          <textarea
            value={event.conferenceDetails?.upcomingGoals || ''}
            onChange={(e) => setEvent(prev => ({   
              ...prev,   
              conferenceDetails: {
                ...prev.conferenceDetails,
                upcomingGoals: e.target.value
              }
            }))}
            className="w-full border rounded-md p-2 text-sm"
            rows="2"
            placeholder="Goals for the upcoming period"
          ></textarea>
        </div>
      </div>
    </div>
  );
  
  // Render event-specific fields based on event type
  const renderEventSpecificFields = () => {
    switch(event.category) {
      case 'appointment':
        return renderAppointmentFields();
      case 'activity':
        return renderActivityFields();
      case 'birthday':
        return renderBirthdayFields();
      case 'meeting':
        return renderMeetingFields();
      default:
        break;
    }
    
    // For event types that don't match category
    switch(event.eventType) {
      case 'date-night':
        return renderDateNightFields();
      case 'travel':
      case 'vacation':
        return renderTravelFields();
      case 'playdate':
        return renderPlaydateFields();
      case 'conference':
        return renderConferenceFields();
      default:
        return null;
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
            <button
              type="button"
              onClick={() => setEvent(prev => ({ 
                ...prev, 
                category: 'relationship', 
                eventType: 'date-night',
                dateNightDetails: {
                  ...(prev.dateNightDetails || {}),
                  venue: '',
                  budget: '',
                  transportation: '',
                  childcareArranged: false,
                  needsBabysitter: true,
                  specialOccasion: false
                },
                attendingParentId: 'both'
              }))}
              className={`px-3 py-1 text-sm rounded-full ${
                event.eventType === 'date-night' ? 'bg-pink-100 text-pink-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              Date Night
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
              event.eventType === 'date-night' ? "Date Night at Italian Restaurant" :
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
                const newDate = new Date(e.target.value);
                if (isNaN(newDate.getTime())) {
                  return;
                }
                
                const date = new Date(event.dateTime || new Date());
                date.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
                
                let endDate = event.endDateTime ? new Date(event.endDateTime) : new Date(date);
                endDate.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
                
                setEvent(prev => ({ 
                  ...prev, 
                  dateTime: date.toISOString(),
                  endDateTime: endDate.toISOString(),
                  date: date.toISOString(),
                  
                  dateObj: date,
                  dateEndObj: endDate,
                  
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
  
  {/* Container for Places API with improved styling */}
  <div className="relative">
    <div 
      id="places-container" 
      className="w-full border rounded-md overflow-hidden"
    ></div>
    
    {/* Map pin icon to improve UI (positioned absolutely) */}
    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
      <MapPin size={16} />
    </div>
  </div>
  
  {/* Manual fallback input */}
  {!placesInitialized && (
    <div className="flex items-center border rounded-md overflow-hidden mt-2">
      <div className="p-2 text-gray-400">
        <MapPin size={16} />
      </div>
      <input
        type="text"
        id="location-input"
        value={event.location || ''}
        onChange={(e) => handleManualLocationInput(e.target.value)}
        className="w-full p-2 text-sm border-0 focus:ring-0"
        placeholder="Where is this event happening?"
      />
    </div>
  )}
  
  {/* Current location value display */}
  {event.location && (
    <div className="text-xs text-blue-600 mt-1 pl-2">
      Current location: {event.location}
    </div>
  )}
</div>
        
        {/* Event Attendees Section */}
        {(event.category === 'meeting' || event.eventType === 'meeting' || event.category === 'general') ? (
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Event Attendees
            </label>
            <div className="p-3 bg-blue-50 rounded-md">
              <div className="flex flex-wrap gap-2 mb-2">
                {familyMembers.map(member => {
                  const attendees = event.attendees || familyMembers.map(m => ({
                    id: m.id, 
                    name: m.name,
                    role: m.role
                  }));
                  
                  const isSelected = attendees.some(a => a.id === member.id);
                  
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        setEvent(prev => {
                          const currentAttendees = prev.attendees || familyMembers.map(m => ({
                            id: m.id, 
                            name: m.name,
                            role: m.role
                          }));
                          
                          let newAttendees;
                          
                          if (currentAttendees.some(a => a.id === member.id)) {
                            newAttendees = currentAttendees.filter(a => a.id !== member.id);
                          } else {
                            newAttendees = [...currentAttendees, {
                              id: member.id,
                              name: member.name,
                              role: member.role
                            }];
                          }
                          
                          return { ...prev, attendees: newAttendees };
                        });
                      }}
                      className={`flex items-center px-3 py-1 rounded-full text-sm ${
                        isSelected
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <UserAvatar user={member} size={20} className="mr-1" />
                      {member.name}
                      {isSelected && (
                        <Check size={12} className="ml-1" />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-blue-700">
                {event.category === 'meeting' ? 
                  "Family meetings include all family members by default. Click to toggle attendance." : 
                  "All family members are included by default. Click to toggle attendance."}
              </p>
            </div>
          </div>
        ) : event.eventType === 'date-night' ? (
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Event Attendees
            </label>
            <div className="p-3 bg-pink-50 rounded-md">
              <div className="flex flex-wrap gap-2 mb-2">
                {/* Show parents first, always selected for date nights */}
                {parents.map(parent => (
                  <div key={parent.id} className="flex items-center px-3 py-1 rounded-full text-sm bg-pink-100 text-pink-800 border border-pink-200">
                    <UserAvatar user={parent} size={20} className="mr-1" />
                    {parent.name}
                    <Check size={12} className="ml-1" />
                  </div>
                ))}
                
                {/* Allow adding children optionally */}
                {children.map(child => {
                  const attendees = event.attendees || [];
                  const isSelected = attendees.some(a => a.id === child.id);
                  
                  return (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => {
                        setEvent(prev => {
                          let currentAttendees = prev.attendees || [];
                          if (currentAttendees.length === 0) {
                            parents.forEach(parent => {
                              currentAttendees.push({
                                id: parent.id,
                                name: parent.name,
                                role: parent.role
                              });
                            });
                          }
                          
                          let newAttendees;
                          
                          if (currentAttendees.some(a => a.id === child.id)) {
                            newAttendees = currentAttendees.filter(a => a.id !== child.id);
                          } else {
                            newAttendees = [
                              ...currentAttendees, 
                              {
                                id: child.id,
                                name: child.name,
                                role: child.role
                              }
                            ];
                          }
                          
                          return { ...prev, attendees: newAttendees };
                        });
                      }}
                      className={`flex items-center px-3 py-1 rounded-full text-sm ${
                        isSelected
                          ? 'bg-pink-100 text-pink-800 border border-pink-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <UserAvatar user={child} size={20} className="mr-1" />
                      {child.name}
                      {isSelected && (
                        <Check size={12} className="ml-1" />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-pink-700">
                Parents are included by default for date nights. You can optionally include children.
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
        
        {/* Document Selection - Hide for date nights */}
        {event.eventType !== 'date-night' && (
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
        )}

        {/* Provider Selection */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            {event.eventType === 'date-night' && event.dateNightDetails?.needsBabysitter ? 
              'Select Babysitter' : 
              'Link to Provider'}
          </label>
          <div className={`p-3 rounded-md ${
            event.eventType === 'date-night' && event.dateNightDetails?.needsBabysitter && (!event.providers || event.providers.length === 0) ?
            'bg-amber-50 border border-amber-200' : 
            'bg-gray-50'
          }`}>
            {event.providers?.length > 0 ? (
              <div className="space-y-2">
                {event.providers.map((provider, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div className="flex items-center">
                      <User size={16} className={`${
                        event.eventType === 'date-night' ? 'text-pink-500' : 'text-purple-500'
                      } mr-2`} />
                      <span className="text-sm">{provider.name}</span>
                      {provider.specialty && (
                        <span className="text-xs text-gray-500 ml-2">({provider.specialty})</span>
                      )}
                    </div>
                    <button
                      onClick={() => setEvent(prev => ({
                        ...prev,
                        providers: prev.providers.filter((_, i) => i !== index),
                        dateNightDetails: prev.eventType === 'date-night' ? {
                          ...prev.dateNightDetails,
                          childcareArranged: prev.providers.length > 1
                        } : prev.dateNightDetails
                      }))}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    if (event.eventType === 'date-night') {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('open-provider-directory', {
                          detail: { 
                            filterType: 'childcare',
                            title: 'Select Babysitter',
                            onSelect: (selectedProvider) => {
                              setEvent(prev => ({
                                ...prev,
                                providers: [...(prev.providers || []), selectedProvider],
                                dateNightDetails: {
                                  ...prev.dateNightDetails,
                                  childcareArranged: true
                                }
                              }));
                              
                              window.dispatchEvent(new CustomEvent('provider-selected', {
                                detail: { provider: selectedProvider }
                              }));
                            }
                          }
                        }));
                      }
                    } else {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('open-provider-directory', {
                          detail: { 
                            title: 'Select Provider',
                            onSelect: (selectedProvider) => {
                              setEvent(prev => ({
                                ...prev,
                                providers: [...(prev.providers || []), selectedProvider]
                              }));
                            }
                          }
                        }));
                      }
                    }
                  }}
                  className={`w-full py-2 text-center text-sm ${
                    event.eventType === 'date-night' ? 
                    'text-pink-600 hover:text-pink-800' : 
                    'text-purple-600 hover:text-purple-800'
                  }`}
                >
                  + Add {event.eventType === 'date-night' ? 'Another Babysitter' : 'More Providers'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {event.eventType === 'date-night' ? (
                  <>
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(new CustomEvent('open-provider-directory', {
                            detail: { 
                              filterType: 'childcare',
                              title: 'Select Babysitter',
                              onSelect: (selectedProvider) => {
                                setEvent(prev => ({
                                  ...prev,
                                  providers: [...(prev.providers || []), selectedProvider],
                                  dateNightDetails: {
                                    ...prev.dateNightDetails,
                                    childcareArranged: true
                                  }
                                }));
                              }
                            }
                          }));
                        }
                      }}
                      className="w-full p-3 border border-amber-300 bg-amber-50 rounded-md flex items-center justify-center"
                    >
                      <User size={20} className="text-pink-500 mr-2" />
                      <span className="text-sm text-amber-700 font-medium">
                        Select Babysitter
                      </span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setEvent(prev => ({
                          ...prev,
                          dateNightDetails: {
                            ...prev.dateNightDetails,
                            needsBabysitter: false,
                            childcareArranged: true
                          }
                        }));
                      }}
                      className="w-full py-2 text-center text-sm text-gray-600 hover:text-gray-800"
                    >
                      No Babysitter Needed
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('open-provider-directory', {
                          detail: { 
                            title: 'Select Provider',
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
                    <span className="text-sm text-gray-600">
                      Select Provider
                    </span>
                  </button>
                )}
              </div>
            )}
            
            {/* Helper text for date nights */}
            {event.eventType === 'date-night' && event.dateNightDetails?.needsBabysitter && 
             (!event.providers || event.providers.length === 0) && (
              <p className="text-xs mt-2 text-amber-700">
                Don't forget to select a babysitter for your date night!
              </p>
            )}
          </div>
        </div>
        
        {/* Event-specific fields */}
        {renderEventSpecificFields()}
        
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
        
        {/* Reminders */}
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
                  if (onSave) {
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