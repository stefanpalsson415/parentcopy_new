// src/services/ConsolidatedNLU.js
import { knowledgeBase } from '../data/AllieKnowledgeBase';

class ConsolidatedNLU {
  constructor() {
    this.initializeIntentPatterns();
    this.initializeEntityPatterns();
    this.initializeSentimentPatterns();
    
    // Initialize specialized intents from the advanced implementation
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
      },
      
      // Calendar-related intents from EnhancedNLU
      'calendar.add': {
        patterns: [
          /\b(?:add|create|put|place)\b.+\b(?:calendar|schedule)\b/i,
          /\b(?:schedule|book|arrange)\b.+\b(?:appointment|meeting|event)\b/i,
          /\bremind me\b.+\b(?:on|at|about)\b/i
        ],
        keywords: ['add to calendar', 'schedule event', 'create appointment'],
        confidence: 0.8
      },
      'calendar.check': {
        patterns: [
          /\b(?:what|when|where).+\b(?:calendar|schedule|agenda)\b/i,
          /\b(?:do I have|is there)\b.+\b(?:scheduled|planned|on my calendar)\b/i,
          /\b(?:show|view|check|look at)\b.+\b(?:calendar|schedule|agenda)\b/i
        ],
        keywords: ['check calendar', 'view schedule', 'upcoming events'],
        confidence: 0.75
      },
      
      // Child-related intents
      'child.add_appointment': {
        patterns: [
          /\b(?:add|schedule|book)\b.+\b(?:appointment|doctor|dentist|checkup)\b.+\b(?:for|with)\b.+\b(?:child|kid|son|daughter)\b/i,
          /\b(?:my child|my kid|my son|my daughter)\b.+\b(?:appointment|doctor|dentist|checkup)\b/i
        ],
        keywords: ['child appointment', 'kids doctor', 'child checkup'],
        confidence: 0.85
      },
      'child.track_growth': {
        patterns: [
          /\b(?:track|record|log|document)\b.+\b(?:growth|height|weight|measurements)\b/i,
          /\b(?:my child|my kid|my son|my daughter)\b.+\b(?:grew|growth|taller|weight|measure|size)\b/i
        ],
        keywords: ['child growth', 'height tracking', 'weight measurement'],
        confidence: 0.8
      },
      
      // Clarification intents
      'clarification.who': {
        patterns: [
          /(?:which|what|who)\s+(?:one|person|child|kid|family member)/i,
          /(?:do you mean|are you referring to|are you talking about)\s+([A-Za-z]+)/i
        ],
        keywords: ['which one', 'who specifically', 'which family member'],
        confidence: 0.85
      },
      'clarification.when': {
        patterns: [
          /(?:which|what)\s+(?:date|day|time)/i,
          /(?:do you mean|are you referring to|are you talking about)\s+(?:today|tomorrow|this weekend)/i
        ],
        keywords: ['which date', 'what time specifically', 'which day'],
        confidence: 0.85
      },
      
      // Meta-conversation intents
      'conversation.feedback': {
        patterns: [
          /(?:that(?:'s| is| was)|this is)\s+(?:not right|wrong|incorrect|unhelpful|not helpful|confusing)/i,
          /(?:you're|you are|that's|that is)\s+(?:right|correct|helpful)/i
        ],
        keywords: ["that's wrong", 'correct information', 'not helpful'],
        confidence: 0.8
      },
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
      },
      person: {
        pattern: /\bwith\s+([A-Za-z]+)(?:\s+and\s+([A-Za-z]+))?\b/i
      },
      emotion: {
        pattern: /\b(?:happy|sad|angry|frustrated|excited|worried|anxious|content|upset|disappointed)\b/i
      }
    };
    
    // Date patterns for extraction
    this.datePatterns = {
      relative: {
        today: /\b(?:today|this day)\b/i,
        tomorrow: /\b(?:tomorrow|next day|day after today)\b/i,
        dayAfter: /\b(?:day after tomorrow|in two days)\b/i,
        nextWeek: /\b(?:next week|in a week|week from (?:now|today))\b/i,
        weekend: /\b(?:this weekend|coming weekend|on the weekend)\b/i,
        nextMonth: /\b(?:next month|in a month|month from (?:now|today))\b/i
      },
      dayOfWeek: {
        monday: /\b(?:on |next |this |coming )?(?:mon(?:day)?)\b/i,
        tuesday: /\b(?:on |next |this |coming )?(?:tue(?:s(?:day)?)?)\b/i,
        wednesday: /\b(?:on |next |this |coming )?(?:wed(?:nesday)?)\b/i,
        thursday: /\b(?:on |next |this |coming )?(?:thu(?:rs(?:day)?)?)\b/i,
        friday: /\b(?:on |next |this |coming )?(?:fri(?:day)?)\b/i,
        saturday: /\b(?:on |next |this |coming )?(?:sat(?:urday)?)\b/i,
        sunday: /\b(?:on |next |this |coming )?(?:sun(?:day)?)\b/i
      },
      formatted: {
        us: /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/, // MM/DD/YYYY
        eu: /\b(\d{1,2})[.-](\d{1,2})(?:[.-](\d{2,4}))?\b/, // DD.MM.YYYY
        iso: /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/, // YYYY-MM-DD
        natural: /\b(?:(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?))\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/i
      }
    };
    
    // Time patterns
    this.timePatterns = {
      standard: /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i,
      military: /\b(\d{1,2})[:\.](\d{2})\b/i,
      descriptive: {
        morning: /\b(?:in the )?morning\b/i,
        afternoon: /\b(?:in the )?afternoon\b/i,
        evening: /\b(?:in the )?evening\b/i,
        night: /\b(?:at )?night\b/i,
        noon: /\bnoon\b/i,
        midnight: /\bmidnight\b/i
      }
    };
    
    // Event types
    this.eventTypePatterns = {
      appointment: /\b(?:appointment|checkup|visit|consultation|exam|meeting|session)\b/i,
      social: /\b(?:party|gathering|celebration|event|hangout|get-?together)\b/i,
      reminder: /\b(?:remind|reminder|remember|don't forget|alert)\b/i,
      deadline: /\b(?:deadline|due date|by then|must be done)\b/i,
      childActivity: /\b(?:play date|soccer|baseball|practice|game|recital|performance|lesson)\b/i
    };
  }

  /**
   * Initialize intent detection patterns
   * @private
   */
  initializeIntentPatterns() {
    // Calendar-related intents (from EnhancedNLU)
    this.calendarIntents = {
      'calendar.add': [
        /\b(?:add|create|put|place)\b.+\b(?:calendar|schedule)\b/i,
        /\b(?:schedule|book|arrange)\b.+\b(?:appointment|meeting|event)\b/i,
        /\bremind me\b.+\b(?:on|at|about)\b/i
      ],
      'calendar.check': [
        /\b(?:what|when|where).+\b(?:calendar|schedule|agenda)\b/i,
        /\b(?:do I have|is there)\b.+\b(?:scheduled|planned|on my calendar)\b/i,
        /\b(?:show|view|check|look at)\b.+\b(?:calendar|schedule|agenda)\b/i
      ],
      'calendar.schedule': [
        /\b(?:when|what time).+\b(?:good|work|available)\b/i,
        /\b(?:find|suggest)\b.+\b(?:time|slot|opening|availability)\b/i
      ],
      'date.query': [
        /\b(?:what|which)\b.+\b(?:day|date)\b/i,
        /\b(?:today|tomorrow|yesterday)\b.+\b(?:date)\b/i,
        /\b(?:current|today's)\b.+\b(?:date)\b/i
      ]
    };
  
    // Relationship-related intents
    this.relationshipIntents = {
      'relationship.date': [
        /\b(?:date night|dinner date|romantic)\b/i,
        /\b(?:restaurant|dinner|movie)\b.+\b(?:with my partner|with my spouse|with my wife|with my husband)\b/i
      ],
      'relationship.checkin': [
        /\b(?:couple|relationship|partner)\b.+\b(?:check.?in|checkin|check up)\b/i,
        /\b(?:talk|connect|chat)\b.+\b(?:with partner|with spouse|about relationship)\b/i
      ],
      'relationship.meeting': [
        /\b(?:relationship|couple|marriage)\b.+\b(?:meeting|discussion|talk)\b/i,
        /\b(?:sit down|serious talk|conversation)\b.+\b(?:relationship|marriage|partnership)\b/i
      ],
      'relationship.activity': [
        /\b(?:activity|thing to do|something fun)\b.+\b(?:with partner|with spouse|as a couple)\b/i,
        /\b(?:strengthen|improve|work on)\b.+\b(?:relationship|marriage|partnership)\b/i,
        /\b(?:quality time|together time)\b/i
      ],
      'relationship.advice': [
        /\b(?:help|advice|guidance)\b.+\b(?:relationship|partner|spouse|marriage)\b/i,
        /\b(?:struggling|difficulty|problem|issue)\b.+\b(?:relationship|marriage|partnership)\b/i,
        /\b(?:how to|what should)\b.+\b(?:relationship|connect|communicate)\b/i
      ]
    };
  
    // Child-related intents
    this.childIntents = {
      'child.add_appointment': [
        /\b(?:add|schedule|book)\b.+\b(?:appointment|doctor|dentist|checkup)\b.+\b(?:for|with)\b.+\b(?:child|kid|son|daughter)\b/i,
        /\b(?:my child|my kid|my son|my daughter)\b.+\b(?:appointment|doctor|dentist|checkup)\b/i
      ],
      'child.track_growth': [
        /\b(?:track|record|log|document)\b.+\b(?:growth|height|weight|measurements)\b/i,
        /\b(?:my child|my kid|my son|my daughter)\b.+\b(?:grew|growth|taller|weight|measure|size)\b/i
      ],
      'child.track_homework': [
        /\b(?:track|record|log|add)\b.+\b(?:homework|assignment|school work|project)\b/i,
        /\b(?:my child|my kid|my son|my daughter)\b.+\b(?:homework|assignment|school)\b/i
      ],
      'child.emotional_wellbeing': [
        /\b(?:track|record|log|note)\b.+\b(?:mood|feeling|emotion|behavior)\b/i,
        /\b(?:my child|my kid|my son|my daughter)\b.+\b(?:feeling|emotional|upset|happy|sad|mood)\b/i
      ],
      'child.milestone': [
        /\b(?:track|record|milestone|achievement|development)\b/i,
        /\b(?:my child|my kid|my son|my daughter)\b.+\b(?:learned|started|first time|began|milestone)\b/i
      ]
    };
  
    // Task-related intents
    this.taskIntents = {
      'task.add': [
        /\b(?:add|create|make|need)\b.+\b(?:task|chore|to-do|todo|assignment)\b/i,
        /\b(?:assign|give)\b.+\b(?:task|chore|responsibility|job)\b/i
      ],
      'task.complete': [
        /\b(?:complete|finish|done|did|mark complete)\b.+\b(?:task|chore|to-do|todo)\b/i,
        /\b(?:task|chore|to-do|todo)\b.+\b(?:complete|finished|done)\b/i
      ],
      'task.reassign': [
        /\b(?:reassign|transfer|move|change)\b.+\b(?:task|chore|to-do|todo)\b/i,
        /\b(?:give|assign)\b.+\b(?:task|chore)\b.+\b(?:to someone else|to other person|instead)\b/i
      ],
      'task.query': [
        /\b(?:what|which|show|view|list)\b.+\b(?:task|chore|to-do|todo)\b/i,
        /\b(?:do I have|are there|pending)\b.+\b(?:task|chore|to-do|todo)\b/i,
        /\b(?:who is responsible for|who should do|who does)\b.+\b(?:task|chore|responsibility)\b/i
      ]
    };
  
    // Survey-related intents
    this.surveyIntents = {
      'survey.result': [
        /\b(?:result|outcome|finding|report)\b.+\b(?:survey|questionnaire|assessment)\b/i,
        /\b(?:survey|questionnaire|assessment)\b.+\b(?:result|outcome|finding|report)\b/i,
        /\b(?:how did|what did)\b.+\b(?:survey|questionnaire|assessment)\b.+\b(?:show|say|reveal)\b/i
      ],
      'survey.insight': [
        /\b(?:insight|analysis|interpretation|understanding)\b.+\b(?:survey|data|result)\b/i,
        /\b(?:what does|what did|what do)\b.+\b(?:survey|data|result)\b.+\b(?:mean|indicate|suggest|tell us)\b/i
      ],
      'balance.query': [
        /\b(?:balance|imbalance|equality|distribution)\b.+\b(?:task|chore|work|responsibility|load)\b/i,
        /\b(?:who does|who is doing|who handles)\b.+\b(?:more|most|larger share|bigger portion)\b/i,
        /\b(?:mama|papa|mom|dad|mother|father)\b.+\b(?:percentage|portion|share|distribution)\b/i
      ],
      'data.analysis': [
        /\b(?:analyze|examine|study|look at)\b.+\b(?:data|result|survey|response)\b/i,
        /\b(?:trend|pattern|correlation|relationship)\b.+\b(?:data|result|survey|response)\b/i
      ]
    };
  
    // Creative and miscellaneous intents
    this.otherIntents = {
      'creative.writing': [
        /\b(?:write|create|generate|compose)\b.+\b(?:story|poem|essay|article)\b/i
      ],
      'emotional.support': [
        /\b(?:feel|feeling|felt)\b.+\b(?:overwhelmed|stressed|tired|exhausted|burnt out)\b/i,
        /\b(?:need|want)\b.+\b(?:support|help|advice|guidance)\b.+\b(?:emotional|feeling|stress|anxiety)\b/i
      ],
      'technical.help': [
        /\b(?:how to|how do I|can't)\b.+\b(?:use|access|find|navigate|get to)\b/i,
        /\b(?:app|feature|function|button|screen)\b.+\b(?:not working|broken|issue|problem)\b/i
      ],
      'general.greeting': [
        /^(?:hi|hello|hey|good morning|good afternoon|good evening|howdy)/i
      ],
      'general.question': [
        /^(?:what|how|why|when|where|who|can you|could you)/i
      ]
    };
  
    // Combine all intent categories
    this.legacyIntentPatterns = {
      ...this.calendarIntents,
      ...this.relationshipIntents,
      ...this.childIntents,
      ...this.taskIntents,
      ...this.surveyIntents,
      ...this.otherIntents
    };
  }

  /**
   * Initialize entity extraction patterns
   * @private
   */
  initializeEntityPatterns() {
    // Additional patterns from EnhancedNLU
    // Keep existing entity patterns from the constructor
  }

  /**
   * Initialize sentiment analysis patterns
   * @private
   */
  initializeSentimentPatterns() {
    this.sentimentPatterns = {
      positive: [
        /\b(?:like|love|enjoy|happy|glad|pleased|thrilled|delighted|grateful|thankful)\b/i,
        /\b(?:great|excellent|amazing|wonderful|fantastic|awesome|good|helpful|useful)\b/i,
        /\b(?:appreciate|thank you|thanks|well done|impressed)\b/i
      ],
      negative: [
        /\b(?:hate|dislike|upset|angry|mad|annoyed|frustrated|disappointed)\b/i,
        /\b(?:terrible|awful|horrible|bad|poor|useless|unhelpful|confusing)\b/i,
        /\b(?:waste|problem|issue|complaint|doesn't work|not good)\b/i
      ],
      neutral: [
        /\b(?:okay|fine|alright|neutral|acceptable|average|mediocre)\b/i,
        /\b(?:so-so|middling|neither good nor bad)\b/i
      ]
    };
  }

  /**
   * Detect the primary intent of a message with confidence scoring
   * @param {string} text - User message
   * @returns {object} - Detected intent with confidence score
   */
  detectIntent(text) {
    if (!text) return { intent: 'unknown', confidence: 0 };
    
    let bestMatch = { intent: 'unknown', confidence: 0.3 };
    
    // Check against all intent patterns using the advanced pattern matching
    for (const [intent, data] of Object.entries(this.intentPatterns)) {
      let matchScore = 0;
      
      // Check regex patterns
      for (const pattern of data.patterns) {
        if (pattern.test(text)) {
          matchScore += 0.5;
          break; // If any pattern matches, add the score and move on
        }
      }
      
      // Check keywords
      for (const keyword of data.keywords) {
        if (text.toLowerCase().includes(keyword.toLowerCase())) {
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
    
    // If no match found or confidence is low, try the legacy approach for backward compatibility
    if (bestMatch.confidence < 0.4) {
      // Use the original EnhancedNLU approach as a fallback
      const legacyIntent = this.detectIntentLegacy(text);
      if (legacyIntent !== 'general.unknown') {
        // Add a reasonable confidence score for legacy intents
        return { intent: legacyIntent, confidence: 0.6 };
      }
    }
    
    return bestMatch;
  }

  /**
   * Legacy implementation of intent detection for backward compatibility
   * @param {string} text - The message text to analyze
   * @returns {string} The detected intent in format "category.type"
   */
  detectIntentLegacy(text) {
    if (!text) return 'general.unknown';
    
    // Initialize tracking for best match
    let bestIntent = 'general.unknown';
    let highestScore = 0;
    
    // Check each intent pattern
    for (const [intent, patterns] of Object.entries(this.legacyIntentPatterns)) {
      // Calculate how many patterns match
      const matches = patterns.filter(pattern => pattern.test(text)).length;
      
      // Calculate confidence score (percentage of matching patterns)
      const confidence = patterns.length > 0 ? matches / patterns.length : 0;
      
      // If this intent has a higher confidence score, it becomes our new best match
      if (matches > 0 && confidence > highestScore) {
        highestScore = confidence;
        bestIntent = intent;
      }
    }
    
    return bestIntent;
  }

 // Fix the extractEntities method in src/services/ConsolidatedNLU.js
// Replace the current method with this improved version

/**
 * Extract entities from text
 * @param {string} text - The message text to analyze
 * @param {Array} familyMembers - Optional family members for validation
 * @returns {Object} Extracted entities by type
 */
extractEntities(text, familyMembers = []) {
  if (!text) return {};
  
  const entities = {};
  
  // Extract entities based on patterns
  for (const [entityType, entityData] of Object.entries(this.entityPatterns)) {
    const { pattern, validate } = entityData;
    
    // Skip if pattern is invalid
    if (!pattern || typeof pattern.test !== 'function') continue;
    
    // Create a fresh copy of the RegExp to avoid lastIndex issues
    // This is crucial - using the same regex object can lead to infinite loops
    const freshPattern = new RegExp(pattern.source, pattern.flags);
    
    const matches = [];
    let match;
    let safetyCounter = 0;
    const MAX_MATCHES = 50; // Safety limit to prevent infinite loops
    
    try {
      while ((match = freshPattern.exec(text)) !== null) {
        // Safety check to prevent infinite loops
        safetyCounter++;
        if (safetyCounter > MAX_MATCHES) {
          console.warn(`Reached safety limit of ${MAX_MATCHES} matches for ${entityType}`);
          break;
        }
        
        // Skip if validation function exists and returns false
        if (validate && !validate(match, familyMembers)) {
          continue;
        }
        
        if (match[1]) {
          matches.push(match[1]);
        }
        
        // For non-global patterns, break after first match to prevent infinite loops
        if (!freshPattern.global) {
          break;
        }
      }
      
      if (matches.length > 0) {
        entities[entityType] = matches;
      }
    } catch (error) {
      console.warn(`Error extracting ${entityType} entities:`, error);
      // Continue with other entity types instead of breaking completely
    }
  }
  
  // Add dates if present (with error handling)
  try {
    const dates = this.extractDates(text);
    if (dates && dates.length > 0) {
      entities.dates = dates;
    }
  } catch (error) {
    console.warn("Error extracting dates:", error);
  }
  
  // Add times if present (with error handling)
  try {
    const times = this.extractTimes(text);
    if (times && times.length > 0) {
      entities.times = times;
    }
  } catch (error) {
    console.warn("Error extracting times:", error);
  }
  
  // Add locations if present (with error handling)
  try {
    const locations = this.extractLocations(text);
    if (locations && locations.length > 0) {
      entities.locations = locations;
    }
  } catch (error) {
    console.warn("Error extracting locations:", error);
  }
  
  // Add people if present (with error handling)
  try {
    const people = this.extractPeople(text, familyMembers);
    if (people && people.length > 0) {
      entities.people = people;
    }
  } catch (error) {
    console.warn("Error extracting people:", error);
  }
  
  // Add event types if present (with error handling)
  try {
    const eventTypes = this.extractEventTypes(text);
    if (eventTypes && eventTypes.length > 0) {
      entities.eventTypes = eventTypes;
    }
  } catch (error) {
    console.warn("Error extracting event types:", error);
  }
  
  // Add emotions if present (with error handling)
  try {
    const emotions = this.extractEmotions(text);
    if (emotions && emotions.length > 0) {
      entities.emotions = emotions;
    }
  } catch (error) {
    console.warn("Error extracting emotions:", error);
  }
  
  return entities;
}

  /**
   * Detect the sentiment of a message
   * @param {string} text - The message text to analyze
   * @returns {Object} Sentiment analysis result with type and score
   */
  detectSentiment(text) {
    if (!text) return { type: 'neutral', score: 0.5 };
    
    const sentimentScores = {
      positive: 0,
      negative: 0,
      neutral: 0
    };
    
    // Check each sentiment pattern category
    Object.entries(this.sentimentPatterns).forEach(([sentiment, patterns]) => {
      // Count matches for this sentiment
      const matches = patterns.filter(pattern => pattern.test(text)).length;
      sentimentScores[sentiment] = matches / patterns.length;
    });
    
    // Determine overall sentiment
    let dominantSentiment = 'neutral';
    let highestScore = sentimentScores.neutral;
    
    if (sentimentScores.positive > highestScore) {
      dominantSentiment = 'positive';
      highestScore = sentimentScores.positive;
    }
    
    if (sentimentScores.negative > highestScore) {
      dominantSentiment = 'negative';
      highestScore = sentimentScores.negative;
    }
    
    // Calculate a normalized score (0-1 scale where 0 is very negative, 0.5 is neutral, 1 is very positive)
    const normalizedScore = 0.5 + (sentimentScores.positive - sentimentScores.negative) / 2;
    
    return {
      type: dominantSentiment,
      score: normalizedScore,
      details: sentimentScores
    };
  }

  /**
   * Extract dates from text
   * @param {string} text - The message text to analyze
   * @returns {Array} Array of extracted date objects
   * @private
   */
  extractDates(text) {
    const dates = [];
    const now = new Date();
    
    // Check for relative dates
    Object.entries(this.datePatterns.relative).forEach(([type, pattern]) => {
      if (pattern.test(text)) {
        const date = new Date(now);
        
        switch (type) {
          case 'today':
            // Date stays as today
            break;
          case 'tomorrow':
            date.setDate(date.getDate() + 1);
            break;
          case 'dayAfter':
            date.setDate(date.getDate() + 2);
            break;
          case 'nextWeek':
            date.setDate(date.getDate() + 7);
            break;
          case 'weekend':
            // Set to next Saturday
            date.setDate(date.getDate() + (6 - date.getDay() + 7) % 7);
            break;
          case 'nextMonth':
            date.setMonth(date.getMonth() + 1);
            break;
        }
        
        dates.push({
          type: 'relative',
          value: type,
          date: date,
          text: text.match(pattern)[0]
        });
      }
    });
    
    // Check for days of the week
    Object.entries(this.datePatterns.dayOfWeek).forEach(([day, pattern]) => {
      if (pattern.test(text)) {
        const date = new Date(now);
        const targetDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day);
        
        // Calculate days until next occurrence of this day
        let daysUntil = (targetDay - date.getDay() + 7) % 7;
        
        // If the pattern explicitly contains "next", always look at next week
        if (text.match(pattern)[0].toLowerCase().includes('next')) {
          daysUntil = daysUntil === 0 ? 7 : daysUntil;
        } else if (daysUntil === 0) {
          // If today is that day, and it's not specified as "this" or "today", assume next week
          if (!text.match(pattern)[0].toLowerCase().includes('this') && 
              !text.match(pattern)[0].toLowerCase().includes('today')) {
            daysUntil = 7;
          }
        }
        
        date.setDate(date.getDate() + daysUntil);
        
        dates.push({
          type: 'dayOfWeek',
          value: day,
          date: date,
          text: text.match(pattern)[0]
        });
      }
    });
    
    // Check for formatted dates
    Object.entries(this.datePatterns.formatted).forEach(([format, pattern]) => {
      const matches = text.match(pattern);
      if (matches) {
        try {
          let date;
          
          switch (format) {
            case 'us':
              // MM/DD/YYYY
              const month = parseInt(matches[1]) - 1; // 0-based
              const day = parseInt(matches[2]);
              const year = matches[3] ? parseInt(matches[3]) : now.getFullYear();
              date = new Date(year < 100 ? year + 2000 : year, month, day);
              break;
              
            case 'eu':
              // DD.MM.YYYY
              const euDay = parseInt(matches[1]);
              const euMonth = parseInt(matches[2]) - 1; // 0-based
              const euYear = matches[3] ? parseInt(matches[3]) : now.getFullYear();
              date = new Date(euYear < 100 ? euYear + 2000 : euYear, euMonth, euDay);
              break;
              
            case 'iso':
              // YYYY-MM-DD
              const isoYear = parseInt(matches[1]);
              const isoMonth = parseInt(matches[2]) - 1; // 0-based
              const isoDay = parseInt(matches[3]);
              date = new Date(isoYear, isoMonth, isoDay);
              break;
              
            case 'natural':
              // Month Day, Year
              const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 
                                  'august', 'september', 'october', 'november', 'december'];
              const monthName = matches[1].toLowerCase();
              const natMonth = monthNames.findIndex(m => monthName.startsWith(m.substring(0, 3)));
              const natDay = parseInt(matches[2]);
              const natYear = matches[3] ? parseInt(matches[3]) : now.getFullYear();
              date = new Date(natYear, natMonth, natDay);
              break;
          }
          
          // Ensure the date is valid
          if (!isNaN(date.getTime())) {
            // If date is in the past and within current year, assume next year
            if (date < now && date.getFullYear() === now.getFullYear()) {
              // Check if it seems to be intentionally referring to a past date
              const pastIndicators = /\b(?:was|were|happened|occurred|past|previous|last)\b/i;
              
              if (!pastIndicators.test(text)) {
                date.setFullYear(date.getFullYear() + 1);
              }
            }
            
            dates.push({
              type: 'formatted',
              format: format,
              date: date,
              text: matches[0]
            });
          }
        } catch (error) {
          console.warn(`Error parsing ${format} date:`, error);
        }
      }
    });
    
    return dates;
  }

  /**
   * Extract times from text
   * @param {string} text - The message text to analyze
   * @returns {Array} Array of extracted time objects
   * @private
   */
  extractTimes(text) {
    const times = [];
    
    // Check for standard time format (12-hour with optional am/pm)
    const standardMatches = text.match(this.timePatterns.standard);
    if (standardMatches) {
      try {
        let hours = parseInt(standardMatches[1]);
        const minutes = standardMatches[2] ? parseInt(standardMatches[2]) : 0;
        const period = standardMatches[3]?.toLowerCase();
        
        // Handle am/pm
        if (period === 'pm' && hours < 12) {
          hours += 12;
        } else if (period === 'am' && hours === 12) {
          hours = 0;
        }
        
        // Default to PM for certain hours if no am/pm specified
        if (!period && hours < 12 && hours >= 1 && hours <= 7) {
          // Times like 1-7 without am/pm are usually PM
          hours += 12;
        }
        
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        
        times.push({
          type: 'standard',
          hours,
          minutes,
          period: period || (hours >= 12 ? 'pm' : 'am'),
          date,
          text: standardMatches[0]
        });
      } catch (error) {
        console.warn('Error parsing standard time:', error);
      }
    }
    
    // Check for military time format (24-hour)
    const militaryMatches = text.match(this.timePatterns.military);
    if (militaryMatches) {
      try {
        const hours = parseInt(militaryMatches[1]);
        const minutes = parseInt(militaryMatches[2]);
        
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
          const date = new Date();
          date.setHours(hours, minutes, 0, 0);
          
          times.push({
            type: 'military',
            hours,
            minutes,
            date,
            text: militaryMatches[0]
          });
        }
      } catch (error) {
        console.warn('Error parsing military time:', error);
      }
    }
    
    // Check for descriptive times
    Object.entries(this.timePatterns.descriptive).forEach(([timeOfDay, pattern]) => {
      if (pattern.test(text)) {
        const date = new Date();
        
        // Set appropriate hours based on time of day
        switch (timeOfDay) {
          case 'morning':
            date.setHours(9, 0, 0, 0);
            break;
          case 'afternoon':
            date.setHours(14, 0, 0, 0);
            break;
          case 'evening':
            date.setHours(19, 0, 0, 0);
            break;
          case 'night':
            date.setHours(21, 0, 0, 0);
            break;
          case 'noon':
            date.setHours(12, 0, 0, 0);
            break;
          case 'midnight':
            date.setHours(0, 0, 0, 0);
            break;
        }
        
        times.push({
          type: 'descriptive',
          timeOfDay,
          date,
          text: text.match(pattern)[0]
        });
      }
    });
    
    return times;
  }

  /**
   * Extract locations from text
   * @param {string} text - The message text to analyze
   * @returns {Array} Array of extracted location objects
   * @private
   */
  extractLocations(text) {
    const locations = [];
    
    // Check each location pattern from EnhancedNLU
    const locationPatterns = {
      at: /\bat\s+([A-Za-z0-9\s'.,]+)(?:\s+(?:on|at|from|tomorrow|today|next|this))/i,
      in: /\bin\s+([A-Za-z0-9\s'.,]+)(?:\s+(?:on|at|from|tomorrow|today|next|this))/i,
      specific: /\b(?:location|place|venue|address)(?:\s+(?:is|at|in))?\s+([A-Za-z0-9\s'.,]+)(?:\b|$)/i,
      address: /\b(\d+\s+[A-Za-z0-9\s'.,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl))/i
    };
    
    // Check each location pattern
    Object.entries(locationPatterns).forEach(([type, pattern]) => {
      const matches = text.match(pattern);
      if (matches && matches[1]) {
        // Clean up the location string
        const locationText = matches[1].trim()
          .replace(/\.$/, '') // Remove trailing period
          .replace(/\s+/g, ' '); // Normalize spaces
        
        locations.push({
          type,
          location: locationText,
          text: matches[0]
        });
      }
    });
    
    return locations;
  }

  /**
   * Extract people from text
   * @param {string} text - The message text to analyze
   * @param {Array} familyMembers - Optional array of family members for better matching
   * @returns {Array} Array of extracted people objects
   * @private
   */
  extractPeople(text, familyMembers = []) {
    const people = [];
    
    // Person patterns from EnhancedNLU
    const personPatterns = {
      with: /\bwith\s+([A-Z][a-z]+)(?:\s+and\s+([A-Z][a-z]+))?\b/i,
      for: /\bfor\s+([A-Z][a-z]+)(?:\s+and\s+([A-Z][a-z]+))?\b/i,
      possessive: /\b([A-Z][a-z]+)'s\b/i,
      child: /\bmy\s+(?:child|kid|daughter|son)\s+([A-Z][a-z]+)\b/i
    };
    
    // Check each person pattern
    Object.entries(personPatterns).forEach(([type, pattern]) => {
      const matches = text.match(pattern);
      if (matches && matches[1]) {
        // Get the person name
        const name = matches[1];
        
        // Check if this person is a family member
        let isFamilyMember = false;
        let role = null;
        
        if (familyMembers && familyMembers.length > 0) {
          const matchedMember = familyMembers.find(member => 
            member.name.toLowerCase() === name.toLowerCase() ||
            (member.nickname && member.nickname.toLowerCase() === name.toLowerCase())
          );
          
          if (matchedMember) {
            isFamilyMember = true;
            role = matchedMember.role;
          }
        }
        
        people.push({
          type,
          name,
          isFamilyMember,
          role,
          text: matches[0]
        });
        
        // Check for second person in "with X and Y" pattern
        if (matches[2]) {
          const name2 = matches[2];
          
          // Check if second person is a family member
          let isFamilyMember2 = false;
          let role2 = null;
          
          if (familyMembers && familyMembers.length > 0) {
            const matchedMember2 = familyMembers.find(member => 
              member.name.toLowerCase() === name2.toLowerCase() ||
              (member.nickname && member.nickname.toLowerCase() === name2.toLowerCase())
            );
            
            if (matchedMember2) {
              isFamilyMember2 = true;
              role2 = matchedMember2.role;
            }
          }
          
          people.push({
            type,
            name: name2,
            isFamilyMember: isFamilyMember2,
            role: role2,
            text: matches[0]
          });
        }
      }
    });
    
    // Look for family roles
    const rolePatterns = {
      mama: /\b(?:mama|mom|mother|mommy)\b/i,
      papa: /\b(?:papa|dad|daddy|father)\b/i,
      child: /\b(?:child|kid|son|daughter)\b/i
    };
    
    Object.entries(rolePatterns).forEach(([role, pattern]) => {
      if (pattern.test(text)) {
        people.push({
          type: 'role',
          role,
          text: text.match(pattern)[0]
        });
      }
    });
    
    return people;
  }

  /**
   * Extract event types from text
   * @param {string} text - The message text to analyze
   * @returns {Array} Array of extracted event type objects
   * @private
   */
  extractEventTypes(text) {
    const eventTypes = [];
    
    // Check each event type pattern
    Object.entries(this.eventTypePatterns).forEach(([type, pattern]) => {
      if (pattern.test(text)) {
        eventTypes.push({
          type,
          text: text.match(pattern)[0]
        });
      }
    });
    
    return eventTypes;
  }

  /**
   * Extract emotions from text
   * @param {string} text - The message text to analyze
   * @returns {Array} Array of extracted emotion objects
   * @private
   */
  extractEmotions(text) {
    const emotions = [];
    
    // Define emotion patterns
    const emotionPatterns = {
      positive: /\b(?:happy|excited|joyful|pleased|glad|content|cheerful|thrilled|delighted)\b/i,
      negative: /\b(?:sad|upset|angry|frustrated|disappointed|stressed|anxious|worried|concerned)\b/i,
      neutral: /\b(?:okay|fine|neutral|alright|so-so|average)\b/i
    };
    
    // Check each emotion pattern
    Object.entries(emotionPatterns).forEach(([type, pattern]) => {
      if (pattern.test(text)) {
        emotions.push({
          type,
          text: text.match(pattern)[0]
        });
      }
    });
    
    return emotions;
  }

  /**
   * Detect topic categories in text
   * @param {string} text - The message text to analyze
   * @returns {Array} Array of detected topic categories
   */
  detectTopicCategories(text) {
    if (!text) return [];
    
    const categories = [];
    
    // Define topic categories and their keyword patterns
    const topicPatterns = {
      calendar: /\b(?:calendar|schedule|appointment|meeting|event|remind|plan|date|time)\b/i,
      tasks: /\b(?:task|chore|responsibility|work|workload|balance|division|share|assignment)\b/i,
      relationship: /\b(?:relationship|marriage|partner|spouse|husband|wife|couple|together|connection|date night)\b/i,
      children: /\b(?:child|kid|son|daughter|parent|parenting|family|school|homework|growth|development)\b/i,
      survey: /\b(?:survey|questionnaire|result|data|analysis|insight|distribution|percentage|statistics)\b/i,
      emotional: /\b(?:feel|feeling|stress|overwhelm|burnout|tired|exhausted|support|help)\b/i,
      technical: /\b(?:app|feature|function|button|screen|access|error|problem|issue|bug|fix)\b/i
    };
    
    // Check each topic pattern
    Object.entries(topicPatterns).forEach(([category, pattern]) => {
      if (pattern.test(text)) {
        categories.push(category);
      }
    });
    
    return categories;
  }

  /**
   * Extract topics from text
   * @param {string} text - The message text to analyze
   * @returns {Array} Array of extracted topics
   */
  extractTopics(text) {
    if (!text) return [];
    
    const topics = [];
    
    // Define specific topics and their keyword patterns
    const topicPatterns = {
      'meal planning': /\b(?:meal|dinner|lunch|breakfast|cook|cooking|recipe|food|grocery|shopping)\b/i,
      'cleaning': /\b(?:clean|cleaning|vacuum|dust|mop|sweep|tidy|bathroom|kitchen|house)\b/i,
      'childcare': /\b(?:child|kid|baby|toddler|care|watch|watching|babysit|look after)\b/i,
      'school': /\b(?:school|homework|assignment|project|teacher|class|grade|study|learning|education)\b/i,
      'scheduling': /\b(?:schedule|calendar|appointment|meeting|time|date|plan|planning|organize|coordination)\b/i,
      'medical': /\b(?:doctor|dentist|appointment|checkup|health|medical|medicine|prescription|sick|illness)\b/i,
      'emotional support': /\b(?:emotional|support|feel|feeling|stress|anxiety|worry|concern|listen|talk)\b/i,
      'finances': /\b(?:money|bill|payment|budget|financial|expense|cost|pay|saving|spending)\b/i,
      'transportation': /\b(?:drive|driving|car|pickup|dropoff|school|activity|practice|game|bus)\b/i,
      'social activities': /\b(?:friend|playdate|birthday|party|social|gathering|activity|event)\b/i,
      'relationship': /\b(?:relationship|marriage|partner|spouse|husband|wife|love|connection|communication)\b/i,
      'mental load': /\b(?:mental load|cognitive|remember|thinking|planning|organizing|managing|coordination)\b/i,
      'self-care': /\b(?:self-care|break|rest|relax|time off|me time|hobby|interest|activity)\b/i
    };
    
    // Check each topic pattern
    Object.entries(topicPatterns).forEach(([topic, pattern]) => {
      if (pattern.test(text)) {
        topics.push(topic);
      }
    });
    
    return topics;
  }

  /**
   * Extract calendar event details from text
   * @param {string} text - The message text to analyze
   * @param {Array} familyMembers - Optional array of family members for better matching
   * @returns {Object|null} Extracted event details or null if insufficient information
   */
  extractEventDetails(text, familyMembers = []) {
    // Extract basic entities
    const entities = this.extractEntities(text);
    
    // Detect intent to help classify the event
    const intent = this.detectIntent(text);
    
    // Initialize event details
    const eventDetails = {
      title: null,
      description: null,
      person: null,
      startDate: null,
      endDate: null,
      location: null,
      category: null
    };
    
    // Determine event category based on intent and entities
    if (intent.intent.startsWith('calendar.')) {
      eventDetails.category = 'general';
    } else if (intent.intent === 'child.add_appointment') {
      eventDetails.category = 'appointment';
    } else if (intent.intent.startsWith('relationship.')) {
      eventDetails.category = 'relationship';
    } else if (entities.eventTypes && entities.eventTypes.length > 0) {
      const primaryEventType = entities.eventTypes[0].type;
      eventDetails.category = primaryEventType;
    }
    
    // Extract event title
    // Try to find explicit title patterns like "add a [title] to calendar"
    const titlePatterns = [
      /\b(?:add|create|schedule)\s+(?:a|an)\s+([^"]+?)(?:\s+on|\s+at|\s+for|\s+to my calendar|\s+to calendar|$)/i,
      /\b(?:remind me|reminder)\s+(?:about|to|of)\s+([^"]+?)(?:\s+on|\s+at|\s+by|$)/i,
      /\b(?:put|place|set)\s+([^"]+?)(?:\s+on|\s+in)\s+(?:my\s+)?calendar\b/i
    ];
    
    for (const pattern of titlePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        eventDetails.title = match[1].trim();
        break;
      }
    }
    
    // If no explicit title was found, infer it from the event type and context
    if (!eventDetails.title) {
      if (entities.eventTypes && entities.eventTypes.length > 0) {
        const eventType = entities.eventTypes[0].text;
        
        if (entities.people && entities.people.length > 0) {
          const person = entities.people[0].name || entities.people[0].role || entities.people[0].text;
          eventDetails.title = `${eventType} with ${person}`;
        } else {
          eventDetails.title = eventType;
        }
      } else if (eventDetails.category === 'relationship') {
        eventDetails.title = 'Date Night';
      } else if (eventDetails.category === 'appointment') {
        if (text.toLowerCase().includes('doctor')) {
          eventDetails.title = 'Doctor Appointment';
        } else if (text.toLowerCase().includes('dentist')) {
          eventDetails.title = 'Dentist Appointment';
        } else {
          eventDetails.title = 'Appointment';
        }
      } else {
        // Use a general title based on intent or text
        eventDetails.title = 'New Event';
      }
    }
    
    // Clean up the title
    if (eventDetails.title) {
      // Capitalize the first letter of each word
      eventDetails.title = eventDetails.title
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    // Extract person if any
    if (entities.people && entities.people.length > 0) {
      const person = entities.people[0];
      eventDetails.person = person.name || person.role || person.text;
    }
    
    // Extract start date and time
    if (entities.dates && entities.dates.length > 0) {
      const primaryDate = entities.dates[0].date;
      
      // If we have both date and time entities, combine them
      if (entities.times && entities.times.length > 0) {
        const primaryTime = entities.times[0].date;
        
        primaryDate.setHours(
          primaryTime.getHours(),
          primaryTime.getMinutes(),
          0,
          0
        );
      } else {
        // Default times based on event category
        switch (eventDetails.category) {
          case 'appointment':
            primaryDate.setHours(10, 0, 0, 0); // 10:00 AM default for appointments
            break;
          case 'relationship':
            primaryDate.setHours(19, 0, 0, 0); // 7:00 PM default for date nights
            break;
          default:
            primaryDate.setHours(12, 0, 0, 0); // Noon default for general events
        }
      }
      
      eventDetails.startDate = primaryDate;
      
      // Create end date based on category (default duration)
      eventDetails.endDate = new Date(primaryDate);
      
      switch (eventDetails.category) {
        case 'appointment':
          eventDetails.endDate.setMinutes(eventDetails.endDate.getMinutes() + 60); // 1 hour for appointments
          break;
        case 'relationship':
          eventDetails.endDate.setMinutes(eventDetails.endDate.getMinutes() + 120); // 2 hours for date nights
          break;
        default:
          eventDetails.endDate.setMinutes(eventDetails.endDate.getMinutes() + 60); // 1 hour default
      }
    } else {
      // No explicit date mentioned, default to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Set appropriate time based on category
      switch (eventDetails.category) {
        case 'appointment':
          tomorrow.setHours(10, 0, 0, 0); // 10:00 AM
          break;
        case 'relationship':
          tomorrow.setHours(19, 0, 0, 0); // 7:00 PM
          break;
        default:
          tomorrow.setHours(12, 0, 0, 0); // Noon
      }
      
      eventDetails.startDate = tomorrow;
      
      // Create end date (similar logic as above)
      eventDetails.endDate = new Date(tomorrow);
      
      switch (eventDetails.category) {
        case 'appointment':
          eventDetails.endDate.setMinutes(eventDetails.endDate.getMinutes() + 60);
          break;
        case 'relationship':
          eventDetails.endDate.setMinutes(eventDetails.endDate.getMinutes() + 120);
          break;
        default:
          eventDetails.endDate.setMinutes(eventDetails.endDate.getMinutes() + 60);
      }
    }
    
    // Extract location
    if (entities.locations && entities.locations.length > 0) {
      eventDetails.location = entities.locations[0].location;
    } else if (eventDetails.category === 'relationship' && 
               (text.toLowerCase().includes('dinner') || text.toLowerCase().includes('restaurant'))) {
      eventDetails.location = 'Restaurant';
    }
    
    // Add description
    eventDetails.description = `Added from Allie chat: ${text}`;
    
    // Check if we have minimum required fields
    if (eventDetails.title && eventDetails.startDate) {
      return eventDetails;
    }
    
    return null;
  }

  /**
   * Extract relationship event details from text
   * @param {string} text - The message text to analyze
   * @returns {Object|null} Extracted relationship event details or null if insufficient
   */
  extractRelationshipEventDetails(text) {
    // Determine the relationship event type
    let eventType = 'general';
    
    if (text.toLowerCase().includes('date night') || 
        text.toLowerCase().includes('dinner date') ||
        text.toLowerCase().includes('restaurant') && text.toLowerCase().includes('partner')) {
      eventType = 'date';
    } else if (text.toLowerCase().includes('check-in') || 
             text.toLowerCase().includes('checkin') ||
             text.toLowerCase().includes('talk') && text.toLowerCase().includes('partner')) {
      eventType = 'check-in';
    } else if (text.toLowerCase().includes('relationship meeting') ||
             text.toLowerCase().includes('couple meeting')) {
      eventType = 'meeting';
    }
    
    // Get general event details
    const eventDetails = this.extractEventDetails(text);
    
    // If we couldn't extract basic event details, bail out
    if (!eventDetails) return null;
    
    // Enhance the event details with relationship-specific info
    const relationshipEvent = {
      ...eventDetails,
      type: eventType
    };
    
    // Adjust title if needed
    if (eventType === 'date' && !relationshipEvent.title.toLowerCase().includes('date')) {
      relationshipEvent.title = 'Date Night';
      
      if (text.toLowerCase().includes('dinner')) {
        relationshipEvent.title = 'Dinner Date';
      } else if (text.toLowerCase().includes('movie')) {
        relationshipEvent.title = 'Movie Date';
      } else if (text.toLowerCase().includes('lunch')) {
        relationshipEvent.title = 'Lunch Date';
      }
    } else if (eventType === 'check-in' && !relationshipEvent.title.toLowerCase().includes('check')) {
      relationshipEvent.title = 'Couple Check-in';
    } else if (eventType === 'meeting' && !relationshipEvent.title.toLowerCase().includes('meeting')) {
      relationshipEvent.title = 'Relationship Meeting';
    }
    
    // Set category explicitly
    relationshipEvent.category = 'relationship';
    
    return relationshipEvent;
  }

  /**
   * Extract child tracking details from text
   * @param {string} text - The message text to analyze
   * @param {Array} children - Array of children in the family for better matching
   * @returns {Object|null} Extracted child tracking details or null if insufficient
   */
  extractChildTrackingDetails(text, children = []) {
    // Determine the child tracking type
    let trackingType = null;
    
    if (text.toLowerCase().includes('appointment') || 
        text.toLowerCase().includes('doctor') || 
        text.toLowerCase().includes('dentist') ||
        text.toLowerCase().includes('checkup')) {
      trackingType = 'appointment';
    } else if (text.toLowerCase().includes('growth') || 
             text.toLowerCase().includes('height') || 
             text.toLowerCase().includes('weight') ||
             text.toLowerCase().includes('measure')) {
      trackingType = 'growth';
    } else if (text.toLowerCase().includes('homework') || 
             text.toLowerCase().includes('assignment') ||
             text.toLowerCase().includes('school work')) {
      trackingType = 'homework';
    } else if (text.toLowerCase().includes('emotion') || 
             text.toLowerCase().includes('feeling') ||
             text.toLowerCase().includes('mood') ||
             text.toLowerCase().includes('happy') ||
             text.toLowerCase().includes('sad')) {
      trackingType = 'emotional';
    } else if (text.toLowerCase().includes('milestone') ||
             text.toLowerCase().includes('achievement') ||
             text.toLowerCase().includes('development')) {
      trackingType = 'milestone';
    }
    
    // If we couldn't determine a tracking type, bail out
    if (!trackingType) return null;
    
    // Extract basic entities
    const entities = this.extractEntities(text);
    
    // Initialize tracking details
    const trackingDetails = {
      type: trackingType,
      child: null,
      date: null
    };
    
    // Extract child name
    if (entities.people && entities.people.length > 0) {
      // Try to find a child in the entities
      const childEntity = entities.people.find(person => 
        person.role === 'child' || 
        (children.length > 0 && children.some(child => 
          child.name.toLowerCase() === person.name?.toLowerCase()
        ))
      );
      
      if (childEntity) {
        trackingDetails.child = childEntity.name;
      }
    }
    
    // If no child was found, try to find it in the list of children
    if (!trackingDetails.child && children.length === 1) {
      // If there's only one child, use that
      trackingDetails.child = children[0].name;
    }
    
    // Extract date if any
    if (entities.dates && entities.dates.length > 0) {
      trackingDetails.date = entities.dates[0].date;
    }
    
    // Add type-specific details
    switch (trackingType) {
      case 'appointment': {
        // Extract appointment type
        let appointmentType = 'medical';
        
        if (text.toLowerCase().includes('dentist') || text.toLowerCase().includes('teeth')) {
          appointmentType = 'dental';
        } else if (text.toLowerCase().includes('eye') || text.toLowerCase().includes('vision') || text.toLowerCase().includes('optometrist')) {
          appointmentType = 'vision';
        } else if (text.toLowerCase().includes('therapy') || text.toLowerCase().includes('counseling')) {
          appointmentType = 'therapy';
        } else if (text.toLowerCase().includes('checkup') || text.toLowerCase().includes('well visit') || text.toLowerCase().includes('doctor')) {
          appointmentType = 'medical';
        }
        
        trackingDetails.appointmentType = appointmentType;
        
        // Extract time if any
        if (entities.times && entities.times.length > 0) {
          trackingDetails.time = entities.times[0].date;
        }
        
        // Extract location if any
        if (entities.locations && entities.locations.length > 0) {
          trackingDetails.location = entities.locations[0].location;
        }
        break;
      }
      
      case 'growth': {
        // Extract measurements
        const measurements = {};
        
        // Height patterns
        const heightPattern = /(\d+\.?\d*)\s*(?:cm|centimeters|centimetres|feet|foot|ft|inch|inches|in)/i;
        const heightMatch = text.match(heightPattern);
        if (heightMatch) {
          measurements.height = heightMatch[0];
        }
        
        // Weight patterns
        const weightPattern = /(\d+\.?\d*)\s*(?:kg|kilograms|kilos|lbs|pounds|lb)/i;
        const weightMatch = text.match(weightPattern);
        if (weightMatch) {
          measurements.weight = weightMatch[0];
        }
        
        // Head circumference pattern
        const headPattern = /(\d+\.?\d*)\s*(?:cm|centimeters|centimetres|inch|inches|in)\s*(?:head|circumference)/i;
        const headMatch = text.match(headPattern);
        if (headMatch) {
          measurements.head = headMatch[0];
        }
        
        trackingDetails.measurements = measurements;
        break;
      }
      
      case 'emotional': {
        // Extract emotion
        if (entities.emotions && entities.emotions.length > 0) {
          trackingDetails.emotion = entities.emotions[0].type;
          trackingDetails.emotionText = entities.emotions[0].text;
        }
        break;
      }
      
      case 'homework': {
        // Extract subject
        const subjectPatterns = {
          math: /\b(?:math|mathematics|algebra|geometry|calculus)\b/i,
          science: /\b(?:science|biology|chemistry|physics)\b/i,
          english: /\b(?:english|language arts|reading|writing|literature)\b/i,
          history: /\b(?:history|social studies|geography)\b/i,
          art: /\b(?:art|drawing|painting)\b/i,
          music: /\b(?:music|instrument|piano|guitar|violin)\b/i
        };
        
        for (const [subject, pattern] of Object.entries(subjectPatterns)) {
          if (pattern.test(text)) {
            trackingDetails.subject = subject;
            break;
          }
        }
        
        // Extract due date
        const dueDatePattern = /\b(?:due|deadline|submit(?:ted)?|turn(?:ed)? in)\b.*?(\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2}|\w+ \d{1,2}(?:st|nd|rd|th)?)/i;
        const dueDateMatch = text.match(dueDatePattern);
        
        if (dueDateMatch && dueDateMatch[1]) {
          try {
            const dueDateStr = dueDateMatch[1];
            const dueDate = new Date(dueDateStr);
            
            if (!isNaN(dueDate.getTime())) {
              trackingDetails.dueDate = dueDate;
            }
          } catch (e) {
            console.warn("Error parsing homework due date:", e);
          }
        }
        break;
      }
      
      case 'milestone': {
        // Extract milestone description
        const milestonePattern = /\b(?:learned|started|began|achieved|accomplished|mastered|first time)\b\s+(?:to\s+)?([a-z\s]+)/i;
        const milestoneMatch = text.match(milestonePattern);
        
        if (milestoneMatch && milestoneMatch[1]) {
          trackingDetails.milestone = milestoneMatch[1].trim();
        }
        break;
      }
    }
    
    return trackingDetails;
  }

  /**
   * Extract task details from text
   * @param {string} text - The message text to analyze
   * @param {Object} familyContext - Family context for better matching
   * @returns {Object|null} Extracted task details or null if insufficient
   */
  extractTaskDetails(text, familyContext = {}) {
    // Determine the task action
    let taskAction = null;
    
    if (text.toLowerCase().includes('add ') && text.toLowerCase().includes('task') ||
        text.toLowerCase().includes('create ') && text.toLowerCase().includes('task') ||
        text.toLowerCase().includes('assign ') && text.toLowerCase().includes('task')) {
      taskAction = 'add';
    } else if (text.toLowerCase().includes('complete') && text.toLowerCase().includes('task') ||
             text.toLowerCase().includes('finished') && text.toLowerCase().includes('task') ||
             text.toLowerCase().includes('done with') && text.toLowerCase().includes('task')) {
      taskAction = 'complete';
    } else if (text.toLowerCase().includes('reassign') && text.toLowerCase().includes('task') ||
             text.toLowerCase().includes('change who') && text.toLowerCase().includes('task')) {
      taskAction = 'reassign';
    } else if (text.toLowerCase().includes('what') && text.toLowerCase().includes('task') ||
             text.toLowerCase().includes('list') && text.toLowerCase().includes('task') ||
             text.toLowerCase().includes('show me') && text.toLowerCase().includes('task')) {
      taskAction = 'query';
    }
    
    // If we couldn't determine a task action, bail out
    if (!taskAction) return null;
    
    // Extract basic entities
    const entities = this.extractEntities(text);
    
    // Initialize task details
    const taskDetails = {
      action: taskAction,
      title: null,
      assignee: null,
      category: null,
      taskId: null
    };
    
    // Extract task title if action is 'add'
    if (taskAction === 'add') {
      const titlePatterns = [
        /\b(?:add|create|make)\s+(?:a|an)\s+(?:new\s+)?(?:task|chore|assignment|to-do|todo)\s+(?:to|for)\s+(?:the list|Allie)?\s*(?::|\s+-)?\s*"?([^"]+?)(?:"|\.|$)/i,
        /\b(?:add|create|make)\s+(?:a|an)\s+(?:new\s+)?(?:task|chore|assignment|to-do|todo)\s+(?:called|named|titled)\s+\"?([^\"]+?)(?:\"|$)/i,
        /\b(?:need|want)\s+(?:to|a)\s+(?:task|to-do|todo)\s+(?:for|to)\s+([^:]+?)(?:\s+(?:assign|give)|\s+to|\.|$)/i
      ];
      
      for (const pattern of titlePatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          taskDetails.title = match[1].trim();
          break;
        }
      }
    } 
    // Extract task ID or title for other actions
    else {
      // Look for task ID pattern
      const taskIdPattern = /\b(?:task|chore|to-do|todo)\s+(?:#|number|no\.?|id)?\s*(\d+)\b/i;
      const taskIdMatch = text.match(taskIdPattern);
      
      if (taskIdMatch && taskIdMatch[1]) {
        taskDetails.taskId = taskIdMatch[1];
      }
      
      // Look for quoted task title
      const quotedTitlePattern = /\"([^\"]+?)\"/;
      const quotedTitleMatch = text.match(quotedTitlePattern);
      
      if (quotedTitleMatch && quotedTitleMatch[1]) {
        taskDetails.title = quotedTitleMatch[1];
      }
      
      // If we still don't have a title, look for task mentions
      if (!taskDetails.title && !taskDetails.taskId) {
        const taskMentionPattern = /(?:the|this|that)\s+([^,\.]+?)\s+(?:task|chore|to-do|todo)\b/i;
        const taskMentionMatch = text.match(taskMentionPattern);
        
        if (taskMentionMatch && taskMentionMatch[1]) {
          taskDetails.title = taskMentionMatch[1].trim();
        }
      }
      
      // If we have existing tasks in context, try to match the task
      if (familyContext.tasks && (!taskDetails.title || !taskDetails.taskId)) {
        // Look for task title mentions in the text
        for (const task of familyContext.tasks) {
          if (text.toLowerCase().includes(task.title.toLowerCase())) {
            taskDetails.taskId = task.id;
            taskDetails.title = task.title;
            break;
          }
        }
      }
    }
    
    // Extract task assignee
    if (entities.people && entities.people.length > 0) {
      const assignee = entities.people[0];
      taskDetails.assignee = assignee.name || assignee.role;
    } else {
      // Look for explicit assignee patterns
      const assigneePatterns = {
        mama: /\b(?:assign|give)\s+(?:to|it to)?\s+(?:mama|mom|mother|mommy)\b/i,
        papa: /\b(?:assign|give)\s+(?:to|it to)?\s+(?:papa|dad|daddy|father)\b/i
      };
      
      for (const [role, pattern] of Object.entries(assigneePatterns)) {
        if (pattern.test(text)) {
          taskDetails.assignee = role;
          break;
        }
      }
    }
    
    // Determine task category
    if (taskDetails.title) {
      // Check for category keywords in title
      const categoryPatterns = {
        'Visible Household Tasks': /\b(?:clean|wash|fold|cook|meal|dinner|laundry|dishes|vacuum|dust|mop|sweep|grocery|shopping)\b/i,
        'Invisible Household Tasks': /\b(?:plan|schedule|organize|arrange|manage|coordinate|research|decide|remember)\b/i,
        'Visible Parental Tasks': /\b(?:kid|child|children|bedtime|school|homework|bath|feeding|diaper|pick up|drop off|daycare)\b/i,
        'Invisible Parental Tasks': /\b(?:emotional|support|think|worry|concern|prepare|check|verify|ensure)\b/i
      };
      
      for (const [category, pattern] of Object.entries(categoryPatterns)) {
        if (pattern.test(taskDetails.title)) {
          taskDetails.category = category;
          break;
        }
      }
    }
    
    return taskDetails;
  }

  /**
   * Extract survey question from text
   * @param {string} text - The message text to analyze
   * @returns {Object} Extracted survey question details
   */
  extractSurveyQuestion(text) {
    // Determine the survey question type
    let questionType = 'overall'; // Default type
    
    if (text.toLowerCase().includes('category') || 
        text.toLowerCase().includes('visible') || 
        text.toLowerCase().includes('invisible') ||
        text.toLowerCase().includes('household') ||
        text.toLowerCase().includes('parental')) {
      questionType = 'category';
    } else if (text.toLowerCase().includes('compare') || 
             text.toLowerCase().includes('comparison') ||
             text.toLowerCase().includes('difference between') ||
             text.toLowerCase().includes('versus') ||
             text.toLowerCase().includes('vs')) {
      questionType = 'comparison';
    } else if (text.toLowerCase().includes('task') || 
             text.toLowerCase().includes('chore') ||
             text.toLowerCase().includes('responsibility') ||
             text.toLowerCase().includes('who does') ||
             text.toLowerCase().includes('who handles')) {
      questionType = 'task';
    }
    
    // Initialize question details
    const questionDetails = {
      type: questionType,
      category: null,
      task: null
    };
    
    // Extract category if type is 'category'
    if (questionType === 'category') {
      const categoryPatterns = {
        'Visible Household Tasks': /\b(?:visible\s+household|household\s+visible)\b/i,
        'Invisible Household Tasks': /\b(?:invisible\s+household|household\s+invisible|mental\s+load)\b/i,
        'Visible Parental Tasks': /\b(?:visible\s+parental|parental\s+visible|visible\s+childcare|childcare\s+visible)\b/i,
        'Invisible Parental Tasks': /\b(?:invisible\s+parental|parental\s+invisible|emotional\s+labor)\b/i
      };
      
      for (const [category, pattern] of Object.entries(categoryPatterns)) {
        if (pattern.test(text)) {
          questionDetails.category = category;
          break;
        }
      }
      
      // If no specific category found, try to identify broader categories
      if (!questionDetails.category) {
        if (text.toLowerCase().includes('household')) {
          if (text.toLowerCase().includes('invisible')) {
            questionDetails.category = 'Invisible Household Tasks';
          } else {
            questionDetails.category = 'Visible Household Tasks';
          }
        } else if (text.toLowerCase().includes('parental') || 
                  text.toLowerCase().includes('child') || 
                  text.toLowerCase().includes('kid')) {
          if (text.toLowerCase().includes('invisible') || 
              text.toLowerCase().includes('emotional')) {
            questionDetails.category = 'Invisible Parental Tasks';
          } else {
            questionDetails.category = 'Visible Parental Tasks';
          }
        }
      }
    }
    
    // Extract task if type is 'task'
    if (questionType === 'task') {
      // Look for specific task keywords
      const taskKeywords = [
        'cooking', 'cleaning', 'laundry', 'shopping', 'groceries', 
        'dishes', 'vacuuming', 'dusting', 'bathroom', 'kitchen',
        'meal planning', 'scheduling', 'appointments', 'childcare',
        'bedtime', 'homework', 'school', 'activities', 'doctor',
        'emotional support', 'mental load', 'planning', 'organizing'
      ];
      
      for (const keyword of taskKeywords) {
        if (text.toLowerCase().includes(keyword)) {
          questionDetails.task = keyword;
          break;
        }
      }
      
      // If no specific task found, try to extract task using a generic pattern
      if (!questionDetails.task) {
        const taskPattern = /\b(?:about|for|regarding|who\s+does|who\s+handles)\s+(?:the\s+)?([a-z\s]+?)(?:\?|\.|$)/i;
        const taskMatch = text.match(taskPattern);
        
        if (taskMatch && taskMatch[1]) {
          questionDetails.task = taskMatch[1].trim();
        }
      }
    }
    
    return questionDetails;
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
}

export default new ConsolidatedNLU();