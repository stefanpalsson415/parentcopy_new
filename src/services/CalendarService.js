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
    
    // Auth state tracking to prevent multiple popups
    this.authInProgress = false;
    this.lastAuthAttempt = 0;
    
    // Get API credentials from environment variables
    this.apiKey = 'AIzaSyAmR2paggX1Emt4RpGGnlHuadqpveSY0aI';
    this.clientId = '363935868004-1vd75fqpf2e6i8dl73pi4p56br8i4h9p.apps.googleusercontent.com';
    
    // Use real integration by default
    this.mockMode = false;
    
    // Log initialization status
    if (this.apiKey && this.clientId) {
      console.log("CalendarService initialized with API credentials");
    } else {
      console.warn("Calendar Service: API credentials missing - calendar features may be limited");
    }
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

  async initializeGoogleCalendar() {
    // If already initialized, return immediately
    if (this.googleApiLoaded) return true;
    
    return new Promise((resolve, reject) => {
      try {
        // Check if gapi is already available
        if (typeof window.gapi !== 'undefined') {
          if (window.gapi.client && window.gapi.auth2) {
            // Already loaded
            this.googleApiLoaded = true;
            resolve(true);
            return;
          }
          
          // Load auth2 if gapi exists but components aren't loaded
          window.gapi.load('client:auth2', async () => {
            try {
              await window.gapi.client.init({
                apiKey: this.apiKey,
                clientId: this.clientId,
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
                scope: 'https://www.googleapis.com/auth/calendar.events'
              });
              this.googleApiLoaded = true;
              resolve(true);
            } catch (error) {
              console.error("Error initializing gapi client:", error);
              // Don't reject - just resolve with false to prevent unhandled promises
              resolve(false);
            }
          });
          return;
        }
        
        // If gapi doesn't exist, load it
        console.log("Loading Google API script");
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
          window.gapi.load('client:auth2', async () => {
            try {
              await window.gapi.client.init({
                apiKey: this.apiKey,
                clientId: this.clientId,
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
                scope: 'https://www.googleapis.com/auth/calendar.events'
              });
              this.googleApiLoaded = true;
              resolve(true);
            } catch (error) {
              console.error("Error initializing gapi client:", error);
              resolve(false);
            }
          });
        };
        
        script.onerror = () => {
          console.error("Failed to load Google API script");
          resolve(false);
        };
        
        document.body.appendChild(script);
      } catch (error) {
        console.error("Error in Google Calendar initialization:", error);
        resolve(false); // Resolve with false instead of rejecting
      }
    });
  }

 // Private method to initialize gapi client
async _initializeGapiClient() {
  return new Promise(async (resolve, reject) => {
    if (!window.gapi) {
      return reject(new Error("Google API not loaded"));
    }
    
    try {
      // Use a more explicit way to initialize the client with API key and auth
      await window.gapi.client.init({
        apiKey: this.apiKey || 'AIzaSyALjXkZiFZ_Fy143N_dzdaUbyDCtabBr7Y', // Fallback API key
        clientId: this.clientId || '363935868004-baf70v82iuhs34s1hi4f4tnt62hgr1qm.apps.googleusercontent.com', // Fallback client ID
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
        scope: 'https://www.googleapis.com/auth/calendar.events',
        ux_mode: 'popup'
      });
      
      console.log("Google API client initialized successfully");
      resolve(true);
    } catch (error) {
      console.error("Error initializing Google API client:", error);
      reject(error);
    }
  });
}

// Get auth instance with error handling
_getAuthInstance() {
  try {
    if (!window.gapi) {
      console.warn("Google API not available");
      return null;
    }
    
    if (!window.gapi.auth2) {
      console.warn("Google Auth2 not loaded yet");
      // Try to load auth2 if it's not available
      window.gapi.load('auth2', () => {
        console.log("Auth2 loaded on demand");
      });
      return null;
    }
    
    // Get or initialize auth instance
    if (!window.gapi.auth2.getAuthInstance()) {
      console.log("Auth instance not initialized, creating it");
      return window.gapi.auth2.init({
        client_id: this.clientId || '363935868004-baf70v82iuhs34s1hi4f4tnt62hgr1qm.apps.googleusercontent.com'
      });
    }
    
    return window.gapi.auth2.getAuthInstance();
  } catch (error) {
    console.error("Error getting auth instance:", error);
    return null;
  }
}

  // Sign in to Google Calendar with rate limiting
  async signInToGoogle() {
    // Prevent multiple auth attempts within 3 seconds
    const now = Date.now();
    if (this.authInProgress || (now - this.lastAuthAttempt < 3000)) {
      console.log("Auth attempt blocked - already in progress or too soon");
      throw new Error("Authentication already in progress. Please wait a moment.");
    }
    
    this.authInProgress = true;
    this.lastAuthAttempt = now;
    
    try {
      console.log("Attempting to sign in to Google Calendar");
      
      // Initialize Google Calendar if needed
      if (!this.googleApiLoaded) {
        await this.initializeGoogleCalendar();
      }
      
      // Verify auth2 is available
      const authInstance = this._getAuthInstance();
      if (!authInstance) {
        throw new Error("Google Auth instance is not available");
      }
      
      // Start the sign-in process
      console.log("Starting Google sign-in process");
      
      // Use options to improve sign-in experience
      const user = await authInstance.signIn({
        prompt: 'select_account', // Allow account selection
        ux_mode: 'popup'
      });
      
      console.log("Google sign-in successful");
      
      // Store the token for reuse
      if (user && user.getAuthResponse) {
        const authResponse = user.getAuthResponse();
        const profile = user.getBasicProfile();
        
        const tokenData = {
          ...authResponse,
          email: profile ? profile.getEmail() : null,
          name: profile ? profile.getName() : null,
          stored_at: Date.now(),
          expires_at: authResponse.expires_at
        };
        
        localStorage.setItem('googleAuthToken', JSON.stringify(tokenData));
        console.log("Saved Google auth token for reuse");
      }
      
      this.showNotification("Successfully connected to Google Calendar!", "success");
      return user;
    } catch (error) {
      console.error("Error signing in to Google:", error);
      
      // Provide improved error message
      let errorMessage = "Failed to connect to Google Calendar.";
      
      if (error.error === "popup_blocked_by_browser") {
        errorMessage = "Popup blocked by browser. Please allow popups for this site and try again.";
      } else if (error.error === "access_denied") {
        errorMessage = "Google access was denied. Please try again.";
      } else if (error.message) {
        errorMessage += " Error: " + error.message;
      }
      
      this.showNotification(errorMessage, "error");
      throw error;
    } finally {
      this.authInProgress = false;
    }
  }

  // Check if signed in to Google
  isSignedInToGoogle() {
    if (!this.googleApiLoaded || !window.gapi || !window.gapi.auth2) {
      console.warn("Google API not fully loaded when checking sign-in status");
      return false;
    }
    
    try {
      const authInstance = this._getAuthInstance();
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
    if (!this.googleApiLoaded || !window.gapi || !window.gapi.auth2) {
      console.warn("Google API not fully loaded when attempting sign-out");
      return false;
    }
    
    try {
      const authInstance = this._getAuthInstance();
      if (!authInstance) {
        console.warn("Google Auth instance is null");
        return false;
      }
      
      await authInstance.signOut();
      localStorage.removeItem('googleAuthToken');
      console.log("Signed out from Google successfully");
      return true;
    } catch (error) {
      console.error("Error signing out from Google:", error);
      return false;
    }
  }

  // Get events from Google Calendar
  async getEventsFromCalendar(timeMin, timeMax, calendarId = 'primary') {
    console.log("Getting events from Google Calendar");
    
    try {
      if (!this.googleApiLoaded) {
        await this.initializeGoogleCalendar();
      }
      
      if (!this.isSignedInToGoogle()) {
        await this.signInToGoogle();
      }
      
      // Ensure calendar API is loaded
      if (!window.gapi.client.calendar) {
        await window.gapi.client.load('calendar', 'v3');
      }
      
      // Get events from the calendar
      const response = await window.gapi.client.calendar.events.list({
        'calendarId': calendarId,
        'timeMin': timeMin.toISOString(),
        'timeMax': timeMax.toISOString(),
        'singleEvents': true,
        'orderBy': 'startTime'
      });
      
      return response.result.items || [];
    } catch (error) {
      console.error("Error getting events from Google Calendar:", error);
      
      // If we get a 401 Unauthorized, try to refresh the token
      if (error.status === 401) {
        try {
          console.log("Got 401 error, trying to refresh auth");
          await this.signInToGoogle();
          return this.getEventsFromCalendar(timeMin, timeMax, calendarId);
        } catch (refreshError) {
          console.error("Error refreshing auth:", refreshError);
        }
      }
      
      throw error;
    }
  }

  // List user's calendars
  async listUserCalendars() {
    console.log("Listing user calendars");
    
    try {
      if (!this.googleApiLoaded) {
        await this.initializeGoogleCalendar();
      }
      
      if (!this.isSignedInToGoogle()) {
        await this.signInToGoogle();
      }
      
      // Ensure calendar API is loaded
      if (!window.gapi.client.calendar) {
        await window.gapi.client.load('calendar', 'v3');
      }
      
      const response = await window.gapi.client.calendar.calendarList.list();
      return response.result.items || [];
    } catch (error) {
      console.error("Error listing calendars:", error);
      throw error;
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

  // Add event to Google Calendar
  async addEventToGoogleCalendar(event) {
    console.log("Adding event to Google Calendar", event);
    
    if (!this.googleApiLoaded) {
      try {
        console.log("Google Calendar not initialized, initializing now");
        await this.initializeGoogleCalendar();
      } catch (error) {
        console.error("Failed to initialize Google Calendar:", error);
        this.showNotification("Failed to connect to Google Calendar. Please try again later.", "error");
        throw error;
      }
    }
    
    // Force sign-in check every time
    if (!this.isSignedInToGoogle()) {
      try {
        console.log("Not signed in to Google Calendar, attempting to sign in");
        await this.signInToGoogle();
        
        // Double-check that sign-in worked
        if (!this.isSignedInToGoogle()) {
          console.log("Sign-in attempt failed");
          throw new Error("Google sign-in failed. Please try again.");
        }
      } catch (error) {
        console.error("Failed to sign in to Google:", error);
        throw error;
      }
    }
    
    try {
      // Get the calendar ID from settings or default to primary
      const calendarId = this.calendarSettings?.googleCalendar?.calendarId || 'primary';
      console.log("Adding event to Google Calendar:", {
        calendarId,
        eventSummary: event.summary,
        eventStart: event.start
      });
      
      // Ensure calendar API is loaded
      if (!window.gapi.client.calendar) {
        console.log("Calendar API not loaded, loading it now");
        await window.gapi.client.load('calendar', 'v3');
        console.log("Loaded Google Calendar API");
      }
      
      // Make the API call to insert the event
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
        eventLink: response.result.htmlLink,
        isMock: false
      };
    } catch (error) {
      console.error("Error adding event to Google Calendar:", error);
      
      // Error notification to the user
      this.showNotification(`Failed to add event to calendar: ${error.message || 'Unknown error'}`, "error");
      throw error;
    }
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
      
      // Show error notification
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

  // Debug Google Calendar connection
  async debugGoogleCalendarConnection() {
    console.log("Running Google Calendar connection diagnostic");
    
    try {
      // Step 1: Initialize Google Calendar API
      await this.initializeGoogleCalendar();
      console.log("✓ Google Calendar API initialized");
      
      // Step 2: Check if signed in
      const isSignedIn = this.isSignedInToGoogle();
      console.log(`${isSignedIn ? '✓' : '✗'} Google sign-in status: ${isSignedIn ? 'Signed in' : 'Not signed in'}`);
      
      if (!isSignedIn) {
        console.log("Attempting to sign in to Google");
        await this.signInToGoogle();
        console.log("✓ Successfully signed in to Google");
      }
      
      // Step 3: List calendars
      const calendars = await this.listUserCalendars();
      console.log(`✓ Successfully listed ${calendars.length} calendars`);
      
      // Step 4: Create a test event
      const testEvent = {
        'summary': 'Allie Test Event',
        'description': 'This is a test event created by Allie to verify Google Calendar integration',
        'start': {
          'dateTime': new Date(Date.now() + 3600000).toISOString(),
          'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        'end': {
          'dateTime': new Date(Date.now() + 7200000).toISOString(),
          'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      };
      
      console.log("Testing event creation...");
      const result = await this.addEventToGoogleCalendar(testEvent);
      console.log(`✓ Successfully created test event with ID: ${result.eventId}`);
      
      return {
        success: true,
        message: "Google Calendar integration is working correctly",
        calendars: calendars,
        testEventId: result.eventId
      };
    } catch (error) {
      console.error("Google Calendar diagnostic failed:", error);
      
      return {
        success: false,
        error: error.message || "Unknown error",
        stage: "Google Calendar diagnostic"
      };
    }
  }

// Debug Google Calendar connection
async debugGoogleCalendarConnection() {
  console.log("Running Google Calendar connection diagnostic");
  
  try {
    // Step 1: Initialize Google Calendar API
    await this.initializeGoogleCalendar();
    console.log("✓ Google Calendar API initialized");
    
    // Step 2: Check if signed in
    const isSignedIn = this.isSignedInToGoogle();
    console.log(`${isSignedIn ? '✓' : '✗'} Google sign-in status: ${isSignedIn ? 'Signed in' : 'Not signed in'}`);
    
    if (!isSignedIn) {
      console.log("Attempting to sign in to Google");
      await this.signInToGoogle();
      console.log("✓ Successfully signed in to Google");
    }
    
    // Step 3: List calendars
    const calendars = await this.listUserCalendars();
    console.log(`✓ Successfully listed ${calendars.length} calendars`);
    
    // Step 4: Create a test event
    const testEvent = {
      'summary': 'Allie Test Event',
      'description': 'This is a test event created by Allie to verify Google Calendar integration',
      'start': {
        'dateTime': new Date(Date.now() + 3600000).toISOString(),
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      'end': {
        'dateTime': new Date(Date.now() + 7200000).toISOString(),
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };
    
    console.log("Testing event creation...");
    const result = await this.addEventToGoogleCalendar(testEvent);
    console.log(`✓ Successfully created test event with ID: ${result.eventId}`);
    
    return {
      success: true,
      message: "Google Calendar integration is working correctly",
      calendars: calendars,
      testEventId: result.eventId
    };
  } catch (error) {
    console.error("Google Calendar diagnostic failed:", error);
    
    return {
      success: false,
      error: error.message || "Unknown error",
      stage: "Google Calendar diagnostic"
    };
  }
}


  // Diagnose Google Calendar issues
  async diagnoseGoogleCalendarIssues() {
    try {
      let report = "Google Calendar Diagnostic Report\n";
      report += "===============================\n\n";
      
      // Check environment variables
      report += "API Credentials Check:\n";
      report += `- API Key present: ${this.apiKey ? 'Yes' : 'No'}\n`;
      report += `- Client ID present: ${this.clientId ? 'Yes' : 'No'}\n\n`;
      
      // Check if gapi is loaded
      report += "Google API Library Check:\n";
      report += `- gapi loaded: ${window.gapi ? 'Yes' : 'No'}\n`;
      if (window.gapi) {
        report += `- gapi.auth2 loaded: ${window.gapi.auth2 ? 'Yes' : 'No'}\n`;
        report += `- gapi.client loaded: ${window.gapi.client ? 'Yes' : 'No'}\n`;
        if (window.gapi.client) {
          report += `- gapi.client.calendar loaded: ${window.gapi.client.calendar ? 'Yes' : 'No'}\n`;
        }
      }
      report += "\n";
      
      // Check authentication status
      report += "Authentication Status:\n";
      if (window.gapi && window.gapi.auth2) {
        try {
          const authInstance = this._getAuthInstance();
          if (authInstance) {
            const isSignedIn = authInstance.isSignedIn.get();
            report += `- Signed in: ${isSignedIn ? 'Yes' : 'No'}\n`;
            
            if (isSignedIn) {
              const user = authInstance.currentUser.get();
              const profile = user.getBasicProfile();
              const email = profile ? profile.getEmail() : 'Unknown';
              report += `- Signed in as: ${email}\n`;
              
              const auth = user.getAuthResponse();
              report += `- Token expires at: ${new Date(auth.expires_at * 1000).toLocaleString()}\n`;
              report += `- Token valid: ${auth.expires_at * 1000 > Date.now() ? 'Yes' : 'No'}\n`;
            }
          } else {
            report += "- Auth instance not available\n";
          }
        } catch (e) {
          report += `- Error checking auth status: ${e.message}\n`;
        }
      } else {
        report += "- Cannot check auth status (gapi.auth2 not loaded)\n";
      }
      report += "\n";
      
      // Check localStorage for tokens
      report += "Token Storage Check:\n";
      try {
        const token = localStorage.getItem('googleAuthToken');
        report += `- Token in localStorage: ${token ? 'Yes' : 'No'}\n`;
        
        if (token) {
          const tokenData = JSON.parse(token);
          report += `- Token email: ${tokenData.email || 'Not available'}\n`;
          report += `- Token stored at: ${new Date(tokenData.stored_at).toLocaleString()}\n`;
          report += `- Token expires at: ${new Date(tokenData.expires_at * 1000).toLocaleString()}\n`;
          report += `- Token valid: ${tokenData.expires_at * 1000 > Date.now() ? 'Yes' : 'No'}\n`;
        }
      } catch (e) {
        report += `- Error reading token from localStorage: ${e.message}\n`;
      }
      
      // Check for user-specific tokens
      const tokenKeys = Object.keys(localStorage).filter(key => key.startsWith('googleToken_'));
      if (tokenKeys.length > 0) {
        report += `- Found ${tokenKeys.length} user-specific tokens:\n`;
        tokenKeys.forEach(key => {
          try {
            const tokenData = JSON.parse(localStorage.getItem(key));
            report += `  * ${key}: ${tokenData.email || 'No email'}\n`;
          } catch (e) {
            report += `  * ${key}: Error parsing token\n`;
          }
        });
      } else {
        report += "- No user-specific tokens found\n";
      }
      
      // Try to list calendars as a final test
      report += "\nCalendar Access Test:\n";
      try {
        await this.initializeGoogleCalendar();
        report += "- API initialized: Yes\n";
        
        if (this.isSignedInToGoogle()) {
          report += "- Signed in: Yes\n";
          
          try {
            const calendars = await this.listUserCalendars();
            report += `- Calendar access: Yes (${calendars.length} calendars)\n`;
            
            if (calendars.length > 0) {
              report += "- Available calendars:\n";
              calendars.forEach(cal => {
                report += `  * ${cal.summary} (${cal.id})\n`;
              });
            }
          } catch (e) {
            report += `- Calendar access: No (${e.message})\n`;
          }
        } else {
          report += "- Signed in: No\n";
          report += "- Calendar access: Cannot test (not signed in)\n";
        }
      } catch (e) {
        report += `- API initialized: No (${e.message})\n`;
        report += "- Calendar access: Cannot test (API not initialized)\n";
      }
      
      return report;
    } catch (error) {
      return `Error running diagnostic: ${error.message}`;
    }
  }
}

export default new CalendarService();