import React, { useState, useEffect } from 'react';
import { Calendar, Check, AlertCircle, Clock, Download } from 'lucide-react';
import CalendarService from '../../services/CalendarService';
import { useAuth } from '../../contexts/AuthContext';
import { useFamily } from '../../contexts/FamilyContext';


// New code
const CalendarIntegrationButton = ({ item, itemType, customDate }) => {
  const { currentUser } = useAuth();
  const { selectedUser } = useFamily();
  const [isLoading, setIsLoading] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [error, setError] = useState(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [calendarSettings, setCalendarSettings] = useState(null);
  
  // Check if user has calendar settings
  useEffect(() => {
    const loadSettings = async () => {
      if (currentUser) {
        try {
          const settings = await CalendarService.loadUserCalendarSettings(currentUser.uid);
          setCalendarSettings(settings);
          
          // Check if signed in to Google (if that's the active type)
          if (settings?.defaultCalendarType === 'google') {
            console.log("Initializing Google Calendar...");
            await CalendarService.initializeGoogleCalendar();
            
            // Test Google sign-in state
            const signedIn = CalendarService.isSignedInToGoogle();
            console.log("Google Calendar sign-in state:", signedIn);
            setIsSignedIn(signedIn);
            
            // If not signed in, we'll handle this when the user clicks the button
            if (!signedIn) {
              console.log("Not signed in to Google Calendar. Will prompt on button click.");
            }
          }
        } catch (error) {
          console.error("Error loading calendar settings:", error);
          // Still allow the component to render even if there's an error
        }
      }
    };
    
    loadSettings();
  }, [currentUser]);
  
  
  // Add this after other useEffects in CalendarIntegrationButton.jsx
  useEffect(() => {
    // Check if this event was already added
    try {
      const addedEvents = JSON.parse(localStorage.getItem('addedCalendarEvents') || '{}');
      const eventKey = `${itemType}-${item.id}`;
      if (addedEvents[eventKey]) {
        // This event was already added
        setIsAdded(true);
        
        // Reset after 2 seconds to allow re-adding if needed
        setTimeout(() => {
          setIsAdded(false);
        }, 2000);
      }
    } catch (error) {
      console.error("Error checking added events:", error);
    }
  }, [item.id, itemType]);
  
  // Add this function to get user-specific Google token
  const getUserSpecificGoogleToken = () => {
    try {
      // Try to get user-specific token first
      const userToken = localStorage.getItem(`googleToken_${selectedUser?.id}`);
      if (userToken) {
        return JSON.parse(userToken);
      }
      
      // Fall back to general token
      const generalToken = localStorage.getItem('googleAuthToken');
      if (generalToken) {
        return JSON.parse(generalToken);
      }
      
      return null;
    } catch (e) {
      console.error("Error getting user token:", e);
      return null;
    }
  };
  


  // Handle adding to default calendar
  const handleAddToCalendar = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // If there's no default calendar type set, show calendar options instead
      if (!calendarSettings?.defaultCalendarType) {
        setShowOptions(true);
        setIsLoading(false);
        return;
      }
      
      
// Get user-specific Google auth token if available
const userToken = getUserSpecificGoogleToken();
if (userToken && calendarSettings.defaultCalendarType === 'google') {
  console.log("Using user-specific Google token for calendar integration");
}
      
      // Make sure we're signed in to Google if using Google Calendar
      if (calendarSettings.defaultCalendarType === 'google' && !isSignedIn) {
        console.log("Not signed in to Google Calendar, signing in now");
        try {
          await CalendarService.signInToGoogle();
          setIsSignedIn(true);
        } catch (signInError) {
          console.error("Error signing in to Google Calendar:", signInError);
          throw new Error("Could not sign in to Google Calendar. Please try again.");
        }
      }
      
      // Create event based on item type with better date handling
      let event;
      let eventDate = customDate;
      
      // Convert string date to Date object if needed
      if (typeof eventDate === 'string') {
        eventDate = new Date(eventDate);
      } else if (item.date && typeof item.date === 'string') {
        eventDate = new Date(item.date);
      } else if (!eventDate) {
        // Default to tomorrow at 10am if no date provided
        eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + 1);
        eventDate.setHours(10, 0, 0, 0);
      }
      
      if (itemType === 'task') {
        event = CalendarService.createEventFromTask(item);
        
        // Use custom date if provided
        if (eventDate) {
          event.start.dateTime = eventDate.toISOString();
          const endTime = new Date(eventDate);
          endTime.setHours(endTime.getHours() + 1);
          event.end.dateTime = endTime.toISOString();
        }
      } else if (itemType === 'meeting') {
        event = CalendarService.createFamilyMeetingEvent(item.weekNumber, eventDate);
      } else if (itemType === 'reminder') {
        event = CalendarService.createTaskReminderEvent(item, eventDate);
      } else {
        throw new Error("Unknown item type");
      }
      
      // Add some more detailed event properties
      event.description = (event.description || '') + 
        `\n\nAdded from Allie Family Balance App\n${window.location.origin}`;
      
      // Add calendar alert/reminder if not already set
      if (!event.reminders) {
        event.reminders = {
          useDefault: false,
          overrides: [
            {'method': 'popup', 'minutes': 60}, // 1 hour before
            {'method': 'email', 'minutes': 1440} // 24 hours before
          ]
        };
      }
        
      // Add to the default calendar
      const result = await CalendarService.addEvent(event);
      console.log("Event added to calendar:", result);
      
      // Store the event ID in localStorage to remember it was added
      if (result && result.eventId) {
        const addedEvents = JSON.parse(localStorage.getItem('addedCalendarEvents') || '{}');
        const eventKey = `${itemType}-${item.id}`;
        addedEvents[eventKey] = {
          eventId: result.eventId,
          addedAt: new Date().toISOString(),
          summary: event.summary,
          isMock: result.isMock
        };
        localStorage.setItem('addedCalendarEvents', JSON.stringify(addedEvents));
      }
      
      // Mark as added
      setIsAdded(true);
      
      // Only reset after longer time for user feedback
      setTimeout(() => {
        // Only reset if the component is still mounted
        setIsAdded(false);
      }, 5000);
    } catch (error) {
      console.error("Error adding to calendar:", error);
      setError(error.message || "Failed to add to calendar");
      
      // Reset error after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    } finally {
      setIsLoading(false);
      setShowOptions(false);
    }
  };
  
  // Handle adding to specific calendar type
  const handleAddToSpecificCalendar = async (calendarType) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Create event based on item type
      let event;
      if (itemType === 'task') {
        event = CalendarService.createEventFromTask(item);
      } else if (itemType === 'meeting') {
        event = CalendarService.createFamilyMeetingEvent(item.weekNumber, customDate || item.date);
      } else if (itemType === 'reminder') {
        event = CalendarService.createTaskReminderEvent(item, customDate);
      } else {
        throw new Error("Unknown item type");
      }
      
      // Add to the specified calendar
      const result = await CalendarService.addEvent(event, calendarType);
      console.log(`Event added to ${calendarType} calendar:`, result);
      
      // Mark as added
      setIsAdded(true);
      
      // Reset after 3 seconds
      setTimeout(() => {
        setIsAdded(false);
      }, 3000);
    } catch (error) {
      console.error(`Error adding to ${calendarType} calendar:`, error);
      setError(error.message || `Failed to add to ${calendarType} calendar`);
      
      // Reset error after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    } finally {
      setIsLoading(false);
      setShowOptions(false);
    }
  };
  
  // No calendar settings yet
  if (!calendarSettings && !isLoading && !error && !isAdded) {
    return (
      <button
        onClick={() => window.location.href = '/settings?tab=calendar'}
        className="flex items-center text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
      >
        <Calendar size={12} className="mr-1" />
        Set Up Calendar
      </button>
    );
  }
  
  return (
    <div className="relative">
      <button
        onClick={() => calendarSettings?.defaultCalendarType ? handleAddToCalendar() : setShowOptions(prev => !prev)}
        disabled={isLoading || isAdded}
        className={`flex items-center text-xs px-2 py-1 rounded ${
          isAdded 
            ? 'bg-green-100 text-green-700'
            : error
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {isLoading ? (
          <div className="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin mr-1"></div>
        ) : isAdded ? (
          <Check size={12} className="mr-1" />
        ) : error ? (
          <AlertCircle size={12} className="mr-1" />
        ) : (
          <Calendar size={12} className="mr-1" />
        )}
        
        {isAdded 
          ? 'Added!' 
          : error
            ? 'Error'
            : calendarSettings?.defaultCalendarType
              ? 'Add to Calendar'
              : 'Add to...'}
      </button>
      
      {/* Dropdown menu for calendar options */}
      {showOptions && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 border">
          <div className="py-1">
            <button
              onClick={() => handleAddToSpecificCalendar('google')}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Calendar size={14} className="mr-2 text-blue-600" />
              Google Calendar
            </button>
            
            <button
              onClick={() => handleAddToSpecificCalendar('apple')}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              disabled={!CalendarService.appleCalendarAvailable}
            >
              <Calendar size={14} className="mr-2 text-gray-600" />
              Apple Calendar
              {!CalendarService.appleCalendarAvailable && (
                <span className="ml-1 text-xs text-gray-500">(Unavailable)</span>
              )}
            </button>
            
            <button
              onClick={() => handleAddToSpecificCalendar('ics')}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Download size={14} className="mr-2 text-green-600" />
              Download ICS File
            </button>
            
            <div className="border-t my-1"></div>
            
            <button
              onClick={() => window.location.href = '/settings?tab=calendar'}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Clock size={14} className="mr-2 text-purple-600" />
              Calendar Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarIntegrationButton;