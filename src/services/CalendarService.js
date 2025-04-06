// src/services/CalendarService.js
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

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

  // In src/services/CalendarService.js - Update the addEvent method to dispatch an event

// CalendarService.js - Replace the addEvent method with this corrected version
// In src/services/CalendarService.js - Update the addEvent method to dispatch an event

// Replace the addEvent method with this corrected version
// In src/services/CalendarService.js - Update the addEvent method to dispatch an event

// Replace the addEvent method in CalendarService.js with this improved version:
async addEvent(event, userId) {
  try {
    if (!userId) {
      throw new Error("User ID is required to add events");
    }
    
    // Ensure event has required fields
    if (!event.summary && !event.title) {
      event.summary = "Untitled Event";
    }
    
    // Standardize event format
    const standardizedEvent = {
      ...event,
      summary: event.summary || event.title,
      description: event.description || '',
      // Ensure start and end dates are properly formatted
      start: event.start || {
        dateTime: new Date().toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: event.end || {
        dateTime: new Date(new Date().getTime() + 60*60000).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
    };
    
    // Add relationship category tag if applicable
    if (event.summary?.toLowerCase().includes('relationship') || 
        event.summary?.toLowerCase().includes('couple') ||
        event.category === 'relationship') {
      standardizedEvent.category = 'relationship';
    }
    
    // Save event to Firestore
    const eventData = {
      ...standardizedEvent,
      userId,
      familyId: event.familyId || null,
      createdAt: serverTimestamp()
    };
    
    const eventRef = collection(db, "calendar_events");
    const docRef = await addDoc(eventRef, eventData);
    
    // Dispatch an event to notify components of the new calendar event
    if (typeof window !== 'undefined') {
      const updateEvent = new CustomEvent('calendar-event-added', {
        detail: { eventId: docRef.id, category: standardizedEvent.category }
      });
      window.dispatchEvent(updateEvent);
    }
    
    // Show success notification
    this.showNotification(`Event "${standardizedEvent.summary}" added to your calendar`, "success");
    
    return {
      success: true,
      eventId: docRef.id,
      isMock: false
    };
  } catch (error) {
    console.error("Error adding event to calendar:", error);
    this.showNotification("Failed to add event to calendar", "error");
    return { success: false, error: error.message || "Unknown error" };
  }
}

// Add this method to CalendarService class
async addChildEvent(event, userId) {
  try {
    if (!userId) {
      throw new Error("User ID is required to add events");
    }
    
    // Ensure event has required fields
    if (!event.title) {
      event.title = "Untitled Child Event";
    }
    
    // Format child event
    const standardizedEvent = {
      ...event,
      summary: event.title,
      description: event.description || '',
      start: {
        dateTime: event.dateTime instanceof Date ? event.dateTime.toISOString() : new Date(event.dateTime).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: event.endDateTime instanceof Date ? 
          event.endDateTime.toISOString() : 
          new Date(new Date(event.dateTime).getTime() + 60*60000).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      location: event.location || '',
      childId: event.childId,
      childName: event.childName,
      attendingParentId: event.attendingParentId,
      eventType: event.eventType || 'other',
      extraDetails: event.extraDetails || {},
      creationSource: event.creationSource || 'manual'
    };
    
    // Save event to Firestore
    const eventData = {
      ...standardizedEvent,
      userId,
      familyId: event.familyId || null,
      createdAt: serverTimestamp()
    };
    
    const eventRef = collection(db, "calendar_child_events");
    const docRef = await addDoc(eventRef, eventData);
    
    // Dispatch an event to notify components
    if (typeof window !== 'undefined') {
      const updateEvent = new CustomEvent('calendar-child-event-added', {
        detail: { eventId: docRef.id, childId: event.childId }
      });
      window.dispatchEvent(updateEvent);
    }
    
    // Show success notification
    this.showNotification(`Event "${standardizedEvent.summary}" added to your calendar for ${event.childName}`, "success");
    
    return {
      success: true,
      eventId: docRef.id,
      isMock: false
    };
  } catch (error) {
    console.error("Error adding child event to calendar:", error);
    this.showNotification("Failed to add child event to calendar", "error");
    return { success: false, error: error.message || "Unknown error" };
  }
}

// Create a date formatter that handles both US and SE formats
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

// Add this method to CalendarService class
async addChildEvent(event, userId) {
  try {
    if (!userId) {
      throw new Error("User ID is required to add events");
    }
    
    // Ensure event has required fields
    if (!event.title) {
      event.title = "Untitled Child Event";
    }
    
    // Format child event
    const standardizedEvent = {
      ...event,
      summary: event.title,
      description: event.description || '',
      start: {
        dateTime: event.dateTime instanceof Date ? event.dateTime.toISOString() : new Date(event.dateTime).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: event.endDateTime instanceof Date ? 
          event.endDateTime.toISOString() : 
          new Date(new Date(event.dateTime).getTime() + 60*60000).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      location: event.location || '',
      childId: event.childId,
      childName: event.childName,
      attendingParentId: event.attendingParentId,
      eventType: event.eventType || 'other',
      extraDetails: event.extraDetails || {},
      creationSource: event.creationSource || 'manual'
    };
    
    // Save event to Firestore
    const eventData = {
      ...standardizedEvent,
      userId,
      familyId: event.familyId || null,
      createdAt: serverTimestamp()
    };
    
    const eventRef = collection(db, "calendar_child_events");
    const docRef = await addDoc(eventRef, eventData);
    
    // Dispatch an event to notify components
    if (typeof window !== 'undefined') {
      const updateEvent = new CustomEvent('calendar-child-event-added', {
        detail: { eventId: docRef.id, childId: event.childId }
      });
      window.dispatchEvent(updateEvent);
    }
    
    // Show success notification
    this.showNotification(`Event "${standardizedEvent.summary}" added to your calendar for ${event.childName}`, "success");
    
    return {
      success: true,
      eventId: docRef.id,
      isMock: false
    };
  } catch (error) {
    console.error("Error adding child event to calendar:", error);
    this.showNotification("Failed to add child event to calendar", "error");
    return { success: false, error: error.message || "Unknown error" };
  }
}

// Create a date formatter that handles both US and SE formats
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




  // Get events for a user
  async getEventsForUser(userId, timeMin, timeMax) {
    try {
      if (!userId) {
        throw new Error("User ID is required to get events");
      }
      
      const eventsQuery = query(
        collection(db, "calendar_events"),
        where("userId", "==", userId)
      );
      
      const querySnapshot = await getDocs(eventsQuery);
      const events = [];
      
      querySnapshot.forEach((doc) => {
        const eventData = doc.data();
        
        // Filter by date range
        const startTime = new Date(eventData.start.dateTime || eventData.start.date);
        const endTime = new Date(eventData.end.dateTime || eventData.end.date);
        
        if (startTime >= timeMin && startTime <= timeMax) {
          events.push({
            id: doc.id,
            ...eventData
          });
        }
      });
      
      return events;
    } catch (error) {
      console.error("Error getting events:", error);
      throw error;
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

  // Helper to show notifications
  showNotification(message, type = "info") {
    if (typeof window === 'undefined') return;
    
    const notification = document.createElement('div');
    notification.innerText = message;
    
    const bgColor = type === "success" ? "#4caf50" : 
                  type === "error" ? "#f44336" : 
                  "#2196f3";
                  
    notification.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; background: ${bgColor};
      color: white; padding: 12px 20px; border-radius: 4px; z-index: 9999;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2); font-family: Roboto, sans-serif;
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
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
      'description': 'Weekly family meeting to discuss task balance and set goals for the coming week.',
      'start': {
        'dateTime': meetingDate.toISOString(),
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      'end': {
        'dateTime': endTime.toISOString(),
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      'reminders': {
        'useDefault': false,
        'overrides': [
          {'method': 'popup', 'minutes': 60},
          {'method': 'email', 'minutes': 1440} // 24 hours before
        ]
      },
      'colorId': '6' // Blue
    };
  }

  // Create event for task reminder
  createTaskReminderEvent(task, reminderDate) {
    if (!reminderDate) {
      reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + 1); // Default to tomorrow
      reminderDate.setHours(10, 0, 0, 0); // 10:00 AM
    }
    
    const endTime = new Date(reminderDate);
    endTime.setMinutes(endTime.getMinutes() + 30);
    
    return {
      'summary': `Reminder: ${task.title || 'Task Reminder'}`,
      'description': `This is a reminder to complete your Allie task: ${task.description || 'No description provided'}`,
      'start': {
        'dateTime': reminderDate.toISOString(),
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      'end': {
        'dateTime': endTime.toISOString(),
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      'reminders': {
        'useDefault': false,
        'overrides': [
          {'method': 'popup', 'minutes': 30}
        ]
      },
      'colorId': '10' // Green
    };
  }
}

export default new CalendarService();