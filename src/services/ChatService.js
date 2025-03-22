// src/services/ChatService.js
import { db } from './firebase';
import ClaudeService from './ClaudeService';
// Add this import at the top of the file
import { knowledgeBase } from '../data/AllieKnowledgeBase';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, doc, getDoc, limit } from 'firebase/firestore';


class ChatService {
  // Load messages for a family
  async loadMessages(familyId) {
    try {
      const q = query(
        collection(db, "chatMessages"),
        where("familyId", "==", familyId),
        orderBy("timestamp", "asc")
      );
      
      const querySnapshot = await getDocs(q);
      const messages = [];
      
      querySnapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return messages;
    } catch (error) {
      console.error("Error loading messages:", error);
      throw error;
    }
  }
  
  // Save a message to the database
  async saveMessage(message) {
    try {
      await addDoc(collection(db, "chatMessages"), {
        ...message,
        createdAt: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error("Error saving message:", error);
      throw error;
    }
  }
  

// Find and update the getAIResponse method (typically around line 50-80)
async getAIResponse(text, familyId, previousMessages) {
  try {
    // Better error handling for missing familyId
    if (!familyId) {
      console.warn("getAIResponse called without familyId, using limited context");
      // Continue with limited context rather than failing
    }
    
    // Get family data from Firestore for context - with safer error handling
    let familyData = {};
    try {
      familyData = await this.getFamilyContext(familyId);
    } catch (contextError) {
      console.warn("Could not get family context, using limited context:", contextError);
      // Continue with empty context rather than failing completely
    }
    
    // Add knowledge base to context
    familyData.knowledgeBase = knowledgeBase;
    
    // Format messages for Claude API
    const formattedMessages = previousMessages
      .slice(-10) // Last 10 messages for context
      .map(msg => ({
        role: msg.sender === 'allie' ? 'assistant' : 'user',
        content: msg.text
      }));
    
    // Add the current message
    formattedMessages.push({
      role: 'user',
      content: text
    });
    
    console.log("Sending to Claude API:", {
      messageCount: formattedMessages.length,
      lastMessage: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      hasContext: Object.keys(familyData).length > 0
    });
    
    // Call the Claude API through our service
    const response = await ClaudeService.generateResponse(
      formattedMessages, 
      familyData
    );
    
    return response;
  } catch (error) {
    console.error("Error getting AI response:", error);
    
    // Provide more helpful fallback responses
    if (text.toLowerCase().includes("survey") || 
        text.toLowerCase().includes("data") || 
        text.toLowerCase().includes("results")) {
      return "I'd like to analyze your survey data, but I'm having trouble accessing it right now. Please try refreshing the page or asking again in a few moments. In the meantime, you can view your survey results directly in the Dashboard tab.";
    } else if (text.toLowerCase().includes("help") || text.length < 20) {
      return "I can help with questions about family balance, your tasks, or how to use Allie. What would you like to know?";
    }
    
    return "I'm having trouble processing your question right now. While I'm reconnecting, you can explore the dashboard for insights or check your tasks in the Tasks tab.";
  }
}  
  // Get family context data for the AI
  // Update the getFamilyContext method
// Update the getFamilyContext method
async getFamilyContext(familyId) {
  try {
    // Get family data from Firestore
    const docRef = doc(db, "families", familyId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // Get complete survey responses (not just summaries)
      const completeResponses = data.surveyResponses || {};
      
      // Extract survey data if available
      let surveyData = {};
      if (completeResponses && Object.keys(completeResponses).length > 0) {
        surveyData = {
          totalQuestions: Object.keys(completeResponses).length,
          mamaPercentage: this.calculateMamaPercentage(completeResponses),
          categories: this.getCategoryBreakdown(completeResponses),
          responses: completeResponses  // Include the actual responses
        };
      }
      
      // Get the full task list
      const tasks = data.tasks || [];
      
      // Get week history data for insights
      const weekHistory = data.weekHistory || {};
      
      // Get impactInsights if available
      const impactInsights = data.impactInsights || [];
      
      // Get balance scores if available
      let balanceScores = null;
      try {
        // Try to calculate current weighted balance scores
        if (data.weightedScores) {
          balanceScores = data.weightedScores;
        }
      } catch (e) {
        console.warn("Error getting balance scores:", e);
      }
      
      // NEW: Get relationship strategies data
      let relationshipData = {};
      try {
        const stratDocRef = doc(db, "relationshipStrategies", familyId);
        const stratDocSnap = await getDoc(stratDocRef);
        
        if (stratDocSnap.exists()) {
          const strategies = stratDocSnap.data().strategies || [];
          
          relationshipData = {
            implementedStrategies: strategies.filter(s => s.implementation > 50).map(s => s.name),
            topStrategy: strategies.sort((a, b) => b.implementation - a.implementation)[0]?.name,
            avgImplementation: strategies.length > 0 
              ? strategies.reduce((sum, s) => sum + s.implementation, 0) / strategies.length 
              : 0,
            allStrategies: strategies  // Include all strategies
          };
        }
      } catch (e) {
        console.error("Error getting relationship strategies:", e);
      }
      
      // NEW: Get couple check-in data
      let coupleData = {};
      try {
        const checkInQuery = query(
          collection(db, "coupleCheckIns"),
          where("familyId", "==", familyId),
          orderBy("completedAt", "desc"),
          limit(5)  // Get the last 5 check-ins for trend analysis
        );
        
        const checkInSnapshot = await getDocs(checkInQuery);
        if (!checkInSnapshot.empty) {
          const checkIns = checkInSnapshot.docs.map(doc => doc.data());
          
          coupleData = {
            lastCheckIn: checkIns[0].completedAt?.toDate?.().toISOString() || null,
            satisfaction: checkIns[0].data?.satisfaction || null,
            communication: checkIns[0].data?.communication || null,
            history: checkIns  // Include full history of check-ins
          };
        }
      } catch (e) {
        console.error("Error getting couple check-in data:", e);
      }
      
      return {
        familyId: familyId,
        familyName: data.familyName,
        adults: data.familyMembers.filter(m => m.role === 'parent').length,
        children: data.familyMembers.filter(m => m.role === 'child'),
        familyMembers: data.familyMembers,  // Include all family members
        currentWeek: data.currentWeek,
        completedWeeks: data.completedWeeks || [],
        surveyData,
        tasks,  // Include all tasks
        weekHistory,  // Include week history
        impactInsights,  // Include impact insights
        balanceScores,  // Include balance scores
        relationshipData,
        coupleData
      };
    }
    
    return {};
  } catch (error) {
    console.error("Error getting family context:", error);
    return {};
  }
}  
  // Helper method to calculate mama percentage from survey responses
  calculateMamaPercentage(responses) {
    let mamaCount = 0;
    let totalCount = 0;
    
    Object.values(responses).forEach(response => {
      if (response === 'Mama' || response === 'Papa') {
        totalCount++;
        if (response === 'Mama') {
          mamaCount++;
        }
      }
    });
    
    return totalCount > 0 ? (mamaCount / totalCount) * 100 : 50;
  }
  
  // Helper method to get category breakdown from survey responses
  getCategoryBreakdown(responses) {
    const categories = {
      "Visible Household Tasks": { mama: 0, papa: 0, total: 0 },
      "Invisible Household Tasks": { mama: 0, papa: 0, total: 0 },
      "Visible Parental Tasks": { mama: 0, papa: 0, total: 0 },
      "Invisible Parental Tasks": { mama: 0, papa: 0, total: 0 }
    };
    
    // Simple categorization based on question IDs (approximate)
    // In a real implementation, you would have a mapping of question IDs to categories
    Object.entries(responses).forEach(([key, value]) => {
      if (value !== 'Mama' && value !== 'Papa') return;
      
      // Extract question number if possible
      const match = key.match(/q(\d+)/);
      if (!match) return;
      
      const qNum = parseInt(match[1]);
      let category;
      
      if (qNum <= 20) {
        category = "Visible Household Tasks";
      } else if (qNum <= 40) {
        category = "Invisible Household Tasks";
      } else if (qNum <= 60) {
        category = "Visible Parental Tasks";
      } else {
        category = "Invisible Parental Tasks";
      }
      
      categories[category].total++;
      if (value === 'Mama') {
        categories[category].mama++;
      } else {
        categories[category].papa++;
      }
    });
    
    // Calculate percentages
    Object.keys(categories).forEach(category => {
      const { mama, total } = categories[category];
      if (total > 0) {
        categories[category].mamaPercent = (mama / total) * 100;
        categories[category].papaPercent = 100 - (mama / total) * 100;
      } else {
        categories[category].mamaPercent = 50;
        categories[category].papaPercent = 50;
      }
    });
    
    return categories;
  }
}

export default new ChatService();