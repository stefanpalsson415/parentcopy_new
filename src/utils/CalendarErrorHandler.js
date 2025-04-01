// src/utils/CalendarErrorHandler.js
class CalendarErrorHandler {
  constructor() {
    this.suppressedErrors = [
      'idpiframe_initialization_failed',
      'Failed to execute \'postMessage\'',
      'gapi.auth2',
      'Token refresh failed',
      'Could not extract valid JSON from response',
      'Could not extract valid JSON',
      'JSON parsing failed'
    ];
    this.originalConsoleError = null;
  }

  // Suppress specific Google API errors to avoid console noise
  suppressApiErrors() {
    if (this.originalConsoleError) return; // Already suppressing
    
    this.originalConsoleError = console.error;
    
    // Override console.error to filter out specific Google-related errors
    console.error = (...args) => {
      // Check if this is a Google API error we want to suppress
      const errorString = args.join(' ');
      const shouldSuppress = this.suppressedErrors.some(errText => 
        errorString.includes(errText)
      );
      
      // If it's not a suppressed error, pass through to original console.error
      if (!shouldSuppress) {
        this.originalConsoleError.apply(console, args);
      } else {
        // For suppressed errors, log quietly to console.debug instead
        console.debug('Suppressed error:', ...args);
      }
    };
  }

  // Restore original console.error behavior
  restoreConsoleError() {
    if (this.originalConsoleError) {
      console.error = this.originalConsoleError;
      this.originalConsoleError = null;
    }
  }

  // Wrap promises to handle calendar API errors gracefully
  static handlePromise(promise, fallbackValue) {
    return promise.catch(error => {
      // Log error but don't let it break the app
      console.debug('Operation failed, using fallback:', error);
      return fallbackValue;
    });
  }
}

export default new CalendarErrorHandler();