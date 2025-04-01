// src/services/CalendarService.js
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import GoogleAuthManager from '../utils/GoogleAuthManager';

class CalendarService {
  constructor() {
    this.isInitialized = false;
    this.googleApiLoaded = false;
    this.appleCalendarAvailable = this.checkAppleCalendarSupport();
    this.calendarSettings = {};
    this.activeCalendarType = null;
    
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
        // Load the Google API script if not already loaded
        if (!window.gapi) {
          console.log("Loading Google API script");
          const script = document.createElement('script');
          script.src = 'https://apis.google.com/js/api.js';
          script.onload = () => this._initGapiClient(resolve, reject);
          script.onerror = () => {
            console.warn("Failed to load Google API script - calendar features will be limited");
            this.mockMode = true; // Fall back to mock mode
            resolve(false); // Resolve with false instead of rejecting
          };
          script.async = true; // Make script loading async
          script.defer = true; // Defer loading
          document.body.appendChild(script);
        } else {
          this._initGapiClient(resolve, reject);
        }
      } catch (error) {
        console.warn("Error in Google Calendar initialization:", error);
        this.mockMode = true; // Fall back to mock mode
        resolve(false); // Resolve with false instead of rejecting
      }
    });
  }
  
  _initGapiClient(resolve, reject) {
    // Set a timeout to prevent hanging
    const timeout = setTimeout(() => {
      console.warn("Google API client initialization timed out");
      this.mockMode = true;
      resolve(false);
    }, 5000);
    
    // Try to gracefully load the client library
    try {
      window.gapi.load('client:auth2', async () => {
        try {
          clearTimeout(timeout);
          
          try {
            // Initialize the client with API key and auth
            await window.gapi.client.init({
              apiKey: this.apiKey,
              clientId: this.clientId,
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
              scope: 'https://www.googleapis.com/auth/calendar.events',
              ux_mode: 'popup' // Use popup mode for better compatibility
            });
            
            this.googleApiLoaded = true;
            console.log("Google API client initialized successfully");
            resolve(true);
          } catch (error) {
            // Handle initialization errors gracefully
            console.warn("Error initializing Google API client:", error);
            this.mockMode = true;
            resolve(false);
          }
        } catch (error) {
          clearTimeout(timeout);
          console.warn("Error loading Google client:", error);
          this.mockMode = true;
          resolve(false);
        }
      });
    } catch (error) {
      clearTimeout(timeout);
      console.warn("Error in gapi.load:", error);
      this.mockMode = true;
      resolve(false);
    }
  }

  _initGapiClient(resolve, reject) {
    // Set a timeout to prevent hanging
    const timeout = setTimeout(() => {
      console.warn("Google API client initialization timed out");
      this.mockMode = true;
      resolve(false);
    }, 5000);
    
    // Load the client library
    window.gapi.load('client:auth2', async () => {
      try {
        clearTimeout(timeout);
        
        try {
          // Initialize the client with API key and auth
          await window.gapi.client.init({
            apiKey: this.apiKey,
            clientId: this.clientId,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
            scope: 'https://www.googleapis.com/auth/calendar.events'
          });
          
          this.googleApiLoaded = true;
          console.log("Google API client initialized successfully");
          resolve(true);
        } catch (error) {
          // Handle initialization errors gracefully
          console.warn("Error initializing Google API client:", error);
          this.mockMode = true;
          resolve(false);
        }
      } catch (error) {
        clearTimeout(timeout);
        console.warn("Error loading Google client:", error);
        this.mockMode = true;
        resolve(false);
      }
    });
  }

  async signInToGoogle(userId) {
    if (!userId) {
      throw new Error("User ID is required for Google sign-in");
    }
    
    try {
      console.log(`Signing in to Google Calendar for user: ${userId}`);
      
      // Make sure API is initialized first
      if (!this.googleApiLoaded) {
        await this.initializeGoogleCalendar();
      }
      
      // Use the GoogleAuthManager to authenticate this specific user
      const userData = await GoogleAuthManager.authenticateUser(userId);
      
      if (!userData) {
        throw new Error("Google authentication failed");
      }
      
      console.log(`Successfully signed in to Google as ${userData.email} for user ${userId}`);
      return userData;
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
    }
  }

  // Check if a specific user is signed in to Google
  isSignedInToGoogle(userId) {
    if (!userId) return false;
    
    return GoogleAuthManager.isUserAuthenticated(userId);
  }

  // Sign out from Google for a specific user
  async signOutFromGoogle(userId) {
    if (!userId) {
      throw new Error("User ID is required to sign out");
    }
    
    try {
      const result = await GoogleAuthManager.signOutUser(userId);
      console.log(`Signed out from Google for user ${userId}: ${result ? 'Success' : 'Failed'}`);
      return result;
    } catch (error) {
      console.error(`Error signing out from Google for user ${userId}:`, error);
      return false;
    }
  }

  // Get events from Google Calendar for a specific user
  async getEventsFromCalendar(userId, timeMin, timeMax, calendarId = 'primary') {
    if (!userId) {
      throw new Error("User ID is required to access calendar");
    }
    
    console.log(`Getting events from Google Calendar for user ${userId}`);
    
    try {
      // Make sure Google API is initialized
      if (!this.googleApiLoaded) {
        await this.initializeGoogleCalendar();
      }
      
      // Use GoogleAuthManager to execute with auth
      return await GoogleAuthManager.executeWithAuth(userId, async () => {
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
      });
    } catch (error) {
      console.error(`Error getting events from Google Calendar for user ${userId}:`, error);
      throw error;
    }
  }

  // List user's calendars
  async listUserCalendars(userId) {
    if (!userId) {
      throw new Error("User ID is required to list calendars");
    }
    
    console.log(`Listing calendars for user ${userId}`);
    
    try {
      // Make sure Google API is initialized
      if (!this.googleApiLoaded) {
        await this.initializeGoogleCalendar();
      }
      
      // Use GoogleAuthManager to execute with auth
      return await GoogleAuthManager.executeWithAuth(userId, async () => {
        // Ensure calendar API is loaded
        if (!window.gapi.client.calendar) {
          await window.gapi.client.load('calendar', 'v3');
        }
        
        const response = await window.gapi.client.calendar.calendarList.list();
        return response.result.items || [];
      });
    } catch (error) {
      console.error(`Error listing calendars for user ${userId}:`, error);
      throw error;
    }
  }

  // General method to add an event to user's calendar
  async addEvent(event, userId, calendarType = null) {
    if (!userId) {
      throw new Error("User ID is required to add events");
    }
    
    const targetCalendar = calendarType || this.activeCalendarType;
    
    if (!targetCalendar) {
      console.warn("No calendar selected. Please set up a calendar in Settings.");
      return { success: false, error: "No calendar selected" };
    }
    
    try {
      if (targetCalendar === 'google') {
        return await this.addEventToGoogleCalendar(event, userId);
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

  // Add event to Google Calendar for a specific user
  async addEventToGoogleCalendar(event, userId) {
    if (!userId) {
      throw new Error("User ID is required to add event to Google Calendar");
    }
    
    console.log(`Adding event to Google Calendar for user ${userId}`, event);
    
    try {
      // Make sure Google API is initialized
      if (!this.googleApiLoaded) {
        await this.initializeGoogleCalendar();
      }
      
      // Get the calendar ID from settings or default to primary
      const calendarId = this.calendarSettings?.googleCalendar?.calendarId || 'primary';
      
      // Use GoogleAuthManager to execute with auth
      return await GoogleAuthManager.executeWithAuth(userId, async () => {
        // Ensure calendar API is loaded
        if (!window.gapi.client.calendar) {
          await window.gapi.client.load('calendar', 'v3');
        }
        
        // Make the API call to insert the event
        const response = await window.gapi.client.calendar.events.insert({
          'calendarId': calendarId,
          'resource': event
        });
        
        console.log(`Successfully added event to Google Calendar for user ${userId}:`, response.result);
        
        // Success notification to the user
        this.showNotification(`Event "${event.summary}" added to Google Calendar`, "success");
        
        return {
          success: true,
          eventId: response.result.id,
          eventLink: response.result.htmlLink,
          isMock: false
        };
      });
    } catch (error) {
      console.error(`Error adding event to Google Calendar for user ${userId}:`, error);
      
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
  async debugGoogleCalendarConnection(userId) {
    if (!userId) {
      return {
        success: false,
        error: "User ID is required for debugging Google Calendar"
      };
    }
    
    console.log(`Running Google Calendar connection diagnostic for user ${userId}`);
    
    try {
      // Step 1: Initialize Google Calendar API
      await this.initializeGoogleCalendar();
      console.log("✓ Google Calendar API initialized");
      
      // Step 2: Check if signed in
      const isSignedIn = this.isSignedInToGoogle(userId);
      console.log(`${isSignedIn ? '✓' : '✗'} Google sign-in status for user ${userId}: ${isSignedIn ? 'Signed in' : 'Not signed in'}`);
      
      if (!isSignedIn) {
        console.log(`Attempting to sign in to Google for user ${userId}`);
        await this.signInToGoogle(userId);
        console.log(`✓ Successfully signed in to Google for user ${userId}`);
      }
      
      // Step 3: List calendars
      const calendars = await this.listUserCalendars(userId);
      console.log(`✓ Successfully listed ${calendars.length} calendars for user ${userId}`);
      
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
      
      console.log(`Testing event creation for user ${userId}...`);
      const result = await this.addEventToGoogleCalendar(testEvent, userId);
      console.log(`✓ Successfully created test event with ID: ${result.eventId}`);
      
      return {
        success: true,
        message: `Google Calendar integration is working correctly for user ${userId}`,
        calendars: calendars,
        testEventId: result.eventId
      };
    } catch (error) {
      console.error(`Google Calendar diagnostic failed for user ${userId}:`, error);
      
      return {
        success: false,
        error: error.message || "Unknown error",
        stage: "Google Calendar diagnostic"
      };
    }
  }

  // Diagnose Google Calendar issues
  async diagnoseGoogleCalendarIssues(userId) {
    try {
      let report = "Google Calendar Diagnostic Report\n";
      report += "===============================\n\n";
      
      // Include user information
      report += `User ID: ${userId || 'Not provided'}\n\n`;
      
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
      
      // Check user-specific tokens
      if (userId) {
        report += `User-Specific Authentication Status (${userId}):\n`;
        
        // Check if the user has a token
        const userToken = GoogleAuthManager.getUserToken(userId);
        report += `- Token found for user: ${userToken ? 'Yes' : 'No'}\n`;
        
        if (userToken) {
          report += `- Token email: ${userToken.email || 'Not available'}\n`;
          report += `- Token timestamp: ${new Date(userToken.timestamp).toLocaleString()}\n`;
          if (userToken.expires_at) {
            report += `- Token expires at: ${new Date(userToken.expires_at * 1000).toLocaleString()}\n`;
            report += `- Token valid: ${userToken.expires_at * 1000 > Date.now() ? 'Yes' : 'No'}\n`;
          }
        }
      }
      report += "\n";
      
      // Check localStorage for all tokens
      report += "Token Storage Check:\n";
      try {
        const allStorageKeys = Object.keys(localStorage);
        const googleTokenKeys = allStorageKeys.filter(key => 
          key.startsWith('googleToken_') || key === 'googleAuthToken'
        );
        
        report += `- Found ${googleTokenKeys.length} Google auth tokens in storage\n`;
        
        if (googleTokenKeys.length > 0) {
          googleTokenKeys.forEach(key => {
            try {
              const tokenData = JSON.parse(localStorage.getItem(key));
              report += `  * ${key}: ${tokenData.email || 'No email'} (stored: ${new Date(tokenData.timestamp || 0).toLocaleString()})\n`;
            } catch (e) {
              report += `  * ${key}: Error parsing token data\n`;
            }
          });
        }
      } catch (e) {
        report += `- Error checking localStorage: ${e.message}\n`;
      }
      report += "\n";
      
      // Try to list calendars for this user
      if (userId) {
        report += "Calendar Access Test:\n";
        try {
          await this.initializeGoogleCalendar();
          report += "- API initialized: Yes\n";
          
          const isSignedIn = this.isSignedInToGoogle(userId);
          report += `- User signed in: ${isSignedIn ? 'Yes' : 'No'}\n`;
          
          if (isSignedIn) {
            try {
              const calendars = await this.listUserCalendars(userId);
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
            report += "- Calendar access: Cannot test (not signed in)\n";
          }
        } catch (e) {
          report += `- API initialized: No (${e.message})\n`;
          report += "- Calendar access: Cannot test (API not initialized)\n";
        }
      }
      
      return report;
    } catch (error) {
      return `Error running diagnostic: ${error.message}`;
    }
  }

  // Fix calendar issues for a specific user
  async repairUserCalendarAuth(userId) {
    if (!userId) {
      return {
        success: false,
        error: "User ID is required to repair calendar auth"
      };
    }
    
    try {
      console.log(`Attempting to repair calendar auth for user ${userId}`);
      
      // First, clear any existing tokens for this user
      GoogleAuthManager.clearUserToken(userId);
      
      // Reinitialize Google calendar API
      await this.initializeGoogleCalendar();
      
      // Try to sign in again
      const userData = await this.signInToGoogle(userId);
      
      return {
        success: true,
        message: `Successfully repaired Google Calendar auth for user ${userId}`,
        email: userData.email
      };
    } catch (error) {
      console.error(`Failed to repair calendar auth for user ${userId}:`, error);
      
      return {
        success: false,
        error: error.message || "Unknown error"
      };
    }
  }
}

export default new CalendarService();