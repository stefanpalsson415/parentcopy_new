// src/services/CalendarService.js
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, deleteDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import eventStore from './EventStore';

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

  // Enhanced addEvent method that handles all event types and their details
  async addEvent(event, userId) {
    try {
      if (!userId) throw new Error("User ID is required");
      
      console.log("Adding calendar event:", {
        title: event.summary || event.title || 'Untitled',
        type: event.eventType || event.category || 'general',
        hasDate: !!(event.dateTime || event.start?.dateTime),
        childName: event.childName || 'None'
      });
      
      // Process the event details based on type to ensure all fields are captured
      const eventData = this.processEventDetailsForStorage(event);
      
      // Use the EventStore to add the event (with enhanced metadata)
      const result = await eventStore.addEvent(eventData, userId, event.familyId);
      
      // Check for duplicate detection
      if (result.isDuplicate) {
        this.showNotification(`This event already exists in your calendar`, "info");
      } else {
        const eventTypeDisplay = this.getEventTypeDisplayName(event.eventType || event.category);
        this.showNotification(`${eventTypeDisplay} "${event.summary || event.title}" added to your calendar`, "success");
      }
      
      // Dispatch DOM event for components to refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('calendar-event-added', {
          detail: { 
            eventId: result.eventId,
            universalId: result.universalId,
            isDuplicate: result.isDuplicate || false,
            eventType: event.eventType || event.category
          }
        }));
      }
      
      return result;
    } catch (error) {
      console.error("Error adding event to calendar:", error);
      this.showNotification("Failed to add event to calendar", "error");
      return { success: false, error: error.message || "Unknown error" };
    }
  }
  
  // Helper method to get a user-friendly display name for event types
  getEventTypeDisplayName(eventType) {
    const displayNames = {
      'appointment': 'Appointment',
      'activity': 'Activity',
      'birthday': 'Birthday',
      'meeting': 'Meeting',
      'date-night': 'Date Night',
      'travel': 'Trip',
      'vacation': 'Vacation',
      'playdate': 'Playdate',
      'conference': 'Conference'
    };
    
    return displayNames[eventType] || 'Event';
  }
  
  // Process all event details to ensure they're correctly formatted for storage
  processEventDetailsForStorage(event) {
    // Create a standardized event object first
    const standardEvent = {
      ...event,
      // Ensure we have standard title/summary fields
      title: event.title || event.summary || 'Untitled Event',
      summary: event.summary || event.title || 'Untitled Event',
      // Ensure we have standardized date/time fields
      start: event.start || {
        dateTime: event.dateTime || new Date().toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: event.end || {
        dateTime: event.endDateTime || 
                  new Date(new Date(event.dateTime || Date.now()).getTime() + 60 * 60 * 1000).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      // Set empty arrays for related entities if not present
      documents: event.documents || [],
      providers: event.providers || [],
      attendees: event.attendees || []
    };
    
    // Add extraDetails for type-specific data if not already present
    if (!standardEvent.extraDetails) {
      standardEvent.extraDetails = {};
    }
    
    // Always include event-specific details in extraDetails
    if (event.appointmentDetails && (event.category === 'appointment' || event.eventType === 'appointment')) {
      standardEvent.extraDetails.appointmentDetails = event.appointmentDetails;
    }
    
    if (event.activityDetails && (event.category === 'activity' || event.eventType === 'activity')) {
      standardEvent.extraDetails.activityDetails = event.activityDetails;
    }
    
    if (event.birthdayDetails && (event.category === 'birthday' || event.eventType === 'birthday')) {
      standardEvent.extraDetails.birthdayDetails = event.birthdayDetails;
    }
    
    if (event.meetingDetails && (event.category === 'meeting' || event.eventType === 'meeting')) {
      standardEvent.extraDetails.meetingDetails = event.meetingDetails;
    }
    
    if (event.dateNightDetails && event.eventType === 'date-night') {
      standardEvent.extraDetails.dateNightDetails = event.dateNightDetails;
    }
    
    if (event.travelDetails && (event.eventType === 'travel' || event.eventType === 'vacation')) {
      standardEvent.extraDetails.travelDetails = event.travelDetails;
    }
    
    if (event.playdateDetails && event.eventType === 'playdate') {
      standardEvent.extraDetails.playdateDetails = event.playdateDetails;
    }
    
    if (event.conferenceDetails && event.eventType === 'conference') {
      standardEvent.extraDetails.conferenceDetails = event.conferenceDetails;
    }
    
    return standardEvent;
  }

  async updateEvent(eventId, updateData, userId) {
    try {
      if (!eventId || !userId) {
        throw new Error("Event ID and User ID are required to update events");
      }
      
      console.log("Updating calendar event:", { 
        eventId, 
        updateFields: Object.keys(updateData),
        eventType: updateData.eventType || updateData.category
      });
      
      // Process all event details to ensure they're properly formatted
      const processedUpdateData = this.processEventDetailsForStorage(updateData);
      
      // Use the EventStore to update the event
      const result = await eventStore.updateEvent(eventId, processedUpdateData, userId);
      
      // Show notification
      this.showNotification("Event updated successfully", "success");
      
      // Dispatch DOM event for components to refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('calendar-event-updated', {
          detail: { 
            eventId,
            universalId: result.universalId,
            eventType: updateData.eventType || updateData.category
          }
        }));
      }
      
      return result;
    } catch (error) {
      console.error("Error updating event:", error);
      this.showNotification("Failed to update event", "error");
      return { success: false, error: error.message || "Unknown error" };
    }
  }

  async deleteEvent(eventId, userId) {
    try {
      if (!eventId || !userId) {
        throw new Error("Event ID and User ID are required to delete events");
      }
      
      console.log("Deleting calendar event:", { eventId });
      
      // Use the EventStore to delete the event
      const result = await eventStore.deleteEvent(eventId, userId);
      
      // Show notification if successful
      if (result.success) {
        this.showNotification("Event deleted from calendar", "success");
      }
      
      // Dispatch event for UI refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
        window.dispatchEvent(new CustomEvent('calendar-event-deleted', {
          detail: { 
            eventId, 
            universalId: result.universalId || eventId
          }
        }));
      }
      
      return result;
    } catch (error) {
      console.error("Error deleting event:", error);
      this.showNotification("Failed to delete event", "error");
      return { success: false, error: error.message || "Unknown error" };
    }
  }

  async getEventsForUser(userId, timeMin, timeMax) {
    try {
      if (!userId) {
        throw new Error("User ID is required to get events");
      }
      
      // Use the EventStore to get events
      return await eventStore.getEventsForUser(userId, timeMin, timeMax);
    } catch (error) {
      console.error("Error getting events:", error);
      return [];
    }
  }
  
  // Child-specific event handling
  async addChildEvent(event, userId) {
    try {
      if (!userId) {
        throw new Error("User ID is required to add events");
      }
      
      console.log("Adding child calendar event:", {
        title: event.title || 'Untitled',
        childName: event.childName || 'Unknown child',
        hasDate: !!(event.dateTime),
        eventType: event.eventType || event.category,
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
      
      // Process all event details before saving
      const processedEvent = this.processEventDetailsForStorage(cleanedEvent);
      
      // Format child event
      const standardizedEvent = {
        ...processedEvent,
        creationSource: cleanedEvent.creationSource || 'manual'
      };
      
      // Save event to Firestore
      const eventData = {
        ...standardizedEvent,
        userId,
        familyId: cleanedEvent.familyId || null,
        createdAt: serverTimestamp()
      };
      
      // Use the events collection, not child-specific one (simplified)
      const eventRef = collection(db, "events");
      const docRef = await addDoc(eventRef, eventData);
      
      // Dispatch an event to notify components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('calendar-child-event-added', {
          detail: { 
            eventId: docRef.id, 
            childId: cleanedEvent.childId,
            childName: cleanedEvent.childName
          }
        }));
        
        // Also trigger general refresh
        window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
      }
      
      // Show success notification
      const eventTypeDisplay = this.getEventTypeDisplayName(event.eventType || event.category);
      this.showNotification(`${eventTypeDisplay} added for ${cleanedEvent.childName}`, "success");
      
      return {
        success: true,
        eventId: docRef.id
      };
    } catch (error) {
      console.error("Error adding child event to calendar:", error);
      this.showNotification("Failed to add child event to calendar", "error");
      return { success: false, error: error.message || "Unknown error" };
    }
  }

  // Create a recurring event series
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
          
          // Process all event details
          const processedEvent = this.processEventDetailsForStorage(recurringEvent);
          
          // Add to Firestore
          const eventsRef = collection(db, "events");
          await addDoc(eventsRef, {
            ...processedEvent,
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

  // Format date for display
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
      'eventType': 'task',
      'category': 'task',
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
      'title': `Allie Family Meeting - Week ${weekNumber || '?'}`,
      'description': 'Weekly family meeting to discuss task balance and set goals for the coming week.',
      'start': {
        'dateTime': meetingDate.toISOString(),
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      'end': {
        'dateTime': endTime.toISOString(),
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      'eventType': 'meeting',
      'category': 'meeting',
      'reminders': {
        'useDefault': false,
        'overrides': [
          {'method': 'popup', 'minutes': 60},
          {'method': 'email', 'minutes': 1440} // 24 hours before
        ]
      },
      'meetingDetails': {
        'agenda': 'Weekly family meeting',
        'issuesForDiscussion': 'Task balance and goals for the coming week',
        'followUpPlan': 'Review progress next week'
      },
      'colorId': '6' // Blue
    };
  }

  // Show a notification to the user
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
}

export default new CalendarService();