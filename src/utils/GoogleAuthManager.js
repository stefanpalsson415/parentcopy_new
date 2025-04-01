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
          const token = JSON.parse(tokenData);
          // Check if token has expired
          if (token.expires_at && token.expires_at < Date.now() / 1000) {
            console.log(`Token for user ${userId} has expired`);
            this.clearUserToken(userId);
            return null;
          }
          return token;
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

    /**
     * Check if a user has a valid Google auth token
     */
    isUserAuthenticated(userId) {
      if (!userId) return false;
      const token = this.getUserToken(userId);
      return !!token;
    }

    /**
     * Handles Google auth for a specific family member
     */
    async authenticateUser(userId, gapiInstance) {
      if (!userId) {
        throw new Error("User ID is required for authentication");
      }

      if (this.authInProgress) {
        throw new Error("Authentication already in progress");
      }

      this.authInProgress = true;
      this.lastAuthAttempt = Date.now();

      try {
        // Check if already authenticated
        const existingToken = this.getUserToken(userId);
        if (existingToken) {
          return existingToken;
        }

        // Ensure gapi is available
        if (!window.gapi || !window.gapi.auth2) {
          throw new Error("Google API not initialized. Please try again.");
        }

        // Use the provided instance or get one
        const authInstance = gapiInstance || window.gapi.auth2.getAuthInstance();
        if (!authInstance) {
          throw new Error("Google Auth is not initialized properly");
        }

        // Perform the sign-in with account selection
        const googleUser = await authInstance.signIn({
          prompt: 'select_account'
        });

        // Get user data
        const profile = googleUser.getBasicProfile();
        const authResponse = googleUser.getAuthResponse();

        // Create token with all needed data
        const token = {
          uid: googleUser.getId(),
          email: profile.getEmail(),
          name: profile.getName(),
          photoURL: profile.getImageUrl(),
          accessToken: authResponse.access_token,
          idToken: authResponse.id_token,
          expires_at: authResponse.expires_at,
          timestamp: Date.now()
        };

        // Save token specifically for this user
        this.saveUserToken(userId, token);

        return token;
      } catch (error) {
        console.error("Google authentication error:", error);
        throw error;
      } finally {
        this.authInProgress = false;
      }
    }

    /**
     * Sign out a specific user
     */
    async signOutUser(userId) {
      // Clear the user's token
      this.clearUserToken(userId);

      try {
        // Also sign out from Google if possible
        if (window.gapi && window.gapi.auth2) {
          const authInstance = window.gapi.auth2.getAuthInstance();
          if (authInstance && authInstance.isSignedIn.get()) {
            await authInstance.signOut();
          }
        }
        return true;
      } catch (e) {
        console.error("Error signing out from Google:", e);
        return false;
      }
    }

    /**
     * Execute a Google API request with authentication for a specific user
     */
    async executeWithAuth(userId, apiFunction) {
      if (!userId) {
        throw new Error("User ID is required for authenticated API requests");
      }

      try {
        // Get or refresh authentication
        const token = await this.authenticateUser(userId);
        if (!token) {
          throw new Error("Failed to authenticate with Google");
        }

        // Execute the API function
        return await apiFunction(token);
      } catch (error) {
        console.error(`Error executing authenticated request for user ${userId}:`, error);
        throw error;
      }
    }
  }
  
  export default new GoogleAuthManager();