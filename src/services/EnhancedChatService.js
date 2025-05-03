// src/services/EnhancedChatService.js
import { db, auth } from './firebase';
import ClaudeService from './ClaudeService';
import ClaudeDirectService from './ClaudeDirectService'; // Import our new Claude-first service
import EnhancedNLU from './EnhancedNLU';
import CalendarService from './CalendarService';
import { knowledgeBase } from '../data/AllieKnowledgeBase';
import ProviderService from './ProviderService';
import ConsolidatedNLU from './ConsolidatedNLU';
import ProviderChatService from './ProviderChatService';
import MedicalChatService from './MedicalChatService';
import TaskChatService from './TaskChatService';
import RelationshipChatService from './RelationshipChatService';
import IntentClassifier from './IntentClassifier';
import ConversationContext from './ConversationContext';
import FeedbackLearningSystem from './FeedbackLearningSystem';
import ChatPersistenceService from './ChatPersistenceService';
import IntentActionService from './IntentActionService';

import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  getDoc,
  setDoc,
  updateDoc,
  doc, 
  limit, 
  serverTimestamp,
  arrayUnion,
  increment,
  Timestamp
} from 'firebase/firestore';

class EnhancedChatService {
  constructor() {
    this.nlu = new EnhancedNLU();
    this.conversationContext = {};
    this.sessionIntents = {};
    this.feedbackLog = {};
    this.recentResponses = [];
    
    // Initialize authContext for Firebase operations
    this.authContext = {
      userId: null,
      familyId: null,
      timestamp: Date.now()
    };
    
    // Add a reference to current user from auth
    if (auth.currentUser) {
      this.currentUser = auth.currentUser;
      this.authContext.userId = auth.currentUser.uid;
      console.log("👤 EnhancedChatService initialized with user:", auth.currentUser.uid);
      
      // Try to get familyId from localStorage
      if (typeof window !== 'undefined') {
        const storedFamilyId = localStorage.getItem('selectedFamilyId') || localStorage.getItem('currentFamilyId');
        if (storedFamilyId) {
          this.authContext.familyId = storedFamilyId;
          console.log("👪 Initialized with familyId from localStorage:", storedFamilyId);
        }
      }
    }
    
    // Initialize ClaudeDirectService
    this.claudeDirectService = ClaudeDirectService;
    console.log("🧠 ClaudeDirectService initialized as primary understanding layer");
    
    // Listen for auth state changes
    auth.onAuthStateChanged(user => {
      this.currentUser = user;
      if (user) {
        this.authContext.userId = user.uid;
        this.authContext.timestamp = Date.now();
      } else {
        this.authContext.userId = null;
      }
      console.log("👤 EnhancedChatService updated auth state:", user?.uid);
    });
  }
  
  /**
   * Set authentication context for Firebase operations
   * @param {object} authContext - Auth context with userId and familyId
   */
  setAuthContext(authContext) {
    if (!authContext) return;
    
    console.log("🔐 Setting auth context in EnhancedChatService:", {
      userId: authContext.userId,
      familyId: authContext.familyId,
      hasValues: !!authContext.userId || !!authContext.familyId
    });
    
    this.authContext = {
      ...this.authContext,
      ...authContext,
      lastUpdated: Date.now()
    };
    
    // Save the userId for direct Firebase operations
    if (authContext.userId) {
      console.log("🔐 Updated userId in EnhancedChatService:", authContext.userId);
    }
    
    if (authContext.familyId) {
      console.log("🔐 Updated familyId in EnhancedChatService:", authContext.familyId);
    }
  }
  
  /**
   * Get AI response for a user message using the Claude-first approach
   * @param {string} message - User message
   * @param {string} familyId - Family ID
   * @param {Array} context - Previous messages for context
   * @returns {Promise<string>} AI response
   */
  async getAIResponse(message, familyId, context = []) {
    console.log("✨ EnhancedChatService.getAIResponse - Using Claude-first approach");
    console.log("🔍 Processing: ", message.substring(0, 100) + (message.length > 100 ? "..." : ""));
    
    try {
      if (!familyId) {
        console.warn("⚠️ No familyId provided to getAIResponse - Using fallbacks");
        familyId = this.authContext?.familyId || 
                 (typeof window !== 'undefined' && localStorage.getItem('selectedFamilyId')) || 
                 (typeof window !== 'undefined' && localStorage.getItem('currentFamilyId'));
                 
        if (!familyId) {
          console.error("❌ Could not determine familyId from any source");
          return "I'm having trouble accessing your family information. Please try again or reload the page.";
        }
      }
      
      // Get family context for personalization
      const familyContext = await this.getFamilyContext(familyId);
      
      // STEP 1: Process message with Claude-first approach
      const claudeProcessingResult = await this.claudeDirectService.processMessage(
        message, 
        familyId, 
        context
      );
      
      console.log("✅ Claude-first processing result:", claudeProcessingResult);
      
      // STEP 2: If an intent was successfully identified with high confidence, 
      // route to the appropriate handler
      if (claudeProcessingResult.intent && 
          claudeProcessingResult.confidence > 0.7 && 
          claudeProcessingResult.action) {
        
        // Try to handle the intent with IntentActionService
        const result = await IntentActionService.processUserRequest(
          message,
          familyId,
          this.authContext?.userId,
          claudeProcessingResult
        );
        
        if (result && result.success) {
          console.log("✅ IntentActionService successfully handled the intent");
          return result.message;
        }
        
        // If IntentActionService couldn't handle it, try specialized handlers
        const handlerResult = await this.routeToSpecializedHandler(
          message, 
          familyContext, 
          claudeProcessingResult
        );
        
        if (handlerResult) {
          console.log("✅ Specialized handler processed the intent");
          return handlerResult;
        }
      }
      
      // STEP 3: If no intent was identified or handlers couldn't process it,
      // fall back to Claude for a general response
      console.log("🔄 No specialized handler matched, falling back to Claude for general response");
      
      // Create comprehensive context for Claude
      const systemContext = this.createSystemContext(familyContext, context);
      
      // Generate Claude response
      const response = await ClaudeService.generateResponse(
        [{ role: 'user', content: message }],
        systemContext,
        { temperature: 0.7 }
      );
      
      console.log("🤖 Generated general Claude response");
      return response;
    } catch (error) {
      console.error("❌ Error in getAIResponse:", error);
      return "I'm sorry, I encountered an error processing your request. Please try again.";
    }
  }
  
  /**
   * Route to specialized handlers based on intent
   * @param {string} message - User message
   * @param {object} familyContext - Family context
   * @param {object} claudeResult - Claude processing result
   * @returns {Promise<string|null>} Handler response or null
   */
  async routeToSpecializedHandler(message, familyContext, claudeResult) {
    const intent = claudeResult.intent;
    const entities = claudeResult.entities;
    const userId = this.authContext?.userId;
    const familyId = familyContext.familyId;
    
    // Use a map of intent-to-handler functions
    const intentHandlers = {
      'ADD_PROVIDER': () => this.handleProviderRequest(message, familyContext, entities),
      'ADD_EVENT': () => this.handleCalendarRequest(message, familyContext, userId),
      'SCHEDULE_DATE_NIGHT': () => this.handleRelationshipRequest(message, familyContext, userId),
      'ADD_TASK': () => this.handleTaskRequest(message, familyContext, entities),
      'TRACK_GROWTH': () => this.handleChildTrackingRequest(message, familyContext),
      'QUERY_CALENDAR': () => this.lookupCalendarEvent(message, familyId, userId),
      'QUERY_PROVIDERS': () => this.lookupProvider(message, familyId)
    };
    
    // Call the appropriate handler if available
    if (intentHandlers[intent]) {
      try {
        const result = await intentHandlers[intent]();
        return result;
      } catch (error) {
        console.error(`Error in ${intent} handler:`, error);
        return null;
      }
    }
    
    return null;
  }
  
  /**
   * Create system context for Claude
   * @param {object} familyContext - Family context
   * @param {Array} messageContext - Previous messages
   * @returns {object} System context
   */
  createSystemContext(familyContext, messageContext = []) {
    // Create a comprehensive system context for Claude
    const systemContext = {
      system: `You are Allie, a thoughtful and insightful family assistant. 
      
You help families with balance, coordination, and organization.

FAMILY CONTEXT:
Family Name: ${familyContext.familyName || 'Your family'}
Adults: ${familyContext.adults || 2}
Children: ${familyContext.children?.length || 0}
Current Week: ${familyContext.currentWeek || 1}

KEY FAMILY MEMBERS:
${familyContext.familyMembers?.map(m => `- ${m.name} (${m.role})`).join('\n') || 'Your family members'}

RELATIONSHIP CONTEXT:
${familyContext.relationshipData ? `
- Top strategy: ${familyContext.relationshipData.topStrategy || 'Improving communication'}
- Implementation level: ${Math.round(familyContext.relationshipData.avgImplementation || 0)}%
` : 'No relationship data available yet'}

IMPORTANT:
- Be conversational and friendly, not formal or robotic
- Keep responses concise (1-3 paragraphs) unless the user asks for detail
- Provide practical, actionable suggestions when appropriate
- Balance emotional support with practical organization
- Respect family privacy and be supportive of all family structures
- Ground your responses in the specific family context provided above
- Answer in first person as Allie, the family assistant
`,
      userId: this.authContext?.userId,
      familyId: familyContext.familyId,
      messageContext: messageContext.slice(-5) // Last 5 messages for context
    };
    
    return systemContext;
  }

  // [All original handler methods remain unchanged]

  // [Other methods like getFamilyContext remain unchanged]
}

export default new EnhancedChatService();