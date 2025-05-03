// src/services/ParserFeedbackService.js
import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore';

/**
 * Service for tracking and learning from event parser feedback
 * Captures original inputs, initial parsed results, and user edits
 * to improve event parsing over time
 */
class ParserFeedbackService {
  constructor() {
    this.feedbackCollection = 'parser_feedback';
    this.processingQueue = [];
    this.isProcessing = false;
  }

  /**
   * Record feedback from a user edit of a parsed event
   * @param {Object} feedbackData Object containing original input, initial parse, and user edits
   * @returns {Promise<Object>} Result of the feedback submission
   */
  async recordFeedback(feedbackData) {
    try {
      // Validate required fields
      if (!feedbackData.originalInput || !feedbackData.initialParse || !feedbackData.userEdits) {
        console.warn("Incomplete feedback data:", feedbackData);
        return { success: false, error: "Incomplete feedback data" };
      }

      // Add metadata
      const enhancedFeedback = {
        ...feedbackData,
        timestamp: serverTimestamp(),
        processed: false,
        learningApplied: false
      };

      // Store in Firestore
      const docRef = await addDoc(collection(db, this.feedbackCollection), enhancedFeedback);
      console.log("Parser feedback recorded with ID:", docRef.id);

      // Add to processing queue
      this.processingQueue.push({
        id: docRef.id,
        data: enhancedFeedback
      });

      // Try to process the queue
      this.processQueue();

      return { success: true, id: docRef.id };
    } catch (error) {
      console.error("Error recording parser feedback:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process the feedback queue to identify learning opportunities
   * @private
   */
  async processQueue() {
    // Only one processing operation at a time
    if (this.isProcessing || this.processingQueue.length === 0) return;

    try {
      this.isProcessing = true;
      const item = this.processingQueue.shift();

      // Analyze differences between initial parse and user edits
      const learningData = this.analyzeDifferences(item.data);

      // Store the learning data in Firebase for future model improvements
      this.storeFeedbackLearningData(learningData)
        .then(() => console.log("Saved parser feedback learning data"))
        .catch(err => console.error("Error saving parser feedback:", err));

      this.isProcessing = false;
      this.processQueue(); // Process next item if available
    } catch (error) {
      console.error("Error processing parser feedback:", error);
      this.isProcessing = false;
    }
  }

  /**
   * Analyze differences between initial parse and user edits
   * @param {Object} feedbackData The feedback data to analyze
   * @returns {Object} Analysis of differences and learning opportunities
   * @private
   */
  analyzeDifferences(feedbackData) {
    const { originalInput, initialParse, userEdits } = feedbackData;
    const differences = {};
    const learning = {
      sourceText: originalInput,
      fieldCorrections: [],
      parsingHints: []
    };

    // Compare each field to identify differences
    Object.keys(userEdits).forEach(field => {
      // Skip fields that aren't in the initial parse
      if (!(field in initialParse)) return;

      // Check if the value changed
      const initialValue = initialParse[field];
      const editedValue = userEdits[field];

      if (this.valuesAreDifferent(initialValue, editedValue)) {
        differences[field] = {
          initial: initialValue,
          edited: editedValue
        };

        // Add to learning data
        learning.fieldCorrections.push({
          field,
          initial: initialValue,
          corrected: editedValue,
          pattern: this.detectPattern(originalInput, field, editedValue)
        });
      }
    });

    // Date-specific learning
    if (differences.dateObj) {
      learning.parsingHints.push(this.analyzeDateCorrection(
        originalInput, 
        initialParse.dateObj, 
        userEdits.dateObj
      ));
    }

    // Location-specific learning
    if (differences.location) {
      learning.parsingHints.push({
        type: 'location',
        pattern: this.extractLocationPattern(originalInput, userEdits.location)
      });
    }

    return learning;
  }

  /**
   * Check if two values are different, handling various types
   * @param {any} value1 First value to compare
   * @param {any} value2 Second value to compare
   * @returns {boolean} True if values are different
   * @private
   */
  valuesAreDifferent(value1, value2) {
    // Handle date objects
    if (value1 instanceof Date && value2 instanceof Date) {
      return value1.getTime() !== value2.getTime();
    }

    // Handle strings (case-insensitive comparison)
    if (typeof value1 === 'string' && typeof value2 === 'string') {
      return value1.toLowerCase() !== value2.toLowerCase();
    }

    // Default comparison
    return value1 !== value2;
  }

  /**
   * Detect patterns in text related to corrected values
   * @param {string} text Original input text
   * @param {string} field The field being analyzed
   * @param {any} correctedValue The user-corrected value
   * @returns {Object} Pattern information
   * @private
   */
  detectPattern(text, field, correctedValue) {
    // Basic pattern detection
    const textLower = text.toLowerCase();
    const valueStr = typeof correctedValue === 'string' 
      ? correctedValue.toLowerCase() 
      : String(correctedValue).toLowerCase();

    let pattern = {
      field,
      textContainsValue: textLower.includes(valueStr),
      valueSimilarWords: []
    };

    // Check for similar words in text
    if (!pattern.textContainsValue && typeof correctedValue === 'string') {
      const words = correctedValue.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3 && textLower.includes(word)) {
          pattern.valueSimilarWords.push(word);
        }
      });
    }

    return pattern;
  }

  /**
   * Analyze date corrections to improve date parsing
   * @param {string} text Original input text
   * @param {Date} initialDate Initially parsed date
   * @param {Date} correctedDate User-corrected date
   * @returns {Object} Date correction analysis
   * @private
   */
  analyzeDateCorrection(text, initialDate, correctedDate) {
    // Extract potential date formats
    const datePatterns = [
      /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/g, // MM/DD or DD/MM
      /(\d{1,2})[.-](\d{1,2})(?:[.-](\d{2,4}))?/g, // DD.MM or MM-DD
      /(\d{4})-(\d{1,2})-(\d{1,2})/g, // YYYY-MM-DD
      /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/gi // Month name + day
    ];
    
    const dateMatches = [];
    for (const pattern of datePatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        dateMatches.push(...matches.map(m => m[0]));
      }
    }

    // Analyze time differences
    const hourDiff = correctedDate.getHours() - initialDate.getHours();
    const minuteDiff = correctedDate.getMinutes() - initialDate.getMinutes();
    const dateDiff = correctedDate.getDate() - initialDate.getDate();
    const monthDiff = correctedDate.getMonth() - initialDate.getMonth();

    return {
      type: 'date',
      dateStrings: dateMatches,
      hourDiff,
      minuteDiff,
      dateDiff,
      monthDiff,
      isSameDay: dateDiff === 0 && monthDiff === 0,
      isTimeCorrection: dateDiff === 0 && monthDiff === 0 && (hourDiff !== 0 || minuteDiff !== 0),
      isDayCorrection: dateDiff !== 0 || monthDiff !== 0
    };
  }

  /**
   * Extract location patterns from text based on corrected location
   * @param {string} text Original input text
   * @param {string} location Corrected location
   * @returns {Object} Location pattern information
   * @private
   */
  extractLocationPattern(text, location) {
    const locationWords = location.toLowerCase().split(/\s+/);
    const locationContext = [];
    
    // Look for context around location words
    locationWords.forEach(word => {
      if (word.length < 3) return; // Skip short words
      
      const index = text.toLowerCase().indexOf(word);
      if (index >= 0) {
        // Extract surrounding context (10 chars before and after)
        const start = Math.max(0, index - 10);
        const end = Math.min(text.length, index + word.length + 10);
        locationContext.push(text.substring(start, end));
      }
    });

    // Check for common location prepositions
    const prepositions = ['at', 'in', 'near', 'by', 'from'];
    const prepositionUsed = prepositions.find(prep => 
      text.toLowerCase().includes(`${prep} ${locationWords[0]}`)
    );

    return {
      locationWords,
      locationContext,
      prepositionUsed
    };
  }

  /**
   * Get learning insights from collected feedback
   * @returns {Promise<Array>} Array of learning insights
   */
  async getLearningInsights() {
    try {
      // Get recent feedback entries
      const q = query(
        collection(db, this.feedbackCollection),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      
      const querySnapshot = await getDocs(q);
      const feedbackEntries = [];
      
      querySnapshot.forEach((doc) => {
        feedbackEntries.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Analyze patterns in feedback
      const patterns = this.analyzePatterns(feedbackEntries);
      
      return {
        totalEntries: feedbackEntries.length,
        patterns,
        recentUpdates: feedbackEntries.slice(0, 5)
      };
    } catch (error) {
      console.error("Error getting learning insights:", error);
      return { totalEntries: 0, patterns: [], recentUpdates: [] };
    }
  }

  /**
   * Analyze patterns across multiple feedback entries
   * @param {Array} entries Feedback entries to analyze
   * @returns {Array} Pattern analysis results
   * @private
   */
  analyzePatterns(entries) {
    // Field correction frequencies
    const fieldCorrections = {};
    
    // Count corrections by field
    entries.forEach(entry => {
      if (!entry.initialParse || !entry.userEdits) return;
      
      Object.keys(entry.userEdits).forEach(field => {
        if (!(field in entry.initialParse)) return;
        
        if (this.valuesAreDifferent(entry.initialParse[field], entry.userEdits[field])) {
          if (!fieldCorrections[field]) {
            fieldCorrections[field] = { count: 0, examples: [] };
          }
          
          fieldCorrections[field].count++;
          
          // Add example if we don't have many yet
          if (fieldCorrections[field].examples.length < 3) {
            fieldCorrections[field].examples.push({
              originalInput: entry.originalInput,
              initial: entry.initialParse[field],
              corrected: entry.userEdits[field]
            });
          }
        }
      });
    });
    
    // Sort fields by correction frequency
    const sortedFields = Object.keys(fieldCorrections).sort(
      (a, b) => fieldCorrections[b].count - fieldCorrections[a].count
    );
    
    return {
      mostCorrectedFields: sortedFields,
      fieldCorrections
    };
  }
}

export default new ParserFeedbackService();