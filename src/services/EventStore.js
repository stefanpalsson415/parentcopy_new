// src/services/EventStore.js
import { db } from './firebase';
import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, 
  deleteDoc, query, where, serverTimestamp 
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

class EventStore {
  constructor() {
    this.listeners = new Set();
    this.eventCache = new Map();
    this.lastRefresh = Date.now();
  }

  // Get a standardized event object with all required fields
  standardizeEvent(eventData) {
    // Get date objects from various possible sources
    let startDate = null;
    if (eventData.dateObj instanceof Date) {
      startDate = eventData.dateObj;
    } else if (eventData.start?.dateTime) {
      startDate = new Date(eventData.start.dateTime);
    } else if (eventData.dateTime) {
      startDate = new Date(eventData.dateTime);
    } else if (eventData.date) {
      startDate = new Date(eventData.date);
    } else {
      startDate = new Date();
    }

    // Calculate end date (default 1 hour duration)
    let endDate = null;
    if (eventData.dateEndObj instanceof Date) {
      endDate = eventData.dateEndObj;
    } else if (eventData.end?.dateTime) {
      endDate = new Date(eventData.end.dateTime);
    } else if (eventData.endDateTime) {
      endDate = new Date(eventData.endDateTime);
    } else {
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    }

    // Generate a unique, permanent ID if not provided
    const universalId = eventData.universalId || eventData.id || `event-${uuidv4()}`;

    // Return a fully standardized event object
    return {
      // Identity fields
      id: eventData.id || eventData.firestoreId || universalId,
      firestoreId: eventData.firestoreId || eventData.id,
      universalId: universalId,
      
      // Core event data
      title: eventData.title || eventData.summary || "Untitled Event",
      summary: eventData.summary || eventData.title || "Untitled Event",
      description: eventData.description || "",
      
      // Date information in all required formats for backwards compatibility
      date: startDate.toISOString(),
      dateTime: startDate.toISOString(),
      dateObj: startDate,
      dateEndObj: endDate,
      endDateTime: endDate.toISOString(),
      start: {
        dateTime: startDate.toISOString(),
        timeZone: eventData.start?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: eventData.end?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      
      // Classification
      location: eventData.location || "",
      category: eventData.category || eventData.eventType || "general",
      eventType: eventData.eventType || eventData.category || "general",
      
      // Relation fields
      familyId: eventData.familyId,
      userId: eventData.userId,
      childId: eventData.childId || null,
      childName: eventData.childName || null,
      attendingParentId: eventData.attendingParentId || null,
      siblingIds: eventData.siblingIds || [],
      siblingNames: eventData.siblingNames || [],
      
      // Additional metadata
      extraDetails: eventData.extraDetails || {},
      source: eventData.source || "manual",
      linkedEntity: eventData.linkedEntity || null,
      
      // Timestamps
      createdAt: eventData.createdAt || new Date().toISOString(),
      updatedAt: eventData.updatedAt || new Date().toISOString()
    };
  }

  // Add a new event
  async addEvent(eventData, userId, familyId) {
    try {
      if (!userId) throw new Error("User ID is required");

      // Standardize and validate the event
      const standardizedEvent = this.standardizeEvent({
        ...eventData,
        userId,
        familyId
      });
      
      // Save to Firestore
      const eventCollection = collection(db, "events");
      const eventRef = doc(eventCollection);
      const firestoreId = eventRef.id;
      
      await setDoc(eventRef, {
        ...standardizedEvent,
        firestoreId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Update cache
      this.eventCache.set(standardizedEvent.universalId, {
        ...standardizedEvent,
        firestoreId
      });
      
      // Notify listeners
      this.notifyListeners('add', {
        ...standardizedEvent,
        firestoreId
      });
      
      return {
        success: true,
        eventId: firestoreId,
        universalId: standardizedEvent.universalId
      };
    } catch (error) {
      console.error("Error adding event:", error);
      return { success: false, error: error.message };
    }
  }

  // Update an existing event
  async updateEvent(eventId, updateData, userId) {
    try {
      // Get the event
      const eventRef = doc(db, "events", eventId);
      const eventSnapshot = await getDoc(eventRef);
      
      if (!eventSnapshot.exists()) {
        throw new Error(`Event with ID ${eventId} not found`);
      }
      
      const existingEvent = eventSnapshot.data();
      
      // Create updated event
      const updatedEvent = this.standardizeEvent({
        ...existingEvent,
        ...updateData,
        firestoreId: eventId,
        updatedAt: new Date().toISOString()
      });
      
      // Save to Firestore
      await updateDoc(eventRef, {
        ...updatedEvent,
        updatedAt: serverTimestamp()
      });
      
      // Update cache
      this.eventCache.set(updatedEvent.universalId, updatedEvent);
      
      // Notify listeners
      this.notifyListeners('update', updatedEvent);
      
      return {
        success: true,
        eventId,
        universalId: updatedEvent.universalId
      };
    } catch (error) {
      console.error("Error updating event:", error);
      return { success: false, error: error.message };
    }
  }

  // Delete an event
  async deleteEvent(eventId, userId) {
    try {
      // Get the event
      const eventRef = doc(db, "events", eventId);
      const eventSnapshot = await getDoc(eventRef);
      
      if (!eventSnapshot.exists()) {
        throw new Error(`Event with ID ${eventId} not found`);
      }
      
      const existingEvent = eventSnapshot.data();
      
      // Delete from Firestore
      await deleteDoc(eventRef);
      
      // Remove from cache
      this.eventCache.delete(existingEvent.universalId);
      
      // Notify listeners
      this.notifyListeners('delete', {
        id: eventId,
        universalId: existingEvent.universalId
      });
      
      return { success: true };
    } catch (error) {
      console.error("Error deleting event:", error);
      return { success: false, error: error.message };
    }
  }

  // Get events by user ID and date range
  async getEventsForUser(userId, startDate = null, endDate = null) {
    try {
      if (!userId) throw new Error("User ID is required");
      
      // Default date range if not provided
      if (!startDate) {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      }
      
      if (!endDate) {
        endDate = new Date();
        endDate.setDate(endDate.getDate() + 60);
      }
      
      // Query Firestore
      const eventsQuery = query(
        collection(db, "events"),
        where("userId", "==", userId)
      );
      
      const querySnapshot = await getDocs(eventsQuery);
      const events = [];
      
      // Process results
      querySnapshot.forEach((doc) => {
        const eventData = doc.data();
        const standardizedEvent = this.standardizeEvent({
          ...eventData,
          firestoreId: doc.id
        });
        
        // Check if within date range
        const eventStartDate = new Date(standardizedEvent.start.dateTime);
        if (eventStartDate >= startDate && eventStartDate <= endDate) {
          events.push(standardizedEvent);
          
          // Update cache
          this.eventCache.set(standardizedEvent.universalId, standardizedEvent);
        }
      });
      
      // Sort by date
      return events.sort((a, b) => new Date(a.start.dateTime) - new Date(b.start.dateTime));
    } catch (error) {
      console.error("Error getting events:", error);
      return [];
    }
  }

  // Get a specific event by ID
  async getEventById(eventId) {
    try {
      // Check cache first
      const cachedEvent = Array.from(this.eventCache.values())
        .find(event => event.firestoreId === eventId || event.id === eventId || event.universalId === eventId);
      
      if (cachedEvent) return cachedEvent;
      
      // Get from Firestore
      const eventRef = doc(db, "events", eventId);
      const eventSnapshot = await getDoc(eventRef);
      
      if (!eventSnapshot.exists()) {
        return null;
      }
      
      const eventData = eventSnapshot.data();
      const standardizedEvent = this.standardizeEvent({
        ...eventData,
        firestoreId: eventId
      });
      
      // Update cache
      this.eventCache.set(standardizedEvent.universalId, standardizedEvent);
      
      return standardizedEvent;
    } catch (error) {
      console.error("Error getting event:", error);
      return null;
    }
  }

  // Get events for a specific cycle
  async getEventsForCycle(familyId, cycleNumber) {
    try {
      if (!familyId) throw new Error("Family ID is required");
      
      // Query for cycle events
      const eventsQuery = query(
        collection(db, "events"),
        where("familyId", "==", familyId),
        where("cycleNumber", "==", cycleNumber)
      );
      
      const querySnapshot = await getDocs(eventsQuery);
      const events = [];
      
      querySnapshot.forEach((doc) => {
        const eventData = doc.data();
        const standardizedEvent = this.standardizeEvent({
          ...eventData,
          firestoreId: doc.id
        });
        
        events.push(standardizedEvent);
        
        // Update cache
        this.eventCache.set(standardizedEvent.universalId, standardizedEvent);
      });
      
      return events;
    } catch (error) {
      console.error("Error getting cycle events:", error);
      return [];
    }
  }

  // Find specific cycle due date event
  async getCycleDueDateEvent(familyId, cycleNumber) {
    try {
      if (!familyId) throw new Error("Family ID is required");
      
      // Check cache first
      const cachedEvent = Array.from(this.eventCache.values())
        .find(event => 
          event.familyId === familyId && 
          (event.cycleNumber === cycleNumber) &&
          (event.eventType === 'cycle-due-date' || event.category === 'cycle-due-date' ||
           (event.title && event.title.includes(`Cycle ${cycleNumber}`) && event.title.includes('Due Date')))
        );
      
      if (cachedEvent) return cachedEvent;
      
      // Query for cycle due date events
      const eventsQuery = query(
        collection(db, "events"),
        where("familyId", "==", familyId)
      );
      
      const querySnapshot = await getDocs(eventsQuery);
      let dueEvent = null;
      
      querySnapshot.forEach((doc) => {
        const event = doc.data();
        
        const isCycleDueDate = 
          (event.cycleNumber === cycleNumber) &&
          (event.eventType === 'cycle-due-date' || event.category === 'cycle-due-date' ||
           (event.title && event.title.includes(`Cycle ${cycleNumber}`) && event.title.includes('Due Date')));
        
        if (isCycleDueDate) {
          dueEvent = this.standardizeEvent({
            ...event,
            firestoreId: doc.id
          });
          
          // Update cache
          this.eventCache.set(dueEvent.universalId, dueEvent);
        }
      });
      
      return dueEvent;
    } catch (error) {
      console.error("Error finding cycle due date event:", error);
      return null;
    }
  }

  // Subscribe to event changes
  subscribe(callback) {
    if (typeof callback === 'function') {
      this.listeners.add(callback);
      return () => this.listeners.delete(callback);
    }
    return () => {};
  }

  // Notify all listeners of event changes
  notifyListeners(action, event) {
    this.listeners.forEach(listener => {
      try {
        listener(action, event);
      } catch (error) {
        console.error("Error in event listener:", error);
      }
    });
    
    // Also dispatch DOM events for legacy components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
      window.dispatchEvent(new CustomEvent(`calendar-event-${action}d`, {
        detail: { 
          eventId: event.id || event.firestoreId,
          universalId: event.universalId,
          event: event
        }
      }));
    }
  }

  // Force refresh all data
  async refreshEvents(userId) {
    if (!userId) return [];
    
    // Clear cache
    this.eventCache.clear();
    
    // Reload events
    return await this.getEventsForUser(userId);
  }
}

// Create and export a singleton instance
const eventStore = new EventStore();
export default eventStore;