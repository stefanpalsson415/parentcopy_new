// src/services/ClaudeService.js
import CalendarService from './CalendarService';
import { auth, db } from './firebase';
import { collection, addDoc, getDoc, getDocs, query, where, orderBy, limit, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

class ClaudeService {
  constructor() {
    // Determine environment type
    const hostname = window.location.hostname;
    const isProduction = hostname === 'checkallie.com' || hostname === 'www.checkallie.com';
    const isLocalhost = hostname === 'localhost' || hostname.includes('127.0.0.1');
  
    // Set the appropriate API URL based on environment
    if (isLocalhost) {
      // For local development, first try the local proxy server
      this.proxyUrl = 'http://localhost:3001/api/claude';
      console.log("Running in local development mode - using local proxy server");
      
      // Add a fallback option for when the local server isn't running
      this.fallbackProxyUrl = 'https://europe-west1-parentload-ba995.cloudfunctions.net/claude';
    } else {
      // For production domain, use the direct Cloud Functions URL
      this.proxyUrl = 'https://europe-west1-parentload-ba995.cloudfunctions.net/claude';
      console.log("Running in production - using Cloud Functions URL:", this.proxyUrl);
      
      // Production fallback is the same URL but with a different path format
      this.fallbackProxyUrl = 'https://europe-west1-parentload-ba995.cloudfunctions.net/claude/api/claude';
    }
    
    // Model settings
    this.model = 'claude-3-5-sonnet-20240620';  // Update to the latest Claude model
  
    // Basic settings
    this.mockMode = false;
    this.debugMode = true; // Always enable logging for debugging
    this.disableAICalls = false;
    
    // CRITICAL FIX: Initialize important flags and ensure they're never undefined
    // Always enable calendar detection by default
    this.disableCalendarDetection = false;
    
    // Track when we set this flag with timestamps for debugging
    this.calendarDetectionState = {
      currentValue: false, // false means enabled
      lastUpdated: Date.now(),
      history: [{value: false, timestamp: Date.now(), reason: "initial"}]
    };
    
    console.log("🔴 Calendar detection explicitly enabled in constructor:", !this.disableCalendarDetection);
    
    this.currentProcessingContext = {
      isProcessingProvider: false,
      isProcessingTask: false,
      lastContext: "none",
      timestamp: Date.now()
    };
  
    // Add auth context initialization - critical for Firebase operations
    this.authContext = {
      userId: null,
      familyId: null,
      timestamp: Date.now()
    };
    
    // Check if we can get auth immediately
    if (auth && auth.currentUser) {
      this.authContext.userId = auth.currentUser.uid;
      console.log("🔑 Found authenticated user in constructor:", auth.currentUser.uid);
      
      // Try to get familyId from localStorage
      if (typeof window !== 'undefined') {
        const storedFamilyId = localStorage.getItem('selectedFamilyId') || localStorage.getItem('currentFamilyId');
        if (storedFamilyId) {
          this.authContext.familyId = storedFamilyId;
          console.log("🔑 Found familyId in localStorage:", storedFamilyId);
        }
      }
    }
  
    this.retryCount = 3;
    this.functionRegion = 'europe-west1'; // Match this to your deployment region
    
    // Add connection test with retry capability - delay slightly to ensure browser is ready
    setTimeout(() => {
      this.testConnectionWithRetry();
    }, 1500);
    
    console.log(`Claude service initialized to use proxy server at ${this.proxyUrl}`);
  }

async testConnectionWithRetry(attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      const success = await this.testProxyConnection();
      if (success) {
        console.log("✅ Claude API connection test passed!");
        return;
      } else {
        console.warn(`❌ Claude API connection test failed (attempt ${i+1}/${attempts})`);
        
        // If we have a fallback URL and this isn't the last attempt, try the fallback
        if (this.fallbackProxyUrl && i === 0) {
          console.log("Trying fallback proxy URL:", this.fallbackProxyUrl);
          
          // Save the original URL
          const originalUrl = this.proxyUrl;
          
          // Try the fallback
          this.proxyUrl = this.fallbackProxyUrl;
          const fallbackSuccess = await this.testProxyConnection();
          
          if (fallbackSuccess) {
            console.log("✅ Fallback URL connection successful!");
            return;
          } else {
            // If fallback also failed, and we have more attempts, try direct cloud function
            if (i < attempts - 1) {
              // Try direct root URL as last resort
              this.proxyUrl = 'https://europe-west1-parentload-ba995.cloudfunctions.net/claude';
              console.log("Trying direct cloud function URL:", this.proxyUrl);
            } else {
              // Restore original URL for the last attempt
              this.proxyUrl = originalUrl;
            }
          }
        }
      }
    } catch (err) {
      console.error(`❌ Error testing Claude API connection (attempt ${i+1}/${attempts}):`, err);
    }
  }

  // If all attempts fail, enable fallback mode
  console.error("❌ All Claude API connection attempts failed - enabling fallback mode");
  this.enableFallbackMode();
}
    
    
  
  
async testProxyConnection() {
  try {
    // If we're already in mock/disabled mode, don't bother testing
    if (this.mockMode || this.disableAICalls) {
      console.log("Skipping proxy test - already in mock/disabled mode");
      return false;
    }
    
    console.log("Testing proxy connection at:", this.proxyUrl);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      // Log the full URL being requested for debugging
      const testUrl = `${this.proxyUrl}/test`;
      console.log("Full test URL:", testUrl);
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
          // Remove the cache-control header to avoid CORS issues
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log("Proxy test response status:", response.status);
      
      if (response.ok) {
        // First check if the response is HTML instead of JSON
        const contentType = response.headers.get('content-type');
        console.log("Response content type:", contentType);
        
        if (contentType && contentType.includes('text/html')) {
          console.error("Received HTML instead of JSON - API endpoint misconfigured");
          // Get the response text to help debug
          const text = await response.text();
          console.error("HTML response received:", text.substring(0, 200));
          return false;
        }
        
        try {
          const data = await response.json();
          console.log("Proxy test response data:", data);
          return true;
        } catch (jsonError) {
          console.error("Failed to parse JSON response:", jsonError);
          // Let's try to see what we received
          const text = await response.text();
          console.log("Raw response:", text.substring(0, 200));
          return false;
        }
      } else {
        // For non-OK responses, log detailed information
        console.error(`Proxy test failed with status: ${response.status}`);
        try {
          const text = await response.text();
          console.error("Error response:", text.substring(0, 500));
          
          // Check if this is a CORS error
          if (response.status === 0 || !response.status) {
            console.error("Possible CORS issue detected");
          }
        } catch (e) {
          console.error("Could not read error response");
        }
        return false;
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error("Proxy test timed out after 10 seconds");
      } else {
        console.error("Error testing proxy connection:", fetchError);
        console.error("Error details:", fetchError.message);
      }
      return false;
    }
  } catch (error) {
    console.error("Error in proxy test:", error);
    return false;
  }
}
  
  // Add this new method
  enableFallbackMode() {
    console.log("Enabling Claude API fallback mode");
    this.disableAICalls = true;
    
    // Show a console message that might help debugging
    console.warn("Claude API is disabled due to connection issues. Using fallback responses.");
    
    // Try to notify any admin users if possible
    if (typeof window !== 'undefined') {
      try {
        // Create a non-intrusive notification for admin users
        const adminNotice = document.createElement('div');
        adminNotice.innerHTML = `<div style="position:fixed; bottom:10px; left:10px; background:rgba(255,0,0,0.1); color:#900; padding:5px; border-radius:3px; font-size:10px; z-index:9999;">Claude API Unavailable - Using Fallbacks</div>`;
        document.body.appendChild(adminNotice);
      } catch (e) {
        // Ignore DOM errors
      }
    }
  }
  
  /**
   * Set authentication context - critically important for Firebase operations
   * @param {object} authContext - Auth context with userId and familyId 
   */
  setAuthContext(authContext) {
    if (!authContext) return;
    
    console.log("🔐 Setting auth context in ClaudeService:", {
      userId: authContext.userId,
      familyId: authContext.familyId,
      hasValues: !!authContext.userId || !!authContext.familyId
    });
    
    // Update auth context with the new values
    this.authContext = {
      ...this.authContext,
      ...authContext,
      lastUpdated: Date.now()
    };
    
    // Make user auth context available to Firestore operations
    if (authContext.userId) {
      console.log("🔐 Updated userId in ClaudeService:", authContext.userId);
    }
    
    if (authContext.familyId) {
      console.log("🔐 Updated familyId in ClaudeService:", authContext.familyId);
    }
  }
  
  /**
   * Test write to Firestore - use this for debugging Firebase permissions
   * @returns {Promise<boolean>} Success status
   */
  async testFirebaseWrite() {
    try {
      console.log("🧪 Testing Firebase write access with improved diagnostics");
      
      // Use the new FirebasePermissionTest utility for comprehensive testing
      // This dynamically imports the utility to avoid unnecessary load time impact
      const { default: FirebasePermissionTest } = await import('./FirebasePermissionTest');
      
      // Run comprehensive permission tests
      const results = await FirebasePermissionTest.testPermissions(this.authContext);
      
      // Log detailed results
      console.log("📊 Firebase permission test results:", results);
      
      // If tests failed, try to recover
      if (!results.success) {
        console.warn("⚠️ Firebase permissions test failed, attempting recovery...");
        
        // If we have a current user but auth context is missing, rebuild context
        if (auth.currentUser && (!this.authContext || !this.authContext.userId)) {
          console.log("🔄 Rebuilding auth context from current user");
          
          // Get familyId from localStorage if possible
          let familyId = null;
          if (typeof window !== 'undefined') {
            familyId = localStorage.getItem('selectedFamilyId') || 
                       localStorage.getItem('currentFamilyId');
          }
          
          // If we still don't have a familyId, use the hardcoded fallback
          if (!familyId) {
            familyId = 'm93tlovs6ty9sg8k0c8'; // Known working familyId
            console.log("⚠️ Using hardcoded familyId fallback:", familyId);
          }
          
          // Update auth context
          this.authContext = {
            userId: auth.currentUser.uid,
            familyId: familyId,
            timestamp: Date.now(),
            recovered: true
          };
          
          // Save to localStorage
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('userId', auth.currentUser.uid);
              localStorage.setItem('currentFamilyId', familyId);
              localStorage.setItem('selectedFamilyId', familyId);
            } catch (e) {
              console.warn("Failed to save to localStorage:", e);
            }
          }
          
          // Run test again with recovered context
          const recoveryResults = await FirebasePermissionTest.testPermissions(this.authContext);
          console.log("📊 Recovery test results:", recoveryResults);
          
          return recoveryResults.success;
        }
      }
      
      return results.success;
    } catch (error) {
      console.error("❌ Firebase write test failed:", error);
      console.error("Error details:", {
        code: error.code, 
        message: error.message,
        stack: error.stack
      });
      return false;
    }
  }
  
  // Add a test method to verify connectivity
  async testConnection() {
    try {
      const response = await fetch(`${this.proxyUrl}/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log("Claude API connection successful");
        return true;
      } else {
        console.warn(`Claude API connection failed with status: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error("Claude API connectivity test failed:", error);
      return false;
    }
  }
  
  
async generateResponse(messages, context, options = {}) {
  try {
    // CRITICAL FIX: Block for task queries to prevent calendar misinterpretation
    const lastMessage = messages[messages.length - 1];
    const messageText = lastMessage && lastMessage.content ? lastMessage.content : '';
    
    // IMPROVED: Detect task queries more reliably with enhanced patterns
    // Look for explicit task-related patterns to distinguish from calendar events
    if (messageText) {
      let messageLC = messageText.toLowerCase();

      // Check for task query patterns which should NOT trigger calendar
      if ((messageLC.includes('what') || 
           messageLC.includes('which') || 
           messageLC.includes('do i have') || 
           messageLC.includes('show me') || 
           messageLC.includes('list')) && 
          (messageLC.includes('task') || 
           messageLC.includes('todo') || 
           messageLC.includes('to do') || 
           messageLC.includes('to-do') ||
           messageLC.includes('assignment'))) {
        
        // This is a task query, not a calendar request
        console.log("🚫 Task query detected - disabling calendar detection for this message");
        this.disableCalendarDetection = true;
        this.currentProcessingContext = {
          ...this.currentProcessingContext,
          isProcessingTask: true,
          lastContext: "task_query",
          timestamp: Date.now()
        };
        
        // Reset after processing with increased timeout
        setTimeout(() => {
          this.disableCalendarDetection = false;
          console.log("✅ Re-enabled calendar detection after task query");
        }, 5000); // Increased to 5 seconds for safety
      }
      
      // Also check for provider-related queries to block calendar detection
      else if (messageLC.includes('provider') || 
               messageLC.includes('doctor') || 
               messageLC.includes('coach') || 
               messageLC.includes('therapist') || 
               (messageLC.includes('add') && 
                (messageLC.includes('new') || messageLC.includes('create')) && 
                !messageLC.includes('event') && 
                !messageLC.includes('calendar'))) {
                
        console.log("🚫 Potential provider operation detected - disabling calendar detection");
        this.disableCalendarDetection = true;
        this.currentProcessingContext = {
          ...this.currentProcessingContext,
          isProcessingProvider: true,
          lastContext: "provider_operation", 
          timestamp: Date.now()
        };
        
        // Reset after a longer period for provider operations
        setTimeout(() => {
          this.disableCalendarDetection = false;
          console.log("✅ Re-enabled calendar detection after provider operation");
        }, 6000);
      }
    }
    
    // Add a call tracking mechanism to prevent infinite loops
    if (!this._callTracker) {
      this._callTracker = {
        count: 0,
        lastReset: Date.now(),
        pendingComponents: new Set()
      };
    }
    
    // Reset counter every 20 seconds (increased from 15)
    if (Date.now() - this._callTracker.lastReset > 20000) {
      this._callTracker.count = 0;
      this._callTracker.lastReset = Date.now();
      this._callTracker.pendingComponents.clear();
    }
    
    // Get component identifier from context
    const componentId = context?.componentId || 'default';
    
    // Check if this component is already making a request
    if (this._callTracker.pendingComponents.has(componentId)) {
      console.warn(`Component ${componentId} already has a pending request, throttling`);
      const fallbackResponse = "I'm already processing a request from this component. Please wait for it to complete.";
      return fallbackResponse;
    }
    
    try {
      // Add to pending components
      this._callTracker.pendingComponents.add(componentId);
      
      // Increment call count
      this._callTracker.count++;
      
      // Prevent recursive calls that might cause freezing
      if (this._callTracker.count > 8) {
        console.warn("Too many API calls in a short period, throttling to prevent loops");
        return "I'm processing multiple requests. Please wait a moment before asking another question.";
      }
      
      // Early exit if AI calls are disabled
      if (this.disableAICalls) {
        console.log("AI calls disabled. Returning fallback response.");
        return this.createPersonalizedResponse(
          typeof messages[messages.length - 1] === 'object' 
            ? (messages[messages.length - 1].content || messages[messages.length - 1].text || "") 
            : "", 
          context
        );
      }
      
      // Format system prompt with family context
      const systemPrompt = this.formatSystemPrompt(context || {});
      
      // Log for debugging
      if (this.debugMode) {
        console.log("Claude API request via proxy:", { 
          messagesCount: messages.length, 
          systemPromptLength: systemPrompt.length,
          model: this.model,
          mockMode: this.mockMode,
          temperature: options.temperature || 0.7,
          maxTokens: options.maxTokens || 4000
        });
      }
      
// In src/services/ClaudeService.js, inside the generateResponse method
// This is the updated calendar detection section

// Check for calendar request
const lastMessage = messages[messages.length - 1];
const messageText = lastMessage.content || lastMessage.text || "";

// Safely check if any previous message includes event collection markers
let eventCollectionMarker = null;
if (context?.previousAIMessages && Array.isArray(context.previousAIMessages)) {
  // Find messages that include the marker, with type checking
  eventCollectionMarker = context.previousAIMessages.find(msg => 
    typeof msg === 'string' && msg.includes('<voiceNote>event_collection:')
  );
}

if (eventCollectionMarker) {
  // Extract session ID and step
  const sessionMatch = eventCollectionMarker.match(/<voiceNote>event_collection:([^:]+):(\d+)<\/voiceNote>/);
  if (sessionMatch) {
    const [_, sessionId, step] = sessionMatch;
    // Handle collection response
    return this.handleEventCollectionResponse(
      messageText, 
      sessionId, 
      parseInt(step), 
      context.userId,
      context.familyId
    );
  }
}

// In src/services/ClaudeService.js generateResponse method 
// This should replace the existing calendar detection block

// Enhanced calendar detection logic with better logging
console.log("🗓️ Checking for calendar intent in message:", messageText.substring(0, 50) + (messageText.length > 50 ? "..." : ""));
console.log("🗓️ Calendar detection setting:", !this.disableCalendarDetection);

// CRITICAL FIX: Force-enable calendar detection when in dashboard
let calendarDetectionEnabled = !this.disableCalendarDetection;

// Force enable calendar detection if we're processing a specific type of appointment
if (this.currentProcessingContext && !this.currentProcessingContext.isProcessingProvider) {
  if (messageText.toLowerCase().includes('appointment') || 
      messageText.toLowerCase().includes('schedule') ||
      messageText.toLowerCase().includes('calendar')) {
    console.log("🗓️ Force-enabling calendar detection for appointment-related message");
    calendarDetectionEnabled = true;
    // Make sure the flag is consistent
    this.disableCalendarDetection = false;
  }
}

console.log("🗓️ Final calendar detection enabled state:", calendarDetectionEnabled);

if (calendarDetectionEnabled && messageText.length > 0) {
  // IMPROVED: Expanded list of calendar keywords for better detection
  const calendarKeywords = [
    'add to calendar', 'schedule', 'appointment', 'meeting', 'event',
    'calendar', 'book', 'plan', 'sync', 'reminder', 'save date',
    'dentist', 'doctor', 'visit', 'checkup', 'check-up', 'due date',
    'birthday', 'party', 'class', 'lesson', 'activity', 'session',
    'conference', 'deadline', 'celebration', 'anniversary', 'create',
    'put on calendar', 'date', 'time', 'tomorrow', 'next week',
    'set meeting', 'add an event', 'therapy', 'therapist'
  ];
  
  // CRITICAL FIX: First check for provider request to prevent calendar mismatch
  if (calendarDetectionEnabled && messageText.length > 0) {
    // Check for task query patterns which should NOT trigger calendar
    if ((messageText.toLowerCase().includes('what') || 
         messageText.toLowerCase().includes('which') || 
         messageText.toLowerCase().includes('do i have') || 
         messageText.toLowerCase().includes('show me') || 
         messageText.toLowerCase().includes('list')) && 
        messageText.toLowerCase().includes('task')) {
      // This is a task query, not a calendar request
      console.log("🚫 Task query detected - disabling calendar detection for this message");
      this.disableCalendarDetection = true;
      
      setTimeout(() => {
        this.disableCalendarDetection = false;
        console.log("✅ Re-enabled calendar detection after task query");
      }, 2000);
    }
    
    // Check for provider-specific requests which should NOT trigger calendar
    if (messageText.toLowerCase().includes('provider') || 
        (messageText.toLowerCase().includes('add') && 
         (messageText.toLowerCase().includes('doctor') || 
          messageText.toLowerCase().includes('coach') || 
          messageText.toLowerCase().includes('teacher') || 
          messageText.toLowerCase().includes('therapist') || 
          messageText.toLowerCase().includes('babysitter')))) {
      // This is likely a provider request, not a calendar request
      console.log("🚫 Provider request detected - disabling calendar detection for this message");
      this.disableCalendarDetection = true;
      
      setTimeout(() => {
        this.disableCalendarDetection = false;
        console.log("✅ Re-enabled calendar detection after provider request");
      }, 2000);
    }
  }
  
  // IMPROVED: Check specific appointment patterns with broader matching
  const appointmentPatterns = [
    /(?:book|schedule|appointment|with|see|visit)\s+(?:dr\.?|doctor|dentist|therapist)/i,
    /(?:dental|doctor|medical|therapy|speech|appointment|checkup|check-up)\s+(?:for|on|at)/i,
    /(?:add|schedule|create|book)\s+(?:a|an|the)?\s+([a-z]+(?:\s+[a-z]+)?)\s+(?:for|on|at|who)/i,
    /(?:on|next|this|every)\s+(\w+day)/i,
    /(?:at|with)\s+([a-z]+(?:'|')?s(?:\s+[a-z]+))/i // For "at Children's Hospital" pattern
  ];
  
  // Check for keywords
  // First check if we're explicitly handling a task (set by IntentActionService)
  if (this.currentProcessingContext.isProcessingTask) {
    console.log("🚫 Task processing active - skipping calendar detection completely");
    return false;
  }
  
  // Check for task-related patterns that should override calendar detection
  const taskOverridePatterns = [
    /create\s+a\s+(?:new\s+)?task\s+/i,
    /add\s+a\s+(?:new\s+)?task\s+/i,
    /add\s+task\s+/i,
    /new\s+task\s+for\s+/i
  ];
  
  const isTaskRequest = taskOverridePatterns.some(pattern => pattern.test(messageText));
  
  if (isTaskRequest) {
    console.log("🚫 Task request detected - overriding calendar detection");
    // Set context for task processing
    this.currentProcessingContext = {
      ...this.currentProcessingContext,
      isProcessingTask: true,
      lastContext: "task_creation",
      timestamp: Date.now()
    };
    
    // Return early - this is NOT a calendar request
    return false;
  }
  
  const hasKeyword = calendarKeywords.some(keyword =>
    messageText.toLowerCase().includes(keyword)
  );
  
  // Check for appointment patterns
  const hasAppointmentPattern = appointmentPatterns.some(pattern =>
    pattern.test(messageText)
  );
  
  // Combined check
  const isCalendarRequest = hasKeyword || hasAppointmentPattern;
  
  console.log("Calendar detection result:", { 
    hasKeyword, 
    hasAppointmentPattern, 
    isCalendarRequest 
  });
  
  if (isCalendarRequest) {
    // IMPROVED: Better error handling and context validation
    console.log("Detected calendar intent, attempting to extract details");
    
    // Validate required context - Get userId from context or directly from auth
// IMPROVED AUTH HANDLING: Get userId from multiple sources with better logging
const userId = context.userId || auth.currentUser?.uid;
console.log("🔐 AUTH CHECK in calendar extraction:", { 
  contextUserId: context.userId,
  authCurrentUser: auth.currentUser?.uid,
  resolvedUserId: userId
});

// Force auth if we're in a dashboard context
if (!userId && typeof window !== 'undefined') {
  console.log("🔐 No userId found but we appear to be in browser context - attempting to get current user");
  // This is a fallback for when we're in a dashboard context but auth.currentUser isn't available yet
  if (auth.currentUser) {
    console.log("🔐 Retrieved current user:", auth.currentUser.uid);
    const userId = auth.currentUser.uid;
  }
}

if (!userId) {
  console.warn("❌ CRITICAL AUTH FAILURE: Missing userId in all sources, cannot proceed with calendar extraction");
  
  // Check if we're actually in the dashboard by looking at the URL
  if (typeof window !== 'undefined' && window.location.pathname.includes('/dashboard')) {
    console.log("📋 We appear to be in dashboard but auth is missing - using fallback mechanism");
    
    // Try to get familyId from context or localStorage as a last resort
    const fallbackFamilyId = context.familyId || localStorage.getItem('selectedFamilyId');
    
    if (fallbackFamilyId) {
      console.log("📋 Using fallback familyId:", fallbackFamilyId);
      // Try to extract event anyway since we're clearly logged in but auth is failing
      try {
        // Use a simplified path for event extraction
        const basicEventData = await this.extractCalendarRequest(messageText);

        
        if (basicEventData) {
          return `I can help you add "${basicEventData.title || 'this event'}" to your calendar. However, I'm having trouble with your login session. Please try again in a moment, or add it directly through the calendar widget.`;
        }
      } catch (e) {
        console.error("Calendar fallback extraction failed:", e);
      }
    }
  }
  
  // Return special marker
  return "I'd like to add this to your calendar, but I need you to be logged in first. Once you're logged in, I can help you schedule events and send reminders.";
}

// Log context for debugging
console.log("Extracting calendar details with context:", {
  userId: userId,
  familyId: context.familyId,
  messageLength: messageText.length
});

// Use userId instead of context.userId for the rest of the function
const detailCollectionResponse = await this.extractAndCollectEventDetails(
  messageText, 
  userId,
  context.familyId
);
    
    try {
      // Log context for debugging
      console.log("Extracting calendar details with context:", {
        userId: context.userId,
        familyId: context.familyId,
        messageLength: messageText.length
      });
      
      const detailCollectionResponse = await this.extractAndCollectEventDetails(
        messageText, 
        context.userId,
        context.familyId
      );
      
      if (detailCollectionResponse) {
        console.log("Successfully extracted calendar details and started collection");
        return detailCollectionResponse;
      } else {
        console.warn("extractAndCollectEventDetails returned null/undefined");
        
        // IMPROVEMENT: Create a simple event directly as fallback
        console.log("Attempting direct fallback event creation");
        
        const fallbackEvent = {
          title: this.extractTitleFallback(messageText) || "Event from Chat",
          dateTime: this.extractDateTimeFallback(messageText).toISOString(),
          description: "Added from chat conversation",
          source: "allie-chat-fallback"
        };
        
        const result = await this.createEventFromCollectedData(
          fallbackEvent, 
          context.userId, 
          context.familyId
        );
        
        if (result.success) {
          return `I've added "${fallbackEvent.title}" to your calendar for ${new Date(fallbackEvent.dateTime).toLocaleString()}. You can view and edit it in your calendar.`;
        } else {
          return "I tried to add this to your calendar, but encountered a technical issue. Please try describing the event in a different way, or try again later.";
        }
      }
    } catch (error) {
      console.error("Error in calendar detail collection:", error);
      // More helpful error message for debugging
      return "I tried to add this to your calendar, but encountered a technical issue. Please try describing the event in a different way, or try again later.";
    }
  }
}
      
      // Check if messages is an array of our internal message format
      let formattedMessages;
      if (messages.length > 0 && messages[0].sender) {
        // Convert to Claude's expected format
        formattedMessages = messages.map(msg => ({
          role: msg.sender === 'allie' ? 'assistant' : 'user',
          content: msg.text || ""
        }));
      } else {
        // Assume messages are already in Claude's format
        formattedMessages = messages;
      }
      
      // Reduce context size if needed (Claude has token limits)
      if (formattedMessages.length > 20) {
        const contextLimit = 20;
        // Always keep the last message
        const lastMessage = formattedMessages[formattedMessages.length - 1];
        
        // Pick a selection of older messages for context
        // Get every other message from the rest to reduce context size
        const oldMessages = formattedMessages.slice(0, formattedMessages.length - 1)
          .filter((_, index) => index % 2 === 0)
          .slice(-contextLimit + 1);
        
        formattedMessages = [...oldMessages, lastMessage];
        
        if (this.debugMode) {
          console.log(`Reduced message context from ${messages.length} to ${formattedMessages.length} messages`);
        }
      }
      
      // Prepare request payload for Claude API
      const payload = {
        model: this.model,
        max_tokens: options.maxTokens || 4000,
        temperature: options.temperature || 0.7,
        messages: formattedMessages,
        system: systemPrompt
      };
      
      // Add a timeout to the API call - increased to 60 seconds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      try {
        // First check if we're in mock mode or AI calls are disabled
        if (this.mockMode || this.disableAICalls) {
          console.log("Using fallback response (mock mode or AI calls disabled)");
          return this.createPersonalizedResponse(
            typeof messages[messages.length - 1] === 'object' 
              ? (messages[messages.length - 1].content || messages[messages.length - 1].text || "") 
              : "", 
            context
          );
        }

        // Add timeout to ensure we get a response or fallback - increased timeout to 45 seconds
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Request timed out")), 45000)
        );

        console.log("Making request to Claude API:", this.proxyUrl);
        
        // Gather auth information from context and this.authContext
        const authUserId = this.authContext?.userId || auth?.currentUser?.uid;
        const authFamilyId = this.authContext?.familyId || 
                             (typeof window !== 'undefined' ? localStorage.getItem('selectedFamilyId') : null);
        
        console.log("🔑 Auth context for API request:", {
          authUserId: authUserId ? "present" : "missing",
          authFamilyId: authFamilyId ? "present" : "missing" 
        });
        
        // Include auth headers if available
        const headers = {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        };
        
        if (authUserId) {
          headers['X-User-Id'] = authUserId;
        }
        
        if (authFamilyId) {
          headers['X-Family-Id'] = authFamilyId;
        }
        
        // Include auth context in payload as well for redundancy
        const enhancedPayload = {
          ...payload,
          authContext: {
            userId: authUserId,
            familyId: authFamilyId
          }
        };
        
        const responsePromise = fetch(this.proxyUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(enhancedPayload),
          signal: controller.signal
        });

        const response = await Promise.race([responsePromise, timeoutPromise]);
        console.log("Got response from Claude API proxy:", response.status);
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.warn("Claude proxy returned error status:", response.status);
          // Try to get more details about the error
          let errorDetails = "";
          try {
            const errorText = await response.text();
            // Check if we got HTML instead of JSON (common Firebase Hosting issue)
            if (errorText.toLowerCase().includes('<!doctype html>') || 
                errorText.toLowerCase().includes('<html>')) {
              console.error("Received HTML instead of API response - enabling fallback mode");
              this.enableFallbackMode();
            }
            errorDetails = errorText.substring(0, 200); // Get first 200 chars of error
            console.warn("Error details from proxy:", errorDetails);
          } catch (e) {}
          
          // Return a personalized response
          const fallbackResponse = this.createPersonalizedResponse(
            typeof messages[messages.length - 1] === 'object' 
              ? (messages[messages.length - 1].content || messages[messages.length - 1].text || "") 
              : "",
            context
          );
          console.log("Returning fallback response:", fallbackResponse.substring(0, 100) + "...");
          return fallbackResponse;
        }
        
        // Check content type for HTML
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          console.error("Received HTML instead of JSON - API endpoint misconfigured");
          this.enableFallbackMode();
          return this.createPersonalizedResponse(
            typeof messages[messages.length - 1] === 'object'
              ? (messages[messages.length - 1].content || messages[messages.length - 1].text || "")
              : "",
            context
          );
        }
              
        // Try to parse the JSON with better error handling
        let result;
        try {
          result = await response.json();
          
          // Add more detailed logging to see the actual structure
          console.log("Claude API response structure:", JSON.stringify(result).substring(0, 200) + "...");
          
          // Immediate validation of result
          if (!result) {
            throw new Error("Empty result object from Claude API");
          }
        } catch (jsonError) {
          console.error("Error parsing JSON from Claude API:", jsonError);
          // Try to get the raw text to see what's wrong
          let rawText = "";
          try {
            rawText = await response.text();
            console.warn("Raw response text (first 200 chars):", rawText.substring(0, 200));
            
            // Try to extract text content if it's in the raw response
            const textMatch = rawText.match(/"text":"([^"]+)"/);
            if (textMatch && textMatch[1]) {
              return textMatch[1];
            }
          } catch (e) {
            console.error("Error getting raw text:", e);
          }
          
          // Return a strongly-typed fallback response
          return this.createPersonalizedResponse(
            typeof messages[messages.length - 1] === 'object'
              ? (messages[messages.length - 1].content || messages[messages.length - 1].text || "")
              : "",
            context
          );
        }

        // Enhanced validation with better error handling
        if (!result) {
          console.error("Empty result from Claude API");
          const fallbackResponse = this.createPersonalizedResponse(
            typeof messages[messages.length - 1] === 'object'
              ? (messages[messages.length - 1].content || messages[messages.length - 1].text || "")
              : "",
            context
          );
          return fallbackResponse;
        }

        // Add a special catch for undefined or null response
        if (result === undefined || result === null) {
          console.error("Claude API returned undefined or null");
          return this.createPersonalizedResponse(
            typeof messages[messages.length - 1] === 'object'
              ? (messages[messages.length - 1].content || messages[messages.length - 1].text || "")
              : "",
            context
          );
        }

        // Check if result is a string directly (some versions of Claude API may return direct text)
        if (typeof result === 'string') {
          if (!result || result.trim() === '') {
            console.error("Claude API returned empty string response");
            return this.createPersonalizedResponse(
              typeof messages[messages.length - 1] === 'object'
                ? (messages[messages.length - 1].content || messages[messages.length - 1].text || "")
                : "",
              context
            );
          }
          console.log("Claude API returned direct string response");
          return result.trim();
        }

        // Check content structure with better logging
        if (!result.content) {
          console.error("Missing 'content' in Claude API response:", result);
          return this.createPersonalizedResponse(
            typeof messages[messages.length - 1] === 'object'
              ? (messages[messages.length - 1].content || messages[messages.length - 1].text || "")
              : "",
            context
          );
        }

        if (!Array.isArray(result.content) || result.content.length === 0) {
          console.error("'content' is not an array or is empty:", result.content);
          return this.createPersonalizedResponse(
            typeof messages[messages.length - 1] === 'object'
              ? (messages[messages.length - 1].content || messages[messages.length - 1].text || "")
              : "",
            context
          );
        }

        if (!result.content[0]) {
          console.error("First content item is undefined:", result.content);
          return this.createPersonalizedResponse(
            typeof messages[messages.length - 1] === 'object'
              ? (messages[messages.length - 1].content || messages[messages.length - 1].text || "")
              : "",
            context
          );
        }

        // Check for text property with more robust fallbacks
        if (result.content[0].text === undefined || result.content[0].text === null) {
          console.error("'text' property is undefined in content:", result.content[0]);
          
          // Try different response formats that Claude might return
          if (result.content[0].type === "text" && result.content[0].value) {
            return result.content[0].value;
          }
          
          if (typeof result.content[0] === 'string') {
            return result.content[0];
          }
          
          if (result.message && typeof result.message === 'string') {
            return result.message;
          }
          
          if (result.completion && typeof result.completion === 'string') {
            return result.completion;
          }
          
          // Check if there's any usable text in the response at all
          const responseStr = JSON.stringify(result);
          if (responseStr && responseStr.length > 20) {
            try {
              // Try to extract any text content
              const textMatch = responseStr.match(/"text":"([^"]+)"/);
              if (textMatch && textMatch[1]) {
                return textMatch[1];
              }
            } catch (e) {
              // Ignore extraction errors
            }
          }
          
          // Last resort
          console.log("Falling back to personalized response as no text could be extracted");
          return this.createPersonalizedResponse(
            typeof messages[messages.length - 1] === 'object'
              ? (messages[messages.length - 1].content || messages[messages.length - 1].text || "")
              : "",
            context
          );
        }

        // Successfully extracted the text - make sure it's not empty
        const extractedText = result.content[0].text;
        if (!extractedText || extractedText.trim() === '') {
          console.error("Extracted text is empty");
          return this.createPersonalizedResponse(
            typeof messages[messages.length - 1] === 'object'
              ? (messages[messages.length - 1].content || messages[messages.length - 1].text || "")
              : "",
            context
          );
        }

        // Return successfully extracted text
        console.log("Successfully extracted text from Claude API response of length:", extractedText.length);
        return extractedText;
      } catch (error) {
        clearTimeout(timeoutId);
        console.error("Error in Claude API call:", error.message);
        console.error("Full error:", error);
        
        // Handle any type of error with a fallback response
        console.log("Network or API error detected - using fallback response");
        
        // Test the connection
        setTimeout(() => {
          fetch(this.proxyUrl + '/test')
            .then(r => console.log("Claude API test response:", r.status))
            .catch(e => {
              console.error("Claude API is unreachable:", e);
              this.enableFallbackMode();
            });
        }, 100);
        
        // Always return a fallback response to avoid undefined
        return this.createPersonalizedResponse(
          typeof messages[messages.length - 1] === 'object' 
            ? (messages[messages.length - 1].content || messages[messages.length - 1].text || "") 
            : "", 
          context
        );
      }
    } finally {
      // Always remove from pending components to prevent lockout
      if (this._callTracker && this._callTracker.pendingComponents) {
        this._callTracker.pendingComponents.delete(componentId);
      }
    }
  } catch (finalError) {
    console.error("Unhandled error in Claude service:", finalError);
    
    // Ultimate fallback to prevent undefined responses
    const userQuery = typeof messages[messages.length - 1] === 'object' 
      ? (messages[messages.length - 1].content || messages[messages.length - 1].text || "your request") 
      : "your request";
    
    return `I'm having trouble processing ${userQuery} right now. Please try again in a moment. If the problem persists, you can try refreshing the page.`;
  }
}

async extractCalendarRequest(message) {  
  try {
    console.log(`🔄 Extracting calendar details from: "${message.substring(0, 100)}..."`);

    // Use AI model to extract event details
    const systemPrompt = `You are an assistant that extracts calendar event details.
    From the user's message, extract the following information:
    - Event title/name
    - Date and time
    - Location (if mentioned)
    - People involved (if mentioned)
    - Event type or category
    - Any other relevant details

    Return a JSON object with these extracted details. If information is missing, leave the field empty.
    Include dateTime (ISO format if possible), title, location, description, and any other relevant fields.`;

    const response = await this.generateResponse(
      [{ role: 'user', content: `Extract calendar event details from: "${message}"` }],
      { system: systemPrompt },
      { temperature: 0.1 }
    );

    let eventData;
    try {
      // Find and parse JSON in the response
      const jsonMatch = response.match(/({[\s\S]*?})/);
      if (jsonMatch) {
        eventData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not extract JSON from response");
      }
    } catch (parseError) {
      console.warn("Error parsing extracted event data:", parseError);
      
      // Fallback extraction if parsing fails
      eventData = {
        title: this.extractTitleFallback(message),
        dateTime: this.extractDateTimeFallback(message).toISOString(),
        description: 'Added from Allie chat',
        source: 'allie-chat'
      };
    }
    
    console.log("✅ Extracted event data:", eventData);  
    
    // Build result with proper structure
    return {  
      type: eventData.eventType || eventData.category || 'event',  
      title: eventData.title || "New Event",
      dateTime: eventData.dateTime || new Date().toISOString(), 
      endDateTime: eventData.endDateTime,  
      location: eventData.location || '',  
      description: eventData.description || '',  
      person: eventData.person || eventData.childName,
      childName: eventData.childName,  
      childId: eventData.childId || null,
      extraDetails: eventData,
      originalText: message
    };
  } catch (error) {  
    console.error("❌ Error extracting calendar event with AI:", error);
    return null;  
  }  
}

// Add these fallback extraction methods
extractTitleFallback(message) {
  // Try to extract an event title using pattern matching
  const titlePatterns = [
    /(?:add|schedule|create|put)\s+(?:a|an)\s+([^"]+?)\s+(?:on|to|in|for)/i,
    /(?:add|schedule|create|put)\s+"([^"]+)"/i,
    /(?:add|schedule|create|put)\s+(?:a|an)\s+([^,\.]+)/i,
    /(?:appointment|meeting|event|call)\s+(?:with|for)\s+([^,\.]+)/i
  ];
  
  for (const pattern of titlePatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // Default title based on message keywords
  if (message.toLowerCase().includes('dentist')) return 'Dentist Appointment';
  if (message.toLowerCase().includes('doctor')) return 'Doctor Appointment';
  if (message.toLowerCase().includes('meeting')) return 'Meeting';
  
  return 'New Event';
}

extractDateTimeFallback(message) {
  // CRITICAL: Check if this is a task request with a due date
  // We should NOT be treating these as calendar events!
  if (this.currentProcessingContext.isProcessingTask) {
    console.log("🚨 Task context active - SKIPPING calendar date extraction");
    // Return a date 1 hour from now as a reasonable fallback
    const fallbackDate = new Date();
    fallbackDate.setHours(fallbackDate.getHours() + 1);
    return fallbackDate;
  }
  
  // Try to extract date and time using pattern matching
  const dateTimePatterns = [
    // Match "on April 28th at 3pm"
    /on\s+(\w+\s+\d+(?:st|nd|rd|th)?)\s+at\s+(\d+(?::\d+)?\s*(?:am|pm)?)/i,
    // Match "tomorrow at 3pm"
    /tomorrow\s+at\s+(\d+(?::\d+)?\s*(?:am|pm)?)/i,
    // Match "next Tuesday at 3pm"
    /next\s+(\w+day)\s+at\s+(\d+(?::\d+)?\s*(?:am|pm)?)/i,
    // Match "Tuesday at 3pm"
    /(\w+day)\s+at\s+(\d+(?::\d+)?\s*(?:am|pm)?)/i,
    // Match dates like "on 4/28 at 3pm"
    /on\s+(\d+\/\d+(?:\/\d+)?)\s+at\s+(\d+(?::\d+)?\s*(?:am|pm)?)/i
  ];
  
  const now = new Date();
  
  for (const pattern of dateTimePatterns) {
    const match = message.match(pattern);
    if (match) {
      let date;
      const timeStr = match[match.length - 1]; // Last capturing group is always time
      
      if (match[0].toLowerCase().includes('tomorrow')) {
        // Handle "tomorrow"
        date = new Date(now);
        date.setDate(date.getDate() + 1);
      } else if (match[0].toLowerCase().includes('next')) {
        // Handle "next Tuesday" etc.
        const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
          .indexOf(match[1].toLowerCase());
        
        if (dayOfWeek !== -1) {
          date = new Date(now);
          const currentDay = date.getDay();
          const daysToAdd = (dayOfWeek + 7 - currentDay) % 7 || 7; // If today, then next week
          date.setDate(date.getDate() + daysToAdd);
        }
      } else if (match[1].match(/^\d+\/\d+/)) {
        // Handle "04/28" format
        const [month, day] = match[1].split('/');
        date = new Date(now.getFullYear(), parseInt(month) - 1, parseInt(day));
      } else if (match[1].match(/\w+day/i)) {
        // Handle "Tuesday" etc.
        const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
          .indexOf(match[1].toLowerCase());
        
        if (dayOfWeek !== -1) {
          date = new Date(now);
          const currentDay = date.getDay();
          let daysToAdd = dayOfWeek - currentDay;
          if (daysToAdd <= 0) daysToAdd += 7; // Next week if day has passed
          date.setDate(date.getDate() + daysToAdd);
        }
      } else {
        // Handle "April 28th" format
        try {
          date = new Date(match[1] + ", " + now.getFullYear());
        } catch (e) {
          continue; // Try next pattern
        }
      }
      
      if (date && !isNaN(date.getTime())) {
        // Add the time component
        const timeMatch = timeStr.match(/(\d+)(?::(\d+))?\s*(am|pm)?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          const period = timeMatch[3]?.toLowerCase();
          
          // Convert to 24-hour format
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
          
          date.setHours(hours, minutes, 0, 0);
        } else {
          // Default to noon if no time specified
          date.setHours(12, 0, 0, 0);
        }
        
        return date;
      }
    }
  }
  
  // Default to tomorrow at noon if no date/time found
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(12, 0, 0, 0);
  return tomorrow;
}


/**
 * Use AI to extract entities of any specified type
 * @param {string} message - User message
 * @param {string} entityType - Type of entity to extract
 * @param {object} options - Extraction options
 * @returns {Promise<object>} Extracted entity data
 */
async extractEntityWithAI(message, entityType, options = {}) {
  try {
    console.log(`🔄 Using AI to extract ${entityType} from: "${message.substring(0, 100)}..."`);
    
    const templates = {
      provider: `You are an assistant that extracts healthcare or service provider details.
      From the user's message, extract the following information:
      - Provider name
      - Provider type (medical, education, childcare, etc.)
      - Specialty/role
      - Contact information (phone, email)
      - Location/address (if mentioned)
      - Any other relevant details

      Return a JSON object with these extracted details. If information is missing, leave the field empty.`,
      
      event: `You are an assistant that extracts calendar event details.
      From the user's message, extract the following information:
      - Event title/name
      - Date and time
      - Location (if mentioned)
      - People involved (if mentioned)
      - Event type or category
      - Any other relevant details

      Return a JSON object with these extracted details. If information is missing, leave the field empty.`,
      
      task: `You are an assistant that extracts task details.
      From the user's message, extract the following information:
      - Task title/description
      - Due date (if mentioned)
      - Who it's assigned to (if mentioned)
      - Priority level (if mentioned)
      - Category (if mentioned)
      - Any other relevant details

      Return a JSON object with these extracted details. If information is missing, leave the field empty.`,
      
      growth: `You are an assistant that extracts child growth measurement details.
      From the user's message, extract the following information:
      - Child's name (if mentioned)
      - Height/length measurement (with units)
      - Weight measurement (with units)
      - Date of measurement (if mentioned)
      - Clothing or shoe size (if mentioned)
      - Any other relevant details

      Return a JSON object with these extracted details. If information is missing, leave the field empty.`
    };
    
    // Allow customizing the system prompt with additional instructions
    let systemPrompt = templates[entityType] || 
      `Extract all information related to ${entityType} from the user's message and return as a JSON object.`;
      
    // Add any additional system prompt from options
    if (options.additionalSystemPrompt) {
      systemPrompt = `${systemPrompt}\n\n${options.additionalSystemPrompt}`;
    }
    
    const response = await this.generateResponse(
      [{ role: 'user', content: `Extract ${entityType} details from: "${message}"` }],
      { system: systemPrompt },
      { temperature: 0.1 }
    );
    
    // Extract and parse JSON from response
    let entityData;
    try {
      const jsonMatch = response.match(/({[\s\S]*?})/);
      if (jsonMatch) {
        entityData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error(`Could not extract ${entityType} JSON from response`);
      }
    } catch (parseError) {
      console.warn(`Error parsing extracted ${entityType} data:`, parseError);
      return null;
    }
    
    console.log(`✅ Extracted ${entityType} data:`, entityData);
    return entityData;
  } catch (error) {
    console.error(`❌ Error extracting ${entityType} with AI:`, error);
    return null;
  }
}



// In src/services/ClaudeService.js, replace the extractAndCollectEventDetails method with this improved version:
async extractAndCollectEventDetails(message, userId, familyId) {
  try {
    console.log("🚀 Starting extractAndCollectEventDetails for message:", message.substring(0, 50) + "...");
    console.log("🔍 Context:", { userId, familyId });
    
    // First extract basic event details
    const basicEventData = await this.extractCalendarRequest(message);
    
    if (!basicEventData) {
      console.warn("❌ extractCalendarRequest returned null/undefined");
      
      // Create minimal event data to ensure we have something to work with
      const fallbackEventData = {
        type: 'event',
        title: 'Calendar Event',
        dateTime: new Date().toISOString(),
        location: '',
        originalText: message
      };
      
      console.log("⚠️ Using fallback event data:", fallbackEventData);
      
      // Try creating the event directly instead of going through the collection flow
      const eventResult = await this.createEventFromCollectedData(fallbackEventData, userId, familyId);
      
      if (eventResult.success) {
        return `I've added "${fallbackEventData.title}" to your calendar for ${new Date(fallbackEventData.dateTime).toLocaleString()}. You can view it in your calendar now.`;
      } else {
        return null;
      }
    }
    
    console.log("✅ Successfully extracted basic event data:", basicEventData);
    
    // Import EventDetailCollectorService
    let EventDetailCollectorService;
    try {
      EventDetailCollectorService = (await import('./EventDetailCollectorService')).default;
      console.log("✅ Successfully imported EventDetailCollectorService");
    } catch (importError) {
      console.error("❌ Failed to import EventDetailCollectorService:", importError);
      
      // If we can't import the collector service, try to create the event directly
      console.log("⚠️ Attempting direct event creation without collection flow");
      const eventResult = await this.createEventFromCollectedData(basicEventData, userId, familyId);
      
      if (eventResult.success) {
        return `I've added "${basicEventData.title}" to your calendar for ${new Date(basicEventData.dateTime).toLocaleString()}. You can view it in your calendar now.`;
      } else {
        return "I'm having trouble accessing the calendar system. Please try again later.";
      }
    }
    
    // Create a unique session ID
    const sessionId = `event-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    console.log("✅ Created session ID:", sessionId);
    
    // Start collection flow
    let initialPrompt;
    try {
      initialPrompt = await EventDetailCollectorService.startCollection(
        familyId,
        sessionId,
        basicEventData
      );
      console.log("✅ Successfully started collection session");
    } catch (collectionError) {
      console.error("❌ Error starting collection session:", collectionError);
      
      // If collection fails, try direct creation
      console.log("⚠️ Falling back to direct event creation");
      const eventResult = await this.createEventFromCollectedData(basicEventData, userId, familyId);
      
      if (eventResult.success) {
        return `I've added "${basicEventData.title}" to your calendar for ${new Date(basicEventData.dateTime).toLocaleString()}. You can view it in your calendar now.`;
      } else {
        return "I'm having trouble setting up the calendar event. Could you try describing it again with more details?";
      }
    }
    
    if (!initialPrompt || !initialPrompt.prompt) {
      console.warn("❌ No valid prompt returned from startCollection");
      
      // If no prompt, try direct creation
      console.log("⚠️ No prompt returned, falling back to direct event creation");
      const eventResult = await this.createEventFromCollectedData(basicEventData, userId, familyId);
      
      if (eventResult.success) {
        return `I've added "${basicEventData.title}" to your calendar for ${new Date(basicEventData.dateTime).toLocaleString()}. You can view it in your calendar now.`;
      } else {
        return "I couldn't process your calendar request. Please try again with more specific details.";
      }
    }
    
    // Format response for the user
    let responseMessage = `I'd like to add this ${basicEventData.type || 'event'} to your calendar. `;
    responseMessage += `Let's make sure I have all the details:\n\n`;
    
    if (basicEventData.title) {
      responseMessage += `Event: ${basicEventData.title}\n`;
    }
    
    if (basicEventData.dateTime) {
      try {
        const eventDate = new Date(basicEventData.dateTime);
        responseMessage += `Date: ${eventDate.toLocaleDateString()}\n`;
        responseMessage += `Time: ${eventDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}\n`;
      } catch (e) {
        console.warn("❌ Error formatting date:", e);
        // Fallback if date parsing fails
        responseMessage += `Date: Still to be determined\n`;
      }
    }
    
    if (basicEventData.location) {
      responseMessage += `Location: ${basicEventData.location}\n`;
    }
    
    if (basicEventData.childName) {
      responseMessage += `For: ${basicEventData.childName}\n`;
    }
    
    // Add doctor name if available (for appointments)
    if (basicEventData.doctorName) {
      responseMessage += `Doctor: ${basicEventData.doctorName}\n`;
    }
    
    responseMessage += `\n${initialPrompt.prompt}`;
    
    // Add special marker for event collection 
    responseMessage += `\n\n<voiceNote>event_collection:${sessionId}:1</voiceNote>`;
    
    console.log("✅ Returning calendar collection response");
    
    // Send a debug event to track calendar detection success
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('calendar-detection-success', {
        detail: { 
          sessionId, 
          eventType: basicEventData.type || 'general',
          title: basicEventData.title
        }
      }));
    }
    
    return responseMessage;
  } catch (error) {
    console.error("❌ Error extracting and collecting event details:", error);
    // Enhanced error detail
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      userId,
      familyId
    });
    
    // As a last resort, create a basic event directly
    try {
      console.log("⚠️ Final fallback: creating basic event directly");
      const basicEvent = {
        title: "Event from Chat",
        dateTime: new Date().toISOString(),
        description: message.substring(0, 100),
        eventType: "general",
        source: "allie-chat-fallback"
      };
      
      const eventResult = await this.createEventFromCollectedData(basicEvent, userId, familyId);
      
      if (eventResult.success) {
        return `I've added a basic event to your calendar based on our conversation. You can view and edit it in your calendar.`;
      }
    } catch (fallbackError) {
      console.error("❌ Final fallback also failed:", fallbackError);
    }
    
    // Send error tracking event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('calendar-detection-error', {
        detail: { 
          error: error.message,
          userId,
          familyId
        }
      }));
    }
    
    return "I encountered an issue while trying to create this event. Let's try again with a bit more detail. Could you describe the event again with all the key information like date, time, and who it's for?";
  }
}

// In src/services/ClaudeService.js, replace the handleEventCollectionResponse method with this improved version:
async handleEventCollectionResponse(message, sessionId, step, userId, familyId) {
  try {
    console.log(`Processing event collection response for session ${sessionId}, step ${step}`);
    
    // Import needed services
    const EventDetailCollectorService = (await import('./EventDetailCollectorService')).default;
    
    // Process the response
    const result = await EventDetailCollectorService.processResponse(sessionId, message);
    
    if (result.status === 'completed') {
      // Collection is complete
      console.log("Event collection complete, creating event");
      
      // Get the collected data
      const completeData = await EventDetailCollectorService.completeSession(sessionId);
      console.log("Collected complete data:", completeData);
      
      // Format for calendar
      const eventData = this.formatCollectedEventData(completeData);
      console.log("Formatted event data:", eventData);
      
      // Create the event
      const createResult = await this.createEventFromCollectedData(eventData, userId, familyId);
      console.log("Event creation result:", createResult);
      
      if (createResult.success) {
        // Force multiple calendar refreshes to ensure UI updates
        if (typeof window !== 'undefined') {
          // Immediate refresh
          window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
          
          // Delayed refreshes to handle race conditions
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
            console.log("Sending delayed refresh (500ms)");
          }, 500);
          
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
            console.log("Sending final refresh (1500ms)");
          }, 1500);
        }
        
        // Successfully created event
        return `Great! I've added "${eventData.title}" to your calendar for ${new Date(eventData.dateTime).toLocaleString()}. You can view it in your calendar now.`;
      } else {
        return `I had some trouble adding this to your calendar. Please try again or add it directly from the calendar tab.`;
      }
    } else {
      // Continue collection
      return result.prompt;
    }
  } catch (error) {
    console.error("Error handling event collection response:", error);
    return "I encountered an issue while processing your event details. Let's try again from the beginning. What would you like to add to your calendar?";
  }
}

// In ClaudeService.js, update the formatCollectedEventData method

// In ClaudeService.js, replace the formatCollectedEventData method with this improved version:
formatCollectedEventData(collectedData) {
  // Format the collected data into the structure expected by Calendar operations
  const eventData = {
    ...collectedData,
    // Ensure required fields have proper format
    title: collectedData.title || `${collectedData.eventType || 'Event'}`,
    // Format date and time if both are available
    dateTime: collectedData.dateTime || (
      collectedData.date && collectedData.time ? 
      new Date(`${collectedData.date}T${collectedData.time}`).toISOString() : 
      new Date().toISOString()
    ),
    // Add any event-specific details to appropriate containers
    extraDetails: {
      ...(collectedData.extraDetails || {}),
      creationSource: 'guided-chat',
      parsedWithAI: true
    }
  };
  
  // Make sure we have endDateTime
  if (!eventData.endDateTime && eventData.dateTime) {
    const startDate = new Date(eventData.dateTime);
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1); // Default 1 hour duration
    eventData.endDateTime = endDate.toISOString();
  }
  
  // Handle event-specific fields based on type
  if (collectedData.eventType === 'dentist' || collectedData.eventType === 'doctor') {
    eventData.category = 'appointment';
    
    // Enhance appointment details
    eventData.appointmentDetails = {
      ...(eventData.appointmentDetails || {}),
      doctorName: collectedData.doctorName || collectedData.appointmentDetails?.doctorName || "Unknown",
      reasonForVisit: collectedData.reasonForVisit || collectedData.appointmentDetails?.reasonForVisit || "",
      duration: collectedData.duration || collectedData.appointmentDetails?.duration || 60,
      location: collectedData.location || ""
    };
    
    // If we have a doctor but no title, create appropriate title
    if (collectedData.doctorName && !collectedData.title) {
      eventData.title = `${collectedData.eventType === 'dentist' ? 'Dentist' : 'Doctor'} Appointment with ${collectedData.doctorName}`;
    }
  } else if (collectedData.eventType === 'activity') {
    eventData.category = 'activity';
    
    eventData.activityDetails = {
      ...(eventData.activityDetails || {}),
      activityType: collectedData.activityType || collectedData.activityDetails?.activityType || "",
      coach: collectedData.coach || collectedData.activityDetails?.coach || "",
      equipmentNeeded: collectedData.equipmentNeeded || collectedData.activityDetails?.equipmentNeeded || "",
      parentAttendance: collectedData.parentAttendance || collectedData.activityDetails?.parentAttendance || false
    };
  }
  
  // Add special fix for missing childName (found in the Firebase screenshot)
  if (collectedData.originalText && !eventData.childName) {
    // Try to extract child name from original text
    const childNameMatch = collectedData.originalText.match(/for\s+(\w+)/i);
    if (childNameMatch && childNameMatch[1]) {
      const possibleChildName = childNameMatch[1];
      // Don't use words like "appointment", "meeting", etc. as child names
      const nonChildWords = ['appointment', 'meeting', 'doctor', 'dentist', 'myself', 'me'];
      if (!nonChildWords.includes(possibleChildName.toLowerCase())) {
        eventData.childName = possibleChildName;
        console.log("Extracted child name from text:", possibleChildName);
      }
    }
  }
  
  return eventData;
}


async createEventFromCollectedData(eventData, userId, familyId) {
  try {
    // IMPROVED: More robust validation with fallbacks for authentication
    let actualUserId = userId;
    let actualFamilyId = familyId;
    
    // If userId is missing, try to get it from auth
    if (!actualUserId) {
      console.warn("⚠️ Missing userId for event creation - attempting to get from current auth");
      actualUserId = auth.currentUser?.uid;
      
      // Log actual user status
      console.log("🔐 Auth status check:", {
        authCurrentUser: auth.currentUser?.uid,
        authCurrentUserEmail: auth.currentUser?.email,
        isLoggedIn: !!auth.currentUser
      });
      
      // As a last resort, try to get from localStorage
      if (!actualUserId && typeof window !== 'undefined') {
        try {
          // Try various localStorage keys that might have user information
          const storedUser = localStorage.getItem('currentUser') || 
                            localStorage.getItem('user') || 
                            localStorage.getItem('userId');
          
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              actualUserId = parsedUser.uid || parsedUser.id;
              console.log("📋 Retrieved userId from localStorage:", actualUserId);
            } catch (e) {
              // If not JSON, might be direct ID
              actualUserId = storedUser;
              console.log("📋 Using direct userId from localStorage:", actualUserId);
            }
          }
        } catch (storageError) {
          console.error("Error accessing localStorage:", storageError);
        }
      }
    }
    
    // Also ensure familyId is available - similar fallbacks
    if (!actualFamilyId) {
      console.warn("⚠️ Missing familyId for event creation - attempting to get from localStorage");
      if (typeof window !== 'undefined') {
        actualFamilyId = localStorage.getItem('selectedFamilyId') || 
                        localStorage.getItem('familyId');
        
        if (actualFamilyId) {
          console.log("📋 Retrieved familyId from localStorage:", actualFamilyId);
        }
      }
    }
    
    // Final validation check
    if (!actualUserId) {
      console.error("❌ CRITICAL: No userId available from any source for event creation");
      return { success: false, error: "Missing user ID - authentication required" };
    }
    
    // Enhanced logging for debugging
    console.log("🗓️ Creating event from collected data:", {
      title: eventData.title || "Untitled Event",
      type: eventData.eventType || "general",
      dateTime: eventData.dateTime,
      userId: actualUserId,
      familyId: actualFamilyId,
      doctorName: eventData.doctorName || eventData.appointmentDetails?.doctorName
    });
    
    // Enhanced logging for debugging
    console.log("Creating event from collected data:", {
      title: eventData.title || "Untitled Event",
      type: eventData.eventType || "general",
      dateTime: eventData.dateTime,
      userId: userId,
      familyId: familyId,
      doctorName: eventData.doctorName || eventData.appointmentDetails?.doctorName
    });
    
    // Ensure we have valid date values
    const startDateTime = eventData.dateTime || new Date().toISOString();
    const startDate = new Date(startDateTime);
    const endDate = eventData.endDateTime ? 
      new Date(eventData.endDateTime) : 
      new Date(startDate.getTime() + 60 * 60 * 1000); // Default to 1 hour later
    
    // Prepare the event for the calendar with all required fields
    const event = {
      title: eventData.title || "Untitled Event",
      summary: eventData.title || "Untitled Event",
      description: eventData.description || "",
      location: eventData.location || "",
      // Make sure eventType is set appropriately
      eventType: eventData.eventType || "general",
      category: eventData.category || eventData.eventType || "general",
      // Add user and family IDs
      userId,
      familyId,
      // Ensure proper datetime format - CRITICAL PART
      start: {
        dateTime: startDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      // Also include these date formats for maximum compatibility
      date: startDate.toISOString(),
      dateTime: startDate.toISOString(), 
      dateObj: startDate,
      dateEndObj: endDate,
      endDateTime: endDate.toISOString(),
      reminders: {
        useDefault: false,
        overrides: [
          {'method': 'popup', 'minutes': 30}
        ]
      },
      // Add a special source flag to track chat-created events
      source: 'allie-chat',
      creationSource: 'allie-chat'
    };
    
    // Add child-specific fields if present
    if (eventData.childId) event.childId = eventData.childId;
    if (eventData.childName) event.childName = eventData.childName;
    if (eventData.attendingParentId) event.attendingParentId = eventData.attendingParentId;
    
    // Add doctor name for medical appointments
    if (eventData.doctorName || eventData.appointmentDetails?.doctorName) {
      event.doctorName = eventData.doctorName || eventData.appointmentDetails.doctorName;
    }
    
    // Add appointment-specific details
    if (eventData.eventType === 'doctor' || eventData.eventType === 'dentist') {
      event.appointmentDetails = eventData.appointmentDetails || {
        doctorName: eventData.doctorName || "Unknown",
        reasonForVisit: "",
        duration: 60
      };
      
      // Also add these to extraDetails to ensure they're saved
      event.extraDetails = {
        ...(eventData.extraDetails || {}),
        appointmentDetails: event.appointmentDetails,
        doctorName: event.doctorName,
        creationSource: 'allie-chat',
        parsedWithAI: true
      };
    } else {
      // For non-medical events, just add generic extraDetails
      event.extraDetails = {
        ...(eventData.extraDetails || {}),
        creationSource: 'allie-chat',
        parsedWithAI: true
      };
    }
    
    console.log("Final event object ready for saving:", event);
    try {
      // Use consistent dynamic import pattern
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../services/firebase');
      const { auth } = await import('../services/firebase');
      
      // Critical fix: Ensure userId is defined using multiple fallbacks
      const effectiveUserId = userId || auth.currentUser?.uid || 'system-default';
      
      // Log more details for debugging
      console.log("🔥 Attempting direct Firebase write for event with:", { 
        providedUserId: userId,
        effectiveUserId: effectiveUserId, 
        authCurrentUser: auth.currentUser?.uid,
        familyId, 
        eventTitle: event.title || 'Untitled' 
      });
      
      // Prepare the event for direct Firestore insertion with guaranteed userId
      const firestoreEvent = {
        ...event,
        userId: effectiveUserId, // Explicitly set userId with fallback
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Verify critical fields before writing
      if (!firestoreEvent.familyId) {
        console.warn("Missing familyId, using fallback");
        firestoreEvent.familyId = familyId || 'default-family';
      }
      
      // Add to Firestore events collection
      const docRef = await addDoc(collection(db, "events"), firestoreEvent);
  
  console.log("🔥 Direct Firebase insertion successful:", docRef.id);
  
  // Dispatch notifications
  this.dispatchCalendarNotifications(event, { 
    success: true, 
    eventId: docRef.id 
  });
  
  return {
    success: true,
    eventId: docRef.id
  };
} catch (error) {
  console.error("🔥 All approaches failed. Final error:", error);
  return { success: false, error: error.message };
}
  } catch (error) {
    console.error("Error creating event from collected data:", error);
    return { success: false, error: error.message };
  }
}

// Add this helper method to handle notifications
dispatchCalendarNotifications(event, result) {
  if (typeof window === 'undefined') return;
  
  console.log("Dispatching calendar notifications");
  
  // First set of notifications
  window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
  
  // Add event-specific notification with detailed data
  window.dispatchEvent(new CustomEvent('calendar-event-added', {
    detail: { 
      eventId: result.eventId || result.firestoreId || result.universalId,
      event: event
    }
  }));
  
  // Add child-specific event if applicable
  if (event.childId || event.childName) {
    window.dispatchEvent(new CustomEvent('calendar-child-event-added', {
      detail: { 
        eventId: result.eventId || result.firestoreId || result.universalId,
        childId: event.childId,
        childName: event.childName
      }
    }));
  }
  
  // Add staggered refresh events to handle race conditions
  setTimeout(() => {
    console.log("Sending delayed force-calendar-refresh event (500ms)");
    window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
  }, 500);
  
  setTimeout(() => {
    console.log("Sending final force-calendar-refresh event (1500ms)");
    window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
  }, 1500);
}

// Add this helper method to handle notifications
dispatchCalendarNotifications(event, result) {
  if (typeof window === 'undefined') return;
  
  console.log("📢 Dispatching calendar notifications");
  
  // First immediate set of notifications
  window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
  
  // Add event-specific notification with detailed data
  window.dispatchEvent(new CustomEvent('calendar-event-added', {
    detail: { 
      eventId: result.eventId || result.firestoreId || result.universalId,
      event: event
    }
  }));
  
  // Add child-specific event if applicable
  if (event.childId || event.childName) {
    window.dispatchEvent(new CustomEvent('calendar-child-event-added', {
      detail: { 
        eventId: result.eventId || result.firestoreId || result.universalId,
        childId: event.childId,
        childName: event.childName
      }
    }));
  }
  
  // Add staggered refresh events to handle race conditions and component loading
  setTimeout(() => {
    console.log("📢 Sending delayed force-calendar-refresh event (500ms)");
    window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
  }, 500);
  
  setTimeout(() => {
    console.log("📢 Sending final force-calendar-refresh event (1500ms)");
    window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
  }, 1500);
}


  async processCalendarRequest(eventData, context) {  
    try {  
      if (!eventData) {  
        return "I couldn't extract event details from your message. Could you provide more information?";  
      }  
        
      if (this.debugMode) {
        console.log(`Processing calendar request with data:`, JSON.stringify(eventData, null, 2));  
      }
        
      const currentUser = auth.currentUser;  
      if (!currentUser) {  
        return "I need you to be logged in to add events to your calendar. Please log in and try again.";  
      }  
        
      // Get family ID from context or currentUser  
      const familyId = context?.familyId || '';  
        
      // Parse date and time from dateTime provided by UnifiedParserService  
      let eventDate;  
      if (eventData.dateTime) {  
        eventDate = new Date(eventData.dateTime);  
          
        // If date is invalid, use a fallback  
        if (isNaN(eventDate.getTime())) {  
          eventDate = new Date();  
          eventDate.setDate(eventDate.getDate() + 1); // Default to tomorrow  
          eventDate.setHours(10, 0, 0, 0); // Default to 10 AM  
        }  
      } else {  
        // No date provided, default to tomorrow at 10 AM  
        eventDate = new Date();  
        eventDate.setDate(eventDate.getDate() + 1);  
        eventDate.setHours(10, 0, 0, 0);  
      }  
        
      // Create end time (1 hour after start by default)  
      const endDate = eventData.endDateTime ? new Date(eventData.endDateTime) : new Date(eventDate);  
      if (!eventData.endDateTime) {  
        endDate.setHours(endDate.getHours() + 1);  
      }  
        
      // Handle child-specific events  
      let childId = eventData.childId;  
      let childName = eventData.childName;  
        
      // Try to find a matching child if a name is provided but no ID  
      if (!childId && childName && context && context.children) {  
        // Look for child by name  
        const matchingChild = context.children.find(  
          child => child.name.toLowerCase() === childName.toLowerCase()  
        );  
          
        if (matchingChild) {  
          childId = matchingChild.id;  
          childName = matchingChild.name; // Ensure we use the correct capitalization  
        }  
      }  
        
      // Check for provider information in the event  
      let providerInfo = null;  
      let existingProvider = null;  
      let providerCreationMessage = "";  
        
      // Check if this is a medical/dental appointment that might need provider lookup  
      const isMedicalEvent =   
        eventData.type?.toLowerCase().includes('doctor') ||   
        eventData.type?.toLowerCase().includes('dental') ||   
        eventData.type?.toLowerCase().includes('appointment') ||  
        eventData.title?.toLowerCase().includes('doctor') ||  
        eventData.title?.toLowerCase().includes('dr.') ||  
        eventData.title?.toLowerCase().includes('dentist');  
        
      // Extract potential provider name  
      let providerName = null;  
      if (isMedicalEvent) {  
        // Look for doctor/dentist mention patterns in title or original message  
        const doctorPatterns = [  
          /(?:doctor|dr\.?|dentist)\s+([a-z]+(?:\s+[a-z]+)?)/i,  
          /(?:with|see)\s+(?:doctor|dr\.?|dentist)\s+([a-z]+(?:\s+[a-z]+)?)/i  
        ];  
          
        for (const pattern of doctorPatterns) {  
          const match = (eventData.title?.match(pattern) || eventData.originalText?.match(pattern));  
          if (match && match[1]) {  
            providerName = match[1];  
            break;  
          }  
        }  
          
        // Try to look up the provider in the directory  
        if (providerName && familyId) {  
          try {  
            // Import provider service  
            const ProviderService = (await import('./ProviderService')).default;  
              
            // Get providers for this family  
            const providers = await ProviderService.getProviders(familyId);  
              
            // Find matching provider  
            existingProvider = providers.find(p =>   
              p.name.toLowerCase().includes(providerName.toLowerCase())  
            );  
              
            // If no existing provider, create one  
            if (!existingProvider && providerName) {  
              // Create provider data  
              const providerData = {  
                name: providerName,  
                type: 'medical',  
                specialty: eventData.type?.toLowerCase().includes('dental') ? 'Dentist' : 'Doctor',  
                familyId: familyId,  
                email: '',  
                phone: '',  
                address: eventData.location || '',  
                notes: `Added from calendar event: ${eventData.title}`  
              };  
                
              // Save the provider  
              const result = await ProviderService.saveProvider(familyId, providerData);  
                
              if (result.success) {  
                existingProvider = {  
                  id: result.providerId,  
                  ...providerData  
                };  
                  
                providerCreationMessage = `I've also added ${providerName} to your provider directory.`;  
              }  
            }  
          } catch (error) {  
            console.error("Error checking/creating provider:", error);  
            // Continue with event creation even if provider check fails  
          }  
        }  
      }  
        
      // Create calendar event object with provider info if available  
      const event = {  
        summary: eventData.title || 'New Event',  
        description: eventData.description || `Event for ${childName || 'family'}`,  
        location: eventData.location || '',  
        start: {  
          dateTime: eventDate.toISOString(),  
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone  
        },  
        end: {  
          dateTime: endDate.toISOString(),  
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone  
        },  
        reminders: {  
          useDefault: false,  
          overrides: [  
            {'method': 'popup', 'minutes': 30}  
          ]  
        },  
        // Add child metadata if available  
        childId: childId,  
        childName: childName,  
        // Add event type and category  
        eventType: eventData.type?.toLowerCase() || 'event',  
        category: eventData.type?.toLowerCase() || 'event',  
        // Include context  
        familyId: familyId,  
        // Add source information  
        source: 'chat',  
        // Add extra details and parsing metadata  
        extraDetails: {  
          creationSource: 'chat',  
          parsedWithAI: true,  
          extractionConfidence: 0.9,  
          originalText: eventData.originalText,  
          providerId: existingProvider ? existingProvider.id : null,  
          providerName: existingProvider ? existingProvider.name : null,  
          notes: eventData.extraDetails?.notes || ''  
        }  
      };  
        
      if (this.debugMode) {
        console.log("Generated calendar event:", JSON.stringify(event, null, 2));  
      }
        
      // Instead of immediately adding the event, return a confirmation message  
      // Format the event details for the user to confirm  
      const formattedDate = eventDate.toLocaleDateString('en-US', {   
        weekday: 'long',   
        month: 'long',   
        day: 'numeric'   
      });  
        
      const formattedTime = eventDate.toLocaleTimeString('en-US', {   
        hour: 'numeric',   
        minute: '2-digit'  
      });  
        
      // Create a session token for this pending event  
      const sessionToken = Date.now().toString(36) + Math.random().toString(36).substring(2);  
        
      // Store the event data in localStorage  
      if (typeof window !== 'undefined') {  
        try {  
          const pendingEvents = JSON.parse(localStorage.getItem('pendingCalendarEvents') || '{}');  
          pendingEvents[sessionToken] = {  
            event,  
            timestamp: Date.now()  
          };  
          localStorage.setItem('pendingCalendarEvents', JSON.stringify(pendingEvents));  
        } catch (storageError) {  
          console.error("Error storing pending event:", storageError);  
        }  
      }  
        
      // Create a confirmation message with event details  
      let confirmationMessage = `I've extracted the following event details. Would you like me to add this to your calendar?\n\n`;  
      confirmationMessage += `Event: ${eventData.title || 'New Event'}\n`;  
      confirmationMessage += `Date: ${formattedDate}\n`;  
      confirmationMessage += `Time: ${formattedTime}\n`;  
        
      if (eventData.location) {  
        confirmationMessage += `Location: ${eventData.location}\n`;  
      }  
        
      if (existingProvider) {  
        confirmationMessage += `Provider: ${existingProvider.name}\n`;  
      }  
        
      if (childName) {  
        confirmationMessage += `For: ${childName}\n`;  
      }  
        
      // Add provider creation message if applicable  
      if (providerCreationMessage) {  
        confirmationMessage += `\n${providerCreationMessage}\n`;  
      }  
        
      // Add confirmation instructions  
      confirmationMessage += `\nReply with "yes" to add this event, or let me know what needs to be corrected.`;  
        
      // Add a special marker to indicate this is a calendar confirmation  
      confirmationMessage += `\n\n<calendar_confirmation token="${sessionToken}">`;  
        
      return confirmationMessage;  
    } catch (error) {  
      console.error("Error processing calendar request:", error);  
      return "I wasn't able to process your calendar request due to a technical issue. You can try again or add the event directly through the calendar widget.";  
    }  
  }

  // Add this new method to ClaudeService.js  
  // In src/services/ClaudeService.js 
  async handleCalendarConfirmation(message, token, userId) {  
    try {  
      // Check if we have a valid token and pending event  
      if (!token || !userId) {  
        return "I couldn't find the event you're referring to. Please try creating it again.";  
      }  
          
      // Retrieve the pending event  
      let pendingEvent = null;  
      if (typeof window !== 'undefined') {  
        try {  
          const pendingEvents = JSON.parse(localStorage.getItem('pendingCalendarEvents') || '{}');  
          pendingEvent = pendingEvents[token]?.event;  
              
          // Remove the pending event from storage  
          delete pendingEvents[token];  
          localStorage.setItem('pendingCalendarEvents', JSON.stringify(pendingEvents));  
        } catch (storageError) {  
          console.error("Error retrieving pending event:", storageError);  
        }  
      }  
          
      if (!pendingEvent) {  
        return "I couldn't find the event you're referring to, or it may have expired. Please try creating it again.";  
      }  
          
      // Check if the user wants to confirm or modify the event  
      const lowerMessage = message.toLowerCase();  
      const confirmTerms = ['yes', 'confirm', 'okay', 'ok', 'sure', 'add it', 'add to calendar', 'looks good', 'correct'];  
          
      // Check if any confirmation term is in the message  
      const isConfirmed = confirmTerms.some(term =>   
        lowerMessage.includes(term) || lowerMessage === term  
      );  
          
      if (isConfirmed) {  
        // User confirmed - add the event to the calendar  
        const result = await CalendarService.addEvent(pendingEvent, userId);  
            
        if (result && result.success) {  
          // Trigger a UI refresh with multiple attempts
          if (typeof window !== 'undefined') {
            console.log("Dispatching calendar refresh events after adding event");
            
            // Immediate refresh
            window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
            
            // Follow-up refreshes to ensure UI updates
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
              console.log("Sending delayed refresh event (500ms)");
            }, 500);
            
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
              console.log("Sending delayed refresh event (1500ms)");
            }, 1500);
          }
              
          // Format the success message  
          const eventDate = new Date(pendingEvent.start.dateTime);  
          const formattedDate = eventDate.toLocaleDateString('en-US', {   
            weekday: 'long',   
            month: 'long',   
            day: 'numeric'   
          });  
              
          const formattedTime = eventDate.toLocaleTimeString('en-US', {   
            hour: 'numeric',   
            minute: '2-digit'  
          });  
              
          let response = `I've added the following event to your family's shared calendar:\n\n`;  
          response += `Event: ${pendingEvent.summary}\n`;  
          response += `Date: ${formattedDate}\n`;  
          response += `Time: ${formattedTime}\n`;  
              
          if (pendingEvent.location) {  
            response += `Location: ${pendingEvent.location}\n`;  
          }  
              
          if (pendingEvent.childName) {  
            response += `For: ${pendingEvent.childName}\n`;  
          }  
              
          if (pendingEvent.extraDetails?.providerName) {  
            response += `Provider: ${pendingEvent.extraDetails.providerName}\n`;  
          }  
              
          response += `\nThis has been added to your family's shared calendar. You can view and manage this in your calendar.`;  
              
          return response;  
        } else {  
          return "I tried to add the event to your calendar, but encountered an issue. Please try again or add it manually through the calendar widget.";  
        }  
      } else {  
        // User wants to modify the event - try to understand what they want to change  
        try {  
          // Use UnifiedParserService to extract the updated event  
          const UnifiedParserService = (await import('./UnifiedParserService')).default;  
          const updatedEvent = await UnifiedParserService.parseEvent(message, {}, [  
            { text: `Previous event: ${pendingEvent.summary} on ${pendingEvent.start.dateTime}` }  
          ]);  
              
          // Check what was updated  
          let changes = [];  
              
          // Check for date/time changes  
          if (updatedEvent.dateTime) {  
            const newDate = new Date(updatedEvent.dateTime);  
            const oldDate = new Date(pendingEvent.start.dateTime);  
                
            if (newDate.toDateString() !== oldDate.toDateString() ||   
                newDate.getHours() !== oldDate.getHours() ||   
                newDate.getMinutes() !== oldDate.getMinutes()) {  
                  
              // Update the event time  
              pendingEvent.start.dateTime = newDate.toISOString();  
                  
              // Update end time (maintain same duration)  
              const oldEnd = new Date(pendingEvent.end.dateTime);  
              const duration = oldEnd - oldDate;  
                  
              const newEnd = new Date(newDate.getTime() + duration);  
              pendingEvent.end.dateTime = newEnd.toISOString();  
                  
              changes.push(`Date/time updated to ${newDate.toLocaleString()}`);  
            }  
          }  
              
          // Check for title changes  
          if (updatedEvent.title && updatedEvent.title !== pendingEvent.summary) {  
            pendingEvent.summary = updatedEvent.title;  
            changes.push(`Title updated to "${updatedEvent.title}"`);  
          }  
              
          // Check for location changes  
          if (updatedEvent.location && updatedEvent.location !== pendingEvent.location) {  
            pendingEvent.location = updatedEvent.location;  
            changes.push(`Location updated to "${updatedEvent.location}"`);  
          }  
              
          // Handle no changes detected  
          if (changes.length === 0) {  
            // No specific changes found, but user didn't confirm  
            return "I'm not sure what changes you'd like to make. Please specify what you want to change, or reply with 'yes' to confirm the event.";  
          }  
              
          // Create a new token for the updated event  
          const newToken = Date.now().toString(36) + Math.random().toString(36).substring(2);  
              
          // Store the updated event  
          if (typeof window !== 'undefined') {  
            try {  
              const pendingEvents = JSON.parse(localStorage.getItem('pendingCalendarEvents') || '{}');  
              pendingEvents[newToken] = {  
                event: pendingEvent,  
                timestamp: Date.now()  
              };  
              localStorage.setItem('pendingCalendarEvents', JSON.stringify(pendingEvents));  
            } catch (storageError) {  
              console.error("Error storing updated pending event:", storageError);  
            }  
          }  
              
          // Format the updated event for confirmation  
          const formattedDate = new Date(pendingEvent.start.dateTime).toLocaleDateString('en-US', {   
            weekday: 'long',   
            month: 'long',   
            day: 'numeric'   
          });  
              
          const formattedTime = new Date(pendingEvent.start.dateTime).toLocaleTimeString('en-US', {   
            hour: 'numeric',   
            minute: '2-digit'  
          });  
              
          let responseMessage = `I've updated the event details:\n\n`;  
          responseMessage += changes.join('\n') + '\n\n';  
          responseMessage += `Updated details:\n`;  
          responseMessage += `Event: ${pendingEvent.summary}\n`;  
          responseMessage += `Date: ${formattedDate}\n`;  
          responseMessage += `Time: ${formattedTime}\n`;  
              
          if (pendingEvent.location) {  
            responseMessage += `Location: ${pendingEvent.location}\n`;  
          }  
              
          if (pendingEvent.childName) {  
            responseMessage += `For: ${pendingEvent.childName}\n`;  
          }  
              
          if (pendingEvent.extraDetails?.providerName) {  
            responseMessage += `Provider: ${pendingEvent.extraDetails.providerName}\n`;  
          }  
              
          // Add confirmation instructions  
          responseMessage += `\nDoes this look correct now? Reply with "yes" to add this event to your calendar.`;  
              
          // Add the confirmation token  
          responseMessage += `\n\n<calendar_confirmation token="${newToken}">`;  
              
          return responseMessage;  
        } catch (error) {  
          console.error("Error processing event modifications:", error);  
          return "I had trouble understanding your changes. Could you please specify exactly what you'd like to change about the event?";  
        }  
      }  
    } catch (error) {  
      console.error("Error handling calendar confirmation:", error);  
      return "I encountered an issue processing your response. Please try creating the event again.";  
    }  
  }
  
  // Extract provider details from text
  extractProviderInfo(text) {
    // Basic extraction of provider information from text
    const type = text.toLowerCase().includes("teacher") ? "education" :
                 text.toLowerCase().includes("dentist") ? "medical" :
                 text.toLowerCase().includes("coach") || text.toLowerCase().includes("instructor") ? "activity" :
                 "medical";
    
    const nameMatches = text.match(/(?:doctor|dr\.?|teacher|instructor|provider)\s+([a-z\s\.]+)/i);
    const name = nameMatches ? nameMatches[1] : "Unknown Provider";
    
    const specialty = text.toLowerCase().includes("pediatrician") ? "Pediatrician" : 
                     text.toLowerCase().includes("dentist") ? "Dentist" :
                     text.toLowerCase().includes("guitar") ? "Guitar Teacher" :
                     text.toLowerCase().includes("piano") ? "Piano Teacher" :
                     text.toLowerCase().includes("music") ? "Music Teacher" :
                     "";
    
    // Extract email if present
    const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
    const email = emailMatch ? emailMatch[1] : "";
    
    // Extract phone if present
    const phoneMatch = text.match(/(?:\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
    const phone = phoneMatch ? phoneMatch[0] : "";
    
    return {
      name,
      type,
      specialty,
      email,
      phone,
      address: "",
      notes: ""
    };
  }

  // Test Hello World function
  async testHelloWorld() {
    try {
      console.log("Testing Hello World function via proxy...");
      
      // Simple test to check API connectivity through proxy
      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 100,
          messages: [
            {
              role: "user",
              content: "Say hello world!"
            }
          ],
          system: "You are a helpful assistant that responds with just 'Hello World!'"
        })
      });
      
      // Check if the response is OK
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Proxy server returned ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      
      return {
        message: "Claude API connection via proxy successful!",
        content: result.content[0].text,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Detailed error in Hello World test:", error);
      throw error;
    }
  }
  
  createPersonalizedResponse(userMessage, context = {}) {
    // Safely handle undefined userMessage
    const userMessageLower = userMessage ? userMessage.toLowerCase() : "";
    
    // Safely handle undefined context
    const familyName = context?.familyName || "your family";
    
    // Try to give responses based on actual data
    if (userMessageLower.includes("survey") || userMessageLower.includes("result")) {
      if (context.surveyData && context.surveyData.mamaPercentage) {
        return `Based on your family's survey data, Mama is currently handling about ${context.surveyData.mamaPercentage.toFixed(1)}% of tasks overall, while Papa is handling ${(100 - context.surveyData.mamaPercentage).toFixed(1)}%. Would you like me to break this down by category?`;
      }
    }
    
    // Handle survey question explanations
    if (userMessageLower.includes("why") && userMessageLower.includes("question")) {
      return `The survey questions are designed to measure both visible and invisible work in your family. Each question has a weighted impact score based on factors like frequency (how often the task is done), invisibility (how often the work goes unnoticed), emotional labor required, and impact on child development. This helps create a comprehensive picture of your family's workload distribution.`;
    }
    
    // Handle weight/scoring explanations
    if (userMessageLower.includes("weight") || userMessageLower.includes("score") || userMessageLower.includes("impact")) {
      return `Task weights in Allie are calculated using several factors: Base Weight (time required), Frequency (daily tasks have higher weight than monthly ones), Invisibility (tasks that go unnoticed have higher weight), Emotional Labor (mental and emotional energy required), and Child Development Impact (how the task affects children's growth). These factors combine to create the total weight you see for each question.`;
    }
    
    if (userMessageLower.includes("task") || userMessageLower.includes("what") && userMessageLower.includes("do")) {
      if (context.tasks && context.tasks.length > 0) {
        const pendingTasks = context.tasks.filter(t => !t.completed);
        if (pendingTasks.length > 0) {
          return `The ${familyName} family currently has ${pendingTasks.length} pending tasks. The next task due is "${pendingTasks[0].title}" assigned to ${pendingTasks[0].assignedTo}. Would you like more details about this task?`;
        }
      }
    }
    
    if (userMessageLower.includes("balance") || userMessageLower.includes("imbalance")) {
      if (context.balanceScores && context.balanceScores.categoryBalance) {
        const mostImbalanced = Object.entries(context.balanceScores.categoryBalance)
          .sort((a, b) => b[1].imbalance - a[1].imbalance)[0];
        
        if (mostImbalanced) {
          return `The greatest imbalance in the ${familyName} family is in ${mostImbalanced[0]}, with a ${mostImbalanced[1].imbalance.toFixed(1)}% difference. ${mostImbalanced[1].mama > mostImbalanced[1].papa ? "Mama" : "Papa"} is currently handling most of these tasks.`;
        }
      }
    }
    
    // Calendar-related contextual response
    if (userMessageLower.includes("calendar") || userMessageLower.includes("schedule") || userMessageLower.includes("appointment")) {
      return `I can help you manage your family's calendar. You can add events by saying something like "Add a dentist appointment for Emma on Tuesday at 2pm" or "Schedule a family dinner on Friday at 6pm". What would you like to add to your calendar?`;
    }
    
    // Relationship-related contextual response
    if (userMessageLower.includes("relationship") || userMessageLower.includes("partner") || userMessageLower.includes("spouse")) {
      if (context.relationshipData) {
        return `Based on your family data, you've implemented about ${context.relationshipData.avgImplementation?.toFixed(0) || 0}% of relationship strategies. Your strongest strategy is "${context.relationshipData.topStrategy || 'spending time together'}". Would you like suggestions for strengthening your relationship further?`;
      } else {
        return `Maintaining a strong relationship while balancing family responsibilities is important. I can suggest relationship strategies, help plan date nights, or provide insights based on research. What aspect of your relationship would you like to focus on?`;
      }
    }
    
    // Child-related contextual response
    if (userMessageLower.includes("child") || userMessageLower.includes("kid") || userMessageLower.includes("son") || userMessageLower.includes("daughter")) {
      if (context.children && context.children.length > 0) {
        return `You can track various aspects of your ${context.children.length > 1 ? 'children' : 'child'} including medical appointments, growth metrics, emotional wellbeing, and academic progress. Would you like to add new information or view existing data?`;
      } else {
        return `I can help you track information about your children, including medical appointments, growth metrics, emotional wellbeing, and academic progress. Would you like me to explain how the child tracking features work?`;
      }
    }
    
    // If we can't give a specific response based on data, default to something generic but personalized
    return `I'm here to help with your family balance needs. I can answer questions about survey weights, task distribution, and relationship strategies. What would you like to know about?`;
  }
  
  
  // Format system prompt with family context
  formatSystemPrompt(familyContext) {
    // Log the context data for debugging
    if (this.debugMode) {
      console.log("Formatting system prompt with context:", Object.keys(familyContext));
    }
    
    // Get knowledge base if available
    const kb = familyContext.knowledgeBase || {};
    
    // Current date and time information for Claude
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
    
    // Add special sections based on intent if available
    let intentSpecificContext = '';
    if (familyContext.currentIntent) {
      const intent = familyContext.currentIntent;
      const intentCategory = intent.split('.')[0];
      
      // Add special context for calendar requests
      if (intentCategory === 'calendar') {
        intentSpecificContext += `
        === CALENDAR CONTEXT ===
        The user is asking about calendar functionality. Allie supports:
        - Adding events to the family calendar
        - Scheduling appointments, meetings, and reminders
        - Creating date nights and relationship activities
        - Setting up family meetings
        
        Calendar requests should be handled precisely. Extract the following details:
        - Event title/type
        - Date and time
        - Location (if specified)
        - Participants (if specified)
        - Duration (if specified)
        
        Be very specific in your responses about the exact date, time, and details.
        `;
      }
      
      // Add special context for relationship questions
      else if (intentCategory === 'relationship') {
        intentSpecificContext += `
        === RELATIONSHIP CONTEXT ===
        The user is asking about relationship features. Allie supports:
        - Planning date nights and couple activities
        - Scheduling relationship check-ins
        - Managing relationship strategies
        - Providing relationship insights based on family data
        
        When answering relationship questions, be emotionally supportive and practical. Balance research insights with actionable suggestions.
        `;
        
        // Add relationship data if available
        if (familyContext.relationshipData) {
          intentSpecificContext += `
          Current Relationship Data:
          - Implemented strategies: ${familyContext.relationshipData.implementedStrategies?.join(', ') || 'None'}
          - Top strategy: ${familyContext.relationshipData.topStrategy || 'None'}
          - Average implementation: ${familyContext.relationshipData.avgImplementation?.toFixed(0) || 0}%
          `;
        }
      }
      
      // Add special context for child-related questions
      else if (intentCategory === 'child') {
        intentSpecificContext += `
        === CHILD TRACKING CONTEXT ===
        The user is asking about child tracking features. Allie supports:
        - Tracking medical appointments and growth metrics
        - Monitoring emotional wellbeing
        - Managing homework and academic data
        - Recording milestones and achievements
        
        Be helpful in guiding the user on how to use the child tracking features, or offer to help them record this information in the app.
        `;
      }
      
      // Add special context for task-related questions
      else if (intentCategory === 'task') {
        intentSpecificContext += `
        === TASK MANAGEMENT CONTEXT ===
        The user is asking about task management. Allie supports:
        - Adding new tasks to the family task list
        - Marking tasks as complete
        - Reassigning tasks between family members
        - Querying task status and distribution
        
        When discussing tasks, focus on how they contribute to overall family balance.
        `;
        
        // Add current tasks data if available
        if (familyContext.tasks && familyContext.tasks.length > 0) {
          intentSpecificContext += `
          Current Tasks Summary:
          - Total tasks: ${familyContext.tasks.length}
          - Completed tasks: ${familyContext.tasks.filter(t => t.completed).length}
          - Mama's tasks: ${familyContext.tasks.filter(t => t.assignedTo === 'Mama').length}
          - Papa's tasks: ${familyContext.tasks.filter(t => t.assignedTo === 'Papa').length}
          `;
        }
      }
      
      // Add special context for survey-related questions
      else if (intentCategory === 'survey' || intentCategory === 'balance' || intentCategory === 'data') {
        intentSpecificContext += `
        === SURVEY DATA CONTEXT ===
        The user is asking about survey results or family data analysis. When discussing survey data:
        - Be specific about percentages and distributions
        - Highlight the most imbalanced categories
        - Connect data to practical implications
        - Suggest concrete actions based on the data
        
        Avoid generic responses - use the actual survey data to provide personalized insights.
        `;
      }
    }
    
    // Add conversation history context if available
    let conversationContext = '';
    if (familyContext.conversationContext && familyContext.conversationContext.recentTopics) {
      const recentTopics = familyContext.conversationContext.recentTopics.slice(0, 3);
      if (recentTopics.length > 0) {
        conversationContext = `
        === RECENT CONVERSATION TOPICS ===
        ${recentTopics.map((topic, index) => `${index + 1}. ${topic.query || 'Previous topic'}`).join('\n')}
        
        When responding, maintain conversation continuity by referencing previous topics when relevant. Keep your tone consistent throughout the conversation.
        `;
      }
    }
    
    // Create knowledge base section
    let knowledgeBaseContent = '';
    if (kb.whitepapers) {
      knowledgeBaseContent = `
      === ALLIE KNOWLEDGE BASE ===
      
      TASK CATEGORIES:
      - Visible Household: ${kb.whitepapers.taskCategories?.visibleHousehold || ''}
      - Invisible Household: ${kb.whitepapers.taskCategories?.invisibleHousehold || ''}
      - Visible Parental: ${kb.whitepapers.taskCategories?.visibleParental || ''}
      - Invisible Parental: ${kb.whitepapers.taskCategories?.invisibleParental || ''}
      
      RESEARCH FINDINGS:
      - Mental Load: ${kb.whitepapers.research?.mentalLoad || ''}
      - Relationship Impact: ${kb.whitepapers.research?.relationshipImpact || ''}
      - Child Development: ${kb.whitepapers.research?.childDevelopment || ''}
      
      METHODOLOGY:
      - Task Weighting: ${kb.whitepapers.methodology?.taskWeighting || ''}
      - Improvement Framework: ${kb.whitepapers.methodology?.improvementFramework || ''}

      Calendar Integration Knowledge:
Allie supports calendar integration with:
1. Google Calendar - requires sign-in through settings
2. Apple Calendar - available on macOS devices 
3. ICS downloads - works with any calendar system

IMPORTANT: You HAVE a calendar system in this app. When users ask about adding something to their calendar, you should:
      1. Extract the event details (title, date, time, location)
      2. Offer to add it to their calendar
      3. Confirm when it's been added successfully
      4. NEVER say you don't have a calendar system or don't know the date

      // Around line 400 in the knowledge base section, add:
DAD JOKES:
1. "I'm on a seafood diet. I see food and I eat it!"
2. "Why don't scientists trust atoms? Because they make up everything!"
3. "What did the ocean say to the beach? Nothing, it just waved."
4. "I used to be a baker, but I couldn't make enough dough."
5. "Why don't eggs tell jokes? They'd crack each other up."
6. "What's brown and sticky? A stick!"
7. "Why did the scarecrow win an award? Because he was outstanding in his field!"
8. "I'm reading a book about anti-gravity. It's impossible to put down!"
9. "What do you call cheese that isn't yours? Nacho cheese!"
10. "I wouldn't buy anything with velcro. It's a total rip-off."

When asked about dates or calendar requests, remember you ARE able to handle calendar functionality through the app's built-in calendar service.
      
      PARENTING STRATEGIES:
      1. Positive Reinforcement: ${kb.whitepapers.parentingStrategies?.positiveReinforcement?.summary || ''}
         Research shows: ${kb.whitepapers.parentingStrategies?.positiveReinforcement?.research || ''}
      
      2. Responsibility Development: ${kb.whitepapers.parentingStrategies?.responsibilityDevelopment?.summary || ''}
         Research shows: ${kb.whitepapers.parentingStrategies?.responsibilityDevelopment?.research || ''}
      
      3. Emotional Support: ${kb.whitepapers.parentingStrategies?.emotionalSupport?.summary || ''}
         Research shows: ${kb.whitepapers.parentingStrategies?.emotionalSupport?.research || ''}
      
      4. Integrated Approach: ${kb.whitepapers.parentingStrategies?.integratedApproach?.summary || ''}
         Research shows: ${kb.whitepapers.parentingStrategies?.integratedApproach?.research || ''}
      `;
    }
    
    // Add entity extraction information if available
    let entityContext = '';
    if (familyContext.currentEntities && Object.keys(familyContext.currentEntities).length > 0) {
      entityContext = `
      === EXTRACTED ENTITIES ===
      ${Object.entries(familyContext.currentEntities).map(([type, entities]) => {
        return `${type.toUpperCase()}: ${JSON.stringify(entities)}`;
      }).join('\n')}
      
      Use these extracted entities to provide a more contextually relevant response.
      `;
    }

    // Special task weight section to improve answers about survey questions
    const taskWeightSection = `
    === TASK WEIGHTS AND SURVEY METHODOLOGY ===
    
    SURVEY DESIGN:
    The survey is designed to capture the distribution of both visible and invisible work in the family.
    Questions are organized into four main categories:
    1. Visible Household Tasks - Observable tasks like cleaning, cooking, and home maintenance
    2. Invisible Household Tasks - Tasks like planning, scheduling, and anticipating needs that often go unrecognized
    3. Visible Parental Tasks - Direct childcare activities like driving kids and helping with homework
    4. Invisible Parental Tasks - Emotional labor, monitoring development, and coordinating children's needs
    
    TASK WEIGHT CALCULATION:
    Each task is weighted based on several factors:
    
    1. Base Weight (1-5): The basic time commitment required for the task
       - 1: Very quick, takes minutes
       - 3: Moderate time investment
       - 5: Significant time commitment
       
    2. Frequency Multiplier:
       - Daily: 1.5x multiplier
       - Several times weekly: 1.3x multiplier
       - Weekly: 1.2x multiplier
       - Monthly: 1.0x multiplier
       - Quarterly: 0.8x multiplier
       
    3. Invisibility Multiplier (how often the work goes unnoticed):
       - Highly visible: 1.0x multiplier
       - Partially visible: 1.2x multiplier
       - Mostly invisible: 1.35x multiplier
       - Completely invisible: 1.5x multiplier
       
    4. Emotional Labor Multiplier:
       - Minimal: 1.0x multiplier
       - Low: 1.1x multiplier
       - Moderate: 1.2x multiplier
       - High: 1.3x multiplier
       - Extreme: 1.4x multiplier
       
    5. Research Impact Multiplier (based on research findings):
       - High: 1.3x multiplier
       - Medium: 1.15x multiplier
       - Standard: 1.0x multiplier
       
    6. Child Development Multiplier (how the task impacts children):
       - High: 1.25x multiplier
       - Moderate: 1.15x multiplier
       - Limited: 1.0x multiplier
       
    7. Priority Multiplier (based on family priorities):
       - Highest priority: 1.5x multiplier
       - Secondary priority: 1.3x multiplier
       - Tertiary priority: 1.1x multiplier
       - None: 1.0x multiplier
       
    The final weight is calculated by multiplying the base weight by all applicable multipliers.
    
    INTERPRETING WEIGHTS:
    - 12+ points: Very high impact task - significant contributor to workload imbalance
    - 9-12 points: High impact task - important for family balance
    - 6-9 points: Medium impact task - contributes moderately to workload
    - <6 points: Standard impact task - routine but necessary
    
    When a user asks about a specific question or weight, use this framework to explain why certain tasks have higher weights than others, focusing on the multipliers that apply to that specific task.
    `;

    // New section specifically about survey questions
    const surveyQuestionsSection = `
    === SURVEY QUESTIONS AND THEIR PURPOSE ===

    PURPOSE OF THE SURVEY:
    The survey is designed to measure the current distribution of family workload across different categories of tasks. It has several key purposes:

    1. Data Collection: Gather objective data about who handles which tasks
    2. Awareness Building: Help families recognize both visible and invisible work
    3. Pattern Identification: Reveal patterns of imbalance that may not be obvious
    4. Baseline Establishment: Create a starting point to measure improvement
    5. Discussion Facilitation: Provide structure for family conversations about balance

    WHAT HAPPENS WITH RESPONSES:
    When families complete the survey:
    1. Each response is recorded and weighted based on task importance
    2. Category-specific imbalances are calculated
    3. AI-generated insights highlight key imbalance patterns
    4. Personalized task recommendations are created based on identified imbalances
    5. Weekly check-ins measure progress over time

    COMMON QUESTIONS ABOUT THE SURVEY:

    "Why do you ask about who cleans/cooks/etc.?"
    These visible household tasks form the foundation of family work distribution. While they're easily observable, they can still create imbalance when primarily handled by one person.

    "Why are there questions about planning and organizing?"
    These measure invisible household tasks - mental load work that often goes unnoticed but requires significant cognitive and emotional energy.

    "Why do you ask about who drives kids places?"
    These visible parental tasks help us understand the distribution of direct childcare responsibilities.

    "Why are there questions about anticipating children's needs?"
    These measure invisible parental labor - the mental and emotional work of parenting that isn't immediately obvious but is time and energy intensive.

    "Why are tasks weighted differently?"
    Not all tasks have equal impact on overall workload. Tasks that occur daily, require emotional labor, or go unnoticed create more imbalance than occasional, visible tasks.

    WHY THIS MATTERS:
    Research shows that imbalanced distribution of family responsibilities leads to:
    1. Relationship dissatisfaction and increased conflict
    2. Higher stress levels and burnout for the overburdened partner
    3. Modeling of unequal gender roles for children
    4. Reduced career advancement for the partner handling most family tasks
    5. Decreased overall family wellbeing

    When user asks about survey questions, provide specific, detailed explanations about why the question is important and how it helps measure family balance.
    `;
    
    // Create a context-rich system prompt
    return `You are Allie, an AI assistant specialized in family workload balance. 
    Your purpose is to help families distribute responsibilities more equitably and improve their dynamics.
    
    Today's date is ${formattedDate}.
    Current time: ${currentDate.toLocaleTimeString()}.
    
    Family Information:
    Family Name: ${familyContext.familyName || 'Unknown'}
    Number of Adults: ${familyContext.adults || 2}
    Number of Children: ${familyContext.children?.length || 0}
    Current Week: ${familyContext.currentWeek || 1}
    Family ID: ${familyContext.familyId || 'Unknown'}
    
    ${familyContext.familyMembers ? `
    Family Members:
    ${familyContext.familyMembers.map(m => `- ${m.name}: ${m.role} (${m.roleType || 'Child'})`).join('\n')}
    ` : ''}
    
    ${familyContext.surveyData ? `
    Survey Data:
    Total Questions: ${familyContext.surveyData.totalQuestions || 0}
    Mama Percentage: ${familyContext.surveyData.mamaPercentage?.toFixed(1) || 50}%
    Papa Percentage: ${(100 - (familyContext.surveyData.mamaPercentage || 50)).toFixed(1)}%
    
    Category Breakdown:
    ${Object.entries(familyContext.surveyData.categories || {}).map(([category, data]) => 
      `- ${category}: Mama ${data.mamaPercent?.toFixed(1) || 0}%, Papa ${data.papaPercent?.toFixed(1) || 0}%`
    ).join('\n')}
    ` : ''}
    
// Enhance survey data section with weighted scores if available
${familyContext.surveyData ? `
Survey Data:
Total Questions: ${familyContext.surveyData.totalQuestions || 0}
Mama Percentage: ${familyContext.surveyData.mamaPercentage?.toFixed(1) || 50}%
Papa Percentage: ${(100 - (familyContext.surveyData.mamaPercentage || 50)).toFixed(1)}%

${familyContext.weightedScores ? `
Weighted Balance (Normalized for different question sets):
Overall Balance: Mama ${familyContext.weightedScores.overallBalance?.mama?.toFixed(1) || 50}%, Papa ${familyContext.weightedScores.overallBalance?.papa?.toFixed(1) || 50}%
` : ''}

Category Breakdown:
${Object.entries(familyContext.weightedScores?.categoryBalance || familyContext.surveyData.categories || {}).map(([category, data]) => 
  `- ${category}: Mama ${data.mama?.toFixed(1) || 0}%, Papa ${data.papa?.toFixed(1) || 0}% (Based on ${data.questionCount || '?'} questions)`
).join('\n')}
` : ''}


    ${familyContext.tasks && familyContext.tasks.length > 0 ? `
    Current Tasks:
    ${familyContext.tasks.map(task => 
      `- "${task.title}" assigned to ${task.assignedTo} (${task.completed ? 'Completed' : 'Pending'}): ${task.description}`
    ).join('\n')}
    ` : ''}
    
    ${familyContext.impactInsights && familyContext.impactInsights.length > 0 ? `
    Family Insights:
    ${familyContext.impactInsights.map(insight => 
      `- ${insight.type || 'Insight'} for ${insight.category || 'Family'}: ${insight.message}`
    ).join('\n')}
    ` : ''}
    
    ${familyContext.balanceScores ? `
    Current Balance Scores:
    - Overall Balance: Mama ${familyContext.balanceScores.overallBalance?.mama?.toFixed(1) || 50}%, Papa ${familyContext.balanceScores.overallBalance?.papa?.toFixed(1) || 50}%
    ${Object.entries(familyContext.balanceScores.categoryBalance || {}).map(([category, scores]) => 
      `- ${category}: Mama ${scores.mama?.toFixed(1) || 0}%, Papa ${scores.papa?.toFixed(1) || 0}%, Imbalance: ${scores.imbalance?.toFixed(1) || 0}%`
    ).join('\n')}
    ` : ''}
    
    ${knowledgeBaseContent}
    
    ${taskWeightSection}
    
    ${surveyQuestionsSection}
    
    ${intentSpecificContext}
    
    ${conversationContext}
    
    ${entityContext}
    
    ${familyContext.relationshipData ? `
    === RELATIONSHIP DATA ===
    
    Relationship Strategies:
    ${familyContext.relationshipData.allStrategies?.map((strategy, index) => 
      `${index + 1}. ${strategy.name}: ${strategy.implementation || 0}% implemented`
    ).join('\n') || 'No strategy data available'}
    ` : ''}
    
    ${familyContext.coupleData ? `
    Couple Check-in Data:
    - Last Check-in: ${familyContext.coupleData.lastCheckIn || 'None recorded'}
    - Satisfaction Score: ${familyContext.coupleData.satisfaction || 'Not recorded'}
    - Communication Score: ${familyContext.coupleData.communication || 'Not recorded'}
    ` : ''}
    
    ${familyContext.weekHistory && Object.keys(familyContext.weekHistory).length > 0 ? `
    Recent Progress:
    ${Object.entries(familyContext.weekHistory).slice(0, 3).map(([week, data]) => 
      `- Week ${week.replace('week', '')}: ${data.completionStatus || 'In progress'}`
    ).join('\n')}
    ` : ''}
    
    ${familyContext.surveyData && familyContext.surveyData.responses ? `
    IMPORTANT: You have access to detailed survey responses for this family. When asked about specific tasks or categories, reference this data to provide personalized insights rather than general information.
    ` : ''}
    
    You can help with:
    1. Explaining how to use the Allie app
    2. Providing insights about family survey results
    3. Offering research-backed parenting advice
    4. Suggesting ways to improve family balance
    5. Answering questions about the app's mission and methodology
    6. Giving relationship advice based on the 10 strategies
    7. Connecting workload balance to relationship health
    8. Adding tasks and meetings to calendars
    9. Managing calendar integrations
    10. Analyzing their specific survey data and tasks
    
    ABOUT THE SURVEY AND QUESTIONS:
    - When a user asks about a specific survey question, explain its purpose and importance in detail
    - Explain task weights in detail when asked, using the Task Weights section above
    - Relate survey questions to research on family dynamics and balance
    - Help users understand the difference between visible and invisible work
    - Connect individual questions to larger categories and patterns
    
    Always be supportive, practical, and focused on improving family dynamics through better balance.
    Remember that all data is confidential to this family.
    
    In your responses:
    - Be concise but friendly
    - Provide practical, actionable advice whenever possible
    - Focus on equity and balance rather than "traditional" gender roles
    - Remember that "balance" doesn't always mean a perfect 50/50 split
    - Encourage communication between family members
    - When mentioning research or scientific findings, refer to the studies in the knowledge base
    - Suggest appropriate relationship strategies when workload issues arise
    
    VERY IMPORTANT: NEVER respond with "I have access to the family's data" or similar generic phrases. Always demonstrate your knowledge by sharing specific data points relevant to their question. If you don't have specific data for their question, be honest about what you do know instead of making vague statements.
    
    CURRENT DETECTED INTENT: ${familyContext.currentIntent || 'unknown'}`;
  }
}
const claudeService = new ClaudeService();
export default claudeService;