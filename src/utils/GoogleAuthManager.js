// Add this file to improve Google auth handling:
// src/utils/GoogleAuthManager.js
class GoogleAuthManager {
    constructor() {
      this.authInProgress = false;
      this.lastAuthAttempt = 0;
      this.authToken = null;
      this.googleUser = null;
      
      // Try to load token from localStorage
      this.loadTokenFromStorage();
    }
    
    loadTokenFromStorage() {
      try {
        const tokenData = localStorage.getItem('googleAuthToken');
        if (tokenData) {
          const token = JSON.parse(tokenData);
          
          // Check if token is still valid
          if (token.expires_at && token.expires_at > Date.now() / 1000) {
            this.authToken = token;
            return true;
          } else {
            // Clear expired token
            localStorage.removeItem('googleAuthToken');
          }
        }
      } catch (e) {
        console.error("Error loading Google auth token from storage:", e);
      }
      return false;
    }
    
    saveTokenToStorage(token, user) {
      try {
        if (!token) return false;
        
        const tokenData = {
          ...token,
          user_id: user?.uid || user?.id,
          email: user?.email,
          name: user?.displayName,
          stored_at: Date.now()
        };
        
        localStorage.setItem('googleAuthToken', JSON.stringify(tokenData));
        return true;
      } catch (e) {
        console.error("Error saving Google auth token to storage:", e);
        return false;
      }
    }
    
    clearStoredToken() {
      try {
        localStorage.removeItem('googleAuthToken');
        this.authToken = null;
        this.googleUser = null;
      } catch (e) {
        console.error("Error clearing Google auth token:", e);
      }
    }
    
    async getToken() {
      // If we have a valid token, return it
      if (this.authToken && this.authToken.expires_at > Date.now() / 1000) {
        return this.authToken;
      }
      
      // Otherwise try to load from storage
      if (this.loadTokenFromStorage()) {
        return this.authToken;
      }
      
      // If no valid token, return null - caller must authenticate
      return null;
    }
    
    /**
     * Creates a user-specific token key for the given user/member ID
     */
    getUserTokenKey(userId) {
      return `googleToken_${userId}`;
    }
    
    /**
     * Save a token specifically for a user ID (used for linking members)
     */
    saveUserToken(userId, token) {
      try {
        if (!userId || !token) return false;
        
        const tokenKey = this.getUserTokenKey(userId);
        localStorage.setItem(tokenKey, JSON.stringify({
          ...token,
          timestamp: Date.now()
        }));
        
        return true;
      } catch (e) {
        console.error(`Error saving token for user ${userId}:`, e);
        return false;
      }
    }
    
    /**
     * Get a token for a specific user
     */
    getUserToken(userId) {
      try {
        if (!userId) return null;
        
        const tokenKey = this.getUserTokenKey(userId);
        const tokenData = localStorage.getItem(tokenKey);
        
        if (tokenData) {
          return JSON.parse(tokenData);
        }
      } catch (e) {
        console.error(`Error getting token for user ${userId}:`, e);
      }
      
      return null;
    }
    
    /**
     * Clear a specific user's token
     */
    clearUserToken(userId) {
      try {
        if (!userId) return false;
        
        const tokenKey = this.getUserTokenKey(userId);
        localStorage.removeItem(tokenKey);
        return true;
      } catch (e) {
        console.error(`Error clearing token for user ${userId}:`, e);
        return false;
      }
    }
  }
  
  export default new GoogleAuthManager();