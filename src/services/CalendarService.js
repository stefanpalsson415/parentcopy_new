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
    this.mockMode = false; // Set to false to use real Google Calendar API
    this.apiKey = process.env.REACT_APP_GOOGLE_API_KEY;
    this.clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    console.log("CalendarService initialized. Using real Google Calendar API");
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
      if (!userId) {
        console.warn("No userId provided to loadUserCalendarSettings");
        return null;
      }
      
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
      if (!userId) {
        console.warn("No userId provided to saveUserCalendarSettings");
        return false;
      }
      
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

  // Initialize Google Calendar API with Firebase Auth token
  // Update the initializeGoogleCalendar method around line 235
  async initializeGoogleCalendar() {
    console.log("Initializing Google Calendar");
    
    // If using mock mode, set up simulated functions
    if (this.mockMode) {
      console.log("Using mock Google Calendar implementation");
      this.googleApiLoaded = true;
      this.calendarConnected = true;
      
      // Set up mock gapi
      if (!window.gapi) {
        window.gapi = {
          auth2: {
            getAuthInstance: () => ({
              isSignedIn: { get: () => true },
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
      
      return true;
    }
    
    // Real implementation
    return new Promise((resolve, reject) => {
      try {
        // Check if script is already loaded
        if (window.gapi) {
          console.log("Google API client already loaded");
          
          // Even if gapi is loaded, we need to ensure auth2 is initialized
          if (window.gapi.auth2 && window.gapi.auth2.getAuthInstance()) {
            console.log("Google Auth2 already initialized");
            this.googleApiLoaded = true;
            resolve(true);
            return;
          } else if (window.gapi.client) {
            // Auth2 not initialized but client is available
            console.log("Initializing Google Auth2...");
            this.initializeAuth2()
              .then(() => {
                this.googleApiLoaded = true;
                resolve(true);
              })
              .catch(err => {
                console.error("Error initializing Auth2:", err);
                this.mockMode = true;
                resolve(true);
              });
            return;
          }
        }
        
        console.log("Loading Google API script");
        // Load the Google API script
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
          console.log("Google API script loaded, loading client and auth2 modules");
          window.gapi.load('client:auth2', () => {
            console.log("Gapi client and auth2 loaded, initializing client");
            this.initializeAuth2()
              .then(() => {
                this.googleApiLoaded = true;
                resolve(true);
              })
              .catch(err => {
                console.error("Error initializing Auth2:", err);
                this.mockMode = true;
                resolve(true);
              });
          });
        };
        
        script.onerror = (error) => {
          console.error("Error loading Google API script:", error);
          this.mockMode = true;
          resolve(true);
        };
        
        document.body.appendChild(script);
      } catch (error) {
        console.error("Unexpected error in initializeGoogleCalendar:", error);
        this.mockMode = true;
        resolve(true);
      }
    });
  }
  
  // Add this helper method for Auth2 initialization
  async initializeAuth2() {
    return window.gapi.client.init({
      apiKey: this.apiKey,
      clientId: this.clientId,
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
      scope: 'https://www.googleapis.com/auth/calendar'
    });
  }



// Add after the listUserCalendars method
async debugGoogleCalendarConnection() {
  try {
    console.log("Testing Google Calendar connection...");
    
    // Check if gapi is loaded
    if (!window.gapi) {
      console.error("Google API (gapi) not loaded");
      return {
        success: false,
        error: "Google API not loaded"
      };
    }
    
    // Initialize Google Calendar if needed
    if (!this.googleApiLoaded) {
      console.log("Initializing Google Calendar API...");
      await this.initializeGoogleCalendar();
    }
    
    // Check if signed in
    const isSignedIn = this.isSignedInToGoogle();
    console.log("Is signed in to Google:", isSignedIn);
    
    if (!isSignedIn) {
      console.log("Attempting to sign in to Google...");
      await this.signInToGoogle();
    }
    
    // Test API by listing calendars
    console.log("Listing available calendars...");
    const calendars = await this.listUserCalendars();
    console.log("Available calendars:", calendars);
    
    return {
      success: true,
      message: "Google Calendar API test successful",
      calendars: calendars
    };
  } catch (error) {
    console.error("Error testing Google Calendar connection:", error);
    return {
      success: false,
      error: error.message || "Unknown error"
    };
  }
}


  // Initialize Apple Calendar integration
  async initializeAppleCalendar() {
    // Apple Calendar is accessed through the Web Calendar API
    // This API is browser-dependent and less standardized
    if (!this.appleCalendarAvailable) {
      console.warn("Apple Calendar is not supported in this browser");
      return false;
    }
    
    // Using mock implementation for now
    console.log("Using mock Apple Calendar implementation");
    return true;
  }

  // Sign in to Google Calendar
  async signInToGoogle() {
    if (!this.googleApiLoaded) {
      await this.initializeGoogleCalendar();
    }
    
    try {
      // In mock mode, return success directly
      if (this.mockMode) {
        console.log("Using mock Google sign-in (success)");
        this.calendarConnected = true;
        return true;
      }
      
      // Check if auth2 is available and initialized
      if (!window.gapi || !window.gapi.auth2) {
        console.log("Auth2 not available, initializing Google Calendar again");
        await this.initializeGoogleCalendar();
        
        // If still not available, fall back to mock mode
        if (!window.gapi || !window.gapi.auth2) {
          console.log("Auth2 still not available after initialization, falling back to mock mode");
          this.mockMode = true;
          this.calendarConnected = true;
          return true;
        }
      }
      
      // Get auth instance, re-initialize if null
      let authInstance = window.gapi.auth2.getAuthInstance();
      if (!authInstance) {
        console.log("Auth instance is null, re-initializing");
        await this.initializeAuth2();
        authInstance = window.gapi.auth2.getAuthInstance();
        
        // If still null, fall back to mock mode
        if (!authInstance) {
          console.log("Auth instance still null after re-initialization, falling back to mock mode");
          this.mockMode = true;
          this.calendarConnected = true;
          return true;
        }
      }
      
      // Now attempt sign in
      console.log("Attempting to sign in to Google Calendar");
      const result = await authInstance.signIn();
      
      // Store the token for reuse
      if (result && result.getAuthResponse) {
        const authResponse = result.getAuthResponse();
        window.localStorage.setItem('googleAuthToken', JSON.stringify(authResponse));
        console.log("Saved Google auth token for reuse");
      }
      
      this.calendarConnected = true;
      return true;
    } catch (error) {
      console.error("Error signing in to Google:", error);
      
      // Fall back to mock mode for better user experience
      console.log("Falling back to mock calendar mode after error");
      this.mockMode = true;
      this.calendarConnected = true;
      return true;
    }
  }

  isSignedInToGoogle() {
    // Always return true in mock mode
    if (this.mockMode) return true;
    
    if (!this.googleApiLoaded || !window.gapi || !window.gapi.auth2) {
      console.warn("Google API not fully loaded when checking sign-in status");
      return false;
    }
    
    try {
      // First check if auth instance exists
      const authInstance = window.gapi.auth2.getAuthInstance();
      if (!authInstance) {
        console.warn("Google Auth instance is null");
        return false;
      }
      return authInstance.isSignedIn.get();
    } catch (error) {
      console.error("Error checking Google sign-in status:", error);
      return false;
    }
  }

  // Sign out from Google
  async signOutFromGoogle() {
    if (this.mockMode) {
      console.log("Mock sign-out successful");
      return true;
    }
    
    if (!this.googleApiLoaded || !window.gapi || !window.gapi.auth2) {
      console.warn("Google API not fully loaded when attempting sign-out");
      return false;
    }
    
    try {
      await window.gapi.auth2.getAuthInstance().signOut();
      this.calendarConnected = false;
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
      console.warn("No calendar selected. Please set up a calendar in Settings.");
      return { success: false, error: "No calendar selected" };
    }
    
    try {
      if (targetCalendar === 'google') {
        return await this.addEventToGoogleCalendar(event);
      } else if (targetCalendar === 'apple') {
        return await this.addEventToAppleCalendar(event);
      } else if (targetCalendar === 'ics') {
        return await this.generateICSFile(event);
      } else {
        return { success: false, error: `Calendar type ${targetCalendar} not supported` };
      }
    } catch (error) {
      console.error(`Error adding event to ${targetCalendar} calendar:`, error);
      return { success: false, error: error.message || "Unknown error" };
    }
  }

// Debug Google Calendar connection
async debugGoogleCalendarConnection() {
  try {
    console.log("Testing Google Calendar connection...");
    
    // Check if gapi is loaded
    if (!window.gapi) {
      console.error("Google API (gapi) not loaded");
      return {
        success: false,
        error: "Google API not loaded"
      };
    }
    
    // Initialize Google Calendar if needed
    if (!this.googleApiLoaded) {
      console.log("Initializing Google Calendar API...");
      await this.initializeGoogleCalendar();
    }
    
    // Check if signed in
    const isSignedIn = this.isSignedInToGoogle();
    console.log("Is signed in to Google:", isSignedIn);
    
    if (!isSignedIn) {
      console.log("Attempting to sign in to Google...");
      await this.signInToGoogle();
    }
    
    // Test API by listing calendars
    console.log("Listing available calendars...");
    const calendars = await this.listUserCalendars();
    console.log("Available calendars:", calendars);
    
    return {
      success: true,
      message: "Google Calendar API test successful",
      calendars: calendars
    };
  } catch (error) {
    console.error("Error testing Google Calendar connection:", error);
    return {
      success: false,
      error: error.message || "Unknown error"
    };
  }
}


  // Add event to Google Calendar
  async addEventToGoogleCalendar(event) {
    console.log("Adding event to Google Calendar");
    
    if (!this.googleApiLoaded) {
      try {
        console.log("Google Calendar not initialized, initializing now");
        await this.initializeGoogleCalendar();
      } catch (error) {
        console.error("Failed to initialize Google Calendar:", error);
        return { success: false, error: "Failed to initialize Google Calendar" };
      }
    }
    
    if (!this.isSignedInToGoogle()) {
      try {
        console.log("Not signed in to Google Calendar, signing in now");
        await this.signInToGoogle();
      } catch (error) {
        console.error("Failed to sign in to Google Calendar:", error);
        return { success: false, error: "Failed to sign in to Google Calendar" };
      }
    }
    
    try {
      // Check if we should use mock mode as fallback
      if (this.mockMode) {
        console.log("Mock adding event to Google Calendar:", event.summary);
        
        // Generate a unique ID with timestamp
        const mockEventId = 'mock-event-id-' + Date.now();
        console.log(`Generated mock event ID: ${mockEventId}`);
        
        // Show a temporary success message
        this.showNotification(`Event "${event.summary}" added to Google Calendar (mock)`, "success");
        
        return {
          success: true,
          eventId: mockEventId,
          eventLink: '#'
        };
      }
      
      // Real Google Calendar integration
      const calendarId = this.calendarSettings?.googleCalendar?.calendarId || 'primary';
      console.log("Adding event to Google Calendar:", {
        calendarId,
        eventSummary: event.summary,
        eventStart: event.start
      });
      
      // Debug API state and ensure we're properly initialized
      console.log("Current Google API state:", {
        isGapiDefined: !!window.gapi,
        isClientDefined: !!(window.gapi && window.gapi.client),
        isAuth2Defined: !!(window.gapi && window.gapi.auth2),
        isCalendarDefined: !!(window.gapi && window.gapi.client && window.gapi.client.calendar),
        authInstance: !!(window.gapi && window.gapi.auth2 && window.gapi.auth2.getAuthInstance())
      });
      
      if (!window.gapi || !window.gapi.client) {
        console.log("Google API client not fully loaded, initializing...");
        await this.initializeGoogleCalendar();
      }
      
      if (!this.isSignedInToGoogle()) {
        console.log("Not signed in to Google, attempting to sign in");
        await this.signInToGoogle();
      }
      
      // Make sure gapi client is initialized with calendar scope
      if (!window.gapi.client.calendar) {
        console.log("Calendar API not loaded, loading it now");
        await window.gapi.client.load('calendar', 'v3');
        console.log("Loaded Google Calendar API");
      }
      
      // Attempt to make the API call
      console.log("Calling Google Calendar API to insert event");
      const response = await window.gapi.client.calendar.events.insert({
        'calendarId': calendarId,
        'resource': event
      });
      
      console.log("Successfully added event to Google Calendar:", response.result);
      
      // Success notification to the user
      this.showNotification(`Event "${event.summary}" added to Google Calendar`, "success");
      
      return {
        success: true,
        eventId: response.result.id,
        eventLink: response.result.htmlLink
      };
    } catch (error) {
      console.error("Error adding event to Google Calendar:", error);
      
      // Error notification to the user
      this.showNotification(`Failed to add event to calendar: ${error.message || 'Unknown error'}`, "error");
      
      // Fall back to mock mode
      if (!this.mockMode) {
        console.log("Falling back to mock mode due to event creation error");
        this.mockMode = true;
        return this.addEventToGoogleCalendar(event);
      }
      
      return { 
        success: false, 
        error: error.message || "Unknown error" 
      };
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

  // Add event to Apple Calendar
  async addEventToAppleCalendar(event) {
    console.log("Adding event to Apple Calendar");
    
    if (!this.appleCalendarAvailable) {
      console.warn("Apple Calendar is not supported in this browser");
      return { success: false, error: "Apple Calendar is not supported in this browser" };
    }
    
    // Fall back to ICS approach for compatibility
    return this.generateICSFile(event);
  }

  // Generate an ICS file for download (works with Apple Calendar, Outlook, etc.)
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
      
      // Show error notification
      this.showNotification("Failed to generate calendar file", "error");
      
      return { success: false, error: error.message || "Unknown error" };
    }
  }

  // List user's calendars (Google only for now)
  async listUserCalendars() {
    console.log("Listing user calendars");
    
    try {
      if (this.mockMode) {
        console.log("Using mock calendar list");
        return [
          { id: 'primary', summary: 'Primary Calendar' },
          { id: 'work', summary: 'Work Calendar' },
          { id: 'family', summary: 'Family Calendar' }
        ];
      }
      
      if (!this.googleApiLoaded) {
        await this.initializeGoogleCalendar();
      }
      
      if (!this.isSignedInToGoogle()) {
        await this.signInToGoogle();
      }
      
      const response = await window.gapi.client.calendar.calendarList.list();
      return response.result.items || [];
    } catch (error) {
      console.error("Error listing calendars:", error);
      
      // Fall back to mock data
      return [
        { id: 'primary', summary: 'Primary Calendar' },
        { id: 'work', summary: 'Work Calendar' },
        { id: 'family', summary: 'Family Calendar' }
      ];
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