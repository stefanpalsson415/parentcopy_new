// src/hooks/useEvent.js
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import eventStore from '../services/EventStore';

// Keep any existing hooks like useCycleDueDate
export function useCycleDueDate(familyId, cycleNumber) {
  // Keep existing implementation
}

// Add the missing useEvents hook
export function useEvents() {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Load events when component mounts or refresh is triggered
  useEffect(() => {
    if (!currentUser) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const loadEvents = async () => {
      setLoading(true);
      try {
        const results = await eventStore.getEventsForUser(
          currentUser.uid, 
          // Get 90 days in past and 180 days in future
          new Date(new Date().setDate(new Date().getDate() - 90)),
          new Date(new Date().setDate(new Date().getDate() + 180))
        );
        setEvents(results);
      } catch (error) {
        console.error("Error loading events:", error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
    
    // Subscribe to event store updates
    const unsubscribe = eventStore.subscribe((action, updatedEvent) => {
      if (action === 'add') {
        setEvents(prev => [...prev, updatedEvent]);
      } else if (action === 'update') {
        setEvents(prev => prev.map(event => 
          event.id === updatedEvent.id ? updatedEvent : event
        ));
      } else if (action === 'delete') {
        setEvents(prev => prev.filter(event => event.id !== updatedEvent.id));
      }
    });

    return () => unsubscribe();
  }, [currentUser, lastRefresh]);

  // Function to add an event
  const addEvent = useCallback(async (eventData) => {
    if (!currentUser) return { success: false, error: "Not authenticated" };
    return await eventStore.addEvent(eventData, currentUser.uid, eventData.familyId);
  }, [currentUser]);

  // Function to update an event
  const updateEvent = useCallback(async (eventId, updateData) => {
    if (!currentUser) return { success: false, error: "Not authenticated" };
    return await eventStore.updateEvent(eventId, updateData, currentUser.uid);
  }, [currentUser]);

  // Function to delete an event
  const deleteEvent = useCallback(async (eventId) => {
    if (!currentUser) return { success: false, error: "Not authenticated" };
    return await eventStore.deleteEvent(eventId, currentUser.uid);
  }, [currentUser]);

  // Function to refresh events
  const refreshEvents = useCallback(() => {
    setLastRefresh(Date.now());
  }, []);

  // Return the event context
  return {
    events,
    loading,
    addEvent,
    updateEvent,
    deleteEvent,
    refreshEvents
  };
}