// src/services/PersonalizationEngine.js
import { db } from './firebase';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import FamilyKnowledgeGraph from './FamilyKnowledgeGraph';
import ConversationContext from './ConversationContext';
import IntentClassifier from './IntentClassifier';
import { knowledgeBase } from '../data/AllieKnowledgeBase';

/**
 * Personalization Engine for Allie
 * 
 * Creates personalized and contextually relevant responses based on:
 * - Family composition and history
 * - Conversation context and past interactions
 * - Usage patterns and preferences
 * - Current emotional state and needs
 */
class PersonalizationEngine {
  constructor() {
    this.preferencesCache = {};
    this.personalityProfiles = {
      supportive: {
        tone: "warm and encouraging",
        focusAreas: ["emotional support", "acknowledgment", "reassurance"],
        responseStyle: "empathetic with practical suggestions",
        examplePhrases: [
          "I understand this is challenging. Here's something that might help...",
          "You're doing a great job balancing everything. Have you considered...?",
          "That sounds difficult. Many families find that..."
        ]
      },
      efficient: {
        tone: "clear and direct",
        focusAreas: ["practical solutions", "time-saving", "organization"],
        responseStyle: "concise with actionable steps",
        examplePhrases: [
          "Here's the most efficient approach to solve this:",
          "To save time, consider these three steps:",
          "Based on your schedule, the optimal solution is:"
        ]
      },
      analytical: {
        tone: "thoughtful and detailed",
        focusAreas: ["data insights", "pattern recognition", "deep analysis"],
        responseStyle: "thorough with evidence-based recommendations",
        examplePhrases: [
          "Analyzing your family data reveals an interesting pattern...",
          "Looking at the distribution of tasks over time, I notice that...",
          "The data suggests that a key factor in your family's balance is..."
        ]
      },
      coach: {
        tone: "motivating and developmental",
        focusAreas: ["growth opportunities", "skill building", "long-term goals"],
        responseStyle: "encouraging with strategic guidance",
        examplePhrases: [
          "This is a great opportunity to develop a system for...",
          "I notice you're making progress on... What's your next goal?",
          "Let's build on what's working and address these challenges:"
        ]
      }
    };
    
    // Default personalization settings
    this.defaultSettings = {
      personalityProfile: "supportive",
      verbosityLevel: "balanced", // concise, balanced, detailed
      focusAreas: ["workload_balance", "communication", "family_time"],
      communicationPreferences: {
        useEmoji: true,
        formatPreference: "visual", // visual, text-only
        technicalLevel: "moderate" // simplified, moderate, detailed
      },
      contentFilters: {
        researchBased: true,
        actionOriented: true,
        includeExamples: true
      }
    };
  }

  /**
   * Get family personalization settings
   * @param {string} familyId - The family identifier
   * @returns {Promise<object>} Personalization settings
   */
  async getFamilySettings(familyId) {
    try {
      // Check cache first
      if (this.preferencesCache[familyId] && 
          Date.now() - this.preferencesCache[familyId].timestamp < 5 * 60 * 1000) {
        return this.preferencesCache[familyId].settings;
      }
      
      // Get from database
      const settingsDoc = await getDoc(doc(db, "personalizationSettings", familyId));
      
      if (settingsDoc.exists()) {
        const settings = settingsDoc.data();
        
        // Update cache
        this.preferencesCache[familyId] = {
          settings,
          timestamp: Date.now()
        };
        
        return settings;
      } else {
        // Create default settings if none exist
        await this.initializeDefaultSettings(familyId);
        return this.defaultSettings;
      }
    } catch (error) {
      console.error("Error getting personalization settings:", error);
      return this.defaultSettings;
    }
  }

  /**
   * Initialize default personalization settings for a new family
   * @param {string} familyId - The family identifier
   * @returns {Promise<object>} Created settings
   */
  async initializeDefaultSettings(familyId) {
    try {
      const settings = {
        ...this.defaultSettings,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, "personalizationSettings", familyId), settings);
      
      // Update cache
      this.preferencesCache[familyId] = {
        settings,
        timestamp: Date.now()
      };
      
      return settings;
    } catch (error) {
      console.error("Error initializing personalization settings:", error);
      return this.defaultSettings;
    }
  }

  /**
   * Update personalization settings
   * @param {string} familyId - The family identifier
   * @param {object} newSettings - New settings to apply
   * @returns {Promise<object>} Updated settings
   */
  async updateSettings(familyId, newSettings) {
    try {
      const currentSettings = await this.getFamilySettings(familyId);
      
      // Merge current and new settings
      const mergedSettings = {
        ...currentSettings,
        ...newSettings,
        updatedAt: serverTimestamp()
      };
      
      // Update in database
      await updateDoc(doc(db, "personalizationSettings", familyId), mergedSettings);
      
      // Update cache
      this.preferencesCache[familyId] = {
        settings: mergedSettings,
        timestamp: Date.now()
      };
      
      return mergedSettings;
    } catch (error) {
      console.error("Error updating personalization settings:", error);
      return null;
    }
  }

  /**
   * Learn from user interactions to improve personalization
   * @param {string} familyId - The family identifier
   * @param {object} interaction - Interaction data
   * @returns {Promise<boolean>} Success indicator
   */
  async learnFromInteraction(familyId, interaction) {
    try {
      if (!familyId || !interaction) return false;
      
      const settings = await this.getFamilySettings(familyId);
      let updateNeeded = false;
      const updates = {};
      
      // Analyze interaction for personalization clues
      if (interaction.feedback === 'helpful' && interaction.intent) {
        // Track successful intents to prioritize in future
        if (!settings.prioritizedIntents) {
          settings.prioritizedIntents = {};
        }
        
        settings.prioritizedIntents[interaction.intent] = 
          (settings.prioritizedIntents[interaction.intent] || 0) + 1;
        
        updates.prioritizedIntents = settings.prioritizedIntents;
        updateNeeded = true;
      }
      
      // Learn from message length preferences
      if (interaction.messageLength && interaction.userReaction) {
        if (!settings.messageLengthPreference) {
          settings.messageLengthPreference = {
            short: 0,
            medium: 0,
            long: 0
          };
        }
        
        const lengthCategory = 
          interaction.messageLength < 300 ? 'short' :
          interaction.messageLength < 800 ? 'medium' : 'long';
        
        // Positive reaction increases preference, negative decreases
        const adjustmentValue = interaction.userReaction === 'positive' ? 1 : -1;
        settings.messageLengthPreference[lengthCategory] += adjustmentValue;
        
        updates.messageLengthPreference = settings.messageLengthPreference;
        updateNeeded = true;
        
        // Update verbosity level based on preferences
        const { short, medium, long } = settings.messageLengthPreference;
        if (short > medium && short > long) {
          updates.verbosityLevel = 'concise';
        } else if (long > short && long > medium) {
          updates.verbosityLevel = 'detailed';
        } else {
          updates.verbosityLevel = 'balanced';
        }
      }
      
      // Learn from topic interests
      if (interaction.topics && interaction.duration) {
        if (!settings.topicInterests) {
          settings.topicInterests = {};
        }
        
        // Longer engagement suggests higher interest
        interaction.topics.forEach(topic => {
          settings.topicInterests[topic] = 
            (settings.topicInterests[topic] || 0) + (interaction.duration / 1000);
        });
        
        updates.topicInterests = settings.topicInterests;
        updateNeeded = true;
      }
      
      // Apply updates if needed
      if (updateNeeded) {
        await this.updateSettings(familyId, updates);
      }
      
      return true;
    } catch (error) {
      console.error("Error learning from interaction:", error);
      return false;
    }
  }

  /**
   * Generate a personalized system prompt for AI responses
   * @param {string} familyId - The family identifier
   * @param {object} message - User message data
   * @param {object} familyContext - Family data context
   * @returns {Promise<string>} Personalized system prompt
   */
  async generatePersonalizedPrompt(familyId, message, familyContext) {
    try {
      // Get personalization settings
      const settings = await this.getFamilySettings(familyId);
      
      // Get conversation context
      const convoContext = ConversationContext.getContext(familyId);
      
      // Analyze message intent
      const intentAnalysis = IntentClassifier.analyzeMessage(
        message.text || message.content || "",
        familyId,
        familyContext
      );
      
      // Get personality profile
      const personalityProfile = this.personalityProfiles[settings.personalityProfile] || 
                                this.personalityProfiles.supportive;
      
      // Build personalized prompt sections
      const personalitySection = this.buildPersonalitySection(personalityProfile, settings);
      const contextSection = this.buildContextSection(convoContext, familyContext);
      const focusSection = this.buildFocusSection(settings, intentAnalysis);
      const formattingSection = this.buildFormattingSection(settings);
      
      // Combine into comprehensive prompt
      const prompt = `
You are Allie, a family assistant specializing in workload balance and coordination. 
Today's date is ${new Date().toLocaleDateString()}.

${personalitySection}

${contextSection}

${focusSection}

${formattingSection}

Family Data Context:
Family Name: ${familyContext.familyName || 'Your Family'}
Current Week: ${familyContext.currentWeek || 1}
Children: ${(familyContext.children || []).map(c => c.name).join(', ')}
Tasks: ${(familyContext.tasks || []).length} tasks tracked
${familyContext.surveyData?.mamaPercentage ? 
  `Current Workload Split: Mama ${familyContext.surveyData.mamaPercentage.toFixed(1)}%, Papa ${(100 - familyContext.surveyData.mamaPercentage).toFixed(1)}%` : ''}

Remember, you are a supportive partner in this family's journey toward better balance. Tailor your responses to their unique situation and needs.
`;

      return prompt;
    } catch (error) {
      console.error("Error generating personalized prompt:", error);
      
      // Return a basic prompt on error
      return `You are Allie, a family assistant specializing in workload balance and coordination. 
Today's date is ${new Date().toLocaleDateString()}.
Be helpful, supportive, and provide practical guidance based on family information.`;
    }
  }

  /**
   * Build the personality section of the prompt
   * @param {object} profile - Personality profile
   * @param {object} settings - Personalization settings
   * @returns {string} Personality prompt section
   */
  buildPersonalitySection(profile, settings) {
    return `PERSONALITY:
Communicate in a ${profile.tone} tone.
Focus particularly on ${profile.focusAreas.join(", ")}.
Your style should be ${profile.responseStyle}.
Verbosity level: ${settings.verbosityLevel === 'concise' ? 'Keep responses brief and to the point.' :
                    settings.verbosityLevel === 'detailed' ? 'Provide comprehensive, detailed responses.' :
                    'Balance detail and brevity based on the question complexity.'}

Example phrases that capture your tone:
${profile.examplePhrases.map(phrase => `- "${phrase}"`).join('\n')}`;
  }

  /**
   * Build the context section of the prompt
   * @param {object} convoContext - Conversation context
   * @param {object} familyContext - Family data context
   * @returns {string} Context prompt section
   */
  buildContextSection(convoContext, familyContext) {
    // Generate topics summary
    const topicsList = convoContext.topics && convoContext.topics.length > 0 ?
      convoContext.topics.slice(0, 3).map(t => `- ${t}`).join('\n') :
      '- No recent topics';
    
    // Generate entity references
    const entitiesList = convoContext.prominentEntities ?
      Object.entries(convoContext.prominentEntities)
        .map(([type, entity]) => `- ${type}: ${entity}`)
        .join('\n') :
      '- No specific entities';
    
    // Check if there are open questions
    const hasOpenQuestions = convoContext.openQuestions && convoContext.openQuestions.length > 0;
    
    return `CONVERSATION CONTEXT:
Message count in this session: ${convoContext.messageCount || 1}
Focus of conversation: ${convoContext.currentFocus || 'Not yet determined'}
${convoContext.messageCount > 1 ? `Dominant intent category: ${convoContext.dominantIntent || 'general'}` : ''}

Recent topics:
${topicsList}

Referenced entities:
${entitiesList}

${hasOpenQuestions ? `Open questions needing answers:
${convoContext.openQuestions.map(q => `- "${q}"`).join('\n')}` : ''}

${familyContext.weekHistory && Object.keys(familyContext.weekHistory).length > 0 ? 
  `Recent family progress:
${Object.entries(familyContext.weekHistory).slice(0, 2).map(([week, data]) => 
  `- Week ${week.replace('week', '')}: ${data.completionStatus || 'In progress'}`
).join('\n')}` : ''}`;
  }

  /**
   * Build the focus section of the prompt
   * @param {object} settings - Personalization settings
   * @param {object} intentAnalysis - Intent analysis results
   * @returns {string} Focus prompt section
   */
  buildFocusSection(settings, intentAnalysis) {
    // Determine if this intent should be prioritized based on settings
    const isPrioritizedIntent = settings.prioritizedIntents && 
                               settings.prioritizedIntents[intentAnalysis.intent];
    
    // Get relevant focus areas from settings
    const focusAreas = settings.focusAreas || ['workload_balance'];
    
    // Build focus section based on intent and focus areas
    let focusSection = `RESPONSE FOCUS:
Primary intent detected: ${intentAnalysis.intent} (${(intentAnalysis.confidence * 100).toFixed(0)}% confidence)
${isPrioritizedIntent ? 'This is a high priority intent for this family based on previous interactions.' : ''}

Prioritize these family focus areas:
${focusAreas.map(area => `- ${area.replace(/_/g, ' ')}`).join('\n')}

${settings.contentFilters?.researchBased ? 
  'Include relevant research findings from the knowledge base when appropriate.' : ''}
${settings.contentFilters?.actionOriented ? 
  'Provide clear, actionable next steps in your response.' : ''}
${settings.contentFilters?.includeExamples ? 
  'Include concrete examples that relate to this family\'s specific situation.' : ''}`;

    // Add intent-specific guidance based on detected intent
    if (intentAnalysis.intent.startsWith('task.')) {
      focusSection += `\n\nFor task management queries:
- Be specific about which family member would be responsible
- Suggest clear deadlines and follow-up mechanisms
- Connect tasks to overall workload balance goals`;
    } else if (intentAnalysis.intent.startsWith('relationship.')) {
      focusSection += `\n\nFor relationship queries:
- Emphasize how relationship health connects to family balance
- Suggest activities that respect current workload distribution
- Focus on communication and appreciation strategies`;
    } else if (intentAnalysis.intent.startsWith('child.')) {
      focusSection += `\n\nFor child-related queries:
- Consider developmental stages appropriate to the child's age
- Suggest approaches that involve both parents equitably
- Emphasize quality over quantity in parent-child interactions`;
    } else if (intentAnalysis.intent.startsWith('calendar.')) {
      focusSection += `\n\nFor calendar and scheduling queries:
- Help balance responsibilities across the schedule
- Look for potential scheduling conflicts or overload
- Suggest coordination strategies to reduce mental load`;
    }

    return focusSection;
  }

  /**
   * Build the formatting section of the prompt
   * @param {object} settings - Personalization settings
   * @returns {string} Formatting prompt section
   */
  buildFormattingSection(settings) {
    const useEmoji = settings.communicationPreferences?.useEmoji !== false;
    const formatPreference = settings.communicationPreferences?.formatPreference || 'visual';
    const technicalLevel = settings.communicationPreferences?.technicalLevel || 'moderate';
    
    return `RESPONSE FORMATTING:
${useEmoji ? 'Use appropriate emoji to add warmth and clarity to your response.' : 'Avoid using emoji in your response.'}
${formatPreference === 'visual' ? 
  'Use formatting like bullet points, numbered lists, and section headers to organize information visually.' : 
  'Focus on clear narrative text rather than visual formatting.'}

Technical detail level: ${
  technicalLevel === 'simplified' ? 'Use simplified explanations without technical terminology.' :
  technicalLevel === 'detailed' ? 'You can use technical concepts and detailed explanations.' :
  'Balance technical accuracy with accessible explanations.'
}

${settings.verbosityLevel === 'concise' ? 
  'Keep your response brief and focused on the most important information.' :
  settings.verbosityLevel === 'detailed' ? 
  'Provide comprehensive information with relevant details and context.' :
  'Adjust your response length appropriately to the complexity of the query.'
}`;
  }

  /**
   * Add personalization to a generated response
   * @param {string} response - Original AI response
   * @param {string} familyId - The family identifier
   * @param {object} familyContext - Family data context
   * @returns {Promise<string>} Personalized response
   */
  async personalizeResponse(response, familyId, familyContext) {
    try {
      // Get settings
      const settings = await this.getFamilySettings(familyId);
      
      // If response is already good, just return it
      if (!response || response.length < 20) return response;
      
      let personalizedResponse = response;
      
      // Apply personalization transformations
      
      // 1. Adjust verbosity if needed
      if (settings.verbosityLevel === 'concise' && response.length > 500) {
        personalizedResponse = this.reduceVerbosity(personalizedResponse);
      } else if (settings.verbosityLevel === 'detailed' && response.length < 300) {
        personalizedResponse = this.enhanceDetail(personalizedResponse, familyContext);
      }
      
      // 2. Add or remove emoji based on preferences
      if (settings.communicationPreferences?.useEmoji === true && !containsEmoji(personalizedResponse)) {
        personalizedResponse = this.addAppropriateEmoji(personalizedResponse);
      } else if (settings.communicationPreferences?.useEmoji === false) {
        personalizedResponse = this.removeEmoji(personalizedResponse);
      }
      
      // 3. Apply formatting based on preferences
      if (settings.communicationPreferences?.formatPreference === 'visual') {
        personalizedResponse = this.enhanceVisualFormatting(personalizedResponse);
      } else if (settings.communicationPreferences?.formatPreference === 'text-only') {
        personalizedResponse = this.convertToPlainText(personalizedResponse);
      }
      
      // 4. Add name personalization
      personalizedResponse = this.addNamePersonalization(personalizedResponse, familyContext);
      
      return personalizedResponse;
    } catch (error) {
      console.error("Error personalizing response:", error);
      return response; // Return original response on error
    }
  }

  /**
   * Reduce verbosity of response for concise preference
   * @param {string} response - Original response
   * @returns {string} Condensed response
   */
  reduceVerbosity(response) {
    // Split into paragraphs
    const paragraphs = response.split('\n\n').filter(p => p.trim().length > 0);
    
    // If very few paragraphs, just return as is
    if (paragraphs.length <= 2) return response;
    
    // Keep introduction and most important paragraphs
    let condensed = paragraphs[0]; // Keep intro
    
    // Find paragraphs with key indicators of importance
    const importantParagraphs = paragraphs.filter(p => 
      p.includes("important") || 
      p.includes("key") || 
      p.includes("recommend") ||
      p.includes("suggest") ||
      p.includes("should") ||
      p.match(/\d+%/) // Contains percentages
    );
    
    if (importantParagraphs.length > 0) {
      condensed += '\n\n' + importantParagraphs[0];
    } else if (paragraphs.length > 1) {
      // Just take the second paragraph if no important ones found
      condensed += '\n\n' + paragraphs[1];
    }
    
    // Always include the last paragraph as it often contains conclusion/next steps
    if (paragraphs.length > 2 && paragraphs[paragraphs.length - 1] !== importantParagraphs[0]) {
      condensed += '\n\n' + paragraphs[paragraphs.length - 1];
    }
    
    return condensed;
  }

  /**
   * Enhance response with additional details
   * @param {string} response - Original response
   * @param {object} familyContext - Family context data
   * @returns {string} Enhanced response
   */
  enhanceDetail(response, familyContext) {
    // If already long enough, don't enhance
    if (response.length > 500) return response;
    
    // Add relevant context from family data
    let enhanced = response;
    
    // Add task-related details if available
    if (familyContext.tasks && familyContext.tasks.length > 0 && 
        (response.includes("task") || response.includes("chore") || response.includes("responsibility"))) {
      const pendingTasks = familyContext.tasks.filter(t => !t.completed);
      if (pendingTasks.length > 0) {
        enhanced += `\n\nYou currently have ${pendingTasks.length} pending tasks in your family dashboard. `;
        enhanced += `The next one due is "${pendingTasks[0].title}" assigned to ${pendingTasks[0].assignedToName}.`;
      }
    }
    
    // Add survey-related details if available
    if (familyContext.surveyData && familyContext.surveyData.mamaPercentage && 
        (response.includes("survey") || response.includes("workload") || response.includes("balance"))) {
      enhanced += `\n\nBased on your latest survey data, the workload distribution is: `;
      enhanced += `Mama ${familyContext.surveyData.mamaPercentage.toFixed(1)}%, `;
      enhanced += `Papa ${(100 - familyContext.surveyData.mamaPercentage).toFixed(1)}%.`;
    }
    
    // Add relationship details if relevant
    if (familyContext.relationshipData && 
        (response.includes("relationship") || response.includes("partner") || response.includes("couple"))) {
      if (familyContext.relationshipData.topStrategy) {
        enhanced += `\n\nYour most successful relationship strategy has been "${familyContext.relationshipData.topStrategy}".`;
      }
    }
    
    return enhanced;
  }

  /**
   * Add appropriate emoji to response
   * @param {string} response - Original response
   * @returns {string} Response with emoji
   */
  addAppropriateEmoji(response) {
    // Map of keywords to emoji
    const emojiMap = {
      'task': '✅',
      'balance': '⚖️',
      'family': '👨‍👩‍👧‍👦',
      'calendar': '📅',
      'schedule': '🗓️',
      'important': '⭐',
      'reminder': '⏰',
      'suggestion': '💡',
      'idea': '💡',
      'help': '🆘',
      'relationship': '❤️',
      'growth': '📈',
      'celebrate': '🎉',
      'progress': '🚀',
      'warning': '⚠️',
      'congratulations': '🎊',
      'child': '👶',
      'children': '👶',
      'work': '💼',
      'note': '📝',
      'meeting': '🤝',
      'appointment': '🗓️'
    };
    
    // Add emoji at the start of appropriate paragraphs
    const paragraphs = response.split('\n\n');
    const enhancedParagraphs = paragraphs.map(p => {
      // Skip if paragraph already has an emoji
      if (containsEmoji(p)) return p;
      
      // Find a matching keyword for this paragraph
      for (const [keyword, emoji] of Object.entries(emojiMap)) {
        if (p.toLowerCase().includes(keyword)) {
          return `${emoji} ${p}`;
        }
      }
      
      return p;
    });
    
    return enhancedParagraphs.join('\n\n');
  }

  /**
   * Remove emoji from response
   * @param {string} response - Original response
   * @returns {string} Response without emoji
   */
  removeEmoji(response) {
    // Simple emoji removal using regex
    return response.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').replace(/\s+/g, ' ');
  }

  /**
   * Enhance visual formatting of response
   * @param {string} response - Original response
   * @returns {string} Response with enhanced formatting
   */
  enhanceVisualFormatting(response) {
    // Already well-formatted, return as is
    if (response.includes('###') || response.includes('##') || 
        response.includes('- ') || response.includes('1. ')) {
      return response;
    }
    
    // Split into paragraphs
    const paragraphs = response.split('\n\n');
    
    // Format first paragraph (introduction) - leave as is
    let formatted = paragraphs[0];
    
    // Look for key points/lists and format them
    for (let i = 1; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      
      // Skip empty paragraphs
      if (!p.trim()) continue;
      
      // Check if this looks like a section header
      if (p.split('\n').length === 1 && p.length < 60 && 
         (p.endsWith(':') || p.includes('tips') || p.includes('steps') || 
          p.includes('strategies') || p.includes('ideas'))) {
        // Format as a header
        formatted += '\n\n## ' + p;
      }
      // Check if this looks like a list of items
      else if (p.includes(', ') && !p.includes('.')) {
        // Convert comma-separated list to bullet points
        const items = p.split(', ').map(item => item.trim()).filter(item => item.length > 0);
        formatted += '\n\n' + items.map(item => `- ${item}`).join('\n');
      }
      // Default formatting
      else {
        formatted += '\n\n' + p;
      }
    }
    
    return formatted;
  }

  /**
   * Convert formatted response to plain text
   * @param {string} response - Original formatted response
   * @returns {string} Plain text response
   */
  convertToPlainText(response) {
    // Remove markdown headers
    let plainText = response.replace(/#+\s+/g, '');
    
    // Convert bullet points to plain text
    plainText = plainText.replace(/- /g, '• ');
    
    // Convert numbered lists to plain text
    plainText = plainText.replace(/\d+\.\s+/g, '• ');
    
    // Remove any other markdown syntax
    plainText = plainText.replace(/\*\*(.*?)\*\*/g, '$1');
    plainText = plainText.replace(/\*(.*?)\*/g, '$1');
    plainText = plainText.replace(/__(.*?)__/g, '$1');
    plainText = plainText.replace(/_(.*?)_/g, '$1');
    
    return plainText;
  }

  /**
   * Add name personalization to response
   * @param {string} response - Original response
   * @param {object} familyContext - Family context
   * @returns {string} Personalized response with names
   */
  addNamePersonalization(response, familyContext) {
    // If no family members, return original
    if (!familyContext.familyMembers || familyContext.familyMembers.length === 0) {
      return response;
    }
    
    let personalized = response;
    
    // Replace generic terms with actual names
    const parents = familyContext.familyMembers.filter(m => m.role === 'parent');
    const children = familyContext.familyMembers.filter(m => m.role === 'child');
    
    // Replace parent references
    if (parents.length > 0) {
      const mamaName = parents.find(p => p.roleType === 'Mama')?.name;
      const papaName = parents.find(p => p.roleType === 'Papa')?.name;
      
      if (mamaName) {
        personalized = personalized.replace(/\b(mom|mother|mama)\b/gi, mamaName);
      }
      
      if (papaName) {
        personalized = personalized.replace(/\b(dad|father|papa)\b/gi, papaName);
      }
    }
    
    // Replace child references if there's only one child
    if (children.length === 1) {
      const childName = children[0].name;
      personalized = personalized.replace(/\b(your child|the child)\b/gi, childName);
    }
    
    // Add family name if available
    if (familyContext.familyName) {
      personalized = personalized.replace(/\b(your family|the family)\b/gi, `the ${familyContext.familyName} family`);
    }
    
    return personalized;
  }

  /**
   * Get adaptation suggestions based on family usage patterns
   * @param {string} familyId - The family identifier
   * @returns {Promise<Array>} Adaptation suggestions
   */
  async getAdaptationSuggestions(familyId) {
    try {
      // Get settings and usage data
      const settings = await this.getFamilySettings(familyId);
      
      // Access knowledge graph for pattern detection
      const graph = await FamilyKnowledgeGraph.getGraph(familyId);
      
      const suggestions = [];
      
      // Analyze message length preferences
      if (settings.messageLengthPreference) {
        const { short, medium, long } = settings.messageLengthPreference;
        const total = short + medium + long;
        
        if (total >= 10) { // Only suggest if we have enough data
          const shortPct = (short / total) * 100;
          const longPct = (long / total) * 100;
          
          if (shortPct > 60 && settings.verbosityLevel !== 'concise') {
            suggestions.push({
              type: 'verbosity',
              suggestion: 'concise',
              confidence: shortPct / 100,
              reason: 'User has positively responded to shorter messages more than 60% of the time.'
            });
          } else if (longPct > 60 && settings.verbosityLevel !== 'detailed') {
            suggestions.push({
              type: 'verbosity',
              suggestion: 'detailed',
              confidence: longPct / 100,
              reason: 'User has positively responded to detailed messages more than 60% of the time.'
            });
          }
        }
      }
      
      // Analyze topic interests for focus areas
      if (settings.topicInterests && Object.keys(settings.topicInterests).length >= 3) {
        // Get top 3 topics by engagement time
        const sortedTopics = Object.entries(settings.topicInterests)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([topic]) => topic);
        
        // Map topics to focus areas
        const focusAreaMapping = {
          'task': 'task_management',
          'balance': 'workload_balance',
          'child': 'child_development',
          'relationship': 'relationship_support',
          'calendar': 'schedule_coordination',
          'survey': 'data_insights'
        };
        
        // Generate focus area suggestions
        const suggestedFocusAreas = [];
        sortedTopics.forEach(topic => {
          for (const [key, area] of Object.entries(focusAreaMapping)) {
            if (topic.includes(key) && !suggestedFocusAreas.includes(area)) {
              suggestedFocusAreas.push(area);
              break;
            }
          }
        });
        
        if (suggestedFocusAreas.length > 0 && 
            !settings.focusAreas?.every(area => suggestedFocusAreas.includes(area))) {
          suggestions.push({
            type: 'focusAreas',
            suggestion: suggestedFocusAreas,
            confidence: 0.7,
            reason: 'User shows higher engagement with these topic areas.'
          });
        }
      }
      
      // Analyze personality profile fit
      if (settings.prioritizedIntents) {
        const intentTypes = Object.keys(settings.prioritizedIntents);
        
        // Determine best personality profile based on intent patterns
        let suggestedProfile = settings.personalityProfile;
        
        // Count intent categories
        const supportiveCount = intentTypes.filter(i => 
          i.includes('help') || i.includes('support') || i.includes('advice')
        ).length;
        
        const efficientCount = intentTypes.filter(i => 
          i.includes('task') || i.includes('schedule') || i.includes('calendar')
        ).length;
        
        const analyticalCount = intentTypes.filter(i => 
          i.includes('data') || i.includes('analysis') || i.includes('survey')
        ).length;
        
        const coachCount = intentTypes.filter(i => 
          i.includes('learn') || i.includes('improve') || i.includes('develop')
        ).length;
        
        // Find highest count
        const counts = {
          supportive: supportiveCount,
          efficient: efficientCount,
          analytical: analyticalCount,
          coach: coachCount
        };
        
        const bestProfile = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])[0][0];
        
        // If different from current and has at least 3 matching intents
        if (bestProfile !== settings.personalityProfile && counts[bestProfile] >= 3) {
          suggestions.push({
            type: 'personalityProfile',
            suggestion: bestProfile,
            confidence: 0.6 + (counts[bestProfile] * 0.05),
            reason: `User's interaction patterns align better with the ${bestProfile} personality profile.`
          });
        }
      }
      
      return suggestions;
    } catch (error) {
      console.error("Error getting adaptation suggestions:", error);
      return [];
    }
  }

  /**
   * Apply automatic adaptations based on usage patterns
   * @param {string} familyId - The family identifier
   * @returns {Promise<boolean>} Success indicator
   */
  async applyAutomaticAdaptations(familyId) {
    try {
      // Get adaptation suggestions
      const suggestions = await this.getAdaptationSuggestions(familyId);
      
      // Filter to high-confidence suggestions
      const highConfidenceSuggestions = suggestions.filter(s => s.confidence >= 0.8);
      
      if (highConfidenceSuggestions.length === 0) {
        return false; // No high-confidence suggestions
      }
      
      // Apply each suggestion
      const updates = {};
      
      highConfidenceSuggestions.forEach(suggestion => {
        updates[suggestion.type] = suggestion.suggestion;
      });
      
      // Update settings
      await this.updateSettings(familyId, updates);
      
      // Log adaptations
      const adaptationsRef = doc(db, "personalizationAdaptations", familyId);
      const adaptationsSnap = await getDoc(adaptationsRef);
      
      if (adaptationsSnap.exists()) {
        await updateDoc(adaptationsRef, {
          adaptations: arrayUnion({
            timestamp: serverTimestamp(),
            suggestions: highConfidenceSuggestions
          })
        });
      } else {
        await setDoc(adaptationsRef, {
          adaptations: [{
            timestamp: serverTimestamp(),
            suggestions: highConfidenceSuggestions
          }]
        });
      }
      
      return true;
    } catch (error) {
      console.error("Error applying automatic adaptations:", error);
      return false;
    }
  }
}

/**
 * Helper function to check if text contains emoji
 * @param {string} text - Text to check
 * @returns {boolean} True if text contains emoji
 */
function containsEmoji(text) {
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  return emojiRegex.test(text);
}

export default new PersonalizationEngine();