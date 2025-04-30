// src/services/ActionLearningSystem.js
import { db } from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  serverTimestamp, 
  increment, 
  arrayUnion,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';

/**
 * System to track and learn from action successes/failures
 */
class ActionLearningSystem {
  constructor() {
    this.db = db;
    this.recordLimit = 1000; // Maximum records to keep per action type
  }
  
  /**
   * Record an action attempt and result
   * @param {string} actionType - The type of action attempted
   * @param {string} message - The user message
   * @param {boolean} success - Whether action succeeded
   * @param {Object} details - Additional details about the action
   * @returns {Promise<boolean>} Success of recording
   */
  async recordAction(actionType, message, success, details = {}) {
    try {
      if (!actionType || !message) return false;
      
      const timestamp = new Date();
      
      // Record in actionHistory collection
      const actionRecord = {
        actionType,
        message: message.substring(0, 300), // Limit message length
        success,
        timestamp: serverTimestamp(),
        details: {
          ...details,
          errorMessage: details.error?.substring(0, 500) || null // Limit error length
        }
      };
      
      // Add to history collection
      await addDoc(collection(db, "actionHistory"), actionRecord);
      
      // Update aggregated stats
      const statsRef = doc(db, "analytics", "actionStats");
      const statsDoc = await getDoc(statsRef);
      
      if (statsDoc.exists()) {
        // Update existing stats
        await updateDoc(statsRef, {
          totalActions: increment(1),
          [`${actionType}.total`]: increment(1),
          [`${actionType}.success`]: increment(success ? 1 : 0),
          [`${actionType}.failure`]: increment(success ? 0 : 1),
          lastUpdated: serverTimestamp(),
          recentActions: arrayUnion({
            actionType,
            success,
            timestamp: timestamp.toISOString(),
            truncatedMessage: message.substring(0, 100)
          })
        });
      } else {
        // Create new stats document
        await setDoc(statsRef, {
          totalActions: 1,
          [actionType]: {
            total: 1,
            success: success ? 1 : 0,
            failure: success ? 0 : 1
          },
          lastUpdated: serverTimestamp(),
          recentActions: [{
            actionType,
            success,
            timestamp: timestamp.toISOString(),
            truncatedMessage: message.substring(0, 100)
          }]
        });
      }
      
      return true;
    } catch (error) {
      console.error("Error recording action:", error);
      return false;
    }
  }
  
  /**
   * Record feedback on an action
   * @param {string} messageId - The message ID
   * @param {string} feedbackType - Type of feedback (helpful, unhelpful, etc.)
   * @param {string} comment - User comment
   * @param {string} messageContent - The original message content
   * @returns {Promise<boolean>} Success of recording
   */
  async recordActionFeedback(messageId, feedbackType, comment = '', messageContent = '') {
    try {
      if (!messageId) return false;
      
      // Record in feedback collection
      const feedbackRecord = {
        messageId,
        feedbackType,
        comment: comment.substring(0, 500), // Limit comment length
        messageContent: messageContent.substring(0, 300), // Limit message length
        timestamp: serverTimestamp()
      };
      
      // Add to feedback collection
      await setDoc(doc(db, "actionFeedback", messageId), feedbackRecord);
      
      // Update stats
      const statsRef = doc(db, "analytics", "actionFeedbackStats");
      const statsDoc = await getDoc(statsRef);
      
      if (statsDoc.exists()) {
        // Update existing stats
        await updateDoc(statsRef, {
          totalFeedback: increment(1),
          [`${feedbackType}Count`]: increment(1),
          lastUpdated: serverTimestamp()
        });
      } else {
        // Create new stats document
        await setDoc(statsRef, {
          totalFeedback: 1,
          [`${feedbackType}Count`]: 1,
          lastUpdated: serverTimestamp()
        });
      }
      
      return true;
    } catch (error) {
      console.error("Error recording action feedback:", error);
      return false;
    }
  }
  
  /**
   * Get success rate for an action type
   * @param {string} actionType - The type of action to analyze
   * @returns {Promise<Object>} Success rate stats
   */
  async getSuccessRate(actionType) {
    try {
      const statsRef = doc(db, "analytics", "actionStats");
      const statsDoc = await getDoc(statsRef);
      
      if (!statsDoc.exists()) {
        return { rate: 0, total: 0 };
      }
      
      const data = statsDoc.data();
      
      if (!data[actionType]) {
        return { rate: 0, total: 0 };
      }
      
      const actionData = data[actionType];
      const successRate = actionData.total > 0 
        ? (actionData.success / actionData.total) * 100 
        : 0;
      
      return {
        rate: Number(successRate.toFixed(2)),
        total: actionData.total,
        success: actionData.success,
        failure: actionData.failure
      };
    } catch (error) {
      console.error("Error getting success rate:", error);
      return { rate: 0, total: 0, error: error.message };
    }
  }
  
  /**
   * Get common patterns in successful action requests
   * @param {string} actionType - The type of action to analyze
   * @returns {Promise<Array>} Common successful patterns
   */
  async getSuccessPatterns(actionType) {
    try {
      // Query successful actions of this type
      const querySnapshot = await getDocs(
        query(
          collection(db, "actionHistory"),
          where("actionType", "==", actionType),
          where("success", "==", true),
          orderBy("timestamp", "desc"),
          limit(100)
        )
      );
      
      if (querySnapshot.empty) {
        return [];
      }
      
      // Extract messages from successful actions
      const messages = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.message) {
          messages.push(data.message);
        }
      });
      
      // Analyze patterns (simplified approach)
      const commonPhrases = this.extractCommonPhrases(messages);
      
      return commonPhrases;
    } catch (error) {
      console.error("Error getting success patterns:", error);
      return [];
    }
  }
  
  /**
   * Extract common phrases from a set of messages
   * @param {Array<string>} messages - Messages to analyze
   * @returns {Array<Object>} Common phrases with frequencies
   */
  extractCommonPhrases(messages) {
    const phraseMap = new Map();
    
    // Extract 2-4 word phrases
    messages.forEach(message => {
      const words = message.toLowerCase().split(/\s+/);
      
      // Check for 2, 3, and 4-word phrases
      for (let phraseLength = 2; phraseLength <= 4; phraseLength++) {
        for (let i = 0; i <= words.length - phraseLength; i++) {
          const phrase = words.slice(i, i + phraseLength).join(' ');
          phraseMap.set(phrase, (phraseMap.get(phrase) || 0) + 1);
        }
      }
    });
    
    // Convert to array and sort by frequency
    const phraseArray = Array.from(phraseMap.entries())
      .filter(([phrase, count]) => count >= 3) // At least 3 occurrences
      .map(([phrase, count]) => ({ phrase, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 phrases
    
    return phraseArray;
  }
}

export default new ActionLearningSystem();