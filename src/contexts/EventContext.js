// src/contexts/EventContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useFamily } from './FamilyContext';
import CalendarOperations from '../utils/CalendarOperations';

const EventContext = createContext();

export function useEvents() {
  return useContext(EventContext);
}

export function EventProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const { familyId } = useFamily();

  // Load all events and set up real-time listener
  useEffect(() => {
    if (!currentUser || !familyId) {
      setEvents([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    // Query for all family events
    const eventsQuery = query(
      collection(db, "calendar_events"),
      where("familyId", "==", familyId)
    );
    
    // Set up real-time listener for automatic updates
    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      const eventsList = [];
      snapshot.forEach((doc) => {
        // Standardize all events to consistent format
        const eventData = doc.data();
        eventsList.push(standardizeEvent({
          ...eventData,
          id: doc.id,
          firestoreId: doc.id
        }));
      });
      
      console.log(`EventContext: Loaded ${eventsList.length} events`);
      setEvents(eventsList);
      setLoading(false);
    }, (error) => {
      console.error("Error loading events:", error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [currentUser, familyId]);

  // Standardize event format to ensure consistency
  const standardizeEvent = (event) => {
    // Check if already in standard format
    if (event.standardized) return event;
    
    // Extract date objects properly
    let startDate, endDate;
    
    // Handle all possible date formats
    if (event.start?.dateTime) {
      startDate = new Date(event.start.dateTime);
    } else if (event.dateTime) {
      startDate = new Date(event.dateTime);
    } else if (event.dateObj) {
      startDate = new Date(event.dateObj);
    } else if (event.date) {
      startDate = new Date(event.date);
    } else {
      startDate = new Date();
    }
    
    // End date handling
    if (event.end?.dateTime) {
      endDate = new Date(event.end.dateTime);
    } else if (event.endDateTime) {
      endDate = new Date(event.endDateTime);
    } else if (event.dateEndObj) {
      endDate = new Date(event.dateEndObj);
    } else {
      // Default to 1 hour duration
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    }
    
    // Return standardized event
    return {
      id: event.id || event.firestoreId || `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      firestoreId: event.firestoreId || event.id,
      universalId: event.universalId || event.id,
      title: event.title || event.summary || "Untitled Event",
      summary: event.summary || event.title || "Untitled Event",
      description: event.description || "",
      start: {
        dateTime: startDate.toISOString(),
        timeZone: event.start?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: event.end?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      dateObj: startDate, // For easy access
      dateEndObj: endDate, // For easy access
      location: event.location || "",
      category: event.category || "general",
      eventType: event.eventType || "general",
      childId: event.childId || null,
      childName: event.childName || null,
      attendingParentId: event.attendingParentId || null,
      siblingIds: event.siblingIds || [],
      siblingNames: event.siblingNames || [],
      attendees: event.attendees || [],
      linkedEntity: event.linkedEntity || null,
      extraDetails: event.extraDetails || {},
      userId: event.userId || currentUser?.uid,
      familyId: event.familyId || familyId,
      standardized: true // Mark as standardized
    };
  };

  // Add a new event - uses the same parameters as CalendarService.addEvent
  async function addEvent(eventData) {
    if (!currentUser || !familyId) {
      console.error("Cannot add event: No user or family ID");
      return { success: false, error: "User not logged in or no family selected" };
    }
    
    try {
      // Standardize the event first
      const standardizedEvent = standardizeEvent({
        ...eventData,
        userId: currentUser.uid,
        familyId: familyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Create document in Firestore
      const eventRef = doc(collection(db, "calendar_events"));
      await setDoc(eventRef, standardizedEvent);
      
      // Update ID fields
      await updateDoc(eventRef, { 
        id: eventRef.id,
        firestoreId: eventRef.id
      });
      
      console.log("Event added successfully:", eventRef.id);
      
      // Return success result
      return { 
        success: true, 
        eventId: eventRef.id, 
        universalId: standardizedEvent.universalId 
      };
    } catch (error) {
      console.error("Error adding event:", error);
      return { success: false, error: error.message };
    }
  }

  // Update an existing event - works with EnhancedEventManager
  async function updateEvent(eventId, eventData) {
    if (!currentUser || !familyId) {
      return { success: false, error: "User not logged in or no family selected" };
    }
    
    try {
      // Get document reference
      const docRef = doc(db, "calendar_events", eventId);
      
      // Prepare update data (partial update)
      const updateData = {
        ...eventData,
        updatedAt: serverTimestamp()
      };
      
      // Ensure title and summary are synced
      if (updateData.title && !updateData.summary) {
        updateData.summary = updateData.title;
      } else if (updateData.summary && !updateData.title) {
        updateData.title = updateData.summary;
      }
      
      // Update in Firestore
      await updateDoc(docRef, updateData);
      
      console.log("Event updated successfully:", eventId);
      
      return { success: true, eventId };
    } catch (error) {
      console.error("Error updating event:", error);
      return { success: false, error: error.message };
    }
  }

  // Delete an event
  async function deleteEvent(eventId) {
    if (!currentUser || !familyId) {
      return { success: false, error: "User not logged in or no family selected" };
    }
    
    try {
      await deleteDoc(doc(db, "calendar_events", eventId));
      console.log("Event deleted successfully:", eventId);
      return { success: true };
    } catch (error) {
      console.error("Error deleting event:", error);
      return { success: false, error: error.message };
    }
  }

  // Helper functions
  function getEventById(eventId) {
    return events.find(e => e.id === eventId || e.firestoreId === eventId || e.universalId === eventId);
  }

  function getEventsByType(eventType) {
    return events.filter(e => e.eventType === eventType || e.category === eventType);
  }

  function getEventsByDate(date) {
    const targetDate = date instanceof Date ? date : new Date(date);
    
    // Convert to date-only for comparison (no time)
    const targetDateString = targetDate.toISOString().split('T')[0];
    
    return events.filter(event => {
      const eventDate = new Date(event.start.dateTime);
      return eventDate.toISOString().split('T')[0] === targetDateString;
    });
  }

  function getEventsByCycle(cycleNumber) {
    return events.filter(event => 
      // Check various fields that might indicate cycle number
      (event.cycleNumber === cycleNumber) ||
      (event.title && event.title.includes(`Cycle ${cycleNumber}`)) ||
      (event.summary && event.summary.includes(`Cycle ${cycleNumber}`)) ||
      (event.linkedEntity?.id === cycleNumber && event.linkedEntity?.type === 'meeting')
    );
  }

  function getDueDateForCycle(cycleNumber) {
    // Find cycle due date event
    const dueDateEvents = events.filter(event => 
      (event.category === 'cycle-due-date' || event.eventType === 'cycle-due-date') &&
      (event.cycleNumber === cycleNumber || 
       (event.title && event.title.includes(`Cycle ${cycleNumber}`)) ||
       (event.summary && event.summary.includes(`Cycle ${cycleNumber}`)))
    );
    
    if (dueDateEvents.length > 0) {
      return dueDateEvents[0].dateObj || new Date(dueDateEvents[0].start.dateTime);
    }
    
    return null;
  }

  // Context value
  const value = {
    events,
    loading,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventById,
    getEventsByType,
    getEventsByDate,
    getEventsByCycle,
    getDueDateForCycle,
    standardizeEvent
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
}