// src/services/ChildTrackingService.js
import { db } from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  serverTimestamp, 
  arrayUnion 
} from 'firebase/firestore';
import CalendarService from './CalendarService';

/**
 * Service for managing child tracking data and synchronizing with calendar
 */
class ChildTrackingService {
  /**
   * Add a medical appointment for a child
   * @param {string} familyId - Family ID
   * @param {string} childId - Child ID
   * @param {Object} appointment - Appointment details
   * @param {Boolean} addToCalendar - Whether to add to calendar too
   * @returns {Promise<Object>} - Result with success flag and IDs
   */
  async addMedicalAppointment(familyId, childId, appointment, addToCalendar = true) {
    try {
      if (!familyId || !childId) {
        throw new Error("Family ID and Child ID are required");
      }
      
      console.log(`Adding medical appointment for child ${childId} in family ${familyId}`);
      
      // Create standardized appointment data
      const appointmentData = {
        type: appointment.appointmentType || 'general',
        title: appointment.title || "Doctor's Appointment",
        date: appointment.dateTime instanceof Date 
          ? appointment.dateTime 
          : new Date(appointment.dateTime),
        location: appointment.location || '',
        doctor: appointment.doctor || '',
        notes: appointment.notes || '',
        completed: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Add to child's medical records
      const childDocRef = doc(db, "familyMembers", childId);
      const childDoc = await getDoc(childDocRef);
      
      if (!childDoc.exists()) {
        throw new Error("Child record not found");
      }
      
      // Get current medical records or initialize empty array
      const childData = childDoc.data();
      const medicalRecords = childData.medicalRecords || [];
      
      // Generate unique ID for the appointment
      const appointmentId = `med-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Add the new appointment with ID
      const newAppointment = {
        id: appointmentId,
        ...appointmentData
      };
      
      // Update the child's record with the new appointment
      await updateDoc(childDocRef, {
        medicalRecords: arrayUnion(newAppointment),
        updatedAt: serverTimestamp()
      });
      
      console.log(`Medical appointment added with ID: ${appointmentId}`);
      
      // Optionally add to calendar
      let calendarEventId = null;
      
      if (addToCalendar) {
        // Convert to calendar event format
        const calendarEvent = this.convertToCalendarEvent(
          appointment, 
          childId, 
          childData.name, 
          'medical', 
          appointmentId
        );
        
        // Add to calendar
        const calendarResult = await CalendarService.addEvent(calendarEvent, appointment.userId);
        
        if (calendarResult.success) {
          calendarEventId = calendarResult.eventId || calendarResult.firestoreId;
          
          // Update the appointment with the calendar event ID for reference
          await this.updateAppointmentWithCalendarId(
            childId, 
            appointmentId, 
            calendarEventId
          );
          
          console.log(`Added to calendar with ID: ${calendarEventId}`);
        }
      }
      
      return {
        success: true,
        appointmentId,
        calendarEventId
      };
    } catch (error) {
      console.error("Error adding medical appointment:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Update an appointment with its calendar event ID for reference
   * @param {string} childId - Child ID
   * @param {string} appointmentId - Appointment ID
   * @param {string} calendarEventId - Calendar event ID
   */
  async updateAppointmentWithCalendarId(childId, appointmentId, calendarEventId) {
    try {
      const childDocRef = doc(db, "familyMembers", childId);
      const childDoc = await getDoc(childDocRef);
      
      if (!childDoc.exists()) return;
      
      const childData = childDoc.data();
      const medicalRecords = childData.medicalRecords || [];
      
      // Find and update the specific appointment
      const updatedRecords = medicalRecords.map(record => {
        if (record.id === appointmentId) {
          return {
            ...record,
            calendarEventId
          };
        }
        return record;
      });
      
      // Update the child document
      await updateDoc(childDocRef, {
        medicalRecords: updatedRecords,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating appointment with calendar ID:", error);
      // Non-critical error, don't throw
    }
  }
  
  /**
   * Add an activity for a child
   * @param {string} familyId - Family ID
   * @param {string} childId - Child ID
   * @param {Object} activity - Activity details
   * @param {Boolean} addToCalendar - Whether to add to calendar too
   * @returns {Promise<Object>} - Result with success flag and IDs
   */
  async addActivity(familyId, childId, activity, addToCalendar = true) {
    try {
      if (!familyId || !childId) {
        throw new Error("Family ID and Child ID are required");
      }
      
      console.log(`Adding activity for child ${childId} in family ${familyId}`);
      
      // Create standardized activity data
      const activityData = {
        type: activity.activityType || 'general',
        title: activity.title || activity.activityName || "Activity",
        date: activity.dateTime instanceof Date 
          ? activity.dateTime 
          : new Date(activity.dateTime),
        location: activity.location || '',
        duration: activity.duration || 60, // Duration in minutes
        isRecurring: activity.isRecurring || false,
        recurrencePattern: activity.recurrencePattern || null,
        notes: activity.notes || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Add to child's activities
      const childDocRef = doc(db, "familyMembers", childId);
      const childDoc = await getDoc(childDocRef);
      
      if (!childDoc.exists()) {
        throw new Error("Child record not found");
      }
      
      // Get current activities or initialize empty array
      const childData = childDoc.data();
      const activities = childData.activities || [];
      
      // Generate unique ID for the activity
      const activityId = `act-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Add the new activity with ID
      const newActivity = {
        id: activityId,
        ...activityData
      };
      
      // Update the child's record with the new activity
      await updateDoc(childDocRef, {
        activities: arrayUnion(newActivity),
        updatedAt: serverTimestamp()
      });
      
      console.log(`Activity added with ID: ${activityId}`);
      
      // Optionally add to calendar
      let calendarEventId = null;
      
      if (addToCalendar) {
        // Convert to calendar event format
        const calendarEvent = this.convertToCalendarEvent(
          activity, 
          childId, 
          childData.name, 
          'activity', 
          activityId
        );
        
        // Add to calendar
        const calendarResult = await CalendarService.addEvent(calendarEvent, activity.userId);
        
        if (calendarResult.success) {
          calendarEventId = calendarResult.eventId || calendarResult.firestoreId;
          
          // Update the activity with the calendar event ID for reference
          await this.updateActivityWithCalendarId(
            childId, 
            activityId, 
            calendarEventId
          );
          
          console.log(`Added to calendar with ID: ${calendarEventId}`);
        }
      }
      
      return {
        success: true,
        activityId,
        calendarEventId
      };
    } catch (error) {
      console.error("Error adding activity:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Update an activity with its calendar event ID for reference
   * @param {string} childId - Child ID
   * @param {string} activityId - Activity ID
   * @param {string} calendarEventId - Calendar event ID
   */
  async updateActivityWithCalendarId(childId, activityId, calendarEventId) {
    try {
      const childDocRef = doc(db, "familyMembers", childId);
      const childDoc = await getDoc(childDocRef);
      
      if (!childDoc.exists()) return;
      
      const childData = childDoc.data();
      const activities = childData.activities || [];
      
      // Find and update the specific activity
      const updatedActivities = activities.map(activity => {
        if (activity.id === activityId) {
          return {
            ...activity,
            calendarEventId
          };
        }
        return activity;
      });
      
      // Update the child document
      await updateDoc(childDocRef, {
        activities: updatedActivities,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating activity with calendar ID:", error);
      // Non-critical error, don't throw
    }
  }
  
  /**
   * Convert tracking data to calendar event
   * @param {Object} data - Event data (appointment or activity)
   * @param {string} childId - Child ID
   * @param {string} childName - Child name
   * @param {string} type - Event type ('medical' or 'activity')
   * @param {string} originId - Original record ID
   * @returns {Object} - Calendar event object
   */
  convertToCalendarEvent(data, childId, childName, type, originId) {
    // Initialize calendar event with essential data
    const event = {
      title: type === 'medical' 
        ? `${childName}'s ${data.title || "Doctor's Appointment"}`
        : `${childName}'s ${data.title || data.activityName || "Activity"}`,
      summary: type === 'medical' 
        ? `${childName}'s ${data.title || "Doctor's Appointment"}`
        : `${childName}'s ${data.title || data.activityName || "Activity"}`,
      description: data.notes || '',
      location: data.location || '',
      start: {
        dateTime: data.dateTime instanceof Date 
          ? data.dateTime.toISOString() 
          : new Date(data.dateTime).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };
    
    // Set end time based on duration or default
    const endDate = new Date(event.start.dateTime);
    const durationMinutes = data.duration || (type === 'medical' ? 30 : 60);
    endDate.setMinutes(endDate.getMinutes() + durationMinutes);
    
    event.end = {
      dateTime: endDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
    
    // Add metadata for tracking
    event.childId = childId;
    event.childName = childName;
    event.eventType = type === 'medical' ? 'appointment' : 'activity';
    event.category = type === 'medical' ? 'medical' : 'activity';
    event.trackingType = type;
    event.trackingId = originId;
    event.extraDetails = {
      ...data,
      originId
    };
    
    // Add data needed for calendar filtering
    event.familyId = data.familyId;
    event.userId = data.userId;
    
    // Add parent info if available
    if (data.attendingParentId) {
      event.attendingParentId = data.attendingParentId;
    }
    
    return event;
  }
}

export default new ChildTrackingService();