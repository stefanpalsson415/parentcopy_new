// src/services/FeedbackLearningSystem.js
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp, 
  updateDoc, 
  doc
} from 'firebase/firestore';

class FeedbackLearningSystem {
  constructor() {
    this.feedbackCategories = [
      'helpful', 
      'unhelpful', 
      'incorrect_information',
      'confusing',
      'incomplete',
      'other'
    ];
    
    this.responseTriggers = {};
    this.learningRate = 0.05; // How quickly to adapt to feedback
    this.minSamples = 5; // Minimum samples needed before pattern adaptation
  }

  /**
   * Record user feedback about an AI response
   * @param {string} messageId - ID of the response message
   * @param {string} category - Feedback category
   * @param {string} comment - Optional user comment
   * @param {object} context - Conversation context when feedback was given
   * @returns {Promise<boolean>} - Success indicator
   */
  async recordFeedback(messageId, category, comment = null, context = {}) {
    try {
      // Validate category
      if (!this.feedbackCategories.includes(category)) {
        console.error(`Invalid feedback category: ${category}`);
        return false;
      }
      
      // Create feedback record
      const feedbackData = {
        messageId,
        category,
        comment,
        timestamp: serverTimestamp(),
        familyId: context.familyId || null,
        intentDetected: context.intent || null,
        messagePattern: context.messagePattern || null,
        familyContext: {
          currentWeek: context.currentWeek || null,
          hasChildren: context.hasChildren || false,
          hasCompletedSurvey: context.hasCompletedSurvey || false
        }
      };
      
      // Add to Firestore
      await addDoc(collection(db, "ai_feedback"), feedbackData);
      
      // Update in-memory patterns
      await this.updateResponsePatterns(category, context);
      
      return true;
    } catch (error) {
      console.error("Error recording feedback:", error);
      return false;
    }
  }

  /**
   * Update response patterns based on received feedback
   * @param {string} category - Feedback category
   * @param {object} context - Conversation context
   * @returns {Promise<void>}
   */
  async updateResponsePatterns(category, context) {
    try {
      // Skip pattern update if we don't have enough context
      if (!context.intent) return;
      
      const intent = context.intent;
      
      // Initialize if needed
      if (!this.responseTriggers[intent]) {
        this.responseTriggers[intent] = {
          sampleCount: 0,
          categories: {},
          contextFactors: {}
        };
      }
      
      // Update counts
      this.responseTriggers[intent].sampleCount++;
      this.responseTriggers[intent].categories[category] = 
        (this.responseTriggers[intent].categories[category] || 0) + 1;
      
      // Track context factors
      const factorKeys = [
        'hasChildren', 
        'hasCompletedSurvey', 
        'currentWeek', 
        'hasPartner', 
        'recentlyJoined'
      ];
      
      factorKeys.forEach(factor => {
        if (context[factor] !== undefined) {
          if (!this.responseTriggers[intent].contextFactors[factor]) {
            this.responseTriggers[intent].contextFactors[factor] = {
              true: { total: 0, byCategory: {} },
              false: { total: 0, byCategory: {} }
            };
          }
          
          const value = !!context[factor];
          this.responseTriggers[intent].contextFactors[factor][value ? 'true' : 'false'].total++;
          
          if (!this.responseTriggers[intent].contextFactors[factor][value ? 'true' : 'false'].byCategory[category]) {
            this.responseTriggers[intent].contextFactors[factor][value ? 'true' : 'false'].byCategory[category] = 0;
          }
          
          this.responseTriggers[intent].contextFactors[factor][value ? 'true' : 'false'].byCategory[category]++;
        }
      });
      
      // For intents with enough samples, save to database
      if (this.responseTriggers[intent].sampleCount >= this.minSamples) {
        await this.savePatternsToDB(intent);
      }
    } catch (error) {
      console.error("Error updating response patterns:", error);
    }
  }

  /**
   * Save learned patterns to database for persistence
   * @param {string} intent - The intent to save patterns for
   */
  async savePatternsToDB(intent) {
    try {
      const patternData = this.responseTriggers[intent];
      
      // Create or update document in patterns collection
      const patternRef = doc(db, "ai_response_patterns", intent);
      
      await updateDoc(patternRef, {
        sampleCount: patternData.sampleCount,
        categories: patternData.categories,
        contextFactors: patternData.contextFactors,
        lastUpdated: serverTimestamp()
      });
    } catch (error) {
      console.error(`Error saving patterns for intent ${intent}:`, error);
      
      // If document doesn't exist yet, create it
      try {
        const patternData = this.responseTriggers[intent];
        
        await addDoc(collection(db, "ai_response_patterns"), {
          intent,
          sampleCount: patternData.sampleCount,
          categories: patternData.categories,
          contextFactors: patternData.contextFactors,
          lastUpdated: serverTimestamp()
        });
      } catch (createError) {
        console.error(`Error creating pattern document for intent ${intent}:`, createError);
      }
    }
  }

  /**
   * Load feedback patterns from database on startup
   */
  async loadPatternsFromDB() {
    try {
      const patternsSnapshot = await getDocs(collection(db, "ai_response_patterns"));
      
      patternsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.intent) {
          this.responseTriggers[data.intent] = {
            sampleCount: data.sampleCount || 0,
            categories: data.categories || {},
            contextFactors: data.contextFactors || {}
          };
        }
      });
      
      console.log(`Loaded ${Object.keys(this.responseTriggers).length} response patterns`);
    } catch (error) {
      console.error("Error loading feedback patterns:", error);
    }
  }

  /**
   * Get feedback data for a specific family
   * @param {string} familyId - The family ID
   * @returns {Promise<Array>} - Array of feedback entries
   */
  async getFamilyFeedback(familyId) {
    try {
      const feedbackQuery = query(
        collection(db, "ai_feedback"),
        where("familyId", "==", familyId)
      );
      
      const snapshot = await getDocs(feedbackQuery);
      
      const feedback = [];
      snapshot.forEach(doc => {
        feedback.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return feedback;
    } catch (error) {
      console.error("Error getting family feedback:", error);
      return [];
    }
  }

  /**
   * Generate insights about feedback patterns
   * @returns {Promise<object>} - Feedback insights
   */
  async generateInsights() {
    try {
      // Calculate global metrics
      const totalFeedback = Object.values(this.responseTriggers)
        .reduce((sum, data) => sum + data.sampleCount, 0);
      
      const categoryTotals = {};
      this.feedbackCategories.forEach(category => {
        categoryTotals[category] = 0;
      });
      
      // Sum up category counts across all intents
      Object.values(this.responseTriggers).forEach(data => {
        Object.entries(data.categories || {}).forEach(([category, count]) => {
          if (categoryTotals[category] !== undefined) {
            categoryTotals[category] += count;
          }
        });
      });
      
      // Find intents with most negative feedback
      const intentsByNegativeFeedback = Object.entries(this.responseTriggers)
        .map(([intent, data]) => {
          const negative = (data.categories.unhelpful || 0) + 
                          (data.categories.incorrect_information || 0) +
                          (data.categories.confusing || 0);
          const ratio = data.sampleCount > 0 ? negative / data.sampleCount : 0;
          
          return {
            intent,
            negativeRatio: ratio,
            sampleCount: data.sampleCount
          };
        })
        .filter(item => item.sampleCount >= this.minSamples)
        .sort((a, b) => b.negativeRatio - a.negativeRatio);
      
      // Find most helpful intent patterns
      const intentsByPositiveFeedback = Object.entries(this.responseTriggers)
        .map(([intent, data]) => {
          const positive = data.categories.helpful || 0;
          const ratio = data.sampleCount > 0 ? positive / data.sampleCount : 0;
          
          return {
            intent,
            positiveRatio: ratio,
            sampleCount: data.sampleCount
          };
        })
        .filter(item => item.sampleCount >= this.minSamples)
        .sort((a, b) => b.positiveRatio - a.positiveRatio);
      
      return {
        totalFeedback,
        categoryTotals,
        needsImprovement: intentsByNegativeFeedback.slice(0, 5),
        mostHelpful: intentsByPositiveFeedback.slice(0, 5),
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error generating feedback insights:", error);
      return {
        totalFeedback: 0,
        categoryTotals: {},
        needsImprovement: [],
        mostHelpful: [],
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Apply feedback learnings to improve prompt generation
   * @param {string} intent - Detected intent
   * @param {object} context - Conversation and family context
   * @returns {object} - Prompt optimization suggestions
   */
  getPromptOptimizations(intent, context) {
    // Default optimization suggestions
    const optimizations = {
      shouldAddContext: false,
      contextPriorities: [],
      cautionAreas: [],
      suggestedApproach: null,
      confidenceLevel: 0
    };
    
    // Check if we have data for this intent
    if (!this.responseTriggers[intent] || 
        this.responseTriggers[intent].sampleCount < this.minSamples) {
      return optimizations;
    }
    
    const intentData = this.responseTriggers[intent];
    
    // Calculate confidence level based on sample size
    optimizations.confidenceLevel = Math.min(
      0.9, 
      0.5 + (intentData.sampleCount / 100) * 0.4
    );
    
    // Check for problematic patterns
    const confusingRatio = (intentData.categories.confusing || 0) / intentData.sampleCount;
    const incorrectRatio = (intentData.categories.incorrect_information || 0) / intentData.sampleCount;
    
    if (confusingRatio > 0.2) {
      optimizations.cautionAreas.push('clarity');
      optimizations.shouldAddContext = true;
    }
    
    if (incorrectRatio > 0.15) {
      optimizations.cautionAreas.push('accuracy');
      optimizations.shouldAddContext = true;
    }
    
    // Analyze context factors for positive correlation
    Object.entries(intentData.contextFactors).forEach(([factor, data]) => {
      const trueTotal = data.true?.total || 0;
      const falseTotal = data.false?.total || 0;
      
      if (trueTotal > 0 && falseTotal > 0) {
        const trueHelpful = data.true?.byCategory?.helpful || 0;
        const falseHelpful = data.false?.byCategory?.helpful || 0;
        
        const trueHelpfulRatio = trueHelpful / trueTotal;
        const falseHelpfulRatio = falseHelpful / falseTotal;
        
        // If there's a significant difference in helpfulness based on this factor
        if (Math.abs(trueHelpfulRatio - falseHelpfulRatio) > 0.2) {
          // Add to context priorities if the current context matches the more successful pattern
          const currentValueMatches = !!context[factor] === (trueHelpfulRatio > falseHelpfulRatio);
          
          if (!currentValueMatches) {
            optimizations.contextPriorities.push(factor);
            optimizations.shouldAddContext = true;
          }
        }
      }
    });
    
    // Determine suggested approach based on feedback patterns
    const helpfulRatio = (intentData.categories.helpful || 0) / intentData.sampleCount;
    const incompleteRatio = (intentData.categories.incomplete || 0) / intentData.sampleCount;
    
    if (helpfulRatio > 0.7) {
      optimizations.suggestedApproach = 'standard'; // Current approach works well
    } else if (incompleteRatio > 0.3) {
      optimizations.suggestedApproach = 'comprehensive'; // Need more details
    } else if (confusingRatio > 0.3) {
      optimizations.suggestedApproach = 'simplified'; // Need simpler explanation
    } else {
      optimizations.suggestedApproach = 'balanced'; // Balance detail and clarity
    }
    
    return optimizations;
  }
}

export default new FeedbackLearningSystem();