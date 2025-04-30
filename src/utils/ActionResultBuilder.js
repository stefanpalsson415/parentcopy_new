// src/utils/ActionResultBuilder.js
/**
 * Create a standardized success result
 * @param {string} message - User-friendly success message
 * @param {any} data - Optional data to return
 * @returns {Object} Standardized success result
 */
export function createSuccessResult(message, data = null) {
    return {
      success: true,
      message: message,
      data: data
    };
  }
  
  /**
   * Create a standardized error result
   * @param {string} message - User-friendly error message
   * @param {string} errorDetails - Optional technical error details
   * @returns {Object} Standardized error result
   */
  export function createErrorResult(message, errorDetails = null) {
    return {
      success: false,
      message: message,
      error: errorDetails
    };
  }