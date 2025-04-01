// src/components/calendar/GoogleCalendarEvents.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import CalendarService from '../../services/CalendarService';

const GoogleCalendarEvents = ({ selectedDate }) => {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Check if user is authorized and calendar is connected
    const checkAuthStatus = async () => {
      if (!currentUser) return;
      
      try {
        // Initialize Google Calendar API first
        await CalendarService.initializeGoogleCalendar();
        
        // Check if the user is signed in
        const isSignedIn = CalendarService.isSignedInToGoogle(currentUser.uid);
        setAuthorized(isSignedIn);
      } catch (err) {
        console.warn("Error checking Google Calendar auth status:", err);
        setAuthorized(false);
      }
    };
    
    checkAuthStatus();
  }, [currentUser]);

  useEffect(() => {
    // Fetch events when date changes if authorized
    const fetchEvents = async () => {
      if (!currentUser || !authorized || !selectedDate) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Create start and end date (full day)
        const startDate = new Date(selectedDate);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);
        
        // Get events for the selected date
        const calendarEvents = await CalendarService.getEventsFromCalendar(
          currentUser.uid,
          startDate,
          endDate
        );
        
        setEvents(calendarEvents);
      } catch (err) {
        console.error("Error fetching calendar events:", err);
        setError("Could not load events");
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, [currentUser, selectedDate, authorized]);

  // If not authorized, show connect button
  if (!authorized) {
    return (
      <div className="text-center p-2">
        <p className="text-sm text-gray-500 mb-2 font-roboto">Connect your Google Calendar to see events</p>
        <button
          onClick={async () => {
            try {
              if (!currentUser) return;
              
              await CalendarService.signInToGoogle(currentUser.uid);
              setAuthorized(true);
            } catch (err) {
              console.error("Error connecting to Google Calendar:", err);
              setError("Could not connect to Google Calendar");
            }
          }}
          className="px-3 py-1 bg-black text-white text-sm rounded-md font-roboto"
        >
          Connect Calendar
        </button>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="text-center py-2">
        <div className="w-5 h-5 border-2 border-t-0 border-blue-500 rounded-full animate-spin mx-auto"></div>
        <p className="text-sm text-gray-500 mt-1 font-roboto">Loading events...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 p-2 rounded-md text-sm text-red-600 font-roboto">
        <p>Could not load events: {error}</p>
        <button
          onClick={() => setError(null)}
          className="underline text-xs mt-1"
        >
          Try again
        </button>
      </div>
    );
  }

  // No events
  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-500 p-2 font-roboto">
        No events scheduled for this date
      </p>
    );
  }

  // Display events
  return (
    <div className="space-y-2">
      {events.map((event) => (
        <div key={event.id} className="p-2 border rounded-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium text-sm font-roboto">{event.summary}</p>
              <p className="text-xs text-gray-500 font-roboto">
                {new Date(event.start.dateTime || event.start.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {' - '}
                {new Date(event.end.dateTime || event.end.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {event.htmlLink && (
              <a
                href={event.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 text-xs hover:underline font-roboto"
              >
                View
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default GoogleCalendarEvents;