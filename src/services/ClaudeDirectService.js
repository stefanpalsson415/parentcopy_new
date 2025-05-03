// src/services/ClaudeDirectService.js
/**
 * Primary Claude-based understanding service for Allie
 * Processes all user messages through Claude first, before any custom logic
 */
import ClaudeService from './ClaudeService';
import ClaudeResponseParser from './ClaudeResponseParser';
import { ActionTypes } from '../utils/ActionTypes';

class ClaudeDirectService {
  constructor() {
    // Initialize Claude service
    this.claudeService = ClaudeService;
    this.responseParser = ClaudeResponseParser;
    
    // Track service state for debugging
    this.lastProcessedMessage = {
      text: null,
      timestamp: null,
      intent: null
    };
  }

  /**
   * Process a user message directly through Claude
   * @param {string} message - User's message
   * @param {string} familyId - Family identifier
   * @param {Array} context - Previous messages for context
   * @returns {Object} Intent and entity information
   */
  async processMessage(message, familyId, context = []) {
    console.log("🟢 Processing message with Claude-first approach:", message);
    
    try {
      // Step 1: Intent classification with Claude
      const intent = await this.classifyIntent(message);
      console.log("🟢 Claude intent classification result:", intent);
      
      // Step 2: Entity extraction for the identified intent
      const entities = await this.extractEntities(message, intent.type);
      console.log("🟢 Claude entity extraction result:", entities);
      
      // Step 3: Determine if this is an action or information request
      const responseType = await this.determineResponseType(message);
      console.log("🟢 Claude response type analysis:", responseType);
      
      // Update tracking state
      this.lastProcessedMessage = {
        text: message,
        timestamp: new Date().toISOString(),
        intent: intent.type,
        entities
      };
      
      // Return comprehensive understanding results
      return {
        intent: intent.type,
        confidence: intent.confidence,
        action: this.mapIntentToAction(intent.type),
        entities,
        responseType: responseType.type,
        isAction: responseType.type === 'action',
        isInformation: responseType.type === 'information',
        originalMessage: message,
        processed: true
      };
    } catch (error) {
      console.error("❌ Error in Claude-first processing:", error);
      return {
        intent: 'unknown',
        confidence: 0,
        error: error.message,
        processed: false,
        originalMessage: message
      };
    }
  }

  /**
   * Classify the intent of a message using Claude
   * @param {string} message - User message
   * @returns {Object} Intent type and confidence
   */
  async classifyIntent(message) {
    const systemPrompt = `You are the intent classification system for Allie, a family assistant app.
    
TASK: Determine the primary intent of the user's message.

Supported intents:
- ADD_PROVIDER: Adding a provider (doctor, babysitter, coach, teacher, etc)
- ADD_EVENT: Adding a calendar event or appointment
- ADD_TASK: Adding a task or to-do item
- QUERY_CALENDAR: Question about calendar or schedule
- QUERY_PROVIDERS: Question about family providers
- QUERY_TASKS: Question about tasks or to-dos
- SCHEDULE_DATE_NIGHT: Planning couple time 
- TRACK_GROWTH: Recording child growth metrics

CRITICAL RULES:
1. ALWAYS use ONLY one of the exact intent labels listed above
2. ANY request about babysitters is ALWAYS ADD_PROVIDER
3. Be especially attentive to differentiating providers from events

Format your response as a JSON object with:
- intent: The intent label
- confidence: Number from 0-1 indicating confidence level

Example 1: "Can you add a new babysitter for Lily named Martha?"
Response: {"intent": "ADD_PROVIDER", "confidence": 0.95}

Example 2: "Schedule a dentist appointment for next Tuesday at 3pm"
Response: {"intent": "ADD_EVENT", "confidence": 0.9}`;

    try {
      const response = await this.claudeService.generateResponse(
        [{ role: 'user', content: message }],
        { system: systemPrompt },
        { temperature: 0.1 }
      );
      
      // Parse intent from response
      const parsedIntent = this.responseParser.safelyParseJSON(response, {
        intent: 'unknown',
        confidence: 0.3
      });
      
      return {
        type: parsedIntent.intent || 'unknown',
        confidence: parsedIntent.confidence || 0.3,
        rawResponse: response
      };
    } catch (error) {
      console.error("Error classifying intent with Claude:", error);
      return { type: 'unknown', confidence: 0, error: error.message };
    }
  }

  /**
   * Extract entities based on the identified intent
   * @param {string} message - User message
   * @param {string} intentType - The identified intent type
   * @returns {Object} Extracted entities
   */
  async extractEntities(message, intentType) {
    let entityType = 'unknown';
    let extractionPrompt = '';
    
    // Determine entity type and extraction prompt based on intent
    switch (intentType) {
      case 'ADD_PROVIDER':
        entityType = 'provider';
        extractionPrompt = this.getProviderExtractionPrompt();
        break;
        
      case 'ADD_EVENT':
      case 'SCHEDULE_DATE_NIGHT':
        entityType = 'event';
        extractionPrompt = this.getEventExtractionPrompt();
        break;
        
      case 'ADD_TASK':
        entityType = 'task';
        extractionPrompt = this.getTaskExtractionPrompt();
        break;
        
      case 'TRACK_GROWTH':
        entityType = 'growth';
        extractionPrompt = this.getGrowthExtractionPrompt();
        break;
        
      default:
        // For query intents, we don't need detailed extraction
        return { entityType: 'query' };
    }
    
    try {
      const response = await this.claudeService.generateResponse(
        [{ role: 'user', content: message }],
        { system: extractionPrompt },
        { temperature: 0.2 }
      );
      
      // Parse entities from response
      const extractedEntities = this.responseParser.extractEntity(response, entityType);
      
      return {
        ...extractedEntities,
        entityType,
        rawText: message
      };
    } catch (error) {
      console.error(`Error extracting ${entityType} entities:`, error);
      return { entityType, error: error.message };
    }
  }
  
  /**
   * Determine if the message requires an action or is an information request
   * @param {string} message - User message
   * @returns {Object} Response type analysis
   */
  async determineResponseType(message) {
    const systemPrompt = `You are analyzing a user message to determine whether it requires:
1. An ACTION (adding something, changing something, creating something)
2. INFORMATION (answering a question, providing data)
3. CONVERSATION (general chat, greeting, etc.)

Respond with a JSON object containing:
- type: "action", "information", or "conversation"
- confidence: Number from 0-1 indicating confidence level`;

    try {
      const response = await this.claudeService.generateResponse(
        [{ role: 'user', content: message }],
        { system: systemPrompt },
        { temperature: 0.1 }
      );
      
      const analysis = this.responseParser.safelyParseJSON(response, {
        type: 'conversation',
        confidence: 0.5
      });
      
      return analysis;
    } catch (error) {
      console.error("Error determining response type:", error);
      return { type: 'conversation', confidence: 0.5 };
    }
  }
  
  /**
   * Map intent type to action type
   * @param {string} intentType - Intent type from classification
   * @returns {string} Action type for the system
   */
  mapIntentToAction(intentType) {
    const intentToActionMap = {
      'ADD_PROVIDER': ActionTypes.ADD_PROVIDER,
      'ADD_EVENT': ActionTypes.ADD_EVENT,
      'ADD_TASK': ActionTypes.ADD_TASK,
      'QUERY_CALENDAR': ActionTypes.QUERY_CALENDAR,
      'QUERY_PROVIDERS': ActionTypes.QUERY_PROVIDERS,
      'QUERY_TASKS': ActionTypes.QUERY_TASKS,
      'SCHEDULE_DATE_NIGHT': ActionTypes.SCHEDULE_DATE_NIGHT,
      'TRACK_GROWTH': ActionTypes.TRACK_GROWTH
    };
    
    return intentToActionMap[intentType] || null;
  }
  
  // Specialized extraction prompts
  
  getProviderExtractionPrompt() {
    return `You are extracting provider information from a user message.
Extract the following details in JSON format:
- name: Provider's full name
- type: Provider type (medical, childcare, education, coach, etc.)
- specialty: More specific detail (pediatrician, swimming coach, etc.)
- forChild: Which child this provider is for
- email: Provider email if mentioned
- phone: Provider phone if mentioned

IMPORTANT: 
- For babysitters, ALWAYS set type to "childcare"
- Pay special attention to which child the provider is for`;
  }
  
  getEventExtractionPrompt() {
    return `You are extracting calendar event information from a user message.
Extract the following details in JSON format:
- title: Event title/name
- date: Event date (YYYY-MM-DD format)
- time: Start time (HH:MM format, 24-hour)
- endTime: End time if specified (HH:MM format, 24-hour)
- location: Event location if mentioned
- participants: Array of people involved
- description: Brief description

IMPORTANT:
- Be precise with date and time extraction
- If exact time not given, make reasonable inference (e.g., "morning" = 9:00)
- For recurring events, include a "recurrence" field with pattern`;
  }
  
  getTaskExtractionPrompt() {
    return `You are extracting task information from a user message.
Extract the following details in JSON format:
- title: Short task title
- description: Full task description
- assignedTo: Who the task is assigned to
- dueDate: When the task is due (YYYY-MM-DD format)
- priority: Task priority (high, medium, low)
- category: Task category if apparent (household, childcare, etc.)

IMPORTANT:
- Be concise with the title, but descriptive with the description
- If assignedTo isn't specified, set it to null`;
  }
  
  getGrowthExtractionPrompt() {
    return `You are extracting child growth information from a user message.
Extract the following details in JSON format:
- childName: Name of the child
- measurement: Type of measurement (height, weight, etc.)
- value: The numerical value
- unit: The unit (cm, kg, lb, etc.)
- date: When measurement was taken (YYYY-MM-DD format)

IMPORTANT:
- Be precise about which child this is for
- Ensure units are standardized`;
  }
}

export default new ClaudeDirectService();