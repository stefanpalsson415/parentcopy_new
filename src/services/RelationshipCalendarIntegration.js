// src/services/RelationshipCalendarIntegration.js
import CalendarService from './CalendarService';
import CalendarOperations from './CalendarOperations';

/**
 * Helper service for integrating relationship activities with the calendar
 * This centralizes all calendar-related functionality for relationship features
 */
class RelationshipCalendarIntegration {
  /**
   * Add a couple check-in event to the calendar
   * @param {string} userId - The user ID
   * @param {number} cycleNumber - The relationship cycle number
   * @param {Object} checkInData - The check-in data
   * @param {Date} scheduleDate - Optional date to schedule, defaults to now+1 day
   * @returns {Promise<Object>} - Result of the calendar addition
   */
  async addCheckInToCalendar(userId, cycleNumber, checkInData, scheduleDate = null) {
    try {
      if (!userId) throw new Error("User ID is required");
      
      // Default to tomorrow if no date provided
      if (!scheduleDate) {
        scheduleDate = new Date();
        scheduleDate.setDate(scheduleDate.getDate() + 1);
        scheduleDate.setHours(19, 0, 0, 0); // 7 PM
      }
      
      // Create standardized event using CalendarOperations
      const eventData = {
        title: `Couple Check-in (Cycle ${cycleNumber})`,
        description: `Regular check-in to connect and strengthen your relationship.\n\n${
          checkInData?.description || 'Take 5-10 minutes to connect and share your day with your partner.'
        }`,
        startDate: scheduleDate,
        duration: 30, // 30 minutes
        location: '',
        category: 'relationship',
        eventType: 'check-in',
        colorId: '6', // Pink
        metadata: {
          cycleNumber,
          relationshipActivity: true
        },
        reminders: [
          { method: 'popup', minutes: 60 }, // 1 hour before
          { method: 'popup', minutes: 10 }  // 10 minutes before
        ]
      };
      
      // Use CalendarOperations to standardize the event
      const standardizedEvent = CalendarOperations.createStandardEvent(eventData);
      
      // Add to calendar
      return await CalendarService.addEvent(standardizedEvent, userId);
    } catch (error) {
      console.error("Error adding check-in to calendar:", error);
      throw error;
    }
  }
  
  /**
   * Add a relationship meeting to the calendar
   * @param {string} userId - The user ID
   * @param {number} cycleNumber - The relationship cycle number
   * @param {Date} meetingDate - Optional date to schedule, defaults to next Sunday
   * @returns {Promise<Object>} - Result of the calendar addition
   */
  async addRelationshipMeetingToCalendar(userId, cycleNumber, meetingDate = null) {
    try {
      if (!userId) throw new Error("User ID is required");
      
      // Default to next Sunday if no date provided
      if (!meetingDate) {
        meetingDate = CalendarOperations.getNextWeekdayDate(0); // 0 = Sunday
        meetingDate.setHours(19, 0, 0, 0); // 7 PM
      }
      
      // Create standardized event
      const eventData = {
        title: `Relationship Meeting (Cycle ${cycleNumber})`,
        description: 'A focused time to discuss your relationship, celebrate successes, and address challenges together.',
        startDate: meetingDate,
        duration: 60, // 1 hour
        location: '',
        category: 'relationship',
        eventType: 'meeting',
        colorId: '11', // Red
        metadata: {
          cycleNumber,
          relationshipActivity: true
        },
        reminders: [
          { method: 'popup', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 60 }      // 1 hour before
        ]
      };
      
      // Standardize the event
      const standardizedEvent = CalendarOperations.createStandardEvent(eventData);
      
      // Add to calendar
      return await CalendarService.addEvent(standardizedEvent, userId);
    } catch (error) {
      console.error("Error adding relationship meeting to calendar:", error);
      throw error;
    }
  }
  
  /**
   * Add a date night to the calendar
   * @param {string} userId - The user ID
   * @param {Object} dateNight - Date night data object
   * @returns {Promise<Object>} - Result of the calendar addition
   */
  async addDateNightToCalendar(userId, dateNight) {
    try {
      if (!userId || !dateNight) throw new Error("User ID and date night data required");
      
      // Parse date and time
      const startDate = dateNight.date ? 
        CalendarOperations.parseDateTime(dateNight.date, dateNight.time || '19:00') :
        CalendarOperations.getNextWeekendEvening();
      
      // Create standardized event
      const eventData = {
        title: `Date Night: ${dateNight.title || 'Dinner Date'}`,
        description: dateNight.description || 'Quality time together to strengthen your relationship.',
        startDate: startDate,
        duration: 120, // 2 hours
        location: dateNight.location || '',
        category: 'relationship',
        eventType: 'date-night',
        colorId: '10', // Purple
        metadata: {
          relationshipActivity: true,
          dateNightDetails: dateNight
        },
        reminders: [
          { method: 'popup', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 120 }     // 2 hours before
        ]
      };
      
      // Standardize the event
      const standardizedEvent = CalendarOperations.createStandardEvent(eventData);
      
      // Add to calendar
      return await CalendarService.addEvent(standardizedEvent, userId);
    } catch (error) {
      console.error("Error adding date night to calendar:", error);
      throw error;
    }
  }
  
  /**
   * Add a self-care activity to the calendar
   * @param {string} userId - The user ID
   * @param {Object} selfCareActivity - Self-care activity data
   * @returns {Promise<Object>} - Result of the calendar addition
   */
  async addSelfCareToCalendar(userId, selfCareActivity) {
    try {
      if (!userId || !selfCareActivity) throw new Error("User ID and self-care data required");
      
      // Parse date
      const startDate = selfCareActivity.date ? 
        CalendarOperations.parseDate(selfCareActivity.date) : 
        new Date();
      
      // Default to 10 AM if no specific time
      startDate.setHours(10, 0, 0, 0);
      
      // Calculate duration in minutes
      const duration = selfCareActivity.duration || 60; // Default 60 minutes
      
      // Create standardized event
      const eventData = {
        title: `Self-Care: ${selfCareActivity.title || 'Personal Time'}`,
        description: selfCareActivity.description || 'Time dedicated to self-care and personal wellbeing.',
        startDate: startDate,
        duration: duration,
        location: selfCareActivity.location || '',
        category: 'relationship',
        eventType: 'self-care',
        colorId: '9', // Blue
        metadata: {
          relationshipActivity: true,
          selfCareDetails: selfCareActivity
        },
        reminders: [
          { method: 'popup', minutes: 60 } // 1 hour before
        ]
      };
      
      // Standardize the event
      const standardizedEvent = CalendarOperations.createStandardEvent(eventData);
      
      // Add to calendar
      return await CalendarService.addEvent(standardizedEvent, userId);
    } catch (error) {
      console.error("Error adding self-care to calendar:", error);
      throw error;
    }
  }
  
  /**
   * Get all relationship events for a user
   * @param {string} userId - The user ID
   * @param {Date} startDate - Start of date range
   * @param {Date} endDate - End of date range
   * @returns {Promise<Array>} - Array of relationship events
   */
  async getRelationshipEvents(userId, startDate, endDate) {
    try {
      if (!userId) throw new Error("User ID is required");
      
      // Default to 30 days range if not provided
      if (!startDate) {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      }
      
      if (!endDate) {
        endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);
      }
      
      // Get all events from calendar service
      const allEvents = await CalendarService.getEventsForUser(userId, startDate, endDate);
      
      // Filter for relationship-related events using standardized categories
      return allEvents.filter(event => 
        event.category === 'relationship' || 
        (event.metadata && event.metadata.relationshipActivity) ||
        (event.title && this.isRelationshipTitle(event.title))
      );
    } catch (error) {
      console.error("Error getting relationship events:", error);
      return [];
    }
  }
  
  /**
   * Determine if an event title is relationship-related
   * @param {string} title - Event title
   * @returns {boolean} - True if title indicates a relationship event
   */
  isRelationshipTitle(title) {
    if (!title) return false;
    
    const lowerTitle = title.toLowerCase();
    const relationshipKeywords = [
      'relationship', 'couple', 'check-in', 'date night', 'self-care'
    ];
    
    return relationshipKeywords.some(keyword => lowerTitle.includes(keyword));
  }
}

export default new RelationshipCalendarIntegration();