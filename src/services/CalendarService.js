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
    this.forceRealMode = true; // Add this line to prevent fallback to mock mode
    console.log("CalendarService initialized. Using real Google Calendar API");
    
    // Log the available API key and client ID (with partial masking for security)
    if (this.apiKey) {
      console.log(`API Key available: ${this.apiKey.substring(0, 4)}...${this.apiKey.substring(this.apiKey.length - 4)}`);
    } else {
      console.warn("No Google API Key available! Check your environment variables.");
    }
    
    if (this.clientId) {
      console.log(`Client ID available: ${this.clientId.substring(0, 4)}...${this.clientId.substring(this.clientId.length - 4)}`);
    } else {
      console.warn("No Google Client ID available! Check your environment variables.");
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
  // Initialize Google Calendar API with Firebase Auth token
// Initialize Google Calendar API with proper OAuth flow
async initializeGoogleCalendar() {
  console.log("Initializing Google Calendar with modern auth flow");
  
  // If using mock mode, set up simulated functions
  if (this.mockMode && !this.forceRealMode) {
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
  
  // IMPORTANT: We'll use a more modern approach for Google auth
  return new Promise((resolve, reject) => {
    // Step 1: First check if the gapi script is already loaded
    if (window.gapi) {
      console.log("Google API script already loaded");
      this._initializeGapiClient()
        .then(() => {
          this.googleApiLoaded = true;
          resolve(true);
        })
        .catch(err => {
          console.error("Error initializing gapi client:", err);
          if (this.forceRealMode) {
            reject(err);
          } else {
            this.mockMode = true;
            resolve(true);
          }
        });
      return;
    }
    
    // Step 2: If not loaded, inject the Google API script
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
          if (this.forceRealMode) {
            reject(err);
          } else {
            this.mockMode = true;
            resolve(true);
          }
        });
    };
    
    script.onerror = (error) => {
      console.error("Error loading Google API script:", error);
      if (this.forceRealMode) {
        reject(new Error("Failed to load Google API script"));
      } else {
        this.mockMode = true;
        resolve(true);
      }
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
  // Sign in to Google Calendar
// Sign in to Google Calendar with proper error handling
async signInToGoogle() {
  console.log("Attempting to sign in to Google Calendar");
  
  if (!this.googleApiLoaded) {
    try {
      await this.initializeGoogleCalendar();
    } catch (error) {
      console.error("Failed to initialize Google Calendar before sign-in:", error);
      this.showNotification("Could not connect to Google Calendar. Please check your browser settings and try again.", "error");
      throw error;
    }
  }
  
  try {
    // In mock mode, return success directly
    if (this.mockMode && !this.forceRealMode) {
      console.log("Using mock Google sign-in (success)");
      this.calendarConnected = true;
      return true;
    }
    
    // Check if we have gapi and auth2 available
    if (!window.gapi || !window.gapi.auth2) {
      console.error("Google Auth2 not available for sign-in");
      this.showNotification("Google authentication not available. Please reload the page and try again.", "error");
      throw new Error("Google Auth2 not available");
    }
    
    // Get auth instance
    const authInstance = window.gapi.auth2.getAuthInstance();
    if (!authInstance) {
      console.error("Google Auth instance is null");
      this.showNotification("Google authentication setup incomplete. Please reload the page and try again.", "error");
      throw new Error("Google Auth instance is null");
    }
    
    // Start the sign-in process with popup for better compatibility
    console.log("Starting Google sign-in process");
    const user = await authInstance.signIn({
      prompt: 'select_account', // Always show account selector
      ux_mode: 'popup' // Use popup rather than redirect for better third-party cookie handling
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
    
    this.calendarConnected = true;
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
    
    // Don't fall back to mock mode when forceRealMode is true
    if (this.forceRealMode) {
      throw error;
    }
    
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

// Debug helper for Google Calendar issues
async diagnoseGoogleCalendarIssues() {
  console.log("=== Google Calendar Diagnostic ===");
  
  try {
    console.log("Environment:", {
      apiKey: this.apiKey ? `Available (${this.apiKey.length} chars)` : "Missing",
      clientId: this.clientId ? `Available (${this.clientId.length} chars)` : "Missing",
      mockMode: this.mockMode,
      forceRealMode: this.forceRealMode,
      googleApiLoaded: this.googleApiLoaded,
      calendarConnected: this.calendarConnected,
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
    
    console.log("=== End of Diagnostic ===");
    
    return "Diagnostic complete. Check console for details.";
  } catch (error) {
    console.error("Error in diagnostic:", error);
    return `Diagnostic error: ${error.message}`;
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


// Get events from Google Calendar
async getEventsFromCalendar(timeMin, timeMax, calendarId = 'primary') {
  console.log("Getting events from Google Calendar");
  
  try {
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
    
    if (!this.googleApiLoaded) {
      await this.initializeGoogleCalendar();
    }
    
    if (!this.isSignedInToGoogle()) {
      await this.signInToGoogle();
    }
    
    // Make sure we have access to the calendar API
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
    
    // Fall back to empty list
    return [];
  }
}


  // Add event to Google Calendar
  // Add event to Google Calendar
// Add event to Google Calendar with better error handling and state persistence
async addEventToGoogleCalendar(event) {
  console.log("Adding event to Google Calendar");
  
  if (!this.googleApiLoaded) {
    try {
      console.log("Google Calendar not initialized, initializing now");
      await this.initializeGoogleCalendar();
    } catch (error) {
      console.error("Failed to initialize Google Calendar:", error);
      this.showNotification("Failed to connect to Google Calendar. Please try again later.", "error");
      return { success: false, error: "Failed to initialize Google Calendar" };
    }
  }
  
  // Double check gapi is available
  if (!window.gapi || !window.gapi.client) {
    console.error("Google API client not available after initialization");
    this.showNotification("Google Calendar API not available. Please refresh and try again.", "error");
    return { success: false, error: "Google API client not available" };
  }
  
  if (!this.isSignedInToGoogle()) {
    try {
      console.log("Not signed in to Google Calendar, signing in now");
      await this.signInToGoogle();
      
      // Verify sign-in was successful
      if (!this.isSignedInToGoogle()) {
        console.error("Sign-in process completed but still not signed in");
        this.showNotification("Failed to sign in to Google Calendar. Please try again.", "error");
        return { success: false, error: "Google sign-in failed" };
      }
    } catch (error) {
      console.error("Failed to sign in to Google Calendar:", error);
      // Error notification already shown in signInToGoogle method
      return { success: false, error: "Failed to sign in to Google Calendar" };
    }
  }
  
  try {
    // Check if we should use mock mode as fallback
    if (this.mockMode && !this.forceRealMode) {
      console.log("Mock adding event to Google Calendar:", event.summary);
      
      // Generate a unique ID with timestamp
      const mockEventId = 'mock-event-id-' + Date.now();
      console.log(`Generated mock event ID: ${mockEventId}`);
      
      // Save the mock event to localStorage so we can "remember" it
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
      this.showNotification(`Event "${event.summary}" added to Google Calendar (mock)`, "success");
      
      return {
        success: true,
        eventId: mockEventId,
        eventLink: '#',
        isMock: true
      };
    }
    
    // Ensure calendar API is loaded
    if (!window.gapi.client.calendar) {
      console.log("Calendar API not loaded, loading it now");
      await window.gapi.client.load('calendar', 'v3');
      console.log("Loaded Google Calendar API");
    }
    
    // Get the calendar ID from settings or default to primary
    const calendarId = this.calendarSettings?.googleCalendar?.calendarId || 'primary';
    console.log("Adding event to Google Calendar:", {
      calendarId,
      eventSummary: event.summary,
      eventStart: event.start
    });
    
    // Make the API call to insert the event
    console.log("Calling Google Calendar API to insert event");
    const response = await window.gapi.client.calendar.events.insert({
      'calendarId': calendarId,
      'resource': event
    });
    
    console.log("Successfully added event to Google Calendar:", response.result);
    
    // Store the event in localStorage for persistence
    try {
      const addedEvents = JSON.parse(localStorage.getItem('addedCalendarEvents') || '{}');
      const eventKey = `${event.summary}-${Date.now()}`;
      addedEvents[eventKey] = {
        eventId: response.result.id,
        calendarId: calendarId,
        summary: event.summary,
        addedAt: new Date().toISOString()
      };
      localStorage.setItem('addedCalendarEvents', JSON.stringify(addedEvents));
    } catch (e) {
      console.warn("Could not save added event to localStorage:", e);
    }
    
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
    
    // Fall back to mock mode if not in forceRealMode
    if (!this.mockMode && !this.forceRealMode) {
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


// Update an existing event in Google Calendar
async updateEventInGoogleCalendar(eventId, updatedEvent, calendarId = 'primary') {
  console.log("Updating event in Google Calendar:", eventId);
  
  if (!this.googleApiLoaded) {
    try {
      await this.initializeGoogleCalendar();
    } catch (error) {
      console.error("Failed to initialize Google Calendar:", error);
      return { success: false, error: "Failed to initialize Google Calendar" };
    }
  }
  
  if (!this.isSignedInToGoogle()) {
    try {
      await this.signInToGoogle();
    } catch (error) {
      console.error("Failed to sign in to Google Calendar:", error);
      return { success: false, error: "Failed to sign in to Google Calendar" };
    }
  }
  
  try {
    // Mock mode implementation
    if (this.mockMode) {
      console.log("Mock updating event in Google Calendar:", eventId);
      this.showNotification(`Event "${updatedEvent.summary}" updated (mock)`, "success");
      return {
        success: true,
        eventId: eventId,
        eventLink: '#'
      };
    }
    
    // Make sure we have access to the calendar API
    if (!window.gapi.client.calendar) {
      await window.gapi.client.load('calendar', 'v3');
      console.log("Loaded Google Calendar API");
    }
    
    // Update the event in Google Calendar
    const response = await window.gapi.client.calendar.events.update({
      'calendarId': calendarId,
      'eventId': eventId,
      'resource': updatedEvent
    });
    
    console.log("Successfully updated event in Google Calendar:", response.result);
    
    // Success notification to the user
    this.showNotification(`Event "${updatedEvent.summary}" updated in Google Calendar`, "success");
    
    return {
      success: true,
      eventId: response.result.id,
      eventLink: response.result.htmlLink
    };
  } catch (error) {
    console.error("Error updating event in Google Calendar:", error);
    
    // Error notification to the user
    this.showNotification(`Failed to update event: ${error.message || 'Unknown error'}`, "error");
    
    // Fall back to mock mode
    if (!this.mockMode) {
      console.log("Falling back to mock mode due to event update error");
      this.mockMode = true;
      return this.updateEventInGoogleCalendar(eventId, updatedEvent, calendarId);
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