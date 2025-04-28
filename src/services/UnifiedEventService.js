// src/services/UnifiedEventService.js
import EventStore from './EventStore';
import { db } from './firebase';
import { serverTimestamp } from 'firebase/firestore';

class UnifiedEventService {
  constructor() {
    this.eventStore = EventStore;
    this.listeners = new Set();
  }

  /**
   * Add a new event with standardized handling regardless of source
   * @param {object} eventData - Event details
   * @param {string} userId - User ID
   * @param {string} familyId - Family ID
   * @param {object} options - Additional options
   * @returns {Promise<object>} Result with success status and event ID
   */
  async addEvent(eventData, userId, familyId, options = {}) {
    try {
      console.log("UnifiedEventService: Adding event:", { 
        title: eventData.title || eventData.summary || "Untitled", 
        type: eventData.eventType || eventData.category || "general",
        source: options.source || "unified",
        userId, 
        familyId
      });
      
      // Standardize and validate the event data
      const standardizedEvent = this.standardizeEvent({
        ...eventData,
        userId,
        familyId
      });
      
      // Store in Firebase using EventStore
      const result = await this.eventStore.addEvent(standardizedEvent, userId, familyId);
      
      // Notify React components and other listeners
      this.notifyStateSystem(standardizedEvent, result);
      
      return result;
    } catch (error) {
      console.error("UnifiedEventService: Error adding event:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update an existing event
   * @param {string} eventId - Event ID
   * @param {object} updateData - Fields to update
   * @param {string} userId - User ID
   * @returns {Promise<object>} Result with success status
   */
  async updateEvent(eventId, updateData, userId) {
    try {
      console.log("UnifiedEventService: Updating event:", { eventId, userId });
      
      // Standardize the update data
      const standardizedUpdate = this.standardizeEvent(updateData, true);
      
      // Update in Firebase using EventStore
      const result = await this.eventStore.updateEvent(eventId, standardizedUpdate, userId);
      
      // Notify React components and other listeners
      if (result.success) {
        this.notifyStateSystem({
          ...standardizedUpdate,
          id: eventId,
          firestoreId: eventId
        }, result, 'update');
      }
      
      return result;
    } catch (error) {
      console.error("UnifiedEventService: Error updating event:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete an event
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Result with success status
   */
  async deleteEvent(eventId, userId) {
    try {
      console.log("UnifiedEventService: Deleting event:", { eventId, userId });
      
      // Delete in Firebase using EventStore
      const result = await this.eventStore.deleteEvent(eventId, userId);
      
      // Notify React components and other listeners
      if (result.success) {
        this.notifyStateSystem({ id: eventId, firestoreId: eventId }, result, 'delete');
      }
      
      return result;
    } catch (error) {
      console.error("UnifiedEventService: Error deleting event:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get events for a user with optional filtering
   * @param {string} userId - User ID
   * @param {Date} startDate - Start date for range
   * @param {Date} endDate - End date for range
   * @param {object} options - Additional filtering options
   * @returns {Promise<Array>} Array of events
   */
  async getEvents(userId, startDate = null, endDate = null, options = {}) {
    try {
      // Get events from EventStore
      const events = await this.eventStore.getEventsForUser(userId, startDate, endDate);
      
      // Apply additional filters if specified
      let filteredEvents = events;
      
      if (options.childId) {
        filteredEvents = filteredEvents.filter(event => 
          event.childId === options.childId || 
          (event.attendees && event.attendees.some(a => a.id === options.childId))
        );
      }
      
      if (options.category) {
        filteredEvents = filteredEvents.filter(event => 
          event.category === options.category || event.eventType === options.category
        );
      }
      
      if (options.filterBy && typeof options.filterBy === 'function') {
        filteredEvents = filteredEvents.filter(options.filterBy);
      }
      
      return filteredEvents;
    } catch (error) {
      console.error("UnifiedEventService: Error getting events:", error);
      return [];
    }
  }

  /**
   * Get events for a specific family cycle
   * @param {string} familyId - Family ID
   * @param {number} cycleNumber - Cycle number
   * @returns {Promise<Array>} Array of events
   */
  async getEventsForCycle(familyId, cycleNumber) {
    try {
      return await this.eventStore.getEventsForCycle(familyId, cycleNumber);
    } catch (error) {
      console.error("UnifiedEventService: Error getting cycle events:", error);
      return [];
    }
  }

  /**
   * Get a specific event by ID
   * @param {string} eventId - Event ID
   * @returns {Promise<object>} Event object or null
   */
  async getEventById(eventId) {
    try {
      return await this.eventStore.getEventById(eventId);
    } catch (error) {
      console.error("UnifiedEventService: Error getting event:", error);
      return null;
    }
  }

  /**
   * Force a refresh of all events
   * @param {string} userId - User ID
   * @param {string} familyId - Family ID
   * @returns {Promise<Array>} Fresh array of events
   */
  async refreshEvents(userId, familyId = null) {
    try {
      return await this.eventStore.refreshEvents(userId, familyId);
    } catch (error) {
      console.error("UnifiedEventService: Error refreshing events:", error);
      return [];
    }
  }

  /**
   * Standardize event object with consistent formatting
   * @param {object} eventData - Event data to standardize
   * @param {boolean} isUpdate - Whether this is for an update operation
   * @returns {object} Standardized event object
   */
  standardizeEvent(eventData, isUpdate = false) {
    // For updates, we only include the fields that are provided
    if (isUpdate) {
      const update = {};
      
      // Only copy fields that are explicitly provided
      Object.keys(eventData).forEach(key => {
        if (eventData[key] !== undefined) {
          update[key] = eventData[key];
        }
      });
      
      // Always add updatedAt
      update.updatedAt = serverTimestamp();
      
      return update;
    }
    
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

    // Make sure dates are valid
    if (isNaN(startDate.getTime())) {
      console.warn("Invalid start date detected, using current time instead");
      startDate = new Date();
    }

    if (isNaN(endDate.getTime())) {
      console.warn("Invalid end date detected, using start date + 1 hour instead");
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    }
    
    // Standardize attendees format if provided
    const attendees = eventData.attendees ? eventData.attendees.map(attendee => {
      // Ensure each attendee has id, name, role
      if (typeof attendee === 'string') {
        return { id: attendee, name: attendee, role: 'general' };
      }
      return {
        id: attendee.id || 'unknown-id',
        name: attendee.name || 'Unknown',
        role: attendee.role || 'general',
        ...attendee
      };
    }) : [];

    return {
      // Identity fields - preserve any that exist
      id: eventData.id,
      firestoreId: eventData.firestoreId,
      universalId: eventData.universalId,
      
      // Core event data
      title: eventData.title || eventData.summary || "Untitled Event",
      summary: eventData.summary || eventData.title || "Untitled Event",
      description: eventData.description || "",
      
      // Date information in all required formats
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
      attendees,
      
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
      
      // Pass through any appointment-specific details
      appointmentDetails: eventData.appointmentDetails || null,
      
      // Pass through any activity-specific details
      activityDetails: eventData.activityDetails || null,
      
      // Timestamps
      createdAt: eventData.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    };
  }

  /**
   * Subscribe to event changes
   * @param {function} callback - Function to call when events change
   * @returns {function} Unsubscribe function
   */
  subscribe(callback) {
    if (typeof callback === 'function') {
      this.listeners.add(callback);
      
      // Also subscribe to EventStore to get its notifications
      const unsubEventStore = this.eventStore.subscribe(callback);
      
      return () => {
        this.listeners.delete(callback);
        unsubEventStore();
      };
    }
    return () => {};
  }

  /**
   * Notify all listeners of event changes
   * @param {object} event - The event that changed
   * @param {object} result - Result of the operation
   * @param {string} action - The action performed (add, update, delete)
   */
  notifyStateSystem(event, result, action = 'add') {
    // Notify our own listeners
    this.listeners.forEach(listener => {
      try {
        listener(action, event);
      } catch (error) {
        console.error("Error in event listener:", error);
      }
    });
    
    // Dispatch DOM events for React components
    if (typeof window !== 'undefined') {
      // First ensure the calendar refreshes
      window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
      
      // Then dispatch the specific event action
      window.dispatchEvent(new CustomEvent(`calendar-event-${action}d`, {
        detail: { 
          eventId: event.id || event.firestoreId,
          universalId: event.universalId,
          event: event
        }
      }));
    }
  }
}

export default new UnifiedEventService();