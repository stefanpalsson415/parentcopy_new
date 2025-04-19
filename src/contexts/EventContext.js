// src/contexts/EventContext.js
import React, { createContext, useContext } from 'react';
import { useEvents as useEventsHook } from '../hooks/useEvent';

// Create context
const EventContext = createContext();

// Custom hook to use the context
export function useEvents() {
  return useContext(EventContext);
}

// Provider component that makes Event data available
export function EventProvider({ children }) {
  // Use our new hook directly
  const eventHook = useEventsHook();

  return (
    <EventContext.Provider value={eventHook}>
      {children}
    </EventContext.Provider>
  );
}