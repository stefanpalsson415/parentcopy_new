// src/services/ConversationContext.js
class ConversationContext {
    constructor() {
      this.conversations = {};
      this.sessionDuration = 30 * 60 * 1000; // 30 minutes
      this.maxTopicsPerConversation = 10;
      this.maxEntitiesPerType = 20;
    }
  
    /**
     * Initialize or retrieve a conversation context for a family
     * @param {string} familyId - The family identifier
     * @returns {object} - The conversation context object
     */
    getContext(familyId) {
      // Clean up expired sessions
      this.cleanupExpiredSessions();
      
      // Create new context if it doesn't exist
      if (!this.conversations[familyId]) {
        this.conversations[familyId] = this.createNewContext();
      }
      
      // Update last access time
      this.conversations[familyId].lastAccessed = Date.now();
      
      return this.conversations[familyId];
    }
  
    /**
     * Creates a new conversation context
     * @returns {object} - A new context object
     */
    createNewContext() {
      return {
        sessionStartTime: Date.now(),
        lastAccessed: Date.now(),
        topics: [],
        entities: {},
        messageCount: 0,
        intentHistory: [],
        userQuestions: [],
        openLoops: [], // Unresolved questions or tasks
        recentReferences: {}, // Tracks pronouns and references
        feedback: [], // User feedback on responses
        currentFocus: null // Current topic of conversation
      };
    }
  
    /**
     * Update conversation context with new message information
     * @param {string} familyId - The family identifier
     * @param {object} messageInfo - Information about the message
     * @returns {object} - Updated conversation context
     */
    updateContext(familyId, messageInfo) {
      const context = this.getContext(familyId);
      
      // Increment message count
      context.messageCount++;
      
      // Update topics - keep most recent first
      if (messageInfo.topic) {
        context.topics = [messageInfo.topic, ...context.topics.filter(t => t !== messageInfo.topic)]
          .slice(0, this.maxTopicsPerConversation);
      }
      
      // Update intent history
      if (messageInfo.intent) {
        context.intentHistory.unshift({
          intent: messageInfo.intent,
          confidence: messageInfo.confidence || 0,
          timestamp: Date.now()
        });
        
        // Trim intent history to last 20
        context.intentHistory = context.intentHistory.slice(0, 20);
      }
      
      // Merge entities
      if (messageInfo.entities) {
        Object.entries(messageInfo.entities).forEach(([type, values]) => {
          if (!context.entities[type]) {
            context.entities[type] = [];
          }
          
          // Add new entities, avoiding duplicates
          const updatedEntities = [...new Set([...values, ...context.entities[type]])];
          context.entities[type] = updatedEntities.slice(0, this.maxEntitiesPerType);
        });
      }
      
      // Track questions
      if (messageInfo.isQuestion) {
        context.userQuestions.push({
          question: messageInfo.text,
          timestamp: Date.now(),
          answered: false
        });
      }
      
      // Update focus area if there's a strong intent match
      if (messageInfo.intent && messageInfo.confidence > 0.7) {
        context.currentFocus = messageInfo.intent.split('.')[0]; // Use main category
      }
      
      // Track references and pronouns
      if (messageInfo.references) {
        Object.entries(messageInfo.references).forEach(([type, entity]) => {
          context.recentReferences[type] = entity;
        });
      }
      
      return context;
    }
  
    /**
     * Resolves a question in the conversation
     * @param {string} familyId - The family identifier
     * @param {number} questionIndex - Index of the question being answered
     */
    resolveQuestion(familyId, questionIndex) {
      const context = this.getContext(familyId);
      
      if (context.userQuestions[questionIndex]) {
        context.userQuestions[questionIndex].answered = true;
      }
    }
  
    /**
     * Add user feedback to the conversation context
     * @param {string} familyId - The family identifier
     * @param {string} messageId - Message ID that received feedback
     * @param {string} feedbackType - Type of feedback (helpful, unhelpful, etc.)
     * @param {string} details - Optional feedback details
     */
    addFeedback(familyId, messageId, feedbackType, details = null) {
      const context = this.getContext(familyId);
      
      context.feedback.push({
        messageId,
        type: feedbackType,
        details,
        timestamp: Date.now()
      });
    }
  
    /**
     * Get the prominent entities in the conversation
     * @param {string} familyId - The family identifier
     * @returns {object} - Object with top entities by type
     */
    getProminent(familyId) {
      const context = this.getContext(familyId);
      const result = {};
      
      // Get the most recently mentioned entity of each type
      Object.entries(context.entities).forEach(([type, entities]) => {
        if (entities.length > 0) {
          result[type] = entities[0];
        }
      });
      
      return result;
    }
  
    /**
     * Get the dominant intent category for the conversation
     * @param {string} familyId - The family identifier
     * @returns {string|null} - The dominant intent category or null
     */
    getDominantIntent(familyId) {
      const context = this.getContext(familyId);
      
      if (!context.intentHistory.length) {
        return null;
      }
      
      // Count intent categories
      const categories = {};
      context.intentHistory.forEach(item => {
        const category = item.intent.split('.')[0];
        categories[category] = (categories[category] || 0) + 1;
      });
      
      // Find the most frequent category
      return Object.entries(categories)
        .sort((a, b) => b[1] - a[1])[0][0];
    }
  
    /**
     * Clean up expired conversation sessions
     */
    cleanupExpiredSessions() {
      const now = Date.now();
      Object.keys(this.conversations).forEach(familyId => {
        const lastAccessed = this.conversations[familyId].lastAccessed;
        if (now - lastAccessed > this.sessionDuration) {
          delete this.conversations[familyId];
        }
      });
    }
  
    /**
     * Get conversation summary for context injection
     * @param {string} familyId - The family identifier
     * @returns {object} - Conversation summary for AI context
     */
    getConversationSummary(familyId) {
      const context = this.getContext(familyId);
      
      return {
        topics: context.topics.slice(0, 5),
        messageCount: context.messageCount,
        dominantIntent: this.getDominantIntent(familyId),
        openQuestions: context.userQuestions.filter(q => !q.answered).map(q => q.question),
        prominentEntities: this.getProminent(familyId),
        currentFocus: context.currentFocus
      };
    }
  }
  
  export default new ConversationContext();