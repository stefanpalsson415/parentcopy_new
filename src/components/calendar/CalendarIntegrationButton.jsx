// src/components/calendar/CalendarIntegrationButton.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, Check, AlertCircle, Clock, Download, Plus } from 'lucide-react';
import CalendarService from '../../services/CalendarService';
import { useAuth } from '../../contexts/AuthContext';

const CalendarIntegrationButton = ({ item, itemType, customDate }) => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [error, setError] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [calendarSettings, setCalendarSettings] = useState(null);
  
  // Check if user has calendar settings
  useEffect(() => {
    const loadSettings = async () => {
      if (currentUser && currentUser.uid) {
        try {
          const settings = await CalendarService.loadUserCalendarSettings(currentUser.uid);
          setCalendarSettings(settings);
        } catch (error) {
          console.error("Error loading calendar settings:", error);
          // Still allow button to function with default settings
        }
      }
    };
    
    loadSettings();
  }, [currentUser]);
  
  // Check if this event was already added
  useEffect(() => {
    if (!item || !item.id) return;
    
    try {
      const addedEvents = JSON.parse(localStorage.getItem('addedCalendarEvents') || '{}');
      const eventKey = `${itemType}-${item.id}`;
      if (addedEvents[eventKey]) {
        setIsAdded(true);
        
        // Auto-reset after 2 hours to allow re-adding if needed
        const addedTime = new Date(addedEvents[eventKey].addedAt).getTime();
        if (Date.now() - addedTime > 7200000) { // 2 hours
          delete addedEvents[eventKey];
          localStorage.setItem('addedCalendarEvents', JSON.stringify(addedEvents));
          setIsAdded(false);
        }
      }
    } catch (error) {
      console.error("Error checking added events:", error);
    }
  }, [item, itemType]);
  
  const handleAddToCalendar = async () => {
    // If there's no default calendar type set, show calendar options instead
    if (!calendarSettings?.defaultCalendarType) {
      setShowOptions(true);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    // Don't reset isAdded yet to avoid flickering
    
    try {
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
      
      console.log("Adding event to calendar:", {
        type: calendarSettings?.defaultCalendarType,
        eventSummary: event.summary,
        date: event.start.dateTime
      });
      
      // Add the event to the calendar
      const result = await CalendarService.addEvent(event, calendarSettings?.defaultCalendarType);
      
      if (result.success) {
        // Store the event ID in localStorage to remember it was added
        if (result.eventId) {
          const addedEvents = JSON.parse(localStorage.getItem('addedCalendarEvents') || '{}');
          const eventKey = `${itemType}-${item.id}`;
          addedEvents[eventKey] = {
            eventId: result.eventId,
            addedAt: new Date().toISOString(),
            summary: event.summary,
            calendarType: calendarSettings?.defaultCalendarType
          };
          localStorage.setItem('addedCalendarEvents', JSON.stringify(addedEvents));
        }
        
        // Mark as added
        setIsAdded(true);
        
        // Reset after 5 seconds
        setTimeout(() => {
          setIsAdded(false);
        }, 5000);
      } else {
        // If there's an error, show it
        throw new Error(result.error || "Failed to add to calendar");
      }
    } catch (error) {
      console.error("Error adding to calendar:", error);
      setError(error.message || "Failed to add to calendar");
      setIsAdded(false); // Ensure failed state is properly reflected
    } finally {
      setIsLoading(false);
      setShowOptions(false);
    }
  };
  
  // Handle adding to specific calendar type
  const handleAddToSpecificCalendar = async (calendarType) => {
    setIsLoading(true);
    setError(null);
    // Don't reset isAdded yet to avoid flickering
    
    try {
      console.log(`Adding to specific calendar type: ${calendarType}`);
      
      // Create the appropriate event type
      let event;
      
      if (itemType === 'task') {
        event = CalendarService.createEventFromTask(item);
        
        // Use custom date if provided
        if (customDate) {
          const customDateObj = typeof customDate === 'string' ? new Date(customDate) : customDate;
          event.start.dateTime = customDateObj.toISOString();
          
          const endTime = new Date(customDateObj);
          endTime.setHours(endTime.getHours() + 1);
          event.end.dateTime = endTime.toISOString();
        }
      } else if (itemType === 'meeting') {
        event = CalendarService.createFamilyMeetingEvent(
          item.weekNumber, 
          typeof customDate === 'string' ? new Date(customDate) : customDate
        );
      } else if (itemType === 'reminder') {
        event = CalendarService.createTaskReminderEvent(
          item, 
          typeof customDate === 'string' ? new Date(customDate) : customDate
        );
      } else {
        throw new Error("Unknown item type");
      }
      
      console.log(`Adding event to ${calendarType} calendar:`, {
        summary: event.summary,
        date: event.start.dateTime
      });
      
      // Add to the specified calendar
      const result = await CalendarService.addEvent(event, calendarType);
      
      if (result.success) {
        // Store the event in localStorage
        if (result.eventId) {
          const addedEvents = JSON.parse(localStorage.getItem('addedCalendarEvents') || '{}');
          const eventKey = `${itemType}-${item.id}`;
          addedEvents[eventKey] = {
            eventId: result.eventId,
            addedAt: new Date().toISOString(),
            summary: event.summary,
            calendarType
          };
          localStorage.setItem('addedCalendarEvents', JSON.stringify(addedEvents));
        }
        
        // Mark as added
        setIsAdded(true);
        
        // Reset after 3 seconds
        setTimeout(() => {
          setIsAdded(false);
        }, 3000);
        
        // Save this as the default calendar type for future adds
        if (currentUser && currentUser.uid) {
          try {
            const settings = await CalendarService.loadUserCalendarSettings(currentUser.uid) || {};
            await CalendarService.saveUserCalendarSettings(currentUser.uid, {
              ...settings,
              defaultCalendarType: calendarType
            });
            
            // Update local state
            setCalendarSettings({
              ...settings,
              defaultCalendarType: calendarType
            });
          } catch (settingsError) {
            console.error("Error saving calendar preference:", settingsError);
            // Non-critical error, don't show to user
          }
        }
      } else {
        throw new Error(result.error || "Failed to add to calendar");
      }
    } catch (error) {
      console.error(`Error adding to ${calendarType} calendar:`, error);
      setError(error.message || `Failed to add to ${calendarType} calendar`);
      setIsAdded(false);
    } finally {
      setIsLoading(false);
      setShowOptions(false);
    }
  };
  
  // If no calendar settings yet
  if (!calendarSettings && !isLoading && !error && !isAdded) {
    return (
      <button
        onClick={() => window.location.href = '/settings?tab=calendar'}
        className="flex items-center text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 font-roboto"
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
        } font-roboto`}
      >
        {isLoading ? (
          <div className="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin mr-1"></div>
        ) : isAdded ? (
          <Check size={12} className="mr-1" />
        ) : error ? (
          <AlertCircle size={12} className="mr-1" />
        ) : (
          <Plus size={12} className="mr-1" />
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
        <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 border font-roboto">
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
              className={`flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${
                !CalendarService.appleCalendarAvailable ? 'opacity-50 cursor-not-allowed' : ''
              }`}
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