// src/services/CalendarService.js
import { doc, getDoc, setDoc, updateDoc, collection, addDoc,deleteDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
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


  async updateEvent(eventId, updateData, userId) {
    try {
      if (!eventId || !userId) {
        throw new Error("Event ID and User ID are required to update events");
      }
      
      console.log("Updating calendar event:", { eventId, updateFields: Object.keys(updateData) });
      
      // Standardize the update data
      const updates = {
        ...updateData,
        updatedAt: serverTimestamp()
      };
      
      // If there are changes to title/summary, ensure both fields are updated
      if (updates.title && !updates.summary) {
        updates.summary = updates.title;
      } else if (updates.summary && !updates.title) {
        updates.title = updates.summary;
      }
      
      // Update in Firestore
      const docRef = doc(db, "calendar_events", eventId);
      await updateDoc(docRef, updates);
      
      // Dispatch events for UI refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
        window.dispatchEvent(new CustomEvent('calendar-event-updated', {
          detail: { eventId }
        }));
      }
      
      this.showNotification("Event updated successfully", "success");
      
      return {
        success: true,
        eventId
      };
    } catch (error) {
      console.error("Error updating event:", error);
      this.showNotification("Failed to update event", "error");
      return { success: false, error: error.message || "Unknown error" };
    }
  }
  
  // Enhanced delete method
  async deleteEvent(eventId, userId) {
    try {
      if (!eventId || !userId) {
        throw new Error("Event ID and User ID are required to delete events");
      }
      
      console.log("Deleting calendar event:", { eventId });
      
      // Delete from Firestore
      const docRef = doc(db, "calendar_events", eventId);
      await deleteDoc(docRef);
      
      // Dispatch events for UI refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
        window.dispatchEvent(new CustomEvent('calendar-event-deleted', {
          detail: { eventId }
        }));
      }
      
      this.showNotification("Event deleted from calendar", "success");
      
      return {
        success: true
      };
    } catch (error) {
      console.error("Error deleting event:", error);
      this.showNotification("Failed to delete event", "error");
      return { success: false, error: error.message || "Unknown error" };
    }
  }



  // src/services/CalendarService.js - Replace the addEvent method with this improved version

async addEvent(event, userId) {
  try {
    if (!userId) {
      throw new Error("User ID is required to add events");
    }
    
    // Log the incoming event for debugging
    console.log("Adding calendar event:", {
      title: event.summary || event.title || 'Untitled',
      hasStart: !!event.start,
      hasDate: !!(event.start?.dateTime || event.start?.date),
      childName: event.childName || 'None',
      userId
    });
    
    // Ensure event has required fields
    if (!event.summary && !event.title) {
      event.summary = "Untitled Event";
    }
    
    // Standardize event format - this ensures a consistent structure
    const standardizedEvent = {
      ...event,
      summary: event.summary || event.title,
      title: event.title || event.summary, // Ensure both are set for compatibility
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
      // Always include these fields
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      source: event.source || 'manual',
      // Standardize the unique identifier
      eventId: event.eventId || `event-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    };
    
    // Check if a similar event already exists to prevent duplicates
    if (event.familyId) {
      const eventsQuery = query(
        collection(db, "calendar_events"),
        where("familyId", "==", event.familyId),
        where("userId", "==", userId)
      );
      
      const querySnapshot = await getDocs(eventsQuery);
      let isDuplicate = false;
      
      querySnapshot.forEach((doc) => {
        const existingEvent = doc.data();
        if (existingEvent.summary === standardizedEvent.summary) {
          const existingDate = new Date(existingEvent.start.dateTime || existingEvent.start.date);
          const newDate = new Date(standardizedEvent.start.dateTime || standardizedEvent.start.date);
          
          // Compare dates (ignoring time precision issues)
          if (Math.abs(existingDate - newDate) < 3600000) { // Within 1 hour
            console.log("Found duplicate event, skipping creation");
            isDuplicate = true;
          }
        }
      });
      
      if (isDuplicate) {
        this.showNotification("This event already exists in your calendar", "info");
        return { success: true, isDuplicate: true };
      }
    }
    
    // Save event to Firestore in the single calendar_events collection
    const eventRef = collection(db, "calendar_events");
    const docRef = await addDoc(eventRef, standardizedEvent);
    console.log("Event saved to Firestore with ID:", docRef.id);
    
    // Dispatch events - this is crucial for keeping the UI in sync
    if (typeof window !== 'undefined') {
      // Force refresh all calendar views
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
        // Also dispatch specific event type for more targeted refreshes
        window.dispatchEvent(new CustomEvent('calendar-event-added', {
          detail: { 
            eventId: docRef.id,
            eventType: standardizedEvent.eventType,
            childId: standardizedEvent.childId,
            childName: standardizedEvent.childName
          }
        }));
      }, 300);
    }
    
    // Show success notification
    this.showNotification(`Event "${standardizedEvent.summary}" added to your calendar`, "success");
    
    return {
      success: true,
      eventId: docRef.id,
      firestoreId: docRef.id  // Always include the Firestore ID as the universal ID
    };
  } catch (error) {
    console.error("Error adding event to calendar:", error);
    this.showNotification("Failed to add event to calendar", "error");
    return { success: false, error: error.message || "Unknown error" };
  }
}

/// In CalendarService.js - Find the addChildEvent method and replace it with this:
// Fix for CalendarService.js - replace the addChildEvent method
async addChildEvent(event, userId) {
  try {
    if (!userId) {
      throw new Error("User ID is required to add events");
    }
    
    console.log("Adding child calendar event:", {
      title: event.title || 'Untitled',
      childName: event.childName || 'Unknown child',
      hasDate: !!(event.dateTime),
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
    
    // Format child event
    const standardizedEvent = {
      ...cleanedEvent,
      summary: cleanedEvent.title,
      description: cleanedEvent.description || '',
      start: {
        dateTime: cleanedEvent.dateTime instanceof Date 
          ? cleanedEvent.dateTime.toISOString() 
          : new Date(cleanedEvent.dateTime).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: cleanedEvent.endDateTime instanceof Date 
          ? cleanedEvent.endDateTime.toISOString() 
          : new Date(new Date(cleanedEvent.dateTime).getTime() + 60*60000).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      location: cleanedEvent.location || '',
      childId: cleanedEvent.childId,
      childName: cleanedEvent.childName,
      attendingParentId: cleanedEvent.attendingParentId,
      eventType: cleanedEvent.eventType || 'other',
      extraDetails: cleanedEvent.extraDetails || {},
      creationSource: cleanedEvent.creationSource || 'manual'
    };
    
    // Save event to Firestore
    const eventData = {
      ...standardizedEvent,
      userId,
      familyId: cleanedEvent.familyId || null,
      createdAt: serverTimestamp()
    };
    
    const eventRef = collection(db, "calendar_events"); // Use regular events collection, not child-specific
    const docRef = await addDoc(eventRef, eventData);
    
    // Dispatch a single event to notify components - NO force refresh to avoid duplication
    if (typeof window !== 'undefined') {
      const updateEvent = new CustomEvent('calendar-child-event-added', {
        detail: { 
          eventId: docRef.id, 
          childId: cleanedEvent.childId,
          childName: cleanedEvent.childName
        }
      });
      window.dispatchEvent(updateEvent);
    }
    
    // Show success notification
    this.showNotification(`${standardizedEvent.summary} added to your calendar for ${cleanedEvent.childName}`, "success");
    
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