// NEW CODE
// src/components/calendar/AllieCalendarEvents.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useEvents } from '../../contexts/EventContext';

const AllieCalendarEvents = ({ selectedDate }) => {
  const { currentUser } = useAuth();
  const { events: allEvents, loading: eventsLoading } = useEvents();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Filter events for the selected date
    const filterEvents = () => {
      if (!selectedDate) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Create start and end date (full day)
        const startDate = new Date(selectedDate);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);
        
        // Filter events from context for the selected date
        const filteredEvents = allEvents.filter(event => {
          const eventDate = new Date(event.start.dateTime || event.start.date);
          return eventDate >= startDate && eventDate <= endDate;
        });
        
        setEvents(filteredEvents);
      } catch (err) {
        console.error("Error filtering calendar events:", err);
        setError("Could not load events");
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    
    filterEvents();
  }, [selectedDate, allEvents]);

  // Loading state
  if (loading || eventsLoading) {
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
              <p className="font-medium text-sm font-roboto">{event.summary || event.title}</p>
              <p className="text-xs text-gray-500 font-roboto">
                {new Date(event.start.dateTime || event.start.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {' - '}
                {new Date(event.end.dateTime || event.end.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AllieCalendarEvents;