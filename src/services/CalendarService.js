// src/services/CalendarService.js

class CalendarService {
    constructor() {
      this.isInitialized = false;
      this.apiKey = 'YOUR_GOOGLE_API_KEY'; // Replace with your Google API key
      this.clientId = 'YOUR_GOOGLE_CLIENT_ID'; // Replace with your Google Client ID
      this.scopes = 'https://www.googleapis.com/auth/calendar';
      this.googleApiLoaded = false;
    }
  
    // Initialize Google API
    async initialize() {
      if (this.isInitialized) return true;
  
      return new Promise((resolve, reject) => {
        // Load Google API script if not already loaded
        if (!window.gapi) {
          const script = document.createElement('script');
          script.src = 'https://apis.google.com/js/api.js';
          script.onload = () => {
            window.gapi.load('client:auth2', () => {
              window.gapi.client.init({
                apiKey: this.apiKey,
                clientId: this.clientId,
                scope: this.scopes,
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
              }).then(() => {
                this.isInitialized = true;
                this.googleApiLoaded = true;
                resolve(true);
              }).catch(error => {
                console.error("Error initializing Google API:", error);
                reject(error);
              });
            });
          };
          script.onerror = (error) => {
            console.error("Error loading Google API script:", error);
            reject(error);
          };
          document.body.appendChild(script);
        } else {
          // API already loaded, just initialize client
          window.gapi.load('client:auth2', () => {
            window.gapi.client.init({
              apiKey: this.apiKey,
              clientId: this.clientId,
              scope: this.scopes,
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
            }).then(() => {
              this.isInitialized = true;
              this.googleApiLoaded = true;
              resolve(true);
            }).catch(error => {
              console.error("Error initializing Google API:", error);
              reject(error);
            });
          });
        }
      });
    }
  
    // Sign in the user
    async signIn() {
      if (!this.isInitialized) {
        await this.initialize();
      }
  
      return window.gapi.auth2.getAuthInstance().signIn();
    }
  
    // Check if user is signed in
    isSignedIn() {
      if (!this.googleApiLoaded) return false;
      return window.gapi.auth2.getAuthInstance().isSignedIn.get();
    }
  
    // Sign out
    signOut() {
      if (!this.googleApiLoaded) return Promise.resolve();
      return window.gapi.auth2.getAuthInstance().signOut();
    }
  
    // Add an event to Google Calendar
    async addEvent(event) {
      if (!this.isSignedIn()) {
        await this.signIn();
      }
  
      return window.gapi.client.calendar.events.insert({
        'calendarId': 'primary',
        'resource': event
      });
    }
  
    // Create event object from task
    createEventFromTask(task) {
      // Calculate event start and end time
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 1); // Start in 1 hour
      
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1); // 1 hour duration
      
      // Create event object
      return {
        'summary': task.title,
        'description': task.description,
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
        'summary': `Family Meeting - Week ${weekNumber}`,
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
  }
  
  export default new CalendarService();