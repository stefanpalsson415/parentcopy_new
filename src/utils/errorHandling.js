// src/utils/errorHandling.js

/**
 * Central error handling utility for Allie
 * Enhanced with Claude API and Calendar service specific handling
 */

// Log error to console and optionally to a monitoring service
export const logError = (error, context = {}) => {
  // Skip certain non-critical errors in production
  if (process.env.NODE_ENV === 'production') {
    // Skip Google API initialization errors that flood the console
    if (error.message && (
      error.message.includes('idpiframe_initialization_failed') ||
      error.message.includes('Failed to load resource: net::ERR_BLOCKED_BY_CLIENT') ||
      error.message.includes('Google API not available')
    )) {
      console.warn(`Suppressed non-critical error: ${error.message}`);
      return error;
    }
  }
  
  console.error(`Error in ${context.location || 'application'}:`, error, context);
  
  // Here you could add additional logging to a service like Sentry or Bugsnag
  // if (window.Sentry) {
  //   window.Sentry.captureException(error, { extra: context });
  // }
  
  return error;
};

// Get a user-friendly error message
export const getUserFriendlyErrorMessage = (error) => {
  // Default error message
  let message = "Something went wrong. Please try again.";
  
  // Handle specific error types
  if (error.code) {
    // Firebase errors
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        message = "Invalid email or password. Please try again.";
        break;
      case 'auth/email-already-in-use':
        message = "This email is already in use. Please try another email.";
        break;
      case 'auth/weak-password':
        message = "Password is too weak. Please choose a stronger password.";
        break;
      case 'auth/network-request-failed':
        message = "Network error. Please check your internet connection.";
        break;
      case 'auth/too-many-requests':
        message = "Too many attempts. Please try again later.";
        break;
      case 'storage/unauthorized':
        message = "You don't have permission to upload files.";
        break;
      case 'storage/canceled':
        message = "Upload was canceled.";
        break;
      case 'storage/unknown':
        message = "An unknown error occurred during upload.";
        break;
      default:
        if (error.message) {
          message = error.message;
        }
    }
  } else if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
    // Handle JSON parsing errors specially
    message = "There was a problem processing the data. Please try again.";
  } else if (error.message && error.message.includes('Claude API')) {
    // Handle Claude API errors specially
    message = "AI processing is temporarily unavailable. Please try again later.";
  } else if (error.message && (
    error.message.includes('Calendar') || 
    error.message.includes('gapi') ||
    error.message.includes('Google')
  )) {
    // Handle Google Calendar errors specially
    message = "Calendar service is temporarily unavailable. Please try again later.";
  } else if (error.message) {
    message = error.message;
  }
  
  return message;
};

// Display error to user
export const displayError = (error, context = {}) => {
  // Don't display certain errors to users
  if (context.suppressUI || 
      (error.message && (
        error.message.includes('idpiframe_initialization_failed') ||
        error.message.includes('Failed to load resource') ||
        error.message.includes('Google API not available') ||
        error.message.includes('SyntaxError: Unexpected token')
      ))
  ) {
    // Just log these errors, don't show to user
    logError(error, {...context, suppressed: true});
    return null;
  }
  
  // Log the error
  logError(error, context);
  
  // Get user-friendly message
  const message = getUserFriendlyErrorMessage(error);
  
  // Display to user - using alert for simplicity, but could be replaced with a toast or modal
  // Use a more modern approach if available in the app
  if (typeof window !== 'undefined' && window.showToast) {
    window.showToast(message, 'error');
  } else if (typeof window !== 'undefined' && window.showNotification) {
    window.showNotification(message, 'error');
  } else {
    // Only show alerts in development to avoid annoying users
    if (process.env.NODE_ENV === 'development') {
      alert(message);
    } else {
      console.warn('UI error suppressed in production:', message);
    }
  }
  
  return message;
};

// Helper to safely handle async operations
export const safeAsync = async (asyncFn, errorContext = {}) => {
  try {
    return await asyncFn();
  } catch (error) {
    // Check if this is an error we should display
    if (!errorContext.suppressUI) {
      displayError(error, errorContext);
    } else {
      // Just log
      logError(error, errorContext);
    }
    
    // Throw by default, but allow suppressing throw in certain cases
    if (!errorContext.suppressThrow) {
      throw error; // Re-throw for caller to handle if needed
    }
    
    // Return a default value or null
    return errorContext.defaultValue || null;
  }
};

// Helper to safely parse JSON with fallback
export const safelyParseJSON = (jsonString, defaultValue = null) => {
  if (!jsonString || typeof jsonString !== 'string') {
    return defaultValue;
  }
  
  try {
    // First try simple parsing
    return JSON.parse(jsonString);
  } catch (initialError) {
    try {
      // Try to find and extract a valid JSON object using regex
      // This handles cases where Claude adds explanatory text before/after the JSON
      const jsonMatch = jsonString.match(/(\{[\s\S]*\})/);
      if (jsonMatch && jsonMatch[0]) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e) {
          // Continue to next method
        }
      }
      
      // If that fails, try to find JSON arrays
      const jsonArrayMatch = jsonString.match(/(\[[\s\S]*\])/);
      if (jsonArrayMatch && jsonArrayMatch[0]) {
        try {
          return JSON.parse(jsonArrayMatch[0]);
        } catch (e) {
          // Continue to next method
        }
      }
      
      // Last resort - strip invalid escapes and try again
      const cleanedString = jsonString
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
      
      try {
        return JSON.parse(cleanedString);
      } catch (e) {
        // All methods failed, return default
        console.warn("All JSON parsing attempts failed for:", 
          jsonString.length > 100 ? jsonString.substring(0, 100) + '...' : jsonString);
        return defaultValue;
      }
    } catch (recoveryError) {
      console.warn("JSON recovery failed:", recoveryError.message);
      return defaultValue;
    }
  }
};

// Create a wrapper to safely call AI Engine methods with proper error handling
export const safeAIRequest = async (requestFn, fallbackFn, context = {}) => {
  try {
    // Set a timeout for AI requests to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("AI request timed out")), 15000)
    );
    
    // Race the request against the timeout
    const response = await Promise.race([
      requestFn(),
      timeoutPromise
    ]);
    
    // If response is a string (likely from Claude API), attempt to parse it
    if (typeof response === 'string') {
      return safelyParseJSON(response, fallbackFn ? fallbackFn() : null);
    }
    
    return response;
  } catch (error) {
    // Log the error
    logError(error, { 
      ...context, 
      type: 'ai_request_error' 
    });
    
    // Return fallback if provided
    return fallbackFn ? fallbackFn() : null;
  }
};

// Create a wrapper to safely call calendar methods
export const safeCalendarRequest = async (requestFn, fallbackFn, context = {}) => {
  try {
    // Set a shorter timeout for calendar requests
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Calendar request timed out")), 10000)
    );
    
    // Race the request against the timeout
    const response = await Promise.race([
      requestFn(),
      timeoutPromise
    ]);
    
    return response;
  } catch (error) {
    // Log the error but don't show to user by default
    logError(error, { 
      ...context, 
      type: 'calendar_request_error',
      suppressUI: true 
    });
    
    // Return fallback if provided
    return fallbackFn ? fallbackFn() : null;
  }
};

export default {
  logError,
  getUserFriendlyErrorMessage,
  displayError,
  safeAsync,
  safelyParseJSON,
  safeAIRequest,
  safeCalendarRequest
};