// src/services/CalendarService.js
import { doc, getDoc, setDoc, updateDoc, collection, addDoc,deleteDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

class CalendarService {
  constructor() {
    this.isInitialized = true;
    this.mockMode = false;
    this.calendarSettings = {};
    this.activeCalendarType = 'allie';
    this.appleCalendarAvailable = false; // We're no longer supporting Apple Calendar
  }
  
  // Load user's calendar preferences
  async loadUserCalendarSettings(userId) {
    try {
      if (!userId) {
        console.warn("No userId provided to loadUserCalendarSettings");
        return null;
      }
      
      const docRef = doc(db, "userSettings", userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        this.calendarSettings = docSnap.data().calendarSettings || {};
        this.activeCalendarType = 'allie'; // Always use Allie calendar
        return this.calendarSettings;
      }
      
      // Initialize default settings if none exist
      const defaultSettings = {
        defaultCalendarType: 'allie',
        allieCalendar: {
          enabled: true
        },
        notifications: {
          taskReminders: true,
          meetingReminders: true,
          reminderTime: 30 // minutes before
        }
      };
      
      await setDoc(docRef, { calendarSettings: defaultSettings }, { merge: true });
      this.calendarSettings = defaultSettings;
      return defaultSettings;
    } catch (error) {
      console.error("Error loading calendar settings:", error);
      return null;
    }
  }

  // Save user's calendar preferences
  async saveUserCalendarSettings(userId, settings) {
    try {
      if (!userId) {
        console.warn("No userId provided to saveUserCalendarSettings");
        return false;
      }
      
      // Ensure we're always using Allie calendar
      settings.defaultCalendarType = 'allie';
      
      const docRef = doc(db, "userSettings", userId);
      await updateDoc(docRef, { calendarSettings: settings });
      
      this.calendarSettings = settings;
      this.activeCalendarType = 'allie';
      return true;
    } catch (error) {
      console.error("Error saving calendar settings:", error);
      return false;
    }
  }


  async updateEvent(eventId, updateData, userId) {
    try {
      if (!eventId || !userId) {
        throw new Error("Event ID and User ID are required to update events");
      }
      
      console.log("Updating calendar event:", { eventId, updateFields: Object.keys(updateData) });
      
      // Standardize the update data
      const updates = {
        ...updateData,
        updatedAt: serverTimestamp()
      };
      
      // If there are changes to title/summary, ensure both fields are updated
      if (updates.title && !updates.summary) {
        updates.summary = updates.title;
      } else if (updates.summary && !updates.title) {
        updates.title = updates.summary;
      }
      
      // Update in Firestore
      const docRef = doc(db, "calendar_events", eventId);
      await updateDoc(docRef, updates);
      
      // Dispatch events for UI refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
        window.dispatchEvent(new CustomEvent('calendar-event-updated', {
          detail: { eventId }
        }));
      }
      
      this.showNotification("Event updated successfully", "success");
      
      return {
        success: true,
        eventId
      };
    } catch (error) {
      console.error("Error updating event:", error);
      this.showNotification("Failed to update event", "error");
      return { success: false, error: error.message || "Unknown error" };
    }
  }
  
  // Enhanced delete method
  async deleteEvent(eventId, userId) {
    try {
      if (!eventId || !userId) {
        throw new Error("Event ID and User ID are required to delete events");
      }
      
      console.log("Deleting calendar event:", { eventId });
      
      // Delete from Firestore
      const docRef = doc(db, "calendar_events", eventId);
      await deleteDoc(docRef);
      
      // Dispatch events for UI refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
        window.dispatchEvent(new CustomEvent('calendar-event-deleted', {
          detail: { eventId }
        }));
      }
      
      this.showNotification("Event deleted from calendar", "success");
      
      return {
        success: true
      };
    } catch (error) {
      console.error("Error deleting event:", error);
      this.showNotification("Failed to delete event", "error");
      return { success: false, error: error.message || "Unknown error" };
    }
  }





  async addEvent(event, userId) {
    try {
      if (!userId) {
        throw new Error("User ID is required to add events");
      }
      
      // Generate a universal ID for the event
      const universalId = `event-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      
      // Enhanced logging for tracking event creation flow
      console.log("Adding calendar event:", {
        title: event.summary || event.title || 'Untitled',
        hasStart: !!event.start,
        hasDate: !!(event.start?.dateTime || event.start?.date),
        childName: event.childName || 'None',
        universalId,
        userId,
        attendees: event.attendees || [],
        source: event.source || 'manual',
        creationSource: event.extraDetails?.creationSource || 'manual',
        eventType: event.eventType || 'general'
      });
      
      // Validate required fields
      if (!event.summary && !event.title) {
        console.warn("Event missing title - setting default");
        event.summary = "Untitled Event";
      }
      
      // Validate and normalize date/time fields
      let startDate, endDate;
      
      if (event.start?.dateTime) {
        try {
          startDate = new Date(event.start.dateTime);
          if (isNaN(startDate.getTime())) {
            throw new Error("Invalid start dateTime");
          }
        } catch (dateError) {
          console.warn("Invalid start.dateTime, using current time:", dateError);
          startDate = new Date();
        }
      } else if (event.dateTime) {
        try {
          startDate = new Date(event.dateTime);
          if (isNaN(startDate.getTime())) {
            throw new Error("Invalid dateTime");
          }
        } catch (dateError) {
          console.warn("Invalid dateTime, using current time:", dateError);
          startDate = new Date();
        }
      } else {
        console.warn("No start date provided, using current time");
        startDate = new Date();
      }
      
      // Set end date - either from event or default to 1 hour after start
      if (event.end?.dateTime) {
        try {
          endDate = new Date(event.end.dateTime);
          if (isNaN(endDate.getTime())) {
            throw new Error("Invalid end dateTime");
          }
        } catch (dateError) {
          console.warn("Invalid end.dateTime, using start + 1 hour:", dateError);
          endDate = new Date(startDate.getTime() + 60*60000);
        }
      } else if (event.endDateTime) {
        try {
          endDate = new Date(event.endDateTime);
          if (isNaN(endDate.getTime())) {
            throw new Error("Invalid endDateTime");
          }
        } catch (dateError) {
          console.warn("Invalid endDateTime, using start + 1 hour:", dateError);
          endDate = new Date(startDate.getTime() + 60*60000);
        }
      } else {
        // Default to 1 hour duration
        endDate = new Date(startDate.getTime() + 60*60000);
      }
      
      // Ensure end is after start
      if (endDate <= startDate) {
        console.warn("End time is before or equal to start time, adjusting to be 1 hour later");
        endDate = new Date(startDate.getTime() + 60*60000);
      }
      
      // Standardize event format with robust validation
      const standardizedEvent = {
        ...event,
        // Use universal ID as the primary identifier
        universalId,
        // Ensure both summary and title are set for compatibility
        summary: event.summary || event.title || "Untitled Event",
        title: event.title || event.summary || "Untitled Event",
        description: event.description || '',
        // Use validated start and end dates
        start: {
          dateTime: startDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        // Preserve all metadata including attendees
        attendees: event.attendees || [],
        childId: event.childId || null,
        childName: event.childName || null,
        attendingParentId: event.attendingParentId || null,
        siblingIds: event.siblingIds || [],
        siblingNames: event.siblingNames || [],
        eventType: event.eventType || 'general',
        extraDetails: {
          ...(event.extraDetails || {}),
          // Preserve parsing metadata
          parsedWithAI: event.extraDetails?.parsedWithAI || event.parsedWithAI || false,
          extractionConfidence: event.extraDetails?.extractionConfidence || event.extractionConfidence || null,
          parsedFromImage: event.extraDetails?.parsedFromImage || event.parsedFromImage || false,
          originalText: event.extraDetails?.originalText || event.originalText || '',
          creationSource: event.extraDetails?.creationSource || event.creationSource || 'manual',
          // Add creation tracking for debugging
          createdVia: event.source || 'manual',
          dateAdded: new Date().toISOString()
        },
        // Always include these fields
        userId,
        familyId: event.familyId || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        source: event.source || 'manual',
        // Include the original text if available (for later reference)
        originalText: event.originalText || ''
      };
      
      // Log standardized event for debugging
      console.log("Standardized event to be saved:", {
        title: standardizedEvent.summary,
        startDate: standardizedEvent.start.dateTime,
        endDate: standardizedEvent.end.dateTime,
        childId: standardizedEvent.childId,
        childName: standardizedEvent.childName,
        eventType: standardizedEvent.eventType,
        familyId: standardizedEvent.familyId,
        userId: standardizedEvent.userId
      });
      
      // Save event to Firestore in the calendar_events collection
      const eventRef = collection(db, "calendar_events");
      const docRef = await addDoc(eventRef, standardizedEvent);
      
      // Update the document with its own ID for easy reference
      await updateDoc(docRef, {
        firestoreId: docRef.id,
        // Include universalId again to ensure it's set
        universalId: universalId
      });
      
      console.log("Event successfully saved to Firestore with ID:", docRef.id, "and universalId:", universalId);
      
      // Multiple UI refresh approaches for maximum compatibility
      if (typeof window !== 'undefined') {
        // Ensure we use a consistent event structure with the universalId
        const eventDetail = {
          eventId: docRef.id,
          universalId: universalId,
          title: standardizedEvent.summary,
          eventType: standardizedEvent.eventType,
          childId: standardizedEvent.childId,
          childName: standardizedEvent.childName,
          attendees: standardizedEvent.attendees || [],
          dateTime: standardizedEvent.start.dateTime
        };
        
        // Immediate dispatch for urgent updates
        window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
        
        // Also dispatch after a short delay to ensure components have mounted
        setTimeout(() => {
          console.log("Dispatching calendar update events");
          window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
          
          // Also dispatch specific event type for more targeted refreshes
          window.dispatchEvent(new CustomEvent('calendar-event-added', {
            detail: eventDetail
          }));
          
          if (standardizedEvent.childId) {
            window.dispatchEvent(new CustomEvent('calendar-child-event-added', {
              detail: eventDetail
            }));
          }
          
          // Third dispatch after slightly longer delay as a fallback
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
          }, 1000);
        }, 300);
      }
      
      // Show success notification
      this.showNotification(`Event "${standardizedEvent.summary}" added to your calendar`, "success");
      
      return {
        success: true,
        eventId: docRef.id,
        universalId: universalId,
        firestoreId: docRef.id
      };
    } catch (error) {
      console.error("Error adding event to calendar:", error, error.stack);
      this.showNotification("Failed to add event to calendar", "error");
      return { success: false, error: error.message || "Unknown error" };
    }
  }

// Add a new method to handle recurring events
async createRecurringEvents(baseEvent, userId, universalId) {
  try {
    // Check for valid recurrence rule
    if (!baseEvent.recurrence || !Array.isArray(baseEvent.recurrence) || baseEvent.recurrence.length === 0) {
      return;
    }
    
    const recurrenceRule = baseEvent.recurrence[0];
    if (!recurrenceRule.startsWith('RRULE:')) {
      return;
    }
    
    // Parse the recurrence rule
    const ruleString = recurrenceRule.substring(6); // Remove 'RRULE:' prefix
    const ruleComponents = ruleString.split(';');
    
    const rules = {};
    ruleComponents.forEach(component => {
      const [key, value] = component.split('=');
      rules[key] = value;
    });
    
    // We currently only support weekly recurrence
    if (rules.FREQ !== 'WEEKLY') {
      return;
    }
    
    // Get the day of week
    let dayOfWeek = '';
    if (rules.BYDAY) {
      dayOfWeek = rules.BYDAY;
    } else {
      // Use the day from the base event
      const baseDate = new Date(baseEvent.start.dateTime);
      const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
      dayOfWeek = days[baseDate.getDay()];
    }
    
    // Calculate end date (default to 10 occurrences if not specified)
    let endDate = new Date();
    endDate.setDate(endDate.getDate() + 70); // Default to 10 weeks
    
    if (rules.UNTIL) {
      endDate = new Date(rules.UNTIL);
    } else if (rules.COUNT) {
      const count = parseInt(rules.COUNT);
      const baseDate = new Date(baseEvent.start.dateTime);
      endDate = new Date(baseDate);
      endDate.setDate(baseDate.getDate() + (count * 7)); // count * 7 days
    }
    
    // Create recurring events
    const baseDate = new Date(baseEvent.start.dateTime);
    const dayIndex = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].indexOf(dayOfWeek);
    
    // Adjust base date to match day of week if needed
    const baseDayOfWeek = baseDate.getDay();
    if (baseDayOfWeek !== dayIndex) {
      // Find the next occurrence of the target day
      const daysToAdd = (dayIndex - baseDayOfWeek + 7) % 7;
      baseDate.setDate(baseDate.getDate() + daysToAdd);
    }
    
    // Start from base date and create recurring events
    const events = [];
    const currentDate = new Date(baseDate);
    
    while (currentDate <= endDate) {
      if (currentDate > baseDate) { // Skip the base event (already added)
        const eventStartDate = new Date(currentDate);
        const eventEndDate = new Date(currentDate);
        
        // Calculate end time based on base event duration
        const baseStartTime = new Date(baseEvent.start.dateTime);
        const baseEndTime = new Date(baseEvent.end.dateTime);
        const durationMs = baseEndTime - baseStartTime;
        
        // Set the same time for the new event
        eventStartDate.setHours(baseStartTime.getHours(), baseStartTime.getMinutes(), 0, 0);
        eventEndDate.setTime(eventStartDate.getTime() + durationMs);
        
        // Create the event
        const recurringEvent = {
          ...baseEvent,
          id: `${baseEvent.id}-${currentDate.toISOString().split('T')[0]}`,
          start: {
            dateTime: eventStartDate.toISOString(),
            timeZone: baseEvent.start.timeZone
          },
          end: {
            dateTime: eventEndDate.toISOString(),
            timeZone: baseEvent.end.timeZone
          },
          universalId, // Link all recurring events
          recurrenceId: baseEvent.id, // Reference the base event
          recurringEventDate: currentDate.toISOString().split('T')[0] // Store the date of this occurrence
        };
        
        // Remove recurrence rule from individual occurrences
        delete recurringEvent.recurrence;
        
        // Add to Firestore
        const eventsRef = collection(db, "calendarEvents");
        await addDoc(eventsRef, {
          ...recurringEvent,
          userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        events.push(recurringEvent);
      }
      
      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7);
    }
    
    return events;
  } catch (error) {
    console.error("Error creating recurring events:", error);
    return [];
  }
}

// Replace the updateEvent method with this enhanced version
async updateEvent(eventId, updateData, userId) {
  try {
    if (!eventId || !userId) {
      throw new Error("Event ID and User ID are required to update events");
    }
    
    console.log("Updating calendar event:", { eventId, updateFields: Object.keys(updateData) });
    
    // First, get the existing event to merge data properly
    const docRef = doc(db, "calendar_events", eventId);
    const eventDoc = await getDoc(docRef);
    
    if (!eventDoc.exists()) {
      throw new Error(`Event with ID ${eventId} not found`);
    }
    
    const existingEvent = eventDoc.data();
    
    // Standardize the update data
    const updates = {
      ...updateData,
      updatedAt: serverTimestamp()
    };
    
    // If there are changes to title/summary, ensure both fields are updated
    if (updates.title && !updates.summary) {
      updates.summary = updates.title;
    } else if (updates.summary && !updates.title) {
      updates.title = updates.summary;
    }
    
    // Preserve important metadata if not being explicitly updated
    const keysToPreserve = [
      'childId', 'childName', 'attendingParentId', 'siblingIds', 
      'siblingNames', 'eventType', 'extraDetails', 'familyId',
      'universalId', 'source'
    ];
    
    keysToPreserve.forEach(key => {
      if (existingEvent[key] && !updates[key]) {
        updates[key] = existingEvent[key];
      }
    });
    
    // Update in Firestore
    await updateDoc(docRef, updates);
    
    // Dispatch events for UI refresh - include all important details
    if (typeof window !== 'undefined') {
      const eventDetail = {
        eventId: eventId,
        universalId: existingEvent.universalId || eventId,
        title: updates.title || existingEvent.title,
        childId: updates.childId || existingEvent.childId,
        childName: updates.childName || existingEvent.childName,
        // Include all attendees for proper UI updates
        attendees: [
          ...(updates.siblingIds || existingEvent.siblingIds || []),
          updates.childId || existingEvent.childId
        ].filter(Boolean)
      };
      
      window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
      window.dispatchEvent(new CustomEvent('calendar-event-updated', {
        detail: eventDetail
      }));
    }
    
    this.showNotification("Event updated successfully", "success");
    
    return {
      success: true,
      eventId,
      universalId: existingEvent.universalId || eventId
    };
  } catch (error) {
    console.error("Error updating event:", error);
    this.showNotification("Failed to update event", "error");
    return { success: false, error: error.message || "Unknown error" };
  }
}

// Replace the deleteEvent method with this enhanced version
async deleteEvent(eventId, userId) {
  try {
    if (!eventId || !userId) {
      throw new Error("Event ID and User ID are required to delete events");
    }
    
    console.log("Deleting calendar event:", { eventId });
    
    // First, get the event to retrieve its universalId and other details
    const docRef = doc(db, "calendar_events", eventId);
    const eventDoc = await getDoc(docRef);
    
    if (!eventDoc.exists()) {
      throw new Error(`Event with ID ${eventId} not found`);
    }
    
    const eventData = eventDoc.data();
    const universalId = eventData.universalId || eventId;
    
    // Delete from Firestore
    await deleteDoc(docRef);
    
    // Check for and delete any linked events (for siblings)
    if (eventData.linkedToEventId || eventData.childId) {
      try {
        // Query for linked events
        const linkedEventsQuery = query(
          collection(db, "calendar_events"),
          where("linkedToEventId", "==", eventId)
        );
        
        const querySnapshot = await getDocs(linkedEventsQuery);
        
        // Delete all linked events
        const deletionPromises = [];
        querySnapshot.forEach((doc) => {
          deletionPromises.push(deleteDoc(doc.ref));
        });
        
        if (deletionPromises.length > 0) {
          await Promise.all(deletionPromises);
          console.log(`Deleted ${deletionPromises.length} linked events`);
        }
      } catch (linkedError) {
        console.warn("Error cleaning up linked events:", linkedError);
        // Continue with main deletion even if linked cleanup fails
      }
    }
    
    // Dispatch events for UI refresh
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
      window.dispatchEvent(new CustomEvent('calendar-event-deleted', {
        detail: { 
          eventId, 
          universalId,
          childId: eventData.childId,
          childName: eventData.childName
        }
      }));
    }
    
    this.showNotification("Event deleted from calendar", "success");
    
    return {
      success: true,
      universalId
    };
  } catch (error) {
    console.error("Error deleting event:", error);
    this.showNotification("Failed to delete event", "error");
    return { success: false, error: error.message || "Unknown error" };
  }
}

// Replace getEventsForUser method to properly handle rich event data
async getEventsForUser(userId, timeMin, timeMax) {
  try {
    if (!userId) {
      throw new Error("User ID is required to get events");
    }
    
    // Default to 30 days range if not provided
    if (!timeMin) {
      timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - 30);
    }
    
    if (!timeMax) {
      timeMax = new Date();
      timeMax.setDate(timeMax.getDate() + 60); // Show events two months ahead
    }
    
    // Get all events from calendar service
    const eventsQuery = query(
      collection(db, "calendar_events"),
      where("userId", "==", userId)
    );
    
    const querySnapshot = await getDocs(eventsQuery);
    const events = [];
    
    querySnapshot.forEach((doc) => {
      const eventData = doc.data();
      
      // Get the start and end times - handle different formats
      let startTime = null;
      if (eventData.start?.dateTime) {
        startTime = new Date(eventData.start.dateTime);
      } else if (eventData.start?.date) {
        startTime = new Date(eventData.start.date);
      } else if (eventData.date) {
        startTime = new Date(eventData.date);
      } else if (eventData.dateTime) {
        startTime = new Date(eventData.dateTime);
      }
      
      // Skip events without valid dates
      if (!startTime) {
        console.warn(`Event ${doc.id} has no valid start date, skipping`);
        return;
      }
      
      // Filter by date range
      if (startTime >= timeMin && startTime <= timeMax) {
        events.push({
          id: doc.id,
          universalId: eventData.universalId || doc.id,
          title: eventData.summary || eventData.title || 'Untitled Event',
          summary: eventData.summary || eventData.title || 'Untitled Event',
          description: eventData.description || '',
          date: eventData.start?.dateTime || eventData.start?.date || eventData.date || eventData.dateTime,
          dateObj: startTime,
          time: startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          
          // Include all metadata
          category: eventData.category || 'calendar',
          eventType: eventData.eventType || 'general',
          location: eventData.location || '',
          
          // Child and attendee information
          childId: eventData.childId || null,
          childName: eventData.childName || null,
          attendingParentId: eventData.attendingParentId || null,
          siblingIds: eventData.siblingIds || [],
          siblingNames: eventData.siblingNames || [],
          attendees: eventData.attendees || [],
          
          // Include extra details
          extraDetails: eventData.extraDetails || {},
          
          // Important IDs for CRUD operations
          firestoreId: doc.id,
          universalId: eventData.universalId || doc.id,
          
          // Source information
          source: eventData.source || 'manual',
          
          // End date/time
          dateEndObj: eventData.end?.dateTime ? new Date(eventData.end.dateTime) : null,
          
          // Linkage
          linkedEntity: eventData.linkedEntity || null,
          linkedToEventId: eventData.linkedToEventId || null
        });
      }
    });
    
    console.log(`Found ${events.length} events for user ${userId}`);
    
    // Sort by date
    return events.sort((a, b) => a.dateObj - b.dateObj);
  } catch (error) {
    console.error("Error getting events:", error);
    return [];
  }
}

/// In CalendarService.js - Find the addChildEvent method and replace it with this:
// Fix for CalendarService.js - replace the addChildEvent method
async addChildEvent(event, userId) {
  try {
    if (!userId) {
      throw new Error("User ID is required to add events");
    }
    
    console.log("Adding child calendar event:", {
      title: event.title || 'Untitled',
      childName: event.childName || 'Unknown child',
      hasDate: !!(event.dateTime),
      userId
    });
    
    // Ensure event has required fields
    if (!event.title) {
      event.title = "Untitled Child Event";
    }
    
    // Clean event object by removing any undefined fields
    const cleanedEvent = Object.fromEntries(
      Object.entries(event).filter(([_, value]) => value !== undefined)
    );
    
    // Format child event
    const standardizedEvent = {
      ...cleanedEvent,
      summary: cleanedEvent.title,
      description: cleanedEvent.description || '',
      start: {
        dateTime: cleanedEvent.dateTime instanceof Date 
          ? cleanedEvent.dateTime.toISOString() 
          : new Date(cleanedEvent.dateTime).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: cleanedEvent.endDateTime instanceof Date 
          ? cleanedEvent.endDateTime.toISOString() 
          : new Date(new Date(cleanedEvent.dateTime).getTime() + 60*60000).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      location: cleanedEvent.location || '',
      childId: cleanedEvent.childId,
      childName: cleanedEvent.childName,
      attendingParentId: cleanedEvent.attendingParentId,
      eventType: cleanedEvent.eventType || 'other',
      extraDetails: cleanedEvent.extraDetails || {},
      creationSource: cleanedEvent.creationSource || 'manual'
    };
    
    // Save event to Firestore
    const eventData = {
      ...standardizedEvent,
      userId,
      familyId: cleanedEvent.familyId || null,
      createdAt: serverTimestamp()
    };
    
    const eventRef = collection(db, "calendar_events"); // Use regular events collection, not child-specific
    const docRef = await addDoc(eventRef, eventData);
    
    // Dispatch a single event to notify components - NO force refresh to avoid duplication
    if (typeof window !== 'undefined') {
      const updateEvent = new CustomEvent('calendar-child-event-added', {
        detail: { 
          eventId: docRef.id, 
          childId: cleanedEvent.childId,
          childName: cleanedEvent.childName
        }
      });
      window.dispatchEvent(updateEvent);
    }
    
    // Show success notification
    this.showNotification(`${standardizedEvent.summary} added to your calendar for ${cleanedEvent.childName}`, "success");
    
    return {
      success: true,
      eventId: docRef.id,
      isMock: false
    };
  } catch (error) {
    console.error("Error adding child event to calendar:", error);
    this.showNotification("Failed to add child event to calendar", "error");
    return { success: false, error: error.message || "Unknown error" };
  }
}

// Create a date formatter that handles both US and SE formats
formatDateForDisplay(date, region = 'US') {
  if (!date) return '';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Format differently based on region
    if (region === 'SE') {
      // Swedish format: DD/MM/YYYY, 24-hour clock
      return {
        date: dateObj.toLocaleDateString('sv-SE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        time: dateObj.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', hour12: false })
      };
    } else {
      // US format: MM/DD/YYYY, 12-hour clock
      return {
        date: dateObj.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
        time: dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      };
    }
  } catch (error) {
    console.error("Error formatting date:", error);
    return { date: '', time: '' };
  }
}

// Add this method to CalendarService class
// Add this method to CalendarService class
async addChildEvent(event, userId) {
  try {
    if (!userId) {
      throw new Error("User ID is required to add events");
    }
    
    // Ensure event has required fields
    if (!event.title) {
      event.title = "Untitled Child Event";
    }
    
    // Format child event
    const standardizedEvent = {
      ...event,
      summary: event.title,
      description: event.description || '',
      start: {
        dateTime: event.dateTime instanceof Date ? event.dateTime.toISOString() : new Date(event.dateTime).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: event.endDateTime instanceof Date ? 
          event.endDateTime.toISOString() : 
          new Date(new Date(event.dateTime).getTime() + 60*60000).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      location: event.location || '',
      childId: event.childId,
      childName: event.childName,
      attendingParentId: event.attendingParentId,
      eventType: event.eventType || 'other',
      extraDetails: event.extraDetails || {},
      creationSource: event.creationSource || 'manual'
    };
    
    // Save event to Firestore
    const eventData = {
      ...standardizedEvent,
      userId,
      familyId: event.familyId || null,
      createdAt: serverTimestamp()
    };
    
    const eventRef = collection(db, "calendar_child_events");
    const docRef = await addDoc(eventRef, eventData);
    
    // Dispatch an event to notify components
    if (typeof window !== 'undefined') {
      const updateEvent = new CustomEvent('calendar-child-event-added', {
        detail: { eventId: docRef.id, childId: event.childId }
      });
      window.dispatchEvent(updateEvent);
    }
    
    // Show success notification
    this.showNotification(`Event "${standardizedEvent.summary}" added to your calendar for ${event.childName}`, "success");
    
    return {
      success: true,
      eventId: docRef.id,
      isMock: false
    };
  } catch (error) {
    console.error("Error adding child event to calendar:", error);
    this.showNotification("Failed to add child event to calendar", "error");
    return { success: false, error: error.message || "Unknown error" };
  }
}

// Create a date formatter that handles both US and SE formats
formatDateForDisplay(date, region = 'US') {
  if (!date) return '';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Format differently based on region
    if (region === 'SE') {
      // Swedish format: DD/MM/YYYY, 24-hour clock
      return {
        date: dateObj.toLocaleDateString('sv-SE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        time: dateObj.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', hour12: false })
      };
    } else {
      // US format: MM/DD/YYYY, 12-hour clock
      return {
        date: dateObj.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
        time: dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      };
    }
  } catch (error) {
    console.error("Error formatting date:", error);
    return { date: '', time: '' };
  }
}




  // Get events for a user
  async getEventsForUser(userId, timeMin, timeMax) {
    try {
      if (!userId) {
        throw new Error("User ID is required to get events");
      }
      
      const eventsQuery = query(
        collection(db, "calendar_events"),
        where("userId", "==", userId)
      );
      
      const querySnapshot = await getDocs(eventsQuery);
      const events = [];
      
      querySnapshot.forEach((doc) => {
        const eventData = doc.data();
        
        // Filter by date range
        const startTime = new Date(eventData.start.dateTime || eventData.start.date);
        const endTime = new Date(eventData.end.dateTime || eventData.end.date);
        
        if (startTime >= timeMin && startTime <= timeMax) {
          events.push({
            id: doc.id,
            ...eventData
          });
        }
      });
      
      return events;
    } catch (error) {
      console.error("Error getting events:", error);
      throw error;
    }
  }

  // Generate an ICS file for download
  async generateICSFile(event) {
    console.log("Generating ICS file for download");
    
    try {
      // Create ICS content
      const startTime = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date);
      const endTime = event.end.dateTime ? new Date(event.end.dateTime) : new Date(event.end.date);
      
      const formatDateForICS = (date) => {
        return date.toISOString().replace(/-|:|\.\d+/g, '').substring(0, 15) + 'Z';
      };
      
      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `SUMMARY:${event.summary || 'Untitled Event'}`,
        `DTSTART:${formatDateForICS(startTime)}`,
        `DTEND:${formatDateForICS(endTime)}`,
        `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
        `LOCATION:${event.location || ''}`,
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');
      
      // Create and download the ICS file
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${(event.summary || 'event').replace(/\s+/g, '_')}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Show success notification
      this.showNotification("Calendar file downloaded successfully", "success");
      
      return { success: true, downloadInitiated: true };
    } catch (error) {
      console.error("Error generating ICS file:", error);
      this.showNotification("Failed to generate calendar file", "error");
      return { success: false, error: error.message || "Unknown error" };
    }
  }

  showNotification(message, type = "info") {
    if (typeof window === 'undefined') return;
    
    // First check if we already have a notification container
    let container = document.getElementById('allie-notification-container');
    
    // Create container if it doesn't exist
    if (!container) {
      container = document.createElement('div');
      container.id = 'allie-notification-container';
      container.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; 
        z-index: 9999; display: flex; flex-direction: column;
        gap: 10px; max-width: 350px;
      `;
      document.body.appendChild(container);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    
    const bgColor = type === "success" ? "#4caf50" : 
                  type === "error" ? "#f44336" : 
                  type === "warning" ? "#ff9800" : "#2196f3";
                  
    notification.style.cssText = `
      background: ${bgColor}; color: white; padding: 12px 20px;
      border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      font-family: Roboto, sans-serif; animation: slideIn 0.3s ease-out;
      display: flex; align-items: center; justify-content: space-between;
    `;
    
    // Add message
    const messageSpan = document.createElement('span');
    messageSpan.innerText = message;
    notification.appendChild(messageSpan);
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      background: transparent; border: none; color: white;
      font-size: 18px; margin-left: 10px; cursor: pointer;
    `;
    closeBtn.onclick = () => notification.remove();
    notification.appendChild(closeBtn);
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    
    // Add to container
    container.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.style.animation = 'fadeOut 0.3s ease-out forwards';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  // Create event object from a task
  createEventFromTask(task) {
    // Calculate event start and end time
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 1); // Start in 1 hour
    
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1); // 1 hour duration
    
    // Create event object
    return {
      'summary': `Allie Task: ${task.title || 'Untitled Task'}`,
      'description': `${task.description || ''}\n\nAssigned to: ${task.assignedToName || 'Unknown'}\nCategory: ${task.category || task.focusArea || 'Unknown'}`,
      'start': {
        'dateTime': startTime.toISOString(),
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      'end': {
        'dateTime': endTime.toISOString(),
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      'reminders': {
        'useDefault': false,
        'overrides': [
          {'method': 'popup', 'minutes': 10}
        ]
      }
    };
  }

  // Create event for family meeting
  createFamilyMeetingEvent(weekNumber, meetingDate) {
    // Default to next Sunday if no date provided
    if (!meetingDate) {
      meetingDate = new Date();
      meetingDate.setDate(meetingDate.getDate() + (7 - meetingDate.getDay())); // Next Sunday
      meetingDate.setHours(19, 0, 0, 0); // 7:00 PM
    }
    
    const endTime = new Date(meetingDate);
    endTime.setMinutes(endTime.getMinutes() + 30); // 30 min duration
    
    return {
      'summary': `Allie Family Meeting - Week ${weekNumber || '?'}`,
      'description': 'Weekly family meeting to discuss task balance and set goals for the coming week.',
      'start': {
        'dateTime': meetingDate.toISOString(),
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      'end': {
        'dateTime': endTime.toISOString(),
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      'reminders': {
        'useDefault': false,
        'overrides': [
          {'method': 'popup', 'minutes': 60},
          {'method': 'email', 'minutes': 1440} // 24 hours before
        ]
      },
      'colorId': '6' // Blue
    };
  }

  // Create event for task reminder
  createTaskReminderEvent(task, reminderDate) {
    if (!reminderDate) {
      reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + 1); // Default to tomorrow
      reminderDate.setHours(10, 0, 0, 0); // 10:00 AM
    }
    
    const endTime = new Date(reminderDate);
    endTime.setMinutes(endTime.getMinutes() + 30);
    
    return {
      'summary': `Reminder: ${task.title || 'Task Reminder'}`,
      'description': `This is a reminder to complete your Allie task: ${task.description || 'No description provided'}`,
      'start': {
        'dateTime': reminderDate.toISOString(),
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      'end': {
        'dateTime': endTime.toISOString(),
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      'reminders': {
        'useDefault': false,
        'overrides': [
          {'method': 'popup', 'minutes': 30}
        ]
      },
      'colorId': '10' // Green
    };
  }
}

export default new CalendarService();