// src/services/CalendarService.js
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

class CalendarService {
  constructor() {
    this.isInitialized = false;
    this.googleApiLoaded = false;
    this.appleCalendarAvailable = this.checkAppleCalendarSupport();
    this.calendarSettings = {};
    this.activeCalendarType = null;
  }

  // Check if Apple Calendar is supported
  checkAppleCalendarSupport() {
    return typeof window !== 'undefined' && 
           'ApplePaySession' in window && 
           navigator.userAgent.indexOf('Mac') !== -1;
  }

  // Load user's calendar preferences
  async loadUserCalendarSettings(userId) {
    try {
      if (!userId) return null;
      
      const docRef = doc(db, "userSettings", userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        this.calendarSettings = docSnap.data().calendarSettings || {};
        this.activeCalendarType = this.calendarSettings.defaultCalendarType || null;
        return this.calendarSettings;
      }
      
      // Initialize default settings if none exist
      const defaultSettings = {
        defaultCalendarType: null,
        googleCalendar: {
          enabled: false,
          calendarId: 'primary'
        },
        appleCalendar: {
          enabled: false
        },
        otherCalendars: [],
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
      if (!userId) return false;
      
      const docRef = doc(db, "userSettings", userId);
      await updateDoc(docRef, { calendarSettings: settings });
      
      this.calendarSettings = settings;
      this.activeCalendarType = settings.defaultCalendarType;
      return true;
    } catch (error) {
      console.error("Error saving calendar settings:", error);
      return false;
    }
  }

  // Initialize the appropriate calendar API based on user preference
  async initialize(userId) {
    if (this.isInitialized) return true;
    
    try {
      // Load user's calendar settings
      await this.loadUserCalendarSettings(userId);
      
      // Initialize based on preference
      if (this.activeCalendarType === 'google') {
        await this.initializeGoogleCalendar();
      } else if (this.activeCalendarType === 'apple') {
        await this.initializeAppleCalendar();
      } else {
        // No default calendar set
        return false;
      }
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error("Error initializing calendar service:", error);
      return false;
    }
  }

  // Initialize Google Calendar API
// Initialize Google Calendar API with Firebase Auth token
async initializeGoogleCalendar() {
  return new Promise((resolve, reject) => {
    // For testing/development, create a mock implementation
    const mockMode = false; // Set to false to use real Google API
    
    if (mockMode) {
      console.log("Using mock Google Calendar implementation");
      this.googleApiLoaded = true;
      
      // Create mock functions for testing
      if (!window.gapi) {
        window.gapi = {
          auth2: {
            getAuthInstance: () => ({
              isSignedIn: { get: () => false },
              signIn: async () => true,
              signOut: async () => true
            })
          },
          client: {
            calendar: {
              events: {
                insert: async () => ({ result: { id: 'mock-event-id', htmlLink: '#' } })
              },
              calendarList: {
                list: async () => ({ result: { items: [
                  { id: 'primary', summary: 'Primary Calendar' },
                  { id: 'work', summary: 'Work Calendar' },
                  { id: 'family', summary: 'Family Calendar' }
                ]}})
              }
            }
          }
        };
      }
      
      resolve(true);
      return;
    }
        
    // Real implementation
    if (!window.gapi) {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('client:auth2', () => {
          this.initializeGapiClient(resolve, reject);
        });
      };
      script.onerror = (error) => {
        console.error("Error loading Google API script:", error);
        reject(error);
      };
      document.body.appendChild(script);
    } else {
      // API already loaded, initialize client
      window.gapi.load('client:auth2', () => {
        this.initializeGapiClient(resolve, reject);
      });
    }
  });
}

// Separated the GAPI client initialization for better reuse
async initializeGapiClient(resolve, reject) {
  try {
    // Initialize the client
    await window.gapi.client.init({
      apiKey: process.env.REACT_APP_GOOGLE_API_KEY || 'YOUR_API_KEY',
      clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID',
      scope: 'https://www.googleapis.com/auth/calendar',
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
    });
    
    // Check if we already have a Google auth token from our main auth
    const auth = window.gapi.auth2.getAuthInstance();
    
    // If there's an authenticated user from Firebase with Google
    // reuse that auth token if possible
    if (window.localStorage.getItem('googleAuthToken')) {
      try {
        // Set the auth token in gapi
        const token = JSON.parse(window.localStorage.getItem('googleAuthToken'));
        auth.currentUser.get().setAuthResponse(token);
        console.log("Reused existing Google auth token");
      } catch (e) {
        console.error("Error reusing Google auth token:", e);
        // If we can't reuse the token, we'll just proceed normally
      }
    }
    
    this.googleApiLoaded = true;
    resolve(true);
  } catch (error) {
    console.error("Error initializing Google API:", error);
    reject(error);
  }
}

  // Initialize Apple Calendar integration
  async initializeAppleCalendar() {
    // Apple Calendar is accessed through the Web Calendar API
    // This API is browser-dependent and less standardized
    if (!this.appleCalendarAvailable) {
      throw new Error("Apple Calendar is not supported in this browser");
    }
    
    // Attempt to request calendar access
    try {
      // Check if CalendarManager API is available (macOS browsers)
      if (window.CalendarManager) {
        await window.CalendarManager.requestAccess();
        return true;
      } else {
        throw new Error("Calendar API not available");
      }
    } catch (error) {
      console.error("Error initializing Apple Calendar:", error);
      throw error;
    }
  }

  // Sign in to Google Calendar
async signInToGoogle() {
  if (!this.googleApiLoaded) {
    await this.initializeGoogleCalendar();
  }
  
  try {
    const authInstance = window.gapi.auth2.getAuthInstance();
    const result = await authInstance.signIn();
    
    // Store the token for reuse
    if (result && result.getAuthResponse) {
      const authResponse = result.getAuthResponse();
      window.localStorage.setItem('googleAuthToken', JSON.stringify(authResponse));
      console.log("Saved Google auth token for reuse");
    }
    
    return !!result;
  } catch (error) {
    console.error("Error signing in to Google:", error);
    throw error;
  }
}

  // Check if signed in to Google
  isSignedInToGoogle() {
    if (!this.googleApiLoaded) return false;
    return window.gapi.auth2.getAuthInstance().isSignedIn.get();
  }

  // Sign out from Google
  async signOutFromGoogle() {
    if (!this.googleApiLoaded) return false;
    try {
      await window.gapi.auth2.getAuthInstance().signOut();
      return true;
    } catch (error) {
      console.error("Error signing out from Google:", error);
      return false;
    }
  }

  // General method to add an event to user's calendar
  async addEvent(event, calendarType = null) {
    const targetCalendar = calendarType || this.activeCalendarType;
    
    if (!targetCalendar) {
      throw new Error("No calendar selected. Please set up a calendar in Settings.");
    }
    
    if (targetCalendar === 'google') {
      return this.addEventToGoogleCalendar(event);
    } else if (targetCalendar === 'apple') {
      return this.addEventToAppleCalendar(event);
    } else if (targetCalendar === 'ics') {
      return this.generateICSFile(event);
    } else {
      throw new Error(`Calendar type ${targetCalendar} not supported`);
    }
  }

  // Add event to Google Calendar
  async addEventToGoogleCalendar(event) {
    if (!this.googleApiLoaded) {
      await this.initializeGoogleCalendar();
    }
    
    if (!this.isSignedInToGoogle()) {
      await this.signInToGoogle();
    }
    
    try {
      const calendarId = this.calendarSettings?.googleCalendar?.calendarId || 'primary';
      const response = await window.gapi.client.calendar.events.insert({
        'calendarId': calendarId,
        'resource': event
      });
      
      return {
        success: true,
        eventId: response.result.id,
        eventLink: response.result.htmlLink
      };
    } catch (error) {
      console.error("Error adding event to Google Calendar:", error);
      throw error;
    }
  }

  // Add event to Apple Calendar
  async addEventToAppleCalendar(event) {
    if (!this.appleCalendarAvailable) {
      throw new Error("Apple Calendar is not supported in this browser");
    }
    
    try {
      // This is a simplified approach - in reality, you'd likely use
      // a server-side API or rely on the ICS approach for Apple Calendar
      if (window.CalendarManager) {
        await window.CalendarManager.createEvent({
          title: event.summary,
          startDate: new Date(event.start.dateTime || event.start.date),
          endDate: new Date(event.end.dateTime || event.end.date),
          notes: event.description || '',
          location: event.location || ''
        });
        return { success: true };
      } else {
        // Fallback to ICS approach
        return this.generateICSFile(event);
      }
    } catch (error) {
      console.error("Error adding event to Apple Calendar:", error);
      throw error;
    }
  }

  // Generate an ICS file for download (works with Apple Calendar, Outlook, etc.)
  generateICSFile(event) {
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
      `SUMMARY:${event.summary}`,
      `DTSTART:${formatDateForICS(startTime)}`,
      `DTEND:${formatDateForICS(endTime)}`,
      `DESCRIPTION:${event.description || ''}`,
      `LOCATION:${event.location || ''}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    
    // Create and download the ICS file
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${event.summary.replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return { success: true, downloadInitiated: true };
  }

  // List user's calendars (Google only for now)
  async listUserCalendars() {
    if (!this.googleApiLoaded) {
      await this.initializeGoogleCalendar();
    }
    
    if (!this.isSignedInToGoogle()) {
      await this.signInToGoogle();
    }
    
    try {
      const response = await window.gapi.client.calendar.calendarList.list();
      return response.result.items || [];
    } catch (error) {
      console.error("Error listing calendars:", error);
      throw error;
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
      'summary': `Allie Task: ${task.title}`,
      'description': `${task.description}\n\nAssigned to: ${task.assignedToName}\nCategory: ${task.category || task.focusArea}`,
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
      'summary': `Allie Family Meeting - Week ${weekNumber}`,
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
      'summary': `Reminder: ${task.title}`,
      'description': `This is a reminder to complete your Allie task: ${task.description}`,
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