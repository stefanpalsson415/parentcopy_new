// src/services/AIOrchestrator.js
import ClaudeService from './ClaudeService';
import IntentActionService from './IntentActionService';
import EnhancedChatService from './EnhancedChatService';
import { auth, db } from './firebase';
import { collection, addDoc, getDoc, getDocs, query, where, orderBy, limit, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';


/**
 * AI System Orchestrator
 * Handles initialization and coordination of all AI-powered services
 */
class AIOrchestrator {
  constructor() {
    this.initialized = false;
    this.authContext = null;
  }
  
  /**
   * Set authentication context for the AI system
   * @param {object} authContext - Authentication context
   */
  setAuthContext(authContext) {
    this.authContext = authContext;
    console.log("Auth context set in AIOrchestrator:", authContext);
    
    // Share with other services
    if (ClaudeService && typeof ClaudeService.setAuthContext === 'function') {
      ClaudeService.setAuthContext(authContext);
    }
    
    if (IntentActionService && typeof IntentActionService.setAuthContext === 'function') {
      IntentActionService.setAuthContext(authContext);
    }
    
    if (EnhancedChatService && typeof EnhancedChatService.setAuthContext === 'function') {
      EnhancedChatService.setAuthContext(authContext);
    }
  }
  
  /**
 * Initialize all AI services with proper dependencies
 */
  async initialize() {
    if (this.initialized) return { success: true };
    
    console.log("🚀 Initializing AI Orchestrator and services");
    
    try {
      // First ensure ClaudeService is initialized
      if (!ClaudeService.initialized) {
        await ClaudeService.testConnectionWithRetry();
      }
      
      // Connect services together with explicit context sharing
      IntentActionService.claudeService = ClaudeService;
      
      // IMPROVED: Extract auth context from current user if available
      const currentUser = auth.currentUser;
      if (currentUser) {
        console.log("🔍 Current user found:", currentUser.uid);
        
        // Try to get familyId from localStorage for complete context
        let familyId = null;
        if (typeof window !== 'undefined') {
          familyId = localStorage.getItem('selectedFamilyId') || localStorage.getItem('currentFamilyId');
          if (familyId) {
            console.log("🔍 Found familyId in localStorage:", familyId);
          }
        }
        
        // Set auth context with improved tracking
        this.setAuthContext({
          userId: currentUser.uid,
          familyId: familyId,
          timestamp: Date.now()
        });
        
        console.log("✅ Authentication context initialized from current user and localStorage");
      } else {
        console.log("⚠️ No current user found during initialization");
        
        // Try to recover from localStorage if available
        if (typeof window !== 'undefined') {
          const storedUserId = localStorage.getItem('userId');
          const storedFamilyId = localStorage.getItem('selectedFamilyId') || localStorage.getItem('currentFamilyId');
          
          if (storedUserId || storedFamilyId) {
            console.log("🔍 Found partial auth data in localStorage");
            this.setAuthContext({
              userId: storedUserId,
              familyId: storedFamilyId,
              timestamp: Date.now(),
              isRecovered: true
            });
          }
        }
      }
      
      // Track initialization time
      this.initTime = new Date();
      this.initialized = true;
      
      console.log("✅ AI Orchestrator initialized successfully");
      
      // Run diagnostics
      const diagnostics = await IntentActionService.runDiagnosticTests();
      
      // Log results
      const implementedActions = Object.entries(diagnostics)
        .filter(([_, info]) => info.implemented)
        .map(([name]) => name);
      
      const unimplementedActions = Object.entries(diagnostics)
        .filter(([_, info]) => !info.implemented)
        .map(([name]) => name);
      
      console.log(`✅ AI Action handlers ready: ${implementedActions.length} implemented, ${unimplementedActions.length} pending`);
      console.log("✅ Implemented:", implementedActions.join(", "));
      if (unimplementedActions.length > 0) {
        console.log("⚠️ Not yet implemented:", unimplementedActions.join(", "));
      }
      
      return {
        success: true,
        implementedActions,
        unimplementedActions
      };
    } catch (error) {
      console.error("❌ Error initializing AI Orchestrator:", error);
      
      this.initialized = false;
      
      return {
        success: false,
        error: error.message
      };
    }
  }

/**
 * Update auth context with family ID for all services
 * @param {string} familyId - Family ID to set
 */
updateFamilyContext(familyId) {
    if (!familyId) return;
    
    console.log("🔄 Updating family context for all services:", familyId);
    
    // Get current auth user to ensure we have userId
    const currentUserId = auth.currentUser?.uid || this.authContext?.userId;
    
    // Update internal auth context
    if (this.authContext) {
      this.authContext.familyId = familyId;
      this.authContext.timestamp = Date.now();
      // Ensure userId is preserved
      if (!this.authContext.userId && currentUserId) {
        this.authContext.userId = currentUserId;
      }
      console.log("✅ Updated internal auth context with familyId:", {
        userId: this.authContext.userId?.substring(0, 8) + '...',
        familyId: this.authContext.familyId
      });
    } else {
      this.authContext = {
        userId: currentUserId,
        familyId: familyId,
        timestamp: Date.now()
      };
      console.log("✅ Created new auth context with familyId");
    }
    
    // Update ClaudeService auth context
    if (ClaudeService) {
      ClaudeService.authContext = {
        ...ClaudeService.authContext,
        familyId: familyId,
        userId: currentUserId || ClaudeService.authContext?.userId,
        timestamp: Date.now()
      };
      console.log("✅ Updated ClaudeService auth context");
    }
    
    // Update IntentActionService auth context
    if (IntentActionService) {
      IntentActionService.authContext = {
        ...IntentActionService.authContext,
        familyId: familyId,
        userId: currentUserId || IntentActionService.authContext?.userId,
        timestamp: Date.now()
      };
      console.log("✅ Updated IntentActionService auth context");
    }
    
    // Store in localStorage for recovery
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentFamilyId', familyId);
        localStorage.setItem('selectedFamilyId', familyId); // Add both keys for compatibility
        if (currentUserId) {
          localStorage.setItem('userId', currentUserId);
        }
        console.log("✅ Stored family and user IDs in localStorage for recovery");
      }
    } catch (e) {
      console.warn("❌ Could not store familyId in localStorage:", e);
    }
    
    // Test Firebase write to verify permissions
    if (ClaudeService && typeof ClaudeService.testFirebaseWrite === 'function') {
      console.log("🧪 Testing Firebase write after context update");
      setTimeout(() => {
        ClaudeService.testFirebaseWrite()
          .then(success => {
            console.log("Firebase write test result:", success ? "✅ Success" : "❌ Failed");
          })
          .catch(error => {
            console.error("Error during Firebase write test:", error);
          });
      }, 500);
    }
    
    return this.authContext;
  }


  /**
 * Ensure authentication context is properly set for all services
 * @param {Object} context - User context with authentication data
 */
  setAuthContext(context) {
    if (!context) return;
    
    // More tolerant of partial context
    this.authContext = {
      userId: context.userId || this.authContext?.userId || null,
      familyId: context.familyId || this.authContext?.familyId || null,
      timestamp: Date.now(),
      isRecovered: context.isRecovered || false
    };
    
    // Log context update
    console.log("🔐 Auth context set:", {
      userId: this.authContext.userId ? this.authContext.userId.substring(0, 8) + '...' : null,
      familyId: this.authContext.familyId,
      isRecovered: this.authContext.isRecovered
    });
    
    // Update all services that need auth context
    if (ClaudeService) {
      ClaudeService.authContext = this.authContext;
      console.log("📋 Updated ClaudeService auth context");
    }
    
    if (IntentActionService) {
      IntentActionService.authContext = this.authContext;
      console.log("📋 Updated IntentActionService auth context");
    }
    
    // Store in localStorage for recovery
    try {
      if (typeof window !== 'undefined' && this.authContext.userId) {
        localStorage.setItem('userId', this.authContext.userId);
        if (this.authContext.familyId) {
          localStorage.setItem('currentFamilyId', this.authContext.familyId);
        }
        console.log("💾 Persisted auth context to localStorage");
      }
    } catch (e) {
      console.warn("⚠️ Could not persist auth context:", e);
    }
    
    return this.authContext;
  }
  
/**
 * Force authentication context to be available (for debugging)
 * @param {string} userId - User ID to force
 * @param {string} familyId - Family ID to force
 */
forceAuthContext(userId, familyId) {
    this.authContext = {
      userId: userId || 'debug-user-id',
      familyId: familyId || 'debug-family-id',
      timestamp: Date.now(),
      isForced: true
    };
    
    // Update all services
    if (ClaudeService) {
      ClaudeService.authContext = this.authContext;
    }
    
    console.log("AUTH CONTEXT FORCED for debugging:", this.authContext);
    return this.authContext;
  }



  /**
   * Get system status for all AI services
   * @returns {Object} Status information for services
   */
  getSystemStatus() {
    return {
      initialized: this.initialized,
      initTime: this.initTime,
      claudeService: {
        ready: !!ClaudeService.model,
        model: ClaudeService.model,
        calendarDetection: !ClaudeService.disableCalendarDetection
      },
      intentActionService: {
        stats: IntentActionService.getStatistics()
      }
    };
  }
  
  /**
   * Reset all services to initial state
   */
  async reset() {
    if (!this.initialized) return;
    
    // Reset services
    IntentActionService.resetStats();
    
    // Re-initialize
    this.initialized = false;
    await this.initialize();
  }
}

export default new AIOrchestrator();