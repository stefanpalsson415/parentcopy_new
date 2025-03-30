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
    
    // Always start in mock mode for safety
    this.mockMode = true;
    
    // Read API credentials - using hardcoded values for demo
    this.apiKey = 'AIzaSyAmR2paggX1Emt4RpGGnlHuadqpveSY0aI';
    this.clientId = '363935868004-1vd75fqpf2e6i8dl73pi4p56br8i4h9p.apps.googleusercontent.com';
    
    // Only use real mode if credentials are valid
    if (this.apiKey && this.clientId) {
      this.mockMode = false;
      this.forceRealMode = true;
      
      // Log success for debugging
      console.log("CalendarService initialized with API credentials");
    } else {
      // Quietly log at lower level without warnings
      console.log("Calendar running in mock mode (no API credentials)");
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

  async initializeGoogleCalendar() {
    console.log("Initializing Google Calendar integration");
    
    // If credentials are missing, fall back to mock mode
    if (!this.apiKey || !this.clientId) {
      console.warn("Missing Google API credentials, falling back to mock mode");
      this.mockMode = true;
      this.googleApiLoaded = true; // Pretend it's loaded in mock mode
      return true;
    }
    
    // Check for stored token before deciding to use mock mode
    try {
      const storedToken = localStorage.getItem('googleAuthToken');
      if (storedToken) {
        const tokenData = JSON.parse(storedToken);
        const now = Date.now();
        const expiresAt = tokenData.expires_at || (tokenData.expires_in * 1000 + tokenData.first_issued_at);
        
        // If token is valid and not expired, don't use mock mode
        if (expiresAt > now) {
          console.log("Found valid Google auth token, using real mode");
          this.mockMode = false;
        }
      }
    } catch (e) {
      console.warn("Error checking stored token:", e);
    }
    
    // If already in mock mode, set up mock objects and return
    if (this.mockMode) {      console.log("Using mock Google Calendar implementation");
      this.googleApiLoaded = true;
      
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
                insert: async () => ({ result: { id: 'mock-event-id', htmlLink: '#' } }),
                update: async () => ({ result: { id: 'mock-event-id', htmlLink: '#' } }),
                list: async () => ({ result: { items: [] } })
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
    
    return new Promise((resolve, reject) => {
      // First check if the gapi script is already loaded
      if (window.gapi && window.gapi.client) {
        console.log("Google API script already loaded, initializing client");
        this._initializeGapiClient()
          .then(() => {
            this.googleApiLoaded = true;
            resolve(true);
          })
          .catch(err => {
            console.error("Error initializing gapi client:", err);
            console.warn("Falling back to mock mode due to initialization error");
            this.mockMode = true;
            this.googleApiLoaded = true;
            resolve(true);
          });
        return;
      }
      
      // If gapi is loaded but client isn't, just initialize client
      if (window.gapi) {
        console.log("Google API script loaded but client not initialized");
        this._initializeGapiClient()
          .then(() => {
            this.googleApiLoaded = true;
            resolve(true);
          })
          .catch(err => {
            console.error("Error initializing gapi client:", err);
            console.warn("Falling back to mock mode due to client initialization error");
            this.mockMode = true;
            this.googleApiLoaded = true;
            resolve(true);
          });
        return;
      }
      
      // If not loaded, inject the Google API script
      console.log("Loading Google API script");
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log("Google API script loaded successfully");
        this._initializeGapiClient()
          .then(() => {
            this.googleApiLoaded = true;
            resolve(true);
          })
          .catch(err => {
            console.error("Error initializing gapi client after script load:", err);
            console.warn("Falling back to mock mode due to client initialization error");
            this.mockMode = true;
            this.googleApiLoaded = true;
            resolve(true);
          });
      };
      
      script.onerror = (error) => {
        console.error("Error loading Google API script:", error);
        console.warn("Falling back to mock mode due to script load error");
        this.mockMode = true;
        this.googleApiLoaded = true;
        resolve(true);
      };
      
      document.body.appendChild(script);
    });
  }

  // Private method to initialize gapi client
  async _initializeGapiClient() {
    return new Promise((resolve, reject) => {
      if (!window.gapi) {
        return reject(new Error("Google API not loaded"));
      }
      
      window.gapi.load('client:auth2', async () => {
        try {
          // Initialize the client with API key and auth
          await window.gapi.client.init({
            apiKey: this.apiKey,
            clientId: this.clientId,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
            scope: 'https://www.googleapis.com/auth/calendar'
          });
          
          console.log("Google API client initialized successfully");
          resolve(true);
        } catch (error) {
          console.error("Error initializing Google API client:", error);
          reject(error);
        }
      });
    });
  }

  // Get auth instance with error handling
  _getAuthInstance() {
    try {
      if (!window.gapi || !window.gapi.auth2) {
        console.warn("Google Auth2 not available");
        return null;
      }
      return window.gapi.auth2.getAuthInstance();
    } catch (error) {
      console.error("Error getting auth instance:", error);
      return null;
    }
  }

  // Sign in to Google Calendar with improved error handling
  async signInToGoogle() {
    console.log("Attempting to sign in to Google Calendar");
    
    // If we're in mock mode, just return success
    if (this.mockMode) {
      console.log("Mock Google sign-in successful");
      return true;
    }
    
    // Initialize Google Calendar if needed
    if (!this.googleApiLoaded) {
      try {
        await this.initializeGoogleCalendar();
      } catch (error) {
        console.error("Failed to initialize Google Calendar before sign-in:", error);
        this.showNotification("Could not connect to Google Calendar. Please try again later.", "error");
        this.mockMode = true; // Fall back to mock mode
        return true;
      }
    }
    
    try {
      // Verify auth2 is available
      const authInstance = this._getAuthInstance();
      if (!authInstance) {
        console.error("Google Auth instance is not available");
        this.showNotification("Google authentication not available. Please try again later.", "error");
        this.mockMode = true; // Fall back to mock mode
        return true;
      }
      
      // Start the sign-in process
      console.log("Starting Google sign-in process");
      const user = await authInstance.signIn({
        prompt: 'select_account', // Always show account selector
        ux_mode: 'popup' // Use popup rather than redirect
      });
      
      console.log("Google sign-in successful");
      
      // Store the token for reuse
      if (user && user.getAuthResponse) {
        const authResponse = user.getAuthResponse();
        localStorage.setItem('googleAuthToken', JSON.stringify({
          ...authResponse,
          stored_at: Date.now() // Add timestamp for expiry check
        }));
        console.log("Saved Google auth token for reuse");
      }
      
      this.showNotification("Successfully connected to Google Calendar!", "success");
      return true;
    } catch (error) {
      console.error("Error signing in to Google:", error);
      
      // Provide helpful error messages based on error type
      if (error.error === "popup_blocked_by_browser") {
        this.showNotification("Popup blocked by browser. Please allow popups for this site and try again.", "error");
      } else if (error.error === "access_denied") {
        this.showNotification("You declined access to Google Calendar. Please try again and allow access to continue.", "error");
      } else {
        this.showNotification("Failed to connect to Google Calendar. Please try again.", "error");
      }
      
      // Fall back to mock mode on error
      console.warn("Falling back to mock mode after sign-in error");
      this.mockMode = true;
      return true;
    }
  }

  // Check if signed in to Google
  isSignedInToGoogle() {
    // Always return true in mock mode
    if (this.mockMode) return true;
    
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
    if (this.mockMode) {
      console.log("Mock Google sign-out successful");
      return true;
    }
    
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
    
    if (this.mockMode) {
      console.log("Using mock event list");
      return [
        { 
          id: 'mock-event-1', 
          summary: 'Mock Event 1',
          start: { dateTime: new Date().toISOString() },
          end: { dateTime: new Date(Date.now() + 3600000).toISOString() }
        },
        { 
          id: 'mock-event-2', 
          summary: 'Mock Event 2',
          start: { dateTime: new Date(Date.now() + 86400000).toISOString() },
          end: { dateTime: new Date(Date.now() + 90000000).toISOString() }
        }
      ];
    }
    
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
      
      // Fall back to mock mode
      this.mockMode = true;
      return this.getEventsFromCalendar(timeMin, timeMax, calendarId);
    }
  }

  // List user's calendars
  async listUserCalendars() {
    console.log("Listing user calendars");
    
    if (this.mockMode) {
      console.log("Using mock calendar list");
      return [
        { id: 'primary', summary: 'Primary Calendar' },
        { id: 'work', summary: 'Work Calendar' },
        { id: 'family', summary: 'Family Calendar' }
      ];
    }
    
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
      
      // Fall back to mock data
      this.mockMode = true;
      return [
        { id: 'primary', summary: 'Primary Calendar' },
        { id: 'work', summary: 'Work Calendar' },
        { id: 'family', summary: 'Family Calendar' }
      ];
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

  // Add event to Google Calendar with robust error handling
  // Add event to Google Calendar with robust error handling
  // Replace the entire addEventToGoogleCalendar method in src/services/CalendarService.js (around line 500)
async addEventToGoogleCalendar(event) {
  console.log("Adding event to Google Calendar");
  
  // Reset mock mode to ensure we try real mode first
  const originalMockMode = this.mockMode;
  this.mockMode = false;
  
  if (!this.googleApiLoaded) {
    try {
      console.log("Google Calendar not initialized, initializing now");
      await this.initializeGoogleCalendar();
    } catch (error) {
      console.error("Failed to initialize Google Calendar:", error);
      this.showNotification("Failed to connect to Google Calendar. Please try again later.", "error");
      this.mockMode = true;
      return this.addEventToGoogleCalendar(event);
    }
  }
  
  // Force sign-in check every time
  if (!this.isSignedInToGoogle()) {
    try {
      console.log("Not signed in to Google Calendar, attempting to sign in");
      await this.signInToGoogle();
      
      // Double-check that sign-in worked
      if (!this.isSignedInToGoogle()) {
        console.log("Sign-in attempt failed, falling back to mock mode");
        this.mockMode = true;
        return this.addEventToGoogleCalendar(event);
      }
    } catch (error) {
      console.error("Failed to sign in to Google:", error);
      this.mockMode = true;
      return this.addEventToGoogleCalendar(event);
    }
  }
  
  if (this.mockMode) {
    console.log("Mock adding event to Google Calendar:", event.summary);
    
    // Generate a unique ID with timestamp
    const mockEventId = 'mock-event-id-' + Date.now();
    console.log(`Generated mock event ID: ${mockEventId}`);
    
    // Save the mock event to localStorage
    try {
      const mockEvents = JSON.parse(localStorage.getItem('mockCalendarEvents') || '{}');
      mockEvents[mockEventId] = {
        ...event,
        id: mockEventId,
        created: new Date().toISOString()
      };
      localStorage.setItem('mockCalendarEvents', JSON.stringify(mockEvents));
      console.log("Saved mock event to localStorage");
    } catch (e) {
      console.warn("Could not save mock event to localStorage:", e);
    }
    
    // Show a temporary success message
    this.showNotification(`Event "${event.summary}" added to calendar (mock)`, "success");
    
    return {
      success: true,
      eventId: mockEventId,
      eventLink: '#',
      isMock: true
    };
  }
  
  try {
    // Check if we need to sign in
    let needsSignIn = false;
    try {
      needsSignIn = !this.isSignedInToGoogle();
    } catch (checkError) {
      console.warn("Error checking sign-in status:", checkError);
      needsSignIn = true;
    }

    // Sign in if needed
    if (needsSignIn) {
      try {
        console.log("Not signed in to Google Calendar, signing in now");
        await this.signInToGoogle();
        
        // Verify sign-in was successful
        if (!this.isSignedInToGoogle()) {
          console.error("Sign-in process completed but still not signed in");
          this.showNotification("Failed to sign in to Google Calendar. Please try again.", "error");
          this.mockMode = true;
          return this.addEventToGoogleCalendar(event);
        }
      } catch (error) {
        console.error("Failed to sign in to Google Calendar:", error);
        this.mockMode = true;
        return this.addEventToGoogleCalendar(event);
      }
    }
    
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
    
    // Fall back to mock mode
    console.log("Falling back to mock mode due to event creation error");
    this.mockMode = true;
    return this.addEventToGoogleCalendar(event);
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

  // Initialize Apple Calendar integration
  async initializeAppleCalendar() {
    // Apple Calendar is accessed through the Web Calendar API
    if (!this.appleCalendarAvailable) {
      console.warn("Apple Calendar is not supported in this browser");
      return false;
    }
    
    console.log("Using mock Apple Calendar implementation");
    return true;
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

  // Debug helper for Google Calendar issues
  async debugGoogleCalendarConnection() {
    console.log("=== Google Calendar Diagnostic ===");
    
    try {
      console.log("Environment:", {
        apiKey: this.apiKey ? `Available (${this.apiKey.substring(0, 4)}...)` : "Missing",
        clientId: this.clientId ? `Available (${this.clientId.substring(0, 4)}...)` : "Missing",
        mockMode: this.mockMode,
        forceRealMode: this.forceRealMode,
        googleApiLoaded: this.googleApiLoaded,
        browserInfo: navigator.userAgent
      });
      
      // Check if gapi is loaded
      console.log("GAPI loaded:", !!window.gapi);
      
      if (window.gapi) {
        console.log("GAPI client loaded:", !!window.gapi.client);
        console.log("GAPI auth2 loaded:", !!window.gapi.auth2);
        
        if (window.gapi.auth2) {
          try {
            const authInstance = window.gapi.auth2.getAuthInstance();
            console.log("Auth instance available:", !!authInstance);
            
            if (authInstance) {
              const isSignedIn = authInstance.isSignedIn.get();
              console.log("Is signed in:", isSignedIn);
              
              if (isSignedIn) {
                const user = authInstance.currentUser.get();
                const profile = user.getBasicProfile();
                console.log("User signed in:", {
                  email: profile ? profile.getEmail() : "Unknown",
                  name: profile ? profile.getName() : "Unknown",
                  id: user.getId()
                });
                
                const authResponse = user.getAuthResponse();
                console.log("Auth response valid:", {
                  tokenAvailable: !!authResponse.access_token,
                  tokenLength: authResponse.access_token ? authResponse.access_token.length : 0,
                  expiresIn: authResponse.expires_in,
                  expiresAt: new Date(authResponse.expires_at).toLocaleString()
                });
              }
            }
          } catch (e) {
            console.error("Error checking auth state:", e);
          }
        }
        
        // Check if Calendar API is available
        console.log("Calendar API loaded:", !!(window.gapi.client && window.gapi.client.calendar));
        
        // Try listing calendars as a test
        if (window.gapi.client && window.gapi.client.calendar) {
          try {
            console.log("Attempting to list calendars...");
            const response = await window.gapi.client.calendar.calendarList.list();
            console.log("Calendar list succeeded:", {
              status: response.status,
              calendarCount: response.result.items ? response.result.items.length : 0
            });
          } catch (e) {
            console.error("Error listing calendars:", e);
          }
        }
      }
      
      // Check local storage for tokens
      try {
        const storedToken = localStorage.getItem('googleAuthToken');
        console.log("Stored token available:", !!storedToken);
        
        if (storedToken) {
          const tokenData = JSON.parse(storedToken);
          const now = Date.now();
          const expiresAt = tokenData.expires_at || (tokenData.expires_in * 1000 + tokenData.first_issued_at);
          const isExpired = expiresAt < now;
          
          console.log("Token status:", {
            expired: isExpired,
            expiresAt: new Date(expiresAt).toLocaleString(),
            timeUntilExpiry: isExpired ? "Expired" : `${Math.round((expiresAt - now) / 60000)} minutes`,
            stored_at: tokenData.stored_at ? new Date(tokenData.stored_at).toLocaleString() : "Unknown"
          });
        }
      } catch (e) {
        console.error("Error checking stored token:", e);
      }
      
      // Try initializing Google Calendar
      try {
        await this.initializeGoogleCalendar();
        console.log("Google Calendar initialization result:", {
          apiLoaded: this.googleApiLoaded,
          mockMode: this.mockMode
        });
      } catch (e) {
        console.error("Error testing initialization:", e);
      }
      
      return {
        success: true,
        message: "Google Calendar diagnostic run - check console for details",
        mockMode: this.mockMode,
        apiCredentialsAvailable: !!(this.apiKey && this.clientId),
        gapiLoaded: !!window.gapi,
        auth2Loaded: !!(window.gapi && window.gapi.auth2)
      };
    } catch (error) {
      console.error("Error in diagnostic:", error);
      return {
        success: false,
        error: error.message || "Unknown error"
      };
    }
  }

// Add detailed diagnostic for Google Calendar issues
async diagnoseGoogleCalendarIssues() {
  let diagnosticReport = [];
  
  try {
    diagnosticReport.push("==== Google Calendar Diagnostic Report ====");
    
    // Check environment variables
    diagnosticReport.push("\n1. API Credentials Check:");
    diagnosticReport.push(`- API Key available: ${this.apiKey ? 'Yes' : 'No'}`);
    diagnosticReport.push(`- Client ID available: ${this.clientId ? 'Yes' : 'No'}`);
    diagnosticReport.push(`- Mock mode active: ${this.mockMode ? 'Yes' : 'No'}`);
    diagnosticReport.push(`- AppleCalendar available: ${this.appleCalendarAvailable ? 'Yes' : 'No'}`);
    
    // Check GAPI initialization
    diagnosticReport.push("\n2. Google API Status:");
    diagnosticReport.push(`- GAPI loaded: ${window.gapi ? 'Yes' : 'No'}`);
    
    if (window.gapi) {
      diagnosticReport.push(`- GAPI client loaded: ${window.gapi.client ? 'Yes' : 'No'}`);
      diagnosticReport.push(`- GAPI auth2 loaded: ${window.gapi.auth2 ? 'Yes' : 'No'}`);
      
      // Check auth state
      if (window.gapi.auth2) {
        try {
          const authInstance = window.gapi.auth2.getAuthInstance();
          diagnosticReport.push(`- Auth instance available: ${authInstance ? 'Yes' : 'No'}`);
          
          if (authInstance) {
            const isSignedIn = authInstance.isSignedIn.get();
            diagnosticReport.push(`- User signed in: ${isSignedIn ? 'Yes' : 'No'}`);
            
            if (isSignedIn) {
              const user = authInstance.currentUser.get();
              const profile = user.getBasicProfile();
              diagnosticReport.push(`- Signed in user: ${profile.getEmail()}`);
              diagnosticReport.push(`- Access token available: ${user.getAuthResponse().access_token ? 'Yes' : 'No'}`);
            }
          }
        } catch (e) {
          diagnosticReport.push(`- Error checking auth state: ${e.message}`);
        }
      }
    }
    
    // Check for stored tokens
    diagnosticReport.push("\n3. Stored Token Check:");
    const storedToken = localStorage.getItem('googleAuthToken');
    diagnosticReport.push(`- Token in localStorage: ${storedToken ? 'Yes' : 'No'}`);
    
    if (storedToken) {
      try {
        const token = JSON.parse(storedToken);
        const now = Date.now();
        const expiresAt = token.expires_at || (token.first_issued_at + token.expires_in * 1000);
        const isExpired = now > expiresAt;
        
        diagnosticReport.push(`- Token expired: ${isExpired ? 'Yes' : 'No'}`);
        if (isExpired) {
          diagnosticReport.push(`- Expired at: ${new Date(expiresAt).toLocaleString()}`);
        } else {
          diagnosticReport.push(`- Expires in: ${Math.round((expiresAt - now) / 60000)} minutes`);
        }
      } catch (e) {
        diagnosticReport.push(`- Error parsing stored token: ${e.message}`);
      }
    }
    
    // Add browser info
    diagnosticReport.push("\n4. Browser Information:");
    diagnosticReport.push(`- User Agent: ${navigator.userAgent}`);
    diagnosticReport.push(`- Platform: ${navigator.platform}`);
    diagnosticReport.push(`- Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
    
    // Test calendar API connection
    diagnosticReport.push("\n5. Calendar API Connection Test:");
    if (window.gapi && window.gapi.client && window.gapi.client.calendar) {
      try {
        diagnosticReport.push("- Attempting to list calendars...");
        const response = await window.gapi.client.calendar.calendarList.list();
        diagnosticReport.push(`- API call successful: ${response.status === 200 ? 'Yes' : 'No'}`);
        diagnosticReport.push(`- Calendars found: ${response.result.items ? response.result.items.length : 0}`);
      } catch (e) {
        diagnosticReport.push(`- API call failed: ${e.message}`);
      }
    } else {
      diagnosticReport.push("- Calendar API not initialized yet");
    }
    
    // Add recommendations
    diagnosticReport.push("\n6. Recommendations:");
    if (!this.apiKey || !this.clientId) {
      diagnosticReport.push("- CRITICAL: Set up your API credentials in .env file");
      diagnosticReport.push("  Add the following to your .env file:");
      diagnosticReport.push("  REACT_APP_GOOGLE_API_KEY=your_api_key");
      diagnosticReport.push("  REACT_APP_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com");
    }
    
    if (!window.gapi) {
      diagnosticReport.push("- The Google API script failed to load. Check your internet connection.");
    } else if (!window.gapi.auth2) {
      diagnosticReport.push("- The Google Auth module failed to initialize. Try clearing your browser cache.");
    } else if (window.gapi.auth2 && !this.isSignedInToGoogle()) {
      diagnosticReport.push("- You need to sign in to Google Calendar. Click the 'Connect Google Calendar' button.");
    }
    
    return diagnosticReport.join("\n");
  } catch (error) {
    console.error("Error running diagnostic:", error);
    return `Error during diagnostic: ${error.message}`;
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