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

    // Make sure startDate and endDate are valid dates
    if (isNaN(startDate.getTime())) {
      console.warn("Invalid start date detected, using current time instead");
      startDate = new Date();
    }

    if (isNaN(endDate.getTime())) {
      console.warn("Invalid end date detected, using start date + 1 hour instead");
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    }

    // Generate a unique, permanent ID if not provided
    const universalId = eventData.universalId || eventData.id || `event-${uuidv4()}`;

    // Create signature for deduplication
    const signatureBase = `${eventData.title || eventData.summary || ""}-${startDate.toISOString().split('T')[0]}-${
      eventData.childId || eventData.childName || ""
    }-${eventData.eventType || eventData.category || ""}`.toLowerCase();
    
    // Calculate a deterministic hash for this event to aid in deduplication
    const eventSignature = `sig-${this.hashString(signatureBase)}`;

    // Return a fully standardized event object
    return {
      // Identity fields
      id: eventData.id || eventData.firestoreId || universalId,
      firestoreId: eventData.firestoreId || eventData.id,
      universalId: universalId,
      eventSignature: eventSignature,
      
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
      
      // Family members attending
      attendees: eventData.attendees || [],
      
      // Document and provider relationships
      documents: eventData.documents || [],
      providers: eventData.providers || [],
      
      // Additional metadata
      extraDetails: eventData.extraDetails || {},
      source: eventData.source || "manual",
      linkedEntity: eventData.linkedEntity || null,
      
      // Enhanced context
      reminders: eventData.reminders || {
        useDefault: true,
        overrides: []
      },
      notes: eventData.notes || eventData.extraDetails?.notes || "",
      
      // Timestamps
      createdAt: eventData.createdAt || new Date().toISOString(),
      updatedAt: eventData.updatedAt || new Date().toISOString()
    };
  }
  
  // Simple hash function for generating event signatures
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
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
      
      // Enhanced duplicate detection - check signature AND time proximity
const eventsQuery = query(
    collection(db, "events"),
    where("eventSignature", "==", standardizedEvent.eventSignature),
    where("userId", "==", userId)
  );
  
  const querySnapshot = await getDocs(eventsQuery);
  
  // If we found potential duplicates, check for date/time proximity
  if (!querySnapshot.empty) {
    // Check each match to find true duplicates (same day or very close in time)
    const matches = [];
    
    querySnapshot.forEach((docSnapshot) => {
      const potentialDuplicate = docSnapshot.data();
      
      // Get the start times for comparison
      const newEventStart = new Date(standardizedEvent.start.dateTime);
      const existingEventStart = new Date(potentialDuplicate.start.dateTime);
      
      // Calculate time difference in hours
      const timeDiff = Math.abs(newEventStart - existingEventStart) / (1000 * 60 * 60);
      
      // Check if events are on the same day or within 3 hours of each other
      const sameDay = newEventStart.toISOString().split('T')[0] === 
                     existingEventStart.toISOString().split('T')[0];
                     
      if (sameDay || timeDiff <= 3) {
        matches.push(potentialDuplicate);
      }
    });
    
    // If we have matches, return the closest one as the duplicate
    if (matches.length > 0) {
      // Sort by closeness in time if we have multiple matches
      matches.sort((a, b) => {
        const timeA = new Date(a.start.dateTime);
        const timeB = new Date(b.start.dateTime);
        const newTime = new Date(standardizedEvent.start.dateTime);
        
        return Math.abs(timeA - newTime) - Math.abs(timeB - newTime);
      });
      
      const existingEvent = matches[0];
      console.log("Duplicate event detected, returning existing event", existingEvent.firestoreId);
      
      // Update cache with the existing event
      this.eventCache.set(existingEvent.universalId, existingEvent);
      
      return {
        success: true,
        eventId: existingEvent.firestoreId,
        universalId: existingEvent.universalId,
        isDuplicate: true,
        existingEvent: existingEvent
      };
    }
  }
      
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

  clearCache() {
    console.log("Clearing event cache");
    this.eventCache.clear();
    this.lastRefresh = Date.now();
    return true;
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

  // In EventStore.js, replace the refreshEvents method with this enhanced version:

async refreshEvents(userId, familyId = null, cycleNumber = null) {
  if (!userId) return [];
  
  console.log("📅 Forced refresh of events for user:", userId);
  
  // Clear cache completely
  this.eventCache.clear();
  this.lastRefresh = Date.now();
  
  // Run a direct database query with no filters to get all events
  try {
    console.log("📅 Running direct Firestore query for all user events");
    const eventsQuery = query(
      collection(db, "events"),
      where("userId", "==", userId)
    );
    
    const querySnapshot = await getDocs(eventsQuery);
    const events = [];
    
    // Process results
    querySnapshot.forEach((doc) => {
      const eventData = doc.data();
      
      // Convert string dates to Date objects for consistent handling
      if (eventData.dateTime && !eventData.dateObj) {
        eventData.dateObj = new Date(eventData.dateTime);
      }
      
      if (eventData.endDateTime && !eventData.dateEndObj) {
        eventData.dateEndObj = new Date(eventData.endDateTime);
      }
      
      if (eventData.start?.dateTime && !eventData.dateObj) {
        eventData.dateObj = new Date(eventData.start.dateTime);
      }
      
      if (eventData.end?.dateTime && !eventData.dateEndObj) {
        eventData.dateEndObj = new Date(eventData.end.dateTime);
      }
      
      const standardizedEvent = this.standardizeEvent({
        ...eventData,
        firestoreId: doc.id
      });
      
      // Add all events regardless of date range
      events.push(standardizedEvent);
      
      // Update cache
      this.eventCache.set(standardizedEvent.universalId, standardizedEvent);
    });
    
    console.log(`📅 Direct query found ${events.length} events`);
    
    // Log events from chat to verify they're being loaded
    const chatEvents = events.filter(e => e.source === 'allie-chat' || e.creationSource === 'allie-chat');
    if (chatEvents.length > 0) {
      console.log(`📅 Found ${chatEvents.length} events created from chat:`, 
        chatEvents.map(e => ({title: e.title, date: e.dateObj?.toISOString(), id: e.firestoreId}))
      );
    }
    
    // Notify listeners with a small delay to ensure event processing
    setTimeout(() => {
      events.forEach(event => {
        this.notifyListeners('update', event);
      });
      
      // Also dispatch a DOM event for overall refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
      }
    }, 100);
    
    return events;
  } catch (error) {
    console.error("Error in direct refresh:", error);
    
    // Fall back to regular getEventsForUser
    return await this.getEventsForUser(userId);
  }
}
}

// Create and export a singleton instance
const eventStore = new EventStore();
export default eventStore;