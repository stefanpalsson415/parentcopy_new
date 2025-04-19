// src/contexts/EventContext.js
import React, { createContext, useContext } from 'react';
import { useEvents } from '../hooks/useEvent'; // Changed this line - remove the "as useEventsHook"

// Create the context
const EventContext = createContext();

/**
 * Custom hook to use the event context
 * @returns {Object} Events context with events data and methods
 */
export function useEvents() {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
}

/**
 * Provider component that makes event data available to all child components
 */
export function EventProvider({ children }) {
  // Use the hook from useEvent.js directly
  const eventContext = useEvents(); // Changed this line - use the actual function name
  
  return (
    <EventContext.Provider value={eventContext}>
      {children}
    </EventContext.Provider>
  );
}