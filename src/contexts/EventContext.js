// src/contexts/EventContext.js
import React, { createContext, useContext } from 'react';
import { useEvents as useEventsHook } from '../hooks/useEvent';

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
 * 
 * This is a thin wrapper around the useEvents hook from useEvent.js
 * which connects to the central EventStore service
 */
export function EventProvider({ children }) {
  // Use the hook directly - all state management and event operations
  // are handled by the useEvents hook which connects to EventStore
  const eventContext = useEventsHook();
  
  return (
    <EventContext.Provider value={eventContext}>
      {children}
    </EventContext.Provider>
  );
}