// src/services/QuestionFeedbackService.js
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

/**
 * Service for tracking and learning from survey question feedback
 */
class QuestionFeedbackService {
  constructor() {
    this.feedbackCollection = 'question_feedback';
  }

  /**
   * Record feedback about an inapplicable or inappropriate question
   * @param {Object} feedbackData - Data about the question and feedback
   * @returns {Promise<Object>} Result of the feedback submission
   */
  async recordQuestionFeedback(feedbackData) {
    try {
      // Validate required fields
      if (!feedbackData.questionId || !feedbackData.feedbackType) {
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
      console.log("Question feedback recorded with ID:", docRef.id);

      return { success: true, id: docRef.id };
    } catch (error) {
      console.error("Error recording question feedback:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get questions to exclude based on feedback patterns
   * @param {string} familyId - The family ID
   * @param {string} childId - The child ID (optional)
   * @returns {Promise<Array>} Array of question IDs to exclude
   */
  async getQuestionsToExclude(familyId, childId = null) {
    try {
      // Query for feedback from this family
      let q = query(
        collection(db, this.feedbackCollection),
        where("familyId", "==", familyId),
        where("feedbackType", "==", "not_applicable")
      );
      
      if (childId) {
        // If child ID provided, get specific feedback for this child
        q = query(q, where("childId", "==", childId));
      }
      
      const querySnapshot = await getDocs(q);
      const questionIds = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        questionIds.push(data.questionId);
      });
      
      return questionIds;
    } catch (error) {
      console.error("Error getting questions to exclude:", error);
      return [];
    }
  }
}

export default new QuestionFeedbackService();