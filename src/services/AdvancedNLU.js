// src/services/AdvancedNLU.js
import { knowledgeBase } from '../data/AllieKnowledgeBase';

class AdvancedNLU {
  constructor() {
    // Intent patterns with regex and keywords
    this.intentPatterns = {
      // Provider Management
      'provider.add': {
        patterns: [
          /(?:add|create|save|new)\s+(?:a|an)?\s*(?:doctor|provider|pediatrician|dentist|teacher|instructor|coach|tutor|babysitter)/i,
          /(?:save|store|remember|keep track of)\s+(?:doctor|provider|contact|specialist|teacher)/i
        ],
        keywords: ['provider', 'add doctor', 'new doctor', 'save provider', 'add teacher', 'new provider'],
        confidence: 0.8
      },
      'provider.find': {
        patterns: [
          /(?:find|get|show|search|look up)\s+(?:a|an|my|our)?\s*(?:doctor|provider|pediatrician|dentist|teacher|instructor|coach|tutor|babysitter)/i,
          /(?:who is|what is the contact for)\s+(?:my|our|the)?\s*(?:doctor|provider|pediatrician|dentist|teacher)/i
        ],
        keywords: ['find doctor', 'show providers', 'contact information', 'provider details'],
        confidence: 0.7
      },
      
      // Medical System
      'medical.appointment.add': {
        patterns: [
          /(?:add|create|schedule|book|set up)\s+(?:a|an)?\s*(?:doctor|medical|dentist|pediatrician|therapy|checkup|wellness|health)\s*(?:appointment|visit|checkup)/i,
          /(?:need|want)\s+to\s+(?:schedule|book|add|create)\s+(?:a|an)\s+(?:appointment|visit|checkup)/i
        ],
        keywords: ['doctor appointment', 'medical visit', 'schedule checkup', 'book appointment'],
        confidence: 0.85
      },
      'medical.appointment.view': {
        patterns: [
          /(?:show|view|see|find|get|when is|what time is)\s+(?:my|our|the|next|upcoming)\s*(?:doctor|medical|dentist|pediatrician|therapy|checkup|wellness|health)\s*(?:appointment|visit|checkup)/i
        ],
        keywords: ['upcoming appointments', 'next doctor visit', 'medical schedule'],
        confidence: 0.75
      },
      'medical.record.add': {
        patterns: [
          /(?:add|upload|save|store|record)\s+(?:medical|health|vaccine|medication|prescription|diagnosis|treatment|doctor|growth)\s+(?:record|information|data|document|note|history)/i
        ],
        keywords: ['medical record', 'health information', 'save prescription', 'upload doctor notes'],
        confidence: 0.8
      },
      
      // Todo Management
      'task.add': {
        patterns: [
          /(?:add|create|make|new)\s+(?:a|an)?\s*(?:task|to-?do|chore|reminder|assignment)/i,
          /(?:remind me|i need|we need|don't forget)\s+to\s+(?:\w+\s+){1,10}/i,
          /(?:need|want|have)\s+to\s+(?:remember|do|complete|finish)/i
        ],
        keywords: ['add task', 'create todo', 'new chore', 'remind me to'],
        confidence: 0.8
      },
      'task.list': {
        patterns: [
          /(?:show|list|view|get|what are|tell me)\s+(?:my|our|the|all|pending|remaining|current|this week'?s|today'?s)?\s*(?:tasks|to-?dos?|chores|reminders|assignments)/i,
          /(?:what|which)\s+(?:tasks|to-?dos?|chores|things)\s+(?:do I|do we|are|should be)\s+(?:have|need)\s+to\s+(?:do|complete|finish)/i
        ],
        keywords: ['show tasks', 'view todos', 'pending chores', 'my tasks'],
        confidence: 0.75
      },
      'task.complete': {
        patterns: [
          /(?:mark|set|complete|finish|done with|check off)\s+(?:task|to-?do|chore|reminder|assignment)\s+(?:as)?\s*(?:complete|completed|done|finished)/i,
          /(?:i|we)\s+(?:finished|completed|did|have done)\s+(?:the|a|an)?\s*(?:task|to-?do|chore|assignment)/i
        ],
        keywords: ['mark complete', 'finished task', 'done with chore'],
        confidence: 0.8
      },
      
      // Relationship Features
      'relationship.date': {
        patterns: [
          /(?:plan|create|suggest|recommend|need|want|book|organize)\s+(?:a|an)?\s*(?:date|date night|evening out|dinner date|romantic|getaway)/i,
          /(?:what should we|where should we|when can we)\s+(?:do|go|have)\s+(?:for|on)\s+(?:date|date night)/i
        ],
        keywords: ['date night', 'plan date', 'romantic evening', 'dinner date'],
        confidence: 0.8
      },
      'relationship.gratitude': {
        patterns: [
          /(?:send|create|write|express)\s+(?:a|an)?\s*(?:gratitude|thank you|appreciation|thank|thankful)\s+(?:message|note|text)/i,
          /(?:tell|let)\s+(?:my|spouse|partner|wife|husband)\s+(?:know|that)\s+(?:i|we)\s+(?:appreciate|am grateful|am thankful)/i
        ],
        keywords: ['gratitude message', 'appreciation note', 'thank partner'],
        confidence: 0.75
      },
      'relationship.checkin': {
        patterns: [
          /(?:schedule|create|set up|add|plan)\s+(?:a|an)?\s*(?:checkin|check-in|check in|relationship talk|couple talk|couple time)/i,
          /(?:when|how|should)\s+(?:we|i)\s+(?:do|have|schedule)\s+(?:our|a|an)\s+(?:relationship check-in|couple discussion)/i
        ],
        keywords: ['relationship check-in', 'couple discussion', 'partner talk'],
        confidence: 0.7
      }
    };
    
    // Entity extraction patterns
    this.entityPatterns = {
      childName: {
        pattern: /\b(?:for|with)\s+([A-Z][a-z]+)(?:\s|$|\W)/g,
        validate: (match, familyMembers) => {
          if (!familyMembers) return true;
          const childName = match[1];
          return familyMembers.some(m => 
            m.role === 'child' && 
            m.name.toLowerCase() === childName.toLowerCase()
          );
        }
      },
      date: {
        pattern: /\b(?:on|for)\s+((?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|tomorrow|today|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month)|this\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend))/gi
      },
      time: {
        pattern: /\b(?:at|from)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)|noon|midnight|\d{1,2}\s*o'?clock)/gi
      },
      location: {
        pattern: /\b(?:at|in)\s+([A-Z][a-z]+(?:'s)?(?: [A-Z][a-z]+){0,3}|(?:the|a|an) [A-Z][a-z]+(?: [A-Z][a-z]+){0,3})/gi
      },
      providerSpecialty: {
        pattern: /\b(pediatrician|dentist|orthodontist|dermatologist|allergist|psychiatrist|psychologist|therapist|physical therapist|surgeon|specialist|physician|doctor|nurse practitioner|piano teacher|math tutor|swimming instructor|coach|teacher)\b/gi
      },
      providerName: {
        pattern: /\b(?:Dr\.?|Doctor|Prof\.?|Professor)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g
      }
    };
  }

  /**
   * Detect the primary intent from user message with confidence scoring
   * @param {string} message - User message
   * @returns {object} - Detected intent with confidence score
   */
  detectIntent(message) {
    if (!message) return { intent: 'unknown', confidence: 0 };
    
    let bestMatch = { intent: 'unknown', confidence: 0.3 };
    
    // Check against all intent patterns
    for (const [intent, data] of Object.entries(this.intentPatterns)) {
      let matchScore = 0;
      
      // Check regex patterns
      for (const pattern of data.patterns) {
        if (pattern.test(message)) {
          matchScore += 0.5;
          break; // If any pattern matches, add the score and move on
        }
      }
      
      // Check keywords
      for (const keyword of data.keywords) {
        if (message.toLowerCase().includes(keyword.toLowerCase())) {
          matchScore += 0.3;
          break; // If any keyword matches, add the score and move on
        }
      }
      
      // Apply intent-specific confidence
      matchScore *= data.confidence;
      
      // Update best match if this intent has a higher score
      if (matchScore > bestMatch.confidence) {
        bestMatch = { intent, confidence: matchScore };
      }
    }
    
    return bestMatch;
  }

  /**
   * Extract entities from user message
   * @param {string} message - User message
   * @param {Array} familyMembers - Family members for validation
   * @returns {object} - Extracted entities
   */
  extractEntities(message, familyMembers = []) {
    const entities = {};
    
    // Extract entities based on patterns
    for (const [entityType, entityData] of Object.entries(this.entityPatterns)) {
      const { pattern, validate } = entityData;
      
      // Reset regex lastIndex
      pattern.lastIndex = 0;
      
      const matches = [];
      let match;
      
      while ((match = pattern.exec(message)) !== null) {
        // Skip if validation function exists and returns false
        if (validate && !validate(match, familyMembers)) {
          continue;
        }
        
        matches.push(match[1]);
      }
      
      if (matches.length > 0) {
        entities[entityType] = matches;
      }
    }
    
    return entities;
  }

  /**
   * Get combined info about message intention and entities
   * @param {string} message - User message
   * @param {Array} familyMembers - Family members for validation
   * @returns {object} - Intent and entities analysis
   */
  analyzeMessage(message, familyMembers = []) {
    const intentInfo = this.detectIntent(message);
    const entities = this.extractEntities(message, familyMembers);
    
    return {
      ...intentInfo,
      entities,
      category: intentInfo.intent.split('.')[0],
      action: intentInfo.intent.split('.').slice(1).join('.')
    };
  }

  /**
   * Get FAQ response if message matches a known question
   * @param {string} message - User message
   * @returns {string|null} - FAQ response or null if no match
   */
  getFAQResponse(message) {
    const normalizedMsg = message.toLowerCase().trim().replace(/[?.,!]/g, '');
    
    // Check direct matches in FAQ database
    for (const [question, answer] of Object.entries({...knowledgeBase.faqs, ...knowledgeBase.childTrackingFaqs})) {
      const normalizedQuestion = question.toLowerCase().trim().replace(/[?.,!]/g, '');
      
      if (normalizedMsg === normalizedQuestion || 
          normalizedMsg.includes(normalizedQuestion)) {
        return answer;
      }
    }
    
    return null;
  }
}

export default new AdvancedNLU();