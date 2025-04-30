// src/services/AIOrchestrator.js
import ClaudeService from './ClaudeService';
import IntentActionService from './IntentActionService';
import EnhancedChatService from './EnhancedChatService';
import { auth } from './firebase'; // Add this import statement


/**
 * AI System Orchestrator
 * Handles initialization and coordination of all AI-powered services
 */
class AIOrchestrator {
  constructor() {
    this.initialized = false;
  }
  
  /**
 * Initialize all AI services with proper dependencies
 */
async initialize() {
    if (this.initialized) return { success: true };
    
    console.log("Initializing AI Orchestrator and services");
    
    try {
      // First ensure ClaudeService is initialized
      if (!ClaudeService.initialized) {
        await ClaudeService.testConnectionWithRetry();
      }
      
      // Connect services together
      IntentActionService.claudeService = ClaudeService;
      
      // Extract auth context from current user if available
      const currentUser = auth.currentUser;
      if (currentUser) {
        this.setAuthContext({
          userId: currentUser.uid,
          timestamp: Date.now()
        });
        console.log("Authentication context initialized from current user");
      }
      
      // Track initialization time
      this.initTime = new Date();
      this.initialized = true;
      
      console.log("AI Orchestrator initialized successfully");
      
      // Run diagnostics
      const diagnostics = await IntentActionService.runDiagnosticTests();
      
      // Log results
      const implementedActions = Object.entries(diagnostics)
        .filter(([_, info]) => info.implemented)
        .map(([name]) => name);
      
      const unimplementedActions = Object.entries(diagnostics)
        .filter(([_, info]) => !info.implemented)
        .map(([name]) => name);
      
      console.log(`AI Action handlers ready: ${implementedActions.length} implemented, ${unimplementedActions.length} pending`);
      console.log("Implemented:", implementedActions.join(", "));
      if (unimplementedActions.length > 0) {
        console.log("Not yet implemented:", unimplementedActions.join(", "));
      }
      
      return {
        success: true,
        implementedActions,
        unimplementedActions
      };
    } catch (error) {
      console.error("Error initializing AI Orchestrator:", error);
      
      this.initialized = false;
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
 * Ensure authentication context is properly set for all services
 * @param {Object} context - User context with authentication data
 */
setAuthContext(context) {
    if (!context || !context.userId) return;
    
    this.authContext = {
      userId: context.userId,
      familyId: context.familyId,
      timestamp: Date.now()
    };
    
    // Update services that need auth context
    if (ClaudeService) {
      ClaudeService.authContext = this.authContext;
    }
    
    console.log("Auth context set successfully:", this.authContext);
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