// src/services/MedicalChatService.js
import ChildTrackingService from './ChildTrackingService';
import CalendarService from './CalendarService';
import { db } from './firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

class MedicalChatService {
  /**
   * Process a medical appointment request from chat
   * @param {string} message - User message
   * @param {object} entities - Extracted entities
   * @param {object} familyContext - Family context info
   * @returns {Promise<object>} Processing result
   */
  async processAppointmentRequest(message, entities, familyContext) {
    try {
      const { familyId, familyMembers } = familyContext;
      
      // Extract appointment details
      const appointmentDetails = await this.extractAppointmentDetails(message, entities);
      
      // Determine which child this is for
      let childId = null;
      let childName = null;
      
      if (entities.childName && entities.childName.length > 0) {
        // Find child by name
        const childNameToFind = entities.childName[0].toLowerCase();
        const children = familyMembers.filter(m => m.role === 'child');
        
        const matchedChild = children.find(child => 
          child.name.toLowerCase() === childNameToFind
        );
        
        if (matchedChild) {
          childId = matchedChild.id;
          childName = matchedChild.name;
        }
      }
      
      // If child not found, check if there's only one child in family
      if (!childId) {
        const children = familyMembers.filter(m => m.role === 'child');
        if (children.length === 1) {
          childId = children[0].id;
          childName = children[0].name;
        }
      }
      
      // Return if we can't determine child
      if (!childId) {
        return {
          success: false,
          step: 'child-selection',
          message: "I'm not sure which child this appointment is for. Could you specify the child's name?"
        };
      }
      
      // Create appointment object
      const appointment = {
        appointmentType: appointmentDetails.type || 'checkup',
        title: appointmentDetails.type || 'Doctor Appointment',
        dateTime: this.combineDateTime(appointmentDetails.date, appointmentDetails.time),
        location: appointmentDetails.location || '',
        doctor: appointmentDetails.doctor || '',
        notes: appointmentDetails.notes || '',
        childId,
        childName,
        familyId,
        userId: familyContext.currentUser?.id,
        creationSource: 'chat'
      };
      
      // Add to child's medical records and calendar
      const result = await ChildTrackingService.addMedicalAppointment(
        familyId,
        childId,
        appointment,
        true // Add to calendar
      );
      
      if (result.success) {
        return {
          success: true,
          appointmentId: result.appointmentId,
          calendarEventId: result.calendarEventId,
          appointment,
          message: `I've added a ${appointment.appointmentType} appointment for ${childName} on ${new Date(appointment.dateTime).toLocaleDateString()} at ${new Date(appointment.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}. This has been added to both your family calendar and ${childName}'s medical records.`
        };
      } else {
        throw new Error(result.error || "Failed to create appointment");
      }
    } catch (error) {
      console.error("Error processing appointment request:", error);
      return {
        success: false,
        error: error.message,
        message: "I had trouble adding this appointment. Please try again with more details."
      };
    }
  }

  /**
   * Extract appointment details from message
   * @param {string} message - User message
   * @param {object} entities - Extracted entities
   * @returns {Promise<object>} Appointment details
   */
  async extractAppointmentDetails(message, entities) {
    const appointmentDetails = {
      type: null,
      date: null,
      time: null,
      location: null,
      doctor: null,
      notes: null
    };
    
    // Extract appointment type
    const typePatterns = [
      { pattern: /\b(?:annual|yearly|regular)\s+(?:checkup|check-up|check up|physical|exam)\b/i, type: 'Annual Checkup' },
      { pattern: /\b(?:dental|dentist|teeth)\s+(?:appointment|checkup|cleaning|visit|exam)\b/i, type: 'Dental Appointment' },
      { pattern: /\b(?:eye|vision|optical|optometrist|ophthalmologist)\s+(?:appointment|checkup|exam|test)\b/i, type: 'Eye Exam' },
      { pattern: /\b(?:specialist|specialist's|consultation)\s+(?:appointment|visit)\b/i, type: 'Specialist Consultation' },
      { pattern: /\b(?:vaccine|vaccination|immunization|shot|booster)\b/i, type: 'Vaccination' },
      { pattern: /\b(?:therapy|therapist|counseling|mental health)\s+(?:appointment|session|visit)\b/i, type: 'Therapy Session' },
      { pattern: /\b(?:sick|illness|not feeling well)\s+(?:visit|appointment|checkup)\b/i, type: 'Sick Visit' },
      { pattern: /\b(?:follow-up|follow up)\s+(?:appointment|visit|checkup)\b/i, type: 'Follow-up Appointment' }
    ];
    
    for (const { pattern, type } of typePatterns) {
      if (pattern.test(message)) {
        appointmentDetails.type = type;
        break;
      }
    }
    
    // Default type if none detected
    if (!appointmentDetails.type) {
      appointmentDetails.type = 'Doctor Appointment';
    }
    
    // Extract date
    if (entities.date && entities.date.length > 0) {
      appointmentDetails.date = entities.date[0];
      
      // Process relative dates
      if (appointmentDetails.date.toLowerCase() === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        appointmentDetails.date = tomorrow.toISOString().split('T')[0];
      } else if (appointmentDetails.date.toLowerCase() === 'today') {
        appointmentDetails.date = new Date().toISOString().split('T')[0];
      } else if (appointmentDetails.date.toLowerCase().includes('next')) {
        // Handle "next Tuesday", etc.
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        for (let i = 0; i < dayNames.length; i++) {
          if (appointmentDetails.date.toLowerCase().includes(dayNames[i])) {
            const today = new Date();
            const currentDay = today.getDay();
            let daysToAdd = i - currentDay;
            if (daysToAdd <= 0) daysToAdd += 7;
            const nextDay = new Date();
            nextDay.setDate(nextDay.getDate() + daysToAdd);
            appointmentDetails.date = nextDay.toISOString().split('T')[0];
            break;
          }
        }
      }
    } else {
      // Default to tomorrow if no date specified
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      appointmentDetails.date = tomorrow.toISOString().split('T')[0];
    }
    
    // Extract time
    if (entities.time && entities.time.length > 0) {
      appointmentDetails.time = entities.time[0];
      
      // Clean up time format
      if (appointmentDetails.time.toLowerCase() === 'noon') {
        appointmentDetails.time = '12:00 pm';
      } else if (appointmentDetails.time.toLowerCase() === 'midnight') {
        appointmentDetails.time = '12:00 am';
      }
    } else {
      // Default to morning appointment
      appointmentDetails.time = '10:00 am';
    }
    
    // Extract location
    if (entities.location && entities.location.length > 0) {
      appointmentDetails.location = entities.location[0];
    }
    
    // Extract doctor's name
    if (entities.providerName && entities.providerName.length > 0) {
      appointmentDetails.doctor = entities.providerName[0];
    }
    
    // Extract any notes (everything after "notes:" or "additional info:")
    const notesMatch = message.match(/(?:notes|additional info|additional information|info|details)(?:\s*:|:\s*)([\s\S]+)$/i);
    if (notesMatch && notesMatch[1]) {
      appointmentDetails.notes = notesMatch[1].trim();
    }
    
    return appointmentDetails;
  }

  /**
   * Combine date and time strings into a Date object
   * @param {string} dateStr - Date string
   * @param {string} timeStr - Time string
   * @returns {Date} Combined date and time
   */
  combineDateTime(dateStr, timeStr) {
    try {
      // Parse date
      let dateObj = new Date(dateStr);
      
      // Check if valid date
      if (isNaN(dateObj.getTime())) {
        // Try alternative format
        const [month, day, year] = dateStr.split('/');
        dateObj = new Date(year ? year : new Date().getFullYear(), month - 1, day);
      }
      
      // Check again if valid date
      if (isNaN(dateObj.getTime())) {
        // Last resort, use tomorrow
        dateObj = new Date();
        dateObj.setDate(dateObj.getDate() + 1);
      }
      
      // Parse time
      const timeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const period = timeMatch[3]?.toLowerCase();
        
        // Handle 12-hour format
        if (period === 'pm' && hours < 12) hours += 12;
        if (period === 'am' && hours === 12) hours = 0;
        
        dateObj.setHours(hours, minutes, 0, 0);
      }
      
      return dateObj;
    } catch (error) {
      console.error("Error combining date and time:", error);
      // Return tomorrow at 10AM as fallback
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      return tomorrow;
    }
  }

  /**
   * Find upcoming medical appointments
   * @param {string} familyId - Family ID
   * @param {string} childId - Optional child ID to filter
   * @returns {Promise<Array>} Upcoming appointments
   */
  async findUpcomingAppointments(familyId, childId = null) {
    try {
      let eventsQuery = query(
        collection(db, "events"),
        where("familyId", "==", familyId),
        where("category", "==", "medical")
      );
      
      // Add child filter if specified
      if (childId) {
        eventsQuery = query(eventsQuery, where("childId", "==", childId));
      }
      
      const querySnapshot = await getDocs(eventsQuery);
      const appointments = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Only include future appointments
        if (new Date(data.start.dateTime) >= new Date()) {
          appointments.push({
            id: doc.id,
            ...data
          });
        }
      });
      
      // Sort by date (earliest first)
      appointments.sort((a, b) => 
        new Date(a.start.dateTime) - new Date(b.start.dateTime)
      );
      
      return appointments;
    } catch (error) {
      console.error("Error finding upcoming appointments:", error);
      return [];
    }
  }
}

export default new MedicalChatService();