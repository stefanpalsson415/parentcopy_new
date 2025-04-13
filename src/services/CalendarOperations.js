// src/services/CalendarOperations.js
/**
 * Utility service for standardized calendar operations
 * Provides consistent methods for date formatting, event creation, and error handling
 */

/**
 * Standardize a date object to ensure consistent format
 * @param {Date} date - Date object to standardize
 * @returns {Date} Standardized Date object
 */
export const standardizeDate = (date) => {
    if (!date) return new Date();
    
    // Ensure date is a valid Date object
    let validDate;
    if (date instanceof Date) {
      validDate = date;
    } else if (typeof date === 'string') {
      validDate = new Date(date);
    } else if (typeof date === 'number') {
      validDate = new Date(date);
    } else {
      validDate = new Date();
    }
    
    // If resulting date is invalid, return current date
    if (isNaN(validDate.getTime())) {
      console.warn("Invalid date standardized to current date");
      return new Date();
    }
    
    return validDate;
  };
  
  /**
   * Create a standardized event object for calendar
   * @param {Object} eventData - Event data
   * @returns {Object} Standardized event object
   */
  export const createStandardEvent = (eventData) => {
    // Required fields with defaults
    const defaultEvent = {
      id: createEventId(),
      title: 'New Event',
      start: standardizeDate(new Date()),
      end: standardizeDate(new Date(new Date().getTime() + 60 * 60 * 1000)), // 1 hour later
      allDay: false,
      location: '',
      description: '',
      category: 'general',
      createdBy: null,
      createdAt: new Date().toISOString()
    };
    
    // Merge with provided data
    const event = { ...defaultEvent, ...eventData };
    
    // Ensure dates are standardized
    event.start = standardizeDate(event.start);
    event.end = standardizeDate(event.end);
    
    // Ensure end is after start
    if (event.end < event.start) {
      event.end = new Date(event.start.getTime() + 60 * 60 * 1000); // 1 hour after start
    }
    
    return event;
  };
  
  /**
   * Generate a unique event ID
   * @returns {string} Unique event ID
   */
  export const createEventId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };
  
  /**
   * Format date for display
   * @param {Date} date - Date to format
   * @param {string} format - Format style ('short', 'medium', 'long')
   * @returns {string} Formatted date string
   */
  export const formatDate = (date, format = 'medium') => {
    const validDate = standardizeDate(date);
    
    switch (format) {
      case 'short':
        return validDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      case 'long':
        return validDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        });
      case 'time':
        return validDate.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
      case 'datetime':
        return validDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      case 'medium':
      default:
        return validDate.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        });
    }
  };
  
  /**
   * Safe function to execute calendar operations with error handling
   * @param {Function} operation - Function to execute
   * @param {any} fallback - Fallback value if operation fails
   * @returns {any} Result of operation or fallback
   */
  export const safeCalendarOperation = async (operation, fallback = null) => {
    try {
      return await operation();
    } catch (error) {
      console.error("Calendar operation failed:", error);
      return fallback;
    }
  };
  
  export default {
    standardizeDate,
    createStandardEvent,
    createEventId,
    formatDate,
    safeCalendarOperation
  };