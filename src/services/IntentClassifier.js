// src/services/IntentClassifier.js
import ConsolidatedNLU from './ConsolidatedNLU';
import ConversationContext from './ConversationContext';

class IntentClassifier {
  constructor() {
    this.nlu = ConsolidatedNLU;
    this.context = ConversationContext;
    this.intentConfidenceThreshold = 0.6;
    
    // Additional specialized intents that build on AdvancedNLU
    this.specializedIntents = {
      // Disambiguation intents
      'clarification.who': {
        patterns: [
          /(?:which|what|who)\s+(?:one|person|child|kid|family member)/i,
          /(?:do you mean|are you referring to|are you talking about)\s+([A-Za-z]+)/i
        ],
        confidence: 0.85
      },
      'clarification.when': {
        patterns: [
          /(?:which|what)\s+(?:date|day|time)/i,
          /(?:do you mean|are you referring to|are you talking about)\s+(?:today|tomorrow|this weekend)/i
        ],
        confidence: 0.85
      },
      
      // Meta-conversation intents
      'conversation.feedback': {
        patterns: [
          /(?:that(?:'s| is| was)|this is)\s+(?:not right|wrong|incorrect|unhelpful|not helpful|confusing)/i,
          /(?:you're|you are|that's|that is)\s+(?:right|correct|helpful)/i
        ],
        confidence: 0.8
      },
      'conversation.thanks': {
        patterns: [
          /(?:thank you|thanks|thx|ty|thank)/i
        ],
        confidence: 0.9
      },
      
      // Context-dependent intents
      'context.continue': {
        patterns: [
          /(?:tell me more|continue|go on|proceed|what else|and)/i,
          /^(?:yes|yeah|sure|okay|ok|yep|continue)$/i
        ],
        confidence: 0.7
      },
      'context.previous': {
        patterns: [
          /(?:go back|back to|return to|about|regarding)\s+(?:the|our|that|what we were)\s+(?:previous|earlier|before)/i,
          /(?:let's|can we|i want to)\s+(?:talk|discuss|go back to)\s+(?:about|to)?\s+([A-Za-z]+)/i
        ],
        confidence: 0.7
      }
    };
  }

  /**
   * Enhanced intent detection using both pattern matching and conversation context
   * @param {string} message - The user message
   * @param {string} familyId - The family identifier for context
   * @param {object} familyContext - Additional family data
   * @returns {object} - Classified intent with confidence
   */
  classifyIntent(message, familyId, familyContext = {}) {
    // Get basic intent classification from AdvancedNLU
    const baseIntent = this.nlu.detectIntent(message);
    
    // Check for specialized intents
    let specialIntent = { intent: 'unknown', confidence: 0 };
    
    for (const [intent, data] of Object.entries(this.specializedIntents)) {
      for (const pattern of data.patterns) {
        if (pattern.test(message)) {
          specialIntent = { 
            intent, 
            confidence: data.confidence 
          };
          break;
        }
      }
      
      if (specialIntent.confidence > 0) break;
    }
    
    // Get conversation context
    const convoContext = this.context.getContext(familyId);
    
    // Apply context-aware adjustments to confidence scores
    let adjustedBaseIntent = this.adjustConfidenceWithContext(
      baseIntent, 
      convoContext,
      familyContext
    );
    
    // Choose the highest confidence intent
    let finalIntent = (specialIntent.confidence > adjustedBaseIntent.confidence) 
      ? specialIntent 
      : adjustedBaseIntent;
    
    // Add intent history to enhance future classifications
    if (finalIntent.confidence >= this.intentConfidenceThreshold) {
      this.context.updateContext(familyId, {
        intent: finalIntent.intent,
        confidence: finalIntent.confidence,
        text: message
      });
    }
    
    return {
      ...finalIntent,
      category: finalIntent.intent.split('.')[0],
      action: finalIntent.intent.split('.').slice(1).join('.'),
      basedOnContext: finalIntent !== baseIntent && finalIntent !== specialIntent
    };
  }

  /**
   * Adjust intent confidence based on conversation context
   * @param {object} intent - Base intent with confidence
   * @param {object} convoContext - Conversation context
   * @param {object} familyContext - Family data context
   * @returns {object} - Adjusted intent with confidence
   */
  adjustConfidenceWithContext(intent, convoContext, familyContext) {
    const result = { ...intent };
    
    // 1. Check if we're continuing the same topic
    if (convoContext.currentFocus && 
        result.intent.startsWith(convoContext.currentFocus) && 
        result.confidence > 0.4) {
      // Boost confidence for continuing the same topic
      result.confidence = Math.min(result.confidence + 0.2, 0.95);
    }
    
    // 2. Check recent intent history for patterns
    if (convoContext.intentHistory.length > 0) {
      const recentIntents = convoContext.intentHistory.slice(0, 3);
      
      // If the last 2+ intents were in the same category as this one, increase confidence
      const sameCategory = recentIntents.filter(i => 
        i.intent.split('.')[0] === result.intent.split('.')[0]
      );
      
      if (sameCategory.length >= 2 && result.confidence > 0.3) {
        result.confidence = Math.min(result.confidence + 0.15, 0.95);
      }
      
      // Check for clarification follow-ups
      const lastIntent = recentIntents[0]?.intent;
      if (lastIntent && 
          (result.intent === 'clarification.who' || 
           result.intent === 'clarification.when') &&
           result.confidence > 0.5) {
        result.confidence = Math.min(result.confidence + 0.3, 0.95);
        result.previousIntent = lastIntent;
      }
    }
    
    // 3. Boost confidence for intents that match available family data
    if (familyContext) {
      // If this is a child-related intent and we have children data
      if (result.intent.startsWith('child.') && 
          familyContext.children && 
          familyContext.children.length > 0) {
        result.confidence = Math.min(result.confidence + 0.1, 0.9);
      }
      
      // If this is a survey-related intent and we have survey data
      if ((result.intent.startsWith('survey.') || result.intent.startsWith('balance.')) && 
          familyContext.surveyData && 
          Object.keys(familyContext.surveyData).length > 0) {
        result.confidence = Math.min(result.confidence + 0.1, 0.9);
      }
      
      // If this is a task intent and we have tasks
      if (result.intent.startsWith('task.') && 
          familyContext.tasks && 
          familyContext.tasks.length > 0) {
        result.confidence = Math.min(result.confidence + 0.1, 0.9);
      }
    }
    
    return result;
  }

  /**
   * Analyze a message with both intent and entity extraction, enhanced with context
   * @param {string} message - User message
   * @param {string} familyId - Family identifier
   * @param {object} familyContext - Family data
   * @returns {object} - Complete message analysis
   */
  analyzeMessage(message, familyId, familyContext = {}) {
    // Get intent
    const intentInfo = this.classifyIntent(message, familyId, familyContext);
    
    // Extract entities
    const entities = this.nlu.extractEntities(message, familyContext.familyMembers);
    
    // Check if this is a question
    const isQuestion = /\?$/.test(message.trim()) || 
                      /^(?:who|what|when|where|why|how|is|are|can|could|would|will|should)/i.test(message.trim());
    
    // Update conversation context
    this.context.updateContext(familyId, {
      text: message,
      intent: intentInfo.intent,
      confidence: intentInfo.confidence,
      entities,
      isQuestion,
      topic: this.extractTopic(message),
      references: this.extractReferences(message, familyContext)
    });
    
    return {
      ...intentInfo,
      entities,
      isQuestion,
      conversationContext: this.context.getConversationSummary(familyId)
    };
  }

  /**
   * Extract the main topic of a message
   * @param {string} message - The message text
   * @returns {string|null} - Extracted topic or null
   */
  extractTopic(message) {
    // Simple topic extraction based on noun phrases
    // This is a simplified version - in a real application, 
    // you would use more sophisticated NLP techniques
    
    const topicPatterns = [
      // Questions about topics
      /(?:about|regarding|concerning|on the topic of)\s+([a-z]+(?:\s+[a-z]+){0,3})/i,
      // "I want to talk about X"
      /(?:want|like|need)\s+to\s+(?:talk|discuss|know|learn)\s+(?:about|regarding)?\s+([a-z]+(?:\s+[a-z]+){0,3})/i,
      // Direct mentions of topics
      /my\s+([a-z]+(?:\s+[a-z]+){0,2})/i,
      /the\s+([a-z]+(?:\s+[a-z]+){0,2})/i
    ];
    
    for (const pattern of topicPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].toLowerCase();
      }
    }
    
    return null;
  }

  /**
   * Extract references like pronouns from a message
   * @param {string} message - The message text
   * @param {object} familyContext - Family context with members
   * @returns {object} - Extracted references
   */
  extractReferences(message, familyContext) {
    const references = {};
    
    // Extract referenced children
    if (familyContext.children && familyContext.children.length > 0) {
      // Check for direct mentions
      familyContext.children.forEach(child => {
        if (message.toLowerCase().includes(child.name.toLowerCase())) {
          references.child = child.name;
        }
      });
      
      // Check for pronouns if we have a single child
      if (familyContext.children.length === 1 && 
          !references.child && 
          /\b(?:he|she|him|her|they|them|my child|my kid)\b/i.test(message)) {
        references.child = familyContext.children[0].name;
      }
    }
    
    // Extract referenced parents
    if (familyContext.familyMembers) {
      const parents = familyContext.familyMembers.filter(m => m.role === 'parent');
      
      parents.forEach(parent => {
        if (message.toLowerCase().includes(parent.name.toLowerCase())) {
          references.parent = parent.name;
        } else if (parent.roleType && message.toLowerCase().includes(parent.roleType.toLowerCase())) {
          references.parent = parent.name;
        }
      });
    }
    
    return references;
  }
}

export default new IntentClassifier();