// src/components/calendar/GoogleCalendarEvents.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, ExternalLink, AlertCircle } from 'lucide-react';
import CalendarService from '../../services/CalendarService';
import { useAuth } from '../../contexts/AuthContext';

const GoogleCalendarEvents = ({ selectedDate }) => {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [calendarConnected, setCalendarConnected] = useState(false);
  
  useEffect(() => {
    // Only load events if we have a date and user
    if (!selectedDate || !currentUser) {
      setLoading(false);
      return;
    }
    
    let isMounted = true;
    
    const loadEvents = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Check if Google Calendar is connected
        const isConnected = await checkCalendarConnection();
        
        if (!isConnected) {
          setCalendarConnected(false);
          setLoading(false);
          return;
        }
        
        // Calculate date range for selected date (whole day)
        const startDate = new Date(selectedDate);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);
        
        // Get events for the selected date
        const eventList = await CalendarService.getEventsFromCalendar(startDate, endDate);
        if (isMounted) {
          setEvents(eventList || []);
        }
      } catch (error) {
        console.error("Error loading Google Calendar events:", error);
        if (isMounted) {
          setError("Couldn't load events. Please try again.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    // Helper to check if calendar is connected
    const checkCalendarConnection = async () => {
      try {
        await CalendarService.initializeGoogleCalendar();
        const isSignedIn = CalendarService.isSignedInToGoogle();
        if (isMounted) {
          setCalendarConnected(isSignedIn);
        }
        return isSignedIn;
      } catch (error) {
        console.error("Error checking Google Calendar connection:", error);
        return false;
      }
    };
    
    loadEvents();
    
    return () => {
      isMounted = false;
    };
  }, [selectedDate, currentUser]);
  
  // Format event time to a readable format
  const formatEventTime = (dateTimeString) => {
    if (!dateTimeString) return '';
    
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };
  
  if (loading) {
    return (
      <div className="text-center p-3">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-gray-500 mt-1 font-roboto">Loading events...</p>
      </div>
    );
  }
  
  if (!calendarConnected) {
    return (
      <div className="p-3 bg-blue-50 rounded text-sm text-blue-700 font-roboto flex items-start">
        <Calendar size={14} className="mr-2 mt-0.5 flex-shrink-0" />
        <div>
          <p>Connect Google Calendar to see your events here.</p>
          <button 
            onClick={async () => {
              try {
                setLoading(true);
                await CalendarService.signInToGoogle();
                setCalendarConnected(true);
                
                // After successful connection, reload events
                if (selectedDate) {
                  const startDate = new Date(selectedDate);
                  startDate.setHours(0, 0, 0, 0);
                  
                  const endDate = new Date(selectedDate);
                  endDate.setHours(23, 59, 59, 999);
                  
                  const eventList = await CalendarService.getEventsFromCalendar(startDate, endDate);
                  setEvents(eventList || []);
                }
              } catch (error) {
                console.error("Error signing in to Google:", error);
                setError("Couldn't connect to Google Calendar");
              } finally {
                setLoading(false);
              }
            }}
            className="text-blue-600 text-xs hover:underline mt-1 font-roboto"
          >
            Connect Now
          </button>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-3 bg-red-50 rounded text-sm text-red-700 font-roboto flex items-start">
        <AlertCircle size={14} className="mr-2 mt-0.5 flex-shrink-0" />
        <p>{error}</p>
      </div>
    );
  }
  
  if (events.length === 0) {
    return (
      <div className="p-3 bg-gray-50 rounded text-sm text-gray-500 font-roboto">
        <p>No events scheduled for this date</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-2 font-roboto">
      {events.map((event, index) => (
        <div key={event.id || index} className="p-2 border rounded-lg flex justify-between items-center">
          <div>
            <p className="text-sm font-medium truncate">{event.summary}</p>
            <p className="text-xs text-gray-500">
              {formatEventTime(event.start?.dateTime)} - {formatEventTime(event.end?.dateTime)}
            </p>
          </div>
          
          {event.htmlLink && (
            <a 
              href={event.htmlLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      ))}
    </div>
  );
};

export default GoogleCalendarEvents;