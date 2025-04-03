// src/services/RelationshipCalendarIntegration.js
import CalendarService from './CalendarService';

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
      
      // Create end time (30 minutes after start)
      const endTime = new Date(scheduleDate);
      endTime.setMinutes(endTime.getMinutes() + 30);
      
      // Create the event object
      const event = {
        summary: `Couple Check-in (Cycle ${cycleNumber})`,
        description: `Regular check-in to connect and strengthen your relationship.\n\n${
          checkInData?.description || 'Take 5-10 minutes to connect and share your day with your partner.'
        }`,
        start: {
          dateTime: scheduleDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 }, // 1 hour before
            { method: 'popup', minutes: 10 }  // 10 minutes before
          ]
        },
        colorId: '6' // Pink
      };
      
      // Add to calendar
      return await CalendarService.addEvent(event, userId);
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
        meetingDate = new Date();
        const daysToSunday = 7 - meetingDate.getDay();
        meetingDate.setDate(meetingDate.getDate() + daysToSunday);
        meetingDate.setHours(19, 0, 0, 0); // 7 PM
      }
      
      // Create end time (1 hour after start)
      const endTime = new Date(meetingDate);
      endTime.setHours(endTime.getHours() + 1);
      
      // Create the event object
      const event = {
        summary: `Relationship Meeting (Cycle ${cycleNumber})`,
        description: 'A focused time to discuss your relationship, celebrate successes, and address challenges together.',
        start: {
          dateTime: meetingDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 60 }      // 1 hour before
          ]
        },
        colorId: '11' // Red
      };
      
      // Add to calendar
      return await CalendarService.addEvent(event, userId);
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
      
      // Create date objects
      const startDate = new Date(`${dateNight.date}T${dateNight.time || '19:00'}`);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 2); // Default 2 hour duration
      
      // Create the event object
      const event = {
        summary: `Date Night: ${dateNight.title}`,
        description: dateNight.description || 'Quality time together to strengthen your relationship.',
        location: dateNight.location || '',
        start: {
          dateTime: startDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 120 }     // 2 hours before
          ]
        },
        colorId: '10' // Purple
      };
      
      // Add to calendar
      return await CalendarService.addEvent(event, userId);
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
      
      // Create date objects
      const startDate = new Date(selfCareActivity.date);
      startDate.setHours(10, 0, 0, 0); // Default to 10 AM if no time specified
      
      // Calculate duration in milliseconds
      const durationMs = (selfCareActivity.duration || 60) * 60 * 1000;
      const endDate = new Date(startDate.getTime() + durationMs);
      
      // Create the event object
      const event = {
        summary: `Self-Care: ${selfCareActivity.title}`,
        description: selfCareActivity.description || 'Time dedicated to self-care and personal wellbeing.',
        location: selfCareActivity.location || '',
        start: {
          dateTime: startDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 } // 1 hour before
          ]
        },
        colorId: '9' // Blue
      };
      
      // Add to calendar
      return await CalendarService.addEvent(event, userId);
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
      
      // Filter for relationship-related events
      const relationshipKeywords = [
        'relationship', 'couple', 'check-in', 'date night', 'self-care'
      ];
      
      return allEvents.filter(event => {
        const title = event.summary?.toLowerCase() || '';
        return relationshipKeywords.some(keyword => title.includes(keyword));
      });
    } catch (error) {
      console.error("Error getting relationship events:", error);
      return [];
    }
  }
}

export default new RelationshipCalendarIntegration();