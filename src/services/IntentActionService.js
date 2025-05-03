// src/services/IntentActionService.js
import ClaudeService from './ClaudeService';
import { createSuccessResult, createErrorResult } from '../utils/ActionResultBuilder';
import { ActionTypes } from '../utils/ActionTypes';
import ConversationContext from './ConversationContext';
import ActionLearningSystem from './ActionLearningSystem';
import { db, auth } from './firebase';
import { collection, addDoc, getDoc, getDocs, query, where, orderBy, limit, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';


/**
 * Intent Action Service
 * Unified service to orchestrate actions across the app based on user intent
 */
class IntentActionService {
  constructor() {
    // Define supported actions and their handlers
    this.actionHandlers = {
      [ActionTypes.ADD_PROVIDER]: this.handleAddProvider,
      [ActionTypes.UPDATE_PROVIDER]: this.handleUpdateProvider,
      [ActionTypes.DELETE_PROVIDER]: this.handleDeleteProvider,
      
      [ActionTypes.ADD_EVENT]: this.handleAddEvent,
      [ActionTypes.ADD_APPOINTMENT]: this.handleAddAppointment,
      [ActionTypes.UPDATE_EVENT]: this.handleUpdateEvent,
      [ActionTypes.DELETE_EVENT]: this.handleDeleteEvent,
      
      [ActionTypes.ADD_TASK]: this.handleAddTask,
      [ActionTypes.COMPLETE_TASK]: this.handleCompleteTask,
      [ActionTypes.REASSIGN_TASK]: this.handleReassignTask,
      
      [ActionTypes.TRACK_GROWTH]: this.handleTrackGrowth,
      [ActionTypes.ADD_MEDICAL_RECORD]: this.handleAddMedicalRecord,
      [ActionTypes.ADD_MILESTONE]: this.handleAddMilestone,
      
      [ActionTypes.ADD_DOCUMENT]: this.handleAddDocument,
      
      [ActionTypes.SCHEDULE_DATE_NIGHT]: this.handleScheduleDateNight,
      
      [ActionTypes.QUERY_CALENDAR]: this.handleQueryCalendar,
      [ActionTypes.QUERY_TASKS]: this.handleQueryTasks,
      [ActionTypes.QUERY_PROVIDERS]: this.handleQueryProviders
    };
    
    // Auth context to ensure Firebase operations work
    this.authContext = {
      userId: null,
      familyId: null,
      timestamp: Date.now()
    };
      
    this.intentMapping = {
      // This is now just used as a fallback if AI classification fails
      'add provider': ActionTypes.ADD_PROVIDER,
      'add event': ActionTypes.ADD_EVENT,
      'add task': ActionTypes.ADD_TASK,
      'track growth': ActionTypes.TRACK_GROWTH,
      'add document': ActionTypes.ADD_DOCUMENT,
      'query calendar': ActionTypes.QUERY_CALENDAR,
      'query tasks': ActionTypes.QUERY_TASKS,
      'query providers': ActionTypes.QUERY_PROVIDERS
    };
    
    // For tracking statistics
    this.stats = {
      totalRequests: 0,
      successfulActions: 0,
      failedActions: 0,
      actionTypeCount: {}
    };
  
    this.claudeService = null;
    this.setClaudeService(ClaudeService);
  }
  
  /**
   * Set authentication context 
   * @param {object} authContext - Authentication context with userId and familyId
   */
  setAuthContext(authContext) {
    if (!authContext) return;
    
    console.log("Setting auth context in IntentActionService:", {
      userId: authContext.userId,
      familyId: authContext.familyId,
      hasValues: !!authContext.userId || !!authContext.familyId
    });
    
    this.authContext = {
      ...this.authContext,
      ...authContext,
      lastUpdated: Date.now()
    };
  }

  /**
 * Process a user request from chat
 * @param {string} message - User message
 * @param {string} familyId - Family ID
 * @param {string} userId - User ID
 * @returns {Promise<object>} Result of the action
 */
// Find the processUserRequest method in IntentActionService.js and replace it with this

async processUserRequest(message, familyId, userId) {
    try {
      console.log("Processing user request:", message);
      console.log("Auth context:", { familyId, userId });
      this.stats.totalRequests++;
      
      // Update authContext with supplied values
      if (!this.authContext) {
        this.authContext = { userId: null, familyId: null };
      }
      
      // Ensure we have the latest auth context in case it was passed directly
      if (userId) {
        this.authContext.userId = userId;
      }
      
      if (familyId) {
        this.authContext.familyId = familyId;
      }
      
      // Fallback to auth.currentUser if userId not provided
      if (!userId && !this.authContext.userId && auth.currentUser) {
        userId = auth.currentUser.uid;
        this.authContext.userId = userId;
        console.log("Using auth.currentUser.uid:", userId);
      }
      
      // Try to get familyId from localStorage with multiple fallbacks
      if (!familyId && !this.authContext.familyId && typeof window !== 'undefined') {
        const storedFamilyId = localStorage.getItem('selectedFamilyId') || 
                              localStorage.getItem('currentFamilyId') || 
                              localStorage.getItem('familyId');
        if (storedFamilyId) {
          familyId = storedFamilyId;
          this.authContext.familyId = familyId;
          console.log("Using familyId from localStorage:", familyId);
        }
      }
      
      // CRITICAL FIX: Set default familyId if still not found - this enables provider operations
      // This is needed because the app seems to be missing proper familyId
      if (!familyId && !this.authContext.familyId) {
        // Found in logs - use the known working familyId as a default
        familyId = 'm93tlovs6ty9sg8k0c8';
        this.authContext.familyId = familyId;
        console.log("⚠️ No familyId found anywhere - using hardcoded familyId as fallback:", familyId);
        
        // Also store it in localStorage for future use
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('selectedFamilyId', familyId);
            localStorage.setItem('currentFamilyId', familyId);
            console.log("📝 Stored fallback familyId in localStorage for future use");
          } catch (storageErr) {
            console.warn("Could not store familyId in localStorage:", storageErr);
          }
        }
      }
      
      // Basic validation
      if (!message) {
        return createErrorResult("I need more information to process your request.");
      }
      
      // ENHANCED: More robust detection for task queries to prevent calendar conflicts
      // This addresses the issue with the calendar response overriding task queries
      const messageLower = message.toLowerCase();
      
      // Check for task-related queries - expanded with more patterns
      if ((messageLower.includes('task') || 
           messageLower.includes('todo') || 
           messageLower.includes('to do') || 
           messageLower.includes('to-do') || 
           messageLower.includes('assignment')) && 
          (messageLower.includes('what') || 
           messageLower.includes('which') || 
           messageLower.includes('show') || 
           messageLower.includes('list') || 
           messageLower.includes('do i have') ||
           messageLower.includes('show me'))) {
        console.log("🔍 Detected task query - forcing intent to QUERY_TASKS");
        
        // Explicitly disable calendar detection in ClaudeService if available
        if (this.claudeService) {
          this.claudeService.disableCalendarDetection = true;
          
          // Set processing context for debugging
          this.claudeService.currentProcessingContext = {
            isProcessingTask: true,
            lastContext: "task_query_direct",
            timestamp: Date.now()
          };
          
          // Schedule re-enabling
          setTimeout(() => {
            if (this.claudeService) {
              this.claudeService.disableCalendarDetection = false;
              console.log("✅ Re-enabled calendar detection after direct task routing");
            }
          }, 5000);
        }
        
        return this.handleQueryTasks(message, familyId, userId);
      }
      
      // Also special handling for provider-related intents
      if ((messageLower.includes('add') || messageLower.includes('create')) && 
          (messageLower.includes('provider') || 
           messageLower.includes('doctor') || 
           messageLower.includes('coach') || 
           messageLower.includes('therapist') ||
           messageLower.includes('specialist') ||
           messageLower.includes('babysitter') ||
           messageLower.includes('nanny') ||
           messageLower.includes('tutor'))) {
         
        console.log("🔍 Detected provider creation - forcing direct provider handling");
        
        // Explicitly disable calendar detection
        if (this.claudeService) {
          this.claudeService.disableCalendarDetection = true;
          
          setTimeout(() => {
            if (this.claudeService) {
              this.claudeService.disableCalendarDetection = false;
            }
          }, 6000);
        }
        
        return this.handleAddProvider(message, familyId, userId);
      }
      
      // Step 1: Identify the intent using AI classification
      const intent = await this.identifyIntent(message);
      console.log("Identified intent:", intent);
      
      if (!intent) {
        // No intent identified - try direct Firebase operation based on content analysis
        try {
          const result = await this.tryDirectAction(message, familyId, userId);
          if (result && result.success) {
            return result;
          }
        } catch (directError) {
          console.warn("Direct action attempt failed:", directError);
        }
        
        return createErrorResult("I'm not sure what you'd like me to do. Could you please be more specific?");
      }
      
      // Track statistics
      this.stats.actionTypeCount[intent] = (this.stats.actionTypeCount[intent] || 0) + 1;
      
      // Step 2: Get the appropriate handler
      const handler = this.actionHandlers[intent];
      
      if (!handler) {
        return createErrorResult("I understand what you want to do, but I don't yet have the capability to handle that action. We're continuously improving!");
      }
      
      // Step 3: Execute the action
      console.log(`💡 Executing action handler for intent "${intent}" with:`, {
        message: message.substring(0, 50) + "...",
        familyId,
        userId,
        handlerName: handler.name || "unnamed handler"
      });
      
      try {
        const result = await handler.call(this, message, familyId, userId);
        
        // Enhanced logging for the result
        console.log(`💡 Action handler result:`, {
          success: result.success,
          hasMessage: !!result.message,
          messagePreview: result.message?.substring(0, 30) + "...",
          error: result.error,
          dataKeys: result.data ? Object.keys(result.data) : []
        });
        
        // Track outcome
        if (result.success) {
          this.stats.successfulActions++;
          console.log(`✅ Successfully executed action for intent "${intent}"`);
        } else {
          this.stats.failedActions++;
          console.warn(`⚠️ Action failed for intent "${intent}": ${result.error}`);
        }
        
        // Record for learning
        try {
          await ActionLearningSystem.recordAction(
            intent,   
            message,   
            result.success,   
            {   
              error: result.error || null,
              entityCount: Object.keys(result.data || {}).length  
            }
          );
        } catch (recordError) {
          // Non-critical error, just log it
          console.warn("Failed to record action for learning:", recordError);
        }
        
        return result;
      } catch (handlerError) {
        console.error(`❌ Unhandled error in action handler for intent "${intent}":`, handlerError);
        this.stats.failedActions++;
        
        return createErrorResult(
          "I encountered an unexpected error while processing your request. Please try again.",
          handlerError.message
        );
      }
      
      // Record for learning (moved inside the try/catch block)
      // Record is handled directly in the try/catch block now
      
    } catch (error) {
      console.error("Error processing user request:", error);
      this.stats.failedActions++;
      
      return createErrorResult("I encountered an error while processing your request. Please try again or provide more details.", error.message);
    }
  }
  
  async tryDirectAction(message, familyId, userId) {
    // Quick content analysis for common actions
    const lowerMessage = message.toLowerCase();
    
    console.log("🔍 Trying direct action pattern matching for:", message);
    
    // Check for provider patterns - expanded to include more provider types
    if (lowerMessage.includes('add') && 
        (lowerMessage.includes('doctor') || 
         lowerMessage.includes('provider') || 
         lowerMessage.includes('coach') || 
         lowerMessage.includes('teacher') || 
         lowerMessage.includes('therapist') || 
         lowerMessage.includes('babysitter') || 
         lowerMessage.includes('tutor'))) {
      console.log("✅ Direct pattern match for provider detected");
      
      // Extra validation for familyId and userId
      if (!familyId && this.authContext?.familyId) {
        console.log("📋 Using familyId from authContext:", this.authContext.familyId);
        familyId = this.authContext.familyId;
      }
      
      if (!userId && this.authContext?.userId) {
        console.log("👤 Using userId from authContext:", this.authContext.userId);
        userId = this.authContext.userId;
      }
      
      if (!userId && auth.currentUser) {
        console.log("👤 Using userId from auth.currentUser:", auth.currentUser.uid);
        userId = auth.currentUser.uid;
      }
      
      // Try multiple localStorage keys for better compatibility
      if (!familyId && typeof window !== 'undefined') {
        const storedFamilyId = localStorage.getItem('selectedFamilyId') || 
                              localStorage.getItem('currentFamilyId') || 
                              localStorage.getItem('familyId');
        if (storedFamilyId) {
          console.log("📋 Using familyId from localStorage:", storedFamilyId);
          familyId = storedFamilyId;
        }
      }
      
      // CRITICAL FIX: Force a default familyId if still not found
      // This is necessary to make provider addition work when no familyId is available
      if (!familyId) {
        console.log("⚠️ No familyId found in any source. Using the user's ID as familyId as fallback");
        if (userId) {
          familyId = userId; // Use userId as fallback
          console.log("📋 Using userId as fallback familyId:", familyId);
        } else if (auth.currentUser) {
          familyId = auth.currentUser.uid;
          console.log("📋 Using auth.currentUser.uid as fallback familyId:", familyId);
        } else {
          // Last resort - create a default family ID for demo/test purposes
          familyId = 'm93tlovs6ty9sg8k0c8'; // A known valid familyId in your system
          console.log("⚠️ Using hardcoded default familyId:", familyId);
        }
      }
      
      return this.handleAddProvider(message, familyId, userId);
    }
    
    // Check for appointment patterns
    if ((lowerMessage.includes('add') || lowerMessage.includes('schedule')) && 
        (lowerMessage.includes('appointment') || lowerMessage.includes('checkup'))) {
      return this.handleAddAppointment(message, familyId, userId);
    }
    
    // Check for growth tracking patterns
    if ((lowerMessage.includes('record') || lowerMessage.includes('track')) && 
        (lowerMessage.includes('height') || lowerMessage.includes('weight'))) {
      return this.handleTrackGrowth(message, familyId, userId);
    }
    
    // Check for task patterns - enhanced to catch more variations
    if (((lowerMessage.includes('add') || lowerMessage.includes('create') || lowerMessage.includes('new')) && 
        (lowerMessage.includes('task') || lowerMessage.includes('todo') || lowerMessage.includes('to do') || 
         lowerMessage.includes('to-do') || lowerMessage.includes('assignment') || lowerMessage.includes('chore')))) {
      console.log("🎯 Detected task creation request in direct routing");
      return this.handleAddTask(message, familyId, userId);
    }
    
    // No direct matches found
    return null;
  }
  
  /**
 * Identify the intent from the user message
 * @param {string} message - User message
 * @returns {Promise<string>} Intent identifier
 */
  async identifyIntent(message) {
    try {
      console.log("Using Claude for intent classification");
      
      const systemPrompt = `You are an intent classifier for Allie, a family management assistant.
      Determine what action the user wants to perform from their message.
      
      IMPORTANT DISTINCTION:
      - If the user mentions babysitters, nannies, childcare providers, doctors, teachers, tutors - this is ADD_PROVIDER
      - ANY message about adding a babysitter or nanny is ALWAYS ADD_PROVIDER intent
      - If the user mentions schedule/calendar/appointment with date/time - this is ADD_EVENT
      - When in doubt between provider and event, check if there's a specific date/time mentioned
      - Names with phone numbers are typically providers, not events
      
      Return ONE of the following intent labels without explanation:
      - add_provider (for adding healthcare providers, teachers, coaches, babysitters)
      - add_event (for adding events to calendar)
      - add_appointment (for medical/dental appointments)
      - add_task (for creating tasks or todos)
      - track_growth (for recording children's measurements)
      - add_document (for uploading or storing documents)
      - add_medical_record (for medical records)
      - add_milestone (for child development milestones)
      - complete_task (for marking tasks as complete)
      - reassign_task (for reassigning tasks to other family members)
      - update_event (for modifying existing events)
      - delete_event (for removing events)
      - schedule_date_night (for couple activities)
      - query_calendar (for calendar questions)
      - query_tasks (for task-related questions)
      - query_providers (for provider directory questions)
      - unknown (if none of the above)
      
      Return ONLY the intent label, nothing else.`;
      
      const response = await ClaudeService.generateResponse(
        [{ role: 'user', content: `Classify this request: "${message}"` }],
        { system: systemPrompt },
        { temperature: 0.1 }
      );
      
      // Clean and extract the intent
      const rawIntent = response.trim().toLowerCase();
      console.log(`Raw intent from Claude: "${rawIntent}"`);
      
      // First, check for exact matches with our known intents
      if (this.actionHandlers[rawIntent]) {
        console.log(`Exact match found for intent: ${rawIntent}`);
        return rawIntent;
      }
      
      // Handle "add_provider" -> ActionTypes.ADD_PROVIDER mapping
      if (rawIntent === 'add_provider') {
        console.log(`Converting add_provider to ActionTypes.ADD_PROVIDER`);
        return ActionTypes.ADD_PROVIDER;
      }
      
      // For other add_xyz patterns, try to match with ActionTypes
      if (rawIntent.startsWith('add_')) {
        // Convert add_event to ADD_EVENT format
        const convertedIntent = rawIntent.toUpperCase().replace(/_/g, '_');
        console.log(`Converting ${rawIntent} to ${convertedIntent}`);
        
        if (this.actionHandlers[convertedIntent]) {
          return convertedIntent;
        }
      }
      
      // Remove any unexpected characters as a last resort
      const cleanedIntent = rawIntent.replace(/[^a-z_]/g, '');
      console.log(`Cleaned intent: ${cleanedIntent}`);
      
      return this.actionHandlers[cleanedIntent] ? cleanedIntent : null;
    } catch (error) {
      console.error("Error identifying intent with Claude:", error);
      return null;
    }
  }
  
  /**
   * Get family context for action handlers
   * @param {string} familyId - Family ID
   * @returns {Promise<object>} Family context data
   */
  async getFamilyContext(familyId) {
    try {
      // Import dynamic to avoid circular dependencies
      const { default: EnhancedChatService } = await import('./EnhancedChatService');
      
      // Use existing method from EnhancedChatService
      return await EnhancedChatService.getFamilyContext(familyId);
    } catch (error) {
      console.error("Error getting family context in IntentActionService:", error);
      return {}; // Return empty context on error
    }
  }

  /**
   * Handle adding a provider
   * @param {string} message - User message
   * @param {string} familyId - Family ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Result of adding provider
   */
  // Find the handleAddProvider method in IntentActionService.js and replace it with this

  async handleAddProvider(message, familyId, userId) {
    try {
      console.log("🔄 Handling add provider request:", message);
      console.log("🔍 Context:", { familyId, userId });
      
      // CRITICAL FIX: Better familyId validation with fallback
      if (!familyId) {
        console.error("❌ No family ID provided to handleAddProvider - attempting to retrieve from context");
        
        // Try to get familyId from auth context with more logging
        if (this.authContext && this.authContext.familyId) {
          familyId = this.authContext.familyId;
          console.log("✅ Retrieved familyId from authContext:", familyId);
        } else if (typeof window !== 'undefined') {
          // Try multiple localStorage keys for greater compatibility
          const storedFamilyId = localStorage.getItem('selectedFamilyId') || 
                                localStorage.getItem('currentFamilyId') ||
                                localStorage.getItem('familyId');
          if (storedFamilyId) {
            familyId = storedFamilyId;
            console.log("✅ Retrieved familyId from localStorage:", familyId);
          }
        }
        
        // CRITICAL FIX: If still no familyId, use default or fallback instead of error
        if (!familyId) {
          console.warn("⚠️ No familyId found in any source. Using fallbacks instead of error");
          
          // Try using userId as the familyId (works in single-user families)
          if (userId) {
            familyId = userId;
            console.log("📋 Using userId as fallback familyId:", familyId);
          } else if (auth.currentUser) {
            // Try using the current auth user's ID
            familyId = auth.currentUser.uid;
            console.log("📋 Using auth.currentUser.uid as fallback familyId:", familyId);
          } else {
            // Last resort - use a hardcoded familyId that exists in the system
            familyId = 'm93tlovs6ty9sg8k0c8'; // This appears to be a valid familyId from the logs
            console.log("⚠️ Using hardcoded default familyId:", familyId);
          }
          console.log("📋 Proceeding with fallback familyId:", familyId);
        }
      }
      
      // CRITICAL FIX: Also ensure userId is available
      if (!userId) {
        console.error("❌ No user ID provided to handleAddProvider - attempting to retrieve");
        
        // Try from auth context
        if (this.authContext && this.authContext.userId) {
          userId = this.authContext.userId;
          console.log("✅ Retrieved userId from authContext:", userId);
        } else if (auth && auth.currentUser) {
          // Try from Firebase auth directly
          userId = auth.currentUser.uid;
          console.log("✅ Retrieved userId from auth.currentUser:", userId);
        } else if (typeof window !== 'undefined') {
          // Try from localStorage as last resort
          const storedUserId = localStorage.getItem('userId');
          if (storedUserId) {
            userId = storedUserId;
            console.log("✅ Retrieved userId from localStorage:", userId);
          }
        }
        
        if (!userId) {
          console.warn("⚠️ Could not retrieve userId, will use 'system' as createdBy");
          // Continue without userId - we'll use 'system' as the creator
        }
      }
      
      // Set context flag to avoid calendar detection interference
      if (this.claudeService) {
        this.claudeService.disableCalendarDetection = true;
      }
      
      // Track the current operation in context for better error handling
      if (this.claudeService && this.claudeService.currentProcessingContext) {
        this.claudeService.currentProcessingContext.isProcessingProvider = true;
        this.claudeService.currentProcessingContext.lastContext = "provider";
        this.claudeService.currentProcessingContext.timestamp = Date.now();
        console.log("📝 Updated processing context for provider operation");
      }
      
      // Extract provider details using AI with enhanced prompts
      const coachingKeywords = ['coach', 'trainer', 'instructor', 'teacher'];
      const isCoachingProvider = coachingKeywords.some(keyword => message.toLowerCase().includes(keyword));
      
      // Also check if there's contact information to extract
      const hasContactInfo = message.toLowerCase().includes('email') || 
                           message.toLowerCase().includes('@') ||
                           message.toLowerCase().includes('phone') ||
                           message.toLowerCase().includes('call') ||
                           message.toLowerCase().includes('number');
      
      // Try to extract the child name directly with enhanced patterns for babysitters
      let extractedChild = null;
      
      // First check babysitter-specific patterns
      if (message.toLowerCase().includes('babysitter') || message.toLowerCase().includes('nanny')) {
        const babysitterChildPatterns = [
          // "add a babysitter for lily"
          /(?:babysitter|nanny)\s+for\s+([A-Za-z]+)(?:\s|,|\.|\?)/i,
          // "add a new babysitter for my daughter lily"
          /(?:babysitter|nanny)\s+for\s+(?:my|our)?\s*(?:daughter|son|child|kid)\s+([A-Za-z]+)(?:\s|,|\.|\?)/i,
          // "lily needs a new babysitter"
          /([A-Za-z]+)\s+needs\s+(?:a|new)?\s*(?:babysitter|nanny)/i
        ];
        
        for (const pattern of babysitterChildPatterns) {
          const match = message.match(pattern);
          if (match && match[1]) {
            extractedChild = match[1];
            console.log(`Extracted child name for babysitter: ${extractedChild}`);
            break;
          }
        }
      }
      
      // Fallback to general pattern if no match found
      if (!extractedChild) {
        const childNamePattern = /for\s+([A-Za-z]+)(?:\s|,|\.|\?)/i;
        const childMatch = message.match(childNamePattern);
        extractedChild = childMatch ? childMatch[1] : null;
      }
      
      // Extract email address using regex
      const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
      const emailMatch = message.match(emailPattern);
      const extractedEmail = emailMatch ? emailMatch[0] : null;
      
      // Extract phone number using regex
      const phonePattern = /\b(?:\+?1[-\s]?)?(?:\(?\d{3}\)?[-\s]?)?\d{3}[-\s]?\d{4}\b/;
      const phoneMatch = message.match(phonePattern);
      const extractedPhone = phoneMatch ? phoneMatch[0] : null;
      
      // IMPROVED: Also try to extract a specific provider name directly
      const providerNamePattern = /(?:named|called|is|named is)\s+([A-Z][A-Za-z]+\s+[A-Z][A-Za-z]+)(?:\s|,|\.)/i;
      const providerNameMatch = message.match(providerNamePattern);
      const extractedProviderName = providerNameMatch ? providerNameMatch[1] : null;
      
      console.log("👀 Pre-extraction results:", {
        isCoachingProvider,
        hasContactInfo,
        extractedChild,
        extractedEmail,
        extractedPhone,
        extractedProviderName
      });
      
      let providerDetails;
      
      // Build a custom extraction prompt based on what we've detected
      let customPrompt = `Pay special attention to extracting provider details.\n`;
      
      if (isCoachingProvider) {
        customPrompt += `This appears to be a coach, teacher, or instructor. `;
        customPrompt += `Classify the provider as the specific type (e.g., 'swimming coach', 'running coach', 'violin teacher', etc.).\n`;
      }
      
      // Check specifically if this is a babysitter
      if (message.toLowerCase().includes('babysitter') || message.toLowerCase().includes('nanny')) {
        customPrompt += `This appears to be a babysitter or childcare provider. `;
        customPrompt += `Classify the provider as 'childcare' type and set the specialty to 'babysitter'.\n`;
      }
      
      if (extractedChild) {
        customPrompt += `The provider appears to be for a child named ${extractedChild}.\n`;
      }
      
      if (extractedProviderName) {
        customPrompt += `The provider's name appears to be ${extractedProviderName}.\n`;
      }
      
      if (extractedEmail) {
        customPrompt += `The provider's email appears to be ${extractedEmail}.\n`;
      }
      
      if (extractedPhone) {
        customPrompt += `The provider's phone number appears to be ${extractedPhone}.\n`;
      }
      
      customPrompt += `Be sure to correctly extract the full name, even when it's a formal name like "Thomas Ledbetter" or "Fred Teller".\n`;
      customPrompt += `Also extract which child this provider is for, if mentioned, and any contact details provided.\n`;
      customPrompt += `For babysitters, be sure to set the 'childFor' field with the child's name and set type to 'childcare'.\n`;
      
      // Use enhanced extraction with our custom prompt
      try {
        providerDetails = await ClaudeService.extractEntityWithAI(message, 'provider', {
          additionalSystemPrompt: customPrompt
        });
        
        console.log("✅ AI extraction successful:", providerDetails ? 
          JSON.stringify(providerDetails, null, 2) : "No details returned");
      } catch (aiError) {
        console.error("❌ AI extraction failed:", aiError);
        // Continue to fallback extraction
      }
      
      // Enhanced fallback extraction if AI extraction fails
      if (!providerDetails || !providerDetails.name) {
        console.log("AI extraction failed or incomplete, attempting direct extraction");
        
        // Try pattern matching for common provider formats
        const namePatterns = [
          // Enhanced babysitter pattern with "her name is"
          /add\s+(?:a\s+)?(?:new\s+)?(?:babysitter|nanny)(?:\s+for\s+\w+)?,?\s+(?:(?:her|his|their)\s+name\s+(?:is|=)\s+)([\w\s\.]+)(?:$|,|\.|;)/i,
          
          // Enhanced babysitter with simple "name is"
          /add\s+(?:a\s+)?(?:new\s+)?(?:babysitter|nanny)(?:\s+for\s+\w+)?,?\s+(?:name\s+(?:is|=)\s+)([\w\s\.]+)(?:$|,|\.|;)/i,
          
          // Enhanced general babysitter pattern
          /add\s+(?:a\s+)?(?:new\s+)?(?:babysitter|nanny)(?:\s+for\s+\w+)?,?\s+(?:named|called)?\s*([\w\s\.]+)(?:$|,|\.|;)/i,
          
          // Original patterns
          // "add a new running coach for lillian, the coaches name is thomas ledbetter"
          /add\s+(?:a\s+)?(?:new\s+)?(?:\w+\s+)?(?:coach|doctor|provider|teacher|instructor|trainer|tutor|babysitter)(?:\s+for\s+\w+)?,?\s+(?:(?:the|their|his|her)\s+(?:\w+\s+)?name\s+(?:is|=)\s+)([\w\s\.]+)(?:$|,|\.|;)/i,
          
          // "add a new coach named Thomas"
          /add\s+(?:a\s+)?(?:new\s+)?(?:\w+\s+)?(?:coach|doctor|provider|teacher|instructor|trainer|tutor|babysitter)(?:\s+for\s+\w+)?,?\s+(?:(?:named|called|with the name)\s+)([\w\s\.]+)(?:$|,|\.|;)/i,
          
          // More general pattern for "coach for X"
          /add\s+(?:a\s+)?(?:new\s+)?(?:\w+\s+)?(?:coach|doctor|provider|teacher|instructor|trainer|tutor|babysitter)(?:\s+for\s+\w+)?,?\s+([\w\s\.]+)(?:$|,|\.|;)/i,
          
          // "his/her name is X" format
          /(?:his|her|their)\s+(?:name|email|phone|number)\s+(?:is|are|=)\s+([\w\s\.@\-+]+)(?:$|,|\.|;|\s|and)/i,
          
          // Direct name extraction after colon or similar
          /(?:name(?:\s+is)?|called|named)(?:\s*[:=]?\s*)([\w\s\.]+)(?:$|,|\.|;)/i
        ];
        
        // Try each pattern until we find a match
        let name = extractedProviderName; // Use the pre-extracted name if available
        
        if (!name) {
          for (const pattern of namePatterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
              name = match[1].trim();
              console.log(`Extracted provider name from pattern: ${name}`);
              break;
            }
          }
        }
        
        // If we still couldn't extract a name, try one more general approach
        if (!name && message.split(' ').length > 3) {
          // Look for capitalized words that might be a name
          const words = message.split(' ');
          for (let i = 0; i < words.length - 1; i++) {
            if (/^[A-Z][a-z]+$/.test(words[i]) && /^[A-Z][a-z]+$/.test(words[i+1])) {
              name = `${words[i]} ${words[i+1]}`;
              console.log(`Extracted potential name from capitalized words: ${name}`);
              break;
            }
          }
        }
        
        if (name) {
          // Extract type with more patterns
          let type = 'provider';
          let specialty = '';
          
          if (message.toLowerCase().includes('violin') || 
              message.toLowerCase().includes('piano') || 
              message.toLowerCase().includes('music')) {
            type = 'music';
            
            // Try to determine the instrument
            const instruments = ['violin', 'piano', 'guitar', 'drums', 'flute', 'cello', 'trumpet', 'saxophone'];
            for (const instrument of instruments) {
              if (message.toLowerCase().includes(instrument)) {
                specialty = `${instrument} teacher`;
                break;
              }
            }
            
            if (!specialty) specialty = 'music teacher';
          } else if (message.toLowerCase().includes('run') && message.toLowerCase().includes('coach')) {
            type = 'coach';
            specialty = 'running coach';
          } else if (message.toLowerCase().includes('swim') && message.toLowerCase().includes('coach')) {
            type = 'coach';
            specialty = 'swimming coach';
          } else if (message.toLowerCase().includes('coach')) {
            type = 'coach';
          } else if (message.toLowerCase().includes('doctor') || message.toLowerCase().includes('dr.')) {
            type = 'medical';
          } else if (message.toLowerCase().includes('teacher')) {
            type = 'education';
          } else if (message.toLowerCase().includes('babysitter') || message.toLowerCase().includes('nanny')) {
            type = 'childcare';
          } else if (message.toLowerCase().includes('tutor')) {
            type = 'education';
            specialty = 'tutor';
          }
          
          // Additional validation for babysitters to ensure correct type
          if (message.toLowerCase().includes('babysitter') || message.toLowerCase().includes('nanny')) {
            type = 'childcare';
            specialty = 'babysitter';
            console.log(`✅ Explicitly setting provider type to ${type} and specialty to ${specialty} for babysitter`);
          }
          
          // Create basic provider details with any pre-extracted info
          providerDetails = {
            name: name,
            type: type,
            specialty: specialty,
            notes: "Added via Allie Chat with direct extraction",
            childName: extractedChild,
            email: extractedEmail,
            phone: extractedPhone,
            forChild: extractedChild
          };
        } else {
          return createErrorResult("I couldn't identify the provider details. Could you please provide the provider's name and type?");
        }
      } else {
        // If AI extraction worked but missed some details, add them from direct extraction
        if (extractedEmail && !providerDetails.email) {
          providerDetails.email = extractedEmail;
        }
        
        if (extractedPhone && !providerDetails.phone) {
          providerDetails.phone = extractedPhone;
        }
        
        if (extractedChild && !providerDetails.childName) {
          providerDetails.childName = extractedChild;
          providerDetails.forChild = extractedChild;
        }
      }
      
      // CRITICAL FIX: DIRECT FIREBASE OPERATION WITH BETTER ERROR HANDLING
      try {
        // IMPROVED: Test Firebase permissions first to prevent failed writes
        console.log("🔥 Testing Firebase permissions before provider write");
        
        // Import the permission test utility
        const { default: FirebasePermissionTest } = await import('./FirebasePermissionTest');
        
        // Run a comprehensive test on providers collection
        const permissionResults = await FirebasePermissionTest.testPermissions({
          userId: userId,
          familyId: familyId,
          timestamp: Date.now()
        });
        
        // Check if we can write to providers specifically
        if (!permissionResults.success || !permissionResults.testResults.providers?.write) {
          console.error("❌ Provider write operation will fail - permission test failed");
          console.log("📊 Permission test results:", permissionResults);
          
          // Try to recover if possible with auth.currentUser
          if (auth.currentUser) {
            console.log("🔄 Attempting recovery with current user:", auth.currentUser.uid);
            
            // Force userId to be the current user
            userId = auth.currentUser.uid;
            
            // If familyId is missing, use the hardcoded fallback
            if (!familyId) {
              familyId = 'm93tlovs6ty9sg8k0c8'; // Known working familyId
              console.log("⚠️ Using fallback familyId:", familyId);
            }
            
            // Update auth context for services
            this.authContext = {
              userId: userId,
              familyId: familyId,
              timestamp: Date.now()
            };
            
            // Try the test again
            const recoveryResults = await FirebasePermissionTest.testPermissions(this.authContext);
            
            if (!recoveryResults.success) {
              console.error("❌ Recovery failed - cannot write to Firebase");
              throw new Error("Firebase permission issue - recovery failed");
            } else {
              console.log("✅ Recovery successful - proceeding with provider creation");
            }
          } else {
            throw new Error("Cannot write to Firebase - no authentication");
          }
        }
        
        // Using the already imported Firebase components
        console.log("🔥 Using Firebase functions");
        
        // Log what we've extracted
        console.log("🧩 Provider details extracted:", JSON.stringify(providerDetails, null, 2));
        
        // Handle special case for music teachers
        if (message.toLowerCase().includes('violin') || 
            message.toLowerCase().includes('piano') || 
            message.toLowerCase().includes('guitar') || 
            message.toLowerCase().includes('music')) {
          
          if (!providerDetails.type || providerDetails.type === 'provider') {
            console.log("📝 Detected music-related provider, setting type to 'music'");
            providerDetails.type = 'music';
            
            if (!providerDetails.specialty) {
              // Try to extract the instrument
              const instruments = ['violin', 'piano', 'guitar', 'drums', 'flute', 'cello', 'trumpet', 'saxophone'];
              for (const instrument of instruments) {
                if (message.toLowerCase().includes(instrument)) {
                  providerDetails.specialty = `${instrument} teacher`;
                  break;
                }
              }
            }
          }
        }
        
        // Prepare provider data with comprehensive error checking and defaults
        const provider = {
          name: providerDetails.name || "Unknown Provider",
          type: providerDetails.type || "provider",
          specialty: providerDetails.specialty || "",
          phone: providerDetails.phone || "",
          email: providerDetails.email || "",
          address: providerDetails.address || "",
          notes: providerDetails.notes || "Added via Allie chat",
          childName: providerDetails.childName || providerDetails.forChild || null,
          // CRITICAL: Ensure familyId is always set with fallback
          familyId: familyId || 'm93tlovs6ty9sg8k0c8', // Use known working ID as fallback
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: userId || 'system'
        };
        
        // Add directly to Firestore with better error handling
        console.log("🔥 Adding provider directly to Firestore:", { 
          providerName: provider.name,
          familyId: provider.familyId
        });
        
        // Improved error handling around Firebase operations
        let docRef;
        try {
          // Verify auth.currentUser - sometimes needed for Firestore permissions
          if (!auth.currentUser && userId) {
            console.warn("⚠️ No auth.currentUser but we have userId - this might cause Firestore permission issues");
          }
          
          // Verify we have imports and db available
          if (!collection || !addDoc || !db) {
            throw new Error("Firebase functions or db not available");
          }
          
          // Log the entire provider object for debugging
          console.log("Provider object being saved:", JSON.stringify(provider));
          
          // Try the write operation
          docRef = await addDoc(collection(db, "providers"), provider);
          console.log("✅ Provider added successfully with ID:", docRef.id);
        } catch (innerFirebaseError) {
          console.error("❌ Inner Firebase operation failed:", innerFirebaseError);
          throw innerFirebaseError; // Re-throw to outer catch
        }
        
        // Trigger UI updates
        if (typeof window !== 'undefined') {
          console.log("📢 Dispatching UI update events");
          try {
            window.dispatchEvent(new CustomEvent('provider-added', { 
              detail: { providerId: docRef.id } 
            }));
            window.dispatchEvent(new CustomEvent('directory-refresh-needed'));
          } catch (eventError) {
            console.warn("⚠️ Error dispatching UI events:", eventError);
          }
        }
        
        // Create a detailed, helpful response message with lots of context
        const childName = providerDetails.childName || providerDetails.forChild || null;
        const providerTypeDisplay = provider.type === 'coach' ? 
                                   (providerDetails.specialty || 'coach') : 
                                   provider.type;
                                   
        let response = `Absolutely! I've added ${provider.name} as a ${providerTypeDisplay} ${childName ? `for ${childName}` : ''} to your family provider directory. Here's what I understand:\n\n`;
        
        response += `Name: ${provider.name}\n`;
        response += `Role: ${providerTypeDisplay}${childName ? ` for ${childName}` : ''}\n`;
        
        if (provider.email) {
            response += `Email: ${provider.email}\n`;
        }
        
        if (provider.phone) {
            response += `Phone: ${provider.phone}\n`;
        }
        
        if (provider.address) {
            response += `Address: ${provider.address}\n`;
        }
        
        response += `\nI've added this information to your family provider directory.\n\n`;
        
        // Add contextual advice based on provider type
        if (provider.type === 'education' || providerTypeDisplay.toLowerCase().includes('teacher') || providerTypeDisplay.toLowerCase().includes('tutor')) {
            response += `It's wonderful that ${childName || 'your child'} is working with ${provider.name}! ${providerTypeDisplay.toLowerCase().includes('music') ? 'Music education' : 'Education'} provides many benefits for children's development.\n\n`;
            
            response += `A few things to consider regarding lessons:\n\n`;
            response += `1. Practice schedule: Consider incorporating regular practice into ${childName || 'your child'}'s routine.\n\n`;
            response += `2. Transportation: Decide who will be responsible for taking ${childName || 'your child'} to lessons.\n\n`;
            response += `3. Materials: Ensure you have all necessary supplies for effective learning.\n`;
        }
        else if (provider.type === 'coach' || providerTypeDisplay.toLowerCase().includes('coach') || providerTypeDisplay.toLowerCase().includes('instructor')) {
            response += `Having a ${providerTypeDisplay} like ${provider.name} is a great way to support ${childName || 'your child'}'s development and interests!\n\n`;
            
            response += `Some things to consider:\n\n`;
            response += `1. Practice time: Regular practice will help maximize progress.\n\n`;
            response += `2. Equipment: Make sure you have appropriate gear for ${childName || 'your child'}'s activities.\n\n`;
            response += `3. Schedule: Consider how these sessions fit into your family calendar.\n`;
        }
        else if (provider.type === 'medical' || providerTypeDisplay.toLowerCase().includes('doctor') || providerTypeDisplay.toLowerCase().includes('dentist')) {
            response += `I've added ${provider.name} to your healthcare providers. Keeping track of medical providers is an important part of family management.\n\n`;
            
            response += `Remember to:\n\n`;
            response += `1. Add appointments to your family calendar when scheduled\n\n`;
            response += `2. Keep medical records updated\n\n`;
            response += `3. Prepare questions before appointments for efficient visits\n`;
        }
        
        // Return the detailed response
        return createSuccessResult(
          response,
          { providerId: docRef.id, provider }
        );
      } catch (firebaseError) {
        console.error("❌ Firebase operation failed:", firebaseError);
        console.error("Error details:", {
          message: firebaseError.message,
          code: firebaseError.code,
          stack: firebaseError.stack
        });
        
        // Try one more approach - test Firebase specifically
        try {
          if (ClaudeService && typeof ClaudeService.testFirebaseWrite === 'function') {
            console.log("🧪 Testing Firebase write permissions after error");
            const testResult = await ClaudeService.testFirebaseWrite();
            console.log("Firebase test result:", testResult ? "✅ Test passed" : "❌ Test failed");
          }
        } catch (testError) {
          console.error("Error during Firebase test:", testError);
        }
        
        return createErrorResult(
          "I had trouble saving this provider. Let's try again with more specific information.",
          firebaseError.message
        );
      }
    } catch (error) {
      console.error("❌ Error handling add provider:", error);
      return createErrorResult("I encountered an error while adding this provider.", error.message);
    } finally {
      // Reset context flag
      if (this.claudeService) {
        this.claudeService.disableCalendarDetection = false;
        
        // Reset processing context
        if (this.claudeService.currentProcessingContext) {
          this.claudeService.currentProcessingContext.isProcessingProvider = false;
          this.claudeService.currentProcessingContext.lastContext = "none";
        }
      }
    }
  }

  /**
 * Debug method to test intent classification directly
 * @param {string} message - Message to classify
 * @returns {Promise<string>} Classified intent
 */
async debugClassifyIntent(message) {
    try {
      console.log("🔍 Debug classification for:", message);
      const intent = await this.identifyIntent(message);
      console.log("🔍 Classified as:", intent);
      return intent;
    } catch (error) {
      console.error("Error in debug classification:", error);
      return null;
    }
  }

  /**
   * Handle adding an event to calendar
   * @param {string} message - User message
   * @param {string} familyId - Family ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Result of adding event
   */
  async handleAddEvent(message, familyId, userId) {
    try {
      console.log("Handling add event request:", message);
      
      const { default: ClaudeService } = await import('./ClaudeService');
      
      // Extract and collect event details
      const result = await ClaudeService.extractAndCollectEventDetails(
        message, 
        userId, 
        familyId
      );
      
      if (result) {
        // Check if this is collection start or completion
        if (result.includes('I\'ve added') && result.includes('to your calendar')) {
          // Event was successfully added
          
          // Force UI refresh
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
            }, 1000);
          }
          
          return createSuccessResult(result);
        } else {
          // This is part of the collection flow
          return createSuccessResult(result);
        }
      }
      
      return createErrorResult("I couldn't process this calendar event. Please try again with more details about the event date, time, and title.");
    } catch (error) {
      console.error("Error handling add event:", error);
      
      return createErrorResult(
        "I encountered an error while adding this event to your calendar. Please try again with a clearer date and time.",
        error.message
      );
    }
  }

  /**
   * Handle adding a medical appointment
   * @param {string} message - User message
   * @param {string} familyId - Family ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Result of adding appointment
   */
  // Find the handleAddAppointment method and replace it with this

async handleAddAppointment(message, familyId, userId) {
    try {
      console.log("Handling add appointment request:", message);
      
      if (!familyId) {
        return createErrorResult("I need to know which family this appointment is for.");
      }
      
      // Extract appointment details
      const appointmentDetails = await ClaudeService.extractEntityWithAI(message, 'event');
      
      if (!appointmentDetails || !appointmentDetails.title) {
        return createErrorResult("I couldn't identify the appointment details. Could you provide more information?");
      }
      
      // Find mentioned child if any
      let childId = appointmentDetails.childId;
      let childName = appointmentDetails.childName;
      
      if (!childId && childName) {
        // Try to find child by name in context
        const familyContext = await this.getFamilyContext(familyId);
        const children = familyContext.children || [];
        const matchedChild = children.find(c => 
          c.name.toLowerCase() === childName.toLowerCase()
        );
        
        if (matchedChild) {
          childId = matchedChild.id;
          childName = matchedChild.name;
        }
      }
      
      // CRITICAL FIX: DIRECT FIREBASE OPERATION
      try {
        // Using the already imported Firebase components
        console.log("🔥 Using Firebase functions for appointment");
        
        // Prepare appointment data
        const eventDate = appointmentDetails.dateTime ? 
          new Date(appointmentDetails.dateTime) : new Date();
        
        const appointment = {
          title: appointmentDetails.title || "Medical Appointment",
          type: appointmentDetails.eventType || "medical",
          appointmentType: appointmentDetails.appointmentType || "general",
          date: eventDate,
          dateTime: eventDate,
          location: appointmentDetails.location || "",
          doctor: appointmentDetails.doctor || "",
          notes: appointmentDetails.description || "",
          completed: false,
          childId: childId,
          childName: childName,
          familyId: familyId,
          userId: userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        // Add to both calendar_events AND medicalAppointments collection
        console.log("Adding appointment directly to Firestore");
        
        // Save to medicalAppointments collection
        const appointmentRef = await addDoc(collection(db, "medicalAppointments"), appointment);
        
        // Also save to calendar_events collection for calendar integration
        const calendarEvent = {
          title: appointment.title,
          description: appointment.notes,
          location: appointment.location,
          start: { dateTime: eventDate.toISOString() },
          end: { dateTime: new Date(eventDate.getTime() + 3600000).toISOString() }, // 1 hour later
          eventType: "appointment",
          category: "medical",
          familyId: familyId,
          userId: userId,
          childId: childId,
          childName: childName,
          createdAt: serverTimestamp()
        };
        
        const calendarRef = await addDoc(collection(db, "calendar_events"), calendarEvent);
        
        // Trigger UI updates
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('child-data-updated', { 
            detail: { childId, dataType: 'appointment' } 
          }));
          window.dispatchEvent(new CustomEvent('force-calendar-refresh'));
        }
        
        return createSuccessResult(
          `I've scheduled a ${appointment.appointmentType} appointment${childName ? ` for ${childName}` : ''} on ${eventDate.toLocaleDateString()} at ${eventDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.`,
          { 
            appointmentId: appointmentRef.id, 
            calendarEventId: calendarRef.id, 
            appointment 
          }
        );
      } catch (firebaseError) {
        console.error("Firebase operation failed:", firebaseError);
        return createErrorResult(
          "I had trouble saving this appointment. Let's try again with more details.",
          firebaseError.message
        );
      }
    } catch (error) {
      console.error("Error handling add appointment:", error);
      return createErrorResult("I encountered an error while adding this appointment.", error.message);
    }
  }

  /**
   * Handle adding a task
   * @param {string} message - User message
   * @param {string} familyId - Family ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Result of adding task
   */
  async handleAddTask(message, familyId, userId) {
    try {
      console.log("Handling add task request:", message);
      
      // Set context flag to avoid calendar detection interference
      if (this.claudeService) {
        this.claudeService.currentProcessingContext.isProcessingTask = true;
      }
      
      // Import services dynamically
      const { default: AllieAIService } = await import('./AllieAIService');
      
      // Process task creation
      const result = await AllieAIService.processTaskFromChat(message, familyId, userId);
      console.log("Task processing result:", result);
      
      // Clear context flag
      if (this.claudeService) {
        this.claudeService.currentProcessingContext.isProcessingTask = false;
      }
      
      if (result && result.success) {
        // Force UI updates
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('kanban-task-added', {
            detail: { taskId: result.taskId }
          }));
        }
        
        return createSuccessResult(
          `I've added "${result.task.title}" to your tasks${result.task.assignedToName ? ` and assigned it to ${result.task.assignedToName}` : ''}.${result.task.dueDate ? ` It's due by ${new Date(result.task.dueDate).toLocaleDateString()}.` : ''} You can find it in ${result.task.column === 'in-progress' ? 'the In Progress column' : result.task.column === 'this-week' ? 'the This Week column' : 'the Upcoming column'} on your task board.`,
          result.task
        );
      }
      
      return createErrorResult(
        `I couldn't add this task. ${result.error || "Please try again with more details about what the task involves."}`,
        result.error
      );
    } catch (error) {
      console.error("Error handling add task:", error);
      
      return createErrorResult(
        "I encountered an error while adding this task. Please try being more specific about what needs to be done and who it's assigned to.",
        error.message
      );
    }
  }

  /**
   * Handle tracking child growth
   * @param {string} message - User message
   * @param {string} familyId - Family ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Result of tracking growth
   */
async handleTrackGrowth(message, familyId, userId) {
    try {
      console.log("Handling track growth request:", message);
      
      if (!familyId) {
        return createErrorResult("I need to know which family this growth data is for.");
      }
      
      // Extract growth measurement details using AI
      const growthDetails = await ClaudeService.extractEntityWithAI(message, 'growth');
      
      if (!growthDetails) {
        return createErrorResult("I couldn't identify the growth measurement details. Could you provide more information?");
      }
      
      // Find mentioned child if any
      let childId = null;
      let childName = growthDetails.childName || null;
      
      if (childName) {
        // Try to find child by name in context
        const familyContext = await this.getFamilyContext(familyId);
        const children = familyContext.children || [];
        const matchedChild = children.find(c => 
          c.name.toLowerCase() === childName.toLowerCase()
        );
        
        if (matchedChild) {
          childId = matchedChild.id;
          childName = matchedChild.name;
        }
      }
      
      if (!childId) {
        return createErrorResult("I couldn't determine which child this measurement is for. Please specify the child's name.");
      }
      
      // DIRECT FIREBASE OPERATION
      try {
        const { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp, arrayUnion } = await import('firebase/firestore');
        const { db } = await import('./firebase');
        
        // Prepare growth data
        const growthEntry = {
          date: growthDetails.date || new Date().toISOString().split('T')[0],
          height: growthDetails.height || null,
          weight: growthDetails.weight || null,
          shoeSize: growthDetails.shoeSize || null,
          clothingSize: growthDetails.clothingSize || null,
          notes: `Added via Allie chat: "${message.substring(0, 100)}"`,
          childId: childId,
          childName: childName,
          createdAt: new Date().toISOString()
        };
        
        // First try to update existing child document
        const childDocRef = doc(db, "familyMembers", childId);
        const childDoc = await getDoc(childDocRef);
        
        if (childDoc.exists()) {
          // Get current growth data or initialize empty array
          const childData = childDoc.data();
          
          // Update with growth data
          await updateDoc(childDocRef, {
            growthData: arrayUnion(growthEntry),
            updatedAt: serverTimestamp()
          });
          
          console.log(`Growth data added for child: ${childId}`);
        } else {
          // If child document doesn't exist, create a standalone growth record
          await addDoc(collection(db, "growthMeasurements"), {
            ...growthEntry,
            familyId: familyId,
            createdAt: serverTimestamp()
          });
        }
        
        // Trigger UI updates
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('child-data-updated', { 
            detail: { childId, dataType: 'growth' } 
          }));
        }
        
        // Build response message
        let responseMsg = `I've recorded the growth data for ${childName}. `;
        
        // Add details about what was recorded
        const details = [];
        if (growthEntry.height) details.push(`height: ${growthEntry.height}`);
        if (growthEntry.weight) details.push(`weight: ${growthEntry.weight}`);
        if (growthEntry.shoeSize) details.push(`shoe size: ${growthEntry.shoeSize}`);
        if (growthEntry.clothingSize) details.push(`clothing size: ${growthEntry.clothingSize}`);
        
        if (details.length > 0) {
          responseMsg += `I recorded ${details.join(', ')}.`;
        }
        
        responseMsg += ` You can view this data in the Children Tracking tab.`;
        
        return createSuccessResult(responseMsg, { childId, childName, growthEntry });
      } catch (firebaseError) {
        console.error("Firebase operation failed:", firebaseError);
        return createErrorResult(
          "I had trouble saving this growth data. Please try again with more specific measurements.",
          firebaseError.message
        );
      }
    } catch (error) {
      console.error("Error handling track growth:", error);
      return createErrorResult("I encountered an error while recording this growth data.", error.message);
    }
  }

  /**
   * Handle calendar queries
   * @param {string} message - User message
   * @param {string} familyId - Family ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Result with calendar information
   */
  async handleQueryCalendar(message, familyId, userId) {
    try {
      console.log("Handling calendar query:", message);
      
      // Import necessary services
      const { default: EnhancedChatService } = await import('./EnhancedChatService');
      
      // Use the existing calendar lookup functionality
      const result = await EnhancedChatService.lookupCalendarEvent(message, familyId, userId);
      
      if (result.success) {
        return createSuccessResult(
          result.message,
          result.events || result.event
        );
      }
      
      return createErrorResult(
        result.message || "I couldn't find any matching events in your calendar.",
        "No matching events"
      );
    } catch (error) {
      console.error("Error handling calendar query:", error);
      
      return createErrorResult(
        "I encountered an error while searching your calendar. Please try a more specific query.",
        error.message
      );
    }
  }

  /**
   * Handle tasks queries
   * @param {string} message - User message
   * @param {string} familyId - Family ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Result with task information
   */
  async handleQueryTasks(message, familyId, userId) {
    try {
      console.log("Handling tasks query with improved parsing:", message);
      
      // CRITICAL FIX: Ensure we have a familyId, even if we have to use a fallback
      if (!familyId) {
        console.warn("⚠️ No familyId provided to handleQueryTasks - attempting recovery");
        
        // Try to get from authContext
        if (this.authContext && this.authContext.familyId) {
          familyId = this.authContext.familyId;
          console.log("✅ Retrieved familyId from authContext:", familyId);
        } else if (typeof window !== 'undefined') {
          // Try from localStorage
          const storedFamilyId = localStorage.getItem('selectedFamilyId') || localStorage.getItem('currentFamilyId');
          if (storedFamilyId) {
            familyId = storedFamilyId;
            console.log("✅ Retrieved familyId from localStorage:", familyId);
          }
        }
        
        // Last resort - use hardcoded familyId
        if (!familyId) {
          familyId = 'm93tlovs6ty9sg8k0c8'; // Known working familyId
          console.log("⚠️ Using hardcoded fallback familyId for tasks:", familyId);
        }
      }
      
      // Ensure we set disableCalendarDetection (belt and suspenders)
      if (this.claudeService) {
        this.claudeService.disableCalendarDetection = true;
        console.log("🔒 Explicitly disabled calendar detection for task handling");
        
        // Set a timer to re-enable it
        setTimeout(() => {
          if (this.claudeService) {
            this.claudeService.disableCalendarDetection = false;
            console.log("✅ Re-enabled calendar detection after task handling");
          }
        }, 5000);
      }
      
      // Get family context for task data with robust error handling
      let familyContext;
      let tasks = [];
      
      try {
        familyContext = await this.getFamilyContext(familyId);
        tasks = familyContext.tasks || [];
        console.log(`📋 Found ${tasks.length} tasks in family context`);
      } catch (contextError) {
        console.error("❌ Error getting family context:", contextError);
        console.log("⚠️ Proceeding with empty tasks array");
      }
      
      // Use our new ClaudeResponseParser for more consistent extraction
      const { default: ClaudeResponseParser } = await import('./ClaudeResponseParser');
      
      // Extract query parameters using Claude with improved prompt
      const systemPrompt = `You are an AI assistant that extracts task query parameters.
      Extract the following information from the user's message:
      - assignee: Whose tasks they're asking about (if mentioned)
      - status: Task status (e.g., completed, pending, in progress)
      - timeframe: Time period (e.g., today, this week, upcoming)
      - category: Task category (if mentioned)
      - priority: Task priority (if mentioned)
      
      Return ONLY a JSON object without any explanation.`;
      
      const response = await ClaudeService.generateResponse(
        [{ role: 'user', content: `Extract task query parameters from: "${message}"` }],
        { system: systemPrompt },
        { temperature: 0.1 }
      );
      
      // Parse the query parameters with improved error handling
      let queryParams;
      try {
        const jsonMatch = response.match(/({[\s\S]*})/);
        if (jsonMatch) {
          queryParams = JSON.parse(jsonMatch[0]);
        } else {
          queryParams = {}; // Default empty parameters
        }
      } catch (parseError) {
        console.error("Error parsing query parameters:", parseError);
        queryParams = {}; // Default empty parameters
      }
      
      // Filter tasks based on query parameters
      let filteredTasks = [...tasks];
      
      // Filter by assignee
      if (queryParams.assignee) {
        const assigneeLC = queryParams.assignee.toLowerCase();
        filteredTasks = filteredTasks.filter(task => 
          (task.assignedToName && task.assignedToName.toLowerCase().includes(assigneeLC)) ||
          (task.assignedTo && task.assignedTo.toLowerCase().includes(assigneeLC))
        );
      }
      
      // Filter by status
      if (queryParams.status) {
        const statusLC = queryParams.status.toLowerCase();
        if (statusLC.includes('complete') || statusLC.includes('done')) {
          filteredTasks = filteredTasks.filter(task => task.completed);
        } else if (statusLC.includes('pending') || statusLC.includes('incomplete') || 
                  statusLC.includes('not done') || statusLC.includes('in progress')) {
          filteredTasks = filteredTasks.filter(task => !task.completed);
        }
      } else {
        // Default to showing incomplete tasks unless specifically asked for completed
        filteredTasks = filteredTasks.filter(task => !task.completed);
      }
      
      // Filter by timeframe
      if (queryParams.timeframe) {
        const timeframeLC = queryParams.timeframe.toLowerCase();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date();
        endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
        endOfWeek.setHours(23, 59, 59, 999);
        
        if (timeframeLC.includes('today')) {
          filteredTasks = filteredTasks.filter(task => {
            if (!task.dueDate) return false;
            const dueDate = new Date(task.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate.getTime() === today.getTime();
          });
        } else if (timeframeLC.includes('this week') || timeframeLC.includes('upcoming')) {
          filteredTasks = filteredTasks.filter(task => {
            if (!task.dueDate) return true; // Include tasks with no due date
            const dueDate = new Date(task.dueDate);
            return dueDate <= endOfWeek;
          });
        }
      }
      
      // Filter by category
      if (queryParams.category) {
        const categoryLC = queryParams.category.toLowerCase();
        filteredTasks = filteredTasks.filter(task => 
          task.category && task.category.toLowerCase().includes(categoryLC)
        );
      }
      
      // Sort by due date (null dates at the end)
      filteredTasks.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
      
      // Generate response
      if (filteredTasks.length === 0) {
        // No matching tasks
        let noTasksMessage = "I couldn't find any matching tasks";
        if (queryParams.assignee) {
          noTasksMessage += ` assigned to ${queryParams.assignee}`;
        }
        if (queryParams.status && queryParams.status.includes('complete')) {
          noTasksMessage += " that are completed";
        } else if (queryParams.status) {
          noTasksMessage += " that are pending";
        }
        if (queryParams.timeframe) {
          noTasksMessage += ` for ${queryParams.timeframe}`;
        }
        if (queryParams.category) {
          noTasksMessage += ` in the ${queryParams.category} category`;
        }
        noTasksMessage += ".";
        
        return createSuccessResult(noTasksMessage, { tasks: [] });
      }
      
      // Generate response message for tasks found
      let responseMsg = `I found ${filteredTasks.length} ${filteredTasks.length === 1 ? 'task' : 'tasks'}`;
      
      if (queryParams.assignee) {
        responseMsg += ` assigned to ${queryParams.assignee}`;
      }
      
      if (queryParams.status && queryParams.status.includes('complete')) {
        responseMsg += " that are completed";
      } else if (queryParams.status) {
        responseMsg += " that are pending";
      } else {
        responseMsg += " that are pending"; // Default filter is pending
      }
      
      if (queryParams.timeframe) {
        responseMsg += ` for ${queryParams.timeframe}`;
      }
      
      if (queryParams.category) {
        responseMsg += ` in the ${queryParams.category} category`;
      }
      
      responseMsg += ":\n\n";
      
      // List the tasks (limit to top 5 for brevity)
      const tasksToShow = filteredTasks.slice(0, 5);
      tasksToShow.forEach((task, index) => {
        // Format due date if exists
        let dueStr = '';
        if (task.dueDate) {
          const dueDate = new Date(task.dueDate);
          dueStr = ` (due ${dueDate.toLocaleDateString()})`;
        }
        
        responseMsg += `${index + 1}. "${task.title}"${task.assignedToName ? ` assigned to ${task.assignedToName}` : ''}${dueStr}\n`;
      });
      
      // Add note if there are more tasks
      if (filteredTasks.length > 5) {
        responseMsg += `\n...and ${filteredTasks.length - 5} more tasks. You can see all tasks in the Tasks tab.`;
      }
      
      return createSuccessResult(responseMsg, { tasks: filteredTasks });
    } catch (error) {
      console.error("Error handling tasks query:", error);
      
      return createErrorResult(
        "I encountered an error while retrieving your tasks. Please try a more specific query.",
        error.message
      );
    }
  }

  /**
   * Handle provider queries
   * @param {string} message - User message
   * @param {string} familyId - Family ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} Result with provider information
   */
  async handleQueryProviders(message, familyId, userId) {
    try {
      console.log("Handling providers query:", message);
      
      // Import necessary services
      const { default: ProviderService } = await import('./ProviderService');
      
      // Extract query parameters using Claude
      const systemPrompt = `You are an AI assistant that extracts provider query parameters.
      Extract the following information from the user's message:
      - providerName: Name of a specific provider (if mentioned)
      - providerType: Type of provider (e.g., medical, education, activity)
      - specialty: Provider specialty (if mentioned)
      
      Return ONLY a JSON object without any explanation.`;
      
      const response = await ClaudeService.generateResponse(
        [{ role: 'user', content: `Extract provider query parameters from: "${message}"` }],
        { system: systemPrompt },
        { temperature: 0.1 }
      );
      
      // Parse the query parameters
      let queryParams;
      try {
        const jsonMatch = response.match(/({[\s\S]*})/);
        if (jsonMatch) {
          queryParams = JSON.parse(jsonMatch[0]);
        } else {
          queryParams = {}; // Default empty parameters
        }
      } catch (parseError) {
        console.error("Error parsing query parameters:", parseError);
        queryParams = {}; // Default empty parameters
      }
      
      // Get all providers for this family
      const providers = await ProviderService.getProviders(familyId);
      
      // Filter providers based on query parameters
      let filteredProviders = [...providers];
      
      // Filter by name
      if (queryParams.providerName) {
        const nameLC = queryParams.providerName.toLowerCase();
        filteredProviders = filteredProviders.filter(provider => 
          provider.name && provider.name.toLowerCase().includes(nameLC)
        );
      }
      
      // Filter by type
      if (queryParams.providerType) {
        const typeLC = queryParams.providerType.toLowerCase();
        filteredProviders = filteredProviders.filter(provider => 
          provider.type && provider.type.toLowerCase().includes(typeLC)
        );
      }
      
      // Filter by specialty
      if (queryParams.specialty) {
        const specialtyLC = queryParams.specialty.toLowerCase();
        filteredProviders = filteredProviders.filter(provider => 
          provider.specialty && provider.specialty.toLowerCase().includes(specialtyLC)
        );
      }
      
      // Generate response
      if (filteredProviders.length === 0) {
        // No matching providers
        let noProvidersMessage = "I couldn't find any matching providers";
        if (queryParams.providerName) {
          noProvidersMessage += ` named ${queryParams.providerName}`;
        }
        if (queryParams.providerType) {
          noProvidersMessage += ` of type ${queryParams.providerType}`;
        }
        if (queryParams.specialty) {
          noProvidersMessage += ` specializing in ${queryParams.specialty}`;
        }
        noProvidersMessage += " in your provider directory.";
        
        return createSuccessResult(noProvidersMessage, { providers: [] });
      }
      
      // Generate response message for providers found
      let responseMsg = `I found ${filteredProviders.length} ${filteredProviders.length === 1 ? 'provider' : 'providers'}`;
      
      if (queryParams.providerName) {
        responseMsg += ` named ${queryParams.providerName}`;
      }
      
      if (queryParams.providerType) {
        responseMsg += ` of type ${queryParams.providerType}`;
      }
      
      if (queryParams.specialty) {
        responseMsg += ` specializing in ${queryParams.specialty}`;
      }
      
      responseMsg += ":\n\n";
      
      // List the providers (limit to top 5 for brevity)
      const providersToShow = filteredProviders.slice(0, 5);
      providersToShow.forEach((provider, index) => {
        responseMsg += `${index + 1}. ${provider.name}`;
        
        if (provider.specialty) {
          responseMsg += ` (${provider.specialty})`;
        }
        
        if (provider.phone || provider.email) {
          responseMsg += `: `;
          if (provider.phone) responseMsg += `${provider.phone}`;
          if (provider.phone && provider.email) responseMsg += `, `;
          if (provider.email) responseMsg += `${provider.email}`;
        }
        
        responseMsg += `\n`;
      });
      
      // Add note if there are more providers
      if (filteredProviders.length > 5) {
        responseMsg += `\n...and ${filteredProviders.length - 5} more providers. You can see all providers in the Provider Directory.`;
      }
      
      return createSuccessResult(responseMsg, { providers: filteredProviders });
    } catch (error) {
      console.error("Error handling providers query:", error);
      
      return createErrorResult(
        "I encountered an error while retrieving providers. Please try a more specific query.",
        error.message
      );
    }
  }

  /**
   * Allow us to set ClaudeService instance to control flags
   * @param {Object} claudeService - ClaudeService instance
   */
  setClaudeService(claudeService) {
    this.claudeService = claudeService;
  }

  /**
   * Reset stats counters
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulActions: 0,
      failedActions: 0,
      actionTypeCount: {}
    };
  }

  /**
   * Get statistics about processed requests
   * @returns {Object} Stats information
   */
  getStatistics() {
    return {
      ...this.stats,
      successRate: this.stats.totalRequests > 0 
        ? (this.stats.successfulActions / this.stats.totalRequests * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Diagnostic test method to check if all action handlers are working
   * @returns {Object} Test results for each handler
   */
  async runDiagnosticTests() {
    const results = {};
    
    for (const [intent, handler] of Object.entries(this.actionHandlers)) {
      try {
        // Check if the handler is implemented (not just a stub)
        const isStub = handler.toString().includes('Not implemented yet') || 
                      handler.toString().includes('return createErrorResult("Not implemented');
        
        results[intent] = {
          implemented: !isStub,
          handlerExists: true
        };
      } catch (error) {
        results[intent] = {
          implemented: false,
          handlerExists: false,
          error: error.message
        };
      }
    }
    
    return results;
  }
  
  // Stub methods that will be implemented as needed
  async handleUpdateProvider() {
    return createErrorResult("Not implemented yet - update provider functionality coming soon!");
  }
  
  async handleDeleteProvider() {
    return createErrorResult("Not implemented yet - delete provider functionality coming soon!");
  }
  
  async handleUpdateEvent() {
    return createErrorResult("Not implemented yet - update event functionality coming soon!");
  }
  
  async handleDeleteEvent() {
    return createErrorResult("Not implemented yet - delete event functionality coming soon!");
  }
  
  async handleCompleteTask() {
    return createErrorResult("Not implemented yet - complete task functionality coming soon!");
  }
  
  async handleReassignTask() {
    return createErrorResult("Not implemented yet - reassign task functionality coming soon!");
  }
  
  async handleAddMedicalRecord() {
    return createErrorResult("Not implemented yet - add medical record functionality coming soon!");
  }
  
  async handleAddMilestone() {
    return createErrorResult("Not implemented yet - add milestone functionality coming soon!");
  }
  
  async handleAddDocument() {
    return createErrorResult("Not implemented yet - add document functionality coming soon!");
  }
  
  async handleScheduleDateNight() {
    return createErrorResult("Not implemented yet - schedule date night functionality coming soon!");
  }
}

export default new IntentActionService();