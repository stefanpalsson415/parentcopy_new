/**
 * CalendarOperations.js
 * 
 * A utility library for standardized calendar operations used across the application.
 * Provides common helper functions for consistent event formatting, display, and processing.
 */

import CalendarService from '../services/CalendarService';

/**
 * Format date for display
 * 
 * @param {string|Date} date - Date to format
 * @param {string} format - Format type: 'full', 'short', 'time', 'datetime', 'iso'
 * @param {string} locale - Locale for formatting (defaults to user's locale)
 * @returns {string} - Formatted date string
 */
export const formatDate = (date, format = 'full', locale = undefined) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    console.warn('Invalid date provided to formatDate:', date);
    return '';
  }
  
  switch (format) {
    case 'full':
      return dateObj.toLocaleDateString(locale, { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      });
    
    case 'short':
      return dateObj.toLocaleDateString(locale, { 
        month: 'short', 
        day: 'numeric'
      });
    
    case 'time':
      return dateObj.toLocaleTimeString(locale, { 
        hour: '2-digit', 
        minute: '2-digit'
      });
    
    case 'datetime':
      return dateObj.toLocaleDateString(locale, { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit'
      });
    
    case 'iso':
      return dateObj.toISOString();
    
    default:
      return dateObj.toLocaleDateString(locale);
  }
};

/**
 * Create a standard event object from different source types
 * 
 * @param {Object} sourceEvent - Event data from various sources
 * @param {string} sourceType - Type of source: 'task', 'meeting', 'appointment', 'activity', etc.
 * @param {Object} options - Additional options like userId, familyId, selectedDate, etc.
 * @returns {Object} - Standardized event object ready for CalendarService
 */
export const createStandardEvent = (sourceEvent, sourceType, options = {}) => {
  const {
    userId, 
    familyId, 
    selectedDate = null
  } = options;
  
  // Default event object
  const standardEvent = {
    summary: '',
    title: '',
    description: '',
    source: 'calendar-operations',
    userId,
    familyId,
    start: { 
      dateTime: selectedDate ? new Date(selectedDate).toISOString() : new Date().toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    end: {
      dateTime: selectedDate ? 
        new Date(new Date(selectedDate).getTime() + 60 * 60 * 1000).toISOString() : 
        new Date(new Date().getTime() + 60 * 60 * 1000).toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  };
  
  // Handle different source types
  switch (sourceType) {
    case 'task':
      return {
        ...standardEvent,
        summary: `Allie Task: ${sourceEvent.title || 'Untitled Task'}`,
        title: `Allie Task: ${sourceEvent.title || 'Untitled Task'}`,
        description: `${sourceEvent.description || ''}\n\nAssigned to: ${sourceEvent.assignedToName || 'Unknown'}\nCategory: ${sourceEvent.category || sourceEvent.focusArea || 'Unknown'}`,
        category: 'task',
        eventType: 'task',
        assignedTo: sourceEvent.assignedTo,
        assignedToName: sourceEvent.assignedToName,
        linkedEntity: {
          type: 'task',
          id: sourceEvent.id
        }
      };
    
    case 'meeting':
      const meetingDate = sourceEvent.dateObj || selectedDate || new Date();
      if (meetingDate.getDay() !== 0 && !sourceEvent.dateObj) {
        // If not already on Sunday and no specific date provided, set to next Sunday
        meetingDate.setDate(meetingDate.getDate() + (7 - meetingDate.getDay()));
        meetingDate.setHours(19, 0, 0, 0); // 7:00 PM
      }
      
      const endTime = new Date(meetingDate);
      endTime.setMinutes(endTime.getMinutes() + 60); // 1 hour duration
      
      return {
        ...standardEvent,
        summary: `Cycle ${sourceEvent.weekNumber || '?'} Family Meeting`,
        title: `Cycle ${sourceEvent.weekNumber || '?'} Family Meeting`,
        description: 'Weekly family meeting to discuss task balance and set goals for the coming week.',
        category: 'meeting',
        eventType: 'meeting',
        weekNumber: sourceEvent.weekNumber,
        start: {
          dateTime: meetingDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        linkedEntity: {
          type: 'meeting',
          id: sourceEvent.weekNumber || sourceEvent.id
        }
      };
    
    case 'appointment':
      // Medical appointments
      const appointmentDate = sourceEvent.dateObj || selectedDate || new Date();
      
      // Format title based on child's name
      const appointmentTitle = sourceEvent.childName ? 
        `${sourceEvent.childName}'s ${sourceEvent.title || 'Appointment'}` : 
        sourceEvent.title || 'Appointment';
      
      return {
        ...standardEvent,
        summary: appointmentTitle,
        title: appointmentTitle,
        description: sourceEvent.description || sourceEvent.notes || '',
        category: 'appointment',
        eventType: 'appointment',
        childId: sourceEvent.childId,
        childName: sourceEvent.childName,
        location: sourceEvent.location || '',
        start: {
          dateTime: appointmentDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: new Date(appointmentDate.getTime() + 30 * 60 * 1000).toISOString(), // 30 minutes
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        linkedEntity: sourceEvent.linkedEntity || {
          type: 'child',
          id: sourceEvent.childId
        }
      };
      
    case 'activity':
      // Activity (sports, classes, etc.)
      const activityDate = sourceEvent.dateObj || sourceEvent.startDate || selectedDate || new Date();
      
      // Set default time if not already set
      if (!sourceEvent.dateObj && !sourceEvent.startDate) {
        activityDate.setHours(15, 0, 0, 0); // 3:00 PM default for activities
      }
      
      // Format title based on child's name
      const activityTitle = sourceEvent.childName ? 
        `${sourceEvent.childName}'s ${sourceEvent.title || 'Activity'}` : 
        sourceEvent.title || 'Activity';
      
      // Determine event duration
      const endDate = sourceEvent.endDateTime || sourceEvent.endDate ? 
        new Date(sourceEvent.endDateTime || sourceEvent.endDate) : 
        new Date(activityDate.getTime() + 60 * 60 * 1000); // 1 hour default
      
      return {
        ...standardEvent,
        summary: activityTitle,
        title: activityTitle,
        description: sourceEvent.description || sourceEvent.notes || '',
        category: 'activity',
        eventType: 'activity',
        childId: sourceEvent.childId,
        childName: sourceEvent.childName,
        location: sourceEvent.location || '',
        start: {
          dateTime: activityDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        linkedEntity: sourceEvent.linkedEntity || {
          type: 'child',
          id: sourceEvent.childId
        }
      };
    
    case 'parsed':
      // Events parsed from text/images - already have most fields
      const parsedDate = sourceEvent.dateObj || sourceEvent.dateTime ? 
        new Date(sourceEvent.dateObj || sourceEvent.dateTime) : 
        selectedDate || new Date();
      
      // Ensure there's an end time (1 hour after start)
      const parsedEndDate = sourceEvent.dateEndObj ? 
        new Date(sourceEvent.dateEndObj) : 
        new Date(parsedDate.getTime() + 60 * 60 * 1000);
      
      return {
        ...standardEvent,
        summary: sourceEvent.title || 'Event',
        title: sourceEvent.title || 'Event',
        description: sourceEvent.description || '',
        category: sourceEvent.eventType || 'event',
        eventType: sourceEvent.eventType || 'event',
        childId: sourceEvent.childId,
        childName: sourceEvent.childName,
        location: sourceEvent.location || '',
        hostParent: sourceEvent.hostParent || '',
        attendingParentId: sourceEvent.attendingParentId,
        siblingIds: sourceEvent.siblingIds,
        siblingNames: sourceEvent.siblingNames,
        extraDetails: sourceEvent.extraDetails || {},
        start: {
          dateTime: parsedDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: parsedEndDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        source: 'parser',
        originalText: sourceEvent.originalText,
        linkedEntity: sourceEvent.linkedEntity
      };
      
    default:
      // Generic event
      return {
        ...standardEvent,
        summary: sourceEvent.title || 'Event',
        title: sourceEvent.title || 'Event',
        description: sourceEvent.description || '',
        location: sourceEvent.location || '',
        category: sourceEvent.category || 'event',
        eventType: sourceEvent.eventType || 'event'
      };
  }
};

/**
 * Add an event to calendar with standard processing
 * 
 * @param {Object} event - Event to add
 * @param {string} userId - User ID 
 * @param {Function} onSuccess - Callback on success
 * @param {Function} onError - Callback on error
 * @returns {Promise<Object>} - Result from CalendarService
 */
export const addEventToCalendar = async (event, userId, onSuccess = null, onError = null) => {
  try {
    if (!userId) {
      throw new Error("User ID is required to add events");
    }
    
    // Check for required fields
    if (!event.title && !event.summary) {
      throw new Error("Event must have a title");
    }
    
    // Ensure we have both title and summary (for compatibility)
    const processedEvent = {
      ...event,
      title: event.title || event.summary,
      summary: event.summary || event.title
    };
    
    // Call the CalendarService
    const result = await CalendarService.addEvent(processedEvent, userId);
    
    if (result.success) {
      // Show notification
      CalendarService.showNotification("Event added to calendar", "success");
      
      // Trigger UI refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
      }
      
      // Call success callback if provided
      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess(result);
      }
    } else {
      throw new Error(result.error || "Failed to add event to calendar");
    }
    
    return result;
  } catch (error) {
    console.error("Error adding event to calendar:", error);
    CalendarService.showNotification("Failed to add event to calendar", "error");
    
    // Call error callback if provided
    if (onError && typeof onError === 'function') {
      onError(error);
    }
    
    return { success: false, error: error.message };
  }
};

/**
 * Create a unique event key for tracking
 * 
 * @param {Object} event - Event to generate key for
 * @returns {string} - Unique key
 */
export const getEventKey = (event) => {
  if (!event) return null;
  
  // Try to create a unique identifier based on event properties
  let key = '';
  
  if (event.id) key += event.id; // Use ID first if available
  else {
    if (event.title) key += event.title;
    if (event.dateObj) key += '-' + event.dateObj.toISOString().split('T')[0];
    if (event.childName) key += '-' + event.childName;
    // If ID was missing but we have firestoreId, add it
    if (event.firestoreId) key += '-' + event.firestoreId;
  }
  
  return key.toLowerCase().replace(/\s+/g, '-');
};

/**
 * Create a signature for duplicate detection
 * 
 * @param {Object} event - Event to create signature for
 * @returns {string} - Event signature
 */
export const createEventSignature = (event) => {
  // Normalize title/summary
  const title = event.summary || event.title || '';
  
  // Get child name if available
  const childName = event.childName || '';
  
  // Normalize date format
  let dateStr = '';
  if (event.start?.dateTime) {
    dateStr = event.start.dateTime;
  } else if (event.start?.date) {
    dateStr = event.start.date;
  } else if (event.date) {
    dateStr = event.date;
  } else if (event.dateObj) {
    dateStr = event.dateObj.toISOString();
  }
  
  // Extract just the date part for consistency
  const datePart = dateStr.split('T')[0] || '';
  
  // Create signature that will match similar events
  return `${childName}-${title}-${datePart}`.toLowerCase();
};

// Export additional helpers from CalendarService to ensure consistency
export const { 
  formatDateForDisplay,
  createEventFromTask,
  createFamilyMeetingEvent,
  createTaskReminderEvent
} = CalendarService;

export default {
  formatDate,
  createStandardEvent,
  addEventToCalendar,
  getEventKey,
  createEventSignature,
  formatDateForDisplay,
  createEventFromTask,
  createFamilyMeetingEvent,
  createTaskReminderEvent
};