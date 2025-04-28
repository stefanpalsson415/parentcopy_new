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
    
    // Check for pending events on initialization
    if (typeof window !== 'undefined') {
      setTimeout(() => this.checkAndRecoverPendingEvents(), 5000);
    }
  }

 // NEW CODE in EventStore.js standardizeEvent method
// CORRECTED CODE for EventStore.js standardizeEvent method
standardizeEvent(eventData) {
  // Get date objects from various possible sources with improved error handling and logging
  let startDate = null;
  try {
    console.log("🔴 Standardizing event:", eventData.title || "Untitled", "Source:", eventData.source || "unknown");
    
    if (eventData.dateObj instanceof Date && !isNaN(eventData.dateObj.getTime())) {
      startDate = eventData.dateObj;
      console.log("🔴 Using dateObj for start date:", startDate.toISOString());
    } else if (eventData.start?.dateTime) {
      startDate = new Date(eventData.start.dateTime);
      console.log("🔴 Using start.dateTime for start date:", startDate.toISOString());
    } else if (eventData.dateTime) {
      startDate = new Date(eventData.dateTime);
      console.log("🔴 Using dateTime for start date:", startDate.toISOString());
    } else if (eventData.date) {
      startDate = new Date(eventData.date);
      console.log("🔴 Using date for start date:", startDate.toISOString());
    } else {
      startDate = new Date();
      console.log("🔴 No date found, using current time for start date");
    }
  } catch (error) {
    console.error("🔴 Error parsing start date:", error, "Using current time instead");
    startDate = new Date();
  }

  // Calculate end date (default 1 hour duration) with better error handling
  let endDate = null;
  try {
    if (eventData.dateEndObj instanceof Date && !isNaN(eventData.dateEndObj.getTime())) {
      endDate = eventData.dateEndObj;
    } else if (eventData.end?.dateTime) {
      endDate = new Date(eventData.end.dateTime);
    } else if (eventData.endDateTime) {
      endDate = new Date(eventData.endDateTime);
    } else {
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    }
  } catch (error) {
    console.error("🔴 Error parsing end date:", error, "Using start date + 1 hour instead");
    endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  }

  // Make sure startDate and endDate are valid dates
  if (isNaN(startDate.getTime())) {
    console.warn("🔴 Invalid start date detected, using current time instead");
    startDate = new Date();
  }

  if (isNaN(endDate.getTime())) {
    console.warn("🔴 Invalid end date detected, using start date + 1 hour instead");
    endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  }

  // Generate a unique, permanent ID if not provided 
  const universalId = eventData.universalId || eventData.id || `event-${uuidv4()}`;

  // Create signature for deduplication with more reliable field access
  const title = eventData.title || eventData.summary || "";
  const childInfo = eventData.childId || eventData.childName || "";
  const category = eventData.eventType || eventData.category || "general";
  const dateString = startDate.toISOString().split('T')[0];
  
  const signatureBase = `${title}-${dateString}-${childInfo}-${category}`.toLowerCase();
  
  // Calculate a deterministic hash for this event to aid in deduplication
  const eventSignature = `sig-${this.hashString(signatureBase)}`;

  // Standardize attendees format if provided
  let attendees = [];
  if (eventData.attendees && Array.isArray(eventData.attendees)) {
    attendees = eventData.attendees.map(attendee => {
      // Handle both string and object formats
      if (typeof attendee === 'string') {
        return { id: attendee, name: attendee, role: 'general' };
      }
      
      // Ensure ID, name, and role always exist
      return {
        id: attendee.id || 'unknown-id',
        name: attendee.name || 'Unknown Attendee',
        role: attendee.role || 'general',
        ...attendee
      };
    });
  }

  // Ensure we have document and providers arrays
  const documents = Array.isArray(eventData.documents) ? eventData.documents : [];
  const providers = Array.isArray(eventData.providers) ? eventData.providers : [];

  // Return a fully standardized event object with ALL required fields
  const standardizedEvent = {
    // Identity fields
    id: eventData.id || eventData.firestoreId || universalId,
    firestoreId: eventData.firestoreId || eventData.id || null,
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
    siblingIds: Array.isArray(eventData.siblingIds) ? eventData.siblingIds : [],
    siblingNames: Array.isArray(eventData.siblingNames) ? eventData.siblingNames : [],
    
    // Family members attending - now properly standardized
    attendees: attendees,
    
    // Document and provider relationships - now properly standardized
    documents: documents,
    providers: providers,
    
    // Doctor name (crucial for appointments) - explicitly added
    doctorName: eventData.doctorName || eventData.appointmentDetails?.doctorName || null,
    
    // Add appointment-specific details if this is a medical appointment
    appointmentDetails: eventData.appointmentDetails || null,
    
    // Add activity-specific details if present
    activityDetails: eventData.activityDetails || null,
    
    // Additional metadata
    extraDetails: {
      ...(eventData.extraDetails || {}),
      // Ensure these critical fields exist for chat-created events
      creationSource: eventData.extraDetails?.creationSource || eventData.source || "manual",
      parsedWithAI: eventData.extraDetails?.parsedWithAI || false
    },
    
    // Keep original source field but ensure it exists
    source: eventData.source || eventData.extraDetails?.creationSource || "manual",
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
  
  console.log("🔴 Standardized event:", {
    title: standardizedEvent.title,
    date: standardizedEvent.dateObj.toDateString(),
    source: standardizedEvent.source
  });
  
// In the standardizeEvent method in EventStore.js, add this fix after line 86 (after standardizedEvent creation)
// In file: src/services/EventStore.js
// Add right before the return statement in standardizeEvent method:

// Ensure we don't have undefined values that might cause Firebase errors
Object.keys(standardizedEvent).forEach(key => {
  if (standardizedEvent[key] === undefined) {
    delete standardizedEvent[key];
  }
});

// Ensure critical fields have fallback values
if (!standardizedEvent.title) standardizedEvent.title = "Untitled Event";
if (!standardizedEvent.eventType) standardizedEvent.eventType = "general";
if (!standardizedEvent.category) standardizedEvent.category = "general";

// Log the final standardized event
console.log("✅ Final standardized event:", {
  title: standardizedEvent.title,
  date: standardizedEvent.date,
  eventType: standardizedEvent.eventType,
  childName: standardizedEvent.childName
});



  return standardizedEvent;
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

  // In src/services/EventStore.js, update the addEvent method
async addEvent(eventData, userId, familyId) {
  try {
    if (!userId) throw new Error("User ID is required");

    // Log the attempt
    console.log("EventStore: Adding event:", { 
      title: eventData.title || "Untitled", 
      type: eventData.eventType || "general",
      userId, 
      familyId
    });

    // Standardize and validate the event
    const standardizedEvent = this.standardizeEvent({
      ...eventData,
      userId,
      familyId
    });
    
    // Enhanced duplicate detection
    try {
      const eventsQuery = query(
        collection(db, "events"),
        where("eventSignature", "==", standardizedEvent.eventSignature),
        where("userId", "==", userId)
      );
      
      const querySnapshot = await getDocs(eventsQuery);
      
      if (!querySnapshot.empty) {
        // Found potential duplicate
        const existingEvent = querySnapshot.docs[0].data();
        console.log("Duplicate event detected:", existingEvent.firestoreId);
        
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
    } catch (dupError) {
      // Log but continue even if duplicate check fails
      console.warn("Duplicate check failed:", dupError);
    }
      
    // Save to Firestore with retry logic
    let eventRef = null;
    let firestoreId = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Attempt ${attempt} to save event to Firestore`);
        
        // Create a new document in the events collection
        const eventCollection = collection(db, "events");
        const docRef = doc(eventCollection);
        firestoreId = docRef.id;
        
        // Add the Firestore ID to the event data
        const eventToSave = {
          ...standardizedEvent,
          firestoreId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        // Save to Firestore
        await setDoc(docRef, eventToSave);
        eventRef = docRef;
        console.log(`Event saved successfully on attempt ${attempt} with ID: ${firestoreId}`);
        break;
      } catch (saveError) {
        console.error(`Error on save attempt ${attempt}:`, saveError);
        
        if (attempt === 3) throw saveError;
        
        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
      }
    }
    
    if (!eventRef) {
      throw new Error("Failed to save event after multiple attempts");
    }
    
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
    
    console.log("Event successfully added and listeners notified");
    
    return {
      success: true,
      eventId: firestoreId,
      universalId: standardizedEvent.universalId
    };
  } catch (error) {
    console.error("Error adding event:", error);
    
    // Create last-ditch attempt to save event to localStorage
    if (typeof window !== 'undefined') {
      try {
        const pendingEvents = JSON.parse(localStorage.getItem('pendingEvents') || '[]');
        pendingEvents.push({
          event: eventData,
          timestamp: Date.now(),
          userId,
          familyId
        });
        localStorage.setItem('pendingEvents', JSON.stringify(pendingEvents));
        console.log("Event saved to localStorage as fallback");
      } catch (localStorageError) {
        console.error("LocalStorage fallback failed:", localStorageError);
      }
    }
    
    return { success: false, error: error.message };
  }
}

  clearCache() {
    console.log("Clearing event cache");
    this.eventCache.clear();
    this.lastRefresh = Date.now();
    return true;
  }

// Add this new method to src/services/EventStore.js
async checkAndRecoverPendingEvents() {
  if (typeof window === 'undefined') return;
  
  try {
    const pendingEvents = JSON.parse(localStorage.getItem('pendingEvents') || '[]');
    
    if (pendingEvents.length > 0) {
      console.log(`Found ${pendingEvents.length} pending events to recover`);
      
      for (const item of pendingEvents) {
        try {
          await this.addEvent(item.event, item.userId, item.familyId);
        } catch (error) {
          console.error("Error recovering event:", error);
        }
      }
      
      // Clear pending events after recovery attempt
      localStorage.removeItem('pendingEvents');
    }
  } catch (error) {
    console.error("Error checking for pending events:", error);
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
      
      // Query Firestore - IMPROVED: No additional filters that might exclude events
      const eventsQuery = query(
        collection(db, "events"),
        where("userId", "==", userId)
      );
      
      console.log(`Fetching events for user ${userId}`);
      const querySnapshot = await getDocs(eventsQuery);
      console.log(`Retrieved ${querySnapshot.size} events from Firebase`);
      
      const events = [];
      
      // Process results with more robust logging
      querySnapshot.forEach((doc) => {
        try {
          const eventData = doc.data();
          const standardizedEvent = this.standardizeEvent({
            ...eventData,
            firestoreId: doc.id
          });
          
          // IMPROVED: More flexible date handling with fallbacks
          let eventStartDate;
          try {
            if (standardizedEvent.start?.dateTime) {
              eventStartDate = new Date(standardizedEvent.start.dateTime);
            } else if (standardizedEvent.dateTime) {
              eventStartDate = new Date(standardizedEvent.dateTime);
            } else if (standardizedEvent.dateObj) {
              eventStartDate = standardizedEvent.dateObj;
            } else if (standardizedEvent.date) {
              eventStartDate = new Date(standardizedEvent.date);
            } else {
              console.warn(`Event ${doc.id} missing date/time fields, using current date`);
              eventStartDate = new Date();
            }
          } catch (dateError) {
            console.error(`Error parsing date for event ${doc.id}:`, dateError);
            eventStartDate = new Date(); // Fallback to current date
          }
          
          // Add event regardless of date if date parsing failed
          const dateParsingFailed = isNaN(eventStartDate.getTime());
          const withinDateRange = dateParsingFailed || 
                                 (eventStartDate >= startDate && eventStartDate <= endDate);
          
          if (withinDateRange) {
            // Log source for debugging
            console.log(`Adding event: "${standardizedEvent.title || 'Untitled'}" from source "${standardizedEvent.source || 'unknown'}", id=${doc.id}`);
            
            events.push(standardizedEvent);
            
            // Update cache
            this.eventCache.set(standardizedEvent.universalId, standardizedEvent);
          }
        } catch (docError) {
          console.error(`Error processing event document ${doc.id}:`, docError);
        }
      });
      
      console.log(`Processed ${events.length} events within date range`);
      
      // Sort by date with error handling
      return events.sort((a, b) => {
        try {
          const dateA = new Date(a.start?.dateTime || a.dateTime || a.date || Date.now());
          const dateB = new Date(b.start?.dateTime || b.dateTime || b.date || Date.now());
          return dateA - dateB;
        } catch (e) {
          return 0; // If date parsing fails, don't change order
        }
      });
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

// In src/services/EventStore.js, update the refreshEvents method
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
      
      // Standardize the event
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