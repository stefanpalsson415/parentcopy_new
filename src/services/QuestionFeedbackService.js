// src/services/QuestionFeedbackService.js
import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';

/**
 * Service for handling question feedback and inapplicable questions
 */
class QuestionFeedbackService {
  /**
   * Record feedback for a specific question
   * @param {Object} feedback - Feedback object with question details and feedback data
   * @returns {Promise<boolean>} Success indicator
   */
  async recordQuestionFeedback(feedback) {
    try {
      if (!feedback.questionId || !feedback.familyId) {
        console.error("Missing required feedback parameters");
        return false;
      }
      
      // Create document ID using family and question ID
      const docId = `${feedback.familyId}-${feedback.questionId}`;
      
      // Create the feedback document
      const feedbackDoc = {
        questionId: feedback.questionId,
        questionText: feedback.questionText || "",
        category: feedback.category || "",
        familyId: feedback.familyId,
        feedbackType: feedback.feedbackType || "not_applicable",
        timestamp: serverTimestamp(),
        // Store detailed feedback if available
        feedbackData: feedback.feedbackData || null,
        comments: feedback.comments || ""
      };
      
      // Save to Firestore
      await setDoc(doc(db, "questionFeedback", docId), feedbackDoc);
      
      // Also update the family's list of excluded questions if not applicable
      if (feedback.feedbackType === 'not_applicable') {
        await this.updateFamilyExcludedQuestions(feedback.familyId, feedback.questionId, true);
      } else if (feedback.feedbackType === 'applicable') {
        // If marked as applicable, remove from excluded list if present
        await this.updateFamilyExcludedQuestions(feedback.familyId, feedback.questionId, false);
      }
      
      return true;
    } catch (error) {
      console.error("Error recording question feedback:", error);
      return false;
    }
  }
  
  /**
   * Update the family's list of excluded questions
   * @param {string} familyId - Family ID
   * @param {string} questionId - Question ID
   * @param {boolean} exclude - Whether to exclude (true) or include (false) the question
   * @returns {Promise<boolean>} Success indicator
   */
  async updateFamilyExcludedQuestions(familyId, questionId, exclude) {
    try {
      // Get the current document if it exists
      const docRef = doc(db, "familyQuestionSettings", familyId);
      const docSnap = await getDoc(docRef);
      
      let excludedQuestions = [];
      
      // If document exists, get current list of excluded questions
      if (docSnap.exists()) {
        excludedQuestions = docSnap.data().excludedQuestions || [];
      }
      
      // Add or remove the question from the excluded list
      if (exclude && !excludedQuestions.includes(questionId)) {
        excludedQuestions.push(questionId);
      } else if (!exclude && excludedQuestions.includes(questionId)) {
        excludedQuestions = excludedQuestions.filter(q => q !== questionId);
      } else {
        // No change needed
        return true;
      }
      
      // Save updated list back to Firestore
      await setDoc(docRef, {
        familyId,
        excludedQuestions,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      return true;
    } catch (error) {
      console.error("Error updating excluded questions:", error);
      return false;
    }
  }
  
  /**
   * Get list of questions to exclude based on feedback
   * @param {string} familyId - Family ID
   * @param {string} memberId - Optional member ID for child-specific exclusions
   * @returns {Promise<Array>} Array of question IDs to exclude
   */
  async getQuestionsToExclude(familyId, memberId = null) {
    try {
      if (!familyId) return [];
      
      // Get the family's excluded questions document
      const docRef = doc(db, "familyQuestionSettings", familyId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        // Get the basic family-wide exclusions
        const baseExclusions = docSnap.data().excludedQuestions || [];
        
        // If we're not looking for member-specific exclusions, return the base list
        if (!memberId) {
          return baseExclusions;
        }
        
        // For children, we might have additional exclusions
        if (memberId.includes("child") || memberId.includes("kid")) {
          // Get any child-specific exclusions
          const childDocRef = doc(db, "familyQuestionSettings", `${familyId}-child`);
          const childDocSnap = await getDoc(childDocRef);
          
          if (childDocSnap.exists()) {
            const childExclusions = childDocSnap.data().excludedQuestions || [];
            // Combine both lists
            return [...new Set([...baseExclusions, ...childExclusions])];
          }
        }
        
        return baseExclusions;
      }
      
      return [];
    } catch (error) {
      console.error("Error getting questions to exclude:", error);
      return [];
    }
  }
  
  /**
   * Get detailed feedback for a specific question
   * @param {string} familyId - Family ID
   * @param {string} questionId - Question ID
   * @returns {Promise<Object|null>} Feedback object or null if not found
   */
  async getQuestionFeedback(familyId, questionId) {
    try {
      if (!familyId || !questionId) return null;
      
      // Get the feedback document
      const docRef = doc(db, "questionFeedback", `${familyId}-${questionId}`);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      }
      
      return null;
    } catch (error) {
      console.error("Error getting question feedback:", error);
      return null;
    }
  }
  
  /**
   * Get all feedback for a family
   * @param {string} familyId - Family ID
   * @returns {Promise<Array>} Array of feedback objects
   */
  async getAllFamilyFeedback(familyId) {
    try {
      if (!familyId) return [];
      
      // Query all feedback documents for this family
      const q = query(
        collection(db, "questionFeedback"), 
        where("familyId", "==", familyId)
      );
      const querySnapshot = await getDocs(q);
      
      const feedbackList = [];
      querySnapshot.forEach((doc) => {
        feedbackList.push(doc.data());
      });
      
      return feedbackList;
    } catch (error) {
      console.error("Error getting all family feedback:", error);
      return [];
    }
  }
}

export default new QuestionFeedbackService();