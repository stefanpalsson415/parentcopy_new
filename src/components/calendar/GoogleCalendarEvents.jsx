// src/components/calendar/GoogleCalendarEvents.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react';
import CalendarService from '../../services/CalendarService';
import { useAuth } from '../../contexts/AuthContext';

// In src/components/calendar/GoogleCalendarEvents.jsx - replace component with:
const GoogleCalendarEvents = ({ selectedDate }) => {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Used to trigger refresh
  
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
        // Use a timeout to prevent hanging indefinitely
        const connectionPromise = CalendarService.initializeGoogleCalendar();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Connection timed out")), 5000)
        );
        
        try {
          // Use Promise.race to implement timeout
          await Promise.race([connectionPromise, timeoutPromise]);
        } catch (timeoutError) {
          console.warn("Google Calendar connection timed out");
          if (isMounted) {
            setCalendarConnected(false);
            setLoading(false);
            return;
          }
        }
        
        // Check if signed in
        const isSignedIn = CalendarService.isSignedInToGoogle();
        if (isMounted) {
          setCalendarConnected(isSignedIn);
        }
        
        if (!isSignedIn) {
          if (isMounted) {
            setLoading(false);
          }
          return;
        }
        
        // Calculate date range for selected date (whole day)
        const startDate = new Date(selectedDate);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);
        
        // Get events for the selected date
        try {
          const eventList = await CalendarService.getEventsFromCalendar(startDate, endDate);
          if (isMounted) {
            setEvents(eventList || []);
          }
        } catch (eventsError) {
          console.error("Error getting events:", eventsError);
          if (isMounted) {
            setEvents([]);
            // Don't set error if this fails - just show no events
          }
        }
      } catch (error) {
        console.error("Error loading Google Calendar events:", error);
        if (isMounted) {
          setError("Couldn't load events. Please try again.");
          setEvents([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadEvents();
    
    return () => {
      isMounted = false;
    };
  }, [selectedDate, currentUser, refreshKey]);
  
 
  
  // Manually refresh events
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };
  
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
        <div className="flex-1">
          <p>{error}</p>
          <button 
            onClick={handleRefresh}
            className="text-xs text-red-800 hover:underline mt-1 flex items-center"
          >
            <RefreshCw size={10} className="mr-1" />
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  if (events.length === 0) {
    return (
      <div className="p-3 bg-gray-50 rounded text-sm text-gray-500 font-roboto flex items-center justify-between">
        <p>No events scheduled for this date</p>
        <button 
          onClick={handleRefresh}
          className="text-xs text-gray-600 hover:text-gray-800"
          title="Refresh events"
        >
          <RefreshCw size={12} />
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-2 font-roboto">
      <div className="flex justify-between items-center mb-1">
        <h5 className="text-xs text-gray-500 font-roboto">{events.length} event{events.length !== 1 ? 's' : ''}</h5>
        <button 
          onClick={handleRefresh}
          className="text-xs text-gray-600 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100"
          title="Refresh events"
        >
          <RefreshCw size={12} />
        </button>
      </div>
      
      {events.map((event, index) => (
        <div key={event.id || index} className="p-2 border rounded-lg flex justify-between items-center">
          <div className="flex-1 min-w-0">
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
              className="text-blue-600 hover:text-blue-800 ml-2 flex-shrink-0"
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