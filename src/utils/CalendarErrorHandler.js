// src/utils/CalendarErrorHandler.js
/**
 * Utility to handle Google Calendar initialization errors gracefully
 */
const CalendarErrorHandler = {
    /**
     * Safely initialize Google Calendar API with error handling
     * @param {Function} initFunction - The initialization function to call
     * @param {Number} timeout - Timeout in milliseconds
     * @returns {Promise} - Resolves to true if successful, false if failed
     */
    safeInitialize: async (initFunction, timeout = 5000) => {
      try {
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
      } catch (error) {
        // Log error but don't crash the application
        console.warn("Google Calendar initialization failed:", error.message);
        return false;
      }
    },
    
    /**
     * Suppress Google API errors in the console
     */
    suppressApiErrors: () => {
      // Store original console.error
      const originalConsoleError = console.error;
      
      // Replace with filtered version
      console.error = function(...args) {
        // Filter out Google API errors
        if (args[0] && typeof args[0] === 'string' && 
            (args[0].includes('idpiframe_initialization_failed') || 
             args[0].includes('Failed to load resource: net::ERR_BLOCKED_BY_CLIENT'))) {
          // Replace with warning
          console.warn('Google API initialization issue (suppressed)');
          return;
        }
        
        // Pass through other errors
        originalConsoleError.apply(console, args);
      };
    }
  };
  
  export default CalendarErrorHandler;