// src/services/CalendarOperations.js

/**
 * Utility service for standardized calendar operations
 * Provides common functions for date handling, event creation, and validation
 */
class CalendarOperations {
  /**
   * Create a standardized event object for consistent calendar entries
   * @param {Object} eventData - Event data with required fields
   * @returns {Object} - Standardized event object
   */
  createStandardEvent(eventData) {
    // Ensure we have required fields
    if (!eventData.title) {
      throw new Error("Event title is required");
    }
    
    if (!eventData.startDate) {
      throw new Error("Event start date is required");
    }
    
    // Generate a unique ID if not provided
    const eventId = eventData.id || this.generateEventId();
    
    // Calculate end date based on duration or endDate
    let endDate;
    if (eventData.endDate) {
      endDate = new Date(eventData.endDate);
    } else if (eventData.duration) {
      endDate = new Date(eventData.startDate);
      endDate.setMinutes(endDate.getMinutes() + eventData.duration);
    } else {
      // Default to 1 hour if no duration or end date specified
      endDate = new Date(eventData.startDate);
      endDate.setHours(endDate.getHours() + 1);
    }
    
    // Ensure dates are in the correct format
    const startDateTime = eventData.startDate instanceof Date ? 
      eventData.startDate : new Date(eventData.startDate);
    
    // Create standard event object with Google Calendar compatible structure
    const standardEvent = {
      id: eventId,
      summary: eventData.title,
      title: eventData.title,
      description: eventData.description || '',
      location: eventData.location || '',
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      reminders: {
        useDefault: false,
        overrides: eventData.reminders || [{ method: 'popup', minutes: 30 }]
      },
      colorId: eventData.colorId || '1',
      category: eventData.category || 'general',
      eventType: eventData.eventType || 'general',
      metadata: eventData.metadata || {}
    };
    
    return standardEvent;
  }
  
  /**
   * Generate a unique ID for an event
   * @returns {string} - Unique event ID
   */
  generateEventId() {
    return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Parse a date and time string into a Date object
   * @param {string} dateStr - Date string (YYYY-MM-DD)
   * @param {string} timeStr - Time string (HH:MM)
   * @returns {Date} - Parsed date
   */
  parseDateTime(dateStr, timeStr = '00:00') {
    try {
      // Try direct parsing for ISO format
      const fullDateTimeStr = `${dateStr}T${timeStr}`;
      const date = new Date(fullDateTimeStr);
      
      // Check if we got a valid date
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      // Fallback parsing for non-standard formats
      const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
      const [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));
      
      // Month is 0-indexed in Date constructor
      return new Date(year, month - 1, day, hours, minutes);
    } catch (error) {
      console.error("Error parsing date/time:", error);
      return new Date(); // Return current date/time as fallback
    }
  }
  
  /**
   * Parse a date string into a Date object (ignoring time)
   * @param {string} dateStr - Date string
   * @returns {Date} - Parsed date with time set to 00:00:00
   */
  parseDate(dateStr) {
    try {
      // For standard date formats
      if (dateStr.includes('-') || dateStr.includes('/')) {
        const date = new Date(dateStr);
        // Reset time to midnight
        date.setHours(0, 0, 0, 0);
        return date;
      }
      
      // Try to handle more exotic formats
      return new Date(Date.parse(dateStr));
    } catch (error) {
      console.error("Error parsing date:", error);
      return new Date(); // Return current date as fallback
    }
  }
  
  /**
   * Get the next occurrence of a specific weekday
   * @param {number} dayOfWeek - 0 for Sunday, 1 for Monday, etc.
   * @returns {Date} - Date of the next occurrence
   */
  getNextWeekdayDate(dayOfWeek) {
    const date = new Date();
    const currentDay = date.getDay(); // 0-6, Sunday-Saturday
    
    // Calculate days to add to get to the desired weekday
    const daysToAdd = (7 + dayOfWeek - currentDay) % 7;
    
    // If today is the desired day, add a full week
    date.setDate(date.getDate() + (daysToAdd === 0 ? 7 : daysToAdd));
    
    // Reset time to midnight
    date.setHours(0, 0, 0, 0);
    
    return date;
  }
  
  /**
   * Get next weekend evening (Saturday at 7 PM)
   * @returns {Date} - Date object for next Saturday at 7 PM
   */
  getNextWeekendEvening() {
    const date = this.getNextWeekdayDate(6); // 6 = Saturday
    date.setHours(19, 0, 0, 0); // 7 PM
    return date;
  }
  
  /**
   * Format a date for display
   * @param {Date|string} date - Date to format
   * @param {string} format - Format style ('short', 'medium', 'long', 'full')
   * @returns {string} - Formatted date string
   */
  formatDate(date, format = 'medium') {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      
      if (isNaN(dateObj.getTime())) {
        throw new Error("Invalid date");
      }
      
      // Different format options
      switch (format) {
        case 'short':
          return dateObj.toLocaleDateString('en-US', { 
            month: 'numeric', 
            day: 'numeric' 
          });
        case 'medium':
          return dateObj.toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short', 
            day: 'numeric'
          });
        case 'long':
          return dateObj.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long', 
            day: 'numeric'
          });
        case 'full':
          return dateObj.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
          });
        default:
          return dateObj.toLocaleDateString();
      }
    } catch (error) {
      console.error("Error formatting date:", error);
      return 'Invalid date';
    }
  }
  
  /**
   * Format a time for display
   * @param {Date|string} date - Date/time to format
   * @returns {string} - Formatted time (e.g., "7:30 PM")
   */
  formatTime(date) {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      
      if (isNaN(dateObj.getTime())) {
        throw new Error("Invalid date");
      }
      
      return dateObj.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error("Error formatting time:", error);
      return 'Invalid time';
    }
  }
}

export default new CalendarOperations();