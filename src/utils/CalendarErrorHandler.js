// src/utils/CalendarErrorHandler.js
import { safeAsync, logError } from './errorHandling';

/**
 * Utility to handle Google Calendar initialization errors gracefully
 * and suppress unnecessary error messages in the console
 */
const CalendarErrorHandler = {
  /**
   * Safely initialize Google Calendar API with error handling
   * @param {Function} initFunction - The initialization function to call
   * @param {Number} timeout - Timeout in milliseconds
   * @returns {Promise} - Resolves to true if successful, false if failed
   */
  safeInitialize: async (initFunction, timeout = 5000) => {
    return safeAsync(
      async () => {
        // Create a promise that rejects after timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Calendar initialization timed out")), timeout);
        });
        
        // Race the initialization against the timeout
        const result = await Promise.race([
          initFunction(),
          timeoutPromise
        ]);
        
        return result;
      },
      {
        location: "CalendarErrorHandler.safeInitialize",
        suppressUI: true,
        suppressThrow: true,
        defaultValue: false
      }
    );
  },
  
  /**
   * Suppress Google API errors in the console
   */
  suppressApiErrors: () => {
    // Store original console.error
    const originalConsoleError = console.error;
    
    // Replace with filtered version
    console.error = function(...args) {
      // Filter out common Google API errors
      if (args[0] && typeof args[0] === 'string' && (
        args[0].includes('idpiframe_initialization_failed') || 
        args[0].includes('Failed to load resource: net::ERR_BLOCKED_BY_CLIENT') ||
        args[0].includes('Google API not available') ||
        args[0].includes('gapi.auth2') ||
        args[0].includes('gapi is not defined') ||
        args[0].includes('SyntaxError: Unexpected token') ||
        args[0].includes('CalendarService')
      )) {
        // Replace with warning for development only
        if (process.env.NODE_ENV === 'development') {
          console.warn('Google API issue (suppressed):', args[0].substring(0, 100));
        }
        return;
      }
      
      // Pass through other errors
      originalConsoleError.apply(console, args);
    };
  },

  /**
   * Wrap Google Calendar operations with proper error handling
   * @param {Function} operation - Calendar operation to perform
   * @param {Object} context - Error context information
   * @param {Any} defaultValue - Default value to return on error
   * @returns {Promise} - Result of operation or default value
   */
  wrapCalendarOperation: async (operation, context = {}, defaultValue = null) => {
    return safeAsync(
      operation,
      {
        location: context.location || "CalendarOperation",
        suppressUI: true, // Don't show calendar errors to users by default
        suppressThrow: true, // Don't throw errors from calendar operations
        defaultValue
      }
    );
  },

  /**
   * Handle errors from Google Calendar API specifically
   * @param {Error} error - The error object
   * @param {Object} context - Context information
   * @returns {Object} - User-friendly error information
   */
  handleGoogleCalendarError: (error, context = {}) => {
    // Extract useful information from Google API errors
    let errorInfo = {
      message: "Calendar operation failed",
      code: null,
      googleError: false,
      recoverable: true
    };
    
    if (error.result && error.result.error) {
      // Handle structured Google API errors
      const googleError = error.result.error;
      errorInfo.code = googleError.code;
      errorInfo.message = googleError.message || "Google Calendar error";
      errorInfo.googleError = true;
      
      // Determine if error is recoverable
      if (googleError.code === 401 || googleError.code === 403) {
        errorInfo.recoverable = false;
        errorInfo.message = "Calendar authorization required. Please reconnect your Google account.";
      }
    } else if (error.message) {
      errorInfo.message = error.message;
      
      // Check for auth errors
      if (error.message.includes("Authentication") || 
          error.message.includes("auth") || 
          error.message.includes("sign in")) {
        errorInfo.recoverable = false;
        errorInfo.message = "Calendar authorization expired. Please sign in again.";
      }
    }
    
    // Log the error with additional context
    logError(error, {
      ...context,
      calendarErrorInfo: errorInfo,
      suppressUI: true
    });
    
    return errorInfo;
  },

  /**
   * Create a recovery function for calendar errors
   * @param {Function} retryFn - Function to retry the operation
   * @param {Function} reconnectFn - Function to reconnect to Google
   * @returns {Function} - Recovery function
   */
  createRecoveryFunction: (retryFn, reconnectFn) => {
    return async (errorInfo) => {
      if (!errorInfo.recoverable) {
        // Need to reconnect
        await reconnectFn();
        // Then retry
        return retryFn();
      } else {
        // Just retry
        return retryFn();
      }
    };
  }
};
  
export default CalendarErrorHandler;