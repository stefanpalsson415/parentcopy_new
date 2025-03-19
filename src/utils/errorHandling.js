// src/utils/errorHandling.js

/**
 * Central error handling utility for Allie
 */

// Log error to console and optionally to a monitoring service
export const logError = (error, context = {}) => {
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
    } else if (error.message) {
      message = error.message;
    }
    
    return message;
  };
  
  // Display error to user
  export const displayError = (error, context = {}) => {
    // Log the error
    logError(error, context);
    
    // Get user-friendly message
    const message = getUserFriendlyErrorMessage(error);
    
    // Display to user - using alert for simplicity, but could be replaced with a toast or modal
    alert(message);
    
    return message;
  };
  
  // Helper to safely handle async operations
  export const safeAsync = async (asyncFn, errorContext = {}) => {
    try {
      return await asyncFn();
    } catch (error) {
      displayError(error, errorContext);
      throw error; // Re-throw for caller to handle if needed
    }
  };
  
  export default {
    logError,
    getUserFriendlyErrorMessage,
    displayError,
    safeAsync
  };