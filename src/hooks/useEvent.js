// src/hooks/useEvent.js
import { useState, useEffect, useCallback } from 'react';
import eventStore from '../services/EventStore';
import { useAuth } from '../contexts/AuthContext';

export function useEvents(options = {}) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { currentUser } = useAuth();
  
    const {
      startDate = null,
      endDate = null,
      familyId = null,
      cycleNumber = null,
      filterBy = null, // New option to filter by different criteria
      childId = null,  // New option to filter by child
      category = null  // New option to filter by category
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
          
          // Apply additional filters if specified
          if (eventData.length > 0) {
            if (childId) {
              eventData = eventData.filter(event => 
                event.childId === childId || 
                (event.attendees && event.attendees.some(a => a.id === childId))
              );
            }
            
            if (category) {
              eventData = eventData.filter(event => 
                event.category === category || event.eventType === category
              );
            }
            
            // Custom filter function
            if (filterBy && typeof filterBy === 'function') {
              eventData = eventData.filter(filterBy);
            }
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
          // Apply filters to new events
          let shouldAdd = true;
          
          if (childId && 
              updatedEvent.childId !== childId && 
              (!updatedEvent.attendees || !updatedEvent.attendees.some(a => a.id === childId))) {
            shouldAdd = false;
          }
          
          if (shouldAdd && category && 
              updatedEvent.category !== category && 
              updatedEvent.eventType !== category) {
            shouldAdd = false;
          }
          
          if (shouldAdd && filterBy && typeof filterBy === 'function' && !filterBy(updatedEvent)) {
            shouldAdd = false;
          }
          
          if (shouldAdd) {
            setEvents(prev => [...prev, updatedEvent]);
          }
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
  
      // Also listen for DOM events (for backward compatibility)
      const handleCalendarRefresh = () => {
        if (isMounted) {
          loadEvents();
        }
      };
      
      if (typeof window !== 'undefined') {
        window.addEventListener('force-calendar-refresh', handleCalendarRefresh);
      }
  
      return () => {
        isMounted = false;
        unsubscribe();
        if (typeof window !== 'undefined') {
          window.removeEventListener('force-calendar-refresh', handleCalendarRefresh);
        }
      };
    }, [currentUser, startDate, endDate, familyId, cycleNumber, childId, category, filterBy]);
  
    // Add a new event with enhanced handling for docs and providers
    const addEvent = useCallback(async (eventData) => {
      if (!currentUser) return { success: false, error: 'User not authenticated' };
      
      try {
        // Import UnifiedEventService dynamically to avoid circular dependencies
        const UnifiedEventService = (await import('../services/UnifiedEventService')).default;
        
        // Verify UnifiedEventService exists
        if (!UnifiedEventService) {
          console.error("Failed to import UnifiedEventService, falling back to EventStore");
          return await eventStore.addEvent(eventData, currentUser.uid, familyId);
        }
        
        // Use the unified service with the 'context' entry point source
        return await UnifiedEventService.addEvent(
          eventData, 
          currentUser.uid, 
          familyId,
          { source: 'react-context' }
        );
      } catch (error) {
        console.error("Error in addEvent:", error);
        // Fallback to original EventStore as a last resort
        return await eventStore.addEvent(eventData, currentUser.uid, familyId);
      }
    }, [currentUser, familyId]);
  
    // Update an event with enhanced handling
    const updateEvent = useCallback(async (eventId, updateData) => {
      if (!currentUser) return { success: false, error: 'User not authenticated' };
      
      try {
        // Import UnifiedEventService dynamically to avoid circular dependencies
        const UnifiedEventService = (await import('../services/UnifiedEventService')).default;
        
        // Verify UnifiedEventService exists
        if (!UnifiedEventService) {
          console.error("Failed to import UnifiedEventService, falling back to EventStore");
          return await eventStore.updateEvent(eventId, updateData, currentUser.uid);
        }
        
        // Use unified service for event updates
        return await UnifiedEventService.updateEvent(eventId, updateData, currentUser.uid);
      } catch (error) {
        console.error("Error in updateEvent:", error);
        // Fallback to original EventStore as a last resort
        return await eventStore.updateEvent(eventId, updateData, currentUser.uid);
      }
    }, [currentUser]);
  
    // Delete an event
    const deleteEvent = useCallback(async (eventId) => {
      if (!currentUser) return { success: false, error: 'User not authenticated' };
      
      try {
        // Import UnifiedEventService dynamically to avoid circular dependencies
        const UnifiedEventService = (await import('../services/UnifiedEventService')).default;
        
        // Verify UnifiedEventService exists
        if (!UnifiedEventService) {
          console.error("Failed to import UnifiedEventService, falling back to EventStore");
          return await eventStore.deleteEvent(eventId, currentUser.uid);
        }
        
        // Use unified service for event deletion
        return await UnifiedEventService.deleteEvent(eventId, currentUser.uid);
      } catch (error) {
        console.error("Error in deleteEvent:", error);
        // Fallback to original EventStore as a last resort
        return await eventStore.deleteEvent(eventId, currentUser.uid);
      }
    }, [currentUser]);
  
    // Enhanced refreshEvents function with better error handling
    const refreshEvents = useCallback(async () => {
      if (!currentUser) return;
      
      console.log("Explicit refresh of events triggered");
      setLoading(true);
      
      try {
        // First try to clear any caches
        let cacheCleared = false;
        
        try {
          // Try EventStore's clearCache first (which we know exists)
          if (eventStore && typeof eventStore.clearCache === 'function') {
            eventStore.clearCache();
            cacheCleared = true;
            console.log("Cleared EventStore cache");
          }
        } catch (cacheError) {
          console.warn("Error clearing EventStore cache:", cacheError);
        }
        
        try {
          // Then try to import UnifiedEventService and clear its cache
          const UnifiedEventService = (await import('../services/UnifiedEventService')).default;
          
          if (UnifiedEventService) {
            // Safely try to access the clearCache method
            if (typeof UnifiedEventService.clearCache === 'function') {
              UnifiedEventService.clearCache();
              cacheCleared = true;
              console.log("Cleared UnifiedEventService cache");
            } else {
              console.log("UnifiedEventService.clearCache is not a function");
            }
            
            // Now fetch refreshed events from UnifiedEventService
            const refreshedEvents = await UnifiedEventService.refreshEvents(
              currentUser.uid, 
              familyId, 
              cycleNumber
            );
            
            console.log(`Refreshed ${refreshedEvents.length} events from database`);
            
            // Apply filters to refreshed events
            let filteredEvents = refreshedEvents;
            
            if (childId) {
              filteredEvents = filteredEvents.filter(event => 
                event.childId === childId || 
                (event.attendees && event.attendees.some(a => a.id === childId))
              );
            }
            
            if (category) {
              filteredEvents = filteredEvents.filter(event => 
                event.category === category || event.eventType === category
              );
            }
            
            if (filterBy && typeof filterBy === 'function') {
              filteredEvents = filteredEvents.filter(filterBy);
            }
            
            // Completely reset the state to force rerender
            setEvents([]);
            
            // Small delay to ensure DOM updates before adding new events
            setTimeout(() => {
              setEvents(filteredEvents);
            }, 50);
            
            return;
          }
        } catch (unifiedError) {
          console.warn("Error using UnifiedEventService for refresh:", unifiedError);
        }
        
        // If we get here, the UnifiedEventService method failed, so fall back to EventStore
        if (!cacheCleared) {
          console.log("Falling back to EventStore refresh");
          const refreshedEvents = await eventStore.refreshEvents(currentUser.uid, familyId);
          
          // Apply filters
          let filteredEvents = refreshedEvents;
          
          if (childId) {
            filteredEvents = filteredEvents.filter(event => 
              event.childId === childId || 
              (event.attendees && event.attendees.some(a => a.id === childId))
            );
          }
          
          if (category) {
            filteredEvents = filteredEvents.filter(event => 
              event.category === category || event.eventType === category
            );
          }
          
          if (filterBy && typeof filterBy === 'function') {
            filteredEvents = filteredEvents.filter(filterBy);
          }
          
          // Completely reset the state to force rerender
          setEvents([]);
          
          // Small delay to ensure DOM updates before adding new events
          setTimeout(() => {
            setEvents(filteredEvents);
          }, 50);
        }
      } catch (error) {
        console.error("Error refreshing events:", error);
      } finally {
        setLoading(false);
      }
    }, [currentUser, childId, category, filterBy, familyId, cycleNumber]);
  
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