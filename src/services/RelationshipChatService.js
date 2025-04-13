// src/services/RelationshipChatService.js
import { db, auth } from './firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import CalendarService from './CalendarService';

class RelationshipChatService {
  /**
   * Process date night requests from chat
   * @param {string} message - User message
   * @param {object} entities - Extracted entities
   * @param {object} context - Family context
   * @returns {Promise<object>} Processing result
   */
  async processDateNightRequest(message, entities, context) {
    try {
      // Extract date night details
      const dateDetails = {
        title: 'Date Night',
        description: 'Added from Allie chat',
        location: entities.location ? entities.location[0] : '',
        startDate: entities.date ? new Date(entities.date[0]) : this.getNextWeekendEvening(),
        endDate: null,
        type: 'date'
      };
      
      // Set end time 2 hours after start
      dateDetails.endDate = new Date(dateDetails.startDate);
      dateDetails.endDate.setHours(dateDetails.startDate.getHours() + 2);
      
      // If we have a current user, create calendar event
      if (context.currentUser && context.currentUser.id) {
        const event = {
          summary: dateDetails.title,
          description: dateDetails.description,
          location: dateDetails.location,
          start: {
            dateTime: dateDetails.startDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: dateDetails.endDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          category: 'relationship',
          colorId: '6' // Pink color for relationship events
        };
        
        const result = await CalendarService.addEvent(event, context.currentUser.id);
        
        if (result.success) {
          const dateString = dateDetails.startDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          });
          
          const timeString = dateDetails.startDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
          });
          
          return {
            success: true,
            message: `I've scheduled a date night for you on ${dateString} at ${timeString}${dateDetails.location ? ` at ${dateDetails.location}` : ''}. Enjoy your quality time together!`
          };
        }
      }
      
      return {
        success: false,
        message: "I'd like to schedule a date night for you, but I need you to be logged in first. Once you're logged in, I can add it to your calendar."
      };
    } catch (error) {
      console.error("Error processing date night request:", error);
      return {
        success: false,
        message: "I couldn't schedule a date night right now. You can add it directly through the calendar."
      };
    }
  }
  
  /**
   * Process gratitude message requests
   * @param {string} message - User message
   * @param {object} context - Family context
   * @returns {Promise<object>} Processing result
   */
  async processGratitudeRequest(message, context) {
    try {
      if (!context.familyId) {
        return {
          success: false,
          message: "I need to know which family you're a part of to send gratitude messages."
        };
      }
      
      // Simply acknowledge the gratitude message for now
      return {
        success: true,
        message: "I've noted your gratitude message. Expressing appreciation is a great way to strengthen your relationship!"
      };
    } catch (error) {
      console.error("Error processing gratitude request:", error);
      return {
        success: false,
        message: "I couldn't process your gratitude message right now. Please try again later."
      };
    }
  }
  
  // Helper method to get next weekend evening
  getNextWeekendEvening() {
    const date = new Date();
    const day = date.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Add days until we reach Saturday
    const daysToAdd = day === 6 ? 7 : 6 - day;
    date.setDate(date.getDate() + daysToAdd);
    
    // Set to 7:00 PM
    date.setHours(19, 0, 0, 0);
    
    return date;
  }
}

export default new RelationshipChatService();