// src/hooks/useEvent.js
import { useState, useEffect, useCallback } from 'react';
import eventStore from '../services/EventStore';
import { useAuth } from '../contexts/AuthContext';

export function useEvent(eventId) {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!eventId || !currentUser) return;

    let isMounted = true;
    setLoading(true);

    const loadEvent = async () => {
      try {
        const eventData = await eventStore.getEventById(eventId);
        if (isMounted) {
          setEvent(eventData);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadEvent();

    // Subscribe to changes
    const unsubscribe = eventStore.subscribe((action, updatedEvent) => {
      if ((updatedEvent.id === eventId ||
           updatedEvent.firestoreId === eventId ||
           updatedEvent.universalId === eventId)) {
        if (action === 'update' || action === 'add') {
          setEvent(updatedEvent);
        } else if (action === 'delete') {
          setEvent(null);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [eventId, currentUser]);

  // Update the event
  const updateEvent = useCallback(async (updateData) => {
    if (!event || !event.firestoreId) return { success: false, error: 'No event to update' };
    return await eventStore.updateEvent(event.firestoreId, updateData, currentUser?.uid);
  }, [event, currentUser]);

  // Delete the event
  const deleteEvent = useCallback(async () => {
    if (!event || !event.firestoreId) return { success: false, error: 'No event to delete' };
    return await eventStore.deleteEvent(event.firestoreId, currentUser?.uid);
  }, [event, currentUser]);

  return { event, loading, error, updateEvent, deleteEvent };
}

export function useEvents(options = {}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  const {
    startDate = null,
    endDate = null,
    familyId = null,
    cycleNumber = null
  } = options;

  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;
    setLoading(true);

    const loadEvents = async () => {
      try {
        let eventData;
        
        if (cycleNumber && familyId) {
          // Get events for a specific cycle
          eventData = await eventStore.getEventsForCycle(familyId, cycleNumber);
        } else {
          // Get all events for user
          eventData = await eventStore.getEventsForUser(currentUser.uid, startDate, endDate);
        }
        
        if (isMounted) {
          setEvents(eventData);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadEvents();

    // Subscribe to changes
    const unsubscribe = eventStore.subscribe((action, updatedEvent) => {
      if (action === 'add') {
        setEvents(prev => [...prev, updatedEvent]);
      } else if (action === 'update') {
        setEvents(prev => prev.map(event => 
          (event.id === updatedEvent.id || 
           event.firestoreId === updatedEvent.firestoreId || 
           event.universalId === updatedEvent.universalId) 
            ? updatedEvent : event
        ));
      } else if (action === 'delete') {
        setEvents(prev => prev.filter(event => 
          event.id !== updatedEvent.id && 
          event.firestoreId !== updatedEvent.firestoreId && 
          event.universalId !== updatedEvent.universalId
        ));
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [currentUser, startDate, endDate, familyId, cycleNumber]);

  // Add a new event
  const addEvent = useCallback(async (eventData) => {
    if (!currentUser) return { success: false, error: 'User not authenticated' };
    return await eventStore.addEvent(eventData, currentUser.uid, familyId);
  }, [currentUser, familyId]);

  // Update an event
  const updateEvent = useCallback(async (eventId, updateData) => {
    if (!currentUser) return { success: false, error: 'User not authenticated' };
    return await eventStore.updateEvent(eventId, updateData, currentUser.uid);
  }, [currentUser]);

  // Delete an event
  const deleteEvent = useCallback(async (eventId) => {
    if (!currentUser) return { success: false, error: 'User not authenticated' };
    return await eventStore.deleteEvent(eventId, currentUser.uid);
  }, [currentUser]);

  // Refresh events
  const refreshEvents = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    const refreshedEvents = await eventStore.refreshEvents(currentUser.uid);
    setEvents(refreshedEvents);
    setLoading(false);
  }, [currentUser]);

  return {
    events,
    loading,
    error,
    addEvent,
    updateEvent,
    deleteEvent,
    refreshEvents
  };
}

// Special hook for cycle due date events
export function useCycleDueDate(familyId, cycleNumber) {
  const [dueEvent, setDueEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!familyId || !cycleNumber || !currentUser) return;

    let isMounted = true;
    setLoading(true);

    const loadDueDate = async () => {
      try {
        const event = await eventStore.getCycleDueDateEvent(familyId, cycleNumber);
        if (isMounted) {
          setDueEvent(event);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDueDate();

    // Subscribe to changes
    const unsubscribe = eventStore.subscribe((action, updatedEvent) => {
      if (action === 'delete' && dueEvent &&
          (updatedEvent.id === dueEvent.id ||
           updatedEvent.firestoreId === dueEvent.firestoreId ||
           updatedEvent.universalId === dueEvent.universalId)) {
        setDueEvent(null);
      } else {
        // If an event changes that could be our due date, reload
        loadDueDate();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [familyId, cycleNumber, currentUser, dueEvent]);

  // Update the due date event
  const updateDueDate = useCallback(async (newDate) => {
    if (!currentUser) return { success: false, error: 'User not authenticated' };
    
    try {
      if (dueEvent) {
        // Update existing event
        return await eventStore.updateEvent(dueEvent.firestoreId, {
          start: {
            dateTime: newDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: new Date(newDate.getTime() + 60 * 60 * 1000).toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          date: newDate.toISOString(),
          dateTime: newDate.toISOString(),
          dateObj: newDate
        }, currentUser.uid);
      } else {
        // Create new due date event
        return await eventStore.addEvent({
          title: `Cycle ${cycleNumber} Due Date`,
          description: `Family meeting for Cycle ${cycleNumber} to discuss survey results and set goals.`,
          category: 'cycle-due-date',
          eventType: 'cycle-due-date',
          cycleNumber: cycleNumber,
          dateTime: newDate.toISOString(),
          universalId: `cycle-due-date-${familyId}-${cycleNumber}`
        }, currentUser.uid, familyId);
      }
    } catch (error) {
      console.error("Error updating due date:", error);
      return { success: false, error: error.message };
    }
  }, [dueEvent, cycleNumber, familyId, currentUser]);

  return {
    dueEvent,
    dueDate: dueEvent ? new Date(dueEvent.dateTime) : null,
    loading,
    error,
    updateDueDate
  };
}