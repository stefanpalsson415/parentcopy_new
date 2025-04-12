// src/utils/CalendarErrorHandler.js
class CalendarErrorHandler {
  constructor() {
    this.suppressedErrors = [
      'Token refresh failed',
      'The query requires an index',
      'Could not extract valid JSON from response',
      'Could not extract valid JSON',
      'JSON parsing failed',
      'orderBy is not defined',
      'ApiNotActivatedMapError',
      'Places API error',
      'This API project is not authorized to use',
      'google.maps.places.Autocomplete'
    ];
    this.originalConsoleError = null;
    this.isSuppressing = false;
  }

  // Suppress specific API errors to avoid console noise
  suppressApiErrors() {
    if (this.isSuppressing) return; // Already suppressing
    
    this.originalConsoleError = console.error;
    this.isSuppressing = true;
    
    // Override console.error to filter out specific errors
    console.error = (...args) => {
      // Check if this is an error we want to suppress
      const errorString = typeof args[0] === 'string' ? args.join(' ') : '';
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
    if (this.originalConsoleError && this.isSuppressing) {
      console.error = this.originalConsoleError;
      this.originalConsoleError = null;
      this.isSuppressing = false;
    }
  }

  // Wrap promises to handle calendar API errors gracefully
  static handlePromise(promise, fallbackValue) {
    return promise.catch(error => {
      // Log error but don't let it break the app
      console.debug('Calendar operation failed, using fallback:', error);
      return fallbackValue;
    });
  }
}

export default new CalendarErrorHandler();